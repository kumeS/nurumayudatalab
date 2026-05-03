// タブ切り替え機能（選択タブを記憶）
document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
        // すべてのタブとコンテンツから active クラスを削除
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        // クリックされたタブとコンテンツに active クラスを追加
        button.classList.add('active');
        const tabId = button.getAttribute('data-tab');
        document.getElementById(tabId).classList.add('active');
        
        // 選択したタブをlocalStorageに保存
        localStorage.setItem('active-tab', tabId);
    });
});

/**
 * プロンプトテンプレートは外部ファイルから読み込まれます
 * - js/templates/amazon-product-template.js (amazonProductTemplate)
 * - js/templates/supplier-evaluation-template.js (supplierEvaluationTemplate)
 * - js/templates/review-brushup-template.js (reviewBrushupTemplate)
 * - js/templates/apparel-image-template.js (apparelImageTemplate)
 * 
 * これらのファイルを編集することで、プロンプトをカスタマイズできます。
 */

// 下位互換性のため、元の変数名にエイリアスを設定
let promptTemplate;
let supplierPromptTemplate;
let brushupPromptTemplate;
let apparelImagePromptTemplate;

// DOMContentLoaded後にテンプレートを設定
document.addEventListener('DOMContentLoaded', function() {
    // 外部ファイルから読み込まれたテンプレートを参照
    promptTemplate = amazonProductTemplate;
    supplierPromptTemplate = supplierEvaluationTemplate;
    brushupPromptTemplate = reviewBrushupTemplate;
    apparelImagePromptTemplate = apparelImageTemplate;
    
    // 店舗数選択の初期状態を設定
    updateStoreFields();
    
    // 前回選択していたタブを復元
    const savedTab = localStorage.getItem('active-tab');
    if (savedTab) {
        // すべてのタブとコンテンツから active クラスを削除
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        // 保存されていたタブを active に設定
        const tabButton = document.querySelector(`[data-tab="${savedTab}"]`);
        const tabContent = document.getElementById(savedTab);
        
        if (tabButton && tabContent) {
            tabButton.classList.add('active');
            tabContent.classList.add('active');
        }
    }
    
    // 前回のウィンドウサイズを復元
    const savedWindowSize = localStorage.getItem('window-size');
    if (savedWindowSize) {
        try {
            const { width, height } = JSON.parse(savedWindowSize);
            // ウィンドウサイズを復元（window.resizeToは一部のブラウザで制限あり）
            if (window.outerWidth && window.outerHeight) {
                window.resizeTo(width, height);
            }
        } catch (e) {
            console.log('ウィンドウサイズの復元をスキップ:', e);
        }
    }
});

// プロンプトテンプレート定義ここまで（外部ファイルに移行済み）

// Amazon商品ページ作成プロンプト生成関数
function generatePrompt() {
    // 入力値を取得
    const productName = document.getElementById('product-name').value.trim();
    const productVariation = document.getElementById('product-variation').value.trim();
    const productSpec = document.getElementById('product-spec').value.trim();

    // 変数を置換（空白の場合は「（情報なし）」と表示）
    let prompt = promptTemplate;
    prompt = prompt.replace('{{product_name}}', productName || '（情報なし）');
    prompt = prompt.replace('{{product_variation}}', productVariation || '（情報なし）');
    prompt = prompt.replace('{{product_spec}}', productSpec || '（情報なし）');

    // モーダルに表示
    document.getElementById('generated-prompt').value = prompt;
    document.getElementById('modal').classList.add('show');
}

// 店舗数選択に応じてフィールドを表示/非表示
function updateStoreFields() {
    const storeCount = parseInt(document.getElementById('store-count-select').value);
    
    // 店舗Aは常に表示
    document.getElementById('store-a-section').style.display = 'block';
    
    // 店舗Bは2店舗以上で表示
    if (storeCount >= 2) {
        document.getElementById('store-b-section').style.display = 'block';
    } else {
        document.getElementById('store-b-section').style.display = 'none';
    }
    
    // 店舗Cは3店舗の場合のみ表示
    if (storeCount >= 3) {
        document.getElementById('store-c-section').style.display = 'block';
    } else {
        document.getElementById('store-c-section').style.display = 'none';
    }
}

