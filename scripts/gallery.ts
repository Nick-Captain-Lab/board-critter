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

// 介面模擬圖：左邊對話、右邊面板裡的小怪獸（簡化示意，不是真實截圖）
const W = 880
const H = 480
const PANE_X = 520
const scene: Scene = { stage: 'lateAutumn', holiday: null, night: false }
const critter = mascotSvg('walk', scene).replace(
  ' width="240" height="165"',
  ` x="${PANE_X + 40}" y="64" width="280" height="192"`,
)
const bubble = (x: number, y: number, w: number, lines: number, fill: string) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${18 + lines * 16}" rx="12" fill="${fill}"/>` +
  Array.from({ length: lines }, (_, i) => `<rect x="${x + 14}" y="${y + 14 + i * 16}" width="${w - 28 - (i === lines - 1 ? 40 : 0)}" height="7" rx="3.5" fill="#00000022"/>`).join('')
const ui = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="-apple-system, 'PingFang TC', 'Noto Sans TC', sans-serif">
<rect width="${W}" height="${H}" rx="16" fill="#F5F4EF"/>
<rect width="${W}" height="40" rx="16" fill="#E8E6DF"/><rect y="24" width="${W}" height="16" fill="#E8E6DF"/>
<circle cx="22" cy="20" r="6" fill="#FF5F57"/><circle cx="42" cy="20" r="6" fill="#FEBC2E"/><circle cx="62" cy="20" r="6" fill="#28C840"/>
<text x="${PANE_X / 2}" y="25" text-anchor="middle" font-size="13" fill="#555">對話</text>
<text x="${PANE_X + (W - PANE_X) / 2}" y="25" text-anchor="middle" font-size="13" fill="#555">看板小怪獸</text>
<line x1="${PANE_X}" y1="40" x2="${PANE_X}" y2="${H}" stroke="#D8D5CC"/>
${bubble(220, 64, 270, 1, '#E3DED3')}
${bubble(28, 108, 340, 3, '#FFFFFF')}
${bubble(260, 196, 230, 1, '#E3DED3')}
${bubble(28, 240, 380, 4, '#FFFFFF')}
<rect x="28" y="${H - 64}" width="${PANE_X - 56}" height="40" rx="12" fill="#FFFFFF" stroke="#D8D5CC"/>
<text x="46" y="${H - 39}" font-size="13" fill="#999">輸入訊息…</text>
${critter}
<text x="${PANE_X + 180}" y="286" text-anchor="middle" font-size="13" fill="#666">${MOOD_LABEL.walk}（${SCENE_LABEL[scene.stage]}）</text>
<text x="${PANE_X + 40}" y="330" font-size="13" font-weight="600" fill="#333">任務進度</text>
${[0, 1, 2].map(i => `<circle cx="${PANE_X + 48}" cy="${354 + i * 26}" r="5" fill="${i < 2 ? '#D97757' : 'none'}" stroke="#D97757" stroke-width="1.5"/><rect x="${PANE_X + 62}" y="${350 + i * 26}" width="${[170, 130, 190][i]}" height="8" rx="4" fill="#00000018"/>`).join('')}
</svg>`
writeFileSync(new URL('ui-mockup.svg', OUT), ui)

console.log(`已輸出 ${SHOTS.length} 張場景圖與 1 張介面模擬圖到 docs/`)
