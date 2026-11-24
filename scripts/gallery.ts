// 產生 README 用的示意圖：場景圖鑑與介面模擬圖
// 用法：node --experimental-strip-types scripts/gallery.ts（Node 22.6 以上）
import { mkdirSync, writeFileSync } from 'node:fs'

import { mascotSvg, MOOD_LABEL, SCENE_LABEL } from '../hooks/critter.ts'
import type { Mood, Scene } from '../hooks/critter.ts'

const OUT = new URL('../docs/', import.meta.url)
mkdirSync(OUT, { recursive: true })

type Shot = { file: string; mood: Mood; scene: Scene }

const day = (stage: Scene['stage']): Scene => ({ stage, holiday: null, night: false })

// 精簡版圖鑑：4 種動作、季節、白天晚上、幾個代表節日
export const SHOTS: Shot[] = [
  { file: 'early-spring', mood: 'walk', scene: day('earlySpring') },
  { file: 'plum-rain', mood: 'bob', scene: day('plumRain') },
  { file: 'midsummer', mood: 'jump', scene: day('midsummer') },
  { file: 'winter-solstice', mood: 'bob', scene: { stage: 'deepWinter', holiday: null, night: false, term: '冬至' } },
  { file: 'deep-winter-night', mood: 'sleep', scene: { stage: 'deepWinter', holiday: null, night: true } },
  { file: 'new-year', mood: 'jump', scene: { stage: 'deepWinter', holiday: 'newyear', night: true, year: 2027 } },
  { file: 'lunar-new-year', mood: 'walk', scene: { stage: 'earlySpring', holiday: 'lunarNewYear', night: false } },
  { file: 'dragon-boat', mood: 'walk', scene: { stage: 'plumRain', holiday: 'dragonBoat', night: false } },
  { file: 'mid-autumn', mood: 'bob', scene: { stage: 'lateAutumn', holiday: 'midAutumn', night: true } },
  { file: 'christmas', mood: 'walk', scene: { stage: 'deepWinter', holiday: 'christmas', night: false } },
]

for (const s of SHOTS) writeFileSync(new URL(`scene-${s.file}.svg`, OUT), mascotSvg(s.mood, s.scene))

// 介面模擬圖：仿桌面版的三欄配置（簡化示意，不是真實截圖）
// 左：討論串側邊欄；中：對話；右：側邊面板，mod 以「外掛程式」分頁出現，小怪獸是裡面的一個功能
const W = 1080
const H = 540
const SIDE_W = 200
const PANE_X = 734
const PANE_W = W - PANE_X
const TOP = 40
const scene: Scene = { stage: 'lateAutumn', holiday: null, night: false }
const CRITTER_W = 280
const critterX = PANE_X + (PANE_W - CRITTER_W) / 2
const critter = mascotSvg('walk', scene).replace(
  ' width="240" height="165"',
  ` x="${critterX}" y="${TOP + 56}" width="${CRITTER_W}" height="192"`,
)
const gray = (x: number, y: number, w: number, h = 8, fill = '#00000018') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${fill}"/>`
const bubble = (x: number, y: number, w: number, lines: number, fill: string) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${18 + lines * 16}" rx="12" fill="${fill}"/>` +
  Array.from({ length: lines }, (_, i) => gray(x + 14, y + 14 + i * 16, w - 28 - (i === lines - 1 ? 40 : 0), 7, '#00000022')).join('')
// 側邊欄：上面兩個操作（像新增、搜尋），下面是討論串清單，全部用灰條代替文字
const sideAction = (y: number, w: number) => `<rect x="20" y="${y}" width="14" height="14" rx="4" fill="#00000026"/>${gray(42, y + 3, w)}`
const threads = [120, 96, 140, 84, 112, 128, 90, 104]
const sidebar =
  `<rect y="${TOP}" width="${SIDE_W}" height="${H - TOP}" fill="#ECEAE3"/>` +
  `<line x1="${SIDE_W}" y1="${TOP}" x2="${SIDE_W}" y2="${H}" stroke="#D8D5CC"/>` +
  sideAction(TOP + 20, 56) + sideAction(TOP + 46, 44) +
  gray(20, TOP + 90, 48, 6, '#00000014') +
  `<rect x="12" y="${TOP + 106}" width="${SIDE_W - 24}" height="26" rx="8" fill="#00000010"/>` +
  threads.map((w, i) => gray(20, TOP + 115 + i * 30, w)).join('')
