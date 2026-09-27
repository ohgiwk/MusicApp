# こえあそび - 音程ミニゲーム

カラオケで音程を取るのが苦手な人向けの、音感・発声トレーニング Web アプリです。
ミニゲームで遊んでいるうちに「音程を聴き取る力」と「狙った音程で声を出す力」が身につくことを目指しています。

公開版: https://ohgiwk.github.io/MusicApp/

- **👂 耳トレ（マイク不要）**: HIGH or LOW / PITCH DISTANCE / MELODY MEMORY
- **🎤 声トレ（マイクで音程判定）**: ピッチターゲット / ボイスフライト / メロディコピー
- **ツール**: ピッチモニター（マイクと声の高さの確認）

バックエンドはなく、ブラウザだけで動きます。成績や設定は端末の localStorage に保存します。

## 技術構成

React 19 / Vite / TypeScript / React Router / Zustand / Tailwind CSS v4 / Web Audio API / `getUserMedia`

- 音程の推定は YIN アルゴリズム（[src/audio/pitchDetector.ts](src/audio/pitchDetector.ts)）。倍音の多い人の声でも基本周波数を拾えます
- お手本の音・効果音・BGM はすべて Web Audio でその場で合成しています（音声ファイルなし）

## 開発

```bash
npm install
npm run dev
```

