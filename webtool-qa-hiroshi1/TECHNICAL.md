# 技術仕様書 - なぜを4回問い続ける

## システムアーキテクチャ

### 概要
本システムは、クライアントサイドSPA（Single Page Application）として設計されており、外部LLM APIと連携して動的な質問生成と心理分析を行います。

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   ブラウザ      │    │  Cloudflare      │    │  LLM API        │
│   (Client)      │◄──►│  Workers         │◄──►│  (Llama-4)      │
│                 │    │  (Proxy)         │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### ファイル構成
```
webtool-qa-hiroshi1/
│
├── index.html              # メインHTMLファイル（723行）
│   ├── CSS（スタイル定義）
│   ├── HTML構造
│   └── レガシーJavaScript
│
├── app.js                 # 核心ロジック（550行）
│   ├── LLM API統合
│   ├── 質問生成ロジック
│   ├── 深層心理分析
│   └── UI制御
│
├── 実装案.txt             # 哲学的設計文書（211行）
│   ├── コンセプト説明
│   ├── 具体的利用例
│   └── 理論的背景
│
└── README.md              # プロジェクト概要
```

## API仕様

### LLM API エンドポイント
```
URL: https://nurumayu-worker.skume-bioinfo.workers.dev/
Method: POST
Content-Type: application/json
```

### リクエスト形式
```json
{
  "model": "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
  "temperature": 0.8,
  "stream": false,
  "max_completion_tokens": 1000,
  "messages": [
    {
      "role": "system",
      "content": "あなたは深層心理学の専門家として..."
    },
    {
      "role": "user", 
      "content": "ユーザーの質問や回答"
    }
  ]
}
```

### レスポンス形式
```json
{
  "choices": [
    {
      "message": {
        "content": "LLMからの回答テキスト"
      }
    }
  ]
}
```

### エラーハンドリング
```javascript
// APIコール関数
async function callLLM(prompt) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });
        
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }
        
        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error('LLM API エラー:', error);
        throw error;
    }
}
```

## データ構造

### 会話履歴
```javascript
// conversationHistory配列の構造
[
  {
    question: "なぜその仕事を選びたいのですか？",
    answer: "給料が良いからです",
    level: 0  // 0-3の質問レベル
  },
  // ... 最大4項目
]
```

### テーマ定義
```javascript
const advancedThemes = {
  'existential': {
    title: '存在の意味',
    description: 'なぜあなたは存在しているのか、その根源的意味を探ります',
    initialPrompt: 'あなたが生きている理由や存在する意味について、まず思い浮かぶことを教えてください。'
  },
  // ... 8つのテーマ
}
```

### 質問レベル定義
```javascript
const levelDescriptions = [
    "第1の問い - 表面的な理由",
    "第2の問い - 個人的な動機", 
    "第3の問い - 深層の信念",
    "第4の問い - 存在の根源"
];
```

## 主要アルゴリズム

### 1. 動的質問生成
```javascript
function createQuestionGenerationPrompt(previousAnswer) {
    const context = conversationHistory.map(item => 
        `Q${item.level + 1}: ${item.question}\nA${item.level + 1}: ${item.answer}`
    ).join('\n\n');

    const levelNames = [
        "表面的な理由を深掘りし、より根本的な動機",
        "個人的な体験や価値観の形成過程", 
        "信念や価値観の根源的な起源",
        "存在論的・哲学的な本質"
    ];

    return `あなたは深層心理を探求する専門家です。
    会話履歴: ${context}
    最新の回答: "${previousAnswer}"
    
    第${questionLevel + 1}レベルの質問として、${levelNames[questionLevel - 1]}に迫る質問を生成してください。`;
}
```

