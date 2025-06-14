# スピードガン ランキング

このプロジェクトは、野球の投球速度を記録し、選手ごとのランキングを表示するためのWebアプリケーションです。ユーザーはアカウントを作成し、自分だけの選手リストと球速記録を管理できます。

**公開URL:** [https://baseball-speedgun-app.web.app](https://baseball-speedgun-app.web.app)

---

## 主な機能

- **ユーザー認証**: メールアドレスとパスワードによる新規登録・ログイン機能を実装しています。
- **パーソナライズされたデータ**: ユーザーごとに選手データは完全に分離されており、プライバシーが保たれます。
- **ランキング表示**:
    - 選手の最高球速に基づいて、降順でランキングを表示します。
    - 同率順位（例: 1位, 2位, 2位, 4位）に正しく対応しています。
    - 1位〜3位にはメダルアイコン（🥇🥈🥉）が表示されます。
- **選手・記録管理 (CRUD)**:
    - フローティングボタンから、選手名、球速、日付をモーダルで簡単に追加できます。
    - 同じ選手が同じ日に複数回記録された場合、その日の最高速のみが保存されます。
    - 選手ごとの記録を一括で削除できます。
- **詳細グラフ**:
    - 各選手の日付ごとの球速推移を折れ線グラフで視覚的に確認できます。
    - グラフページでは、特定の日付の記録を個別に削除することも可能です。
- **モダンなUI/UX**:
    - レスポンシブデザインで、どのデバイスでも見やすいレイアウトです。
    - カードデザインやホバーエフェクトなど、直感的に操作できるモダンなデザインを採用しています。

## 使用技術

- **フロントエンド**:
    - [React](https://reactjs.org/) (Create React App)
    - [TypeScript](https://www.typescriptlang.org/)
    - [React Router](https://reactrouter.com/)
    - [Chart.js](https://www.chartjs.org/) (for data visualization)
- **バックエンド / インフラ**:
    - [Firebase](https://firebase.google.com/)
        - **Authentication**: ユーザー認証
        - **Cloud Firestore**: データベース
        - **Hosting**: アプリケーションのホスティング
- **開発ツール**:
    - ESLint / Prettier
    - npm

---

## セットアップと実行方法

### 1. リポジトリをクローン

```bash
git clone <repository-url>
cd baseball-speedgun
```

### 2. 依存関係をインストール

```bash
npm install
```

### 3. Firebaseを設定

このプロジェクトを自分のFirebaseプロジェクトで動かすには、設定情報が必要です。

1.  Firebaseコンソールで新しいWebアプリケーションを作成します。
2.  プロジェクトのルートに `.env` ファイルを作成します。
3.  Firebaseコンソールから取得した設定情報を、`.env` ファイルに以下の形式で貼り付けます。

    ```.env
    REACT_APP_API_KEY=Your-API-Key
    REACT_APP_AUTH_DOMAIN=your-project-id.firebaseapp.com
    REACT_APP_PROJECT_ID=your-project-id
    REACT_APP_STORAGE_BUCKET=your-project-id.appspot.com
    REACT_APP_MESSAGING_SENDER_ID=your-sender-id
    REACT_APP_APP_ID=your-app-id
    REACT_APP_MEASUREMENT_ID=your-measurement-id
    ```

### 4. 開発サーバーを起動

```bash
npm start
```

ブラウザで `http://localhost:3000` が開きます。

### 5. デプロイ

このアプリケーションはFirebase Hostingにデプロイされています。

```bash
# 本番用にビルド
npm run build

# Firebaseにデプロイ
firebase deploy --only hosting
```

---
This README was generated with the help of an AI assistant. 