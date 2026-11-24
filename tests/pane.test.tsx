import { expect, test } from 'claude-code/testing'

const PANE = {
  plugin: 'board-critter',
  component: 'Pane',
  requestId: 'board-critter',
  props: {
    title: '看板小怪獸',
    isFocused: false,
    bodyColumns: 40,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 20 },
    view: {},
  },
} as const

test('面板在每種介面都畫得出小怪獸與狀態文字', async ($, on) => {
  on('command.register', () => ({ value: { command: 'critter' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('clock.now', () => ({ value: Date.UTC(2026, 10, 24, 7, 0) }))
  on('clock.every', () => ({ value: undefined }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  for (const surface of ['terminal', 'desktop', 'vscode', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    const label = await ui.find({ type: 'Text', text: /小怪獸在/ })
    expect(label?.text).toContain('待命中')
    await ui.unmount()
  }
})

const mountAt = async ($: Parameters<Parameters<typeof test>[1]>[0], on: Parameters<Parameters<typeof test>[1]>[1], ms: number) => {
  on('command.register', () => ({ value: { command: 'critter' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('clock.now', () => ({ value: ms }))
  on('clock.every', () => ({ value: undefined }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  const text = (await ui.find({ type: 'Text', text: /小怪獸在/ }))?.text ?? ''
  await ui.unmount()

  return text
}

// 2026-12-24 15:00（UTC+8）是聖誕節、寒冬
const XMAS_3PM = Date.UTC(2026, 11, 24, 7, 0)

test('預設會過節', async ($, on) => {
  expect(await mountAt($, on, XMAS_3PM)).toContain('聖誕節')
})

test('安裝時關掉節日，只剩季節', { options: { holidays: false } }, async ($, on) => {
  const text = await mountAt($, on, XMAS_3PM)
  expect(text).toContain('寒冬')
  expect(text).not.toContain('聖誕節')
})

test('時區與天黑時間照設定', { options: { timezone: 0, nightFrom: 6, nightTo: 8 } }, async ($, on) => {
  // UTC+0 的 07:00，天黑設成 6 點：算晚上
  expect(await mountAt($, on, XMAS_3PM)).toContain('晚上')
})
