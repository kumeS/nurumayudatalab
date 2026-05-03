/**
 * Template Manager Component
 * Manages email templates
 */
class TemplateManager {
    constructor(options = {}) {
        this.container = options.container;
        this.onTemplateSelect = options.onTemplateSelect || (() => {});
        
        this.templates = [];
        
        this.init();
    }

    init() {
        if (!this.container) {
            console.warn('TemplateManager: No container provided');
            return;
        }
        
        this.setupEventListeners();
        this.loadTemplates();
    }

    setupEventListeners() {
        // Template item clicks
        this.container.addEventListener('click', (e) => {
            const templateItem = e.target.closest('.template-item');
            if (templateItem) {
                const templateId = templateItem.dataset.template;
                const template = this.templates.find(t => t.id === templateId);
                if (template) {
                    this.onTemplateSelect(template);
                }
            }
        });
    }

    loadTemplates() {
        // Load user-created templates from storage
        const savedTemplates = localStorage.getItem('user_email_templates');
        if (savedTemplates) {
            try {
                this.templates = JSON.parse(savedTemplates);
            } catch (error) {
                console.error('Error loading saved templates:', error);
                this.templates = [];
            }
        } else {
            this.templates = [];
        }
        
        this.renderTemplates();
    }

    renderTemplates() {
        const container = this.container.querySelector('.templates-list');
        if (!container) return;

        container.innerHTML = this.templates.map(template => `
            <button class="template-item" data-template="${template.id}">
                <span class="template-name">${template.name}</span>
                <span class="template-desc">${template.description}</span>
            </button>
        `).join('');
    }

    addTemplate(template) {
        this.templates.push(template);
        this.renderTemplates();
        this.saveTemplates();
    }

    removeTemplate(templateId) {
        this.templates = this.templates.filter(t => t.id !== templateId);
        this.renderTemplates();
        this.saveTemplates();
    }
    
    saveTemplates() {
        localStorage.setItem('user_email_templates', JSON.stringify(this.templates));
    }
}

export default TemplateManager;
