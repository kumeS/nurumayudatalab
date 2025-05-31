/**
 * PDF出力機能モジュール
 * 他のシステムに転用可能なPDF生成機能
 */

/**
 * レポートのPDFエクスポート（メイン関数）
 * @param {Object} report - レポートオブジェクト
 * @param {Object} options - オプション設定
 */
function exportReportPDF(report, options = {}) {
  try {
    // Chrome/Chromiumベースブラウザの場合は印刷機能を優先
    if (window.chrome || navigator.userAgent.includes('Chrome')) {
      generatePrintablePDF(report, options);
      return;
    }
    
    // フォールバック: HTMLファイルとしてダウンロード
    generateHTMLReport(report, options);
    
  } catch (error) {
    console.error('PDF生成エラー:', error);
    if (options.onError) {
      options.onError(error);
    } else {
      alert('PDF生成に失敗したため、HTMLファイルとしてダウンロードします');
    }
    generateHTMLReport(report, options);
  }
}

/**
 * ブラウザの印刷機能を利用したPDF生成
 * @param {Object} report - レポートオブジェクト
 * @param {Object} options - オプション設定
 */
function generatePrintablePDF(report, options = {}) {
  // 新しいウィンドウを作成
  const printWindow = window.open('', '_blank');
  
  // HTMLコンテンツを作成
  const htmlContent = formatReportForPrint(report, options);
  
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  
  // スタイルが適用されるまで少し待つ
  setTimeout(() => {
    printWindow.print();
    
    if (options.onSuccess) {
      options.onSuccess('印刷ダイアログを開きました');
    } else {
      alert('印刷ダイアログを開きました。「PDFとして保存」を選択してください');
    }
    
    // 印刷後にウィンドウを閉じる
    setTimeout(() => {
      printWindow.close();
    }, 1000);
  }, 500);
}

/**
 * HTMLファイルとしてダウンロード
 * @param {Object} report - レポートオブジェクト
 * @param {Object} options - オプション設定
 */
function generateHTMLReport(report, options = {}) {
  const htmlContent = formatReportForPrint(report, options);
  
  const date = new Date(report.timestamp || Date.now());
  const dateStr = date.toISOString().split('T')[0];
  const filename = options.filename || `report_${report.studentName || 'document'}_${dateStr}.html`;
  
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  if (options.onSuccess) {
    options.onSuccess('HTMLファイルでダウンロードしました');
  } else {
    alert('レポートをHTMLファイルでダウンロードしました');
  }
}

/**
 * レポートを印刷用HTMLに整形
 * @param {Object} report - レポートオブジェクト
 * @param {Object} options - オプション設定
 */
