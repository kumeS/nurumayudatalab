/**
 * なぜを4回問い続ける - 深層心理探求システム
 * LLMを活用した動的質問生成による自己探求ツール
 */

document.addEventListener('DOMContentLoaded', () => {
    // グローバル変数
    let currentTheme = '';
    let questionLevel = 0;
    let conversationHistory = [];
    let customTheme = '';
    let isLLMMode = true; // LLM活用モード

    // DOM要素の取得
    const themeSelection = document.getElementById('themeSelection');
    const questionSection = document.getElementById('questionSection');
    const completionSection = document.getElementById('completionSection');
    const conversationHistory_el = document.getElementById('conversationHistory');
    const currentQuestion_el = document.getElementById('currentQuestion');
    const questionLevel_el = document.getElementById('questionLevel');
    const answerInput = document.getElementById('answerInput');
    const submitButton = document.getElementById('submitButton');
    const insightContent = document.getElementById('insightContent');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');

    // API設定
    const API_URL = 'https://nurumayu-worker.skume-bioinfo.workers.dev/';
    const MODEL_NAME = "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8";

    // 深層心理探求テーマ
    const advancedThemes = {
        'existential': {
            title: '存在の意味',
            description: 'なぜあなたは存在しているのか、その根源的意味を探ります',
            initialPrompt: 'あなたが生きている理由や存在する意味について、まず思い浮かぶことを教えてください。'
        },
        'identity': {
            title: '自己同一性',
            description: 'あなたが「あなた」である理由、アイデンティティの核心を見つめます',
            initialPrompt: 'あなたを「あなた」たらしめているものは何だと思いますか？'
        },
        'values': {
            title: '価値観の起源',
            description: 'あなたの価値観がどのように形成されたか、その深層を探ります',
            initialPrompt: 'あなたが最も大切にしている価値観は何ですか？'
        },
        'fears': {
            title: '恐れと不安',
            description: 'あなたが抱く恐れや不安の根本的な原因を探求します',
            initialPrompt: 'あなたが最も恐れていることは何ですか？'
        },
        'desires': {
            title: '欲望と願望',
            description: 'あなたの欲望や願望の本質的な動機を見つめます',
            initialPrompt: 'あなたが心から望んでいることは何ですか？'
        },
        'relationships': {
            title: '人間関係の根源',
            description: 'なぜあなたが他者との関係を求めるのか、その本質を探ります',
            initialPrompt: 'なぜあなたは他の人とのつながりを求めるのでしょうか？'
        },
        'purpose': {
            title: '人生の目的',
            description: 'あなたの人生における真の目的や使命を探求します',
            initialPrompt: 'あなたの人生の目的は何だと思いますか？'
        },
        'suffering': {
            title: '苦悩の意味',
            description: 'なぜ苦しみが存在するのか、その意味を探ります',
            initialPrompt: 'あなたにとって苦しみとは何ですか？なぜ苦しみがあると思いますか？'
        },
        'free_inquiry': {
            title: '自由探求',
            description: 'あなたが深く探求したい任意のテーマを設定できます',
            initialPrompt: null // カスタム入力
        }
    };

    // レベルごとの説明
    const levelDescriptions = [
        "第1の問い - 表面的な理由",
        "第2の問い - 個人的な動機", 
        "第3の問い - 深層の信念",
        "第4の問い - 存在の根源"
    ];

    // 初期化
    init();

    function init() {
        setupThemeButtons();
        setupEventListeners();
        createNotificationContainer();
    }

    // 通知コンテナを作成
    function createNotificationContainer() {
        const container = document.createElement('div');
        container.id = 'notificationContainer';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            pointer-events: none;
        `;
        document.body.appendChild(container);
    }

    // 通知表示機能
    function showNotification(message, type = 'info', duration = 4000) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            background: ${getNotificationColor(type)};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            margin-bottom: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            pointer-events: auto;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
            font-size: 14px;
            max-width: 300px;
            word-wrap: break-word;
        `;
        notification.textContent = message;

        const container = document.getElementById('notificationContainer');
        container.appendChild(notification);

        // アニメーション表示
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 10);

        // 自動削除
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, duration);
    }

    // 通知の色を取得
    function getNotificationColor(type) {
        const colors = {
            'info': '#70a0ff',
            'success': '#27ae60',
            'warning': '#f39c12',
            'error': '#e74c3c'
        };
        return colors[type] || colors.info;
    }

    // テーマボタンの設定
    function setupThemeButtons() {
        const themeButtonsContainer = document.querySelector('.theme-buttons');
        if (!themeButtonsContainer) return;

        themeButtonsContainer.innerHTML = '';
        
        Object.entries(advancedThemes).forEach(([key, theme]) => {
            const button = document.createElement('button');
            button.className = 'theme-button';
            button.onclick = () => startQuestioning(key);
            
            button.innerHTML = `
                <h3>${theme.title}</h3>
                <p>${theme.description}</p>
            `;
            
            themeButtonsContainer.appendChild(button);
        });
    }

    // イベントリスナーの設定
    function setupEventListeners() {
        // Enterキーで送信
        if (answerInput) {
            answerInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    submitAnswer();
                }
            });
        }

        // 送信ボタン
        if (submitButton) {
            submitButton.onclick = submitAnswer;
        }

        // リスタートボタン
        const restartButton = document.getElementById('restartButton');
        if (restartButton) {
            restartButton.onclick = restart;
        }
    }

    // 質問セッション開始
    async function startQuestioning(theme) {
        currentTheme = theme;
        questionLevel = 0;
        conversationHistory = [];
        
        if (theme === 'free_inquiry') {
            customTheme = prompt('探求したいテーマや質問を入力してください：\n例：「なぜ私は愛されたいと思うのか」「なぜ私は成功を恐れるのか」');
            if (!customTheme || customTheme.trim() === '') {
                showNotification('テーマが入力されませんでした。', 'warning');
                return;
            }
            if (customTheme.length < 5) {
                showNotification('テーマをもう少し詳しく入力してください。', 'warning');
                return;
            }
        }
        
        // UI切り替え
        if (themeSelection) themeSelection.style.display = 'none';
        if (questionSection) {
            questionSection.style.display = 'block';
            questionSection.classList.add('active');
        }
        
        // 最初の質問を生成
        await generateFirstQuestion();
    }

    // 最初の質問を生成
    async function generateFirstQuestion() {
        const theme = advancedThemes[currentTheme];
        let questionText;

        if (currentTheme === 'free_inquiry') {
            questionText = customTheme;
        } else {
            questionText = theme.initialPrompt;
        }

        displayQuestion(questionText);
    }

    // プログレスインジケータ更新
    function updateProgress() {
        const currentStep = questionLevel + 1;
        const totalSteps = 4;
        const percentage = (currentStep / totalSteps) * 100;
        
        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }
        if (progressText) {
            progressText.textContent = `質問 ${currentStep}/4`;
        }
    }

    // 質問を表示
    function displayQuestion(questionText) {
        if (currentQuestion_el) {
            currentQuestion_el.textContent = questionText;
        }
        if (questionLevel_el) {
            questionLevel_el.textContent = levelDescriptions[questionLevel];
        }
        if (answerInput) {
            answerInput.value = '';
            answerInput.focus();
        }
        
        // プログレス更新
        updateProgress();
    }

    // 回答送信
    async function submitAnswer() {
        if (!answerInput) return;
        
        const answer = answerInput.value.trim();
        
        if (!answer) {
            showNotification('回答を入力してください。', 'warning');
            answerInput.focus();
            return;
        }

        // 送信ボタンを無効化とローディング表示
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = '処理中...';
        }
        if (loadingIndicator && questionLevel < 3) {
            loadingIndicator.classList.add('active');
        }

        try {
            // 回答を履歴に追加
            const questionText = currentQuestion_el ? currentQuestion_el.textContent : '';
            conversationHistory.push({
                question: questionText,
                answer: answer,
                level: questionLevel
            });

            // 履歴を表示
            updateConversationHistory();

            // 次のレベルへ
            questionLevel++;

            if (questionLevel >= 4) {
                // 4回の質問が完了 - 深層分析を実行
                showNotification('探求完了！深層心理分析を生成中...', 'success');
                await performPsychologicalAnalysis();
            } else {
                // 回答の質を評価
                const qualityCheck = await evaluateAnswerQuality(answer);
                
                if (qualityCheck.needsDeepening) {
                    // より深い探求を促す
                    await generateDeepeningQuestion(answer, qualityCheck.suggestion);
                } else {
                    // 次の質問をLLMで生成
                    await generateNextQuestion(answer);
                }
            }
        } catch (error) {
            console.error('エラーが発生しました:', error);
            
            // エラータイプに応じたメッセージ
            let errorMessage = 'エラーが発生しました。';
            if (error.message.includes('fetch')) {
                errorMessage = '接続に問題があります。インターネット接続を確認してください。';
            } else if (error.message.includes('timeout')) {
                errorMessage = '処理に時間がかかっています。しばらく待ってから再度お試しください。';
            } else if (error.message.includes('API')) {
                errorMessage = 'AIサービスに一時的な問題があります。しばらく待ってから再度お試しください。';
            }
            
            showNotification(errorMessage, 'error', 6000);
        } finally {
            // 送信ボタンを有効化とローディング非表示
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = '答える';
            }
            if (loadingIndicator) {
                loadingIndicator.classList.remove('active');
            }
        }
    }

    // 回答の質を評価
    async function evaluateAnswerQuality(answer) {
        // 簡易的な質の評価（表面的な回答かどうか）
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

    // より深い探求を促す質問を生成
    async function generateDeepeningQuestion(answer, suggestion) {
        const deepeningPrompts = [
            `「${answer}」について、もう少し詳しく聞かせてください。なぜそう感じるのでしょうか？`,
            `「${answer}」という答えの背景には、どのような体験や思いがありますか？`,
            `「${answer}」と感じるようになったきっかけや原因は何だと思いますか？`,
            `「${answer}」ということについて、さらに深く考えてみてください。本当の理由は何でしょうか？`
        ];

        const question = deepeningPrompts[Math.floor(Math.random() * deepeningPrompts.length)];
        
        // レベルを戻して再度質問
        questionLevel--;
        displayQuestion(question);
    }

    // 次の質問をLLMで生成
    async function generateNextQuestion(previousAnswer) {
        const prompt = createQuestionGenerationPrompt(previousAnswer);
        
        try {
            const response = await callLLM(prompt);
            const nextQuestion = parseQuestionFromResponse(response);
            displayQuestion(nextQuestion);
        } catch (error) {
            console.error('質問生成エラー:', error);
            // フォールバック: 固定質問を使用
            displayFallbackQuestion(previousAnswer);
        }
    }

    // 質問生成用プロンプト作成
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

        const currentLevelDescription = levelNames[questionLevel - 1] || "深層心理";

        return `あなたは深層心理を探求する専門家です。以下の会話履歴を分析し、回答者の${currentLevelDescription}に迫る鋭い質問を1つだけ生成してください。

会話履歴:
${context}

最新の回答: "${previousAnswer}"

質問生成の指針:
- 第${questionLevel + 1}レベルの質問として、より深層に迫る内容にする
- 回答者が無意識に持っている前提や価値観を問う
- 「なぜ」を基調とした問いかけにする
- 哲学的・実存的な視点を含める
- 回答者が困惑し、深く考え込むような質問にする
- 質問のみを出力し、説明や前置きは不要

質問:`;
    }

    // LLM応答から質問を抽出
    function parseQuestionFromResponse(response) {
        // "質問:" の後の部分を抽出するか、全体を質問として扱う
        const lines = response.split('\n').filter(line => line.trim());
        const questionLine = lines.find(line => line.includes('質問:')) || lines[lines.length - 1];
        
        return questionLine.replace(/^質問:\s*/, '').trim();
    }

    // フォールバック質問
    function displayFallbackQuestion(previousAnswer) {
        const fallbackQuestions = [
            `なぜ「${previousAnswer.substring(0, 30)}...」が、あなたにとって重要なのですか？`,
            `なぜあなたはそのような考えを持つようになったのですか？`,
            `なぜあなたは、そもそもそのような価値観を持っているのですか？`,
            `なぜあなたという存在がそのように感じるのですか？`
        ];

        const question = fallbackQuestions[questionLevel - 1] || fallbackQuestions[3];
        displayQuestion(question);
    }

    // 会話履歴を更新
    function updateConversationHistory() {
        if (!conversationHistory_el) return;
        
        conversationHistory_el.innerHTML = '';
        
        conversationHistory.forEach((item, index) => {
            const qaPair = document.createElement('div');
            qaPair.className = 'qa-pair';
            qaPair.style.animationDelay = `${index * 0.1}s`;
            
            qaPair.innerHTML = `
                <div class="question">${item.question}</div>
                <div class="answer">${item.answer}</div>
            `;
            
            conversationHistory_el.appendChild(qaPair);
        });
    }

    // 深層心理分析を実行
    async function performPsychologicalAnalysis() {
        const analysisPrompt = createAnalysisPrompt();
        
        try {
            const analysis = await callLLM(analysisPrompt);
            showCompletion(analysis);
        } catch (error) {
            console.error('分析エラー:', error);
            showCompletion(generateFallbackAnalysis());
        }
    }

    // 分析用プロンプト作成
    function createAnalysisPrompt() {
        const context = conversationHistory.map(item => 
            `Q${item.level + 1}: ${item.question}\nA${item.level + 1}: ${item.answer}`
        ).join('\n\n');

        return `あなたは深層心理学の専門家です。以下の4段階の質問と回答を分析し、この人の深層心理を洞察してください。

探求テーマ: ${advancedThemes[currentTheme]?.title || 'カスタムテーマ'}

会話履歴:
${context}

以下の構造で分析結果を出力してください:

## 心理的パターンの分析
この人の回答に見られる心理的傾向や無意識のパターンを指摘してください。

## 根源的動機の解明  
4つの質問を通じて明らかになった、この人の根源的な動機や価値観の起源を分析してください。

## 自己理解への洞察
この探求によって、この人が自分自身について新たに気づけることを指摘してください。

## 成長への示唆
この気づきを踏まえて、さらなる自己成長や人生の充実に向けた示唆を提供してください。

分析は共感的で建設的な視点から行い、批判的ではなく理解促進を重視してください。`;
    }

    // フォールバック分析
    function generateFallbackAnalysis() {
        return `## 心理的パターンの分析
あなたの回答からは、自己への深い洞察を求める姿勢が感じられます。

## 根源的動機の解明
4つの質問を通じて、あなたの価値観や行動の根底にある動機が明らかになりました。

## 自己理解への洞察
この探求により、普段意識していない自分自身の側面に気づくことができました。

## 成長への示唆
この気づきを大切にし、さらなる自己理解を深めることで、より充実した人生を歩むことができるでしょう。`;
    }

    // 完了画面を表示
    function showCompletion(analysis) {
        if (questionSection) {
            questionSection.style.display = 'none';
            questionSection.classList.remove('active');
        }
        if (completionSection) {
            completionSection.style.display = 'block';
            completionSection.classList.add('active');
        }
        
        generateInsight(analysis);
    }

    // 洞察を生成・表示
    function generateInsight(analysis) {
        if (!insightContent) return;
        
        let insight = '<h3>あなたの探求の軌跡</h3>';
        insight += '<div class="response-journey">';
        
        conversationHistory.forEach((item, index) => {
            const levelName = levelDescriptions[index].split(' - ')[1];
            insight += `
                <div class="journey-item">
                    <h4>${levelName}</h4>
                    <p class="journey-question">${item.question}</p>
                    <p class="journey-answer">"${item.answer}"</p>
                </div>
            `;
        });
        
        insight += '</div>';
        
        // LLM分析結果を追加
        insight += '<div class="psychological-analysis">';
        insight += '<h3>深層心理分析</h3>';
        insight += analysis.replace(/\n/g, '<br>').replace(/##\s*/g, '<h4>').replace(/<h4>/g, '</p><h4>').replace(/^<\/p>/, '');
        insight += '</div>';
        
        insightContent.innerHTML = insight;
    }

    // LLM API呼び出し
    async function callLLM(prompt) {
        const requestData = {
            model: MODEL_NAME,
            temperature: 0.8,
            stream: false,
            max_completion_tokens: 1000,
            messages: [
                { role: "system", content: "あなたは深層心理学の専門家として、人々の自己理解を深める手助けをします。共感的で洞察に富んだ質問や分析を提供してください。" },
                { role: "user", content: prompt }
            ]
        };

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.choices && data.choices.length > 0 && data.choices[0].message) {
            return data.choices[0].message.content;
        } else if (data.answer) {
            return data.answer;
        } else {
            throw new Error('Unexpected API response format');
        }
    }

    // リスタート
    function restart() {
        if (completionSection) {
            completionSection.style.display = 'none';
            completionSection.classList.remove('active');
        }
        if (questionSection) {
            questionSection.style.display = 'none';
            questionSection.classList.remove('active');
        }
        if (themeSelection) {
            themeSelection.style.display = 'block';
        }
        
        // 変数をリセット
        currentTheme = '';
        questionLevel = 0;
        conversationHistory = [];
        customTheme = '';
        
        // 履歴をクリア
        if (conversationHistory_el) {
            conversationHistory_el.innerHTML = '';
        }
        if (insightContent) {
            insightContent.innerHTML = '';
        }
        
        // プログレスをリセット
        if (progressFill) {
            progressFill.style.width = '0%';
        }
        if (progressText) {
            progressText.textContent = '質問 1/4';
        }
    }

    // グローバル関数として露出（HTMLから呼び出し用）
    window.startQuestioning = startQuestioning;
    window.submitAnswer = submitAnswer;
    window.restart = restart;
});