// 1688店舗評価プロンプト生成関数（複数店舗対応）
function generateSupplierPrompt() {
    const storeCount = parseInt(document.getElementById('store-count-select').value);
    
    if (storeCount === 1) {
        // 単独評価の場合
        generateSingleSupplierPrompt();
    } else {
        // 複数店舗比較の場合
        generateComparisonSupplierPrompt(storeCount);
    }
}

// 単独店舗評価プロンプト生成
function generateSingleSupplierPrompt() {
    // 入力値を取得（店舗A）
    const productPage = document.getElementById('supplier-product-page-a').value.trim();
    const companyPage = document.getElementById('supplier-company-page-a').value.trim();
    const supplierInfo = document.getElementById('supplier-info-a').value.trim();

    // 変数を置換（空白の場合は「（情報なし）」と表示）
    let prompt = supplierPromptTemplate;
    prompt = prompt.replace('{{product_page}}', productPage || '（情報なし）');
    prompt = prompt.replace('{{company_page}}', companyPage || '（情報なし）');
    prompt = prompt.replace('{{supplier_info}}', supplierInfo || '（情報なし）');

    // モーダルに表示
    document.getElementById('generated-prompt').value = prompt;
    document.getElementById('modal').classList.add('show');
}

// 複数店舗比較プロンプト生成
function generateComparisonSupplierPrompt(storeCount) {
    // 店舗Aの入力値を取得
    const productPageA = document.getElementById('supplier-product-page-a').value.trim();
    const companyPageA = document.getElementById('supplier-company-page-a').value.trim();
    const supplierInfoA = document.getElementById('supplier-info-a').value.trim();
    
    // 店舗Bの入力値を取得
    const productPageB = document.getElementById('supplier-product-page-b').value.trim();
    const companyPageB = document.getElementById('supplier-company-page-b').value.trim();
    const supplierInfoB = document.getElementById('supplier-info-b').value.trim();
    
    // 基本テンプレートを取得
    let prompt = supplierComparisonTemplate;
    
    // 店舗数を置換
    prompt = prompt.replace(/{{store_count}}/g, storeCount.toString());
    
    // 店舗A情報を置換
    prompt = prompt.replace('{{product_page_a}}', productPageA || '（情報なし）');
    prompt = prompt.replace('{{company_page_a}}', companyPageA || '（情報なし）');
    prompt = prompt.replace('{{supplier_info_a}}', supplierInfoA || '（情報なし）');
    
    // 店舗B情報を置換
    prompt = prompt.replace('{{product_page_b}}', productPageB || '（情報なし）');
    prompt = prompt.replace('{{company_page_b}}', companyPageB || '（情報なし）');
    prompt = prompt.replace('{{supplier_info_b}}', supplierInfoB || '（情報なし）');
    
    if (storeCount === 3) {
        // 3店舗の場合、店舗C情報を追加
        const productPageC = document.getElementById('supplier-product-page-c').value.trim();
        const companyPageC = document.getElementById('supplier-company-page-c').value.trim();
        const supplierInfoC = document.getElementById('supplier-info-c').value.trim();
        
        // 店舗Cセクションを追加
        prompt = prompt.replace('{{store_c_section}}', storeCSection);
        prompt = prompt.replace('{{product_page_c}}', productPageC || '（情報なし）');
        prompt = prompt.replace('{{company_page_c}}', companyPageC || '（情報なし）');
        prompt = prompt.replace('{{supplier_info_c}}', supplierInfoC || '（情報なし）');
        
        // 表の店舗Cカラムを追加
        prompt = prompt.replace(/{{store_c_header}}/g, ' 店舗C |');
        prompt = prompt.replace(/{{store_c_divider}}/g, '------|');
        prompt = prompt.replace(/{{store_c_cell}}/g, '|');
        
        // 店舗C評価セクションを追加
        prompt = prompt.replace('{{store_c_evaluation}}', storeCEvaluation);
    } else {
        // 2店舗の場合、店舗C関連のプレースホルダーを削除
        prompt = prompt.replace('{{store_c_section}}', '');
        prompt = prompt.replace(/{{store_c_header}}/g, '');
        prompt = prompt.replace(/{{store_c_divider}}/g, '');
        prompt = prompt.replace(/{{store_c_cell}}/g, '');
        prompt = prompt.replace('{{store_c_evaluation}}', '');
    }

    // モーダルに表示
    document.getElementById('generated-prompt').value = prompt;
    document.getElementById('modal').classList.add('show');
}

