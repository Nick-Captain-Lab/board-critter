import { ALMANAC, ALMANAC_KEYS } from './almanac.ts'

// 純函式：時間、季節、節日、小怪獸 SVG。不碰 $，方便測試。

/**
 * epoch 毫秒 → 某個時區的日期（YYYY-MM-DD）與小時，不依賴執行環境的時區。
 * offsetHours 預設 8（台灣、香港），節氣與農曆資料也是 UTC+8 的日期
 */
export function localTime(ms: number, offsetHours = 8): { date: string; h: number } {
  const d = new Date(ms + offsetHours * 60 * 60 * 1000)
  const p = (n: number) => String(n).padStart(2, '0')

  return { date: `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`, h: d.getUTCHours() }
}

// ---- 看板小怪獸（Clawd）動畫 ---------------------------------------------

export type Mood = 'walk' | 'jump' | 'bob' | 'sleep'

/** 做完一輪、待辦全部打勾後，開心跳多久 */
export const JUMP_MS = 2 * 60_000
/** 多久沒動靜就睡著 */
export const SLEEP_MS = 10 * 60_000

/**
 * 小怪獸現在該做什麼：
 * 我在工作 → 走路；待辦剛全部完成 → 跳；閒置太久 → 睡覺；其他 → 呼吸跳動
 */
/** sleepMs：閒置多久睡著，0 表示永遠不睡 */
export function mood(s: { busy: boolean; done: number; total: number; lastActiveMs: number; now: number; sleepMs?: number }): Mood {
  if (s.busy) return 'walk'
  const since = s.lastActiveMs > 0 ? s.now - s.lastActiveMs : 0
  if (s.total > 0 && s.done === s.total && since < JUMP_MS) return 'jump'
  const sleepMs = s.sleepMs ?? SLEEP_MS
  if (sleepMs > 0 && since >= sleepMs) return 'sleep'

  return 'bob'
}

/**
 * 季節用「四立＋二分二至」切成 8 段（日期來自 almanac.ts）：
 * 早春 立春～春分、晚春 春分～立夏、梅雨 立夏～夏至、盛夏 夏至～立秋、
 * 秋老虎 立秋～秋分、深秋 秋分～立冬、初冬 立冬～冬至、寒冬 冬至～立春
 */
export type Stage =
  | 'earlySpring'
  | 'lateSpring'
  | 'plumRain'
  | 'midsummer'
  | 'autumnHeat'
  | 'lateAutumn'
  | 'earlyWinter'
  | 'deepWinter'
export type Holiday =
  | 'newyear'
  | 'lunarNewYear'
  | 'lantern'
  | 'valentine'
  | 'qingming'
  | 'dragonBoat'
  | 'qixi'
  | 'midAutumn'
  | 'halloween'
  | 'christmas'
/** 節氣當天會拿在手上的小道具 */
export type Term = '立春' | '夏至' | '冬至'
/** year：跨年時要寫在天空的年份（12/31 寫明年，1/1 寫今年） */
export type Scene = { stage: Stage; holiday: Holiday | null; night: boolean; term?: Term; year?: number }

// almanac.ts 沒有的年份（2101 以後）用平均日期頂著
const FALLBACK = '020403200405050506210807092311071222'

/** 某年某個節氣或農曆節日的 MM-DD */
export function almanacOf(year: number, key: (typeof ALMANAC_KEYS)[number]): string | undefined {
  const i = ALMANAC_KEYS.indexOf(key)
  const row = ALMANAC[year] ?? (i < 9 ? FALLBACK : undefined)
  if (row === undefined) return undefined
  const mmdd = row.slice(i * 4, i * 4 + 4)

  return `${mmdd.slice(0, 2)}-${mmdd.slice(2)}`
}

const DAY_MS = 86_400_000
const dayNum = (ymd: string) => Date.UTC(+ymd.slice(0, 4), +ymd.slice(5, 7) - 1, +ymd.slice(8, 10)) / DAY_MS

