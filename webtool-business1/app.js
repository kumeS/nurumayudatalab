/**
 * ビジネス起業体験＆意思決定シミュレーション JavaScript
 * LLMを活用した起業体験システム
 */

// ゲーム状態管理
const gameState = {
    currentStage: 1,
    maxStages: 5,
    decisions: {},
    companyProfile: {
        name: '',
        industry: '',
        funding: '',
        strategy: '',
        crisis: '',
        growth: ''
    },
    generatedVisuals: {}
};

// LLM API設定
const API_CONFIG = {
    endpoint: 'https://api.openai.com/v1/chat/completions',
    // APIキーは環境変数またはユーザー入力から取得
    apiKey: localStorage.getItem('openai_api_key') || ''
};

// 各選択肢のフィードバックデータ
const feedbackData = {
    1: { // 起業アイデア
        tech: {
            success: ['最新技術トレンドの把握', '優秀なエンジニアの確保', '継続的なイノベーション'],
            danger: ['技術偏重による顧客ニーズ軽視', '競合との差別化不足', '開発コストの肥大化'],
            industry: 'テクノロジー・AI'
        },
        health: {
            success: ['医療従事者との連携', '規制対応の専門知識', '社会的使命感の共有'],
            danger: ['薬事法違反リスク', '開発期間の長期化', '医療事故への対応不備'],
            industry: 'ヘルスケア・医療'
        },
        eco: {
            success: ['SDGs目標との整合性', 'ESG投資家へのアピール', '地域社会との協働'],
            danger: ['収益化の遅れ', 'グリーンウォッシング批判', '技術的実現性の甘さ'],
            industry: '環境・サステナビリティ'
        },
        edu: {
            success: ['教育現場のニーズ把握', 'エビデンスベースの効果測定', '継続的な学習体験'],
            danger: ['教育格差の助長', 'プライバシー保護不足', '教育効果の過大評価'],
            industry: '教育・人材開発'
        }
    },
    2: { // 資金調達
        self: {
            success: ['経営の自由度確保', 'リーンスタートアップ実践', '着実な財務管理'],
            danger: ['個人破産リスク', '成長速度の制限', '資金ショートの危険'],
            type: '自己資金・借入'
        },
        vc: {
            success: ['メンターシップ活用', 'ネットワーク拡大', '成長戦略の明確化'],
            danger: ['経営権の希薄化', 'エグジット圧力', '短期成果へのプレッシャー'],
            type: 'ベンチャーキャピタル'
        },
        crowd: {
            success: ['コミュニティ形成', 'マーケティング効果', '支援者の声の活用'],
            danger: ['実行責任の重さ', '期待値管理の失敗', 'リターン設計の甘さ'],
            type: 'クラウドファンディング'
        },
        grant: {
            success: ['公的信用の獲得', '返済不要の安心感', '社会的意義の明確化'],
            danger: ['申請書類の負担', '使途制限への対応', '継続性の欠如'],
            type: '補助金・助成金'
        }
    },
    3: { // 経営判断
        talent: {
            success: ['イノベーション創出力', 'チーム文化の醸成', '知的財産の蓄積'],
            danger: ['人件費の高騰', '組織の硬直化', 'スター依存症'],
            strategy: '優秀人材の獲得重視'
        },
        speed: {
            success: ['市場フィードバック活用', 'アジャイル開発', '先行者利益'],
            danger: ['品質問題の発生', 'ブランド毀損', '技術的負債の蓄積'],
            strategy: 'スピード重視の開発'
        },
        quality: {
            success: ['顧客ロイヤリティ', 'プレミアム価格設定', '口コミ効果'],
            danger: ['市場投入の遅れ', '完璧主義の罠', '高コスト体質'],
            strategy: '品質・ブランド重視'
        },
        partner: {
            success: ['リソース補完', '信用力向上', '市場アクセス'],
            danger: ['依存体質', '利益配分の対立', '自主性の喪失'],
            strategy: '戦略的提携重視'
        }
    },
    4: { // 危機管理
        transparent: {
            success: ['信頼回復', 'ステークホルダー支持', '組織学習'],
            danger: ['一時的な評判低下', '訴訟リスク', '過度な情報開示'],
            approach: '透明性重視の対応'
        },
        pivot: {
            success: ['新市場開拓', '組織活性化', '危機の機会転換'],
            danger: ['既存顧客の離反', '方向性の混乱', 'リソース浪費'],
            approach: '事業ピボット'
        },
        cost: {
            success: ['キャッシュフロー改善', '筋肉質な組織', '生存確率向上'],
            danger: ['優秀人材の流出', 'イノベーション停滞', '市場シェア低下'],
            approach: 'コスト削減で耐える'
        },
        support: {
            success: ['資金確保', '経営知見獲得', 'ネットワーク強化'],
            danger: ['交渉力低下', '不利な条件受入', '自立性喪失'],
            approach: '外部支援を求める'
        }
    },
    5: { // 成長フェーズ
        expand: {
            success: ['市場リーダーシップ', '規模の経済', 'イノベーション継続'],
            danger: ['オーバーエクステンション', '品質管理困難', '組織文化希薄化'],
            direction: '積極的な事業拡大'
        },
        stable: {
            success: ['持続可能な成長', '強固な基盤', '従業員満足度'],
            danger: ['成長機会の逸失', '競合の追い上げ', 'イノベーション不足'],
            direction: '堅実な成長路線'
        },
        global: {
            success: ['巨大市場アクセス', 'ブランド価値向上', 'リスク分散'],
            danger: ['文化的衝突', '規制対応複雑化', '管理コスト増大'],
            direction: '海外展開'
        },
        social: {
            success: ['社会的インパクト', 'ミレニアル世代支持', 'ESG評価向上'],
            danger: ['収益性の課題', '株主との対立', 'ミッションドリフト'],
            direction: '社会貢献重視'
        }
    }
};

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    initializeGame();
    setupAPIKeyInput();
    setupAccessibility();
    setupTouchHandling();
});

