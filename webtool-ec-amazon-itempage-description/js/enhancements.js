// ユーザー体験向上のための追加機能

// 1. 文字数カウンター機能
function setupCharacterCounter() {
    const textareas = document.querySelectorAll('textarea:not(#generated-prompt)');
    
    textareas.forEach(textarea => {
        // カウンター要素を作成
        const counter = document.createElement('div');
        counter.className = 'char-counter';
        counter.textContent = '0文字';
        
        // textareaの親要素に追加
        textarea.parentElement.appendChild(counter);
        
        // 入力イベントでカウンターを更新
        textarea.addEventListener('input', function() {
            const count = this.value.length;
            counter.textContent = `${count.toLocaleString()}文字`;
            
            // 文字数に応じて色を変更
            if (count > 5000) {
                counter.style.color = '#ff7e5f';
            } else if (count > 3000) {
                counter.style.color = '#feb47b';
            } else {
                counter.style.color = '#666';
            }
        });
    });
}

// 2. プロンプトプレビュー機能
function addPreviewButton() {
    const buttonGroups = document.querySelectorAll('.button-group');
    
    buttonGroups.forEach(group => {
        const primaryBtn = group.querySelector('.btn-primary');
        if (primaryBtn) {
            const previewBtn = document.createElement('button');
            previewBtn.className = 'btn btn-preview';
            previewBtn.textContent = 'プレビュー';
            previewBtn.type = 'button';
            
            // プレビューボタンをプライマリボタンの前に挿入
            group.insertBefore(previewBtn, primaryBtn);
            
            // クリックイベント
            previewBtn.addEventListener('click', function() {
                const tabId = this.closest('.tab-content').id;
                showPreview(tabId);
            });
        }
    });
}

function showPreview(tabId) {
    let content = '';
    
    switch(tabId) {
        case 'amazon-product':
            const pName = document.getElementById('product-name').value;
            const pVar = document.getElementById('product-variation').value;
            const pSpec = document.getElementById('product-spec').value;
            content = `【商品名】\n${pName || '(未入力)'}\n\n【バリエーション】\n${pVar || '(未入力)'}\n\n【仕様】\n${pSpec || '(未入力)'}`;
            break;
        case 'supplier-evaluation':
            const sProduct = document.getElementById('supplier-product-page').value;
            const sCompany = document.getElementById('supplier-company-page').value;
            const sInfo = document.getElementById('supplier-info').value;
            content = `【商品ページ】\n${sProduct.substring(0, 200) || '(未入力)'}...\n\n【会社概要】\n${sCompany.substring(0, 200) || '(未入力)'}...\n\n【サプライヤー情報】\n${sInfo || '(未入力)'}`;
            break;
        case 'review-brushup':
            const bVar = document.getElementById('brushup-variation').value;
            const bReviews = document.getElementById('brushup-reviews').value;
            const bCurrent = document.getElementById('brushup-current-page').value;
            content = `【バリエーション】\n${bVar || '(未入力)'}\n\n【レビュー】\n${bReviews.substring(0, 200) || '(未入力)'}...\n\n【現在のページ】\n${bCurrent.substring(0, 200) || '(未入力)'}...`;
            break;
        case 'apparel-image':
            const aName = document.getElementById('apparel-product-name').value;
            const aDesc = document.getElementById('apparel-description').value;
            const aGender = document.getElementById('apparel-gender').options[document.getElementById('apparel-gender').selectedIndex].text;
            const aAge = document.getElementById('apparel-age').options[document.getElementById('apparel-age').selectedIndex].text;
            const aStyle = document.getElementById('apparel-style').options[document.getElementById('apparel-style').selectedIndex].text;
            content = `【商品名】\n${aName || '(未入力)'}\n\n【商品説明】\n${aDesc || '(未入力)'}\n\n【ターゲット】\n性別: ${aGender}\n年齢層: ${aAge}\nスタイル: ${aStyle}`;
            break;
    }
    
    // プレビューモーダルを表示
    showPreviewModal(content);
}

