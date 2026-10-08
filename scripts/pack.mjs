#!/usr/bin/env node
/**
 * 把本仓库（dsh-anime-waifu 插件）打包成可直接 `dsh plugin add` 的 tarball。
 *
 * 不依赖 npm / pnpm：直接用 Node 内置 zlib 写 gzip + ustar，产物布局与 npm pack
 * 一致（所有条目位于 package/ 前缀下），并在写完后把 tar 解析回来逐文件校验。
 *
 * 用法：node scripts/pack.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pkgDir = resolve(here, '..');
const manifest = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'));
const outDir = join(pkgDir, 'dist');
const outFile = join(outDir, manifest.name + '-' + manifest.version + '.tgz');

/** tarball 里包含的文件，顺序即打包顺序。 */
const FILES = [
  'package.json',
  'cordis.patch.yml',
  'README.md',
  'LICENSE',
  'lib/index.js',
  'lib/client.js',
  'assets/preview.png',
  'assets/icon.svg',
  'locale/zh.json',
  'locale/en.json',
  'test/harness.js'
];

function octal(buf, offset, length, value) {
  const text = value.toString(8).padStart(length - 1, '0');
  buf.write(text, offset, length - 1, 'ascii');
  buf.writeUInt8(0, offset + length - 1);
}

function header(name, size, mtime) {
  if (Buffer.byteLength(name) > 100) throw new Error('tar 路径过长：' + name);
  const buf = Buffer.alloc(512);
  buf.write(name, 0, 100, 'utf8');
  octal(buf, 100, 8, 0o644);
  octal(buf, 108, 8, 0);
  octal(buf, 116, 8, 0);
  octal(buf, 124, 12, size);
  octal(buf, 136, 12, mtime);
  buf.write('        ', 148, 8, 'ascii');
  buf.write('0', 156, 1, 'ascii');
  buf.write('ustar', 257, 6, 'ascii');
  buf.write('00', 263, 2, 'ascii');
  buf.write('root', 265, 32, 'ascii');
  buf.write('root', 297, 32, 'ascii');
  let sum = 0;
  for (const byte of buf) sum += byte;
  buf.write(sum.toString(8).padStart(6, '0') + '\u0000 ', 148, 8, 'ascii');
  return buf;
}

const mtime = Math.floor(Date.now() / 1000);
const pieces = [];
const sources = [];
for (const rel of FILES) {
  const abs = join(pkgDir, rel);
  if (!existsSync(abs)) throw new Error('缺少文件：' + abs);
  const data = readFileSync(abs);
  const name = 'package/' + rel.split('\\').join('/');
  pieces.push(header(name, data.length, mtime));
  pieces.push(data);
  const pad = (512 - (data.length % 512)) % 512;
  if (pad > 0) pieces.push(Buffer.alloc(pad));
  sources.push({ name, data });
}
pieces.push(Buffer.alloc(1024));

const tar = Buffer.concat(pieces);
const gz = gzipSync(tar, { level: 9 });
mkdirSync(outDir, { recursive: true });
writeFileSync(outFile, gz);

/* ---------------- 写回校验：把 tar 解析回来 ---------------- */
const back = gunzipSync(readFileSync(outFile));
const entries = [];
let offset = 0;
while (offset + 512 <= back.length) {
  const name = back.toString('utf8', offset, offset + 100).replace(/\u0000+$/, '');
  if (name === '') break;
  const size = parseInt(back.toString('ascii', offset + 124, offset + 136).replace(/\u0000.*$/, '').trim() || '0', 8);
  const body = back.subarray(offset + 512, offset + 512 + size);
  entries.push({ name, size, body });
  offset += 512 + Math.ceil(size / 512) * 512;
}
if (entries.length !== sources.length) throw new Error('条目数不符：' + entries.length + ' != ' + sources.length);
const problems = [];
for (let i = 0; i < sources.length; i += 1) {
  const a = sources[i], b = entries[i];
  if (a.name !== b.name) problems.push('名称不符 ' + a.name + ' / ' + b.name);
  if (a.data.length !== b.size) problems.push('大小不符 ' + a.name);
  if (!a.data.equals(b.body)) problems.push('内容不符 ' + a.name);
}
if (problems.length > 0) throw new Error('tarball 校验失败：' + problems.join('; '));

const sha256 = createHash('sha256').update(gz).digest('hex');
console.log('打包完成：' + outFile);
console.log('大小：' + gz.length + ' 字节，sha256=' + sha256);
for (const entry of entries) console.log('  ' + entry.name + '  (' + entry.size + ' 字节)');
console.log('校验：' + entries.length + ' 个条目内容全部一致');
