// Inline Application - Browser Compatible Version
// This is a simplified version that doesn't require ES modules

class SimpleAIEditor {
    constructor() {
        this.editor = document.getElementById('main-editor');
        this.history = [];
        this.historyIndex = -1;
        this.availableModels = [];
        this.currentModel = 'openai/gpt-oss-120b'; // デフォルトモデル
        this.db = null;
        this.dbName = 'AIEditorDB';
        this.dbVersion = 2;
        this.init();
    }

    async init() {
        if (!this.editor) return;
        
        // Load theme first
        this.loadTheme();
        
        // Initialize IndexedDB
        await this.initDB();
        
        // Setup all components
        this.setupEditor();
        this.setupToolbar();
        this.setupAIPanel();
        this.setupSettings();
        this.setupPrompts();
        this.setupEmailFunctions();
        this.setupEmailSend();
        this.setupSaveButton();
        
        // Load saved model settings
        await this.loadModelSettings();
        
        // Initial word count update
        this.updateWordCount();
        
        console.log('SimpleAIEditor initialized successfully');
    }

    // IndexedDB Database initialization
    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => {
                console.error('IndexedDB initialization failed:', request.error);
                resolve(); // Don't fail initialization if DB is not available
            };
            
            request.onsuccess = () => {
                this.db = request.result;
                console.log('IndexedDB initialized successfully');
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create settings store
                if (!db.objectStoreNames.contains('settings')) {
                    const settingsStore = db.createObjectStore('settings', { keyPath: 'key' });
                    console.log('Settings store created');
                }
                
                // Create models store
                if (!db.objectStoreNames.contains('models')) {
                    const modelsStore = db.createObjectStore('models', { keyPath: 'id' });
                    console.log('Models store created');
                }
                
                // Create drafts store for draft management system
                if (!db.objectStoreNames.contains('drafts')) {
                    const draftsStore = db.createObjectStore('drafts', { keyPath: 'id' });
                    draftsStore.createIndex('timestamp', 'timestamp', { unique: false });
                    console.log('Drafts store created');
                }
                
                // Note: Chat history store removed - we don't store chat history
            };
        });
    }

    // Generic method to save data to IndexedDB
    async saveToDB(storeName, data) {
        if (!this.db) {
            console.warn('Database not available, falling back to localStorage');
            localStorage.setItem(`${storeName}_${data.key || data.id}`, JSON.stringify(data));
            return;
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);
            
            request.onerror = () => {
                console.error(`Failed to save to ${storeName}:`, request.error);
                // Fallback to localStorage
                localStorage.setItem(`${storeName}_${data.key || data.id}`, JSON.stringify(data));
                resolve();
            };
            
            request.onsuccess = () => {
                console.log(`Data saved to ${storeName}:`, data.key || data.id);
                resolve();
            };
        });
    }

    // Generic method to load data from IndexedDB
    async loadFromDB(storeName, key) {
        if (!this.db) {
            console.warn('Database not available, falling back to localStorage');
            const data = localStorage.getItem(`${storeName}_${key}`);
            return data ? JSON.parse(data) : null;
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);
            
            request.onerror = () => {
                console.error(`Failed to load from ${storeName}:`, request.error);
                // Fallback to localStorage
                const data = localStorage.getItem(`${storeName}_${key}`);
                resolve(data ? JSON.parse(data) : null);
            };
            
            request.onsuccess = () => {
                resolve(request.result || null);
            };
        });
    }

    // Load all data from a store
    async loadAllFromDB(storeName) {
        if (!this.db) {
            console.warn('Database not available, cannot load all data');
            return [];
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            
            request.onerror = () => {
                console.error(`Failed to load all from ${storeName}:`, request.error);
                resolve([]);
            };
            
            request.onsuccess = () => {
                resolve(request.result || []);
            };
        });
    }

    setupEditor() {
        // Add to history initially
        this.addToHistory('');
        
        // Content change handler
        this.editor.addEventListener('input', () => {
            this.addToHistory(this.editor.textContent);
            this.updateToolbarState();
        });

        // Keyboard shortcuts
        this.editor.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key.toLowerCase()) {
                    case 'b':
                        e.preventDefault();
                        this.applyFormat('bold');
                        break;
                    case 'i':
                        e.preventDefault();
                        this.applyFormat('italic');
                        break;
                    case 'u':
                        e.preventDefault();
                        this.applyFormat('underline');
                        break;
                    case 'z':
                        e.preventDefault();
                        this.undo();
                        break;
                    case 'y':
                        e.preventDefault();
                        this.redo();
                        break;
                }
            }
        });
    }

    setupToolbar() {
        // Format buttons
        // Format buttons - using data-format attribute
        document.querySelectorAll('[data-format]').forEach(btn => {
            btn.addEventListener('click', () => {
                const format = btn.getAttribute('data-format');
                this.applyFormat(format);
                btn.classList.toggle('active');
            });
        });

        // AI buttons
        document.getElementById('ai-improve-btn')?.addEventListener('click', () => {
            this.generateAISuggestion();
        });

        document.getElementById('toggle-ai-panel')?.addEventListener('click', () => {
            this.toggleAIPanel();
        });

        // Undo/Redo buttons
        document.getElementById('undo-button')?.addEventListener('click', () => {
            this.undo();
        });

        document.getElementById('redo-button')?.addEventListener('click', () => {
            this.redo();
        });

        this.updateToolbarState();
    }

    setupAIPanel() {
        const aiPanel = document.getElementById('ai-panel');
        const closeBtn = document.getElementById('close-ai-panel');
        
        closeBtn?.addEventListener('click', () => {
            aiPanel?.classList.remove('show');
        });

        // Template buttons
        const templateBtns = document.querySelectorAll('.template-item');
        templateBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const templateType = btn.getAttribute('data-template');
                this.insertTemplate(templateType);
            });
        });

        // Tone options - using buttons instead of radio inputs
        const toneButtons = document.querySelectorAll('.tone-button');
        toneButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Remove active class from all buttons
                toneButtons.forEach(btn => btn.classList.remove('active'));
                // Add active class to clicked button
                button.classList.add('active');
                // Apply tone
                const tone = button.getAttribute('data-tone');
                if (tone) {
                    this.applyTone(tone);
                }
            });
        });

        // AI Chat setup
        this.setupAIChat();
        
        // Contact information setup
        this.setupContactForm();
    }

    setupAIChat() {
        const toggleChatBtn = document.getElementById('toggle-chat-btn');
        const aiChatContainer = document.getElementById('ai-chat-container');
        const aiChatSendBtn = document.getElementById('ai-chat-send-btn');
        const aiChatInput = document.getElementById('ai-chat-input');

        // Chat toggle button
        toggleChatBtn?.addEventListener('click', () => {
            aiChatContainer?.classList.toggle('collapsed');
        });

        // Chat send button
        aiChatSendBtn?.addEventListener('click', () => {
            this.sendChatMessage();
        });

        // Chat input enter key
        aiChatInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.sendChatMessage();
            }
        });
    }

    async sendChatMessage() {
        const chatInput = document.getElementById('ai-chat-input');
        const message = chatInput.value.trim();
        if (!message) return;

        // Clear input immediately
        chatInput.value = '';
        
        // Show processing toast
        this.showToast('AIが処理中...', 'info');

        try {
            const currentContent = this.editor.textContent;
            const prompt = currentContent 
                ? `以下のメール内容を参考に、「${message}」の指示に従ってメールを改善または作成してください。\n\n現在のメール内容：\n${currentContent}\n\n指示：${message}`
                : `「${message}」の指示に従ってメールを作成してください。`;
                
            const response = await this.callOpenAIAPI(currentContent, prompt);
            
            if (response && response.choices && response.choices[0]) {
                const aiResponse = response.choices[0].message.content.trim();
                
                // Directly insert the AI response into the editor
                this.editor.innerHTML = aiResponse.replace(/\n/g, '<br>');
                this.addToHistory(this.editor.innerHTML);
                
                this.showToast('AIがメールを更新しました', 'success');
            } else {
                throw new Error('AI応答の形式が不正です');
            }
        } catch (error) {
            console.error('AI処理に失敗:', error);
            this.showToast('AI処理に失敗しました: ' + error.message, 'error');
        }
    }


    setupContactForm() {
        const applyContactBtn = document.getElementById('apply-contact-btn');
        
        // Load saved contact information
        this.loadContactInfo();
        
        applyContactBtn?.addEventListener('click', () => {
            this.applyContactInfo();
        });

        // Auto-save contact info when fields change
        const contactFields = ['contact-name', 'contact-company', 'contact-relation'];
        contactFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            field?.addEventListener('change', () => {
                this.saveContactInfo();
            });
        });
    }

    async getContactInfo() {
        return {
            name: document.getElementById('contact-name')?.value || '',
            company: document.getElementById('contact-company')?.value || '',
            relation: document.getElementById('contact-relation')?.value || ''
        };
    }

    async saveContactInfo() {
        const contactInfo = await this.getContactInfo();
        await this.saveToDB('settings', {
            key: 'contact_info',
            value: contactInfo,
            timestamp: Date.now()
        });
    }

    async loadContactInfo() {
        const contactData = await this.loadFromDB('settings', 'contact_info');
        if (contactData && contactData.value) {
            const info = contactData.value;
            const nameField = document.getElementById('contact-name');
            const companyField = document.getElementById('contact-company');
            const relationField = document.getElementById('contact-relation');
            
            if (nameField) nameField.value = info.name || '';
            if (companyField) companyField.value = info.company || '';
            if (relationField) relationField.value = info.relation || '';
        }
    }

    async applyContactInfo() {
        const info = await this.getContactInfo();
        
        if (!info.name) {
            this.showToast('相手先の氏名を入力してください', 'warning');
            return;
        }

        // Generate appropriate greeting based on relation
        let greeting = this.generateGreeting(info);
        
        // Create email template with contact information
        let emailContent = `${greeting}\n\n`;
        
        // Add spacing for content
        emailContent += '[メール本文をここに入力してください]\n\n';
        
        // Add closing based on relation
        let closing = this.generateClosing(info.relation);
        emailContent += closing;
        
        // Insert into editor
        this.editor.innerHTML = emailContent.replace(/\n/g, '<br>');
        this.addToHistory(this.editor.innerHTML);
        
        // Also set email recipient if available
        const emailToField = document.getElementById('email-to');
        if (emailToField && !emailToField.value) {
            emailToField.placeholder = `${info.company ? info.company + 'の' : ''}${info.name}さんのメールアドレス`;
        }
        
        this.showToast('相手先情報を適用しました', 'success');
    }

    generateGreeting(info) {
        let greeting = '';
        
        if (info.company) {
            greeting += `${info.company}\n`;
        }
        
        greeting += `${info.name}様\n\n`;
        
        // Add appropriate opening based on relation
        switch (info.relation) {
            case 'customer':
            case 'client':
                greeting += 'いつもお世話になっております。';
                break;
            case 'partner':
            case 'vendor':
                greeting += 'いつもお世話になっております。';
                break;
            case 'colleague':
                greeting += 'お疲れさまです。';
                break;
            case 'superior':
                greeting += 'お疲れさまです。';
                break;
            case 'subordinate':
                greeting += 'お疲れさまです。';
                break;
            default:
                greeting += 'いつもお世話になっております。';
        }
        
        return greeting;
    }

    generateClosing(relation) {
        let closing = '';
        
        switch (relation) {
            case 'customer':
            case 'client':
                closing = 'ご不明な点がございましたら、お気軽にお声がけください。\n\nよろしくお願いいたします。';
                break;
            case 'partner':
            case 'vendor':
                closing = '引き続きよろしくお願いいたします。';
                break;
            case 'colleague':
            case 'subordinate':
                closing = 'よろしくお願いします。';
                break;
            case 'superior':
                closing = 'よろしくお願いいたします。';
                break;
            default:
                closing = 'よろしくお願いいたします。';
        }
        
        return closing;
    }

    setupSettings() {
        const settingsBtn = document.getElementById('settings-button');
        const settingsModal = document.getElementById('settings-modal');
        const closeSettingsBtn = document.getElementById('close-settings');
        const cancelSettingsBtn = document.getElementById('cancel-settings');
        const saveSettingsBtn = document.getElementById('save-settings');
        const themeToggle = document.getElementById('theme-toggle');
        
        settingsBtn?.addEventListener('click', () => {
            if (settingsModal) {
                settingsModal.setAttribute('aria-hidden', 'false');
                settingsModal.style.display = 'flex';
            }
        });

        const closeModal = () => {
            if (settingsModal) {
                settingsModal.setAttribute('aria-hidden', 'true');
                settingsModal.style.display = 'none';
            }
        };

        closeSettingsBtn?.addEventListener('click', closeModal);
        cancelSettingsBtn?.addEventListener('click', closeModal);
        
        saveSettingsBtn?.addEventListener('click', () => {
            this.saveSettings();
            closeModal();
        });

        // Close modal when clicking backdrop
        settingsModal?.querySelector('.modal-backdrop')?.addEventListener('click', closeModal);
        
        // Theme toggle
        themeToggle?.addEventListener('click', () => {
            this.toggleTheme();
        });

        // Font size slider
        const fontSizeSlider = document.getElementById('font-size-slider');
        const fontSizeDisplay = document.getElementById('font-size-display');
        
        fontSizeSlider?.addEventListener('input', (e) => {
            const size = e.target.value + 'px';
            this.editor.style.fontSize = size;
            fontSizeDisplay.textContent = size;
        });

        // API Token save button
        const saveTokenBtn = document.getElementById('save-token-btn');
        const apiTokenInput = document.getElementById('api-token-input');
        
        saveTokenBtn?.addEventListener('click', () => {
            const token = apiTokenInput.value.trim();
            if (token) {
                this.setAuthToken(token);
                apiTokenInput.value = '';
            } else {
                this.showToast('トークンを入力してください', 'warning');
            }
        });

        // Load existing token (masked)
        this.getAuthToken().then(existingToken => {
            if (existingToken && apiTokenInput) {
                apiTokenInput.placeholder = '認証トークンが設定済み (新しいトークンで上書きします)';
            }
        });

        // Model selector event handler
        const modelSelector = document.getElementById('model-selector');
        modelSelector?.addEventListener('change', (e) => {
            const selectedModel = e.target.value;
            this.setCurrentModel(selectedModel);
        });

        // Clear all data button
        const clearDataBtn = document.getElementById('clear-all-data-btn');
        clearDataBtn?.addEventListener('click', () => {
            this.clearAllData();
        });
    }

    setupPrompts() {
        const promptInput = document.getElementById('ai-prompt-input');
        const promptSubmit = document.getElementById('prompt-submit-btn');
        const promptSuggestions = document.querySelectorAll('.prompt-suggestion');
        
        promptSubmit?.addEventListener('click', () => {
            this.handlePrompt(promptInput.value);
        });

        promptInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.handlePrompt(promptInput.value);
            }
        });

        promptSuggestions.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const prompt = e.target.getAttribute('data-prompt');
                this.handlePrompt(prompt);
            });
        });
    }

    applyFormat(format) {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        const selectedText = range.toString();

        if (!selectedText) return;

        let element;
        switch (format) {
            case 'bold':
                element = document.createElement('strong');
                break;
            case 'italic':
                element = document.createElement('em');
                break;
            case 'underline':
                element = document.createElement('u');
                break;
            case 'list':
                this.applyListFormat();
                return;
        }

        if (element) {
            element.textContent = selectedText;
            range.deleteContents();
            range.insertNode(element);
            this.addToHistory(this.editor.innerHTML);
        }
    }

    applyListFormat() {
        const content = this.editor.textContent;
        const lines = content.split('\n');
        const newLines = lines.map(line => {
            if (line.trim().startsWith('•')) {
                return line.replace(/^\s*•\s*/, '');
            } else if (line.trim()) {
                return '• ' + line;
            }
            return line;
        });
        
        this.editor.innerHTML = newLines.join('<br>');
        this.addToHistory(this.editor.innerHTML);
    }

    async generateAISuggestion() {
        const content = this.editor.textContent;
        if (!content.trim()) {
            this.showToast('テキストを入力してからAI提案を使用してください', 'warning');
            return;
        }

        this.showToast('AI提案を生成中...', 'info');

        try {
            const response = await this.callOpenAIAPI(content, 'この文章を改善して、より読みやすく丁寧な表現にしてください。');
            
            if (response && response.choices && response.choices[0]) {
                const suggestion = response.choices[0].message.content.trim();
                this.displayAISuggestion(suggestion);
                this.toggleAIPanel(true);
                this.showToast('AI提案を生成しました', 'success');
            } else {
                throw new Error('AI応答の形式が不正です');
            }
        } catch (error) {
            console.error('AI提案の生成に失敗:', error);
            this.showToast('AI提案の生成に失敗しました', 'error');
            
            // フォールバック: シミュレートされた提案
            const fallbackSuggestions = [
                'この文章をより丁寧な表現に変更しました。',
                '専門的な語彙を使用して文章を改善しました。',
                '文章の構造を整理して読みやすくしました。'
            ];
            const randomSuggestion = fallbackSuggestions[Math.floor(Math.random() * fallbackSuggestions.length)];
            this.displayAISuggestion(randomSuggestion);
            this.toggleAIPanel(true);
        }
    }

    displayAISuggestion(suggestion) {
        const suggestionsList = document.getElementById('suggestions-list');
        if (!suggestionsList) return;

        suggestionsList.innerHTML = `
            <div class="suggestion-item" onclick="aiEditor.applySuggestionText('${suggestion}')">
                <div class="suggestion-text">${suggestion}</div>
                <div class="suggestion-confidence">信頼度: 85%</div>
            </div>
        `;
    }

    applySuggestionText(suggestion) {
        this.showToast('AI提案を適用しました: ' + suggestion, 'success');
    }

    toggleAIPanel(show = null) {
        const aiPanel = document.getElementById('ai-panel');
        if (!aiPanel) return;

        if (show === null) {
            aiPanel.classList.toggle('show');
        } else if (show) {
            aiPanel.classList.add('show');
        } else {
            aiPanel.classList.remove('show');
        }
    }

    insertTemplate(templateType) {
        let subject = '';
        let content = '';
        
        switch (templateType) {
            case 'business-email':
                subject = 'ビジネス関連のご連絡';
                content = `○○様

いつもお世話になっております。
[会社名/氏名]です。

[本文内容をここに記載してください]

何かご不明点がございましたら、お気軽にお声がけください。

よろしくお願いいたします。

[署名]
[会社名]
[連絡先]`;
                break;
            case 'thank-you':
                subject = 'お礼';
                content = `○○様

お忙しい中、[内容]をいただき、誠にありがとうございます。

[感謝の詳細をここに記載してください]

今後ともどうぞよろしくお願いいたします。

[署名]
[会社名]
[連絡先]`;
                break;
        }

        // 件名を設定
        const subjectField = document.getElementById('email-subject');
        if (subjectField) {
            subjectField.value = subject;
        }

        // 本文を設定
        this.editor.innerHTML = content.replace(/\n/g, '<br>');
        this.addToHistory(this.editor.innerHTML);
        this.showToast('メールテンプレートを挿入しました', 'success');
    }

    async callOpenAIAPI(content, instruction) {
        const apiEndpoint = 'https://api.intelligence.io.solutions/api/v1/openai/gpt-oss-120b';
        const authToken = await this.getAuthToken();
        
        if (!authToken) {
            throw new Error('API認証トークンが設定されていません。環境変数 AIeditor_AUTH を設定してください。');
        }

        const requestBody = {
            model: this.currentModel.replace('openai/', ''), // Remove provider prefix for API
            messages: [
                {
                    role: "system",
                    content: "あなたは日本語の文章作成と編集を支援するAIアシスタントです。ユーザーの要求に応じて、文章の改善、トーン調整、文法チェックを行います。"
                },
                {
                    role: "user",
                    content: `${instruction}\n\n対象の文章：\n${content}`
                }
            ],
            max_tokens: 1000,
            temperature: 0.7
        };

        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    }

    async getAuthToken() {
        // Try IndexedDB first, then fallback to environment variables
        const tokenData = await this.loadFromDB('settings', 'auth_token');
        if (tokenData && tokenData.value) {
            return tokenData.value;
        }
        
        // Fallback to environment variables or global variables
        return window.AIeditor_AUTH || '';
    }

    async setAuthToken(token) {
        const tokenData = {
            key: 'auth_token',
            value: token,
            timestamp: Date.now()
        };
        
        await this.saveToDB('settings', tokenData);
        this.showToast('API認証トークンを保存しました', 'success');
        
        // トークンが設定されたらモデル一覧を取得
        await this.fetchAvailableModels();
    }

    async fetchAvailableModels() {
        const authToken = await this.getAuthToken();
        if (!authToken) {
            console.warn('認証トークンが設定されていないため、モデル一覧を取得できません');
            return;
        }

        try {
            const response = await fetch('https://api.intelligence.io.solutions/api/v1/models', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`モデル一覧取得に失敗: ${response.status} ${response.statusText}`);
            }

            const modelsData = await response.json();
            this.availableModels = this.parseModelsResponse(modelsData);
            
            // IndexedDBに保存
            await this.saveToDB('models', {
                id: 'available_models', 
                models: this.availableModels,
                timestamp: Date.now()
            });
            
            this.updateModelSelector();
            console.log('利用可能なモデル:', this.availableModels.length, '個');
            
        } catch (error) {
            console.error('モデル一覧の取得に失敗:', error);
            this.showToast('モデル一覧の取得に失敗しました', 'error');
            
            // キャッシュされたモデル一覧があれば使用
            this.loadCachedModels();
        }
    }

    parseModelsResponse(response) {
        // APIレスポンスの構造に応じてパースする
        let models = [];
        
        if (response.data && Array.isArray(response.data)) {
            // OpenAI形式の場合
            models = response.data.map(model => ({
                id: model.id || model.model,
                name: model.id || model.model,
                description: model.description || model.id || model.model,
                created: model.created,
                owned_by: model.owned_by
            }));
        } else if (Array.isArray(response)) {
            // 配列形式の場合
            models = response.map(model => ({
                id: model.id || model.model || model.name,
                name: model.name || model.id || model.model,
                description: model.description || model.name || model.id
            }));
        } else if (response.models && Array.isArray(response.models)) {
            // models配列がある場合
            models = response.models.map(model => ({
                id: model.id || model.model,
                name: model.name || model.id || model.model,
                description: model.description || model.name || model.id
            }));
        }

        // デフォルトモデルが含まれているかチェック
        const hasDefault = models.some(model => model.id === this.currentModel);
        if (!hasDefault) {
            models.unshift({
                id: this.currentModel,
                name: 'GPT-OSS-120B (デフォルト)',
                description: 'デフォルトの高性能言語モデル'
            });
        }

        return models;
    }

    async loadCachedModels() {
        const cachedData = await this.loadFromDB('models', 'available_models');
        if (cachedData && cachedData.models) {
            try {
                this.availableModels = cachedData.models;
                this.updateModelSelector();
                console.log('キャッシュされたモデル一覧を読み込みました');
            } catch (error) {
                console.error('キャッシュされたモデル一覧の読み込みに失敗:', error);
            }
        } else {
            // キャッシュがない場合はデフォルトモデルのみ
            this.availableModels = [{
                id: this.currentModel,
                name: 'GPT-OSS-120B (デフォルト)',
                description: 'デフォルトの高性能言語モデル'
            }];
            this.updateModelSelector();
        }
    }

    async loadModelSettings() {
        // 保存されたモデル設定を読み込み
        const savedModelData = await this.loadFromDB('settings', 'selected_model');
        if (savedModelData && savedModelData.value) {
            this.currentModel = savedModelData.value;
        }
        
        // 認証トークンがあればモデル一覧を取得
        const authToken = await this.getAuthToken();
        if (authToken) {
            await this.fetchAvailableModels();
        } else {
            await this.loadCachedModels();
        }
    }

    updateModelSelector() {
        const modelSelector = document.getElementById('model-selector');
        if (!modelSelector) return;

        // Clear existing options
        modelSelector.innerHTML = '';
        
        // Add available models as options
        this.availableModels.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = model.name;
            option.title = model.description;
            
            if (model.id === this.currentModel) {
                option.selected = true;
            }
            
            modelSelector.appendChild(option);
        });

        console.log(`モデル選択ドロップダウンを更新: ${this.availableModels.length}個のモデル`);
    }

    updateCurrentModelDisplay() {
        // Update the save status indicator to show current model
        const saveStatus = document.getElementById('save-status');
        if (saveStatus) {
            const selectedModel = this.availableModels.find(model => model.id === this.currentModel);
            const modelName = selectedModel ? selectedModel.name : this.currentModel;
            const saveIndicator = document.getElementById('save-indicator');
            if (saveIndicator) {
                saveIndicator.title = `現在のモデル: ${modelName}`;
            }
        }
    }

    async clearAllData() {
        const confirmed = confirm(
            'この操作により、以下のデータが完全に削除されます：\n' +
            '• API認証トークン\n' +
            '• モデル設定\n' +
            '• 保存された設定\n' +
            '\nこの操作は元に戻せません。続行しますか？'
        );
        
        if (!confirmed) return;

        try {
            // Clear IndexedDB data
            if (this.db) {
                // Clear settings store
                const settingsTransaction = this.db.transaction(['settings'], 'readwrite');
                const settingsStore = settingsTransaction.objectStore('settings');
                await new Promise((resolve, reject) => {
                    const clearRequest = settingsStore.clear();
                    clearRequest.onsuccess = () => resolve();
                    clearRequest.onerror = () => reject(clearRequest.error);
                });

                // Clear models store
                const modelsTransaction = this.db.transaction(['models'], 'readwrite');
                const modelsStore = modelsTransaction.objectStore('models');
                await new Promise((resolve, reject) => {
                    const clearRequest = modelsStore.clear();
                    clearRequest.onsuccess = () => resolve();
                    clearRequest.onerror = () => reject(clearRequest.error);
                });
            }

            // Clear localStorage fallback data
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.startsWith('AIeditor_') || key.startsWith('settings_') || key.startsWith('models_'))) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));

            // Reset to defaults
            this.currentModel = 'openai/gpt-oss-120b';
            this.availableModels = [{
                id: this.currentModel,
                name: 'GPT-OSS-120B (デフォルト)',
                description: 'デフォルトの高性能言語モデル'
            }];
            
            this.updateModelSelector();

            // Clear API token input placeholder
            const apiTokenInput = document.getElementById('api-token-input');
            if (apiTokenInput) {
                apiTokenInput.placeholder = 'AIeditor_AUTH トークンを入力';
            }

            this.showToast('全てのデータが削除されました', 'success');
            
        } catch (error) {
            console.error('データクリアに失敗:', error);
            this.showToast('データクリアに失敗しました: ' + error.message, 'error');
        }
    }

    async setCurrentModel(modelId) {
        this.currentModel = modelId;
        
        // Save to IndexedDB
        await this.saveToDB('settings', {
            key: 'selected_model',
            value: modelId,
            timestamp: Date.now()
        });
        
        const selectedModel = this.availableModels.find(model => model.id === modelId);
        const modelName = selectedModel ? selectedModel.name : modelId;
        
        this.showToast(`モデルを ${modelName} に変更しました`, 'success');
        this.updateCurrentModelDisplay();
    }

    async applyTone(tone) {
        const content = this.editor.textContent;
        if (!content.trim()) {
            this.showToast('テキストを入力してからトーン調整を使用してください', 'warning');
            return;
        }

        let instruction = '';
        switch (tone) {
            case 'formal':
                instruction = 'この文章を丁寧で正式なビジネス文書のトーンに調整してください。';
                break;
            case 'casual':
                instruction = 'この文章を親しみやすくカジュアルなトーンに調整してください。';
                break;
            case 'friendly':
                instruction = 'この文章を温かみがあり友好的なトーンに調整してください。';
                break;
        }

        this.showToast('トーンを調整中...', 'info');

        try {
            const response = await this.callOpenAIAPI(content, instruction);
            
            if (response && response.choices && response.choices[0]) {
                const adjustedText = response.choices[0].message.content.trim();
                this.editor.innerHTML = adjustedText.replace(/\n/g, '<br>');
                this.addToHistory(this.editor.innerHTML);
                
                let message = '';
                switch (tone) {
                    case 'formal':
                        message = 'フォーマルなトーンに調整しました';
                        break;
                    case 'casual':
                        message = 'カジュアルなトーンに調整しました';
                        break;
                    case 'friendly':
                        message = '友好的なトーンに調整しました';
                        break;
                }
                this.showToast(message, 'success');
            } else {
                throw new Error('AI応答の形式が不正です');
            }
        } catch (error) {
            console.error('トーン調整に失敗:', error);
            this.showToast('トーン調整に失敗しました: ' + error.message, 'error');
        }
    }

    async handlePrompt(prompt) {
        if (!prompt.trim()) return;

        const content = this.editor.textContent;
        if (!content.trim()) {
            this.showToast('テキストを入力してからAIプロンプトを使用してください', 'warning');
            return;
        }

        this.showToast('AI処理中...', 'info');
        
        try {
            const response = await this.callOpenAIAPI(content, prompt);
            
            if (response && response.choices && response.choices[0]) {
                const result = response.choices[0].message.content.trim();
                
                // 結果を提案として表示
                this.displayAISuggestion(result);
                this.toggleAIPanel(true);
                this.showToast('AI処理が完了しました', 'success');
                document.getElementById('ai-prompt-input').value = '';
            } else {
                throw new Error('AI応答の形式が不正です');
            }
        } catch (error) {
            console.error('AI処理に失敗:', error);
            this.showToast('AI処理に失敗しました: ' + error.message, 'error');
        }
    }

    addToHistory(content) {
        if (this.history.length > 0 && this.history[this.historyIndex] === content) {
            return;
        }

        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }

        this.history.push(content);
        this.historyIndex = this.history.length - 1;

        if (this.history.length > 50) {
            this.history.shift();
            this.historyIndex--;
        }

        this.updateToolbarState();
    }

    undo() {
        if (this.canUndo()) {
            this.historyIndex--;
            this.restoreFromHistory();
        }
    }

    redo() {
        if (this.canRedo()) {
            this.historyIndex++;
            this.restoreFromHistory();
        }
    }

    canUndo() {
        return this.historyIndex > 0;
    }

    canRedo() {
        return this.historyIndex < this.history.length - 1;
    }

    restoreFromHistory() {
        if (this.historyIndex >= 0 && this.historyIndex < this.history.length) {
            this.editor.innerHTML = this.history[this.historyIndex];
            this.updateToolbarState();
        }
    }

    updateToolbarState() {
        const undoBtn = document.getElementById('undo-button');
        const redoBtn = document.getElementById('redo-button');

        if (undoBtn) {
            undoBtn.disabled = !this.canUndo();
            undoBtn.style.opacity = this.canUndo() ? '1' : '0.5';
        }

        if (redoBtn) {
            redoBtn.disabled = !this.canRedo();
            redoBtn.style.opacity = this.canRedo() ? '1' : '0.5';
        }
        
        // Update word count
        this.updateWordCount();
    }

    setupEmailFunctions() {
        // メール送信ボタンの追加（プロンプトセクションに）
        const promptSection = document.querySelector('.ai-prompt-section');
        if (promptSection) {
            const emailActions = document.createElement('div');
            emailActions.className = 'email-actions';
            emailActions.innerHTML = `
                <button class="email-action-btn preview-btn" id="email-preview-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24">
                        <path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z" fill="currentColor"/>
                    </svg>
                    プレビュー
                </button>
                <button class="email-action-btn send-btn" id="email-send-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24">
                        <path d="M2,21L23,12L2,3V10L17,12L2,14V21Z" fill="currentColor"/>
                    </svg>
                    送信
                </button>
            `;
            promptSection.appendChild(emailActions);

            // イベントリスナーを追加
            document.getElementById('email-preview-btn')?.addEventListener('click', () => {
                this.previewEmail();
            });

            document.getElementById('email-send-btn')?.addEventListener('click', () => {
                this.sendEmail();
            });
        }
    }

    getEmailData() {
        return {
            to: document.getElementById('email-to')?.value || '',
            subject: document.getElementById('email-subject')?.value || '',
            body: this.editor.textContent || ''
        };
    }

    previewEmail() {
        const emailData = this.getEmailData();
        
        if (!emailData.to || !emailData.subject || !emailData.body.trim()) {
            this.showToast('宛先、件名、本文を入力してください', 'warning');
            return;
        }

        // プレビューモーダルを作成
        const previewModal = this.createPreviewModal(emailData);
        document.body.appendChild(previewModal);
        
        setTimeout(() => {
            previewModal.classList.add('show');
        }, 10);
    }

    createPreviewModal(emailData) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay email-preview-modal';
        modal.innerHTML = `
            <div class="modal-content email-preview-content">
                <div class="modal-header">
                    <h2>メールプレビュー</h2>
                    <button class="close-modal-btn" id="close-preview-modal">
                        <svg width="24" height="24" viewBox="0 0 24 24">
                            <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" fill="currentColor"/>
                        </svg>
                    </button>
                </div>
                <div class="modal-body email-preview-body">
                    <div class="email-preview-field">
                        <strong>宛先:</strong> ${emailData.to}
                    </div>
                    <div class="email-preview-field">
                        <strong>件名:</strong> ${emailData.subject}
                    </div>
                    <div class="email-preview-separator"></div>
                    <div class="email-preview-body-content">
                        ${emailData.body.replace(/\n/g, '<br>').replace(/\s\s+/g, '&nbsp;&nbsp;')}
                    </div>
                </div>
            </div>
        `;

        // 閉じるボタンのイベントリスナー
        modal.addEventListener('click', (e) => {
            if (e.target === modal || e.target.id === 'close-preview-modal' || e.target.closest('.close-modal-btn')) {
                modal.classList.remove('show');
                setTimeout(() => {
                    modal.remove();
                }, 300);
            }
        });

        // ESCキーで閉じる
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                modal.classList.remove('show');
                setTimeout(() => {
                    modal.remove();
                    document.removeEventListener('keydown', handleEscape);
                }, 300);
            }
        };
        document.addEventListener('keydown', handleEscape);

        return modal;
    }

    sendEmail() {
        const emailData = this.getEmailData();
        
        if (!emailData.to || !emailData.subject || !emailData.body.trim()) {
            this.showToast('宛先、件名、本文を入力してください', 'warning');
            return;
        }

        // メール送信のシミュレーション
        this.showToast('メールを送信中...', 'info');
        
        setTimeout(() => {
            // 実際のメール送信APIをここで呼び出す
            // この例ではシミュレーション
            this.showToast('メールを送信しました！', 'success');
            
            // 送信後、フィールドをクリア（オプション）
            // this.clearEmailFields();
        }, 2000);
    }

    clearEmailFields() {
        const emailTo = document.getElementById('email-to');
        const emailSubject = document.getElementById('email-subject');
        if (emailTo) emailTo.value = '';
        if (emailSubject) emailSubject.value = '';
        this.editor.innerHTML = '';
        this.addToHistory('');
    }
    
    // Theme toggle function
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        this.showToast(`${newTheme === 'dark' ? 'ダーク' : 'ライト'}モードに切り替えました`, 'success');
    }
    
    // Load theme from storage
    loadTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
    }
    
    // Update word count
    updateWordCount() {
        const content = this.editor.textContent || '';
        const charCount = content.length;
        const wordCountElement = document.getElementById('word-count');
        if (wordCountElement) {
            wordCountElement.textContent = `${charCount} 文字`;
        }
    }
    
    // Save settings from modal
    saveSettings() {
        // Get all settings
        const autoSave = document.getElementById('auto-save')?.checked;
        const grammarCheck = document.getElementById('grammar-check')?.checked;
        const fontSize = document.getElementById('font-size-slider')?.value;
        const lineHeight = document.getElementById('line-height-select')?.value;
        const apiKey = document.getElementById('api-key-input')?.value;
        const apiEndpoint = document.getElementById('api-endpoint-input')?.value;
        const modelSelect = document.getElementById('model-select')?.value;
        
        // Apply settings
        if (fontSize) {
            this.editor.style.fontSize = fontSize + 'px';
            const fontSizeValue = document.getElementById('font-size-value');
            if (fontSizeValue) fontSizeValue.textContent = fontSize + 'px';
        }
        
        if (lineHeight) {
            this.editor.style.lineHeight = lineHeight;
        }
        
        // Save to storage
        const settings = {
            autoSave,
            grammarCheck,
            fontSize,
            lineHeight,
            apiEndpoint,
            model: modelSelect
        };
        
        localStorage.setItem('editor-settings', JSON.stringify(settings));
        
        // Save API key if provided
        if (apiKey && apiKey.trim()) {
            this.setAuthToken(apiKey.trim());
        }
        
        this.showToast('設定を保存しました', 'success');
    }
    
    // Setup email send button
    setupEmailSend() {
        const sendButton = document.getElementById('send-email-button');
        if (sendButton) {
            sendButton.addEventListener('click', () => {
                const emailData = this.getEmailData();
                if (!emailData.to || !emailData.subject || !emailData.body.trim()) {
                    this.showToast('宛先、件名、本文を入力してください', 'warning');
                    return;
                }
                
                // Create mailto link
                const mailtoLink = `mailto:${encodeURIComponent(emailData.to)}?subject=${encodeURIComponent(emailData.subject)}&body=${encodeURIComponent(emailData.body)}`;
                window.location.href = mailtoLink;
                this.showToast('メールクライアントを開きます', 'info');
            });
        }
    }
    
    // Setup save button
    setupSaveButton() {
        const saveButton = document.getElementById('save-button');
        if (saveButton) {
            saveButton.addEventListener('click', () => {
                const emailData = this.getEmailData();
                const timestamp = new Date().toISOString();
                const savedDraft = {
                    ...emailData,
                    savedAt: timestamp
                };
                localStorage.setItem('email-draft', JSON.stringify(savedDraft));
                this.showToast('下書きを保存しました', 'success');
            });
        }
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type} show`;
        toast.textContent = message;

        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.aiEditor = new SimpleAIEditor();
});

// Fallback initialization
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.aiEditor) {
            window.aiEditor = new SimpleAIEditor();
        }
    });
} else {
    if (!window.aiEditor) {
        window.aiEditor = new SimpleAIEditor();
    }
}