// レビュー分析ブラッシュアッププロンプト生成関数
function generateBrushupPrompt() {
    // 入力値を取得
    const productVariation = document.getElementById('brushup-variation').value.trim();
    const customerReviews = document.getElementById('brushup-reviews').value.trim();
    const currentPage = document.getElementById('brushup-current-page').value.trim();

    // 変数を置換（空白の場合は「（情報なし）」と表示）
    let prompt = brushupPromptTemplate;
    prompt = prompt.replace('{{product_variation}}', productVariation || '（情報なし）');
    prompt = prompt.replace('{{customer_reviews}}', customerReviews || '（情報なし）');
    prompt = prompt.replace('{{current_page}}', currentPage || '（情報なし）');

    // モーダルに表示
    document.getElementById('generated-prompt').value = prompt;
    document.getElementById('modal').classList.add('show');
}

// アパレル画像生成プロンプト生成関数
function generateApparelPrompt() {
    // 入力値を取得
    const productName = document.getElementById('apparel-product-name').value.trim();
    const productDescription = document.getElementById('apparel-description').value.trim();
    const gender = document.getElementById('apparel-gender').value;
    const age = document.getElementById('apparel-age').value;
    const style = document.getElementById('apparel-style').value;

    // 性別の日本語変換
    const genderMap = {
        'female': '女性',
        'male': '男性',
        'unisex': 'ユニセックス'
    };

    // 年齢層の日本語変換
    const ageMap = {
        '20s': '20代',
        '30s': '30代',
        '40s': '40代',
        '50s': '50代以上',
        'teens': '10代'
    };

    // スタイルの日本語変換
    const styleMap = {
        'casual': 'カジュアル',
        'formal': 'フォーマル',
        'outdoor': 'アウトドア',
        'street': 'ストリート',
        'business': 'ビジネス',
        'elegant': 'エレガント',
        'sporty': 'スポーティ',
        'vintage': 'ヴィンテージ'
    };

    // 変数を置換
    let prompt = apparelImagePromptTemplate;
    prompt = prompt.replace(/{{product_name}}/g, productName || '（情報なし）');
    prompt = prompt.replace(/{{product_description}}/g, productDescription || '（情報なし）');
    prompt = prompt.replace(/{{gender}}/g, genderMap[gender]);
    prompt = prompt.replace(/{{age}}/g, ageMap[age]);
    prompt = prompt.replace(/{{style}}/g, styleMap[style]);

    // モーダルに表示
    document.getElementById('generated-prompt').value = prompt;
    document.getElementById('modal').classList.add('show');
}

// モーダルを閉じる
function closeModal() {
    document.getElementById('modal').classList.remove('show');
}

// クリップボードにコピー
function copyPrompt() {
    const promptText = document.getElementById('generated-prompt');
    promptText.select();
    promptText.setSelectionRange(0, 99999); // モバイル対応
    
    navigator.clipboard.writeText(promptText.value).then(() => {
        // コピー成功のフィードバック
        const copyBtn = event.target.closest('.btn-success');
        const originalHTML = copyBtn.innerHTML;
        copyBtn.innerHTML = 'コピーしました！';
        copyBtn.style.opacity = '0.8';
        
        setTimeout(() => {
            copyBtn.innerHTML = originalHTML;
            copyBtn.style.opacity = '';
        }, 2000);
    }).catch(err => {
        alert('クリップボードへのコピーに失敗しました。手動でコピーしてください。');
        console.error('コピーエラー:', err);
    });
}

