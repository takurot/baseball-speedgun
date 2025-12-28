# タスク実行プロンプト

@docs/PLAN.md と @docs/SPEC.md を参照して、指定された PR（例: PR-02）の実装を進めてください。

## 実装フロー

### 1. ブランチ作成

- `feature/<pr番号>-<簡潔な説明>` の形式でブランチを作成
  - 例: `feature/pr-02-ranking-ux`
- `main` ブランチから分岐すること

### 2. 実装ガイドライン（React + TypeScript）

- UI/UX要件は `docs/SPEC.md` を必ず反映
- 既存の Firebase/Firestore のスキーマは変更しない（非ゴール）
- 実装箇所の目安
  - ルーティング/全体構成: `src/App.tsx`
  - Firebase初期化: `src/firebase.ts`
  - 画面コンポーネント: `src/components/`
  - 共通スタイル: `src/App.css`, `src/index.css`
- 既存のデザイン/挙動を壊さないよう差分を最小化
- 追加の依存導入は必要最小限に留め、追加時は `package.json` に明記
- ローディング/空状態/エラー/成功の状態表示を明確化
- レスポンシブ/アクセシビリティ（フォーカスリング/ARIA）を意識

### 3. テスト

```bash
# テスト実行
npm test
```

- `src/**/*.test.tsx` で必要なテストを追加/更新
- 既存テストが壊れていないことを確認

### 4. ビルド/品質確認

```bash
# 型チェックとビルド
npm run build
```

- 必要に応じて `npm start` で手動確認

### 5. PLAN.md の更新

- 実装した PR のステータスを `✅` に更新
- 実装内容の要約を **進捗**: セクションに追記
- テストの詳細を `Tests:` セクションに追記

### 6. コミット & プッシュ

- コミットメッセージ形式: `<type>(<scope>): <description>`
  - type: `feat`, `fix`, `test`, `docs`, `refactor`, `chore`
  - 例: `feat(ranking): improve filters and summary`
- 適切な粒度でコミットを分割

### 7. Pull Request 作成

```bash
gh pr create --title "PR#<番号>: <タイトル>" --body "<説明>"
```

- PR テンプレートに従って記述
- 関連する Issue や PR をリンク

### 8. Firebase デプロイ

```bash
# 本番用にビルド
npm run build

# Hosting にデプロイ
firebase deploy --only hosting
```

- Firestore ルールを変更した場合は `firebase deploy --only firestore:rules`
- 初回のみ `firebase login` と `firebase use <project-id>` を実行

## チェックリスト

- [ ] ブランチを `main` から作成した
- [ ] `docs/SPEC.md` の要件を反映した
- [ ] テストがパスする（`npm test`）
- [ ] ビルドが通る（`npm run build`）
- [ ] PLAN.md を更新した
- [ ] コミットメッセージが適切
- [ ] PR を作成した
- [ ] 必要に応じて Firebase にデプロイした

## 注意事項

- 既存機能を壊さないこと（認証/ランキング/詳細/追加）
- Firestore のスキーマ変更や権限設計の刷新は行わない
- 画面遷移/URL 構成は維持する
- 依存関係のある PR がマージされていることを確認

## プロジェクト構成

```
baseball-speedgun/
├── docs/                   # 仕様書・計画書
├── public/
├── src/
│   ├── components/         # 画面コンポーネント
│   ├── App.tsx             # ルーティング/全体構成
│   ├── firebase.ts         # Firebase 初期化
│   ├── App.css             # 共通スタイル
│   └── index.css           # ベーススタイル
└── firebase.json           # Firebase Hosting 設定
```

## 開発コマンドまとめ

```bash
# 依存関係インストール
npm install

# 開発サーバー
npm start

# テスト実行
npm test

# 本番ビルド
npm run build

# Firebase デプロイ
firebase deploy --only hosting
```