### 2. 回答品質評価
```javascript
async function evaluateAnswerQuality(answer) {
    const shallowIndicators = [
        /^(はい|いいえ|そうです|そうではない)/,
        /^.{1,20}$/,  // 20文字以下
        /^(普通|特に|別に|なんとなく|よくわからない)/,
        /^(お金|給料|収入)/,  // 表面的な動機
    ];

    const isShallow = shallowIndicators.some(pattern => pattern.test(answer));
    
    return {
        needsDeepening: isShallow,
        suggestion: isShallow ? "より具体的で深い内容" : null
    };
}
```

### 3. 深層心理分析
```javascript
function createAnalysisPrompt() {
    return `あなたは深層心理学の専門家です。以下の4段階の質問と回答を分析してください。
    
    会話履歴: ${context}
    
    ## 心理的パターンの分析
    ## 根源的動機の解明  
    ## 自己理解への洞察
    ## 成長への示唆
    
    分析は共感的で建設的な視点から行ってください。`;
}
```

## CSS設計

### デザインシステム
```css
:root {
    /* カラーパレット */
    --bg-primary: #0a0a0a;
    --bg-secondary: rgba(20, 20, 40, 0.8);
    --text-primary: #e0e0e0;
    --text-secondary: #b0b0b0;
    --accent-primary: #70a0ff;
    --accent-secondary: #4a69bd;
    
    /* タイポグラフィ */
    --font-primary: 'Noto Serif JP', serif;
    --font-size-base: 16px;
    --line-height-base: 1.8;
    
    /* スペーシング */
    --spacing-xs: 0.5rem;
    --spacing-sm: 1rem;
    --spacing-md: 1.5rem;
    --spacing-lg: 2rem;
    --spacing-xl: 3rem;
}
```

### レスポンシブブレークポイント
```css
/* モバイルファースト */
@media (max-width: 600px) {
    h1 { font-size: 2rem; }
    .theme-button { padding: 1.2rem 1.5rem; }
}

@media (max-width: 768px) {
    .main-container { max-width: 95%; }
}

@media (max-width: 1024px) {
    .theme-buttons { grid-template-columns: 1fr; }
}
```

### アニメーションシステム
```css
/* 段階的フェードイン */
@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(30px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* 使用例 */
.qa-pair {
    opacity: 0;
    animation: fadeInUp 0.6s ease-out forwards;
    animation-delay: calc(var(--index) * 0.1s);
}
```

## パフォーマンス最適化

### 1. ローディング最適化
```javascript
// 段階的ローディング表示
function showEnhancedLoading() {
    const messages = [
        "質問を分析しています...",
        "深層心理を探求中...", 
        "次の質問を生成しています...",
        "もう少しお待ちください..."
    ];
    
    let index = 0;
    const interval = setInterval(() => {
        if (index < messages.length) {
            updateLoadingMessage(messages[index]);
            index++;
        }
    }, 2000);
    
    return interval;
}
```

### 2. エラーリトライ機構
```javascript
// 指数バックオフリトライ
async function callLLMWithRetry(prompt, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await callLLM(prompt);
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            
            const delay = Math.pow(2, i) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}
```

### 3. メモリ管理
```javascript
// セッション終了時のクリーンアップ
function cleanup() {
    // イベントリスナーの削除
    window.removeEventListener('beforeunload', cleanup);
    
    // グローバル変数のリセット
    conversationHistory = [];
    currentTheme = '';
    
    // DOMの不要な要素削除
    document.querySelectorAll('.dynamic-element').forEach(el => el.remove());
}
```

## セキュリティ対策

### 1. 入力検証
```javascript
function sanitizeInput(input) {
    // HTMLエスケープ
    const escaped = input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
    
    // 長さ制限
    return escaped.substring(0, 1000);
}
```

### 2. プロンプトインジェクション対策
```javascript
function validatePrompt(userInput) {
    const dangerousPatterns = [
        /ignore\s+previous\s+instructions/i,
        /system\s*:/i,
        /\[INST\]/i,
        /<script/i
    ];
    
    return !dangerousPatterns.some(pattern => pattern.test(userInput));
}
```

