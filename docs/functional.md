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
  id:           number;         // 一意 ID（自動インクリメント）
  date:         string;         // 'YYYY-MM-DD'
  startMin:     number;         // 開始時刻（分）例: 9*60 = 540
  endMin:       number;         // 終了時刻（分）例: 10*60 = 600
  name:         string;         // 予定名（最大24文字）
  category:     string;         // カテゴリ ID
  recurringId?: string;         // 繰り返しグループ ID（'recur_<timestamp>'）省略時は単発
}
```

### 2.1.1 繰り返しタイプ

```typescript
type RecurType = 'none' | 'daily' | 'weekday' | 'weekly' | 'monthly';
// none    : 繰り返しなし（単発）
// daily   : 毎日
// weekday : 平日のみ（月〜金）
// weekly  : 毎週（指定曜日）
// monthly : 毎月（基準日と同じ日付）
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
  intervalIdx:      number;        // 0〜3（デフォルト: 1 = 30分）
  viewMode:         number;        // 1 or 2
  currentWeekStart: string;        // 'YYYY-MM-DD'（月曜日）
  categories:       Category[];
  zoomLevel:        number;        // 0.5〜2.0（デフォルト: 1.0）
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
| `ZOOM_STEP` | 0.25 | ズームの変化幅 |
| `ZOOM_MIN` | 0.5 | 最小ズーム倍率 |
| `ZOOM_MAX` | 2.0 | 最大ズーム倍率 |

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
| `renderAll(dates)` | 全列を再描画する |
| `deleteEvent(id)` | イベントを削除（繰り返しは1件 or 全件を confirm で選択）し再描画する |
| `startResize(e, id)` | リサイズドラッグを開始する（zoomLevel を考慮した座標変換） |
| `openModal(dateStr, start, end, editId?)` | 予定追加/編集モーダルを開く（繰り返しセクションは常時表示。編集時は「なし」で初期化） |
| `closeModal()` | モーダルを閉じる |
| `generateRecurringEvents(base, recur, endDateStr, weekdays)` | 繰り返しイベント配列を生成する（各イベントに recurType / recurWeekdays / recurEndDate / recurStartDate を付与） |
| `setEditScope(scope)` | モーダルの編集スコープ（'single'/'series'）を切り替え、繰り返しセクションの表示を制御する |
| `deleteCurrentEventSeries(onDeleted)` | modalState が保持する editId のシリーズを全件削除する |
| `onEventMouseDown(e, evId)` | イベントブロックのドラッグ移動を開始する（6px 以上移動でゴースト生成） |

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
3. `applyInterval(intervalIdx)` → `applyZoom(zoomLevel)` → `rebuildAll()`
4. ナビゲーション・スライダー・モーダル・ズームのイベントリスナーを登録

## 5. UI コンポーネント仕様

### 5.1 ナビゲーションバー

```
[◀ 前週]  2026年3月16日 〜 3月22日  [次週 ▶]   [1週間][2週間]  [⚙ カテゴリ]
```

### 5.2 インターバルスライダー＋ズームコントロール

```
時間間隔  [━━●━━━] 30分    表示サイズ  [－] 100% [＋]
```

- range input（min=0, max=3, step=1）、デフォルト value=1（30分）
- ティック：15分 / 30分 / 1時間 / 2時間
- ズームボタン：－ で -0.25、＋ で +0.25（範囲 0.5〜2.0）
- ズームラベル：パーセント表示（例: 100%）

### 5.3 スケジュールグリッド

- ヘッダー：`grid-template-columns: 70px repeat(N, 1fr)`（N = 7 × viewMode）
- 時間軸：`width: 70px`、`height: TOTAL_H px`（絶対配置ラベル）
- 日付列：`flex: 1`、`position: relative`、`height: TOTAL_H px`
- イベントブロック：`position: absolute`、top/height を分数値から計算

### 5.4 イベントブロック構造

繰り返し予定には名前の先頭に「↻」を表示する。

```html
<div class="event-block {category}" data-id="{id}" style="top:{px}px; height:{px}px">
  <div class="event-content">
    <span class="event-name">{↻ }{name}</span>  <!-- ↻は recurringId がある場合のみ -->
    <span class="event-time-label">{start}〜{end}</span>
  </div>
  <button class="event-del">×</button>
  <div class="resize-handle"></div>
</div>
```

### 5.5 予定追加/編集モーダル

| 入力項目 | 型 | 表示条件 | バリデーション |
|---------|-----|---------|-------------|
| 予定名 | text | 常時 | 必須・最大24文字 |
| カテゴリ | select | 常時 | 必須（選択肢あり） |
| 開始時間 | time | 常時 | - |
| 終了時間 | time | 常時 | 開始より後であること |
| 繰り返し | select | **常時（追加・編集ともに表示）** | - |
| 曜日選択 | checkbox × 7 | 繰り返し=毎週 のみ | 1つ以上チェック |
| 繰り返し終了日 | date | 繰り返し ≠ なし | イベント日付以降であること |