/** 今天的節日（台灣日期 YYYY-MM-DD）；沒有就 null */
export function holidayOf(date: string): Holiday | null {
  const year = +date.slice(0, 4)
  const md = date.slice(5)
  const cny = almanacOf(year, '春節')
  if (cny !== undefined) {
    const offset = dayNum(date) - dayNum(`${year}-${cny}`)
    // 小年夜（除夕前一天）到初五
    if (offset >= -2 && offset <= 4) return 'lunarNewYear'
  }
  // 春節在 1/1～1/2 時，小年夜、除夕會落在前一年底
  const nextCny = almanacOf(year + 1, '春節')
  if (nextCny !== undefined) {
    const ahead = dayNum(`${year + 1}-${nextCny}`) - dayNum(date)
    if (ahead >= 1 && ahead <= 2) return 'lunarNewYear'
  }
  if (md === almanacOf(year, '元宵')) return 'lantern'
  if (md === almanacOf(year, '端午')) return 'dragonBoat'
  if (md === almanacOf(year, '七夕')) return 'qixi'
  const moon = almanacOf(year, '中秋')
  if (moon !== undefined) {
    const toMoon = dayNum(date) - dayNum(`${year}-${moon}`)
    if (toMoon >= -1 && toMoon <= 0) return 'midAutumn'
  }
  if (md === '12-31' || md === '01-01') return 'newyear'
  if (md === '02-14') return 'valentine'
  if (md === almanacOf(year, '清明')) return 'qingming'
  if (md === '10-31') return 'halloween'
  if (md >= '12-18' && md <= '12-25') return 'christmas'

  return null
}

const STAGE_STARTS: [(typeof ALMANAC_KEYS)[number], Stage][] = [
  ['立春', 'earlySpring'],
  ['春分', 'lateSpring'],
  ['立夏', 'plumRain'],
  ['夏至', 'midsummer'],
  ['立秋', 'autumnHeat'],
  ['秋分', 'lateAutumn'],
  ['立冬', 'earlyWinter'],
  ['冬至', 'deepWinter'],
]

/** 今天在哪一段（節氣當天就算進新的一段） */
export function stageOf(date: string): Stage {
  const year = +date.slice(0, 4)
  const md = date.slice(5)
  let stage: Stage = 'deepWinter' // 1/1～立春前：還是去年冬至開始的寒冬
  for (const [key, st] of STAGE_STARTS) if (md >= (almanacOf(year, key) ?? '99-99')) stage = st

  return stage
}

/** night：晚上從幾點開始、到幾點結束（預設 18～6） */
export function sceneOf(date: string, h: number, night = { from: 18, to: 6 }): Scene {
  const year = +date.slice(0, 4)
  const md = date.slice(5)
  const holiday = holidayOf(date)
  const sc: Scene = { stage: stageOf(date), holiday, night: night.from > night.to ? h >= night.from || h < night.to : h >= night.from && h < night.to }
  for (const t of ['立春', '夏至', '冬至'] as const) if (md === almanacOf(year, t)) sc.term = t
  if (holiday === 'newyear') sc.year = year + (md === '12-31' ? 1 : 0)

  return sc
}

export const SCENE_LABEL: Record<Stage | Holiday, string> = {
  earlySpring: '早春',
  lateSpring: '晚春',
  plumRain: '梅雨',
  midsummer: '盛夏',
  autumnHeat: '秋老虎',
  lateAutumn: '深秋',
  earlyWinter: '初冬',
  deepWinter: '寒冬',
  newyear: '跨年',
  lunarNewYear: '過年',
  lantern: '元宵',
  valentine: '情人節',
  qingming: '清明',
  dragonBoat: '端午',
  qixi: '七夕',
  midAutumn: '中秋',
  halloween: '萬聖節',
  christmas: '聖誕節',
}

// 照官方 App 圖量的比例：正方格 11 欄 × 8 列；身體 6 列、眼睛在第 3 列、手在第 3～4 列、腳 2 列
const MASCOT_ROWS = [
  ' BBBBBBBBB ',
  ' BBBBBBBBB ',
  'BB BBBBB BB',
  'BBBBBBBBBBB',
  ' BBBBBBBBB ',
  ' BBBBBBBBB ',
  ' B B   B B ',
  ' B B   B B ',
]
const U = 12
const CW = U
const CH = U
const BODY_ROWS = 6
const EYES = [2, 8] // 眼睛所在欄（第 3 列）
// 舊版道具是照「頭頂 x 30～150、中心 90」畫的；新頭頂是 x 12～120、中心 66，用這個轉換套上去
const ON_HEAD = 'translate(66 0) scale(0.9) translate(-90 0)'
const ORANGE = '#D97757'
// 畫布：小怪獸在 x 0～132、y 0～96，四周留空間給背景道具
const VB = { x: -54, y: -50, w: 240, h: 165 }
const GROUND = 96

