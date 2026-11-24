import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Todo } from '../types'
import { localTime, mascotSvg, mood, MOOD_LABEL, SCENE_LABEL, sceneOf } from './critter'

const PANE = 'board-critter'
const COMMAND = 'critter'
const TITLE = '看板小怪獸'
/** 每分鐘重畫一次，換日、天黑時場景才會跟著變 */
const TICK_MS = 60_000

const todos = atom({ plugin: 'board-critter', key: 'todos' } as const, [] as Todo[])
const nowMs = atom({ plugin: 'board-critter', key: 'nowMs' } as const, 0)
const busy = atom({ plugin: 'board-critter', key: 'busy' } as const, false)
const lastActiveMs = atom({ plugin: 'board-critter', key: 'lastActiveMs' } as const, 0)

// 不支援 SVG 的介面（例如終端機）改畫方塊字版：B = 橘色格子，共 18 欄 × 5 列
const CELL_SPACES = 3
const ORANGE = '#D97757'
const ROWS = [
  '   BBBBBBBBBBBB   ',
  '   BB BBBBBB BB   ',
  ' BBBBBBBBBBBBBBBB ',
  '   BBBBBBBBBBBB   ',
  '    B B    B B    ',
]
const runsOf = (row: string) =>
  (row.match(/B+|[^B]+/g) ?? []).map(run => ({ filled: run[0] === 'B', width: run.length * CELL_SPACES }))

async function openPane($: EngineInterface) {
  await $.ui.open({ id: PANE, title: TITLE })

  return { text: '小怪獸面板已打開。' }
}

export const register: Register = (on, options) => {
  // 安裝時的設定（plugin.json 的 userConfig），沒填就用預設值
  const num = (key: string, fallback: number, min: number, max: number) => {
    const v = options[key]

    return typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback
  }
  const flag = (key: string, fallback: boolean) => {
    const v = options[key]

    return typeof v === 'boolean' ? v : fallback
  }
  const timezone = num('timezone', 8, -12, 14)
  const night = { from: Math.round(num('nightFrom', 18, 0, 23)), to: Math.round(num('nightTo', 6, 0, 23)) }
  const sleepMs = num('sleepMinutes', 10, 0, 24 * 60) * 60_000
  const holidays = flag('holidays', true)
  const autoOpen = flag('autoOpen', true)

  on('session.start', async ($, e, next) => {
    try {
      await $.command.register({ name: COMMAND, description: '打開看板小怪獸面板' })
    } catch {
      $.ui.log('board-critter：指令 /critter 註冊失敗，已略過')
    }
    const now = await $.clock.now()
    await update($, nowMs, () => now)
    $.clock.every(TICK_MS, async () => {
      const t = await $.clock.now()
      await update($, nowMs, () => t)
    })
    if (autoOpen) void $.ui.open({ id: PANE, title: TITLE })

    return next(e)
  })

  on('command.run', { command: COMMAND }, $ => openPane($))

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const ui = $.ui.resolve(e)
    const { Box, Text } = ui
    const now = (await read($, nowMs)) || (await $.clock.now())
    const t = localTime(now, timezone)
    const items = await read($, todos)
    const m = mood({
      busy: await read($, busy),
      done: items.filter(i => i.status === 'completed').length,
      total: items.length,
      lastActiveMs: await read($, lastActiveMs),
      now,
      sleepMs,
    })
    const full = sceneOf(t.date, t.h, night)
    const scene = holidays ? full : { ...full, holiday: null, year: undefined }
    const label = `${MOOD_LABEL[m]}（${SCENE_LABEL[scene.holiday ?? scene.stage]}${scene.night ? '晚上' : ''}）`

    return (
      <Box flexDirection="column">
        {'Svg' in ui ? (
          <ui.Svg source={mascotSvg(m, scene)} alt={label} width={240} height={165} />
        ) : (
          ROWS.map(line => (
            <Box>
              {runsOf(line).map(run => (
                <Text backgroundColor={run.filled ? ORANGE : undefined}>{' '.repeat(run.width)}</Text>
              ))}
            </Box>
          ))
        )}
        <Text dimColor>{label}</Text>
      </Box>
    )
  })

  // ---- 小怪獸的狀態：主對話一開始跑就走路，跑完記下時間 ----

  on('turn.start', async ($, e, next) => {
    // 子代理的 turn 不算
    if (!('agentId' in e) || e.agentId === undefined) {
      await update($, busy, () => true)
      const at = await $.clock.now()
      await update($, lastActiveMs, () => at)
    }

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) {
      await update($, busy, () => false)
      const at = await $.clock.now()
      await update($, lastActiveMs, () => at)
    }

    return next(e)
  })

  // ---- 待辦：全部打勾時小怪獸會跳 ----

  on('tool.call', { tool: 'TodoWrite' }, async ($, e, next) => {
    await update($, todos, () => e.todos.map(t => ({ status: t.status })))

    return next(e)
  })

  // 桌面版的待辦用 TaskCreate／TaskUpdate
  on('tool.call', { tool: 'TaskCreate' }, async ($, e, next) => {
    const ran = await next(e)
    if (ran.deny === undefined && ran.isError !== true) {
      const id = ran.result.task.id
      await update($, todos, list => [
        // 上一批全做完了，新的任務就是新的一批
        ...(list.every(t => t.status === 'completed') ? [] : list.filter(t => t.id !== id)),
        { id, status: 'pending' as const },
      ])
    }

    return ran
  })

  on('tool.call', { tool: 'TaskUpdate' }, async ($, e, next) => {
    const ran = await next(e)
    if (ran.deny === undefined && ran.isError !== true) {
      const id = e.taskId
      const status = e.status
      await update($, todos, list => {
        if (status === 'deleted') return list.filter(t => t.id !== id)
        if (status === undefined) return list
        if (!list.some(t => t.id === id)) return [...list, { id, status }]

        return list.map(t => (t.id === id ? { ...t, status } : t))
      })
    }

    return ran
  })
}
