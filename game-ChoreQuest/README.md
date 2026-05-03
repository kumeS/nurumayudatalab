# 🎮 Chore Quest - 家事を冒険に変えるゲーミフィケーションアプリ

## 📋 概要

**Chore Quest**は、家事をRPGゲームのように楽しく体験できるWebアプリケーションです。家族全員が協力してクエスト（家事）をクリアし、経験値やコインを獲得しながら、ボス戦（大きな掃除プロジェクト）に挑戦します。

## ✨ 主な機能

### 🎯 ゲーム要素
- **キャラクター作成**: 6種類のアバターから選択
- **レベルシステム**: 経験値を獲得してレベルアップ
- **スタミナシステム**: 家事にはスタミナが必要、時間経過で回復
- **コイン報酬**: クエスト完了で仮想通貨を獲得

### 🎭 クエストシステム
- **4種類のクエスト**:
  - 🍽️ 皿洗いクエスト (5分、100XP、30コイン)
  - 🧹 掃除機クエスト (10分、150XP、45コイン)
  - 👕 洗濯物クエスト (8分、120XP、35コイン)
  - 🚽 トイレ掃除クエスト (15分、200XP、60コイン)
- **難易度システム**: ⭐の数で難易度を表示
- **リアルタイムタイマー**: クエスト進行状況を視覚的に表示

### 🐉 ボス戦システム
- **協力プレイ**: 家族全員でボスの体力を削る
- **ダメージ計算**: 獲得XPの10%がボスへのダメージ
- **特別報酬**: ボス討伐で大量のコインと特別アイテム

### 🏆 実績システム
- **4つの実績**:
  - 🏆 初クエスト: 最初のクエストを完了
  - ⭐ レベルアップ: レベル2に到達
  - ⚔️ ボスハンター: ボスに1000ダメージ
  - ⚡ エネルギー管理者: スタミナを効率的に使用

### 🔊 サウンド・通知機能
- **効果音**: クエスト開始・完了時の音響効果
- **プッシュ通知**: デイリークエストの通知
- **隠し要素**: アバターを10回クリックで隠しボーナス

## 🏗️ アーキテクチャ

### ファイル構成

```
📁 ChoreQuest/
├── 📄 index.html          # メインHTMLファイル
├── 📄 README.md           # このファイル
└── 📁 js/
    ├── 📄 app.js          # メインアプリケーション制御
    ├── 📄 gameState.js    # ゲーム状態管理
    ├── 📄 auth.js         # ログイン・認証機能
    ├── 📄 ui.js           # UI管理・画面遷移
    ├── 📄 quests.js       # クエスト機能・タイマー
    ├── 📄 boss.js         # ボス戦システム
    ├── 📄 achievements.js # 実績・特別イベント
    ├── 📄 audio.js        # 音響効果
    └── 📄 notifications.js # 通知システム
```

### 技術スタック
- **フロントエンド**: HTML5, CSS3, Vanilla JavaScript
- **ストレージ**: LocalStorage
- **音響**: Web Audio API
- **通知**: Notification API
- **デザイン**: CSS Grid, Flexbox, アニメーション

## 🚀 セットアップ

### 必要環境
- モダンWebブラウザ (Chrome, Firefox, Safari, Edge)
- JavaScript有効

### インストール手順

1. **プロジェクトのクローン**
   ```bash
   git clone <repository-url>
   cd ChoreQuest
   ```

2. **Webサーバーで起動**
   ```bash
   # Python 3の場合
   python -m http.server 8000
   
   # Python 2の場合
   python -m SimpleHTTPServer 8000
   
   # Node.jsの場合
   npx serve .
   ```

3. **ブラウザでアクセス**
   ```
   http://localhost:8000
   ```

## 🎮 使用方法

### 初回ログイン
1. アバターを選択
2. ニックネームを入力
3. 家族チーム名を入力
4. 「冒険を始める」をクリック

### クエストの進行
1. **ホーム画面**でデイリークエストを確認
2. **クエスト画面**で利用可能な全クエストを表示
3. スタミナが足りるクエストを選択
4. 「クエスト開始」でタイマー開始
5. 実際の家事を実行
6. 「クエスト完了」で報酬獲得

### ボス戦参加
1. **ボス戦画面**で現在のボス状況を確認
2. 家族メンバーの貢献度を表示
3. クエスト完了でボスにダメージ
4. 全員で協力してボスを討伐

## 🛠️ カスタマイズ

### 新しいクエストの追加
`js/gameState.js`の`quests`配列に新しいクエストオブジェクトを追加:

```javascript
{
    id: 5,
    title: '新しいクエスト',
    description: 'クエストの説明',
    difficulty: 3,
    xpReward: 180,
    coinReward: 50,
    category: 'custom',
    duration: 720, // 12分 (秒単位)
    staminaCost: 18
}
```

### 実績の追加
`js/gameState.js`の`achievements`配列に新しい実績を追加:

```javascript
{
    id: 'new_achievement',
    name: '新実績',
    description: '実績の説明',
    icon: '🌟',
    unlocked: false
}
```

### 季節イベントの設定
`js/achievements.js`の`checkSeasonalEvents()`関数を編集してカスタムイベントを追加。

## 🔧 開発情報

### データ構造

#### ゲーム状態
```javascript
gameState = {
    user: {
        nickname: string,
        avatar: string,
        level: number,
        xp: number,
        stamina: number,
        coins: number,
        familyId: string
    },
    currentQuest: object | null,
    questTimer: number | null,
    quests: array
}
```

#### ボス状態
```javascript
bossState = {
    currentHP: number,
    maxHP: number,
    participants: array
}
```

### イベントシステム
- `DOMContentLoaded`: アプリ初期化
- `click`: ボタンクリック、音響効果
- `beforeunload`: ゲーム状態保存

### ローカルストレージ
- `choreQuestGameState`: メインゲーム状態
- `choreQuestBossState`: ボス戦状態

## 🎯 今後の拡張案

### 短期目標
- [ ] より詳細な実績システム
- [ ] カスタムクエスト作成機能
- [ ] 家族間リアルタイムチャット
- [ ] より豊富な音響効果

### 中期目標
- [ ] モバイルアプリ化 (PWA)
- [ ] オンライン同期機能
- [ ] 写真アップロード機能
- [ ] 週間・月間統計

### 長期目標
- [ ] AI による家事推奨機能
- [ ] ソーシャル機能の拡張
- [ ] 外部IoTデバイス連携
- [ ] ゲーミフィケーション要素の強化

## 🤝 コントリビューション

1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/AmazingFeature`)
3. 変更をコミット (`git commit -m 'Add some AmazingFeature'`)
4. ブランチにプッシュ (`git push origin feature/AmazingFeature`)
5. Pull Requestを作成

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。詳細は`LICENSE`ファイルを参照してください。

## 🙏 謝辞

- 家事をゲーム化するアイデアに貢献したすべての家族
- UIデザインに使用した絵文字の提供者
- Webアプリケーション開発のベストプラクティス

## 📞 サポート

質問や問題がある場合は、GitHubのIssuesページで報告してください。

---

**Happy Questing! 🗡️✨**

家事を楽しい冒険に変えて、家族みんなで協力して素敵な家を作りましょう！ 