// 固定的假亂數，讓每次畫出來的雪、花瓣位置都一樣（同一個場景 SVG 不變，面板就不會重播動畫）
const spots = (n: number, seed: number) =>
  Array.from({ length: n }, (_, i) => {
    const r = Math.sin((i + 1) * 12.9898 + seed * 78.233) * 43758.5453

    return { x: VB.x + (r - Math.floor(r)) * VB.w, d: ((i * 7 + seed) % 10) / 10, k: i }
  })

/** 往下飄的東西（雪、花瓣、落葉、雨） */
function falling(shape: (k: number) => string, n: number, seed: number, dur: number, cls = 'fall') {
  return spots(n, seed)
    .map(
      p =>
        `<g transform="translate(${p.x.toFixed(1)} ${VB.y})"><g class="${cls}" style="animation-duration:${dur}s;animation-delay:-${(p.d * dur).toFixed(2)}s">${shape(p.k)}</g></g>`,
    )
    .join('')
}

/** 往上飄的東西（愛心、天燈） */
function rising(shape: (k: number) => string, n: number, seed: number, dur: number) {
  return spots(n, seed)
    .map(
      p =>
        `<g transform="translate(${p.x.toFixed(1)} ${GROUND})"><g class="rise" style="animation-duration:${dur}s;animation-delay:-${(p.d * dur).toFixed(2)}s">${shape(p.k)}</g></g>`,
    )
    .join('')
}

const stars = (n: number) =>
  spots(n, 3)
    .map(
      p =>
        `<circle class="twinkle" cx="${p.x.toFixed(1)}" cy="${(VB.y + 6 + ((p.k * 17) % 34)).toFixed(1)}" r="1.4" fill="#fff" style="animation-delay:-${(p.d * 2).toFixed(2)}s"/>`,
    )
    .join('')

const moon = (cx: number, cy: number, r: number, full: boolean, sky: string) =>
  full
    ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#F6E7A1"/>`
    : `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#F6E7A1"/><circle cx="${cx + r * 0.45}" cy="${cy - r * 0.3}" r="${r * 0.85}" fill="${sky}"/>`

const sunAt = (x: number, y: number, k: number, color = '#F4B63F') => `<g transform="translate(${x} ${y}) scale(${k})"><g class="spin">${Array.from({ length: 8 }, (_, i) => `<rect x="-1.5" y="-19" width="3" height="6" fill="${color}" transform="rotate(${i * 45})"/>`).join('')}</g><circle r="10" fill="${color}"/></g>`

const lanternShape = (x: number, y: number, s = 1, color = '#D8352A') =>
  `<g transform="translate(${x} ${y}) scale(${s})"><line x1="0" y1="-14" x2="0" y2="-8" stroke="#8a5a2b" stroke-width="1"/><rect x="-4" y="-9" width="8" height="2" fill="#E3B341"/><ellipse cx="0" cy="0" rx="9" ry="8" fill="${color}"/><rect x="-4" y="7" width="8" height="2" fill="#E3B341"/><line x1="0" y1="9" x2="0" y2="14" stroke="#E3B341" stroke-width="1.5"/></g>`

const heart = (s: number) =>
  `<path transform="scale(${s})" d="M0 3 C-6 -3 -10 2 0 9 C10 2 6 -3 0 3Z" fill="#E86A8C"/>`

const burst = (cx: number, cy: number, color: string, delay: number) =>
  `<g transform="translate(${cx} ${cy})"><g class="burst" style="animation-delay:-${delay}s">${Array.from(
    { length: 10 },
    (_, i) => {
      const a = (i / 10) * Math.PI * 2

      return `<circle cx="${(Math.cos(a) * 14).toFixed(1)}" cy="${(Math.sin(a) * 14).toFixed(1)}" r="1.8" fill="${color}"/>`
    },
  ).join('')}</g></g>`

/** 戴在小怪獸頭上的東西（跟著身體一起動） */
function hatOf(holiday: Holiday | null, stage: Stage): string {
  const h = hatShape(holiday, stage)

  return h === '' ? '' : `<g transform="${ON_HEAD}">${h}</g>`
}

