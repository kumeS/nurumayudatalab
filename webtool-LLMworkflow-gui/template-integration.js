// workflow-editor.js に追加するテンプレート機能のコード

// 1. constructor内に追加（他のマネージャーの後）
constructor() {
    // ... 既存のコード ...
    
    // テンプレートマネージャーを初期化
    this.templateManager = new WorkflowTemplates();
    
    // ... 残りのコード ...
}

// 2. completeInitialization() メソッドに追加（最後に）
completeInitialization() {
    // ... 既存のコード ...
    
    // テンプレートUIを初期化
    this.initTemplateUI();
}

// 3. 新しいメソッドを追加

/**
 * テンプレートUIを初期化
 */
initTemplateUI() {
  const categoriesContainer = document.getElementById('templateCategories');
  if (!categoriesContainer) {
    console.error('templateCategories要素が見つかりません');
    return;
  }

  // 検索ボックスを追加
  const searchContainer = document.createElement('div');
  searchContainer.className = 'template-search';
  searchContainer.style.position = 'relative';
  searchContainer.innerHTML = `
    <i class="fas fa-search template-search-icon"></i>
    <input type="text" id="templateSearch" placeholder="テンプレートを検索..." />
  `;
  categoriesContainer.parentElement.insertBefore(searchContainer, categoriesContainer);

  // カテゴリ別のテンプレートを取得
  const templatesByCategory = this.templateManager.getTemplatesByCategory();
  
  // カテゴリごとにUIを生成
  Object.entries(templatesByCategory).forEach(([category, templates]) => {
    const categoryDiv = this.createTemplateCategoryUI(category, templates);
    categoriesContainer.appendChild(categoryDiv);
  });

  // 検索機能を実装
  const searchInput = document.getElementById('templateSearch');
  searchInput.addEventListener('input', (e) => {
    this.filterTemplates(e.target.value);
  });
}

/**
 * テンプレートカテゴリのUIを作成
 */
createTemplateCategoryUI(categoryName, templates) {
  const categoryDiv = document.createElement('div');
  categoryDiv.className = 'template-category';
  categoryDiv.dataset.category = categoryName;

  // カテゴリヘッダー
  const headerDiv = document.createElement('div');
  headerDiv.className = 'template-category-header';
  headerDiv.innerHTML = `
    <span>${categoryName}</span>
    <i class="fas fa-chevron-down"></i>
  `;
  
  // カテゴリの折りたたみ機能
  headerDiv.addEventListener('click', () => {
    categoryDiv.classList.toggle('collapsed');
  });

  // テンプレートリスト
  const listDiv = document.createElement('div');
  listDiv.className = 'template-list';

  // 各テンプレートのアイテムを作成
  templates.forEach(template => {
    const itemDiv = this.createTemplateItemUI(template);
    listDiv.appendChild(itemDiv);
  });

  categoryDiv.appendChild(headerDiv);
  categoryDiv.appendChild(listDiv);

  return categoryDiv;
}

/**
 * テンプレートアイテムのUIを作成
 */
createTemplateItemUI(template) {
  const itemDiv = document.createElement('div');
  itemDiv.className = 'template-item';
  itemDiv.dataset.templateKey = template.key;
  itemDiv.dataset.templateName = template.name.toLowerCase();
  itemDiv.dataset.templateDescription = template.description.toLowerCase();

  itemDiv.innerHTML = `
    <div class="template-item-header">
      <i class="${template.icon || 'fas fa-file'}"></i>
      <span class="template-item-name">${template.name}</span>
    </div>
    <div class="template-item-description">${template.description}</div>
  `;

  // クリックイベント
  itemDiv.addEventListener('click', () => {
    this.showTemplateConfirmDialog(template);
  });

  return itemDiv;
}

/**
 * テンプレート適用確認ダイアログを表示
 */
