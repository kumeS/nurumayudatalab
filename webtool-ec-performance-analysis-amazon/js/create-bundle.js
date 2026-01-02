const fs = require('fs');
const path = require('path');

console.log('📦 バンドルファイル作成開始...');

const jsDir = __dirname; // 現在のディレクトリ（js/）
const files = [
    'config.js',
    'utils.js',
    'db.js',
    'data.js',
    'charts.js',
    'ui.js',
    'main.js'
];

let bundleContent = `// ========================================
// 静的環境対応バンドルファイル
// Generated: ${new Date().toISOString()}
// ========================================

(function() {
    'use strict';
    
`;

files.forEach(file => {
    const filePath = path.join(jsDir, file);
    console.log(`  読み込み中: ${file}`);
    
    if (!fs.existsSync(filePath)) {
        console.error(`  ❌ ファイルが見つかりません: ${file}`);
        return;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // export/importを削除
    content = content
        // import文をコメントアウト
        .replace(/^import\s+.*?from\s+['"].*?['"];?\s*$/gm, '// $&')
        // export const/let/var/function/class を通常の宣言に変換
        .replace(/^export\s+(const|let|var|function|class|async\s+function)\s+/gm, '$1 ')
        // export default を削除
        .replace(/^export\s+default\s+/gm, '')
        // export { ... } をコメントアウト
        .replace(/^export\s+\{[^}]*\};?\s*$/gm, '// $&')
        // 行頭以外のexport文も処理（複数行の場合）
        .replace(/\nexport\s+(const|let|var|function|class|async\s+function)\s+/g, '\n$1 ')
        .replace(/\nexport\s+default\s+/g, '\n')
        .replace(/\nexport\s+\{[^}]*\};?\s*/g, '\n// $&');
    
    bundleContent += `\n// ========== ${file.toUpperCase()} ==========\n`;
    bundleContent += content;
    bundleContent += '\n';
});

bundleContent += `
})();

console.log('✅ Bundle loaded successfully');
`;

const outputPath = path.join(jsDir, 'bundle-static.js');
fs.writeFileSync(outputPath, bundleContent, 'utf8');

console.log(`✅ バンドルファイル作成完了: ${outputPath}`);
console.log(`   ファイルサイズ: ${(bundleContent.length / 1024).toFixed(2)} KB`);