function initializeGame() {
    updateProgressBar();
    showStage(1);
}

function setupAPIKeyInput() {
    // 起動時にAPIキーの状態をチェック
    updateAPIKeyStatus();
    
    // APIキーが設定されていない場合、モーダルを表示
    if (!API_CONFIG.apiKey) {
        setTimeout(() => {
            showAPIKeyModal();
        }, 1000); // 1秒後に表示して、UIロード完了を待つ
    }
}

// APIキーモーダルの表示/非表示
function toggleAPIKeyModal() {
    const modal = document.getElementById('api-key-modal');
    const isActive = modal.classList.contains('active');
    
    if (isActive) {
        hideAPIKeyModal();
    } else {
        showAPIKeyModal();
    }
}

function showAPIKeyModal() {
    const modal = document.getElementById('api-key-modal');
    const input = document.getElementById('api-key-input');
    
    modal.classList.add('active');
    
    // 既存のAPIキーがある場合は表示（セキュリティのため最初の4文字のみ）
    if (API_CONFIG.apiKey) {
        input.value = API_CONFIG.apiKey.substring(0, 4) + '...';
        input.placeholder = 'APIキーを変更する場合は新しいキーを入力';
    } else {
        input.value = '';
        input.placeholder = 'sk-で始まるOpenAI APIキーを入力してください';
    }
    
    // フォーカスを当てる
    setTimeout(() => {
        input.focus();
    }, 300);
    
    updateAPIKeyStatus();
}

function hideAPIKeyModal() {
    const modal = document.getElementById('api-key-modal');
    modal.classList.remove('active');
}

// APIキーを保存
function saveAPIKey() {
    const input = document.getElementById('api-key-input');
    const newApiKey = input.value.trim();
    
    if (!newApiKey) {
        showErrorMessage('APIキーを入力してください');
        return;
    }
    
    // 基本的なバリデーション
    if (!newApiKey.startsWith('sk-') || newApiKey.length < 20) {
        showErrorMessage('正しいAPIキー形式ではありません（sk-で始まる必要があります）');
        return;
    }
    
    // APIキーを保存
    API_CONFIG.apiKey = newApiKey;
    localStorage.setItem('openai_api_key', newApiKey);
    
    // UIを更新
    updateAPIKeyStatus();
    hideAPIKeyModal();
    
    // 成功メッセージ
    showSuccessMessage('APIキーが保存されました');
    
    // テストAPIコール（オプション）
    testAPIConnection();
}

// APIキーの状態を更新
function updateAPIKeyStatus() {
    const statusElement = document.getElementById('api-key-status');
    const indicatorElement = document.getElementById('status-indicator');
    
    if (!statusElement || !indicatorElement) return;
    
    if (API_CONFIG.apiKey) {
        statusElement.textContent = 'API接続済み';
        statusElement.className = 'api-key-status connected';
        indicatorElement.className = 'status-indicator connected';
    } else {
        statusElement.textContent = 'APIキー未設定';
        statusElement.className = 'api-key-status disconnected';
        indicatorElement.className = 'status-indicator disconnected';
    }
}

// APIキー接続テスト
async function testAPIConnection() {
    if (!API_CONFIG.apiKey) return;
    
    try {
        const response = await fetch(API_CONFIG.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_CONFIG.apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [{
                    role: 'user',
                    content: 'Test connection'
                }],
                max_tokens: 10
            })
        });
        
        if (response.ok) {
            showSuccessMessage('API接続テスト成功');
            updateAPIKeyStatus();
        } else {
            throw new Error(`API Test Failed: ${response.status}`);
        }
    } catch (error) {
        console.error('API Connection Test Error:', error);
        showErrorMessage('API接続テストに失敗しました。APIキーを確認してください。');
    }
}

