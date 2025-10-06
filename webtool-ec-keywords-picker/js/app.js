/**
 * アマゾン検索キーワードジェネレーター
 * アパレル・雑貨カテゴリ専用AIキーワード生成ツール
 */

class AmazonKeywordGenerator {
    constructor() {
        // 使用済みキーワードを管理する配列
        this.usedKeywords = [];
        // 生成履歴を管理する配列
        this.generationHistory = [];
        // 現在選択されているカテゴリ
        this.currentCategory = 'apparel';
        // API設定
        this.apiUrl = 'https://nurumayu-worker.skume-bioinfo.workers.dev/';
        this.model = "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8";
        
        this.initializeEventListeners();
        this.loadFromStorage();
    }

    /**
     * イベントリスナーの初期化
     */
    initializeEventListeners() {
        // カテゴリ選択
        document.querySelectorAll('input[name="category"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.currentCategory = e.target.value;
                this.showNotification(`カテゴリを${this.getCategoryName(this.currentCategory)}に変更しました`, 'success');
            });
        });

        // キーワード数選択ボタン
        document.querySelectorAll('[data-count]').forEach(button => {
            button.addEventListener('click', (e) => {
                const count = parseInt(e.target.closest('[data-count]').dataset.count);
                this.generateKeywords(count);
            });
        });

        // リセットボタン
        document.getElementById('resetBtn').addEventListener('click', () => {
            this.resetGenerator();
        });

        // コピーボタン
        document.getElementById('copyAllBtn').addEventListener('click', () => {
            this.copyAllKeywords();
        });

        // エクスポートボタン
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportKeywords();
        });

        // 出力窓クリアボタン
        document.getElementById('clearOutputBtn').addEventListener('click', () => {
            this.clearOutput();
        });
    }

    /**
     * キーワードを生成
     * @param {number} count - 生成するキーワード数
     */
    async generateKeywords(count) {
        try {
            this.showLoading(true);
            this.addRotatingAnimation();
            
            const messages = this.buildPrompt(count);
            const keywords = await this.callLLMAPI(messages);
            
            if (keywords && keywords.length > 0) {
                this.displayKeywords(keywords);
                this.appendToOutput(keywords, count);
                this.addToHistory(keywords, count);
                this.saveToStorage();
                this.showNotification(`${keywords.length}個のキーワードを生成しました！`, 'success');
            } else {
                throw new Error('キーワードの生成に失敗しました');
            }
            
        } catch (error) {
            console.error('キーワード生成エラー:', error);
            this.showNotification('キーワードの生成に失敗しました。もう一度お試しください。', 'error');
        } finally {
            this.showLoading(false);
            this.removeRotatingAnimation();
        }
    }

    /**
     * LLM APIを呼び出す
     * @param {Array} messages - メッセージ配列
     * @returns {Array} - 生成されたキーワード配列
     */
    async callLLMAPI(messages) {
        const requestData = {
            model: this.model,
            temperature: 0.7,
            stream: false,
            max_completion_tokens: 2000,
            messages: messages
        };

        const response = await fetch(this.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            throw new Error(`API呼び出しに失敗しました: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.choices && data.choices.length > 0 && data.choices[0].message) {
            return this.parseKeywordResponse(data.choices[0].message.content);
        } else if (data.answer) {
            return this.parseKeywordResponse(data.answer);
        } else {
            throw new Error('レスポンスに期待されるフィールドがありません');
        }
    }

    /**
     * プロンプトを構築
     * @param {number} count - 生成するキーワード数
     * @returns {Array} - メッセージ配列
     */
    buildPrompt(count) {
        const categoryName = this.getCategoryName(this.currentCategory);
        const usedKeywordsText = this.usedKeywords.length > 0 
            ? `これまでに使用したキーワード: ${this.usedKeywords.join('、')}`
            : '';

        const systemPrompt = `あなたは${categoryName}のAmazon販売に詳しい専門家です。
        効果的な検索キーワードを生成してください。
        ${usedKeywordsText}
        上記のキーワードは既に使用済みなので、絶対に重複しないようにしてください。
        日本語で自然な検索キーワードを生成してください。
        ${categoryName}カテゴリに特化した、購買意欲を刺激するキーワードをお願いします。`;

        const userPrompt = `${count}個の${categoryName}関連のAmazon検索キーワードを生成してください。
        以下の条件を満たしてください：
        - 既に使用したキーワードと重複しない
        - 購買意欲を刺激する表現
        - 日本語で自然な表現
        - 検索ボリュームが高そうなキーワード
        - カテゴリは${categoryName}に限定
        
        出力形式は、1行に1つのキーワードだけを記載してください。`;

        return [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ];
    }

    /**
     * APIレスポンスをパースしてキーワードを抽出
     * @param {string} responseText - APIレスポンステキスト
     * @returns {Array} - キーワード配列
     */
    parseKeywordResponse(responseText) {
        if (!responseText) return [];

        // レスポンスを行ごとに分割して、空行を除外
        const lines = responseText.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);

        // 使用済みキーワードと重複しないようにフィルタリング
        const newKeywords = lines.filter(keyword => {
            const cleanKeyword = keyword.replace(/^[\d\-\.\s]+/, '').trim();
            return cleanKeyword.length > 0 && !this.usedKeywords.includes(cleanKeyword);
        });

        // 使用済みキーワードリストを更新
        newKeywords.forEach(keyword => {
            const cleanKeyword = keyword.replace(/^[\d\-\.\s]+/, '').trim();
            this.usedKeywords.push(cleanKeyword);
        });

        return newKeywords;
    }

    /**
     * キーワードを画面に表示
     * @param {Array} keywords - 表示するキーワード配列
     */
    displayKeywords(keywords) {
        const container = document.getElementById('keywordsContainer');
        const section = document.getElementById('keywordsSection');
        
        // コンテナをクリア
        container.innerHTML = '';
        
        // キーワードを表示
        keywords.forEach((keyword, index) => {
            const cleanKeyword = keyword.replace(/^[\d\-\.\s]+/, '').trim();
            
            const keywordElement = document.createElement('div');
            keywordElement.className = 'keyword-item';
            keywordElement.style.animationDelay = `${index * 0.1}s`;
            
            keywordElement.innerHTML = `
                <div class="keyword-text">${cleanKeyword}</div>
                <div class="keyword-category">アパレル・雑貨</div>
            `;
            
            // クリックでコピー機能
            keywordElement.addEventListener('click', () => {
                this.copyToClipboard(cleanKeyword);
                this.showNotification(`「${cleanKeyword}」をコピーしました！`, 'success');
            });
            
            container.appendChild(keywordElement);
        });
        
        // セクションを表示
        section.style.display = 'block';
        section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    /**
     * ローディング表示の切り替え
     * @param {boolean} show - 表示するかどうか
     */
    showLoading(show) {
        const indicator = document.getElementById('loadingIndicator');
        const buttons = document.querySelectorAll('[data-count]');
        
        if (show) {
            indicator.style.display = 'flex';
            buttons.forEach(btn => btn.disabled = true);
        } else {
            indicator.style.display = 'none';
            buttons.forEach(btn => btn.disabled = false);
        }
    }

    /**
     * 生成履歴に追加
     * @param {Array} keywords - 生成されたキーワード
     * @param {number} count - 要求されたキーワード数
     */
    addToHistory(keywords, count) {
        const historyItem = {
            id: Date.now(),
            timestamp: new Date(),
            keywords: keywords,
            count: count
        };
        
        this.generationHistory.unshift(historyItem);
        
        // 最新の10件のみ保持
        if (this.generationHistory.length > 10) {
            this.generationHistory = this.generationHistory.slice(0, 10);
        }
        
        this.updateHistoryDisplay();
    }

    /**
     * 履歴表示を更新
     */
    updateHistoryDisplay() {
        const container = document.getElementById('historyContainer');
        
        if (this.generationHistory.length === 0) {
            container.innerHTML = '<p class="empty-state">まだキーワードが生成されていません</p>';
            return;
        }
        
        container.innerHTML = '';
        
        this.generationHistory.forEach(item => {
            const historyElement = document.createElement('div');
            historyElement.className = 'history-item';
            
            const timeString = item.timestamp.toLocaleString('ja-JP');
            
            historyElement.innerHTML = `
                <div class="history-info">
                    <div class="history-time">${timeString} - ${item.count}個生成</div>
                    <div class="history-keywords">
                        ${item.keywords.map(keyword => 
                            `<span class="history-keyword">${keyword.replace(/^[\d\-\.\s]+/, '').trim()}</span>`
                        ).join('')}
                    </div>
                </div>
            `;
            
            container.appendChild(historyElement);
        });
    }

    /**
     * すべてのキーワードをコピー
     */
    async copyAllKeywords() {
        const keywordElements = document.querySelectorAll('.keyword-text');
        const keywords = Array.from(keywordElements).map(el => el.textContent);
        
        if (keywords.length === 0) {
            this.showNotification('コピーするキーワードがありません', 'warning');
            return;
        }
        
        const text = keywords.join('\n');
        
        try {
            await this.copyToClipboard(text);
            this.showNotification('すべてのキーワードをコピーしました！', 'success');
        } catch (error) {
            console.error('コピーエラー:', error);
            this.showNotification('コピーに失敗しました', 'error');
        }
    }

    /**
     * クリップボードにコピー
     * @param {string} text - コピーするテキスト
     */
    async copyToClipboard(text) {
        if (navigator.clipboard) {
            await navigator.clipboard.writeText(text);
        } else {
            // フォールバック
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
        }
    }

    /**
     * キーワードをエクスポート
     */
    exportKeywords() {
        const keywordElements = document.querySelectorAll('.keyword-text');
        const keywords = Array.from(keywordElements).map(el => el.textContent);
        
        if (keywords.length === 0) {
            this.showNotification('エクスポートするキーワードがありません', 'warning');
            return;
        }
        
        const csvContent = 'キーワード\n' + keywords.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `amazon-keywords-${new Date().toISOString().slice(0, 10)}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.showNotification('キーワードをエクスポートしました！', 'success');
        }
    }

    /**
     * ジェネレーターをリセット
     */
    resetGenerator() {
        if (confirm('本当にリセットしますか？生成履歴と使用済みキーワードがクリアされます。')) {
            this.usedKeywords = [];
            this.generationHistory = [];
            
            // ローカルストレージをクリア
            localStorage.removeItem('amazonKeywordGenerator_usedKeywords');
            localStorage.removeItem('amazonKeywordGenerator_generationHistory');
            
            // 画面を更新
            document.getElementById('keywordsSection').style.display = 'none';
            this.updateHistoryDisplay();
            
            this.showNotification('ジェネレーターをリセットしました', 'success');
        }
    }

    /**
     * 通知を表示
     * @param {string} message - 通知メッセージ
     * @param {string} type - 通知タイプ（success, error, warning）
     */
    showNotification(message, type = 'info') {
        const container = document.getElementById('notificationContainer');
        const notification = document.createElement('div');
        
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        container.appendChild(notification);
        
        // 5秒後に自動的に削除
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }

    /**
     * ローカルストレージに保存
     */
    saveToStorage() {
        localStorage.setItem('amazonKeywordGenerator_usedKeywords', JSON.stringify(this.usedKeywords));
        localStorage.setItem('amazonKeywordGenerator_generationHistory', JSON.stringify(this.generationHistory));
    }

    /**
     * カテゴリ名を取得
     * @param {string} category - カテゴリコード
     * @returns {string} - カテゴリ名
     */
    getCategoryName(category) {
        const categoryNames = {
            'apparel': 'アパレル',
            'goods': '雑貨',
            'both': 'アパレル・雑貨'
        };
        return categoryNames[category] || 'アパレル・雑貨';
    }

    /**
     * 回るアニメーションを追加
     */
    addRotatingAnimation() {
        const buttons = document.querySelectorAll('[data-count]');
        buttons.forEach(btn => {
            btn.classList.add('rotating');
            btn.disabled = true;
        });
    }

    /**
     * 回るアニメーションを削除
     */
    removeRotatingAnimation() {
        const buttons = document.querySelectorAll('[data-count]');
        buttons.forEach(btn => {
            btn.classList.remove('rotating');
            btn.disabled = false;
        });
    }

    /**
     * 出力窓に結果を追加
     * @param {Array} keywords - キーワード配列
     * @param {number} count - 生成数
     */
    appendToOutput(keywords, count) {
        const outputContent = document.getElementById('outputContent');
        const categoryName = this.getCategoryName(this.currentCategory);
        const timestamp = new Date().toLocaleString('ja-JP');
        
        // 空の状態をクリア
        if (outputContent.querySelector('.empty-output')) {
            outputContent.innerHTML = '';
        }
        
        // 新しい結果を追加
        const resultDiv = document.createElement('div');
        resultDiv.className = 'output-result';
        resultDiv.innerHTML = `
            <div class="output-header-info">
                <span class="output-category">${categoryName}</span>
                <span class="output-count">${count}個生成</span>
                <span class="output-time">${timestamp}</span>
            </div>
            <div class="output-keywords">${keywords.map(k => `<span class="output-keyword">${k.replace(/^[\d\-\.\s]+/, '').trim()}</span>`).join('')}</div>
            <hr style="margin: var(--spacing-md) 0; border: none; border-top: 1px solid var(--gray-700);">
        `;
        
        outputContent.appendChild(resultDiv);
        outputContent.scrollTop = outputContent.scrollHeight;
    }

    /**
     * 出力窓をクリア
     */
    clearOutput() {
        const outputContent = document.getElementById('outputContent');
        outputContent.innerHTML = '<p class="empty-output">ここに生成されたキーワードが表示されます</p>';
        this.showNotification('出力窓をクリアしました', 'success');
    }

    /**
     * ローカルストレージから読み込み
     */
    loadFromStorage() {
        const savedUsedKeywords = localStorage.getItem('amazonKeywordGenerator_usedKeywords');
        const savedHistory = localStorage.getItem('amazonKeywordGenerator_generationHistory');
        
        if (savedUsedKeywords) {
            this.usedKeywords = JSON.parse(savedUsedKeywords);
        }
        
        if (savedHistory) {
            this.generationHistory = JSON.parse(savedHistory);
            this.updateHistoryDisplay();
        }
    }
}

// アプリケーションの初期化
document.addEventListener('DOMContentLoaded', () => {
    new AmazonKeywordGenerator();
});

// サービスワーカーの登録（オフライン対応）
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW登録成功:', registration);
            })
            .catch(registrationError => {
                console.log('SW登録失敗:', registrationError);
            });
    });
}