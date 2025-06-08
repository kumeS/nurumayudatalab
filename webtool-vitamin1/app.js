document.addEventListener('DOMContentLoaded', () => {
    // APIキーの自動読み込み・保存機能
    const apiKeyInput = document.getElementById('apiKey');
    
    // ページ読み込み時にAPIキーを復元
    const savedApiKey = sessionStorage.getItem('openai_api_key');
    if (savedApiKey) {
        apiKeyInput.value = savedApiKey;
    }
    
    // APIキー入力時に自動保存（セッション中のみ）
    apiKeyInput.addEventListener('input', function() {
        const apiKey = this.value.trim();
        if (apiKey) {
            sessionStorage.setItem('openai_api_key', apiKey);
        } else {
            sessionStorage.removeItem('openai_api_key');
        }
    });
    // 禁止ワードリスト（薬事法・広告規制対応）
    const prohibitedWords = [
        // 薬事法関連
        '治る', '治す', '治療', '完治', '即効', '特効', '万能', '効く', '効果',
        '医薬品', '処方箋', '診断', '病名', '病気', '疾患', '症候群',
        // 効果効能の誇張
        '確実に', '必ず', '絶対', '100%', '劇的に', '驚異的', '奇跡',
        '痩せる', 'ダイエット効果', '脂肪燃焼', '減量効果',
        '精力増強', '性機能向上', 'ED改善', '媚薬',
        // 医療行為関連
        '処方', '投薬', '服用', '用法', '用量', '副作用',
        // 商品宣伝関連
        'サプリメント名', '製薬会社名', 'ブランド名', '商品名',
        // 重大疾患関連
        '癌', 'がん', '腫瘍', '重病', '死', '致命的',
        // その他誇張表現
        '革命的', '画期的', '世界初', '業界初', '特許'
    ];

    // 禁止ワードチェック関数
    function checkProhibitedWords(text) {
        const foundWords = [];
        prohibitedWords.forEach(word => {
            if (text.includes(word)) {
                foundWords.push(word);
            }
        });
        return foundWords;
    }

    // 出力フィルタリング関数
    function filterProhibitedContent(text) {
        let filteredText = text;
        
        prohibitedWords.forEach(word => {
            const regex = new RegExp(word, 'gi');
            filteredText = filteredText.replace(regex, '***');
        });
        
        return filteredText;
    }

    // システムプロンプト（東洋医学・漢方の観点を含む）
    const systemPrompt = `あなたは栄養学と東洋医学（漢方・中医学）の知識を持つ健康アドバイザーです。
ユーザーの体調症状から、不足している可能性のある栄養素やビタミンを分析し、適切な食材を提案してください。

【重要な制約事項】
1. 医療診断や治療に関する発言は絶対に避ける
2. 薬事法に抵触する表現（治る、効く、確実など）を使わない
3. 商品名、メーカー名、ブランド名は一切出さない
4. 効果効能を誇張する表現は使わない
5. あくまで一般的な栄養学的・食事指導の範囲に留める
6. 発熱、激しい痛み、急性症状については何もアドバイスしない

【分析の観点】
- 現代栄養学に基づく栄養素分析
- 東洋医学の「気・血・水」「五臓六腑」の考え方
- 漢方の「証」（体質・症状パターン）の概念
- 食材の性質（温・涼・平、五味など）

【回答形式】
【体調の分析】
- 東洋医学的観点から見た体調パターン
- 気血水のバランス状態

【不足の可能性がある栄養素】
- 栄養素名：理由と一般的な働き

【おすすめの食材】
- 食材名：含まれる栄養素と期待される一般的な働き
- 東洋医学的性質も考慮した食材選択

【生活習慣のアドバイス】
- 食事のタイミングや調理法
- 一般的な生活習慣の提案

※注意：これは一般的な栄養学的・食事指導の情報です。体調不良が続く場合は医療機関を受診してください。`;

    // 分析実行関数
    async function analyzeSymptoms() {
        const apiKey = document.getElementById('apiKey').value;
        if (!apiKey) {
            alert('OpenAI APIキーを入力してください');
            return;
        }

        // 選択された症状を取得
        const selectedItems = document.querySelectorAll('.symptom-item.selected');
        if (selectedItems.length === 0) {
            alert('少なくとも1つの症状を選択してください');
            return;
        }

        const symptoms = Array.from(selectedItems).map(item => item.getAttribute('data-value'));
        const symptomText = symptoms.join('、');

        // UI更新
        const analyzeButton = document.querySelector('.analyze-button');
        const loadingDiv = document.querySelector('.loading');
        const resultContainer = document.querySelector('.result-container');
        const resultContent = document.querySelector('.result-content');

        analyzeButton.disabled = true;
        loadingDiv.style.display = 'block';
        resultContainer.style.display = 'none';

        try {
            // OpenAI API呼び出し
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { 
                            role: 'user', 
                            content: `以下の体調症状があります：${symptomText}\n\n東洋医学と現代栄養学の観点から、これらの症状から考えられる栄養素の不足と、おすすめの食材を教えてください。薬事法に注意して、一般的な栄養学的アドバイスの範囲でお答えください。` 
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 1500
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`API Error: ${errorData.error?.message || 'Unknown error'}`);
            }

            const data = await response.json();
            let result = data.choices[0].message.content;

            // 禁止ワードチェック
            const foundProhibitedWords = checkProhibitedWords(result);
            if (foundProhibitedWords.length > 0) {
                console.warn('禁止ワードが検出されました:', foundProhibitedWords);
                
                // 禁止ワードをフィルタリング
                result = filterProhibitedContent(result);
                
                // 警告メッセージを追加
                result += '\n\n※ 一部の表現が適切な表現に変更されています。';
            }

            // 体調に関わらない質問への対応チェック
            if (!containsHealthRelatedContent(symptomText, result)) {
                result = '申し訳ございませんが、体調や栄養に関わらない内容については回答できません。体調の症状を選択してご利用ください。';
            }

            // 結果表示
            resultContent.textContent = result;
            resultContainer.style.display = 'block';

            // 結果を保存（localStorage）
            saveAnalysisResult(symptoms, result);

            // 結果をログに記録（モニタリング用）
            logAnalysisResult(symptoms, result, foundProhibitedWords);

        } catch (error) {
            console.error('分析エラー:', error);
            
            let errorTitle = 'エラーが発生しました';
            let errorMessage = '分析中に問題が発生しました。';
            let suggestions = [];

            if (error.message.includes('API Key') || error.message.includes('Unauthorized')) {
                errorTitle = 'APIキーエラー';
                errorMessage = 'OpenAI APIキーが無効または未設定です。';
                suggestions = [
                    '✓ 有効なOpenAI APIキーを入力してください',
                    '✓ APIキーに課金設定がされているか確認してください',
                    '✓ APIキーの権限設定を確認してください'
                ];
            } else if (error.message.includes('quota') || error.message.includes('insufficient_quota')) {
                errorTitle = 'API利用制限';
                errorMessage = 'APIの利用制限に達しています。';
                suggestions = [
                    '✓ OpenAIアカウントの課金状況を確認してください',
                    '✓ 時間をおいて再度お試しください',
                    '✓ API使用量の上限設定を確認してください'
                ];
            } else if (error.message.includes('rate limit')) {
                errorTitle = 'リクエスト制限';
                errorMessage = 'リクエストが多すぎます。';
                suggestions = [
                    '✓ 1-2分お待ちください',
                    '✓ 連続での分析は控えてください'
                ];
            } else if (!navigator.onLine) {
                errorTitle = 'ネットワークエラー';
                errorMessage = 'インターネット接続を確認してください。';
                suggestions = [
                    '✓ WiFi・モバイル通信の接続状況を確認',
                    '✓ ページを再読み込みしてください'
                ];
            }
            
            showErrorModal(errorTitle, errorMessage, suggestions);
        } finally {
            analyzeButton.disabled = false;
            loadingDiv.style.display = 'none';
        }
    }

    // 健康関連コンテンツかどうかをチェック
    function containsHealthRelatedContent(symptoms, result) {
        // 体調症状が選択されている場合は健康関連とみなす
        if (symptoms && symptoms.trim().length > 0) {
            return true;
        }
        
        // 結果に健康・栄養関連のキーワードが含まれているかチェック
        const healthKeywords = ['栄養', 'ビタミン', 'ミネラル', '食材', '体調', '健康', '食事'];
        return healthKeywords.some(keyword => result.includes(keyword));
    }

    // 分析結果の保存機能
    function saveAnalysisResult(symptoms, result) {
        try {
            const analysisData = {
                timestamp: new Date().toISOString(),
                symptoms: symptoms,
                result: result,
                id: Date.now() // 簡易的なID
            };
            
            // 既存の履歴を取得
            let analysisHistory = JSON.parse(localStorage.getItem('analysis_history') || '[]');
            
            // 新しい結果を追加（最新10件まで保持）
            analysisHistory.unshift(analysisData);
            if (analysisHistory.length > 10) {
                analysisHistory = analysisHistory.slice(0, 10);
            }
            
            // 保存
            localStorage.setItem('analysis_history', JSON.stringify(analysisHistory));
            localStorage.setItem('latest_analysis', JSON.stringify(analysisData));
            
            // 保存成功の通知（控えめに）
            showSaveNotification();
            
        } catch (error) {
            console.warn('結果保存エラー:', error);
            // 保存エラーは致命的ではないため、ユーザーには表示しない
        }
    }

    // 保存成功の控えめな通知
    function showSaveNotification() {
        const notification = document.createElement('div');
        notification.textContent = '結果を保存しました';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4caf50;
            color: white;
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 0.85rem;
            z-index: 1001;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // フェードイン
        setTimeout(() => {
            notification.style.opacity = '1';
        }, 100);
        
        // フェードアウトして削除
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 2000);
    }

    // 分析結果のログ記録（モニタリング用）
    function logAnalysisResult(symptoms, result, prohibitedWords) {
        const logData = {
            timestamp: new Date().toISOString(),
            symptoms: symptoms,
            resultLength: result.length,
            prohibitedWordsFound: prohibitedWords,
            userAgent: navigator.userAgent
        };
        
        console.log('分析結果ログ:', logData);
        
        // 実際の実装では、サーバーサイドのログシステムに送信することを推奨
        // fetch('/api/log-analysis', { method: 'POST', body: JSON.stringify(logData) });
    }

    // エンターキーでの誤送信を防ぐ
    document.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') {
            e.preventDefault();
        }
    });

    // APIキー入力フィールドでのエンターキー処理
    const apiKeyInput = document.getElementById('apiKey');
    if (apiKeyInput) {
        apiKeyInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                analyzeSymptoms();
            }
        });
    }

    // 分析ボタンのイベントリスナーを設定
    const analyzeButton = document.querySelector('.analyze-button');
    if (analyzeButton) {
        analyzeButton.addEventListener('click', analyzeSymptoms);
    }

    // 症状選択ボタンのイベントリスナーを設定
    const symptomItems = document.querySelectorAll('.symptom-item');
    symptomItems.forEach(item => {
        // クリックイベント
        item.addEventListener('click', function() {
            toggleSymptomSelection(this);
        });
        
        // キーボードイベント（Enter、Space）
        item.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleSymptomSelection(this);
            }
        });
    });

    // 症状選択状態をトグルする関数
    function toggleSymptomSelection(element) {
        // 選択状態をトグル
        element.classList.toggle('selected');
        
        // アクセシビリティ属性の更新
        const isSelected = element.classList.contains('selected');
        element.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
        
        // 選択状態をユーザーに音声で通知（スクリーンリーダー用）
        const symptomName = element.getAttribute('data-value');
        const action = isSelected ? '選択されました' : '選択解除されました';
        
        // アクセシブルな状態通知（aria-live）
        announceSelection(symptomName, action);
    }

    // 選択状態の音声通知
    function announceSelection(symptomName, action) {
        // 動的にaria-live領域を作成・更新
        let announcer = document.getElementById('selection-announcer');
        if (!announcer) {
            announcer = document.createElement('div');
            announcer.id = 'selection-announcer';
            announcer.setAttribute('aria-live', 'polite');
            announcer.setAttribute('aria-atomic', 'true');
            announcer.style.position = 'absolute';
            announcer.style.left = '-10000px';
            announcer.style.width = '1px';
            announcer.style.height = '1px';
            announcer.style.overflow = 'hidden';
            document.body.appendChild(announcer);
        }
        
        announcer.textContent = `${symptomName}が${action}`;
        
        // 1秒後にクリア（連続選択時の混乱を避ける）
        setTimeout(() => {
            announcer.textContent = '';
        }, 1000);
    }

    // エラーモーダル表示関数
    function showErrorModal(title, message, suggestions) {
        // 既存のモーダルがあれば削除
        const existingModal = document.getElementById('error-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // モーダル要素を作成
        const modal = document.createElement('div');
        modal.id = 'error-modal';
        modal.innerHTML = `
            <div class="modal-backdrop">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 class="modal-title">${title}</h3>
                        <button class="modal-close" onclick="closeErrorModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p class="error-message">${message}</p>
                        ${suggestions.length > 0 ? `
                            <div class="error-suggestions">
                                <h4>解決方法:</h4>
                                <ul>
                                    ${suggestions.map(s => `<li>${s}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                    </div>
                    <div class="modal-footer">
                        <button class="modal-button" onclick="closeErrorModal()">閉じる</button>
                    </div>
                </div>
            </div>
        `;

        // スタイルを動的に追加
        const style = document.createElement('style');
        style.textContent = `
            .modal-backdrop {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
                padding: 20px;
                box-sizing: border-box;
            }
            .modal-content {
                background: white;
                border-radius: 12px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                max-width: 500px;
                width: 100%;
                max-height: 80vh;
                overflow-y: auto;
            }
            .modal-header {
                padding: 20px;
                border-bottom: 1px solid #eee;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .modal-title {
                margin: 0;
                color: #e74c3c;
                font-size: 1.2rem;
            }
            .modal-close {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #999;
                padding: 0;
                width: 30px;
                height: 30px;
            }
            .modal-body {
                padding: 20px;
            }
            .error-message {
                margin: 0 0 15px 0;
                color: #333;
                font-size: 1rem;
                line-height: 1.5;
            }
            .error-suggestions {
                margin-top: 15px;
            }
            .error-suggestions h4 {
                margin: 0 0 10px 0;
                color: #2c3e50;
                font-size: 0.95rem;
            }
            .error-suggestions ul {
                margin: 0;
                padding-left: 20px;
            }
            .error-suggestions li {
                margin: 8px 0;
                color: #555;
                line-height: 1.4;
            }
            .modal-footer {
                padding: 15px 20px;
                border-top: 1px solid #eee;
                text-align: right;
            }
            .modal-button {
                background: #3498db;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 0.9rem;
            }
            .modal-button:hover {
                background: #2980b9;
            }
            @media (max-width: 480px) {
                .modal-backdrop {
                    padding: 10px;
                }
                .modal-content {
                    max-height: 90vh;
                }
                .modal-header, .modal-body, .modal-footer {
                    padding: 15px;
                }
            }
        `;
        modal.appendChild(style);
        
        document.body.appendChild(modal);
        
        // 背景クリックで閉じる
        modal.querySelector('.modal-backdrop').addEventListener('click', function(e) {
            if (e.target === this) {
                closeErrorModal();
            }
        });
    }

    // エラーモーダルを閉じる関数
    function closeErrorModal() {
        const modal = document.getElementById('error-modal');
        if (modal) {
            modal.remove();
        }
    }

    // グローバル関数として公開
    window.analyzeSymptoms = analyzeSymptoms;
    window.closeErrorModal = closeErrorModal;
});