// ユーザー向けメッセージ表示
function showSuccessMessage(message) {
    showNotification(message, 'success');
}

function showErrorMessage(message) {
    showNotification(message, 'error');
}

function showNotification(message, type) {
    // 既存の通知を削除
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // 新しい通知を作成
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // スタイルを設定
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'success' ? '#d4edda' : '#f8d7da'};
        color: ${type === 'success' ? '#155724' : '#721c24'};
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1001;
        animation: slideDown 0.3s ease;
        max-width: 90%;
        text-align: center;
    `;
    
    document.body.appendChild(notification);
    
    // 3秒後に自動削除
    setTimeout(() => {
        notification.style.animation = 'slideUp 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, 3000);
}

// 選択肢クリック時の処理
function makeChoice(stage, choice) {
    try {
        gameState.decisions[stage] = choice;
        
        // 会社プロフィールの更新
        updateCompanyProfile(stage, choice);
        
        // ビジュアル生成
        generateVisuals(stage, choice);
        
        // フィードバック表示
        displayFeedback(stage, choice);
        
        // LLMによる追加インサイト生成（非同期・エラーハンドリング付き）
        generateLLMInsights(stage, choice).catch(error => {
            console.error('LLM インサイト生成エラー（フォールバック使用）:', error);
            // フォールバック: 基本的なアドバイスを表示
            displayFallbackInsights(stage, choice);
        });
        
        // 次のステージへ
        setTimeout(() => {
            if (stage < gameState.maxStages) {
                nextStage();
            } else {
                showSummary();
            }
        }, 3000);
        
    } catch (error) {
        console.error('Choice processing error:', error);
        showErrorMessage('選択の処理中にエラーが発生しました。もう一度お試しください。');
    }
}

function updateCompanyProfile(stage, choice) {
    const data = feedbackData[stage][choice];
    
    switch(stage) {
        case 1:
            gameState.companyProfile.industry = data.industry;
            break;
        case 2:
            gameState.companyProfile.funding = data.type;
            break;
        case 3:
            gameState.companyProfile.strategy = data.strategy;
            break;
        case 4:
            gameState.companyProfile.crisis = data.approach;
            break;
        case 5:
            gameState.companyProfile.growth = data.direction;
            break;
    }
}

// ビジュアル生成
function generateVisuals(stage, choice) {
    const container = document.getElementById(`stage${stage}-visuals`);
    if (!container) return;
    
    container.innerHTML = '<div style="text-align: center; padding: 20px;">ビジュアルを生成中...</div>';
    
    setTimeout(() => {
        container.innerHTML = '';
        
        // ロゴ生成
        const logoBox = createVisualBox('会社ロゴ', 'logo');
        container.appendChild(logoBox);
        drawLogo(logoBox.querySelector('canvas'), choice);
        
        // オフィス生成
        const officeBox = createVisualBox('オフィス風景', 'office');
        container.appendChild(officeBox);
        drawOffice(officeBox.querySelector('canvas'), choice);
        
        // チーム生成
        const teamBox = createVisualBox('チーム', 'team');
        container.appendChild(teamBox);
        drawTeam(teamBox.querySelector('canvas'), choice);
    }, 1000);
}

function createVisualBox(title, type) {
    const box = document.createElement('div');
    box.className = 'visual-box';
    box.innerHTML = `
        <h4>${title}</h4>
        <canvas class="visual-canvas" width="200" height="150"></canvas>
        <p style="font-size: 12px; color: #666; margin-top: 10px;">AI生成ビジュアル</p>
    `;
    return box;
}

// キャンバス描画関数
function drawLogo(canvas, choice) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 選択に応じたロゴデザイン
    switch(choice) {
        case 'tech':
            drawTechLogo(ctx);
            break;
        case 'health':
            drawHealthLogo(ctx);
            break;
        case 'eco':
            drawEcoLogo(ctx);
            break;
        case 'edu':
            drawEduLogo(ctx);
            break;
        default:
            drawDefaultLogo(ctx, choice);
    }
}

function drawTechLogo(ctx) {
    ctx.fillStyle = '#667eea';
    ctx.beginPath();
    ctx.moveTo(100, 30);
    ctx.lineTo(130, 90);
    ctx.lineTo(70, 90);
    ctx.closePath();
    ctx.fill();
    
    ctx.fillStyle = '#764ba2';
    ctx.fillRect(90, 100, 20, 20);
}

function drawHealthLogo(ctx) {
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(90, 50, 20, 50);
    ctx.fillRect(75, 65, 50, 20);
}

function drawEcoLogo(ctx) {
    ctx.fillStyle = '#27ae60';
    ctx.beginPath();
    ctx.arc(100, 75, 30, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#2ecc71';
    ctx.beginPath();
    ctx.moveTo(100, 45);
    ctx.lineTo(85, 75);
    ctx.lineTo(115, 75);
    ctx.closePath();
    ctx.fill();
}

function drawEduLogo(ctx) {
    ctx.fillStyle = '#f39c12';
    ctx.fillRect(70, 60, 60, 40);
    ctx.fillStyle = '#e67e22';
    ctx.fillRect(85, 45, 30, 15);
}

function drawDefaultLogo(ctx, choice) {
    ctx.fillStyle = '#3498db';
    ctx.fillRect(80, 60, 40, 30);
    ctx.fillStyle = '#2980b9';
    ctx.fillText(choice.toUpperCase(), 85, 80);
}

function drawOffice(canvas, choice) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 背景
    ctx.fillStyle = '#ecf0f1';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // デスク
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(20, 100, 160, 30);
    
    // 選択に応じたオフィス要素
    switch(choice) {
        case 'vc':
            // 大きなオフィス
            ctx.fillStyle = '#2c3e50';
            ctx.fillRect(10, 80, 180, 5);
            break;
        case 'self':
            // 小さな作業スペース
            ctx.fillStyle = '#95a5a6';
            ctx.fillRect(50, 120, 20, 20);
            break;
        default:
            // 標準的なオフィス
            ctx.fillStyle = '#34495e';
            ctx.fillRect(30, 120, 15, 20);
            ctx.fillRect(155, 120, 15, 20);
    }
}

function drawTeam(canvas, choice) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 選択に応じたチーム構成
    const teamSizes = {
        'talent': 5,
        'speed': 3,
        'quality': 4,
        'partner': 6,
        'self': 2,
        'vc': 8,
        'crowd': 4,
        'grant': 3
    };
    
    const size = teamSizes[choice] || 4;
    const spacing = 180 / (size + 1);
    
    for (let i = 0; i < size; i++) {
        const x = spacing * (i + 1);
        const y = 75;
        
        // 人物のアイコン
        ctx.fillStyle = '#3498db';
        ctx.beginPath();
        ctx.arc(x, y - 15, 8, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#2980b9';
        ctx.fillRect(x - 10, y, 20, 25);
    }
}

// フィードバック表示
function displayFeedback(stage, choice) {
    const container = document.getElementById(`stage${stage}-feedback`);
    if (!container) return;
    
    const data = feedbackData[stage][choice];
    
    container.innerHTML = `
        <div class="feedback-box">
            <h4>成功の鍵</h4>
            <ul>
                ${data.success.map(item => `<li>${item}</li>`).join('')}
            </ul>
        </div>
        <div class="feedback-box danger-feedback">
            <h4>注意すべき落とし穴</h4>
            <ul>
                ${data.danger.map(item => `<li>${item}</li>`).join('')}
            </ul>
        </div>
    `;
}

// LLMによる追加インサイト生成
async function generateLLMInsights(stage, choice) {
    if (!API_CONFIG.apiKey) return;
    
    try {
        const context = buildContextForLLM(stage, choice);
        const insights = await callLLMAPI(context);
        
        const container = document.getElementById(`stage${stage}-feedback`);
        if (container && insights) {
            const insightDiv = document.createElement('div');
            insightDiv.className = 'feedback-box';
            insightDiv.style.background = '#f0f9ff';
            insightDiv.style.borderLeftColor = '#0ea5e9';
            insightDiv.innerHTML = `
                <h4>🤖 AI アドバイザーからの追加インサイト</h4>
                <p>${insights}</p>
            `;
            container.appendChild(insightDiv);
        }
    } catch (error) {
        console.error('LLM インサイト生成エラー:', error);
    }
}

function buildContextForLLM(stage, choice) {
    const stageNames = {
        1: '起業アイデア選定',
        2: '資金調達',
        3: '経営判断',
        4: '危機管理',
        5: '成長フェーズ'
    };
    
    const previousDecisions = Object.entries(gameState.decisions)
        .filter(([s, c]) => parseInt(s) < stage)
        .map(([s, c]) => {
            const stageData = feedbackData[parseInt(s)][c];
            return `${stageNames[s]}: ${Object.values(stageData)[Object.values(stageData).length - 1]}`;
        })
        .join(', ');
    
    return `