showTemplateConfirmDialog(template) {
  // 既存のダイアログがあれば削除
  const existingDialog = document.querySelector('.template-confirm-dialog');
  if (existingDialog) {
    existingDialog.remove();
  }

  // 背景オーバーレイ
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 999;
  `;

  // ダイアログ
  const dialog = document.createElement('div');
  dialog.className = 'template-confirm-dialog';
  
  dialog.innerHTML = `
    <h4><i class="${template.icon || 'fas fa-file'}"></i> ${template.name}</h4>
    <p>${template.description}</p>
    <div class="template-preview">
      <div class="template-preview-stats">
        <div class="template-preview-stat">
          <i class="fas fa-circle-nodes"></i>
          <span>${template.nodes.length} ノード</span>
        </div>
        <div class="template-preview-stat">
          <i class="fas fa-arrow-right"></i>
          <span>${template.connections.length} 接続</span>
        </div>
      </div>
    </div>
    <p style="color: #dc3545; font-size: 0.85rem;">
      <i class="fas fa-exclamation-triangle"></i>
      現在のワークフローは削除されます
    </p>
    <div class="template-confirm-buttons">
      <button class="button secondary" id="cancelTemplateBtn">キャンセル</button>
      <button class="button" id="applyTemplateBtn">
        <i class="fas fa-check"></i> 適用
      </button>
    </div>
  `;

  // イベントハンドラ
  const handleCancel = () => {
    overlay.remove();
    dialog.remove();
  };

  const handleApply = () => {
    try {
      // テンプレートを適用
      const result = this.templateManager.applyTemplate(
        template.key,
        this.nodeManager,
        this.connectionManager
      );

      // ワークフロー名を更新
      const nameField = document.getElementById('workflowName');
      if (nameField) {
        nameField.value = `${template.name} - コピー`;
      }

      // 成功メッセージ
      this.showNotification(
        `テンプレート「${template.name}」を適用しました`,
        'success'
      );

      // ビューポートをリセット
      this.viewportManager.resetZoom();

      // ダイアログを閉じる
      handleCancel();

      // ワークフローを保存
      this.storageManager.saveWorkflow();

    } catch (error) {
      console.error('テンプレート適用エラー:', error);
      this.showNotification(
        `テンプレートの適用に失敗しました: ${error.message}`,
        'error'
      );
    }
  };

  // ボタンイベント
  setTimeout(() => {
    document.getElementById('cancelTemplateBtn').addEventListener('click', handleCancel);
    document.getElementById('applyTemplateBtn').addEventListener('click', handleApply);
  }, 0);

  // ESCキーで閉じる
  const handleEsc = (e) => {
    if (e.key === 'Escape') {
      handleCancel();
      document.removeEventListener('keydown', handleEsc);
    }
  };
  document.addEventListener('keydown', handleEsc);

  // オーバーレイクリックで閉じる
  overlay.addEventListener('click', handleCancel);

  document.body.appendChild(overlay);
  document.body.appendChild(dialog);
}

/**
 * テンプレートをフィルタリング
 */
filterTemplates(searchTerm) {
  const term = searchTerm.toLowerCase().trim();
  const templateItems = document.querySelectorAll('.template-item');
  const categories = document.querySelectorAll('.template-category');

  if (!term) {
    // 検索語句が空の場合、すべて表示
    templateItems.forEach(item => {
      item.style.display = '';
    });
    categories.forEach(category => {
      category.style.display = '';
      const list = category.querySelector('.template-list');
      if (list) list.style.display = '';
    });
    return;
  }

  // 各カテゴリの表示状態を管理
  const categoryVisibility = new Map();

  templateItems.forEach(item => {
    const name = item.dataset.templateName || '';
    const description = item.dataset.templateDescription || '';
    
    if (name.includes(term) || description.includes(term)) {
      item.style.display = '';
      // 親カテゴリを表示対象にマーク
      const parentCategory = item.closest('.template-category');
      if (parentCategory) {
        categoryVisibility.set(parentCategory, true);
      }
    } else {
      item.style.display = 'none';
    }
  });

  // カテゴリの表示/非表示を設定
  categories.forEach(category => {
    if (categoryVisibility.has(category)) {
      category.style.display = '';
      // 折りたたみを解除
      category.classList.remove('collapsed');
    } else {
      category.style.display = 'none';
    }
  });

  // 結果が0件の場合、空状態を表示
  const visibleItems = document.querySelectorAll('.template-item:not([style*="display: none"])');
  const categoriesContainer = document.getElementById('templateCategories');
  
  // 既存の空状態メッセージを削除
  const existingEmpty = categoriesContainer.querySelector('.template-empty');
  if (existingEmpty) existingEmpty.remove();

  if (visibleItems.length === 0) {
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'template-empty';
    emptyDiv.innerHTML = `
      <i class="fas fa-search"></i>
      <p>「${term}」に一致するテンプレートが見つかりません</p>
    `;
    categoriesContainer.appendChild(emptyDiv);
  }
}

/**
 * 通知を表示
 */
showNotification(message, type = 'info') {
  // 既存の通知を削除
  const existingNotification = document.querySelector('.workflow-notification');
  if (existingNotification) {
    existingNotification.remove();
  }

  const notification = document.createElement('div');
  notification.className = 'workflow-notification';
  notification.classList.add(type);
  
  const icons = {
    success: 'fas fa-check-circle',
    error: 'fas fa-exclamation-circle',
    warning: 'fas fa-exclamation-triangle',
    info: 'fas fa-info-circle'
  };

  notification.innerHTML = `
    <i class="${icons[type] || icons.info}"></i>
    <span>${message}</span>
  `;

  // スタイル
  notification.style.cssText = `
    position: fixed;
    top: 100px;
    right: 20px;
    padding: 15px 20px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    display: flex;
    align-items: center;
    gap: 10px;
    z-index: 1001;
    animation: slideIn 0.3s ease-out;
    max-width: 400px;
  `;

  // タイプ別の色
  const colors = {
    success: '#28a745',
    error: '#dc3545',
    warning: '#ffc107',
    info: '#17a2b8'
  };

  notification.style.borderLeft = `4px solid ${colors[type] || colors.info}`;
  notification.querySelector('i').style.color = colors[type] || colors.info;

  // アニメーション
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }
  `;
  
  if (!document.querySelector('style[data-notification-animations]')) {
    style.setAttribute('data-notification-animations', 'true');
    document.head.appendChild(style);
  }

  document.body.appendChild(notification);

  // 自動的に消える
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => {
      if (document.body.contains(notification)) {
        notification.remove();
      }
    }, 300);
  }, 3000);
}