function formatReportForPrint(report, options = {}) {
  const date = new Date(report.timestamp || Date.now());
  const dateStr = date.toLocaleDateString('ja-JP');
  
  // マークダウンをHTMLに変換
  const htmlContent = convertMarkdownToHTML(report.content || '');
  
  // カスタムスタイルの適用
  const customStyles = options.customStyles || '';
  const headerContent = options.headerContent || report.title || 'レポート';
  const footerContent = options.footerContent || `
    <p><strong>作成日:</strong> ${dateStr}</p>
    <p><strong>作成者:</strong> ${options.createdBy || 'システム'}</p>
  `;
  
  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${headerContent}</title>
  <style>
    @media print {
      @page {
        margin: ${options.printMargin || '20mm'};
        size: ${options.pageSize || 'A4'};
      }
    }
    
    body {
      font-family: '${options.fontFamily || 'Hiragino Sans, Hiragino Kaku Gothic ProN, Yu Gothic, Meiryo, sans-serif'}';
      line-height: ${options.lineHeight || '1.8'};
      color: ${options.textColor || '#333'};
      max-width: ${options.maxWidth || '800px'};
      margin: 0 auto;
      padding: ${options.bodyPadding || '20px'};
      background: white;
    }
    
    h1 {
      color: ${options.h1Color || '#4f46e5'};
      border-bottom: 3px solid ${options.h1Color || '#4f46e5'};
      padding-bottom: 10px;
      font-size: ${options.h1Size || '24px'};
      margin-bottom: 30px;
    }
    
    h2 {
      color: ${options.h2Color || '#7c3aed'};
      border-left: 4px solid ${options.h2Color || '#7c3aed'};
      padding-left: 15px;
      font-size: ${options.h2Size || '20px'};
      margin: 25px 0 15px 0;
      background: ${options.h2Background || 'rgba(124, 58, 237, 0.05)'};
      padding: 10px 15px;
      border-radius: 8px;
    }
    
    h3 {
      color: ${options.h3Color || '#059669'};
      font-size: ${options.h3Size || '16px'};
      margin: 20px 0 10px 0;
      padding: 8px 12px;
      background: ${options.h3Background || 'rgba(5, 150, 105, 0.1)'};
      border-radius: 5px;
      border-left: 3px solid ${options.h3Color || '#059669'};
    }
    
    p {
      margin-bottom: 15px;
      line-height: ${options.lineHeight || '1.8'};
    }
    
    ul, ol {
      margin: 15px 0;
      padding-left: 25px;
    }
    
    li {
      margin-bottom: 8px;
      line-height: 1.6;
    }
    
    strong {
      color: ${options.strongColor || '#e11d48'};
      font-weight: 600;
    }
    
    .report-header {
      text-align: center;
      margin-bottom: 40px;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 20px;
    }
    
    .report-meta {
      text-align: right;
      color: #6b7280;
      font-size: 14px;
      margin-top: 30px;
      border-top: 1px solid #e5e7eb;
      padding-top: 15px;
    }
    
    .section {
      margin-bottom: 30px;
    }
    
    hr {
      border: none;
      height: 2px;
      background: linear-gradient(to right, #e5e7eb, #6b7280, #e5e7eb);
      margin: 20px 0;
    }
    
    @media print {
      body {
        margin: 0;
        padding: 0;
        box-shadow: none;
      }
      
      .no-print {
        display: none;
      }
    }
    
    ${customStyles}
  </style>
</head>
<body>
  <div class="report-header">
    <h1>${headerContent}</h1>
  </div>
  
  <div class="report-content">
    ${htmlContent}
  </div>
  
  <div class="report-meta">
    ${footerContent}
  </div>
  
  <div class="no-print" style="margin-top: 30px; text-align: center; color: #6b7280;">
    <p>このページを印刷する際は、ブラウザの印刷設定で「PDFとして保存」を選択してください。</p>
  </div>
</body>
</html>`;
}

/**
 * マークダウンをHTMLに変換（改良版）
 * @param {string} markdown - マークダウンテキスト
 * @param {Object} options - 変換オプション
 */
function convertMarkdownToHTML(markdown, options = {}) {
  if (!markdown) return '';
  
  // 行ごとに処理
  const lines = markdown.split('\n');
  const processed = [];
  let inList = false;
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // 空行の処理
    if (line.trim() === '') {
      if (inList) {
        processed.push('</ul>');
        inList = false;
      }
      processed.push('');
      continue;
    }
    
    // 区切り線（━も含む）
    if (line.trim() === '---' || line.trim().match(/^━+$/)) {
      if (inList) {
        processed.push('</ul>');
        inList = false;
      }
      processed.push('<hr>');
      continue;
    }
    
    // ヘッダーの処理（**で囲まれた絵文字付きタイトル）
    const boldTitleMatch = line.match(/^(🌸|📚|🏠|🌟|💌|💝|📝|🌱|🤝|📞|✨|📈|📖|💝|📋|[🎯🔍📊💡🌈🎨🚀⭐🌱💎🔥🎪🎭🎯]) \*\*(.*?)\*\*$/);
    if (boldTitleMatch) {
      if (inList) {
        processed.push('</ul>');
        inList = false;
      }
      processed.push(`<h2 style="color: #1f2937; margin-top: 25px; margin-bottom: 15px; font-size: 1.4em;">${boldTitleMatch[1]} ${boldTitleMatch[2]}</h2>`);
      continue;
    }
    
    // サブヘッダー（**で囲まれた絵文字なしタイトル）
    const boldSubTitleMatch = line.match(/^\*\*(.*?)\*\*$/);
    if (boldSubTitleMatch && !line.includes('：') && !line.includes(':')) {
      if (inList) {
        processed.push('</ul>');
        inList = false;
      }
      processed.push(`<h3 style="color: #374151; margin-top: 15px; margin-bottom: 10px; font-size: 1.2em;">${boldSubTitleMatch[1]}</h3>`);
      continue;
    }
    
    // 旧形式のヘッダーも念のため対応
    if (line.startsWith('### ')) {
      if (inList) {
        processed.push('</ul>');
        inList = false;
      }
      processed.push(`<h2 style="color: #1f2937; margin-top: 25px; margin-bottom: 15px; font-size: 1.4em;">${line.substring(4)}</h2>`);
      continue;
    }
    
    if (line.startsWith('#### ')) {
      if (inList) {
        processed.push('</ul>');
        inList = false;
      }
      processed.push(`<h3 style="color: #374151; margin-top: 15px; margin-bottom: 10px; font-size: 1.2em;">${line.substring(5)}</h3>`);
      continue;
    }
    
    // リストの処理（・も含む）
    if (line.startsWith('- ') || line.startsWith('・')) {
      if (!inList) {
        processed.push('<ul style="margin: 10px 0; padding-left: 20px;">');
        inList = true;
      }
      // 太字の変換も含める
      const listContent = line.startsWith('- ') ? 
        line.substring(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') :
        line.substring(1).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      processed.push(`<li style="margin: 5px 0;">${listContent}</li>`);
      continue;
    }
    
    // リストが終了
    if (inList && !line.startsWith('- ') && !line.startsWith('・')) {
      processed.push('</ul>');
      inList = false;
    }
    
    // 通常のテキスト行（太字変換も含める）
    if (line.trim() !== '') {
      const processedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      processed.push(`<p>${processedLine}</p>`);
    }
  }
  
  // 最後にリストが開いている場合は閉じる
  if (inList) {
    processed.push('</ul>');
  }
  
  return processed.join('\n');
}

/**
 * 複数レポートの一括PDF生成
 * @param {Array} reports - レポート配列
 * @param {Object} options - オプション設定
 */
function exportMultipleReportsPDF(reports, options = {}) {
  if (!reports || reports.length === 0) {
    if (options.onError) {
      options.onError(new Error('レポートが指定されていません'));
    }
    return;
  }
  
  // 複数レポートを統合
  const combinedReport = {
    title: options.combinedTitle || '統合レポート',
    content: reports.map((report, index) => {
      return `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🌸 **${report.title || `レポート ${index + 1}`}**\n\n${report.content || ''}\n\n`;
    }).join(''),
    timestamp: Date.now(),
    studentName: options.studentName || 'multiple'
  };
  
  exportReportPDF(combinedReport, {
    ...options,
    filename: options.filename || `combined_reports_${new Date().toISOString().split('T')[0]}.html`
  });
}

/**
 * カスタムテンプレートを使用したPDF生成
 * @param {Object} data - データオブジェクト
 * @param {string} template - HTMLテンプレート
 * @param {Object} options - オプション設定
 */
function exportCustomTemplatePDF(data, template, options = {}) {
  // テンプレート内の変数を置換
  let htmlContent = template;
  
  // データの各プロパティを置換
  Object.keys(data).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    htmlContent = htmlContent.replace(regex, data[key] || '');
  });
  
  // 日付の置換
  const now = new Date();
  htmlContent = htmlContent.replace(/{{currentDate}}/g, now.toLocaleDateString('ja-JP'));
  htmlContent = htmlContent.replace(/{{currentDateTime}}/g, now.toLocaleString('ja-JP'));
  
  const report = {
    title: data.title || 'カスタムレポート',
    content: htmlContent,
    timestamp: now.getTime(),
    studentName: data.studentName || 'custom'
  };
  
  exportReportPDF(report, options);
}

// エクスポート（Node.js環境対応）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    exportReportPDF,
    generatePrintablePDF,
    generateHTMLReport,
    formatReportForPrint,
    convertMarkdownToHTML,
    exportMultipleReportsPDF,
    exportCustomTemplatePDF
  };
}

// ブラウザ環境での使用例
/*
// 基本的な使用方法
const report = {
  title: 'サンプルレポート',
  content: '🌸 **学習状況**\n\n・算数の理解度が向上しています。\n・宿題も継続的に頑張っています。',
  timestamp: Date.now(),
  studentName: '田中太郎'
};

exportReportPDF(report);

// オプション付き使用方法
exportReportPDF(report, {
  filename: 'custom_report.html',
  fontFamily: 'Arial, sans-serif',
  h1Color: '#2563eb',
  customStyles: '.custom-class { color: red; }',
  onSuccess: (message) => console.log(message),
  onError: (error) => console.error(error)
});

// 複数レポートの統合
const reports = [report1, report2, report3];
exportMultipleReportsPDF(reports, {
  combinedTitle: '月次統合レポート',
  filename: 'monthly_report.html'
});
*/ 