あなたは経験豊富なビジネスコンサルタントです。
起業シミュレーションの${stageNames[stage]}段階で、ユーザーが「${feedbackData[stage][choice][Object.keys(feedbackData[stage][choice]).pop()]}」を選択しました。

これまでの選択履歴: ${previousDecisions}

この選択について、実際の起業においてより具体的で実践的なアドバイスを150文字以内で提供してください。
実体験に基づく具体例や、避けるべき具体的な失敗パターンを含めてください。
    `.trim();
}

// フォールバック用のインサイト表示
function displayFallbackInsights(stage, choice) {
    const fallbackInsights = {
        1: {
            tech: "テクノロジー分野は競争が激しいですが、イノベーションの可能性も高いです。最新トレンドを追いながら、ユーザーニーズを見失わないよう注意しましょう。",
            health: "ヘルスケア分野は規制が厳しいですが、社会的意義が高く安定した需要があります。専門知識の獲得と法規制の理解が成功の鍵です。",
            eco: "環境・サステナビリティ分野はESG投資の注目度が高まっています。長期的視点と継続可能なビジネスモデルの構築が重要です。",
            edu: "教育分野は安定成長が見込めますが、効果測定と継続的な改善が必要です。学習者の成果を重視したサービス設計を心がけましょう。"
        },
        2: {
            self: "自己資金での起業は自由度が高い反面、リスクも大きいです。キャッシュフローの管理と段階的な成長を重視しましょう。",
            vc: "VC資金は成長を加速させますが、エグジット圧力もあります。投資家との良好な関係構築と明確な事業計画が必要です。",
            crowd: "クラウドファンディングは支援者＝顧客となる利点があります。透明性の高いコミュニケーションと約束の履行が信頼の源です。",
            grant: "補助金・助成金は返済不要ですが、用途制限があります。申請書類の準備と報告義務を理解して活用しましょう。"
        },
        3: {
            talent: "優秀な人材への投資は長期的に大きなリターンをもたらします。採用コストを投資と考え、チーム文化の醸成も重視しましょう。",
            speed: "スピード重視の開発はファーストムーバーアドバンテージを得られます。ただし、品質とのバランスを保つことが重要です。",
            quality: "品質重視は顧客ロイヤリティを高めます。完璧主義に陥らず、重要な品質要素にフォーカスして開発しましょう。",
            partner: "戦略的提携はリソースを補完し成長を加速します。パートナーとの関係性を大切にし、Win-Winの関係を構築しましょう。"
        },
        4: {
            transparent: "透明性の高い対応は信頼回復の基盤です。短期的な痛みを伴っても、長期的な信頼構築を優先しましょう。",
            pivot: "事業ピボットは大胆な方向転換ですが、既存のリソースと経験を活かせる方向性を選ぶことが成功の鍵です。",
            cost: "コスト削減は生存確率を高めますが、将来の成長への投資も忘れずに。削減する領域を慎重に選びましょう。",
            support: "外部支援は新たな視点と資源をもたらします。支援条件を十分理解し、自社の独立性とのバランスを取りましょう。"
        },
        5: {
            expand: "積極的な事業拡大は大きな成長機会ですが、品質管理と組織文化の維持に注意が必要です。段階的な拡大を検討しましょう。",
            stable: "堅実な成長路線は持続可能ですが、競合に遅れを取るリスクもあります。市場変化への対応力を維持しましょう。",
            global: "海外展開は巨大市場へのアクセスを可能にしますが、文化的な違いと現地規制への理解が不可欠です。",
            social: "社会貢献重視は長期的なブランド価値を高めますが、収益性とのバランスを保つことが持続性の鍵です。"
        }
    };
    
    const insight = fallbackInsights[stage]?.[choice] || "あなたの選択は将来の成長に向けた重要な一歩です。継続的な学習と改善を心がけましょう。";
    
    // フォールバックインサイトを表示
    const container = document.getElementById(`stage${stage}-feedback`);
    if (container) {
        const fallbackBox = document.createElement('div');
        fallbackBox.className = 'feedback-box';
        fallbackBox.innerHTML = `
            <h4>💡 アドバイス</h4>
            <p>${insight}</p>
            <small style="opacity: 0.7;">※オフラインモードでの基本アドバイスです</small>
        `;
        container.appendChild(fallbackBox);
    }
}

async function callLLMAPI(prompt) {
    // API制限チェック
    if (!checkAPILimit()) {
        throw new Error('API呼び出し制限に達しました。しばらくお待ちください。');
    }
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15秒でタイムアウト
        
        const response = await fetch(API_CONFIG.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_CONFIG.apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [{
                    role: 'system',
                    content: 'あなたは経験豊富なビジネスアドバイザーです。具体的で実用的なアドバイスを簡潔に提供してください。'
                }, {
                    role: 'user',
                    content: prompt
                }],
                max_tokens: 300,
                temperature: 0.7
            }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status} - ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error('Invalid API response format');
        }
        
        return data.choices[0].message.content;
        
    } catch (error) {
        // エラータイプに応じた詳細なハンドリング
        if (error.name === 'AbortError') {
            throw new Error('API呼び出しがタイムアウトしました。ネットワーク接続を確認してください。');
        } else if (error.message.includes('401')) {
            throw new Error('APIキーが無効です。設定を確認してください。');
        } else if (error.message.includes('429')) {
            throw new Error('API呼び出し頻度制限に達しました。しばらくお待ちください。');
        } else if (error.message.includes('500')) {
            throw new Error('API サーバーエラーが発生しました。しばらくしてからお試しください。');
        } else if (!navigator.onLine) {
            throw new Error('インターネット接続がありません。接続を確認してください。');
        } else {
            console.error('LLM API Error:', error);
            throw new Error('AI機能が一時的に利用できません。基本機能をご利用ください。');
        }
    }
}

// ステージ管理
function nextStage() {
    gameState.currentStage++;
    showStage(gameState.currentStage);
    updateProgressBar();
}

function showStage(stage) {
    // 全ステージを非表示
    for (let i = 1; i <= gameState.maxStages; i++) {
        const stageElement = document.getElementById(`stage${i}`);
        if (stageElement) {
            stageElement.classList.remove('active');
        }
    }
    
    // 該当ステージを表示
    const currentStageElement = document.getElementById(`stage${stage}`);
    if (currentStageElement) {
        currentStageElement.classList.add('active');
    }
    
    // サマリーを非表示
    const summaryElement = document.getElementById('summary');
    if (summaryElement) {
        summaryElement.classList.remove('active');
    }
}

function updateProgressBar() {
    const progress = (gameState.currentStage - 1) / gameState.maxStages * 100;
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
        progressBar.style.width = `${progress}%`;
    }
}

// サマリー表示
function showSummary() {
    // 全ステージを非表示
    for (let i = 1; i <= gameState.maxStages; i++) {
        const stageElement = document.getElementById(`stage${i}`);
        if (stageElement) {
            stageElement.classList.remove('active');
        }
    }
    
    // サマリーを表示
    const summaryElement = document.getElementById('summary');
    if (summaryElement) {
        summaryElement.classList.add('active');
    }
    
    // プログレスバーを100%に
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
        progressBar.style.width = '100%';
    }
    
    // 起業家タイプ診断
    generateEntrepreneurType();
    
    // 意思決定履歴表示
    displayDecisionHistory();
    
    // 最終アドバイス生成
    generateFinalAdvice();
}

function generateEntrepreneurType() {
    const container = document.getElementById('entrepreneur-type');
    if (!container) return;
    
    // 選択パターンから起業家タイプを判定
    const type = analyzeEntrepreneurType();
    
    container.innerHTML = `
        <div style="background: #f0f7ff; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <h3>🎯 あなたの起業家タイプ: ${type.name}</h3>
            <p>${type.description}</p>
            <div style="margin-top: 15px;">
                <strong>特徴:</strong>
                <ul style="margin: 10px 0; padding-left: 20px;">
                    ${type.traits.map(trait => `<li>${trait}</li>`).join('')}
                </ul>
            </div>
        </div>
    `;
}

function analyzeEntrepreneurType() {
    const decisions = gameState.decisions;
    
    // 複数の組み合わせパターンから判定
    if (decisions[1] === 'tech' && decisions[2] === 'vc') {
        return {
            name: 'テック・イノベーター',
            description: '最新技術で世界を変える野心的な起業家。急成長を目指し、大きなリスクも恐れない。',
            traits: ['技術志向', '高成長思考', 'グローバル視点', 'リスクテイカー']
        };
    } else if (decisions[3] === 'quality' && decisions[5] === 'stable') {
        return {
            name: '職人型起業家',
            description: '品質にこだわり、長期的な価値創造を重視する堅実な経営者。',
            traits: ['品質重視', '長期思考', '顧客第一', '持続可能性']
        };
    } else if (decisions[2] === 'crowd' && decisions[5] === 'social') {
        return {
            name: 'ソーシャル・エンプリナー',
            description: 'コミュニティと共に社会課題を解決する使命感の強い起業家。',
            traits: ['社会貢献', 'コミュニティ重視', '持続可能性', 'ミッション思考']
        };
    } else if (decisions[3] === 'speed' && decisions[4] === 'pivot') {
        return {
            name: 'アジャイル起業家',
            description: 'スピードと柔軟性を武器に、変化に素早く対応する適応力の高い経営者。',
            traits: ['スピード重視', '柔軟性', '学習思考', '実験精神']
        };
    } else {
        return {
            name: 'バランス型起業家',
            description: '多角的な視点で経営判断を行う、バランス感覚に優れた起業家。',
            traits: ['バランス感覚', 'リスク管理', '現実思考', '協調性']
        };
    }
}

function displayDecisionHistory() {
    const container = document.getElementById('decision-list');
    if (!container) return;
    
    const stageNames = {
        1: '起業アイデア選定',
        2: '資金調達',
        3: '経営判断',
        4: '危機管理',
        5: '成長フェーズ'
    };
    
    const historyHTML = Object.entries(gameState.decisions).map(([stage, choice]) => {
        const data = feedbackData[parseInt(stage)][choice];
        const value = Object.values(data)[Object.values(data).length - 1];
        
        return `
            <div class="decision-item">
                <strong>${stageNames[stage]}:</strong> ${value}
            </div>
        `;
    }).join('');
    
    container.innerHTML = historyHTML;
}

async function generateFinalAdvice() {
    const container = document.getElementById('final-advice');
    if (!container) return;
    
    // 基本的なアドバイス
    const basicAdvice = generateBasicFinalAdvice();
    container.innerHTML = `
        <div class="feedback-box">
            <h4>🎓 起業への現実的なアドバイス</h4>
            ${basicAdvice}
        </div>
    `;
    
    // LLMによる詳細なアドバイス生成
    if (API_CONFIG.apiKey) {
        try {
            const detailedAdvice = await generateLLMFinalAdvice();
            if (detailedAdvice) {
                const adviceDiv = document.createElement('div');
                adviceDiv.className = 'feedback-box';
                adviceDiv.style.background = '#f0f9ff';
                adviceDiv.style.borderLeftColor = '#0ea5e9';
                adviceDiv.innerHTML = `
                    <h4>🤖 AI コンサルタントからの総合アドバイス</h4>
                    <p>${detailedAdvice}</p>
                `;
                container.appendChild(adviceDiv);
            }
        } catch (error) {
            console.error('最終アドバイス生成エラー:', error);
        }
    }
}

function generateBasicFinalAdvice() {
    const profile = gameState.companyProfile;
    const decisions = gameState.decisions;
    
    let advice = `<p>あなたが選択した<strong>${profile.industry}</strong>分野での起業は、`;
    
    if (decisions[2] === 'vc') {
        advice += 'ベンチャーキャピタルからの投資により急成長の可能性があります。';
    } else if (decisions[2] === 'self') {
        advice += '自己資金での堅実なスタートが期待できます。';
    } else {
        advice += 'ユニークな資金調達手法により差別化が図れます。';
    }
    
    advice += '</p><ul>';
    
    // 現実的な次のステップ
    advice += '<li><strong>市場調査:</strong> 実際の顧客ニーズを徹底的にリサーチしましょう</li>';
    advice += '<li><strong>MVP開発:</strong> 最小限の機能で早期にテストを開始しましょう</li>';
    advice += '<li><strong>チーム構築:</strong> 補完的なスキルを持つメンバーを見つけましょう</li>';
    advice += '<li><strong>法的準備:</strong> 必要な許認可や知的財産権を確認しましょう</li>';
    advice += '<li><strong>資金計画:</strong> 18ヶ月分の運営資金を確保しましょう</li>';
    
    advice += '</ul>';
    
    return advice;
}

async function generateLLMFinalAdvice() {
    const context = `