function hatShape(holiday: Holiday | null, stage: Stage): string {
  if (holiday === 'christmas')
    return `<path d="M40 2 L140 2 L118 -22 L150 -34 L100 -26 Z" fill="#D8352A"/><rect x="34" y="-6" width="112" height="9" rx="4" fill="#fff"/><circle cx="152" cy="-34" r="6" fill="#fff"/>`
  if (holiday === 'lunarNewYear')
    return `<rect x="60" y="-14" width="60" height="14" fill="#F2C14E"/><rect x="50" y="-3" width="80" height="5" fill="#D9A23A"/><circle cx="90" cy="-17" r="4" fill="#fff3c4"/>`
  if (holiday === 'halloween')
    return `<path d="M60 0 L120 0 L100 -38 L82 -30 Z" fill="#6B4E9A"/><rect x="44" y="-4" width="92" height="6" rx="3" fill="#6B4E9A"/><rect x="62" y="-9" width="56" height="5" fill="#E8822C"/>`
  // 梅雨季：撐一把傘（傘柄插在頭頂）
  if (holiday === null && stage === 'plumRain')
    return `<line x1="90" y1="-24" x2="90" y2="2" stroke="#5A4632" stroke-width="3.5"/><g transform="translate(90 -14) scale(0.667) translate(-90 26)"><path d="M20 -26 Q90 -70 160 -26 Q142 -32 125 -26 Q108 -32 90 -26 Q72 -32 55 -26 Q38 -32 20 -26Z" fill="#3E7CC9"/><circle cx="90" cy="-48" r="2.5" fill="#3E7CC9"/></g>`

  return ''
}

/** 拿在左手上的小東西（跟著身體一起動）；左手在 x 0～12、y 24～48（右上角留給太陽月亮） */
function heldOf(holiday: Holiday | null, term: Term | undefined): string {
  if (holiday === null && term === '冬至')
    // 一碗湯圓
    return `<g transform="translate(4 23)"><circle cx="-4" cy="-4" r="3.5" fill="#fff"/><circle cx="3" cy="-5" r="3.5" fill="#F5A8B8"/><circle cx="0" cy="-8" r="3.5" fill="#fff"/><path d="M-12 -3 L12 -3 Q11 6 0 6 Q-11 6 -12 -3Z" fill="#5B8DC9"/></g>`
  if (holiday === null && term === '夏至')
    // 冰棒
    return `<g transform="translate(4 24) rotate(-12)"><rect x="-1.5" y="-6" width="3" height="10" fill="#D9B27C"/><rect x="-6" y="-24" width="12" height="19" rx="5" fill="#F27A9B"/><rect x="-6" y="-14" width="12" height="3" fill="#fff" opacity=".6"/></g>`
  if (holiday === null && term === '立春')
    // 春捲
    return `<g transform="translate(2 18) rotate(-20)"><rect x="-12" y="-5" width="24" height="10" rx="5" fill="#E8C77E"/><line x1="-4" y1="-5" x2="-4" y2="5" stroke="#C9A25E" stroke-width="1.2"/><line x1="4" y1="-5" x2="4" y2="5" stroke="#C9A25E" stroke-width="1.2"/><circle cx="-12" cy="0" r="3" fill="#7FB34A"/></g>`
  switch (holiday) {
    case 'lantern':
      // 燈籠掛在手下面晃
      return `<g class="sway" style="transform-origin:6px 48px">${lanternShape(6, 62, 1)}</g>`
    case 'dragonBoat':
      return `<g transform="translate(4 25)"><path d="M-11 0 L11 0 L0 -18 Z" fill="#4F8A3C" stroke="#2E5E22" stroke-width="1.5" stroke-linejoin="round"/><line x1="-6" y1="-8" x2="6" y2="-8" stroke="#C9A25E" stroke-width="2"/></g>`
    case 'midAutumn':
      return `<g transform="translate(-6 14)"><circle r="10" fill="#C98B3C"/><circle r="6.5" fill="none" stroke="#9C6524" stroke-width="1.5"/></g>`
    case 'halloween':
      return `<g transform="translate(-6 14)"><ellipse rx="13" ry="10" fill="#E8822C"/><rect x="-1.5" y="-14" width="3" height="5" fill="#4F6B2C"/><path d="M-6 -3 L-2 -3 L-4 -6Z M2 -3 L6 -3 L4 -6Z" fill="#3B2A4A"/><rect x="-5" y="3" width="10" height="2" fill="#3B2A4A"/></g>`
    default:
      return ''
  }
}

