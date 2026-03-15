# 機能仕様書 — 週間スケジュール表

## 1. ファイル構成

```
testprogram/
├── index.html          ← HTML シェル（モジュール読み込みのみ）
├── css/
│   └── style.css       ← 全スタイル定義
├── js/
│   ├── config.js       ← 定数・デフォルトカテゴリ定義
│   ├── utils.js        ← 純粋ヘルパー関数（時刻・日付・色）
│   ├── store.js        ← 状態管理・localStorage 読み書き・サンプルデータ
│   ├── schedule.js     ← スケジュール UI 構築（ヘッダー・軸・列）
│   ├── events.js       ← イベントブロック生成・描画・削除・リサイズ・モーダル
│   ├── categories.js   ← カテゴリ管理モーダル・CSS 適用・凡例
│   └── main.js         ← エントリポイント・イベントリスナー登録・初期化
└── docs/
    ├── requirements.md
    ├── functional.md
    └── test.md
```

## 2. データモデル

### 2.1 イベントオブジェクト

```typescript
interface Event {
  id:        number;        // 一意 ID（自動インクリメント）
  date:      string;        // 'YYYY-MM-DD'
  startMin:  number;        // 開始時刻（分）例: 9*60 = 540
  endMin:    number;        // 終了時刻（分）例: 10*60 = 600
  name:      string;        // 予定名（最大24文字）
  category:  string;        // カテゴリ ID
}
```

### 2.2 カテゴリオブジェクト

```typescript
interface Category {
  id:      string;   // 'work' | 'meal' | 'exercise' | 'leisure' | 'cat_<timestamp>'
  name:    string;   // 表示名
  accent:  string;   // アクセントカラー（16進数 #rrggbb）
  bg:      string;   // 背景色（accent から自動生成）
  border:  string;   // ボーダー色（accent から自動生成）
  color:   string;   // 文字色（accent から自動生成）
}
```

### 2.3 localStorage スキーマ（キー: `schedule_v5`）

```typescript
interface StorageData {
  events:           Event[];
  nextId:           number;
  intervalIdx:      number;        // 0〜3
  viewMode:         number;        // 1 or 2
  currentWeekStart: string;        // 'YYYY-MM-DD'（月曜日）
  categories:       Category[];
}
```

## 3. 定数（config.js）

| 定数名 | 値 | 説明 |
|--------|-----|------|
| `PX_PER_MIN` | 1.2 | 1分あたりのピクセル高さ |
| `START_MIN` | 360 | 表示開始時刻（6:00） |
| `END_MIN` | 1320 | 表示終了時刻（22:00） |
| `TOTAL_H` | 1152 | タイムライン全高さ（px） |
| `INTERVALS` | [15,30,60,120] | 時間軸間隔オプション（分） |
| `INT_LABELS` | ['15分','30分','1時間','2時間'] | スライダー表示ラベル |
| `DAY_JP` | ['日','月','火','水','木','金','土'] | 曜日ラベル |
| `DAY_CLASS` | ['sun','mon','tue','wed','thu','fri','sat'] | CSS クラス名 |
| `STORE_KEY` | 'schedule_v5' | localStorage キー |
| `SEED_KEY` | 'schedule_seeded_v5' | サンプルデータ投入済みフラグキー |

## 4. モジュール仕様

### 4.1 config.js

**エクスポート**：`PX_PER_MIN`, `START_MIN`, `END_MIN`, `TOTAL_H`, `INTERVALS`, `INT_LABELS`, `DAY_JP`, `DAY_CLASS`, `STORE_KEY`, `SEED_KEY`, `DEFAULT_CATS`

依存：なし

### 4.2 utils.js

**エクスポート関数一覧**：

| 関数 | シグネチャ | 説明 |
|------|-----------|------|
| `hexToRgb` | `(hex: string) => [r,g,b]` | 16進数 → RGB 配列 |
| `rgbToHex` | `(r,g,b: number) => string` | RGB → 16進数 |
| `generateCatColors` | `(accent: string) => {bg,border,color}` | アクセント色から背景・ボーダー・文字色を生成 |
| `getMondayOf` | `(date: Date) => Date` | 指定日を含む週の月曜日を返す |
| `dateToStr` | `(d: Date) => string` | Date → 'YYYY-MM-DD'（ローカル時刻） |
| `strToDate` | `(s: string) => Date` | 'YYYY-MM-DD' → Date |
| `addDays` | `(date: Date, n: number) => Date` | n 日後の Date を返す |
| `fmtDateShort` | `(d: Date) => string` | 例: '2026年3月16日' |
| `fmtTime` | `(min: number) => string` | 例: 540 → '9:00' |
| `minToTimeStr` | `(min: number) => string` | 例: 540 → '09:00' |
| `timeStrToMin` | `(s: string) => number` | 例: '09:00' → 540 |
| `minToY` | `(min: number) => number` | 分 → CSS top 値（px） |
| `yToMin` | `(y: number) => number` | px → 分 |
| `snapMin` | `(min, intervalIdx) => number` | スナップ処理 |
| `clamp` | `(v,lo,hi: number) => number` | 値を範囲内に収める |

### 4.3 store.js

**エクスポート状態**：`state` オブジェクト（`events`, `nextId`, `intervalIdx`, `viewMode`, `currentWeekStart`, `categories`）

