// ========== プロジェクト管理モジュール ==========
// プロジェクトの保存、読み込み、管理

let autoSaveTimer = null;
let quickSaveTimer = null;
let isSaving = false;  // 保存操作中フラグ（タイマー競合防止）
const AUTO_SAVE_INTERVAL = 60000; // 60秒（1分）ごとに自動保存
const QUICK_SAVE_DELAY = 2000; // オブジェクト追加後2秒でクイック保存

// isSavingフラグをグローバルに公開（canvas.jsから参照可能に）
window.isSaving = function() { return isSaving; };

// 自動保存を開始
function startAutoSave() {
    if (autoSaveTimer) {
        clearInterval(autoSaveTimer);
    }
    
    autoSaveTimer = setInterval(async () => {
        await autoSaveCurrentProject();
    }, AUTO_SAVE_INTERVAL);
    
    console.log('Auto-save started (every 60 seconds)');
}

// 自動保存を停止
function stopAutoSave() {
    if (autoSaveTimer) {
        clearInterval(autoSaveTimer);
        autoSaveTimer = null;
    }
}

// クイック保存をトリガー（オブジェクト追加・変更時）
function triggerQuickSave() {
    // 既存のタイマーをクリア
    if (quickSaveTimer) {
        clearTimeout(quickSaveTimer);
    }

    // 2秒後に保存（連続した操作をまとめて保存）
    quickSaveTimer = setTimeout(async () => {
        await autoSaveCurrentProject();
    }, QUICK_SAVE_DELAY);
}

// 現在のプロジェクトを自動保存
async function autoSaveCurrentProject() {
    // 既に保存中の場合はスキップ
    if (isSaving) {
        console.log('Save operation already in progress, skipping...');
        return;
    }

    try {
        isSaving = true;  // 保存開始

        const canvasEntries = getCanvasCollection();
        if (!canvasEntries.length) return;

        const hasObjects = canvasEntries.some(entry => entry.canvas && entry.canvas.getObjects().length > 0);
        if (!hasObjects) return;

        const projectId = getCurrentProjectId();
        const existingProject = await loadProject(projectId);

        const projectName = existingProject ? existingProject.name : generateProjectName();
        const activeCanvasId = getActiveCanvasId();

        const projectData = createProjectData(projectId, projectName, canvasEntries, activeCanvasId);
        await saveProject(projectData);

        // 古いプロジェクトを削除
        await cleanupOldProjects();

        // UI更新
        updateProjectListUI();

        // 保存インジケーターを表示
        showSaveIndicator();

    } catch (error) {
        console.error('Auto-save error:', error);
    } finally {
        isSaving = false;  // 保存終了
    }
}

// 手動保存
async function saveCurrentProject(projectName) {
    try {
        const canvasEntries = getCanvasCollection();
        if (!canvasEntries.length) return;
        
        const projectId = getCurrentProjectId();
        const name = projectName || generateProjectName();
        const activeCanvasId = getActiveCanvasId();
        
        const projectData = createProjectData(projectId, name, canvasEntries, activeCanvasId);
        await saveProject(projectData);
        
        // 古いプロジェクトを削除
        await cleanupOldProjects();
        
        // UI更新
        updateProjectListUI();
        
        // 成功フィードバック
        showNotification('プロジェクトを保存しました', 'success');
        
        // 触覚フィードバック
        if (navigator.vibrate) {
            navigator.vibrate([50, 30, 50]);
        }
        
        return projectId;
        
    } catch (error) {
        console.error('Save error:', error);
        showNotification('保存に失敗しました', 'error');
        throw error;
    }
}