あなたは起業支援の専門家です。以下の起業シミュレーション結果に基づいて、実践的で具体的なアドバイスを300文字以内で提供してください。

起業分野: ${gameState.companyProfile.industry}
資金調達: ${gameState.companyProfile.funding}
経営戦略: ${gameState.companyProfile.strategy}
危機対応: ${gameState.companyProfile.crisis}
成長方針: ${gameState.companyProfile.growth}

特に以下の点を含めてください:
1. この組み合わせの強みと課題
2. 実際の起業時に最初に取り組むべき具体的なアクション
3. 避けるべき典型的な失敗パターン
    `.trim();
    
    return await callLLMAPI(context);
}

// PDF生成機能
async function generatePDF() {
    try {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF();
        
        // フォント設定（日本語対応）
        pdf.setFont('helvetica');
        
        // タイトル
        pdf.setFontSize(18);
        pdf.text('起業シミュレーション結果レポート', 20, 30);
        
        // 会社プロフィール
        pdf.setFontSize(14);
        pdf.text('会社プロフィール', 20, 50);
        pdf.setFontSize(10);
        let yPos = 60;
        
        const profile = gameState.companyProfile;
        pdf.text(`業界: ${profile.industry}`, 20, yPos);
        pdf.text(`資金調達: ${profile.funding}`, 20, yPos + 10);
        pdf.text(`経営戦略: ${profile.strategy}`, 20, yPos + 20);
        pdf.text(`危機対応: ${profile.crisis}`, 20, yPos + 30);
        pdf.text(`成長方針: ${profile.growth}`, 20, yPos + 40);
        
        // 起業家タイプ
        yPos += 60;
        pdf.setFontSize(14);
        pdf.text('起業家タイプ', 20, yPos);
        yPos += 10;
        pdf.setFontSize(10);
        
        const type = analyzeEntrepreneurType();
        pdf.text(`タイプ: ${type.name}`, 20, yPos);
        pdf.text(`説明: ${type.description}`, 20, yPos + 10);
        
        // 意思決定履歴
        yPos += 30;
        pdf.setFontSize(14);
        pdf.text('意思決定履歴', 20, yPos);
        yPos += 10;
        pdf.setFontSize(10);
        
        const stageNames = {
            1: '起業アイデア選定',
            2: '資金調達',
            3: '経営判断',
            4: '危機管理',
            5: '成長フェーズ'
        };
        
        Object.entries(gameState.decisions).forEach(([stage, choice]) => {
            const data = feedbackData[parseInt(stage)][choice];
            const value = Object.values(data)[Object.values(data).length - 1];
            pdf.text(`${stageNames[stage]}: ${value}`, 20, yPos);
            yPos += 10;
        });
        
        // 新しいページ
        pdf.addPage();
        
        // アドバイス
        pdf.setFontSize(14);
        pdf.text('起業への現実的なアドバイス', 20, 30);
        pdf.setFontSize(10);
        
        const advice = [
            '1. 市場調査を徹底的に行い、実際の顧客ニーズを把握する',
            '2. MVP（最小限の機能を持つ製品）で早期にテストを開始する',
            '3. 補完的なスキルを持つチームメンバーを見つける',
            '4. 必要な許認可や知的財産権の確認を怠らない',
            '5. 18ヶ月分の運営資金を確保する',
            '6. 定期的に事業計画を見直し、柔軟に方向修正する'
        ];
        
        yPos = 50;
        advice.forEach(item => {
            pdf.text(item, 20, yPos);
            yPos += 10;
        });
        
        // PDF保存
        const fileName = `起業シミュレーション結果_${new Date().toISOString().split('T')[0]}.pdf`;
        pdf.save(fileName);
        
    } catch (error) {
        console.error('PDF生成エラー:', error);
        alert('PDF生成中にエラーが発生しました。');
    }
}

// ゲームリスタート
function restart() {
    if (confirm('シミュレーションを最初からやり直しますか？')) {
        // 状態をリセット
        gameState.currentStage = 1;
        gameState.decisions = {};
        gameState.companyProfile = {
            name: '',
            industry: '',
            funding: '',
            strategy: '',
            crisis: '',
            growth: ''
        };
        gameState.generatedVisuals = {};
        
        // UIをリセット
        initializeGame();
    }
}

// ユーティリティ関数
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// エラーハンドリング
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

// API制限対応
let apiCallCount = 0;
const API_LIMIT_PER_MINUTE = 10;

function checkAPILimit() {
    apiCallCount++;
    if (apiCallCount > API_LIMIT_PER_MINUTE) {
        console.warn('API call limit reached');
        return false;
    }
    return true;
}

// 1分ごとにAPIコール数をリセット
setInterval(() => {
    apiCallCount = 0;
}, 60000);

// アクセシビリティとキーボードナビゲーションの設定
function setupAccessibility() {
    // 選択肢ボタンにキーボードナビゲーションを追加
    const choiceButtons = document.querySelectorAll('.choice-button');
    choiceButtons.forEach((button, index) => {
        button.tabIndex = 0;
        button.setAttribute('role', 'button');
        button.setAttribute('aria-describedby', `choice-description-${index}`);
        
        button.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                button.click();
            }
        });
    });
    
    // モーダルのキーボード処理
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modal = document.getElementById('api-key-modal');
            if (modal && modal.classList.contains('active')) {
                hideAPIKeyModal();
            }
        }
    });
}

// タッチハンドリングの改善
function setupTouchHandling() {
    let touchStartTime = 0;
    
    document.addEventListener('touchstart', (e) => {
        touchStartTime = Date.now();
    });
    
    document.addEventListener('touchend', (e) => {
        const touchDuration = Date.now() - touchStartTime;
        
        // 短いタッチ（タップ）の場合のみ処理
        if (touchDuration < 500) {
            const target = e.target.closest('.choice-button');
            if (target) {
                // タッチフィードバック
                target.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    target.style.transform = '';
                }, 150);
            }
        }
    });
    
    // プリロードとパフォーマンス最適化
    preloadResources();
}

// リソースのプリロード
function preloadResources() {
    // 重要なCSSアニメーションのプリロード
    const preloadDiv = document.createElement('div');
    preloadDiv.style.cssText = `
        position: absolute;
        left: -9999px;
        animation: fadeIn 0.01s;
    `;
    document.body.appendChild(preloadDiv);
    setTimeout(() => document.body.removeChild(preloadDiv), 100);
} 