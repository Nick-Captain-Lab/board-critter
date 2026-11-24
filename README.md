# board-critter 看板小怪獸

A tiny Claude Code mod: a pane with an animated pixel critter that reacts to what Claude is doing, the time of day, the 24 solar terms and holidays. Unofficial fan work.

一個 Claude Code 的小 mod：在側邊面板放一隻會動的橘色小怪獸。它會跟著 Claude 的工作狀態、白天晚上、節氣與節日換動作和場景。打開一堆文字介面時，一眼就認得出這是 Claude，看了也療癒。

<p align="center"><img src="docs/ui-mockup.svg" width="720" alt="介面示意：左邊是對話，右邊面板裡的小怪獸在走路"></p>
<p align="center"><sub>介面示意圖（簡化模擬，不是真實截圖）</sub></p>

> 非官方粉絲作品。小怪獸造型取自 Claude Code 啟動畫面的吉祥物 Clawd，相關名稱與造型屬於 Anthropic。本專案與 Anthropic 無關，也未經其認可。

## 場景圖鑑

| | |
| :-: | :-: |
| <img src="docs/scene-early-spring.svg" width="240" alt="早春・走路"> | <img src="docs/scene-plum-rain.svg" width="240" alt="梅雨・呼吸"> |
| 早春・走路 | 梅雨・呼吸 |
| <img src="docs/scene-midsummer.svg" width="240" alt="盛夏・跳"> | <img src="docs/scene-winter-solstice.svg" width="240" alt="冬至・捧湯圓"> |
| 盛夏・跳 | 冬至・捧湯圓 |
| <img src="docs/scene-deep-winter-night.svg" width="240" alt="寒冬夜・睡覺"> | <img src="docs/scene-new-year.svg" width="240" alt="跨年"> |
| 寒冬夜・睡覺 | 跨年 |
| <img src="docs/scene-lunar-new-year.svg" width="240" alt="過年"> | <img src="docs/scene-dragon-boat.svg" width="240" alt="端午"> |
| 過年 | 端午 |
| <img src="docs/scene-mid-autumn.svg" width="240" alt="中秋"> | <img src="docs/scene-christmas.svg" width="240" alt="聖誕節"> |
| 中秋 | 聖誕節 |

## 它會怎麼變

**工作狀態**

- Claude 在工作：走路
- 待辦全部打勾：開心跳 2 分鐘
- 待命中：瞇眼呼吸
- 閒置 10 分鐘：睡覺，頭上冒 z

**白天晚上**

- 白天是季節的天空；晚上 6 點到早上 6 點換成夜空、星星與月亮

**季節（用「四立＋二分二至」切成 8 段）**

- 早春櫻花、晚春新葉、梅雨撐傘、盛夏大太陽、秋老虎、深秋紅葉、初冬細雪、寒冬積雪

**節日**

- 跨年煙火與新年份、過年（小年夜到初五）、元宵、情人節、清明、端午、七夕、中秋、萬聖節、聖誕節
- 過節會臉紅（清明除外；冬至吃湯圓也算過節）
- 立春拿春捲、夏至拿冰棒、冬至捧湯圓

## 安裝

在 Claude Code 終端機的輸入框：

```
/plugin install board-critter --marketplace Nick-Captain-Lab/board-critter
```

或在 shell：

```bash
claude plugin install board-critter --marketplace Nick-Captain-Lab/board-critter
```

桌面版 App：按輸入框旁的 +，選 Plugins，用 `Nick-Captain-Lab/board-critter` 加入 marketplace，再加入 plugin。

安裝過程會問 `Add marketplace?`，回答 `y`；接著會出現下面的設定畫面，不改就用預設值。

裝好後開新對話，面板會自動打開；關掉了可以輸入 `/critter` 再打開。不支援 SVG 的介面（例如終端機）會顯示方塊字版的靜態小怪獸。

## 安裝時可以調的設定

| 設定 | 預設 | 說明 |
| :-- | :-- | :-- |
| 時區（UTC 偏移小時） | 8 | 台灣、香港是 8，日本是 9 |
| 幾點天黑 | 18 | 從這個整點開始換成夜空 |
| 幾點天亮 | 6 | 到這個整點換回白天 |
| 閒置幾分鐘睡著 | 10 | 填 0 就永遠不睡 |
| 顯示節日場景 | 開 | 關掉後只換季節與早晚 |
| 開對話時自動打開面板 | 開 | 關掉後要輸入 `/critter` 才會打開 |

之後想改，可以在 Claude Code 的設定選單（`/config`）裡找到 board-critter 的這幾個欄位。

## 注意

- 節氣與農曆資料是 UTC+8（台灣、香港）的日期；時區設成其他值時，節氣與節日當天可能差一天
- 節氣與農曆節日資料內建到 2100 年。2101 年以後，季節用平均日期估算，農曆節日不再出現

## 資料來源

- 節氣與農曆日期：香港天文台「公曆與農曆日期對照表」，2026～2100 年
  - https://www.hko.gov.hk/tc/gts/time/calendar/text/files/T2026c.txt
- 核對：交通部中央氣象署「日曆資料表」，2026～2028 年節氣日期一致
  - https://www.cwa.gov.tw/Data/astronomy/2026cal.pdf

## 開發

```bash
claude plugin validate .
claude plugin test .
```

- `hooks/critter.ts`：狀態、季節、節日判斷與 SVG 產生（純函式）
- `hooks/almanac.ts`：節氣與農曆節日日期表
- `hooks/register.tsx`：面板與事件
- `scripts/gallery.ts`：重新產生 `docs/` 裡的示意圖（`node --experimental-strip-types scripts/gallery.ts`，Node 22.6 以上）

## 授權

- 程式碼：MIT License，見 `LICENSE`
- Clawd 的造型與「Claude」「Claude Code」名稱屬於 Anthropic，不在本授權範圍內
