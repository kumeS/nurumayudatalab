# PDF出力機能モジュール (pdf.js)

このモジュールは、Webアプリケーションでレポートや文書をPDF形式で出力する機能を提供します。元々は児童進捗管理ツールから抽出された汎用的なPDF生成機能です。

## 📋 目次
1. [機能概要](#機能概要)
2. [セットアップ](#セットアップ)
3. [基本的な使用方法](#基本的な使用方法)
4. [高度な使用方法](#高度な使用方法)
5. [API リファレンス](#apiリファレンス)
6. [カスタマイズ](#カスタマイズ)

## 🚀 機能概要

### 主要機能
- **ブラウザ印刷機能**を利用したPDF生成
- **HTMLファイル**としてのダウンロード（フォールバック）
- **マークダウン形式**のコンテンツをHTML変換
- **複数レポート**の一括PDF生成
- **カスタムテンプレート**対応
- **豊富なスタイルオプション**

### 対応フォーマット
- 📝 マークダウン（見出し、リスト、太字など）
- 🎨 絵文字付きヘッダー
- 📊 カスタムスタイリング
- 🖨️ 印刷最適化（A4サイズ対応）

## ⚙️ セットアップ

### 1. ファイルの配置
```html
<!-- HTMLファイルに追加 -->
<script src="pdf.js"></script>
```

### 2. 依存関係
- 現代的なWebブラウザ（Chrome, Firefox, Safari, Edge）
- JavaScript ES6+対応

### 3. 必要な権限
- ポップアップ許可（印刷ダイアログ用）
- ファイルダウンロード許可

## 🎯 基本的な使用方法

### シンプルなPDF生成

```javascript
// レポートオブジェクトを作成
const report = {
  title: 'サンプルレポート',
  content: `
🌸 **学習状況**

・算数の理解度が向上しています。
・宿題も継続的に頑張っています。
・**重要な点**：継続的な努力が見られます。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📚 **今後の課題**

・漢字の練習を強化する必要があります。
・読書時間を増やすことをおすすめします。
  `,
  timestamp: Date.now(),
  studentName: '田中太郎'
};

// PDF生成実行
exportReportPDF(report);
```

### オプション付きPDF生成

```javascript
exportReportPDF(report, {
  filename: 'monthly_report_202412.html',
  fontFamily: 'Yu Gothic, Meiryo, sans-serif',
  h1Color: '#2563eb',
  h2Color: '#7c3aed',
  customStyles: `
    .highlight { 
      background-color: yellow; 
      padding: 2px 4px; 
    }
  `,
  printMargin: '15mm',
  pageSize: 'A4',
  onSuccess: (message) => {
    console.log('成功:', message);
    showNotification('PDF生成完了');
  },
  onError: (error) => {
    console.error('エラー:', error);
    showErrorMessage('PDF生成に失敗しました');
  }
});
```

## 🔧 高度な使用方法

### 複数レポートの統合

```javascript
const reports = [
  { title: '4月のレポート', content: '4月の学習状況...', timestamp: Date.now() },
  { title: '5月のレポート', content: '5月の学習状況...', timestamp: Date.now() },
  { title: '6月のレポート', content: '6月の学習状況...', timestamp: Date.now() }
];

exportMultipleReportsPDF(reports, {
  combinedTitle: '第1学期 統合レポート',
  filename: 'q1_combined_report.html',
  studentName: '田中太郎',
  h1Color: '#059669'
});
```

### カスタムテンプレート使用

```javascript
const customTemplate = `
<div class="custom-header">
  <h1>{{companyName}} - {{reportType}}</h1>
  <p>対象者: {{studentName}} | 期間: {{period}}</p>
</div>

<div class="content">
  {{content}}
</div>

<div class="footer">
  <p>担当者: {{teacherName}}</p>
  <p>連絡先: {{contact}}</p>
</div>
`;

const data = {
  companyName: '〇〇小学校',
  reportType: '学習進捗レポート',
  studentName: '田中太郎',
  period: '2024年12月',
  content: report.content,
  teacherName: '山田先生',
  contact: 'yamada@school.jp'
};

exportCustomTemplatePDF(data, customTemplate, {
  filename: 'custom_report.html',
  customStyles: `
    .custom-header { 
      background: #f0f9ff; 
      padding: 20px; 
      border-radius: 8px; 
    }
    .footer { 
      margin-top: 30px; 
      padding-top: 15px; 
      border-top: 2px solid #e5e7eb; 
    }
  `
});
```

## 📚 API リファレンス

### exportReportPDF(report, options)
メイン関数。レポートをPDF形式で出力します。

**パラメータ：**
- `report` (Object): レポートデータ
  - `title` (string): レポートタイトル
  - `content` (string): マークダウン形式のコンテンツ
  - `timestamp` (number): タイムスタンプ
  - `studentName` (string): 対象者名（オプション）

- `options` (Object): 設定オプション
  - `filename` (string): ファイル名
  - `fontFamily` (string): フォントファミリー
  - `h1Color`, `h2Color`, `h3Color` (string): 見出し色
  - `customStyles` (string): カスタムCSS
  - `onSuccess` (function): 成功時コールバック
  - `onError` (function): エラー時コールバック

### convertMarkdownToHTML(markdown, options)
マークダウンをHTMLに変換します。

**対応記法：**
```markdown
🌸 **見出し**           → <h2>見出し</h2>
**サブ見出し**          → <h3>サブ見出し</h3>
・リスト項目           → <li>リスト項目</li>
**太字テキスト**       → <strong>太字テキスト</strong>
━━━━━━━━━━━━━━━  → <hr>
```

### exportMultipleReportsPDF(reports, options)
複数のレポートを統合してPDF出力します。

### formatReportForPrint(report, options)
レポートを印刷用HTMLに整形します。

## 🎨 カスタマイズ

### スタイルオプション

```javascript
const styleOptions = {
  // フォント設定
  fontFamily: 'Hiragino Sans, Yu Gothic, Meiryo, sans-serif',
  lineHeight: '1.8',
  textColor: '#333333',
  
  // レイアウト設定
  maxWidth: '800px',
  bodyPadding: '20px',
  printMargin: '20mm',
  pageSize: 'A4',
  
  // 見出しスタイル
  h1Color: '#4f46e5',
  h1Size: '24px',
  h2Color: '#7c3aed',
  h2Size: '20px',
  h2Background: 'rgba(124, 58, 237, 0.05)',
  h3Color: '#059669',
  h3Size: '16px',
  h3Background: 'rgba(5, 150, 105, 0.1)',
  
  // 強調テキスト
  strongColor: '#e11d48',
  
  // カスタムCSS
  customStyles: `
    .highlight { background: #fef3c7; }
    .important { border-left: 4px solid #ef4444; }
  `
};
```

### テンプレート変数

カスタムテンプレートでは以下の変数が使用できます：

```javascript
// データ内の任意のプロパティ
{{title}}
{{studentName}}
{{content}}

// 自動生成される変数
{{currentDate}}      // 現在の日付
{{currentDateTime}}  // 現在の日時
```

## 🔍 トラブルシューティング

### よくある問題

**1. PDFが生成されない**
- ポップアップブロッカーを無効にしてください
- Chrome/Chromiumベースブラウザを使用してください

**2. スタイルが適用されない**
- CSSの記法を確認してください
- ブラウザの開発者ツールでスタイルを確認してください

**3. 日本語フォントが表示されない**
- `fontFamily`オプションで日本語対応フォントを指定してください

### デバッグ方法

```javascript
// デバッグ情報を出力
exportReportPDF(report, {
  onSuccess: (message) => console.log('Success:', message),
  onError: (error) => {
    console.error('Error details:', error);
    console.log('Report object:', report);
  }
});
```

## 📄 ライセンス

このモジュールは元の児童進捗管理ツールから抽出されており、同じライセンス条件が適用されます。

## 🤝 サポート

使用方法についてご質問がございましたら、元のプロジェクトの開発者にお問い合わせください。 