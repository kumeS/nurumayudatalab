const { chromium } = require('playwright');
const path = require('path');

async function testSessionRestore() {
  console.log('=== DIY アシスタント セッション復元テスト ===');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // file://プロトコルでHTMLファイルを開く
  const filePath = path.resolve(__dirname, 'index.html');
  const fileUrl = `file://${filePath}`;
  
  console.log(`File URL: ${fileUrl}`);
  
  try {
    // ページを読み込み
    await page.goto(fileUrl);
    console.log('✅ ページ読み込み完了');
    
    // ページタイトル確認
    const title = await page.title();
    console.log(`📄 ページタイトル: ${title}`);
    
    // 初期化完了まで待機
    await page.waitForTimeout(3000);
    
    // コンソールエラーをキャッチ
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`❌ Console Error: ${msg.text()}`);
      }
    });
    
    // ページエラーをキャッチ
    page.on('pageerror', error => {
      console.log(`❌ Page Error: ${error.message}`);
    });
    
    // DOM要素の存在確認
    const elements = [
      'threeContainer',
      'designPrompt', 
      'widthParam',
      'depthParam',
      'heightParam',
      'generateBtn'
    ];
    
    for (const elementId of elements) {
      const element = await page.$(`#${elementId}`);
      if (element) {
        console.log(`✅ ${elementId} 要素が見つかりました`);
      } else {
        console.log(`❌ ${elementId} 要素が見つかりません`);
      }
    }
    
    // JavaScript エラーの確認
    const jsErrors = await page.evaluate(() => {
      const errors = [];
      
      // Three.js ライブラリチェック
      if (typeof THREE === 'undefined') {
        errors.push('Three.js ライブラリが読み込まれていません');
      } else {
        console.log(`Three.js version: ${THREE.REVISION}`);
      }
      
      // OBJLoader チェック
      if (typeof THREE?.OBJLoader === 'undefined') {
        errors.push('OBJLoader が読み込まれていません');
      }
      
      // OrbitControls チェック
      if (typeof THREE?.OrbitControls === 'undefined') {
        errors.push('OrbitControls が読み込まれていません');
      }
      
      // DIY Assistant インスタンスチェック
      if (typeof window.diyAssistant === 'undefined') {
        errors.push('DIY Assistant インスタンスが作成されていません');
      }
      
      return errors;
    });
    
    if (jsErrors.length === 0) {
      console.log('✅ JavaScript初期化エラーなし');
    } else {
      console.log('❌ JavaScript エラー検出:');
      jsErrors.forEach(error => console.log(`   - ${error}`));
    }
    
    // ローカルストレージの状態確認
    const localStorageState = await page.evaluate(() => {
      const keys = Object.keys(localStorage);
      const diyKeys = keys.filter(key => key.startsWith('diy_'));
      return {
        totalKeys: keys.length,
        diyKeys: diyKeys,
        hasProjects: localStorage.getItem('diy_projects') !== null,
        hasCurrentSession: localStorage.getItem('diy_current_session') !== null,
        hasInputSession: localStorage.getItem('diy_input_session') !== null
      };
    });
    
    console.log('📦 ローカルストレージ状態:');
    console.log(`   Total keys: ${localStorageState.totalKeys}`);
    console.log(`   DIY keys: ${localStorageState.diyKeys.join(', ')}`);
    console.log(`   Projects: ${localStorageState.hasProjects ? '✅' : '❌'}`);
    console.log(`   Current Session: ${localStorageState.hasCurrentSession ? '✅' : '❌'}`);
    console.log(`   Input Session: ${localStorageState.hasInputSession ? '✅' : '❌'}`);
    
    // セッション復元ログの確認
    const sessionLogs = await page.evaluate(() => {
      if (window.diyAssistant && window.diyAssistant.logHistory) {
        return window.diyAssistant.logHistory
          .filter(log => log.message.includes('セッション'))
          .map(log => `[${log.level}] ${log.message}`);
      }
      return [];
    });
    
    console.log('📜 セッション復元ログ:');
    if (sessionLogs.length > 0) {
      sessionLogs.forEach(log => console.log(`   ${log}`));
    } else {
      console.log('   ログなし');
    }
    
    // スクリーンショット撮影
    await page.screenshot({ path: 'session_restore_test.png', fullPage: true });
    console.log('📸 スクリーンショット保存: session_restore_test.png');
    
    // テスト用のサンプルデータを入力してセッション作成
    console.log('🔧 テスト用セッション作成中...');
    
    await page.fill('#designPrompt', 'シンプルな木製の椅子');
    await page.fill('#widthParam', '40');
    await page.fill('#depthParam', '40'); 
    await page.fill('#heightParam', '80');
    
    await page.waitForTimeout(1000);
    
    // 入力後のセッション状態確認
    const inputSessionState = await page.evaluate(() => {
      return {
        inputSession: localStorage.getItem('diy_input_session'),
        prompt: localStorage.getItem('diy_prompt'),
        parameters: localStorage.getItem('diy_parameters')
      };
    });
    
    console.log('📝 入力セッション状態:');
    console.log(`   Input Session: ${inputSessionState.inputSession ? '✅' : '❌'}`);
    console.log(`   Prompt: ${inputSessionState.prompt ? '✅' : '❌'}`);
    console.log(`   Parameters: ${inputSessionState.parameters ? '✅' : '❌'}`);
    
    console.log('✅ テスト完了');
    
  } catch (error) {
    console.log(`❌ テスト中にエラー: ${error.message}`);
    console.log(error.stack);
  }
  
  // ブラウザを10秒間開いておく
  console.log('🔍 ブラウザを10秒間開いています...');
  await page.waitForTimeout(10000);
  
  await browser.close();
}

// テスト実行
testSessionRestore().catch(console.error); 