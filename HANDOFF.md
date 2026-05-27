# NomaDomo - AI 引き継ぎレポート

> 最終更新: 2026-05-26
> オーナー: gmmde (tonoikenta@icloud.com / tonoikenta@gmail.com)
> リポジトリ: https://github.com/gmmde/nomadomo
> 本番 URL: https://nomadomo.vercel.app
> Supabase project: `xsifihdujxitwocgoffp` (region: ap-northeast-1)

---

## 1. アプリ概要

**NomaDomo** = 京都の大学生ガイドと旅行者を mate (友達) / guide (有料ガイド) としてマッチングするモバイル Web アプリ。Uber 的にユーザーが「Local モード (ガイド側)」「Traveler モード (旅行者側)」を切り替えて使う。

**コアコンセプト**
- 旅行者は単発の観光ガイド (有料 paid) または現地友達 (無料 free, "mate") として地元学生を予約 / メッセージできる
- 旅行者は **チャットリクエスト** で日時 + 場所 + メッセージを送り、ガイドが承認したらチャット開始 (Tinder + Airbnb + メッセージング app のハイブリッド)

---

## 2. 技術スタック

```
Next.js              16.2.4    (App Router、React Server Components、Server Actions)
React                19.2.4
TypeScript           ^5
Tailwind CSS         ^4
@supabase/ssr        ^0.6.1    cookie ベースのセッション管理
@supabase/supabase-js ^2.105.1
react-easy-crop      ^5.5.7    アバター画像クロップ
@vercel/analytics    ^1.5.0
@vercel/speed-insights ^1.2.0
```

Node 18+ 推奨。`npm install` → `npm run dev` で localhost:3000。Vercel 自動デプロイ (main push で再 build)。

### Next.js 16 の注意点

- `middleware.ts` → **`proxy.ts`** にリネーム済。route matcher で静的アセットを除外して全 path で Supabase セッションを refresh する。
- `cookies()` は **async**。`await cookies()` が必須。
- Server Actions + `useActionState` で form 処理を実装している。
- Next 16 にしか無いラッパー (`useSearchParams` を Suspense で包む必要等) があるので、これに気づかず `app/page.tsx` が壊れがち。

---

## 3. リポジトリ構成

```
app/
├── page.tsx                    # メイン SPA (1300 行超、screen state で home/profile/chat/myprofile/saved/inbox 切替)
├── layout.tsx                  # metadata + Vercel Analytics + Speed Insights
├── globals.css                 # 地図背景 + アニメ + scrollbar hide
├── loading.tsx                 # サーバー側ナビ中のスプラッシュ
├── error.tsx                   # エラーバウンダリ
├── not-found.tsx               # 404
├── manifest.ts                 # PWA manifest
├── opengraph-image.tsx         # 動的 OG (next/og)
├── robots.ts / sitemap.ts
│
├── actions/
│   ├── auth.ts                 # signup/signin/signout (既存メアド検知あり)
│   ├── guides.ts               # createGuide / updateGuide / deleteGuide
│   ├── travelers.ts            # 同上 (旅行者)
│   ├── bookings.ts             # createBooking / updateBookingStatus
│   ├── reports.ts              # submitReport
│   └── chat-requests.ts        # createChatRequest / respondChatRequest
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # createBrowserClient
│   │   └── server.ts           # createServerClient (await cookies())
│   ├── image-uploader.tsx      # 複数画像アップ (max 8、5MB/枚)
│   ├── avatar-picker.tsx       # アバター: 絵文字 or 画像 + react-easy-crop でクロップ
│   ├── available-slots.tsx     # 曜日 + 時間スロット (Local モード時に使う)
│   ├── hobbies-tags.tsx        # 趣味タグ入力
│   ├── mode-and-rate.tsx       # mode 3 択ラジオ + 条件付き料金欄
│   ├── use-signed-urls.ts      # 一括 signed URL 取得フック
│   ├── i18n.ts                 # JP/EN 翻訳 (一部のみ翻訳済み)
│   └── back-button.tsx         # router.back()
│
├── login/page.tsx, signup/page.tsx
├── forgot-password/page.tsx    # resetPasswordForEmail
├── reset-password/page.tsx     # PASSWORD_RECOVERY + updateUser
├── settings/                   # 言語 / 通知 / プライバシー / アプリモード / About
│
├── guides/
│   ├── new/                    # ガイド新規登録
│   ├── [id]/edit/              # 自分のガイド編集
│   └── all/                    # ガイド一覧 + 検索 + ソート + フィルタ
│
├── travelers/
│   ├── new/                    # 旅行者新規
│   └── edit/                   # 旅行者編集
│
├── bookings/                   # 予約一覧 + /bookings/new
├── chat-request/[guideId]/new/ # メッセージリクエスト送信フォーム
├── requests/                   # リクエスト送受信管理 (Local モードで超重要)
├── report/[userId]/            # 通報
└── admin/analytics/            # 管理用ダッシュボード (ADMIN_EMAILS のみ)

supabase/functions/
└── send-message-notification/  # Resend で新着メッセージ通知 (Edge Function)

public/
├── map-bg.png                  # 背景の地図画像
├── home-hero.png               # ホーム上部 hero
├── map-bg.svg                  # フォールバック
├── icon-192/512/maskable.png   # PWA
└── ...
```