### 3. CSP（Content Security Policy）
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline'; 
               style-src 'self' 'unsafe-inline' fonts.googleapis.com;
               font-src fonts.gstatic.com;
               connect-src 'self' nurumayu-worker.skume-bioinfo.workers.dev;">
```

## ブラウザ互換性

### サポート対象
- **Chrome**: 90+
- **Firefox**: 88+  
- **Safari**: 14+
- **Edge**: 90+

### ポリフィル要件
```javascript
// Fetch API（IE11対応時）
if (!window.fetch) {
    // fetch polyfill
}

// Promise（古いブラウザ対応時）
if (!window.Promise) {
    // promise polyfill
}
```

### 機能検出
```javascript
// Web Speech API
function checkSpeechSupport() {
    return 'speechSynthesis' in window;
}

// Local Storage
function checkStorageSupport() {
    try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
        return true;
    } catch (e) {
        return false;
    }
}
```

## デバッグ・監視

### ログ機能
```javascript
const Logger = {
    debug: (message, data) => {
        if (process.env.NODE_ENV === 'development') {
            console.log(`[DEBUG] ${message}`, data);
        }
    },
    
    error: (message, error) => {
        console.error(`[ERROR] ${message}`, error);
        // 本番環境では外部監視サービスに送信
    },
    
    user: (action, data) => {
        console.log(`[USER] ${action}`, data);
        // ユーザー行動分析用（プライバシー配慮）
    }
};
```

### パフォーマンス測定
```javascript
function measurePerformance(name, fn) {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    
    Logger.debug(`Performance: ${name}`, `${end - start}ms`);
    return result;
}
```

## 環境設定

### 開発環境
```bash
# ローカルサーバー起動
python3 -m http.server 8080

# または Node.js
npx http-server -p 8080 -c-1

# HTTPS が必要な場合
npx http-server -p 8080 -S -C cert.pem -K key.pem
```

### 本番環境
```nginx
# Nginx設定例
server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    root /path/to/webtool-qa-hiroshi1;
    index index.html;
    
    # Gzip圧縮
    gzip on;
    gzip_types text/css application/javascript;
    
    # キャッシュ設定
    location ~* \.(css|js)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 監視設定
```javascript
// エラー監視
window.addEventListener('error', (event) => {
    Logger.error('Global Error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
    });
});

// 未処理のPromise拒否
window.addEventListener('unhandledrejection', (event) => {
    Logger.error('Unhandled Promise Rejection', event.reason);
});
```

## 今後の技術的改善

### 1. TypeScript化
```typescript
interface ConversationItem {
    question: string;
    answer: string;
    level: number;
}

interface Theme {
    title: string;
    description: string;
    initialPrompt: string;
}

class DeepPsychologyExplorer {
    private conversationHistory: ConversationItem[] = [];
    private currentTheme: string = '';
    
    async generateNextQuestion(answer: string): Promise<string> {
        // 型安全な実装
    }
}
```

### 2. モジュール化
```javascript
// modules/llm.js
export class LLMService {
    async call(prompt) { /* ... */ }
}

// modules/ui.js  
export class UIController {
    updateProgress(level) { /* ... */ }
}

// main.js
import { LLMService } from './modules/llm.js';
import { UIController } from './modules/ui.js';
```

### 3. テスト実装
```javascript
// tests/unit/llm.test.js
describe('LLM Service', () => {
    test('should generate valid questions', async () => {
        const llm = new LLMService();
        const result = await llm.generateQuestion('test answer');
        expect(result).toContain('なぜ');
    });
});
```

### 4. PWA化
```json
// manifest.json
{
    "name": "なぜを4回問い続ける",
    "short_name": "DeepWhy", 
    "start_url": "/",
    "display": "standalone",
    "theme_color": "#70a0ff",
    "background_color": "#0a0a0a"
}
```

これらの技術仕様に基づいて、より堅牢で拡張可能なシステムへの改善を進めることができます。