/** 天空顏色：白天看季節，晚上統一深藍；節日蓋過去 */
function skyOf(sc: Scene): string {
  if (sc.holiday === 'halloween') return '#3A2D4F'
  if (sc.holiday === 'lunarNewYear') return '#E60012'
  if (sc.holiday === 'qingming') return sc.night ? '#2B3138' : '#D9DEE3'
  if (sc.holiday === null && sc.stage === 'plumRain' && sc.night) return '#27313D'
  if (sc.night || sc.holiday === 'newyear' || sc.holiday === 'midAutumn') return '#1F2A44'

  if (sc.holiday === 'dragonBoat') return '#FFF0CF'

  return {
    earlySpring: '#FFC9D7',
    lateSpring: '#CDEBB8',
    plumRain: '#A9BBCB',
    midsummer: '#8FD3F4',
    autumnHeat: '#FFD49A',
    lateAutumn: '#F3B97A',
    earlyWinter: '#CFE0F0',
    deepWinter: '#B4CFEA',
  }[sc.stage]
}

/** 背景天空與天氣（畫在小怪獸後面） */
function backdropOf(sc: Scene, sky: string): string {
  const dark = sc.night || ['newyear', 'midAutumn', 'halloween'].includes(sc.holiday ?? '')
  // 端午白天：天空上紅下藍（頂端紅、往下轉橘，接近地面變藍）
  const heatSky = sc.holiday === 'dragonBoat' && !sc.night
  // 過年：上亮紅、下深酒紅
  const cnySky = sc.holiday === 'lunarNewYear'
  let out = cnySky
    ? `<defs><linearGradient id="cnySky" gradientUnits="userSpaceOnUse" x1="0" y1="${VB.y}" x2="0" y2="${GROUND}"><stop offset="0" stop-color="#FF1A2E"/><stop offset=".55" stop-color="#C8102E"/><stop offset="1" stop-color="#7A0A1E"/></linearGradient></defs><rect x="${VB.x}" y="${VB.y}" width="${VB.w}" height="${VB.h}" rx="14" fill="url(#cnySky)"/>`
    : heatSky
    ? `<defs><linearGradient id="heatSky" gradientUnits="userSpaceOnUse" x1="0" y1="${VB.y}" x2="0" y2="${GROUND}"><stop offset="0" stop-color="#FF4A2E"/><stop offset=".3" stop-color="#FF8A3D"/><stop offset=".62" stop-color="#FFC98A"/><stop offset="1" stop-color="#7EC8F0"/></linearGradient></defs><rect x="${VB.x}" y="${VB.y}" width="${VB.w}" height="${VB.h}" rx="14" fill="url(#heatSky)"/>`
    : `<rect x="${VB.x}" y="${VB.y}" width="${VB.w}" height="${VB.h}" rx="14" fill="${sky}"/>`
  out += `<rect x="${VB.x}" y="${GROUND}" width="${VB.w}" height="${VB.y + VB.h - GROUND}" fill="${dark ? '#00000059' : '#0000002e'}"/>`
  const rainy = sc.holiday === 'qingming' || (sc.holiday === null && sc.stage === 'plumRain')
  if (dark && sc.holiday !== 'lunarNewYear' && !rainy) out += stars(14)

  switch (sc.holiday) {
    case 'newyear':
      return (
        out +
        burst(-26, -26, '#F4B63F', 0) +
        burst(14, -40, '#E86A8C', 0.6) +
        burst(160, -28, '#7FD1E8', 1.2) +
        (sc.year === undefined
          ? ''
          : `<text x="66" y="-14" text-anchor="middle" font-size="24" font-weight="700" font-family="Menlo, monospace" fill="#F6E7A1" letter-spacing="1">${sc.year}</text>`)
      )
    case 'lunarNewYear':
      // 深磚紅地面（比天空底部再暗一階）
      return out + `<rect x="${VB.x}" y="${GROUND}" width="${VB.w}" height="${VB.y + VB.h - GROUND}" fill="#4A0E0E"/>` + `<g class="sway" style="transform-origin:-34px -50px">${lanternShape(-34, -28, 1, '#F2C14E')}</g><g class="sway" style="transform-origin:166px -50px;animation-delay:-.8s">${lanternShape(166, -28, 1, '#F2C14E')}</g>`
    case 'lantern':
      return out + moon(158, -30, 10, true, sky) + rising(k => lanternShape(0, 0, 0.5 + (k % 3) * 0.15), 5, 9, 9)
    case 'qingming':
      return out + falling(() => `<rect width="1.2" height="9" fill="#8EA3B5"/>`, 22, 4, 1.1, 'rain')
    case 'qixi':
    case 'valentine':
      return out + rising(k => heart(0.7 + (k % 3) * 0.25), 8, 5, 6)
    case 'midAutumn':
      return out + `<circle cx="150" cy="-18" r="38" fill="#F6E7A1" opacity=".18"/>` + moon(150, -18, 30, true, sky)
    case 'halloween':
      return out + moon(156, -28, 11, false, sky)
    case 'christmas':
      // 下雪加地上積雪
      return out + falling(() => `<circle r="2" fill="#fff"/>`, 20, 2, 5) + `<rect x="${VB.x}" y="${GROUND - 1}" width="${VB.w}" height="${VB.y + VB.h - GROUND + 1}" fill="#F4F8FC"/>`
    case 'dragonBoat':
      // 端午很熱：白天一顆超大太陽
      // 柏油路灰色地面
      if (!sc.night)
        return (
          out +
          sunAt(152, -22, 2.4, '#FFE066') +
          `<rect x="${VB.x}" y="${GROUND}" width="${VB.w}" height="${VB.y + VB.h - GROUND}" fill="#6E6E6E"/>` +
          // 地面往上飄的熱浪
          [-34, 6, 46, 86, 126, 171]
            .map(
              (x, i) =>
                `<g transform="translate(${x} ${GROUND + 6})"><path class="heat" style="animation-delay:-${(i * 0.45).toFixed(2)}s" d="M0 0 q4 -5 0 -10 q-4 -5 0 -10 q4 -5 0 -10" fill="none" stroke="#FFF4D6" stroke-width="2" stroke-linecap="round"/></g>`,
            )
            .join('')
        )
      break
    case null:
      break
  }

  const petal = (k: number) => `<ellipse rx="3.2" ry="2" fill="${k % 2 ? '#FFFFFF' : '#F27A9B'}"/>`
  const leaf = (colors: string[]) => (k: number) =>
    `<rect x="-3" y="-3" width="6" height="6" rx="1" fill="${colors[k % colors.length]}"/>`
  const rain = (n: number) => falling(() => `<rect width="1.2" height="9" fill="#7E93A6"/>`, n, 4, 1.1, 'rain')
  const snow = (n: number, r: number) => falling(() => `<circle r="${r}" fill="#fff"/>`, n, 2, 5)
  if (sc.night && !rainy) out += moon(158, -30, 10, false, sky)
  switch (sc.stage) {
    case 'earlySpring':
      // 櫻花季：滿天花瓣
      return out + falling(petal, 18, 1, 7, 'drift')
    case 'lateSpring':
      // 花謝長新葉，偶爾細雨
      return out + falling(petal, 4, 1, 7, 'drift') + falling(leaf(['#6FAE48', '#8CC461']), 6, 8, 8, 'drift') + rain(6)
    case 'plumRain':
      return out + rain(26)
    case 'midsummer':
      return out + (sc.night ? '' : sunAt(154, -26, 1.6))
    case 'autumnHeat':
      // 秋老虎：還是熱，太陽偏橘，零星黃葉
      return out + (sc.night ? '' : sunAt(156, -28, 1.2, '#F28C28')) + falling(leaf(['#E0A63A', '#D9B23A']), 4, 6, 9, 'drift')
    case 'lateAutumn':
      return out + falling(leaf(['#C2571F', '#8E3B1F', '#E07B2B']), 14, 6, 6, 'drift')
    case 'earlyWinter':
      return out + snow(9, 1.5)
    case 'deepWinter':
      // 大雪＋地上積雪
      return out + snow(26, 2.3) + `<rect x="${VB.x}" y="${GROUND - 1}" width="${VB.w}" height="${VB.y + VB.h - GROUND + 1}" fill="#F4F8FC"/>`
  }
}

