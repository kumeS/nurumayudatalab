/**
 * Storage Migration - LocalStorage → IndexedDB マイグレーション
 * 既存のLocalStorageデータをIndexedDBに移行
 */

class StorageMigration {
    constructor() {
        this.migrated = false;
    }

    /**
     * LocalStorageからIndexedDBへ自動マイグレーション
     * @returns {Promise<Object>} マイグレーション結果
     */
    async autoMigrate() {
        try {
            // 既にマイグレーション済みかチェック
            const migrationFlag = localStorage.getItem('indexeddb_migrated');
            if (migrationFlag === 'true') {
                console.log('✅ Already migrated to IndexedDB');
                return { success: true, alreadyMigrated: true };
            }

            console.log('🔄 Starting LocalStorage → IndexedDB migration...');

            // LocalStorageからワークフローを読み込み
            const workflows = JSON.parse(localStorage.getItem('workflows') || '[]');

            if (workflows.length === 0) {
                console.log('ℹ️ No workflows to migrate');
                localStorage.setItem('indexeddb_migrated', 'true');
                return { success: true, workflowCount: 0 };
            }

            console.log(`📦 Found ${workflows.length} workflows in LocalStorage`);

            // IndexedDBが利用可能か確認
            if (!window.indexedDBStorage) {
                console.error('❌ IndexedDB storage not available');
                return { success: false, error: 'IndexedDB not available' };
            }

            await window.indexedDBStorage.waitReady();

            // 各ワークフローをIndexedDBに移行
            let successCount = 0;
            let failedCount = 0;
            let totalImages = 0;

            for (const workflow of workflows) {
                try {
                    // 画像数をカウント
                    const imageCount = (workflow.nodes || []).reduce((sum, node) => {
                        return sum + (node.images ? node.images.length : 0);
                    }, 0);
                    totalImages += imageCount;

                    console.log(`  Migrating: ${workflow.name} (${imageCount} images)`);

                    const success = await window.indexedDBStorage.saveWorkflow(workflow);
                    if (success) {
                        successCount++;
                        console.log(`  ✅ Migrated: ${workflow.name}`);
                    } else {
                        failedCount++;
                        console.error(`  ❌ Failed: ${workflow.name}`);
                    }
                } catch (error) {
                    failedCount++;
                    console.error(`  ❌ Error migrating ${workflow.name}:`, error);
                }
            }

            // マイグレーション完了フラグを設定
            localStorage.setItem('indexeddb_migrated', 'true');

            const result = {
                success: true,
                workflowCount: workflows.length,
                successCount,
                failedCount,
                totalImages,
                message: `✅ Migration complete: ${successCount}/${workflows.length} workflows migrated`
            };

            console.log('🎉 Migration complete!');
            console.log(`   Workflows: ${successCount}/${workflows.length}`);
            console.log(`   Total images: ${totalImages}`);

            // ストレージ情報を表示
            const info = await window.indexedDBStorage.getStorageInfo();
            console.log(`📊 IndexedDB: ${info.imageCount} images, ${info.totalImageSizeMB} MB`);

            // マイグレーション成功を通知
            if (successCount > 0) {
                this.showMigrationNotification(result);
            }

            return result;
        } catch (error) {
            console.error('❌ Migration failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * マイグレーション成功通知を表示
     * @param {Object} result - マイグレーション結果
     */
    showMigrationNotification(result) {
        const message = `
📦 ストレージをアップグレードしました！

✅ ${result.successCount}個のワークフローを移行
📷 ${result.totalImages}枚の画像を保存
💾 IndexedDBで大容量対応になりました

今後は数百MBの画像を保存できます。
        `.trim();

        console.log('\n' + '='.repeat(50));
        console.log(message);
        console.log('='.repeat(50) + '\n');

        // ユーザーに通知（オプション）
        if (result.totalImages > 0) {
            setTimeout(() => {
                const confirmed = confirm(
                    `ストレージをアップグレードしました！\n\n` +
                    `✅ ${result.successCount}個のワークフロー\n` +
                    `📷 ${result.totalImages}枚の画像\n\n` +
                    `IndexedDBで大容量保存に対応しました。\n` +
                    `古いLocalStorageデータを削除しますか？`
                );

                if (confirmed) {
                    this.cleanupLocalStorage();
                }
            }, 1000);
        }
    }

    /**
     * LocalStorageのワークフローデータをクリーンアップ
     * @returns {boolean}
     */
    cleanupLocalStorage() {
        try {
            const workflows = JSON.parse(localStorage.getItem('workflows') || '[]');
            const beforeSize = JSON.stringify(workflows).length;

            // 画像を除外した軽量版を保存
            const lightWorkflows = workflows.map(workflow => ({
                ...workflow,
                nodes: (workflow.nodes || []).map(node => ({
                    ...node,
                    images: [] // 画像を削除
                }))
            }));

            localStorage.setItem('workflows', JSON.stringify(lightWorkflows));

            const afterSize = JSON.stringify(lightWorkflows).length;
            const savedKB = ((beforeSize - afterSize) / 1024).toFixed(1);

            console.log(`🧹 LocalStorage cleanup complete`);
            console.log(`   Freed: ${savedKB} KB`);

            alert(`LocalStorageを ${savedKB} KB 削減しました！\n\nIndexedDBで画像は安全に保存されています。`);
            return true;
        } catch (error) {
            console.error('❌ Cleanup failed:', error);
            return false;
        }
    }

    /**
     * マイグレーションステータスを確認
     * @returns {Promise<Object>}
     */
    async checkStatus() {
        const migrated = localStorage.getItem('indexeddb_migrated') === 'true';

        let indexedDBInfo = { workflowCount: 0, imageCount: 0, totalImageSizeMB: '0.00' };
        if (window.indexedDBStorage) {
            await window.indexedDBStorage.waitReady();
            indexedDBInfo = await window.indexedDBStorage.getStorageInfo();
        }

        const localStorageWorkflows = JSON.parse(localStorage.getItem('workflows') || '[]');
        const localStorageSize = JSON.stringify(localStorageWorkflows).length;

        return {
            migrated,
            indexedDB: indexedDBInfo,
            localStorage: {
                workflowCount: localStorageWorkflows.length,
                sizeKB: (localStorageSize / 1024).toFixed(1)
            }
        };
    }

    /**
     * 手動でマイグレーションをリセット（デバッグ用）
     */
    resetMigration() {
        localStorage.removeItem('indexeddb_migrated');
        console.log('🔄 Migration flag reset');
    }
}

// グローバルインスタンス
window.storageMigration = new StorageMigration();

// ページロード時に自動マイグレーションを実行
window.addEventListener('load', async () => {
    try {
        await window.storageMigration.autoMigrate();
    } catch (error) {
        console.error('❌ Auto-migration failed:', error);
    }
});

console.log('🔄 Storage Migration loaded');