繰り返し選択肢とアルゴリズム:

| 選択肢ラベル | 内部値 | 発火条件 |
|------------|--------|---------|
| 繰り返しなし | `none` | - |
| 毎日 | `daily` | 常に |
| 平日のみ（月〜金） | `weekday` | 月〜金 |
| 毎週（曜日を選択） | `weekly` | 選択曜日かつ週数差 % 1 = 0 |
| 隔週（曜日を選択） | `biweekly` | 選択曜日かつ週数差 % 2 = 0 |
| 毎月 | `monthly` | 基準日と同じ日付 |

`weekly` と `biweekly` は曜日チェックボックスを表示する。

**編集モードのスコープ選択（繰り返し予定の場合のみ表示）：**

| スコープ | UI | 動作 |
|---------|-----|------|
| この予定のみ編集（デフォルト） | トグルボタン | recurringId を削除して独立化 → 1件のみ更新 |
| シリーズ全体を編集 | トグルボタン | 繰り返しセクションを表示し、下表のとおり処理 |

**シリーズ全体編集時の繰り返し設定による分岐：**

| 繰り返し設定 | 動作 |
|------------|------|
| なし | シリーズ全件の名前・カテゴリ・時間を一括更新（日付は変えない） |
| なし以外 | シリーズ全件を削除 → `recurStartDate`（シリーズ最初の日付）を起点に新シリーズを生成 |

**非繰り返し予定の編集時：**

| 繰り返し設定 | 動作 |
|------------|------|
| なし | その1件のみ更新 |
| なし以外 | その1件を削除 → その日付を起点に繰り返しシリーズを生成 |

**シリーズ一括削除：**
編集モーダルの「シリーズ削除」ボタン（繰り返し予定の場合のみ表示）で confirm 後に全件削除。

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

### 6.2 座標変換（ズーム考慮）

```
top(px) = (startMin - START_MIN) × PX_PER_MIN          // DOM 内部座標（ズーム前）
height(px) = (endMin - startMin) × PX_PER_MIN

// クリック時: getBoundingClientRect() はズーム後のビューポート座標を返す
visualY = e.clientY - rect.top
actualY = visualY / zoomLevel                           // DOM 内部座標に換算
min = actualY / PX_PER_MIN + START_MIN

// ドラッグ時: マウス移動量も同様にズーム換算
deltaMin = (e.clientY - startY) / (PX_PER_MIN × zoomLevel)

snapMin = round(min / interval) × interval
```

### 6.3 繰り返しイベント生成

```
cur = baseDate
while cur <= endDate:
  dow = cur.getDay()
  daysDiff  = round((cur - baseDate) / 86400000)
  weeksDiff = floor(daysDiff / 7)

  include = (
    recur == 'daily'    → true
    recur == 'weekday'  → dow in [1,2,3,4,5]
    recur == 'weekly'   → dow in weekdays[]
    recur == 'biweekly' → dow in weekdays[] AND weeksDiff % 2 == 0
    recur == 'monthly'  → cur.getDate() == baseDate.getDate()
  )
  if include: push { ...base, id: nextId++, date: dateToStr(cur), recurringId }
  cur += 1 day
```

### 6.3 月曜日取得

```
dow = date.getDay()  // 0=日, 1=月, ..., 6=土
offset = dow === 0 ? -6 : -(dow - 1)
monday = date + offset days
```

### 6.4 月曜日取得

```
dow = date.getDay()  // 0=日, 1=月, ..., 6=土
offset = dow === 0 ? -6 : -(dow - 1)
monday = date + offset days
```

### 6.5 ドラッグ移動座標変換

```
// ドラッグ開始時
offsetX = startMouseX - eventRect.left   (viewport 座標)
offsetY = startMouseY - eventRect.top

// ゴースト位置更新（mousemove）
ghost.left = e.clientX - offsetX
ghost.top  = e.clientY - offsetY

// 対象列の時刻計算
ghostTopViewport = e.clientY - offsetY
relActualY = (ghostTopViewport - colRect.top) / zoomLevel
newStartMin = snapMin(yToMin(relActualY), intervalIdx)
```

## 7. エラー処理

| シナリオ | 処理 |
|---------|------|
| localStorage 読み込み失敗 | try/catch で無視し初期値を使用 |
| 終了時間 ≤ 開始時間 | alert で通知しモーダルを閉じない |
| カテゴリ名が空 | alert で通知し保存しない |
| カテゴリ0件で保存 | alert で通知し保存しない |
| 削除カテゴリのイベント | 先頭カテゴリ ID に移行 |
| 繰り返し終了日が未入力 | alert で通知しモーダルを閉じない |
| 毎週繰り返しで曜日未選択 | alert で通知しモーダルを閉じない |
| 繰り返し削除（×ボタン、複数件あり） | confirm で「この予定のみ」か「すべて」を選択させる |
| シリーズ削除ボタン | confirm で確認後に全件削除 |
| ドラッグ移動後に列クリック | recentlyResized フラグ（50ms）で追加モーダルの誤起動を防ぐ |