// Amazon商品ページフォームをクリア
function clearForm() {
    if (confirm('入力内容をすべてクリアしますか？')) {
        document.getElementById('product-name').value = '';
        document.getElementById('product-variation').value = '';
        document.getElementById('product-spec').value = '';
    }
}

// 1688店舗評価フォームをクリア（複数店舗対応）
function clearSupplierForm() {
    if (confirm('入力内容をすべてクリアしますか？')) {
        // 店舗A
        document.getElementById('supplier-product-page-a').value = '';
        document.getElementById('supplier-company-page-a').value = '';
        document.getElementById('supplier-info-a').value = '';
        
        // 店舗B
        document.getElementById('supplier-product-page-b').value = '';
        document.getElementById('supplier-company-page-b').value = '';
        document.getElementById('supplier-info-b').value = '';
        
        // 店舗C
        document.getElementById('supplier-product-page-c').value = '';
        document.getElementById('supplier-company-page-c').value = '';
        document.getElementById('supplier-info-c').value = '';
        
        // 店舗数選択をリセット
        document.getElementById('store-count-select').value = '1';
        updateStoreFields();
    }
}

// レビュー分析ブラッシュアップフォームをクリア
function clearBrushupForm() {
    if (confirm('入力内容をすべてクリアしますか？')) {
        document.getElementById('brushup-variation').value = '';
        document.getElementById('brushup-reviews').value = '';
        document.getElementById('brushup-current-page').value = '';
    }
}

// アパレル画像生成フォームをクリア
function clearApparelForm() {
    if (confirm('入力内容をすべてクリアしますか？')) {
        document.getElementById('apparel-product-name').value = '';
        document.getElementById('apparel-description').value = '';
        document.getElementById('apparel-gender').value = 'female';
        document.getElementById('apparel-age').value = '20s';
        document.getElementById('apparel-style').value = 'casual';
    }
}

// モーダル外クリックで閉じる
document.getElementById('modal').addEventListener('click', (e) => {
    if (e.target.id === 'modal') {
        closeModal();
    }
});

// ESCキーでモーダルを閉じる
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
    }
});

// ページ読み込み時にローカルストレージから復元（オプション機能）- 複数店舗対応
window.addEventListener('load', () => {
    const saved = localStorage.getItem('prompt-tool-draft');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            if (confirm('前回の入力内容が保存されています。復元しますか？')) {
                // Amazon商品ページ
                if (data.productName) document.getElementById('product-name').value = data.productName;
                if (data.productVariation) document.getElementById('product-variation').value = data.productVariation;
                if (data.productSpec) document.getElementById('product-spec').value = data.productSpec;
                
                // 1688店舗評価 - 店舗数
                if (data.storeCount) {
                    document.getElementById('store-count-select').value = data.storeCount;
                    updateStoreFields();
                }
                
                // 1688店舗評価 - 店舗A
                if (data.supplierProductPageA) document.getElementById('supplier-product-page-a').value = data.supplierProductPageA;
                if (data.supplierCompanyPageA) document.getElementById('supplier-company-page-a').value = data.supplierCompanyPageA;
                if (data.supplierInfoA) document.getElementById('supplier-info-a').value = data.supplierInfoA;
                
                // 1688店舗評価 - 店舗B
                if (data.supplierProductPageB) document.getElementById('supplier-product-page-b').value = data.supplierProductPageB;
                if (data.supplierCompanyPageB) document.getElementById('supplier-company-page-b').value = data.supplierCompanyPageB;
                if (data.supplierInfoB) document.getElementById('supplier-info-b').value = data.supplierInfoB;
                
                // 1688店舗評価 - 店舗C
                if (data.supplierProductPageC) document.getElementById('supplier-product-page-c').value = data.supplierProductPageC;
                if (data.supplierCompanyPageC) document.getElementById('supplier-company-page-c').value = data.supplierCompanyPageC;
                if (data.supplierInfoC) document.getElementById('supplier-info-c').value = data.supplierInfoC;
                
                // レビュー分析ブラッシュアップ
                if (data.brushupVariation) document.getElementById('brushup-variation').value = data.brushupVariation;
                if (data.brushupReviews) document.getElementById('brushup-reviews').value = data.brushupReviews;
                if (data.brushupCurrentPage) document.getElementById('brushup-current-page').value = data.brushupCurrentPage;
                
                // アパレル画像生成
                if (data.apparelProductName) document.getElementById('apparel-product-name').value = data.apparelProductName;
                if (data.apparelDescription) document.getElementById('apparel-description').value = data.apparelDescription;
                if (data.apparelGender) document.getElementById('apparel-gender').value = data.apparelGender;
                if (data.apparelAge) document.getElementById('apparel-age').value = data.apparelAge;
                if (data.apparelStyle) document.getElementById('apparel-style').value = data.apparelStyle;
            }
        } catch (e) {
            console.error('復元エラー:', e);
        }
    }
});