| コマンド                          | 内容                                 |
| --------------------------------- | ------------------------------------ |
| `npm run dev`                     | 開発サーバー (http://localhost:5173) |
| `npm run build`                   | 型チェック + 本番ビルド (`dist/`)    |
| `npm run typecheck`               | 型チェックだけ                       |
| `npm test` / `test:watch`         | テスト（Vitest）                     |
| `npm run lint` / `lint:fix`       | ESLint（React Hooks のルール込み）   |
| `npm run format` / `format:check` | Prettier                             |

### 注意点

- **マイクは HTTPS か localhost でしか使えません。** LAN 内のスマホから `http://192.168.x.x:5173` を開くと画面は出ますが、マイクは使えません。スマホでは公開版で試してください
- **TypeScript は 6.0 に固定しています。** typescript-eslint が 6.0 までしか対応しておらず、TypeScript 7（Go 製コンパイラ）は ESLint が必要とする API をまだ持たないためです
- ブラウザは操作前に音を鳴らせないため、起動時に「タップしてはじめる」画面を出して音を解禁しています（[src/audio/audioUnlock.ts](src/audio/audioUnlock.ts)）
- 開発サーバーでは更新通知は動きません。見た目の確認は `http://localhost:5173/?preview-update` で行えます

## 公開（GitHub Pages）

`main` に push すると GitHub Actions（[.github/workflows/deploy.yml](.github/workflows/deploy.yml)）が lint → フォーマットチェック → テスト → ビルドを行い、GitHub Pages に公開します。どれかが失敗すると公開されません。

- サブパス `/MusicApp/` で配信するため、本番ビルドだけ `base` を `/MusicApp/` にしています（[vite.config.ts](vite.config.ts)）
- ゲーム画面の URL を直接開けるよう、`index.html` を `404.html` としてもコピーしています（応答コードは 404 ですが、表示は正常です）
- ビルドごとに `version.json` を出力し、公開中のアプリが新しい版に気づくと画面下に更新通知を出します（[src/update/](src/update/)）

## ディレクトリ構成

```
src/
  audio/        音声処理: マイク・音程推定 (YIN)・平滑化・お手本音・BGM・音の解禁
  games/        ゲームのロジック (React に依存しない)
    meta.ts       ゲーム一覧 (名前・色・アイコン・分類)
    difficulty.ts 各ゲームの難易度 / レベルのパラメータ
    ear/          耳トレ 3 ゲームの出題と採点
    pitchTarget/ voiceFlight/ melodyCopy/  声トレの判定・描画エンジン・採点
    abilityScoring.ts  プレイ結果 → 能力値 (0〜100) の換算
  hooks/        usePitchDetection (マイク → 音程) / useEarSession (耳トレの得点・COMBO) など
  store/        Zustand のストア (localStorage に保存)
  components/   共通 UI (ear/ は耳トレ用)
  pages/        画面 (ear/ は耳トレ)
  update/       更新通知のバージョン確認
public/         アイコン・manifest
```

## 保存データ（localStorage）

| キー                | 内容                                             |
| ------------------- | ------------------------------------------------ |
| `koeasobi-settings` | 声の高さ・各ゲームのレベル・マイク感度・BGM      |
| `koeasobi-stats`    | 能力値の計測履歴・プレイ回数・今日のトレーニング |
| `koeasobi-scores`   | ランキング（ゲーム × レベルごとの上位 10 件）    |
| `koeasobi-ear`      | 耳トレの記録（聞き分けた最小の音の差など）       |

保存データの形を変えるときは、ストアの `persist` の `version` を上げて `migrate` で古いデータを変換してください（例: [src/store/settingsStore.ts](src/store/settingsStore.ts)）。

## ゲームを追加するときに触る場所

1. [src/games/meta.ts](src/games/meta.ts): `GAME_IDS` に ID を足し、`EAR_GAMES` か `VOICE_GAMES` に情報（名前・パス・色・アイコン・分類）を足す
2. [src/pages/gamePages.ts](src/pages/gamePages.ts): `GAME_PAGES` に画面を足す
3. [src/games/difficulty.ts](src/games/difficulty.ts): `GAME_LEVELS` と `DEFAULT_LEVEL` にレベルを足す

2 と 3 は `Record<GameId, ...>` なので、足し忘れると型エラーになります。ルート・ヘッダーのタイトル・ランキングの欄は 1 から自動で作られます（[src/games/meta.test.ts](src/games/meta.test.ts) で整合性も確認しています）。

## テスト

`src/**/*.test.ts`（Vitest）。React に依存しないロジックを中心にテストしています。

- 音程の推定・平滑化・音名の計算（`src/audio/`）
- 各ゲームの出題・判定・採点（`src/games/`）
- ランキング・能力値・連続日数の計算と、保存データの移行（`src/store/`）
- 耳トレの再生の中止（`useQuestionPlayback`、jsdom）・マイクの状態（`micStore`）
- `theme.ts` と `index.css` の色が一致していること

ゲームの進行ロジックは画面から分けて置いています（例: ボイスフライトの [engine.ts](src/games/voiceFlight/engine.ts)、ピッチターゲットの [round.ts](src/games/pitchTarget/round.ts)、メロディコピーの [recorder.ts](src/games/melodyCopy/recorder.ts)）。新しいロジックもこの形にするとテストしやすくなります。

## 実装のきまり

- **問題の音が鳴っている間は BGM も効果音も鳴らさない。** BGM はタブ画面（ホーム・ランキング・マイページ）でだけ流れ、ゲーム画面では止まります（マイクが拾って判定が狂うため）
- **再生の中止**: `playMelody` の `cancel()` は予約済みの音も止め、`done` は最後まで鳴ったら `true`、中止なら `false` で resolve します。`done` を待って画面を進めるときは `true` のときだけ進めてください
- **画面を離れるときの後片付け**: `setTimeout` で予約した処理や鳴っている音は、アンマウント時に止めてください（耳トレは `useQuestionPlayback` が自動で行います）
- **マイクは声トレとピッチモニターでだけ使う**: それ以外の画面では自動で止めます（[Layout.tsx](src/components/Layout.tsx) の `useMicLifecycle`）。一度許可されていれば、次に声トレを開いたときは説明を出さずに再開します
- **色**: SVG・Canvas・インラインスタイルの色は [src/theme.ts](src/theme.ts) の `COLORS` を使ってください（`index.css` の `@theme` と同じ値）
- **レンダー中に ref や `performance.now()` を読まない**（ESLint の react-hooks ルールが検出します）。毎フレーム変わる値は state のスナップショットとして渡します（例: ピッチターゲットの `TargetRound.view()`）
