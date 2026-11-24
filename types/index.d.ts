/** 一筆待辦，只記小怪獸需要的完成狀態 */
export type Todo = {
  /** TaskCreate／TaskUpdate 的任務編號；TodoWrite 沒有 */
  id?: string
  status: 'pending' | 'in_progress' | 'completed'
}

declare module 'claude-code' {
  interface PluginState {
    'board-critter': {
      /** 目前這個對話的待辦（算「全部完成」用） */
      todos: Todo[]
      /** 最近一次計時器 tick 的時間，讓面板定時重畫（換日、換晚上） */
      nowMs: number
      /** 主對話正在跑（小怪獸走路） */
      busy: boolean
      /** 主對話最近一次開始或結束的時間（epoch 毫秒），算小怪獸要不要睡 */
      lastActiveMs: number
    }
  }
}