/** 會動的小怪獸 SVG（CSS 動畫，面板自己播，不用 mod 重畫） */
export function mascotSvg(m: Mood, sc: Scene = { stage: 'earlySpring', holiday: null, night: false }): string {
  const cell = (x: number, y: number) =>
    `<rect x="${x * CW}" y="${y * CH}" width="${CW + 0.5}" height="${CH + 0.5}" fill="${ORANGE}"/>`
  // 同一列相連的方塊合成一條，方塊之間就不會有細縫
  const runs: { x: number; y: number; w: number }[] = []
  MASCOT_ROWS.slice(0, BODY_ROWS).forEach((row, y) => {
    for (const r of row.matchAll(/B+/g)) runs.push({ x: r.index ?? 0, y, w: r[0].length })
  })
  // 腳從身體裡面長出來（往上多畫一格、藏在身體後面），身體上下跳時腳跟身體不會分開
  const feet = [...(MASCOT_ROWS[BODY_ROWS] ?? '')].flatMap((ch, x) => (ch === 'B' ? [x] : []))
  const legRect = (x: number, extra: string) =>
    `<rect x="${x * CW}" y="${(BODY_ROWS - 1) * CH}" width="${CW}" height="${(MASCOT_ROWS.length - BODY_ROWS + 1) * CH}" ${extra}/>`
  const bodyRect = (r: { x: number; y: number; w: number }, extra: string) =>
    `<rect x="${r.x * CW}" y="${r.y * CH}" width="${r.w * CW}" height="${CH + 1}" ${extra}/>`
  const legGroups = (extra: string) =>
    feet.map((x, i) => `<g class="${i % 2 === 0 ? 'la' : 'lb'}">${legRect(x, extra)}</g>`).join('')
  const body = runs.map(r => bodyRect(r, `fill="${ORANGE}"`)).join('')
  const legs = legGroups(`fill="${ORANGE}"`)
  const sky = skyOf(sc)
  const held = heldOf(sc.holiday, sc.term)
  // 萬聖節南瓜、中秋月餅比較大顆：左手往外伸長一格來拿
  const longArm = sc.holiday === 'halloween' || sc.holiday === 'midAutumn'
  const squint = m === 'bob' || m === 'sleep'
  // 張眼：眼睛格塗深色，上面一塊會眨的眼皮
  // 瞇瞇眼：眼睛格直接塗回身體色，只畫下方一條深色細線（舊做法是用橘色蓋住深色格的上面七成，
  // 縮小顯示時深色格的上緣會從邊界透出來，變成眼睛上方一條怪怪的黑線）
  const holes = squint
    ? EYES.map(x => `<rect x="${x * CW - 0.5}" y="${2 * CH - 0.5}" width="${CW + 1}" height="${CH + 1}" fill="${ORANGE}"/><rect x="${x * CW}" y="${2 * CH + CH * 0.7}" width="${CW}" height="${CH * 0.3}" fill="#2a2a2a"/>`).join('')
    : EYES.map(x => `<rect x="${x * CW}" y="${2 * CH}" width="${CW}" height="${CH}" fill="#2a2a2a"/>`).join('')
  const eyes = squint ? '' : `<g class="lid">${EYES.map(x => cell(x, 2)).join('')}</g>`
  const hot = (sc.holiday === null && (sc.stage === 'midsummer' || sc.stage === 'autumnHeat')) || sc.holiday === 'dragonBoat'
  // 端午超熱：多滴汗、頭頂冒蒸氣
  const scorching = sc.holiday === 'dragonBoat' && !sc.night
  const sweat = hot && !sc.night && m !== 'sleep'
    ? scorching
      ? [
          [126, 4, 0],
          [6, 6, 0.7],
          [116, -4, 1.4],
          [18, -4, 1.9],
        ]
          .map(
            ([x, y, d]) =>
              `<path class="drip" style="animation-delay:-${d}s" transform="translate(${x} ${y})" d="M0 0 Q-4 7 0 9 Q4 7 0 0Z" fill="#7FC4E8"/>`,
          )
          .join('') +
        [40, 66, 92]
          .map(
            (x, i) =>
              `<g transform="translate(${x} -2)"><path class="heat" style="animation-delay:-${(i * 0.6).toFixed(1)}s" d="M0 0 q3 -4 0 -8 q-3 -4 0 -8" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/></g>`,
          )
          .join('')
      : `<path class="drip" transform="translate(126 4)" d="M0 0 Q-4 7 0 9 Q4 7 0 0Z" fill="#7FC4E8"/>`
    : ''
  // 有節日就臉紅紅（清明掃墓氣氛肅穆，不臉紅）；冬至吃湯圓也算過節
  const blush =
    (sc.holiday === null && sc.term !== '冬至') || sc.holiday === 'qingming'
      ? ''
      : EYES.map(x => `<ellipse cx="${x * CW + CW / 2}" cy="${3 * CH + 6}" rx="7" ry="3.5" fill="#FF4F7B"/>`).join('')
  const zz =
    m === 'sleep'
      ? `<text class="z1" x="124" y="-2" font-size="12" font-family="sans-serif" fill="#999">z</text><text class="z2" x="124" y="-2" font-size="10" font-family="sans-serif" fill="#999">z</text>`
      : ''
  const css = [
    '@keyframes blink{0%,88%,100%{transform:scaleY(0)}90.5%{transform:scaleY(.8)}92.5%,94.5%{transform:scaleY(1)}96.5%{transform:scaleY(.8)}}',
    '@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}',
    '@keyframes hop{0%,100%{transform:translateY(0)}40%{transform:translateY(-16px)}60%{transform:translateY(-16px)}}',
    '@keyframes legA{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}',
    '@keyframes legB{0%,100%{transform:translateY(-5px)}50%{transform:translateY(0)}}',
    '@keyframes breathe{0%,100%{transform:scaleY(1)}50%{transform:scaleY(.95)}}',
    '@keyframes z{0%{opacity:0;transform:translate(0,0)}30%{opacity:1}100%{opacity:0;transform:translate(10px,-18px)}}',
    '@keyframes fall{0%{transform:translate(0,0);opacity:0}10%{opacity:1}90%{opacity:1}100%{transform:translate(8px,165px);opacity:0}}',
    '@keyframes drift{0%{transform:translate(0,0) rotate(0);opacity:0}10%{opacity:1}50%{transform:translate(14px,82px) rotate(180deg)}90%{opacity:1}100%{transform:translate(-4px,165px) rotate(360deg);opacity:0}}',
    '@keyframes rain{0%{transform:translate(0,0)}100%{transform:translate(-6px,170px)}}',
    '@keyframes rise{0%{transform:translate(0,0);opacity:0}15%{opacity:1}85%{opacity:1}100%{transform:translate(6px,-150px);opacity:0}}',
    '@keyframes twinkle{0%,100%{opacity:.25}50%{opacity:1}}',
    '@keyframes spin{to{transform:rotate(360deg)}}',
    '@keyframes sway{0%,100%{transform:rotate(-6deg)}50%{transform:rotate(6deg)}}',
    '@keyframes burst{0%{transform:scale(.1);opacity:0}15%{opacity:1}70%{transform:scale(1);opacity:1}100%{transform:scale(1.15);opacity:0}}',
    '@keyframes heat{0%{transform:translateY(0);opacity:0}30%{opacity:.8}100%{transform:translateY(-26px);opacity:0}}',
    '@keyframes drip{0%,60%{transform:translateY(0);opacity:0}70%{opacity:1}100%{transform:translateY(14px);opacity:0}}',
    '.lid{transform-box:fill-box;transform-origin:50% 0;transform:scaleY(0);animation:blink 3.5s infinite}',
    '.bob .body{animation:bob .9s ease-in-out infinite}',
    '.walk .body{animation:bob .4s steps(2) infinite}.walk .la{animation:legA .4s steps(2) infinite}.walk .lb{animation:legB .4s steps(2) infinite}',
    '.jump .all{animation:hop .7s ease-in-out infinite}',
    '.sleep .body{transform-box:fill-box;transform-origin:50% 100%;animation:breathe 2.4s ease-in-out infinite}',
    '.sleep .z1{animation:z 2.4s infinite}.sleep .z2{animation:z 2.4s 1.2s infinite}',
    '.fall{animation:fall 5s linear infinite}.drift{animation:drift 7s linear infinite}.rain{animation:rain 1s linear infinite}.rise{animation:rise 6s linear infinite}',
    '.twinkle{animation:twinkle 2s ease-in-out infinite}.spin{animation:spin 12s linear infinite}.sway{animation:sway 2.4s ease-in-out infinite}',
    '.heat{animation:heat 1.8s ease-out infinite}.burst{animation:burst 1.8s ease-out infinite}.drip{animation:drip 2.2s ease-in infinite}',
  ].join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" class="${m}" viewBox="${VB.x} ${VB.y} ${VB.w} ${VB.h}" width="${VB.w}" height="${VB.h}"><style>${css}</style><defs><clipPath id="frame"><rect x="${VB.x}" y="${VB.y}" width="${VB.w}" height="${VB.h}" rx="14"/></clipPath></defs><g clip-path="url(#frame)">${backdropOf(sc, sky)}<g class="all">${legs}<g class="body">${holes}${body}${eyes}${blush}${hatOf(sc.holiday, sc.stage)}${longArm ? `<rect x="${-CW}" y="${2 * CH}" width="${CW + 1}" height="${2 * CH + 1}" fill="${ORANGE}"/>` : ''}${held}${sweat}</g></g>${zz}</g></svg>`
}

export const MOOD_LABEL: Record<Mood, string> = {
  walk: '小怪獸在走路：Claude 工作中',
  jump: '小怪獸在跳：待辦全部完成',
  bob: '小怪獸在呼吸：待命中',
  sleep: '小怪獸在睡覺：閒置很久了',
}
