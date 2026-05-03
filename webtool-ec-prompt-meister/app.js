/**
 * Prompt Meister - プロンプト組み合わせツール
 * ベースプロンプトと変数を組み合わせて、ChatGPT用のプロンプトを作成
 */

class PromptMeister {
  constructor() {
    this.variables = [];
    this.generatedPrompt = '';
    this.isProcessing = false;
    
    this.initializeElements();
    this.initializeEventListeners();
    this.loadStoredData();
    // Remove addDefaultVariables as variables are fixed
  }
  
  initializeElements() {
    this.basePrompt = document.getElementById('basePrompt');
    this.baseCharCount = document.getElementById('baseCharCount');
    this.outputArea = document.getElementById('outputArea');
    this.loadingIndicator = document.getElementById('loadingIndicator');
    this.generateBtn = document.getElementById('generateBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.executeBtn = document.getElementById('executeBtn');
    // Add fixed variable elements
    this.productPage = document.getElementById('product_page');
    this.companyProfile = document.getElementById('company_profile');
    this.supplierInfo = document.getElementById('supplier_info');
  }
  
  initializeEventListeners() {
    this.basePrompt.addEventListener('input', () => {
      this.updateCharCount();
      this.saveData();
    });
    
    // Remove language change listeners
    
    // Add listeners for fixed variables
    [this.productPage, this.companyProfile, this.supplierInfo].forEach(el => {
      el.addEventListener('input', () => this.generatePrompt());
    });
    
    // Real-time preview
    this.basePrompt.addEventListener('input', () => {
      clearTimeout(this.previewTimeout);
      this.previewTimeout = setTimeout(() => {
        this.generatePrompt();
      }, 500);
    });
  }
  
  // Remove addDefaultVariables, addVariable, removeVariable, updateVariable
  
  generatePrompt() {
    let prompt = this.basePrompt.value;
    let hasVariables = false;
    
    // Replace fixed variables
    const fixedVars = {
      product_page: this.productPage.value,
      company_profile: this.companyProfile.value,
      supplier_info: this.supplierInfo.value
    };
    
    Object.entries(fixedVars).forEach(([name, value]) => {
      const regex = new RegExp(`\\{${name}\\}`, 'g');
      if (prompt.includes(`{${name}}`)) {
        hasVariables = true;
        prompt = prompt.replace(regex, value);
      }
    });
    
    // Remove language addition code
    
    // Highlight unresolved variables
    const unresolved = prompt.match(/\{[^}]+\}/g);
    if (unresolved) {
      unresolved.forEach(variable => {
        prompt = prompt.replace(new RegExp(variable.replace(/[{}]/g, '\\$&'), 'g'), 
                               `<span style="background: #fef3c7; color: #92400e; padding: 0.2rem 0.4rem; border-radius: 4px;">${variable}</span>`);
      });
    }
    
    this.generatedPrompt = prompt.replace(/<[^>]*>/g, ''); // Remove HTML tags for clipboard
    this.outputArea.innerHTML = prompt || 'ベースプロンプトを入力してください...';
    
    // Preview mode styling
    if (hasVariables || unresolved) {
      this.outputArea.classList.add('preview-mode');
    } else {
      this.outputArea.classList.remove('preview-mode');
    }
  }
  
  async copyToClipboard() {
    if (!this.generatedPrompt.trim()) {
      this.showNotification('コピーするプロンプトがありません', 'warning');
      return;
    }
    
    try {
      await navigator.clipboard.writeText(this.generatedPrompt);
      this.showNotification('プロンプトをクリップボードにコピーしました！', 'success');
      
      // コピーボタンの一時的な変更
      const originalText = this.copyBtn.innerHTML;
      this.copyBtn.innerHTML = '<i class="fas fa-check"></i> コピー完了！';
      this.copyBtn.style.background = '#10b981';
      
      setTimeout(() => {
        this.copyBtn.innerHTML = originalText;
        this.copyBtn.style.background = '';
      }, 2000);
      
    } catch (err) {
      console.error('クリップボードへのコピーに失敗:', err);
      this.showNotification('クリップボードへのコピーに失敗しました', 'error');
    }
  }
  