// 自動保存機能（5秒ごと）- 複数店舗対応
setInterval(() => {
    const data = {
        // Amazon商品ページ
        productName: document.getElementById('product-name').value,
        productVariation: document.getElementById('product-variation').value,
        productSpec: document.getElementById('product-spec').value,
        
        // 1688店舗評価 - 店舗数
        storeCount: document.getElementById('store-count-select').value,
        
        // 1688店舗評価 - 店舗A
        supplierProductPageA: document.getElementById('supplier-product-page-a').value,
        supplierCompanyPageA: document.getElementById('supplier-company-page-a').value,
        supplierInfoA: document.getElementById('supplier-info-a').value,
        
        // 1688店舗評価 - 店舗B
        supplierProductPageB: document.getElementById('supplier-product-page-b').value,
        supplierCompanyPageB: document.getElementById('supplier-company-page-b').value,
        supplierInfoB: document.getElementById('supplier-info-b').value,
        
        // 1688店舗評価 - 店舗C
        supplierProductPageC: document.getElementById('supplier-product-page-c').value,
        supplierCompanyPageC: document.getElementById('supplier-company-page-c').value,
        supplierInfoC: document.getElementById('supplier-info-c').value,
        
        // レビュー分析ブラッシュアップ
        brushupVariation: document.getElementById('brushup-variation').value,
        brushupReviews: document.getElementById('brushup-reviews').value,
        brushupCurrentPage: document.getElementById('brushup-current-page').value,
        
        // アパレル画像生成
        apparelProductName: document.getElementById('apparel-product-name').value,
        apparelDescription: document.getElementById('apparel-description').value,
        apparelGender: document.getElementById('apparel-gender').value,
        apparelAge: document.getElementById('apparel-age').value,
        apparelStyle: document.getElementById('apparel-style').value
    };
    
    // いずれかのフィールドに入力がある場合のみ保存
    if (data.productName || data.productVariation || data.productSpec || 
        data.supplierProductPageA || data.supplierCompanyPageA || data.supplierInfoA ||
        data.supplierProductPageB || data.supplierCompanyPageB || data.supplierInfoB ||
        data.supplierProductPageC || data.supplierCompanyPageC || data.supplierInfoC ||
        data.brushupVariation || data.brushupReviews || data.brushupCurrentPage ||
        data.apparelProductName || data.apparelDescription) {
        localStorage.setItem('prompt-tool-draft', JSON.stringify(data));
    }
}, 5000);

// ウィンドウサイズの保存（リサイズ時）
let resizeTimeout;
window.addEventListener('resize', () => {
    // デバウンス処理（リサイズ完了後500ms後に保存）
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        const windowSize = {
            width: window.outerWidth,
            height: window.outerHeight
        };
        localStorage.setItem('window-size', JSON.stringify(windowSize));
    }, 500);
});