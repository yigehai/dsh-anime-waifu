/**
 * dsh-anime-waifu 冒烟测试（无浏览器）
 *
 * 用极简 DOM 桩加载 lib/client.js 的懒加载 CJS 工厂，依次验证：
 * 挂载 → 读取 Host 默认值 → 交互 → 主题注册 → 插件页卡片渲染 → 卸载清理。
 *
 * 在包根目录执行：
 *   node -e "const fs=require('fs');new Function('fs','return (async()=>{'+fs.readFileSync('test/harness.js','utf8')+'})()')(fs)"
 *
 * 也可以用 ANIME_WAIFU_CLIENT=/abs/path/lib/client.js 指向别处的产物。
 */
const clientPath = (typeof process !== 'undefined' && process.env && process.env.ANIME_WAIFU_CLIENT) || 'lib/client.js';
const src = fs.readFileSync(clientPath, 'utf8');
try { new Function(src); console.log('SYNTAX OK, length', src.length); } catch (e) { console.log('SYNTAX FAIL:', e.message); throw e; }

function mkStyle() {
  const props = {};
  return {
    setProperty(k, v) { props[k] = String(v); },
    getPropertyValue(k) { return props[k] || ''; },
    removeProperty(k) { delete props[k]; },
  };
}
class FakeNode {
  constructor(tag) {
    this.tagName = String(tag).toLowerCase();
    this.attrs = {};
    this.children = [];
    this.parentNode = null;
    this.style = mkStyle();
    this.handlers = {};
    this._text = '';
    this.checked = false; this.value = ''; this.disabled = false; this.hidden = false; this.type = '';
    this.isText = this.tagName === '#text';
    this.classList = this._classList();
  }
  get parentElement() { return this.parentNode; }
  _classList() {
    const node = this;
    return {
      add(...names) { const set = new Set(node._classes()); names.forEach(n => set.add(n)); node.attrs.class = [...set].join(' '); },
      remove(...names) { const set = new Set(node._classes()); names.forEach(n => set.delete(n)); node.attrs.class = [...set].join(' '); },
      contains(n) { return node._classes().includes(n); },
    };
  }
  _classes() { return (this.attrs.class || '').split(/\s+/).filter(Boolean); }
  get className() { return this.attrs.class || ''; }
  set className(v) { this.attrs.class = String(v); }
  get textContent() { if (this.isText) return this._text; return this._text + this.children.map(c => c.textContent).join(''); }
  set textContent(v) { this._text = String(v); this.children = []; }
  get innerHTML() { return this._text; }
  set innerHTML(v) { this.children = []; this._text = ''; parseHTMLInto(this, String(v)); }
  setAttribute(name, value) { this.attrs[name] = String(value); }
  getAttribute(name) { return this.attrs[name]; }
  removeAttribute(name) { delete this.attrs[name]; }
  appendChild(child) { if (child.parentNode) child.parentNode.removeChild(child); child.parentNode = this; this.children.push(child); return child; }
  removeChild(child) { this.children = this.children.filter(c => c !== child); child.parentNode = null; return child; }
  addEventListener(type, handler) { (this.handlers[type] = this.handlers[type] || []).push(handler); }
  removeEventListener(type, handler) { this.handlers[type] = (this.handlers[type] || []).filter(h => h !== handler); }
  fire(type, event) { (this.handlers[type] || []).slice().forEach(h => h(Object.assign({ target: this, preventDefault() {}, stopPropagation() {} }, event))); }
  getBoundingClientRect() { return { left: 0, top: 0, width: 200, height: 280 }; }
  matches(sel) {
    if (sel.startsWith('[')) {
      const m = sel.match(/^\[([\w-]+)(?:="([^"]*)")?\]$/);
      if (!m) return false;
      if (!(m[1] in this.attrs)) return false;
      return m[2] === undefined || this.attrs[m[1]] === m[2];
    }
    if (sel.startsWith('.')) return this._classes().includes(sel.slice(1));
    return this.tagName === sel.toLowerCase();
  }
  querySelectorAll(sel) {
    const hits = [];
    const walk = (node) => {
      for (const child of node.children) {
        if (!child.isText && child.matches(sel)) hits.push(child);
        walk(child);
      }
    };
    walk(this);
    return hits;
  }
  querySelector(sel) {
    const walk = (node) => {
      for (const child of node.children) {
        if (!child.isText && child.matches(sel)) return child;
        const found = walk(child);
        if (found) return found;
      }
      return null;
    };
    return walk(this);
  }
}
const VOID = new Set(['br','img','input','hr','meta','link']);
function parseHTMLInto(root, html) {
  const tagRe = /<(\/?)([a-zA-Z0-9]+)((?:\s+[^\s=>\/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>/g;
  const stack = [root];
  let m, last = 0;
  const pushText = (text) => { if (!text) return; const t = new FakeNode('#text'); t._text = text; stack[stack.length - 1].appendChild(t); };
  while ((m = tagRe.exec(html))) {
    pushText(html.slice(last, m.index));
    last = tagRe.lastIndex;
    const close = m[1], tag = m[2], attrStr = m[3], selfClose = m[4];
    if (close) { if (stack.length > 1) stack.pop(); continue; }
    const node = new FakeNode(tag);
    const attrRe = /([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
    let a;
    while ((a = attrRe.exec(attrStr || ''))) {
      if (!a[1]) continue;
      node.attrs[a[1]] = a[2] !== undefined ? a[2] : a[3] !== undefined ? a[3] : a[4] !== undefined ? a[4] : '';
    }
    stack[stack.length - 1].appendChild(node);
    if (!selfClose && !VOID.has(node.tagName)) stack.push(node);
  }
  pushText(html.slice(last));
}
const doc = {
  head: new FakeNode('head'), body: new FakeNode('body'), documentElement: new FakeNode('html'),
  activeElement: null, visibilityState: 'visible',
  createElement: (tag) => new FakeNode(tag),
  handlers: {},
  addEventListener(t, h) { (this.handlers[t] = this.handlers[t] || []).push(h); },
  removeEventListener(t, h) { this.handlers[t] = (this.handlers[t] || []).filter(x => x !== h); },
  fire(t, e) { (this.handlers[t] || []).slice().forEach(h => h(Object.assign({ preventDefault() {}, stopPropagation() {} }, e))); },
  listenerCount(t) { return (this.handlers[t] || []).length; },
  querySelector() { return null; },
};
const store = new Map();
const timers = new Map();
let timerSeq = 0;
const win = {
  innerWidth: 1440, innerHeight: 900,
  localStorage: {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  },
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  setTimeout: (fn) => { const id = ++timerSeq; timers.set(id, fn); return id; },
  clearTimeout: (id) => timers.delete(id),
  setInterval: (fn) => { const id = ++timerSeq; timers.set(id, fn); return id; },
  clearInterval: (id) => timers.delete(id),
  handlers: {},
  addEventListener(t, h) { (this.handlers[t] = this.handlers[t] || []).push(h); },
  removeEventListener(t, h) { this.handlers[t] = (this.handlers[t] || []).filter(x => x !== h); },
  listenerCount(t) { return (this.handlers[t] || []).length; },
};
globalThis.window = win;
globalThis.document = doc;

const themes = [{ id: 'light', colorScheme: 'light', tokens: {} }, { id: 'dark', colorScheme: 'dark', tokens: {} }];
let preference = 'system';
const themeService = {
  getTheme: () => ({ preference, active: { id: preference === 'system' ? 'light' : preference, colorScheme: 'light', tokens: {} }, themes: themes.slice() }),
  register: (def) => {
    if (def.id === 'system') throw new Error('system is not registrable');
    if (themes.some(t => t.id === def.id)) throw new Error('already registered');
    themes.push(def);
    return () => { const i = themes.findIndex(t => t.id === def.id); if (i >= 0) themes.splice(i, 1); };
  },
  setTheme: (id) => { if (id !== 'system' && !themes.some(t => t.id === id)) throw new Error('unregistered ' + id); preference = id; },
};
const hostValue = { enabled: true, size: 240, sakura: false, stars: true, opacity: 1, position: 'right', theme: 'off', idleSeconds: 45, lines: ['部署台词一', '部署台词二'] };
const writes = [];
const form = { getSnapshot: () => ({ value: hostValue }), subscribe: () => () => {}, set: (k, v) => { writes.push([k, v]); } };
const gets = [];
const configForms = { get: (id) => { gets.push(id); return form; } };

let captured;
win.__ModuleLoader__ = { load: (def) => { captured = def; } };
new Function(src)();
const reactStub = {
  useState: (init) => [typeof init === 'function' ? init() : init, () => {}],
  useEffect: (fn) => fn(),
};
const jsxStub = { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }), Fragment: 'Fragment' };
const mod = captured.factory((name) => {
  if (name === 'react') return reactStub;
  if (name === 'react/jsx-runtime') return jsxStub;
  throw new Error('unexpected require: ' + name);
});

const registered = [];
// 会话状态源（对应 @deepseek-ai/dsh-client-ui-session 的 uiSession.sessionStatus）
const sessionStatusMap = new Map();
const sessionStatusListeners = new Set();
const uiSession = {
  sessionStatus: {
    getSnapshot: () => sessionStatusMap,
    subscribe: (listener) => { sessionStatusListeners.add(listener); return () => sessionStatusListeners.delete(listener); },
  },
};
const setRunning = (id, running) => {
  if (running) sessionStatusMap.set(id, { running: true, pendingInteraction: undefined, completionUnread: false });
  else sessionStatusMap.delete(id);
  sessionStatusListeners.forEach((listener) => listener());
};

// 远程状态事件（对应网关的 remote.$on('api-session/status', ...)）
const remoteListeners = new Map();
const remote = {
  $on: (event, listener) => {
    const set = remoteListeners.get(event) || new Set();
    set.add(listener);
    remoteListeners.set(event, set);
    return () => set.delete(listener);
  },
};
const emitRemote = (event, ...args) => { const set = remoteListeners.get(event); if (set) set.forEach((listener) => listener(...args)); };

const effectLog = [];
const disposers = [];
const listeners = {};
const ctx = {
  effect(fn, label) { effectLog.push(label); const d = fn(); const dispose = () => { if (typeof d === 'function') d(); }; disposers.push(dispose); return dispose; },
  on(name, handler) { (listeners[name] = listeners[name] || []).push(handler); return () => {}; },
  inject(deps, cb) {
    const child = Object.assign({}, ctx);
    if (deps.indexOf('theme') >= 0) child.theme = themeService;
    if (deps.indexOf('configForms') >= 0) child.configForms = configForms;
      if (deps.indexOf('uiSession') >= 0) child.uiSession = uiSession;
      if (deps.indexOf('remote') >= 0) child.remote = remote;
    effectLog.push('inject:' + deps.join(','));
    cb(child);
    return {};
  },
  slots: {
    inject(name, cb) { effectLog.push('slots.inject:' + name); cb(); },
    register(options, Component) { registered.push({ options, Component }); return () => {}; },
  },
};
mod.apply(ctx);

const root = doc.body.querySelector('[data-anime-waifu-root]');
const mascot = root.querySelector('[data-aw="mascot"]');
const petals = root.querySelector('.aw-petals');
const stars = root.querySelector('.aw-stars');
const bubble = root.querySelector('[data-aw="bubble"]');
const panel = root.querySelector('[data-aw="panel"]');
console.log('--- boot ---');
console.log('bundle:', captured.id, '| exports:', Object.keys(mod).join(','), '| inject:', mod.inject.join(','));
console.log('slot registered:', registered.map(r => r.options.name + '#' + r.options.key).join(','));
console.log('configForms.get(anime-waifu):', gets.join(','));
console.log('theme ids:', themes.map(t => t.id).join(','));
console.log('mascot display:', mascot.style.display, '| --aw-size:', root.style.getPropertyValue('--aw-size'));
console.log('petals visible:', petals.parentElement.style.display !== 'none', '| petals:', petals.children.length, '| stars:', stars.children.length);
console.log('theme buttons:', root.querySelector('[data-aw="themes"]').children.map(b => b.textContent).join(' | '));
console.log('lines synced:', JSON.stringify(root.querySelector('[data-aw="lines"]').value));
console.log('size/idle out:', root.querySelector('[data-aw="size-out"]').textContent, '/', root.querySelector('[data-aw="idle-out"]').textContent);

console.log('--- card api ---');
const api = registered[0].options.inject();
console.log('state:', JSON.stringify(api.getState()));
api.setTheme('anime-night');
console.log('setTheme -> preference:', preference, '| host writes:', JSON.stringify(writes));
api.setTheme('off');
console.log('off -> preference restored to:', preference);
api.setTheme('anime-night');
console.log('back to anime-night:', preference);
api.setEnabled(false);
console.log('hide -> display:', mascot.style.display);
api.showPanel();
console.log('panel hidden after showPanel:', panel.hidden, '| display:', mascot.style.display);
console.log('localStorage:', store.get('dsh-anime-waifu:prefs:v1'));

console.log('--- interactions ---');
const sizeInput = root.querySelector('[data-aw="size"]');
sizeInput.value = '300';
sizeInput.fire('input');
console.log('size:', api.getState().size, '| css var:', root.style.getPropertyValue('--aw-size'));
const sakuraInput = root.querySelector('[data-aw="sakura"]');
sakuraInput.checked = true;
sakuraInput.fire('change');
console.log('petals visible now:', petals.parentElement.style.display !== 'none');
(listeners['agent/assistant-stream'] || []).forEach(h => h({ type: 'chunk', chunk: { type: 'text-delta', text: 'hi' } }));
console.log('bubble:', JSON.stringify(bubble.textContent), '| shown:', bubble.classList.contains('aw-show'));
(listeners['agent/status'] || []).forEach(h => h({ status: 'idle' }));
console.log('thinking after idle:', api.getState().enabled);

console.log('--- card render ---');
const outerPage = registered[0].Component(Object.assign({ view: 'page' }, api));
const card = outerPage.type(outerPage.props);
console.log('card element:', card.type, '| sections:', card.props.children.length);
console.log('card title:', card.props.children[0].props.children[1].props.children[0].props.children);
const outerSummary = registered[0].Component(Object.assign({ view: 'summary' }, api));
console.log('page-only guard (summary returns):', outerSummary);

console.log('--- agent status -> walking ---');
const mascotEl = doc.body.querySelector('.aw-mascot');
console.log('raster default has no svg legs:', doc.body.querySelector('.aw-leg-l') === null && doc.body.querySelector('.aw-leg-r') === null);
console.log('walking while idle:', mascotEl.classList.contains('aw-walking'), '| busy:', api.getState().busy);
setRunning('s-1', true);
console.log('walking while running:', mascotEl.classList.contains('aw-walking'), '| busy:', api.getState().busy, '| thinking:', api.getState().busy);
setRunning('s-1', false);
console.log('walking after finish:', mascotEl.classList.contains('aw-walking'), '| busy:', api.getState().busy);
setRunning('s-2', true);
const walkBox = doc.body.querySelector('[data-aw="walk"]');
walkBox.checked = false; walkBox.fire('change');
console.log('walking with pref off:', mascotEl.classList.contains('aw-walking'));
walkBox.checked = true; walkBox.fire('change');
console.log('walking with pref on:', mascotEl.classList.contains('aw-walking'));
setRunning('s-2', false);

console.log('--- manual walk test button ---');
console.log('card exposes walkTest:', typeof api.walkTest === 'function');
api.walkTest();
console.log('walking after walkTest():', mascotEl.classList.contains('aw-walking'), '| busy:', api.getState().busy);

console.log('--- style guard ---');
const styleNode = doc.head.querySelector('[data-dsh-anime-waifu]');
doc.head.removeChild(styleNode);
console.log('style removed by test:', doc.head.querySelector('[data-dsh-anime-waifu]') === null);
const sizeSlider = doc.body.querySelector('[data-aw="size"]');
sizeSlider.value = '150';
sizeSlider.fire('input');
const styleBack = doc.head.querySelector('[data-dsh-anime-waifu]');
console.log('style re-injected:', styleBack !== null && styleBack.textContent.includes('.aw-panel{'));

console.log('--- remote fallback + css ---');
const styleEl = doc.head.querySelector('[data-dsh-anime-waifu]');
const styleText = styleEl ? styleEl.textContent : '';
console.log('css has walking rules:', styleText.includes('aw-walking') && styleText.includes('@keyframes aw-step') && styleText.includes('@keyframes aw-hop'));
console.log('remote fallback while service idle:', mascotEl.classList.contains('aw-walking'));
emitRemote('api-session/status', 's-9', true);
console.log('walking via remote event:', mascotEl.classList.contains('aw-walking'), '| busy:', api.getState().busy);
emitRemote('api-session/status', 's-9', false);
console.log('idle after remote finish:', mascotEl.classList.contains('aw-walking'), '| busy:', api.getState().busy);

console.log('--- raster art option ---');
const artSel = doc.body.querySelector('[data-aw="artstyle"]');
console.log('artstyle control exists:', artSel !== null, '| default:', artSel ? artSel.value : '(none)');
console.log('default art is raster:', doc.body.querySelector('.aw-raster') !== null, '| svg legs gone:', doc.body.querySelector('.aw-leg-l') === null);
const rasterImg = doc.body.querySelector('.aw-raster');
console.log('raster src is embedded front image:', rasterImg !== null && /^data:image\/(webp|png);base64,/.test(String(rasterImg.getAttribute('src'))));
console.log('css has raster rule:', styleText.includes('.aw-raster'));
console.log('raster has ground shadow:', doc.body.querySelector('.aw-ground') !== null);
console.log('raster has walk sprite:', doc.body.querySelector('[data-aw="walksprite"]') !== null);
console.log('raster figure marked:', doc.body.querySelector('.aw-figure-raster') !== null);
console.log('走动只有换帧、没有额外位移:', !styleText.includes('aw-walk-bob') && !styleText.includes('aw-rast-walk') && !styleText.includes('aw-rast-ground') && styleText.includes('.aw-mascot.aw-walking .aw-figure.aw-figure-raster .aw-walk{display:block}'));
console.log('走动用 8 帧位图切相位:', styleText.includes('.aw-walk.awp-p0 img[data-f="0"]') && styleText.includes('.aw-walk.awp-p7 img[data-f="7"]'));
console.log('原地迈步（无左右位移）:', !styleText.includes('aw-patrol') && !styleText.includes('scaleX(-1)'));
console.log('八个相位各对应一帧:', Array.from({ length: 8 }, (_, i) => i).every((i) => styleText.includes('.aw-walk.awp-p' + i + ' img[data-f="' + i + '"]')));
console.log('走步精灵共 8 帧:', doc.body.querySelectorAll('img').filter((n) => n.getAttribute('data-f') !== undefined).length === 8);
console.log('静止偏好不再关掉迈腿:', styleText.includes('.aw-ground{animation:none!important}') && !styleText.includes('aw-sprite'));
artSel.value = 'svg'; artSel.fire('change');
console.log('switch back to svg:', doc.body.querySelector('.aw-leg-l') !== null && doc.body.querySelector('[data-aw="raster"]') === null && doc.body.querySelector('.aw-figure-raster') === null && doc.body.querySelector('.aw-ground') === null && doc.body.querySelector('[data-aw="walksprite"]') === null);
artSel.value = 'raster'; artSel.fire('change');
console.log('switch again to raster:', doc.body.querySelector('.aw-raster') !== null);

console.log('--- 步态相位推进（JS 切 class）---');
setRunning('s-1', true);
const walkBox2 = doc.body.querySelector('.aw-walk');
const phaseOf = () => Array.from({ length: 8 }, (_, i) => i).filter((i) => walkBox2 && walkBox2.classList.contains('awp-p' + i))[0];
const p0 = phaseOf();
[...timers.values()].forEach((fn) => { try { fn(); } catch (error) { /* 其它定时器 */ } });
const p1 = phaseOf();
console.log('推进后会换相位:', p0 >= 0 && p1 >= 0 && p1 !== p0, '(' + p0 + ' → ' + p1 + ')');
console.log('始终只有一个相位 class:', Array.from({ length: 8 }, (_, i) => i).filter((i) => walkBox2 && walkBox2.classList.contains('awp-p' + i)).length === 1);
setRunning('s-1', false);
console.log('停下后回到相位 0:', phaseOf() === 0);
console.log('--- dispose ---');
for (const d of disposers.slice().reverse()) d();
console.log('root removed:', doc.body.querySelector('[data-anime-waifu-root]') === null);
console.log('style removed:', doc.head.querySelector('[data-dsh-anime-waifu]') === null);
console.log('themes after dispose:', themes.map(t => t.id).join(','));
console.log('document keydown listeners:', doc.listenerCount('keydown'), '| window resize:', win.listenerCount('resize'));
console.log('ALL CHECKS DONE');