function showPreviewModal(content) {
    const modal = document.createElement('div');
    modal.className = 'preview-modal';
    modal.innerHTML = `
        <div class="preview-content">
            <div class="preview-header">
                <h3>入力内容プレビュー</h3>
                <button class="preview-close" onclick="this.closest('.preview-modal').remove()">×</button>
            </div>
            <div class="preview-body">
                <pre>${content}</pre>
            </div>
            <div class="preview-footer">
                <button class="btn btn-secondary" onclick="this.closest('.preview-modal').remove()">閉じる</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 外側クリックで閉じる
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// 3. フォーム入力状況インジケーター
function setupProgressIndicator() {
    const tabs = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        const fields = tab.querySelectorAll('textarea, input[type="text"], select');
        const indicator = document.createElement('div');
        indicator.className = 'progress-indicator';
        indicator.innerHTML = '<div class="progress-bar"><div class="progress-fill"></div></div><span class="progress-text">0% 入力済み</span>';
        
        // フォームセクションの上部に追加
        const formSection = tab.querySelector('.form-section');
        if (formSection) {
            formSection.insertBefore(indicator, formSection.firstChild.nextSibling);
        }
        
        // 入力状況を監視
        fields.forEach(field => {
            field.addEventListener('input', () => updateProgress(tab));
        });
        
        // 初期状態を反映
        updateProgress(tab);
    });
}

function updateProgress(tab) {
    const fields = tab.querySelectorAll('textarea, input[type="text"]');
    const selectFields = tab.querySelectorAll('select');
    
    let filledCount = 0;
    const totalCount = fields.length;
    
    fields.forEach(field => {
        if (field.value.trim().length > 0) {
            filledCount++;
        }
    });
    
    const percentage = totalCount > 0 ? Math.round((filledCount / totalCount) * 100) : 0;
    
    const progressFill = tab.querySelector('.progress-fill');
    const progressText = tab.querySelector('.progress-text');
    
    if (progressFill && progressText) {
        progressFill.style.width = `${percentage}%`;
        progressText.textContent = `${percentage}% 入力済み`;
        
        // 色の変更
        if (percentage === 100) {
            progressFill.style.background = 'linear-gradient(135deg, #10b981, #059669)';
        } else if (percentage >= 50) {
            progressFill.style.background = 'linear-gradient(135deg, #feb47b, #ff7e5f)';
        } else {
            progressFill.style.background = 'linear-gradient(135deg, #cbd5e0, #94a3b8)';
        }
    }
}

// 4. ツールチップ機能
function setupTooltips() {
    const labels = document.querySelectorAll('label');
    
    const tooltips = {
        '商品名': '1688や競合商品の商品名を入力してください。日本語・中国語どちらでも可能です。',
        '商品バリエーション': 'カラー、サイズ、素材などのバリエーション情報を入力してください。',
        '仕様・説明文など': '素材、機能、特徴など商品の詳細情報を入力してください。',
        '商品ページ情報': '1688の商品ページ全体をCtrl+Aで選択してコピーしてください。',
        '会社概要ページ（公司档案/工厂档案）': '会社情報ページ全体をコピーして貼り付けてください。',
        'サプライヤー情報（ホバー表示）': '会社名にマウスカーソルを合わせて表示される情報をコピーしてください。',
        '購入者レビュー': '競合商品や類似商品のAmazonレビューを複数コピーしてください。',
        '現在のAmazon商品ページ（Bullet Points・商品説明文）': '現在の商品ページの内容を貼り付けてください。',
        '商品説明（特徴・素材・カラーなど）': '商品の特徴、素材、カラーバリエーションなどを入力してください。'
    };
    
    labels.forEach(label => {
        const text = label.textContent.trim();
        if (tooltips[text]) {
            const tooltip = document.createElement('span');
            tooltip.className = 'tooltip-icon';
            tooltip.textContent = '?';
            tooltip.setAttribute('data-tooltip', tooltips[text]);
            label.appendChild(tooltip);
        }
    });
}

// 5. キーボードショートカット
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Ctrl + Enter でプロンプト生成
        if (e.ctrlKey && e.key === 'Enter') {
            const activeTab = document.querySelector('.tab-content.active');
            const generateBtn = activeTab.querySelector('.btn-primary');
            if (generateBtn) {
                generateBtn.click();
            }
        }
        
        // Esc でモーダルを閉じる（既存機能の強化）
        if (e.key === 'Escape') {
            const previewModal = document.querySelector('.preview-modal');
            if (previewModal) {
                previewModal.remove();
            }
        }
    });
}

// 初期化
document.addEventListener('DOMContentLoaded', function() {
    setupCharacterCounter();
    addPreviewButton();
    setupProgressIndicator();
    setupTooltips();
    setupKeyboardShortcuts();
    
    console.log('✅ 拡張機能が読み込まれました');
});