  async executeLLM() {
    if (!this.generatedPrompt.trim()) {
      this.showNotification('実行するプロンプトがありません', 'warning');
      return;
    }
    
    if (this.isProcessing) {
      return;
    }
    
    this.isProcessing = true;
    this.loadingIndicator.classList.add('active');
    this.executeBtn.disabled = true;
    
    try {
      // Replicate API を使用してLLM実行
      const response = await this.callReplicateAPI(this.generatedPrompt);
      
      if (response && response.output) {
        this.outputArea.innerHTML = `
          <div style="border-bottom: 2px solid var(--border); padding-bottom: 1rem; margin-bottom: 1rem;">
            <strong>📝 入力プロンプト:</strong><br>
            <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; margin-top: 0.5rem; white-space: pre-wrap;">${this.generatedPrompt}</div>
          </div>
          <div>
            <strong>🤖 AI出力結果:</strong><br>
            <div style="background: #e6fffa; padding: 1rem; border-radius: 8px; margin-top: 0.5rem; border-left: 4px solid var(--success); white-space: pre-wrap;">${response.output}</div>
          </div>
        `;
        this.showNotification('LLM実行が完了しました！', 'success');
      } else {
        throw new Error('無効なレスポンス');
      }
      
    } catch (error) {
      console.error('LLM実行エラー:', error);
      this.outputArea.innerHTML = `
        <div style="background: #fee2e2; color: #991b1b; padding: 1rem; border-radius: 8px; border-left: 4px solid var(--danger);">
          <strong>❌ エラーが発生しました:</strong><br>
          ${error.message || 'LLM APIの呼び出しに失敗しました'}
        </div>
      `;
      this.showNotification('LLM実行に失敗しました', 'error');
    } finally {
      this.isProcessing = false;
      this.loadingIndicator.classList.remove('active');
      this.executeBtn.disabled = false;
    }
  }
  
  async callReplicateAPI(prompt) {
    // デモ用のモックレスポンス（実際の実装では適切なAPIキーとエンドポイントを使用）
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          output: `こんにちは！以下がプロンプトに対する回答です：

${prompt}

このプロンプトは非常に明確で、以下の要素が含まれています：
- 明確な役割定義
- 具体的なタスク説明  
- 実行条件の明示
- 言語設定の指定

日本語での出力として、適切な回答を提供させていただきました。何か他にご質問があればお聞かせください。`
        });
      }, 2000);
    });
    
    // 実際のReplicate API呼び出し例（APIキーが必要）
    /*
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: "適切なモデルバージョン",
        input: {
          prompt: prompt,
          max_tokens: 2048,
          temperature: 0.7
        }
      })
    });
    
    return await response.json();
    */
  }
  
  clearAll() {
    if (confirm('すべてのデータをクリアしますか？')) {
      this.basePrompt.value = '';
      this.productPage.value = '';
      this.companyProfile.value = '';
      this.supplierInfo.value = '';
      this.outputArea.innerHTML = 'ここに生成されたプロンプトが表示されます...';
      this.updateCharCount();
      this.generatePrompt();
      this.saveData();
      this.showNotification('データをクリアしました', 'success');
    }
  }
  
  updateCharCount() {
    const count = this.basePrompt.value.length;
    this.baseCharCount.textContent = `${count}文字`;
  }
  
  saveData() {
    const data = {
      basePrompt: this.basePrompt.value,
      product_page: this.productPage.value,
      company_profile: this.companyProfile.value,
      supplier_info: this.supplierInfo.value,
      lastUpdated: new Date().toISOString()
    };
    
    localStorage.setItem('promptMeister_data', JSON.stringify(data));
  }
  
  loadStoredData() {
    const stored = localStorage.getItem('promptMeister_data');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        this.basePrompt.value = data.basePrompt || '';
        this.productPage.value = data.product_page || '';
        this.companyProfile.value = data.company_profile || '';
        this.supplierInfo.value = data.supplier_info || '';
        this.updateCharCount();
        this.generatePrompt();
      } catch (error) {
        console.error('データの読み込みに失敗:', error);
      }
    }
  }
  
  // Remove renderVariables
  
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      color: white;
      font-weight: 600;
      z-index: 1000;
      animation: slideInRight 0.3s ease;
    `;
    
    switch (type) {
      case 'success':
        notification.style.background = 'var(--success)';
        break;
      case 'warning':
        notification.style.background = 'var(--warning)';
        break;
      case 'error':
        notification.style.background = 'var(--danger)';
        break;
      default:
        notification.style.background = 'var(--primary)';
    }
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.3s ease';
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  }
}

// アプリケーション初期化
let promptMeister;

document.addEventListener('DOMContentLoaded', () => {
  promptMeister = new PromptMeister();
});

// キーボードショートカット
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'Enter') {
    e.preventDefault();
    promptMeister.generatePrompt();
  }
  
  if (e.ctrlKey && e.key === 'c' && e.target === promptMeister.outputArea) {
    e.preventDefault();
    promptMeister.copyToClipboard();
  }
  
  if (e.ctrlKey && e.key === 'e') {
    e.preventDefault();
    promptMeister.executeLLM();
  }
});

// スタイル追加
const additionalStyles = `
  @keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes slideOutRight {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);