// プロジェクトを読み込み
async function loadProjectById(projectId) {
    try {
        const projectData = await loadProject(projectId);
        if (!projectData) {
            showNotification('プロジェクトが見つかりません', 'error');
            resetCanvasWorkspaceToDefault();
            resetCanvasHistory();
            return;
        }
        
        await loadCanvasesFromProjectData(projectData);
        resetCanvasHistory();
        
        // 現在のプロジェクトIDを設定
        setCurrentProjectId(projectId);
        
        // UI更新
        updateProjectListUI();
        hideTextControls();
        hideImageControls();
        
        showNotification(`「${projectData.name}」を読み込みました`, 'success');
        
        // 触覚フィードバック
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
        
    } catch (error) {
        console.error('Load error:', error);
        showNotification('読み込みに失敗しました', 'error');
    }
}

// 新規プロジェクト作成
async function createNewProject() {
    try {
        console.log('[Project] Creating new project...');
        const canvasEntries = getCanvasCollection();

        const hasContent = canvasEntries.some(entry => entry.canvas && entry.canvas.getObjects().length > 0);
        if (hasContent) {
            const confirmSave = confirm('現在のプロジェクトを保存しますか？');
            if (confirmSave) {
                await saveCurrentProject();
            }
        }

        resetCanvasWorkspaceToDefault();
        resetCanvasHistory();

        const newProjectId = generateProjectId();
        setCurrentProjectId(newProjectId);

        updateProjectListUI();
        hideTextControls();
        hideImageControls();

        // プロジェクトメニューを閉じる
        if (typeof closeProjectMenu === 'function') {
            closeProjectMenu();
        }

        showNotification('新しいプロジェクトを作成しました', 'success');

        if (navigator.vibrate) {
            navigator.vibrate(50);
        }

        console.log('[Project] New project created:', newProjectId);

    } catch (error) {
        console.error('Create new project error:', error);
        showNotification('新規作成に失敗しました', 'error');
    }
}

// プロジェクト削除
async function deleteProjectById(projectId) {
    try {
        const projectData = await loadProject(projectId);
        if (!projectData) return;
        
        const confirmDelete = confirm(`「${projectData.name}」を削除しますか？\nこの操作は取り消せません。`);
        if (!confirmDelete) return;
        
        await deleteProject(projectId);
        
        // 現在のプロジェクトを削除した場合は新規作成
        if (getCurrentProjectId() === projectId) {
            await createNewProject();
        } else {
            updateProjectListUI();
        }
        
        showNotification('プロジェクトを削除しました', 'success');
        
        // 触覚フィードバック
        if (navigator.vibrate) {
            navigator.vibrate([50, 50, 50]);
        }
        
    } catch (error) {
        console.error('Delete error:', error);
        showNotification('削除に失敗しました', 'error');
    }
}

// プロジェクト名を変更
async function renameProject(projectId, newName) {
    try {
        const projectData = await loadProject(projectId);
        if (!projectData) return;
        
        projectData.name = newName;
        projectData.updatedAt = Date.now();
        
        await saveProject(projectData);
        updateProjectListUI();
        
        showNotification('プロジェクト名を変更しました', 'success');
        
    } catch (error) {
        console.error('Rename error:', error);
        showNotification('名前変更に失敗しました', 'error');
    }
}

