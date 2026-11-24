import { expect, test } from 'claude-code/testing'

import { almanacOf, holidayOf, JUMP_MS, mascotSvg, mood, sceneOf, SLEEP_MS, stageOf, localTime } from '../hooks/critter'

test('localTime 換成 UTC+8 日期與小時', async () => {
  // 2026-11-24 00:30 UTC = 08:30 UTC+8
  expect(localTime(Date.UTC(2026, 10, 24, 0, 30))).toEqual({ date: '2026-11-24', h: 8 })
  // 2026-12-31 16:00 UTC = 2027-01-01 00:00 UTC+8
  expect(localTime(Date.UTC(2026, 11, 31, 16, 0))).toEqual({ date: '2027-01-01', h: 0 })
})

test('小怪獸：工作中走路、全部完成跳、閒置睡覺、其他呼吸', async () => {
  const base = { busy: false, done: 0, total: 0, lastActiveMs: 1_000, now: 1_000 }
  expect(mood({ ...base, busy: true })).toBe('walk')
  expect(mood({ ...base, done: 3, total: 3, now: 1_000 + JUMP_MS - 1 })).toBe('jump')
  expect(mood({ ...base, done: 3, total: 3, now: 1_000 + JUMP_MS })).toBe('bob')
  expect(mood({ ...base, done: 1, total: 3 })).toBe('bob')
  expect(mood({ ...base, now: 1_000 + SLEEP_MS })).toBe('sleep')
  // 剛開對話還沒跑過任何 turn：不睡
  expect(mood({ ...base, lastActiveMs: 0, now: 99_999_999 })).toBe('bob')
})

test('小怪獸 SVG：張眼的狀態有會眨的眼皮，瞇眼的沒有，睡覺才有 z', async () => {
  expect(mascotSvg('walk')).toContain('class="lid"')
  expect(mascotSvg('jump')).toContain('class="lid"')
  expect(mascotSvg('bob')).not.toContain('class="lid"')
  expect(mascotSvg('sleep')).toContain('class="z1"')
  expect(mascotSvg('bob')).not.toContain('class="z1"')
  expect(mascotSvg('bob').length).toBeLessThan(131_072)
})

test('季節用節氣切成 8 段，節日日期查表', async () => {
  expect(sceneOf('2026-11-24', 15)).toEqual({ stage: 'earlyWinter', holiday: null, night: false })
  expect(sceneOf('2026-07-01', 20).night).toBe(true)
  expect(stageOf('2027-01-10')).toBe('deepWinter')
  expect(stageOf('2026-02-03')).toBe('deepWinter')
  expect(stageOf('2026-02-04')).toBe('earlySpring') // 立春當天
  expect(stageOf('2026-05-05')).toBe('plumRain') // 立夏
  expect(stageOf('2026-06-21')).toBe('midsummer') // 夏至
  expect(stageOf('2026-09-22')).toBe('autumnHeat')
  expect(stageOf('2026-09-23')).toBe('lateAutumn') // 秋分
  expect(stageOf('2026-12-22')).toBe('deepWinter') // 冬至
  expect(sceneOf('2026-12-22', 10).term).toBe('冬至')
  expect(sceneOf('2027-06-21', 10).term).toBe('夏至')
  expect(holidayOf('2026-12-24')).toBe('christmas')
  expect(holidayOf('2026-12-31')).toBe('newyear')
  expect(holidayOf('2027-01-01')).toBe('newyear')
  expect(holidayOf('2027-02-04')).toBe('lunarNewYear') // 小年夜
  expect(holidayOf('2027-02-03')).toBeNull()
  expect(holidayOf('2027-02-05')).toBe('lunarNewYear') // 除夕
  expect(holidayOf('2027-02-10')).toBe('lunarNewYear') // 初五
  expect(holidayOf('2027-02-11')).toBeNull() // 初六不算
  expect(holidayOf('2026-06-19')).toBe('dragonBoat')
  expect(holidayOf('2026-09-25')).toBe('midAutumn')
  expect(holidayOf('2028-04-04')).toBe('qingming')
  expect(holidayOf('2028-04-05')).toBeNull()
  expect(holidayOf('2100-' + almanacOf(2100, '中秋'))).toBe('midAutumn')
  expect(holidayOf('2026-10-31')).toBe('halloween')
  expect(holidayOf('2026-11-24')).toBeNull()
  expect(sceneOf('2026-12-31', 23).year).toBe(2027)
  expect(sceneOf('2027-01-01', 23).year).toBe(2027)
  expect(sceneOf('2027-01-02', 0).year).toBeUndefined()
  expect(mascotSvg('bob', sceneOf('2026-12-31', 20))).toContain('>2027</text>')
})

test('每個場景與動作都畫得出來，大小在上限內', async () => {
  const stages = ['earlySpring', 'lateSpring', 'plumRain', 'midsummer', 'autumnHeat', 'lateAutumn', 'earlyWinter', 'deepWinter'] as const
  const holidays = [null, 'newyear', 'lunarNewYear', 'lantern', 'valentine', 'qingming', 'dragonBoat', 'qixi', 'midAutumn', 'halloween', 'christmas'] as const
  for (const stage of stages)
    for (const holiday of holidays)
      for (const night of [false, true])
        for (const term of [undefined, '立春', '夏至', '冬至'] as const)
          for (const m of ['walk', 'jump', 'bob', 'sleep'] as const) {
            const svg = mascotSvg(m, { stage, holiday, night, term })
            expect(svg.startsWith('<svg')).toBe(true)
            expect(svg.length).toBeLessThan(131_072)
          }
})

test('閒置睡覺可以關掉，天黑時間可以改', async () => {
  const base = { busy: false, done: 0, total: 0, lastActiveMs: 1_000, now: 1_000 + 99 * 60_000 }
  expect(mood({ ...base, sleepMs: 0 })).toBe('bob')
  expect(mood({ ...base, sleepMs: 60_000 })).toBe('sleep')
  expect(sceneOf('2026-11-24', 19, { from: 20, to: 5 }).night).toBe(false)
  expect(sceneOf('2026-11-24', 3, { from: 0, to: 4 }).night).toBe(true)
})