const chatL = SIDE_W + 28
const chatR = PANE_X - 28
const tabs =
  `<rect x="${PANE_X}" y="${TOP}" width="${PANE_W}" height="36" fill="#ECEAE3"/>` +
  `<line x1="${PANE_X}" y1="${TOP + 36}" x2="${W}" y2="${TOP + 36}" stroke="#D8D5CC"/>` +
  `<path d="M${PANE_X + 12} ${TOP + 37} V${TOP + 14} q0 -6 6 -6 H${PANE_X + 98} q6 0 6 6 V${TOP + 37}Z" fill="#F5F4EF" stroke="#D8D5CC"/>` +
  `<rect x="${PANE_X + 13}" y="${TOP + 34}" width="90" height="4" fill="#F5F4EF"/>` +
  `<text x="${PANE_X + 58}" y="${TOP + 27}" text-anchor="middle" font-size="12" fill="#333">外掛程式</text>` +
  gray(PANE_X + 120, TOP + 16, 44, 7, '#00000014') + gray(PANE_X + 180, TOP + 16, 36, 7, '#00000014')
const ui = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="-apple-system, 'PingFang TC', 'Noto Sans TC', sans-serif">
<defs><clipPath id="win"><rect width="${W}" height="${H}" rx="16"/></clipPath></defs>
<g clip-path="url(#win)">
<rect width="${W}" height="${H}" fill="#F5F4EF"/>
<rect width="${W}" height="${TOP}" fill="#E8E6DF"/>
<line x1="0" y1="${TOP}" x2="${W}" y2="${TOP}" stroke="#D8D5CC"/>
<circle cx="22" cy="20" r="6" fill="#FF5F57"/><circle cx="42" cy="20" r="6" fill="#FEBC2E"/><circle cx="62" cy="20" r="6" fill="#28C840"/>
${gray((SIDE_W + PANE_X) / 2 - 50, 16, 100, 8, '#00000020')}
${sidebar}
<line x1="${PANE_X}" y1="${TOP}" x2="${PANE_X}" y2="${H}" stroke="#D8D5CC"/>
${bubble(chatR - 240, TOP + 24, 240, 1, '#E3DED3')}
${bubble(chatL, TOP + 68, 380, 3, '#FFFFFF')}
${bubble(chatR - 200, TOP + 156, 200, 1, '#E3DED3')}
${bubble(chatL, TOP + 200, 430, 4, '#FFFFFF')}
<rect x="${chatL}" y="${H - 64}" width="${chatR - chatL}" height="40" rx="12" fill="#FFFFFF" stroke="#D8D5CC"/>
<text x="${chatL + 18}" y="${H - 39}" font-size="13" fill="#999">輸入訊息…</text>
${tabs}
${critter}
<text x="${PANE_X + PANE_W / 2}" y="${TOP + 274}" text-anchor="middle" font-size="13" fill="#666">${MOOD_LABEL.walk}（${SCENE_LABEL[scene.stage]}）</text>
<text x="${critterX}" y="${TOP + 316}" font-size="13" font-weight="600" fill="#333">任務進度</text>
${[0, 1, 2].map(i => `<circle cx="${critterX + 8}" cy="${TOP + 340 + i * 26}" r="5" fill="${i < 2 ? '#D97757' : 'none'}" stroke="#D97757" stroke-width="1.5"/>${gray(critterX + 22, TOP + 336 + i * 26, [170, 130, 190][i])}`).join('')}
</g>
</svg>`
writeFileSync(new URL('ui-mockup.svg', OUT), ui)

console.log(`已輸出 ${SHOTS.length} 張場景圖與 1 張介面模擬圖到 docs/`)