// プロジェクトリストUIを更新
async function updateProjectListUI() {
    try {
        const projects = await getAllProjects();
        const currentId = getCurrentProjectId();
        
        const listContainer = document.getElementById('projectList');
        if (!listContainer) return;
        
        listContainer.innerHTML = '';

        if (projects.length === 0) {
            // 静的コンテンツもDOMPurifyでサニタイズ
            listContainer.innerHTML = DOMPurify.sanitize('<div class="no-projects">プロジェクトがありません</div>');
            return;
        }
        
        projects.forEach(project => {
            const item = document.createElement('div');
            item.className = 'project-item' + (project.id === currentId ? ' active' : '');

            const date = new Date(project.updatedAt);
            const dateStr = date.toLocaleDateString('ja-JP', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            // DOMPurifyでサニタイズしてXSS対策（onclick属性は削除されるため後でイベントリスナーを追加）
            item.innerHTML = DOMPurify.sanitize(`
                <div class="project-thumbnail">
                    <img src="${escapeHtml(project.thumbnail)}" alt="${escapeHtml(project.name)}">
                </div>
                <div class="project-info">
                    <div class="project-name">${escapeHtml(project.name)}</div>
                    <div class="project-date">${escapeHtml(dateStr)}</div>
                </div>
                <div class="project-actions">
                    <button class="btn-icon-small btn-load-project" data-project-id="${escapeHtml(project.id)}" title="読み込む">
                        <i class="fas fa-folder-open"></i>
                    </button>
                    <button class="btn-icon-small btn-delete-project" data-project-id="${escapeHtml(project.id)}" title="削除">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `, { ADD_ATTR: ['data-project-id'] });

            // イベントリスナーを追加（DOMPurifyがonclick属性を削除するため）
            const loadBtn = item.querySelector('.btn-load-project');
            if (loadBtn) {
                loadBtn.addEventListener('click', () => loadProjectById(project.id));
            }

            const deleteBtn = item.querySelector('.btn-delete-project');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => deleteProjectById(project.id));
            }

            listContainer.appendChild(item);
        });
        
        // プロジェクト数を表示
        const countElement = document.getElementById('projectCount');
        if (countElement) {
            countElement.textContent = `${projects.length} / ${MAX_PROJECTS}`;
        }
        
    } catch (error) {
        console.error('Update project list error:', error);
    }
}

// 保存インジケーターを表示
function showSaveIndicator() {
    const indicator = document.getElementById('saveIndicator');
    if (!indicator) return;
    
    indicator.classList.add('show');
    
    setTimeout(() => {
        indicator.classList.remove('show');
    }, 1000);
}

// 通知を表示
let currentLoadingNotification = null;

function showNotification(message, type = 'info', options = {}) {
    const { duration = 3000, loading = false } = options;

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;

    // ローディングアイコンまたは通常のアイコン
    const iconClass = loading
        ? 'fa-spinner fa-spin'
        : type === 'success' ? 'fa-check-circle'
        : type === 'error' ? 'fa-exclamation-circle'
        : 'fa-info-circle';

    // DOMPurifyでサニタイズしてXSS対策
    notification.innerHTML = DOMPurify.sanitize(`
        <i class="fas ${iconClass}"></i>
        <span>${escapeHtml(message)}</span>
    `);

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    // duration が Infinity の場合は自動削除しない（ローディング表示用）
    if (duration !== Infinity) {
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentElement) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, duration);
    } else {
        // ローディング通知を保存（後で削除するため）
        currentLoadingNotification = notification;
    }

    return notification;
}

// ローディング通知を非表示にする
function hideLoadingNotification() {
    if (currentLoadingNotification) {
        currentLoadingNotification.classList.remove('show');
        setTimeout(() => {
            if (currentLoadingNotification && currentLoadingNotification.parentElement) {
                document.body.removeChild(currentLoadingNotification);
            }
            currentLoadingNotification = null;
        }, 300);
    }
}

// HTMLエスケープ
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 初回読み込み時にプロジェクトを復元
async function restoreLastProject() {
    try {
        const projectId = getCurrentProjectId();
        const projectData = await loadProject(projectId);
        
        if (projectData && (projectData.canvasData || (projectData.canvases && projectData.canvases.length))) {
            await loadCanvasesFromProjectData(projectData);
            resetCanvasHistory();
            // ★Bug14修正: fitCanvasToContainer()の呼び出しを削除
            // loadCanvasesFromProjectData()が既にズームを正しく復元しているため、
            // ここでfitを呼ぶとズームが上書きされてしまう（Bug13の修正を参照）
            console.log('Last project restored:', projectData.name);
            showNotification(`「${projectData.name}」を復元しました`, 'success');
        } else {
            resetCanvasWorkspaceToDefault();
            resetCanvasHistory();
        }
        
        updateProjectListUI();
        
    } catch (error) {
        console.error('Restore error:', error);
        // エラーは表示しない（初回起動時はプロジェクトがないため）
    }
}