**エクスポート関数**：

| 関数 | 説明 |
|------|------|
| `loadData()` | localStorage から state に読み込む |
| `saveData()` | state を localStorage に書き込む |
| `seedSample()` | 初回のみサンプルデータを投入する |

### 4.4 schedule.js

**エクスポート関数**：

| 関数 | 説明 |
|------|------|
| `getDisplayDates()` | 表示する Date 配列を返す（7 × viewMode 個） |
| `buildHeader(dates)` | ヘッダー行を生成する |
| `updateWeekLabel(dates)` | 週ラベルテキストを更新する |
| `buildAxis()` | 時間軸を生成する |
| `buildDayCols(dates, onColClick)` | 日付列を生成する（クリックコールバックを受け取る） |
| `rebuildAll(onColClick)` | 上記4関数 + renderAll を呼び出す |

### 4.5 events.js

**エクスポート関数**：

| 関数 | 説明 |
|------|------|
| `createEventEl(ev)` | イベント DOM 要素を生成して返す |
| `renderCol(dateStr)` | 指定日付列のイベントを再描画する |
| `renderAll(dates?)` | 全列（または指定列）を再描画する |
| `deleteEvent(id)` | イベントを削除し再描画する |
| `startResize(e, id)` | リサイズドラッグを開始する |
| `openModal(dateStr, start, end, editId?)` | 予定追加/編集モーダルを開く |
| `closeModal()` | モーダルを閉じる |

### 4.6 categories.js

**エクスポート関数**：

| 関数 | 説明 |
|------|------|
| `applyCategoriesToCSS()` | カテゴリ色を動的スタイルに注入する |
| `buildLegend()` | 凡例バッジを生成する |
| `buildCategorySelect(selectedId)` | モーダル内カテゴリ select を生成する |
| `openCatModal()` | カテゴリ管理モーダルを開く |
| `closeCatModal()` | カテゴリ管理モーダルを閉じる |

### 4.7 main.js

エントリポイント。以下の処理を行う：

1. `loadData()` → `seedSample()`
2. `applyCategoriesToCSS()` → `buildLegend()`
3. `applyInterval(intervalIdx)` → `rebuildAll()`
4. ナビゲーション・スライダー・モーダルのイベントリスナーを登録

## 5. UI コンポーネント仕様

### 5.1 ナビゲーションバー

```
[◀ 前週]  2026年3月16日 〜 3月22日  [次週 ▶]   [1週間][2週間]  [⚙ カテゴリ]
```

### 5.2 インターバルスライダー

- range input（min=0, max=3, step=1）
- ティック：15分 / 30分 / 1時間 / 2時間
- スライダーとティッククリック両対応

### 5.3 スケジュールグリッド

- ヘッダー：`grid-template-columns: 70px repeat(N, 1fr)`（N = 7 × viewMode）
- 時間軸：`width: 70px`、`height: TOTAL_H px`（絶対配置ラベル）
- 日付列：`flex: 1`、`position: relative`、`height: TOTAL_H px`
- イベントブロック：`position: absolute`、top/height を分数値から計算

### 5.4 イベントブロック構造

```html
<div class="event-block {category}" data-id="{id}" style="top:{px}px; height:{px}px">
  <div class="event-content">
    <span class="event-name">{name}</span>
    <span class="event-time-label">{start}〜{end}</span>
  </div>
  <button class="event-del">×</button>
  <div class="resize-handle"></div>
</div>
```

### 5.5 予定追加/編集モーダル

| 入力項目 | 型 | バリデーション |
|---------|-----|-------------|
| 予定名 | text | 必須・最大24文字 |
| カテゴリ | select | 必須（選択肢あり） |
| 開始時間 | time | - |
| 終了時間 | time | 開始より後であること |

### 5.6 カテゴリ管理モーダル

- カテゴリ一覧（カラーピッカー + 名前入力 + 削除ボタン）
- 「＋ カテゴリを追加」ボタン
- 保存時：state.categories 更新 → CSS 再注入 → 凡例更新 → 全再描画

## 6. アルゴリズム詳細

### 6.1 カテゴリカラー生成

```
accent = #rrggbb
bg     = accent × 0.18 + white × 0.82
border = accent × 0.55 + white × 0.45
color  = accent × 0.48
```

### 6.2 座標変換

```
top(px) = (startMin - START_MIN) × PX_PER_MIN
height(px) = (endMin - startMin) × PX_PER_MIN

min = y(px) / PX_PER_MIN + START_MIN
snapMin = round(min / interval) × interval
```

### 6.3 月曜日取得

```
dow = date.getDay()  // 0=日, 1=月, ..., 6=土
offset = dow === 0 ? -6 : -(dow - 1)
monday = date + offset days
```

## 7. エラー処理

| シナリオ | 処理 |
|---------|------|
| localStorage 読み込み失敗 | try/catch で無視し初期値を使用 |
| 終了時間 ≤ 開始時間 | alert で通知しモーダルを閉じない |
| カテゴリ名が空 | alert で通知し保存しない |
| カテゴリ0件で保存 | alert で通知し保存しない |
| 削除カテゴリのイベント | 先頭カテゴリ ID に移行 |
