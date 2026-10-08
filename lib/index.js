import z from '@deepseek-ai/schemastery'

/**
 * Host half of the 二次元 plugin.
 *
 * The animation, the mascot, the blossom/star effects and the two anime
 * palettes all live in the browser half (`./client`). This half owns the
 * *deployment defaults*: every value a deployment may want to change is a
 * volatile Config field, so it can be set from cordis.patch.yml and edited live
 * on this plugin's page in the 「插件」 panel. The browser half reads the same
 * values through the settings surface when one is served (loopback pages) and
 * falls back to its own built-in defaults otherwise.
 */

export const name = 'dsh-anime-waifu'

/** The loader entry id this bundle's patch declares; also the settings entry id. */
export const ENTRY_ID = 'anime-waifu'

/** Opening lines the rabbit says while idling. Users replace them in the panel. */
export const DEFAULT_LINES = [
  '今天也一起加油吧～',
  '写代码累了的话，抬头看看天休息一下？',
  '这个 bug……要不要我帮你盯着？',
  '诶嘿，被你发现了！',
  '记得多喝水哦～',
  '主人的终端今天也很精神呢！',
  '需要我帮你查资料吗？',
  '唔……让我想想……',
  '要不要试着换个思路？',
  '我一直都在这里陪着你哦。',
  '思路卡住的时候，看看飘落的花瓣吧。',
  '今天的进度条也很努力呢！',
]

/**
 * Deployment-varying values. All fields are volatile so the settings surface
 * can serve them to the browser half and the plugin page can edit them live.
 */
export const Config = z.object({
  enabled: z.boolean().default(true).description('是否显示玉兔').volatile(),
  size: z.number().step(1).min(80).max(360).default(133).description('玉兔宽度（px）').volatile(),
  opacity: z.number().step(0.05).min(0.3).max(1).default(1).description('玉兔不透明度').volatile(),
  position: z.union(['left', 'right']).default('right').description('停靠角落').volatile(),
  sakura: z.boolean().default(true).description('花瓣飘落特效（蓝色）').volatile(),
  stars: z.boolean().default(true).description('星夜闪烁特效').volatile(),
  theme: z.union(['off', 'anime-azure', 'anime-night']).default('off').description('启动时套用的二次元主题').volatile(),
  idleSeconds: z.number().step(1).min(15).max(600).default(60).description('主动说话的间隔（秒）').volatile(),
  petalCount: z.number().step(1).min(0).max(60).default(14).description('花瓣数量').volatile(),
  petalSpeed: z.number().step(0.1).min(0.2).max(3).default(1).description('花瓣飘落速度倍率').volatile(),
  starCount: z.number().step(1).min(0).max(120).default(20).description('星点数量').volatile(),
  dockMargin: z.number().step(1).min(0).max(160).default(16).description('玉兔距屏幕边缘的距离（px）').volatile(),
  bubbleSeconds: z.number().step(0.5).min(1).max(30).default(6.5).description('台词气泡停留时间（秒）').volatile(),
  zIndex: z.number().step(1).min(1000).max(2147483000).default(2147482000).description('玉兔所在层的叠放层级').volatile(),
  walkWhenBusy: z.boolean().default(true).description('智能体执行任务时让兔子走动，空闲时站定').volatile(),
  artStyle: z.union(['raster', 'svg']).default('raster').description('玉兔形象：raster=生成的玉兔图，svg=手绘矢量').volatile(),
  walkSpeed: z.number().step(0.1).min(0.5).max(2).default(1).description('走动速度倍率').volatile(),
  lines: z.array(z.string()).default([...DEFAULT_LINES]).description('玉兔台词').volatile(),
})

/**
 * Publish deployment defaults. Every runtime effect this plugin owns lives in
 * the browser half, so the host half only declares that its page owns the
 * configuration form for this entry (the browser half renders that page).
 * @param ctx - host plugin context.
 */
export function apply(ctx) {
  ctx.inject(['settings'], (child) => {
    // The browser half draws this entry's page in the 「插件」 panel, so the
    // settings surface must not also auto-generate a generic form for it.
    child.effect(() => child.settings.configure({ auto: false }, ctx.fiber))
  })
}