---

## 4. データベース (Supabase Postgres)

すべて RLS 有効。RLS ポリシーは原則「自分の行のみ操作可」だが個別に例外あり。

### 主要テーブル

| テーブル | 主要カラム | RLS 要点 |
|---|---|---|
| `auth.users` | id, email, email_confirmed_at | Supabase 標準 |
| `guides` | id, user_id (FK auth.users UNIQUE), name, university (nullable), bio, emoji, avatar_path, rate_per_day (nullable), mode (free/paid/both), tags[], languages[], image_paths[], gender, gender_other, birth_year, nationality, occupation, hobbies[], available_slots[], areas[] DEFAULT ['Kyoto'], rating, tour_count | SELECT 全員 public、INSERT/UPDATE/DELETE は自分のみ |
| `travelers` | id, user_id (FK UNIQUE), name, country, interests[], bio, image_paths[] | SELECT 自分 + メッセージ交換相手、INSERT/UPDATE/DELETE 自分 |
| `messages` | id, sender_id, recipient_id, body, created_at, read_at | SELECT/INSERT 自分が当事者 |
| `chat_requests` | id, traveler_id, guide_user_id, preferred_date, preferred_place, message, status (pending/accepted/declined) | SELECT 当事者、INSERT traveler、UPDATE 当事者 |
| `bookings` | id, traveler_id, guide_id, guide_user_id, start_at, hours (UI は「日数」), total_yen, status (pending/accepted/declined/cancelled/completed), message | SELECT 当事者、INSERT traveler、UPDATE 当事者 |
| `follows` | follower_id, followee_id, created_at | SELECT 自分が follower のみ。フォロワー数は `get_follower_count()` で公開 |
| `saved_guides` | user_id, guide_id | 自分のみ |
| `reports` | reporter_id, target_user_id, target_message_id, reason, status | INSERT/SELECT 自分のみ。UPDATE/DELETE 未実装 |
| `user_settings` | user_id (PK), language, email_on_new_message, email_on_booking, show_to_anon, app_mode | 自分のみ |

### 重要 RPC (SECURITY DEFINER)

- `get_follower_count(user_id uuid) -> int` — フォロワー数の公開取得
- `has_accepted_chat_request(a uuid, b uuid) -> boolean` — チャット解錠状態判定
- `mark_messages_read(peer uuid)` — メッセージ既読化
- `touch_updated_at()` — updated_at 自動更新トリガ用

### Postgres トリガ

- `messages_notify_new` — INSERT で Edge Function `send-message-notification` を `net.http_post` で呼ぶ (pg_net 必要)
- `bookings_touch_updated`, `user_settings_touch_updated`, `chat_requests_touch_updated`

### Storage

