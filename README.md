# 中秋玉兔（dsh-anime-waifu）· DSH 二次元插件

给 DSH Web GUI 加一只**会说话、可拖动的中秋玉兔**（插件页显示名就叫「中秋玉兔」），外加**花瓣飘落 / 星夜闪烁**两套特效和
**「碧蓝」「星夜紫罗兰」** 两套二次元配色主题。全部工作都在浏览器半侧完成，不注册任何模型工具，
不占用上下文 token。

![玉兔预览](assets/preview.png)

> 预览图（`assets/preview.png`）是 `art/front.webp` 的缩略渲染，也就是插件默认内嵌的那张生成图。
>
> 若预览图在当前网络下裂开：GitHub 的**仓库内图片**由 `raw.githubusercontent.com` 提供，国内部分网络连接会超时（图片本身正常）。可参考 [GitHub520](https://github.com/521xueweihan/GitHub520) 修 hosts 或使用代理访问。

## 功能

| 功能 | 说明 |
| --- | --- |
| 悬浮玉兔 | 右下角（可改左下角）的内联 SVG 中秋玉兔（照参考图重画）：白毛 + 黑豆眼 + 长耳 + **直立站在地上（两条腿）** + 手提金灯笼 + 莲纹月饼 + 桂花；呼吸浮动、定时眨眼、长耳轻摆 |
| 状态跟随 | 智能体**正在执行任务**时兔子两条腿**交替垂直抬起迈步**（人走路的样子：腿几乎只上下动、不左右开合），身体按步频**轻轻起落两次/周期**、金灯笼小幅摆动、落地影子收缩；**没有任务**时腿停住、只做呼吸浮动。（来源：客户端 `uiSession` 的会话运行状态快照 + 网关 `api-session/status` 事件） |
| 会说话 | 点击角色随机说一句台词；闲置一段时间也会主动开口；模型流式输出时显示「在写了」 |
| 拖动定位 | 按住角色拖到任意位置，位置写入 localStorage，窗口缩放时自动收敛在可视区 |
| 花瓣飘落 | 默认 14 片随机大小/时长/延迟的蓝色花瓣（数量与速度可配），纯 CSS 动画（尊重 prefers-reduced-motion） |
| 星夜闪烁 | 默认 20 颗随机分布的闪烁星点（数量可配） |
| 二次元主题 | 通过 ctx.theme.register 注册两个第三方主题 id：anime-azure（浅色蓝）与 anime-night（暗色紫） |
| 设置面板 | 角色右上角齿轮打开：开关、大小、不透明度、停靠、特效、说话间隔、台词编辑、主题 |
| 插件页卡片 | 「设置 → 插件 → 本 bundle 详情页」里的卡片：实时状态 + 一键开关 / 切主题 / 打开面板 |
| 形象可切换 | 默认用**生成的玉兔图**：手工生成的 1672×941 原图 → 纯深蓝底抠成透明 → 裁到最小包围盒 → 按躯干中心归一化到 409×720 画布 → 内嵌成 data URI。设置面板「形象」一键切回手绘 SVG；图被策略挡掉会自动退回 SVG |
| 快捷键 | Ctrl+Shift+A 显示 / 隐藏玉兔 |
| 走动步态 | 走动时切到 **8 帧位图步态**：一条 8 格横排条带逐格切出，统一归一化到 368×720 画布、躯干居中、脚底对齐 695/720，靠 `.awp-pN` 相位 class 切可见帧（相位规则由 `WALK_FRAMES` 展开，加帧不用改 CSS）。走动时**只有逐帧换图**，不叠加任何上下起伏、缩放或影子动画；8 帧位置本身已对齐（头顶/脚底 0px 差、躯干质心极差 0.8px）。整轮约 1.2s、原地迈步、无左右位移；「减少动态效果」下放慢到 2.6s |

## 安装

### 方式一：应用内安装（推荐）

「设置 → 插件 → 添加插件」里填**绝对路径**（相对路径会被拒绝——Host 的工作目录和填表的人无关）：

    <本仓库>\dist\dsh-anime-waifu-0.10.6.tgz     ← 本地 tarball，可热生效
    <本仓库根目录>                              ← 本地目录（link），需重启一次
    https://github.com/yigehai/dsh-anime-waifu/releases/tag/v0.10.6   ← 或从 Releases 下载附件 dsh-anime-waifu-0.10.6.tgz

应用内的插件管理会自己跑 pnpm，装完调用 reconcileProfilePatches 让 Loader 重新收敛并广播
app-boot/config-reload；组合里带 hmr 服务时结果是 applied，刷新一次页面就能看到玉兔（`hmr` 缺失的启动期
profile 会提示「更改将在下次启动生效」）。**「热生效」只对 tarball 成立**，两种规格的差别在 Node 的模块解析层
（`@deepseek-ai/dsh-app-boot` 的 installRuntimeInterception，每个进程只在启动时装一次）：

- **tarball**：pnpm 把包解到 profile 的 node_modules 下，解析层按**位置**命中（路径落在 profiles 树里就有
  拦截层），热安装即可生效——和 dsh-tool-jev / dsh-srm-analysis 的装法一致。
- **本地目录**：pnpm 只建 link，包的真实路径在工作区里；解析层靠启动时扫描 `profile/node_modules` 下的
  symlink 得到 linked root，运行中的进程没有这层信息，插件里 `@deepseek-ai/schemastery` 这类 peer 导入会退到
  原生解析并失败（插件页报 `1 entry did not activate anime-waifu (dsh-anime-waifu): failed to import`）。
  这种情况下**重启一次**即可：启动期解析会带上这个 link root，之后 `lib/client.js` 的改动仍然只要刷新页面。

想从 link 换成 tarball：先在插件页**卸载** `dsh-anime-waifu`，再按上面的 tarball 路径安装，**然后完整重启一次
DSH**。卸载 + 安装两步本身都在热路径上（有 hmr 时 `application: applied`），但只换 profile 里的文件救不了这个错
误：解析层把「某个 import 方 + 某个请求」的**解析结果**缓存在进程内（`ResolutionRouter` 的 `esmRoutes` /
`parentRoutes.requests`，命中即直接返回缓存 URL，见 `@deepseek-ai/dsh-app-boot` 里 routeUrl 的 `requests.get` 与
adaptEsm 的 `state.esm`）。link 期间 `dsh-anime-waifu` 已经被解析成 link 的真实路径（工作区），这个 URL 之后一直
被复用，而工作区路径既不在 profiles 树里、也没有 link root，插件里的 `@deepseek-ai/schemastery` 仍然解析不到
—— 所以反复「卸载 + 装 tarball」都会得到同一个 `failed to import`。完整重启后缓存重建，profile 下已是真目录，按
位置命中拦截层，插件正常激活（之后 `lib/client.js` 的改动仍然只要刷新页面）。反过来，link 的目标目录改名 / 重新
链接 / 移除本地包，平台本来就把它们列为必须重启的情形。


### 方式二：命令行安装（**只对非 desktop profile 成立**）

    dsh plugin --profile tui add <本仓库>/dist/dsh-anime-waifu-0.10.6.tgz

**`--profile desktop` 会被 CLI 直接拒绝。** `@deepseek-ai/dsh/lib/bin.js` 里有：

    function rejectElectronProfile(program, profile) {
      if (profile.toLowerCase() === "desktop") program.error('error: profile "desktop" is managed exclusively by the Electron application')
    }

它同时作用于顶层 `--profile` 与 `dsh plugin --profile`（后者仅在 `manageDesktopProfile` 为真时放行，而该标志只有
Electron 应用自己调用 CLI 时才为真）。所以在桌面版上给 desktop profile 装插件**只能走应用内的「设置 → 插件 →
添加插件」**（即方式一）；照本段旧版文档执行会得到上面那行 error。另外 `dsh plugin` 本身不做任何安装逻辑，
只是把剩余参数转发给 profile 目录里的 pnpm（本机拉起 pnpm 会以 `0xC0000142` 失败）。

CLI 在 DSH 进程之外运行：它改 profile 的 package.json 与 dsh.profile.bundles，而运行中的进程不会自己去重新组合，
所以要重启一次。声明了 dsh.bundle 的包会被自动追加进该 profile 的 dsh.profile.bundles，无需手写。

### 之后改代码

改 lib/client.js 只要刷新页面（客户端 bundle 走带 rev 的组合路由，HMR 会调用 rebuilt）。改 package.json 的
dsh 声明、条目 id，或重新链接 / 移除本地包（源码里直接写死 requires a process restart），都要完全重启。

重新出包：仓库根的 pack-anime-waifu.mjs 会在 dsh-anime-waifu/dist/ 下重打 tarball，它不依赖 npm / pnpm，
直接用 Node 写 gzip + ustar，并在写完后把 tar 解析回来逐文件校验：

    node ./pack-anime-waifu.mjs

## 使用

- 点一下角色：随机说一句台词。
- 拖动角色：换位置（松手即保存）。
- 齿轮按钮：打开设置面板，所有改动即时生效并保存在浏览器 localStorage。
- ✕ 按钮 / Ctrl+Shift+A：藏起来或叫出来。
- 第三方配色由 `ctx.theme.register` 注册，但平台内置的「设置 → 通用 → 外观」开关只有 浅色 / 深色 / 跟随系统
  三档，所以「碧蓝 / 星夜紫罗兰」的切换放在本插件的设置面板与插件页卡片里；插件用自己的 volatile `theme`
  字段记住选择，重启后自动套用，选「不套用」会把内置外观还原回去。
- 「设置 → 插件 → dsh-anime-waifu」详情页有状态卡片与快捷按钮。

## 配置（部署默认值）

Host 半侧的 Config 字段都是 volatile：既能写在 profile 的 cordis.patch.yml 里，也会出现在
本插件页的配置面上。浏览器半侧在回环页面通过 ctx.configForms 读取它们，作为「用户没改过」时的默认值；
用户在本机改过的值存在 localStorage 且优先级更高。

    - id: anime-waifu            # 条目 id，浏览器半侧按它读取默认值
      name: 'dsh-anime-waifu'
      config:
        enabled: true            # 是否显示玉兔
        size: 133                # 宽度 px（80-360），默认=原来的 2/3
        opacity: 1               # 不透明度（0.3-1）
        position: right          # right | left
        sakura: true             # 花瓣特效（蓝色）
        stars: true              # 星夜特效
        theme: 'off'             # off | anime-azure | anime-night
        artStyle: 'raster'       # raster=生成的玉兔图 | svg=手绘矢量
        idleSeconds: 60          # 主动说话的间隔秒（15-600）
        petalCount: 14           # 花瓣数量（0-60）
        petalSpeed: 1            # 飘落速度倍率（0.2-3）
        starCount: 20            # 星点数量（0-120）
        dockMargin: 16           # 玉兔距屏幕边缘的距离 px（0-160）
        bubbleSeconds: 6.5       # 台词气泡停留秒（1-30）
        zIndex: 2147482000       # 玉兔所在层的叠放层级（1000-2147483000）
        walkWhenBusy: true       # 智能体干活时是否走动
        walkSpeed: 1             # 走动速度倍率（0.5-2）
        lines: ['今天也一起加油吧～']

注意：**patch 会整体替换该行的 config**，要改哪一个键都必须把整块 config 重述一遍。
另外浏览器半侧的 ENTRY_ID 常量固定为 anime-waifu；如果安装时改了行 id，请同步修改
lib/client.js 顶部的 ENTRY_ID，否则只会退回内置默认值（功能不受影响）。

## 包结构

    dsh-anime-waifu/
      package.json        名字、exports、dsh.bundle（patch）与 dsh.client（platform: web, immediately）
      cordis.patch.yml    插入 anime-waifu 这一行，让 dsh plugin 能把它当 bundle 安装
      lib/index.js        Host 半侧：Config（volatile 部署默认值）+ 关掉自动生成的通用表单
      lib/client.js       浏览器半侧：惰性 CJS 工厂产物（玉兔 / 特效 / 主题 / 面板 / 插件页卡片）
      locale/zh.json      插件页显示名与简介（中文）：{"meta":{"title":"中秋玉兔",...}}
      locale/en.json      同上（英文，回退用）
      assets/preview.png  预览图（仅文档用）
      assets/icon.svg     插件页卡片的图标（手绘矢量，package.json 的 icon 字段）
      art/                加工好的 9 张透明 WebP（1 立绘 + 8 帧步态），即内嵌进 client.js 的那批图
      scripts/pack.mjs    纯 Node 打包器（产出 dist/<name>-<version>.tgz，写完回读校验）
      LICENSE             MIT
      test/harness.js     无浏览器冒烟测试
      README.md

浏览器半侧只 require 平台内置模块（react、react/jsx-runtime）；主题服务与配置表单都是**可选**服务（用
ctx.inject 可选绑定，缺席时玉兔照常工作），所以包本身没有运行时的包间 import 依赖。

但 dsh.client.inject 必须声明一条顺序边：

    "dsh": { "client": { "platform": "web", "immediately": true,
                         "inject": ["@deepseek-ai/dsh-client-ui-plugin-manager"] } }

插件页卡片注册在 keyed 槽 plugins.bundle.config 上（key 必须是 bundle 包名 dsh-anime-waifu），而这个槽由
@deepseek-ai/dsh-client-ui-plugin-manager 的 main 面板条目声明——**注册一个尚未声明的槽会在插件激活期失败**，
所以要声明这条边保证它先装载。官方技能文档给第三方 bundle 卡片举的 manifest 例子同样是这条边。

## 素材（art/）

`art/` 下是加工好的 9 张透明 WebP：`front.webp`（正面立绘）+ `walk-0..7.webp`（8 帧步态）。
它们就是 `lib/client.js` 里内嵌的那批图（浏览器半侧取不到插件包里的本地文件，所以以 data URI 内嵌）。
加工方式见下方「生成图素材从哪来」；换素材时按同样方式加工后覆盖这里，再跑 `node scripts/pack.mjs` 重新出包。

## 实现要点（与平台 API 对齐）

- **部署默认值**：Host 半侧 Config 的十五个字段全部 `.volatile()`。平台的设置服务只把「带 volatile 字段」的条目
  投影给浏览器半侧（`SettingsForms.describe()` 里 `ns = entry.options.id`），所以 `ctx.configForms.get()` 的
  **entry id 必须和 cordis.patch.yml 里的行 id 一致**；volatile 引用过线前会被解成普通值，客户端拿到的就是
  普通数字 / 布尔 / 字符串数组。
- **页面归属**：Host 半侧调用 `settings.configure({ auto: false }, ctx.fiber)`，表示「这一行的配置页由插件自己画」，
  避免设置页再自动生成一份通用表单（平台自带的 ui-theme、llm-deepseek 等用的是同一写法）。
- **写回**：面板与卡片里的改动会经 `ConfigFormController.set(field, value)` 写回 Host（落在 profile 的 patch
  文档里）。`set()` 返回的承诺解析出 `false` 表示 Host 没有接受这次写回（非回环页面、只读字段或 revision
  冲突）：本地 localStorage 仍然生效，但卡片会显示「配置仅在本地生效」徽标，不假装写成功。
- **气泡不参与布局**：`.aw-bubble` 绝对定位在兔子正上方（`bottom:100%` + `left:50%` + `translateX(-50%)`），宽度 `clamp(180px, var(--aw-size), 220px)`，并在每次说话时按视口横向夹一道、上方放不下时翻到兔子下方。这样台词长短**不会改变** `.aw-mascot` 盒子的尺寸——否则内容一长就把整列撑宽、把兔子挤偏，拖拽时 `getBoundingClientRect()` 也会跟着变。齿轮 / ✕ 按钮则绝对定位在盒子右上角（长耳两侧的空白处），不会压到气泡。
- **状态来源**：浏览器半侧**收不到**宿主的 `agent/status` / `agent/assistant-stream`（那是宿主 context 的事件）。真正的状态源在会话层：首选 `@deepseek-ai/dsh-client-ui-session` 提供的 `uiSession.sessionStatus`（`Map<会话 id, { running, pendingInteraction, completionUnread }>`，还会从会话列表兜底补齐「插件加载时就已经在跑」的会话），备选是网关的 remote 事件 `api-session/status(sessionId, running)`（宿主侧由 `agent/status` 转发，只报变化）。两者取或 → `busy`；`busy && enabled && walkWhenBusy` 时才挂 `aw-walking`。
- **卡片的读写通道**：`@deepseek-ai/dsh-client-ui-plugin-manager` 渲染本 bundle 详情页时只派发
  `{ view: 'page' }`（没有 `form` 属性），且整段配置区只在 `ledger.bundles.has(pkg.name)` 为真时渲染——也就是
  「有卡片认领了这个包名」。所以卡片自己取表单：`ctx.configForms.get('anime-waifu')`
  （`@deepseek-ai/dsh-client-ui-settings` 提供的 `ConfigFormController`，API 为 `getSnapshot()` / `subscribe()` /
  `set()` / `unset()`），而不是等 owner 传进来。
- **插件页显示名与图标**：「设置 → 插件」里那张卡片的标题**不是包名**，而是 `readPluginMeta()` 从 `<包>/locale/<lang>.json` 的 `meta.title` 取的（英文回退到 package.json 的 `name`），图标取 package.json 的 `icon` 字段（包内相对路径、≤256KiB、PNG/JPEG/WebP/SVG）；`locale/*.json` 还必须出现在 `exports` 里，否则解析不到。所以本插件的显示名是 **中秋玉兔**（英文 Mid-Autumn Jade Rabbit），而 npm 包名仍是 `dsh-anime-waifu`——npm 包名不能是中文，且它同时是安装标识与 `plugins.bundle.config` 的槽 key，不能改。
- **版本落差（重要）**：官方技能文档 `dsh-plugin-development` §7 写的 Host 侧写法是
  `settings.installSection(ctx, '<namespace>', Config, config, hooks)`、客户端用
  `ctx.settingsScope.bind({ namespace })`。本机安装的 DSH（安装目录下的 `resources/app.asar`）里
  **`installSection` 与 `settingsScope` 都不存在**（已在整个 asar 里检索确认）：本构建的 Host 侧 API 是
  `settings.configure(presentation, fiber)`，客户端是 `ctx.configForms`。照着文档抄会静默不生效，改 API 前先
  在安装包里查一遍符号。
- **生成图素材从哪来**：`art/` 下是加工出的 9 张透明 WebP（`front.webp` 正面立绘 + `walk-0..7.webp` 8 帧步态）；它们的上游是两张手工生成的 1672×941 原图（正面立绘、8 格横排走路条带），原图不入库。加工流程：先按列投影把条带自动切成 8 个 figure，按**背景连通性**定 alpha——以四边和所有近似背景色像素为种子洪水填充，外部按颜色距离软过渡、内部恒为 1（眼睛 / 项圈 / 流苏不会被误伤），再做 alpha 3×3 羽化与边缘颜色外扩；这样轮廓上既没有深色锯齿，也不会残留被围住的背景空隙，再裁到最小包围盒、统一缩放、以躯干中心水平对齐、脚底对齐 695/720。加工用归档里自带的 sharp（`@deepseek-ai/dsh` 的 `sharp` + `@img/sharp-win32-x64`，原生 `.node` 不能从 asar 直接 dlopen，先复制到真实目录再 require）。
- **走动帧的一致性**：0.10.0 换成**一条 8 格横排条带**后，8 格身高极差 1.0%、头宽极差 3.6%、脚底极差 3px，属于同一张图内的天然一致；不再需要之前的跨条带折中缩放（那一版的「头部胀缩 + 灯笼前后摆」随之消失）。
- **第三方主题不会被平台持久化**：`ThemeRuntime.setTheme('anime-*')` 只改运行时偏好（内置外观 schema 只接受
  light / dark / system），因此插件用自己的 volatile `theme` 字段记录选择并在启动时重新套用。
## 自测

test/harness.js 是一个不依赖浏览器的冒烟测试：它用极简 DOM 桩加载 lib/client.js 的工厂，跑完
挂载 → 读取 Host 默认值 → 交互 → 主题注册 → 插件页卡片渲染 → 卸载，并校验主题的注册与释放、
设置同步、事件反应和 DOM 清理。在包根目录执行（需要能运行 node 的环境）：

    node -e "const fs=require('fs');new Function('fs','return (async()=>{'+fs.readFileSync('test/harness.js','utf8')+'})()')(fs)"

- 仓库根另有 `scripts/pack.mjs`：纯 Node 写的打包器（512 字节头 + gzip，写完回读逐条校验），`node scripts/pack.mjs` 产出 `dist/<name>-<version>.tgz`。
- harness 另外验证「形象」下拉与步态：默认渲染 `.aw-raster` 且其 src 是内嵌 WebP 的 data URI、走步精灵恰好 8 帧、八个相位 class 各对应一帧、切到 svg 后腿回来、再切回 raster 仍在。

## 卸载

    dsh plugin --profile desktop remove dsh-anime-waifu

然后重启 DSH。插件卸载时会自动移除自己注入的 style 元素、DOM 节点、事件监听与注册的主题。

## 故障排查

| 现象 | 原因 / 处理 |
| --- | --- |
| 插件在，但页面没有玉兔 | 未完全重启 Web；或组合里没有加载该 bundle（看 --dump-config 是否有这一层） |
| 启用失败：`1 entry did not activate anime-waifu (dsh-anime-waifu): failed to import` | 该 entry 的解析结果被**进程内缓存**（见「安装」）：先前用**目录**（link）热装过，就会一直解析到工作区那条真实路径，那里没有拦截层，`@deepseek-ai/*` 这类 peer 导入解析不到 → **完整重启一次 DSH**（卸载 + 改装 tarball 都不会改变这份缓存）。首次就直接用 tarball 安装则不需要重启 |
| 插件页没有卡片 | bundle 未进 dsh.profile.bundles，或缺 dsh.client 声明 / 未构建 lib/client.js |
| 玉兔空白 / 只有气泡 | 生成图被页面策略拦截时会自动回退手绘 SVG 并在控制台打印一行 warn；两套形象都没有时请看「样式表被移除」那条 |
| 切到生成图后看不出在走动 | 走动用的是 8 帧位图步态（约 150ms 一帧、整轮约 1.2s）；若几乎不动，检查是否被系统「减少动态效果」按下了（该偏好会把整轮拉长到 2.6s） |
| 主题按钮是灰的 | 组合里没有 ctx.theme（@deepseek-ai/dsh-client-ui-theme） |
| 主题列表没有新配色 | 该 id 已被别的插件注册（重复注册会抛错，被捕获后只跳过该配色），且平台「外观」开关不会列出第三方配色——用本插件的设置面板 / 卡片切换 |
| 改了 config 不生效 | patch 是整块替换；或浏览器本地已有同名偏好（面板里「恢复默认」清掉）；卡片显示「配置仅在本地生效」说明 Host 没接受写回（非回环页面 / 只读字段 / revision 冲突） |
| 页面启动报 fiber FAILED | 检查 lib/client.js 是否语法完整、plugins.bundle.config 槽位 key 是否为包名 |
| 玉兔 / 面板变成裸控件（DOM 在、样式没了） | 样式表被别的代码从 document.head 移除了。0.7.6 起插件带**样式守卫**：发现丢失或内容不符就按当前 CSS 重新注入，并在控制台留一行 `[dsh-anime-waifu] 样式表被移除，已按当前 CSS 重新注入`。若仍不生效，把这条警告与其它控制台报错发我 |
| 兔子一直走 / 一直站 | 走动只在「有会话 running」时触发：看卡片徽标是「干活中 · 走动」还是「待机 · 站定」；若状态不跟随，确认组合里加载了 \`@deepseek-ai/dsh-client-ui-session\`（uiSession 服务），或退一步依赖网关的 remote 事件 api-session/status；面板里「干活时走动」关掉就一直站定 |

## 许可

MIT