- バケット `guide-images` (private、5MB/枚、image/* 限定)
  - フォルダ: `{user_id}/{filename}` で分離
  - SELECT は public role に許可 (signed URL 配信)
  - INSERT/DELETE は自分のフォルダのみ
  - 旅行者画像もこのバケットを使う

---

## 5. ✅ 実装済み機能

### 認証
- Email/Password signup + signin + signout
- パスワードリセット (`/forgot-password` → メール → `/reset-password` で PKCE / 暗黙フロー両対応)
- 既存メアド signup 検知 (identities 空判定で `ログイン画面から` 誘導)

### プロフィール
- ガイド新規登録 + 編集 + 削除 (1 ユーザー 1 ガイド)
- 旅行者新規登録 + 編集 + 削除 (1 ユーザー 1 旅行者)
- 写真複数アップロード (8 枚、5MB/枚、Storage)
- アバター画像 + react-easy-crop 円形クロップ、または絵文字選択
- 趣味タグ + 会える時間スロット
- 国籍 / 職業 / 性別 (4 択 + その他自由入力) / 生まれ年

### ホーム
- ガイド一覧 (rating 降順)
- フィルタチップ (タグ / mate / guide / Music 含む全 12 タグ)
- 検索ボックス → `/guides/all?q=` に遷移
- See all → `/guides/all` 検索/ソート/フィルタフル機能

### ガイド詳細 (Tinder 風)
- 70vh 大画像 + Instagram stories 風プログレスバー + タップで前後ページング
- アバター 1 枚目、その後ギャラリー
- 暗グラデ + 名前/モードバッジ/大学/活動域/bio/タグオーバーレイ
- 下: フォロワー数/Follow ボタン/Stats/料金
- sticky 下部に message + heart ボタン
- 未承認なら `メッセージリクエスト` (chat_requests に書き込み → ガイド承認待ち)

### チャット
- Realtime チャット (Supabase Realtime postgres_changes、optimistic update でレース回避)
- 未読バッジ (Messages タブ + Inbox 各行)
- チャット入室で自動既読化 (`mark_messages_read` RPC)
- アバタータップでガイドプロフィール遷移
- 戻る矢印は履歴ベース (`navHistory[]`)

### 予約 (paid guide のみ)
- `/bookings/new` で日数 + メッセ → `bookings` テーブル
- `/bookings` で送受信予約管理 + 承認/拒否/キャンセル/完了遷移
- free モードガイドは予約不可 (リダイレクト)

### お気に入り
- ガイド一覧 / プロフィール画面でハートタップ → `saved_guides` に保存
- `/saved` で一覧

### フォロー
- ガイドプロフィールで Follow ボタン
- フォロワー数のみ公開 (誰がフォロー中かは非公開)

### 通報
- `/report/[userId]` で対象ユーザー + 理由を投稿

### 設定 (`/settings`)
- 言語 (JP/EN、localStorage + i18n フック)
- 通知 (新着メッセージ / 予約)
- プライバシー (匿名ユーザーへのプロファイル公開)
- **アプリモード** (Local/Traveler 切替)
- アカウント (ログアウト)
- About

### アプリモード分離 (NEW)
- 初回ログイン後に mode picker フルスクリーン表示
- Local / Traveler 選択 → `user_settings.app_mode` に保存
- bottom nav が mode に応じて切替:
  - Traveler: Home / Messages / Saved / Profile
  - Local: **Requests (pending バッジ付)** / Messages / Browse / Profile
- 設定からいつでも切替可

### 分析ダッシュボード
- `/admin/analytics` (ADMIN_EMAILS に email が含まれるユーザのみ)
- ガイド/旅行者/メッセージ/予約/フォロー/通報 の集計
- 14 日間メッセージ推移 (棒グラフ)
- 人気タグ TOP10
- 承認/完了予約の総額

### メール通知 (Resend)
- Edge Function `send-message-notification`
- messages INSERT で `net.http_post` から発火
- 5 分以内に同 sender→recipient の未読あれば throttle

### PWA
- manifest + icon (192/512/maskable) → ホーム画面に追加可
- service worker は未実装 (オフライン非対応)

### UX 装飾
- 背景: 地図画像 (`/map-bg.png`) + cream overlay、screen 切替でパララックス (background-position)
- 画面遷移: scale + lift + blur (Instagram 風)
- スクロールバー hide
- 全画面ヘッダ右上に 設定リンク
- 戻る矢印は履歴 1 個前へ
- カードの背景色を mode で差別化 (free=薄緑 / paid=薄赤 / both=cream)
- ガイド画像 lightbox (タップで全画面)
- ホーム上部 hero 画像 + mask-image で背景に自然 fade

### Vercel Analytics + Speed Insights
- Page views + Core Web Vitals 計測

### Git push 自動化
- `.git-credentials-local` に GitHub Fine-grained PAT → サンドボックスから直接 push 可

---

## 6. 未実装 / 既知の懸念

### 機能未実装
- **決済 (Stripe)** — bookings の status accepted -> 完了時に決済する仕組みがない。手動 DM で支払い相談という前提
- **本人確認 (KYC)** — ガイドの身元確認なし、Trust&Safety リスク
- **i18n 完全対応** — ラベル類のみ翻訳済、本文 (bio 等) は未翻訳。translation infra (next-intl 等) は未導入
- **PWA Service Worker** — オフラインサポート無し
- **ネイティブアプリ (Capacitor)** — 未着手
- **本格的な検索** — text search のみ。地理空間検索 (lat/lng) は未実装
- **通知センター (アプリ内)** — メール通知のみ、in-app プッシュ未実装
- **Local モード専用 home** — Local モード時もホームはガイドブラウズ画面 (実害なしだが UX 的にダッシュボード化したい)

### バグ / 懸念点
- **画像 storage**: bucket の SELECT policy は public ロールに開放 -> URL を知れば誰でも見える (signed URL は時間制限のみ)。本格的にプライベートにするなら policy を auth に絞るべき
- **available_slots, hobbies の display**: ガイド詳細画面に表示する UI を**まだ作っていない**。DB には保存されるが見えない
- **gender_other, nationality, occupation の display**: 同上、カードや詳細画面に出てない
- **ファイル truncation バグ**: 編集ツールが大きい file で時々 truncate する。`tsc --noEmit` で常に確認必要
- **`available_slots` の format**: `mon:1800-2200` 形式の text[]。検索フィルタには使えない (DB レベルで構造化なし)
- **Resend セットアップ**: 引き継ぎ時点でユーザがまだ Resend account 作っておらず、メール通知は実質動作確認待ち
- **モード切替**: 切替後の状態同期は手動 (ホームタブを押し直すなど)
- **Local モード時のホーム** はそのまま Traveler 用ガイド一覧が出る。「自分のプロフィール / 受信リクエスト一覧」が出るべきだが未実装
- **国籍 / 職業 / 趣味 / 会える時間 を `/guides/all` フィルタに組み込んでない**
- **チャット解錠タイミング**: ガイドが承認しても旅行者側のキャッシュが古くてすぐに message ボタンに変わらない場合がある (画面再ロードで OK)

### 技術的負債
- `app/page.tsx` が **1300 行超**。screen 切替ロジックが全部入り。フォルダ分けて各画面別ファイルにすべき
- 型 `Guide` がページ内に定義されていて、`/guides/all/all-guides-view.tsx` の `GuideRow` と重複
- いくつかのコンポーネント (`AvatarPicker` / `ImageUploader` / `AvailableSlots`) で似たような Storage upload ロジックが繰り返し
- `chatOrigin` state がまだ残ってるが、`navHistory[]` 導入後は不要

---

## 7. ロードマップ

| Phase | やること | 状態 |
|---|---|---|
| Phase 1 (MVP) | auth, guide/traveler CRUD, realtime chat, saved | 完了 |
| Phase 2 (本番ハードニング) | RLS, signed URL, orphan cleanup, OG/SEO, error boundary, スケルトン, PWA, Vercel Analytics, Resend | 完了 |
| Phase 3 (UX 磨き) | 検索/フィルタ, タグ拡張, ハート, バッジ, 未読, splash, パスリセット, アバター遷移, 設定画面, i18n 基盤 | 完了 |
| Phase 4 (機能拡張) | 通報, 予約, 分析, Tinder 風 profile, mode picker, gender/age/nationality/occupation/hobbies/slots, 活動域, mate/guide, mode 別カード色, アバター画像 + crop, chat_requests ゲート | ほぼ完了 |
| **Phase 5 (収益化準備) <- 次やる候補** | 決済 (Stripe), 本人確認, レビュー機能, テストデータ追加, Local モード dashboard 整備, available_slots を ガイド一覧に表示 | 未着手 |
| Phase 6 (運用・拡張) | ネイティブアプリ (Capacitor), ServiceWorker (PWA オフライン), 完全 i18n, 検索の地理空間化, in-app 通知 | 未着手 |

### 次に優先すべき (おすすめ)

1. **Local モードのホームを専用ダッシュボードに** — pending リクエスト件数 / 今週の予約 / 自分のプロファイル統計
2. **会える時間 / 趣味 / 国籍 / 職業 を ガイド詳細とカードに表示**
3. **available_slots を /guides/all フィルタに組み込む** (「土日に会える人」検索)
4. **/admin/analytics に chat_requests の集計を追加**
5. **テストデータ追加** — 京都の実っぽいガイド 10〜20 人作る (現在は 5〜6 人)
6. **i18n 全面展開** — translation infra 入れて全画面翻訳
7. **Stripe Connect** — 決済を組み込んで bookings 課金フローを完結

---

## 8. デプロイ運用

### Vercel
- main ブランチへの push で自動デプロイ
- 環境変数:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `NEXT_PUBLIC_SITE_URL` (sitemap/OG/metadata 用、デフォ `https://nomadomo.vercel.app`)
  - `ADMIN_EMAILS` (分析ダッシュボード閲覧可、カンマ区切り。デフォ `tonoikenta@icloud.com`)

### Supabase 設定
- Auth -> URL Configuration:
  - Site URL: `https://nomadomo.vercel.app`
  - Redirect URLs: `https://nomadomo.vercel.app/reset-password`, `https://nomadomo.vercel.app/**`, `http://localhost:3000/reset-password`
- Auth -> Email Templates: デフォ (日本語化したいなら custom 化)
- Storage -> guide-images: private (file_size_limit 5MB, allowed_mime_types image/*)
- Edge Functions Secrets (Resend 用):
  - `RESEND_API_KEY` <- Resend ダッシュボードで作る
  - `RESEND_FROM` <- `onboarding@resend.dev` (テスト) or 認証済みドメイン
  - `SITE_URL` <- `https://nomadomo.vercel.app`

### Git push 自動化 (引き継ぎ用)
- 引き継ぎ AI 用に PAT が必要なら、user に `C:\Users\tonoi\nomadomo\.git-credentials-local` に以下 1 行で保存してもらう:
  ```
  https://gmmde:github_pat_xxxxxxxx@github.com
  ```
- `.gitignore` 済 (commit されない)
- サンドボックスから `git push origin main` が動く

---

## 9. テスト用アカウント

| email | password | 用途 |
|---|---|---|
| `tonoikenta@gmail.com` | (user 知ってる) | オーナーアカウント。ガイド "ガイドワイ" (paid, ¥1000/day) |
| `tonoikenta@icloud.com` | (user 知ってる) | admin email、分析ダッシュボード閲覧可 |
| `claude-test@example.com` | (旧テスト) | ガイド "test man" (paid, ¥1100/day) 所有 |
| `claude-test2@example.com` | (旧テスト) | ガイド "guides" (paid, ¥2000/day) 所有 |

デモガイド 3 件 (`user_id = NULL`):
- Yuki Tanaka (mode=both, ¥3500/day, 4.9, 87 tours)
- Aoi Nakamura (mode=free, mate)
- Ren Kobayashi (mode=paid, ¥4000/day)

---

## 10. よくあるトラブル

### Vercel build 失敗
- `package-lock.json` と `package.json` のズレ -> サンドボックスで `npm install --package-lock-only` -> commit

### TypeScript エラー
- `app/page.tsx` が肥大しすぎて Edit/Write が truncate するケースあり。**`bash` の cat heredoc** または `python3` で書く + `head -n N` で end を確実に把握する習慣を

### Realtime チャット届かない
- Supabase project が INACTIVE になっていないか (`mcp__3c675608-…__list_projects` で確認、必要なら `restore_project`)
- 自動 7-14 日アクセス無しで free tier が pause する

### メール届かない
- Resend のセットアップ完了確認 (`RESEND_API_KEY` 等)
- Resend rate limit (free: 100/日, 3000/月)
- Supabase Edge Function logs で fetch 失敗してないか

### 既存メアドで signup 「成功」っぽいけど挙動おかしい
- Supabase の隠れ仕様 (security 上わざと黙ってる)。コード側で `identities=[]` 検知済み、「既登録」エラーを返す

### モードピッカーがループする
- `user_settings.app_mode` が空のまま。設定ページから明示的に Local / Traveler を選んで保存

---

## 11. 引き継ぎ AI への注文

- ユーザは「忖度せず批判的に」「オネエ言葉」を希望してる。`<user_preferences>` ブロックを尊重して
- 機能追加時は必ず `app/page.tsx` の規模に注意。1500 行超えたら**コンポーネント分割を提案して**
- 編集ツールが大きい file で truncate する事故が頻発。**毎回 `npx --no-install tsc --noEmit` で確認**
- 引き継ぎ時点で **git push は自動化済** (PAT 経由)。手動 push を user に強いるな
- 次の AI が困らないように、機能追加したら **この HANDOFF.md を更新**して
- ユーザは技術詳細を読みたがらないが、**「ユーザがやること」リストは必ず明示**して欲しいタイプ
- DB 変更したら `apply_migration` を使う (raw `execute_sql` だと migration history に残らない)

---

最終 commit: `3580418` (2026-05-26)
ファイル数: app/ 配下 ~50 files、合計 LOC ~6000
