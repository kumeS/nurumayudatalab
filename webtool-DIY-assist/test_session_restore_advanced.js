const { chromium } = require('playwright');
const path = require('path');

async function testAdvancedSessionRestore() {
  console.log('=== DIY アシスタント 高度なセッション復元テスト ===');
  
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
    
    // 初期化完了まで待機
    await page.waitForTimeout(5000);
    
    // コンソールログとエラーをキャッチ
    const logs = [];
    page.on('console', msg => {
      logs.push(`[${msg.type()}] ${msg.text()}`);
      if (msg.type() === 'error') {
        console.log(`❌ Console Error: ${msg.text()}`);
      }
    });
    
    page.on('pageerror', error => {
      console.log(`❌ Page Error: ${error.message}`);
    });
    
    // ダミーの3Dモデルデータでセッションを作成
    console.log('🔧 テスト用の3Dモデルセッション作成中...');
    
    const testObjData = `# Test OBJ File
v 0.0 0.0 0.0
v 1.0 0.0 0.0
v 0.0 1.0 0.0
v 0.0 0.0 1.0
f 1 2 3
f 1 2 4
f 1 3 4
f 2 3 4`;

    // テストセッションデータを設定
    await page.evaluate((objData) => {
      const testProject = {
        id: Date.now(),
        prompt: 'テスト用シンプルな椅子',
        objData: objData,
        qualityCheck: null,
        optimizedSpec: null,
        optimizedPrompt: null,
        stage1Data: {
          furniture_type: 'chair',
          dimensions: { width: 40, depth: 40, height: 80 },
          structural_analysis: {
            main_components: [
              { name: 'seat', position: 'center', size: '40x40cm' }
            ]
          }
        },
        stage2Data: null,
        stage3Data: null,
        timestamp: new Date().toISOString(),
        parameters: {
          width: '40',
          depth: '40',
          height: '80'
        }
      };
      
      // プロジェクトリストに追加
      const projects = [testProject];
      localStorage.setItem('diy_projects', JSON.stringify(projects));
      
      // 現在のセッションとして設定
      const sessionData = {
        currentProject: testProject,
        hasActiveModel: true,
        timestamp: Date.now()
      };
      localStorage.setItem('diy_current_session', JSON.stringify(sessionData));
      
      console.log('✅ テストセッションデータ設定完了');
    }, testObjData);
    
    console.log('🔄 ページを再読み込みして復元テスト実行...');
    
    // ページ再読み込みでセッション復元をテスト
    await page.reload();
    await page.waitForTimeout(8000); // 初期化とセッション復元完了まで待機
    
    // セッション復元の結果確認
    const restorationResult = await page.evaluate(() => {
      const result = {
        hasAssistant: !!window.diyAssistant,
        hasSceneManager: !!window.diyAssistant?.sceneManager,
        sceneInitialized: !!window.diyAssistant?.sceneManager?.isInitialized,
        hasCurrentModel: !!window.diyAssistant?.sceneManager?.currentModel,
        currentObjData: !!window.diyAssistant?.currentObjData,
        formValues: {
          prompt: document.getElementById('designPrompt')?.value || '',
          width: document.getElementById('widthParam')?.value || '',
          depth: document.getElementById('depthParam')?.value || '',
          height: document.getElementById('heightParam')?.value || ''
        },
        sessionLogs: []
      };
      
      // セッション復元ログを取得
      if (window.diyAssistant && window.diyAssistant.logHistory) {
        result.sessionLogs = window.diyAssistant.logHistory
          .filter(log => log.message.includes('セッション') || log.message.includes('復元') || log.message.includes('3D'))
          .map(log => `[${log.level}] ${log.message}`)
          .slice(-10); // 最後の10件
      }
      
      return result;
    });
    
    console.log('📊 セッション復元結果:');
    console.log(`   Assistant Instance: ${restorationResult.hasAssistant ? '✅' : '❌'}`);
    console.log(`   Scene Manager: ${restorationResult.hasSceneManager ? '✅' : '❌'}`);
    console.log(`   Scene Initialized: ${restorationResult.sceneInitialized ? '✅' : '❌'}`);
    console.log(`   Current Model: ${restorationResult.hasCurrentModel ? '✅' : '❌'}`);
    console.log(`   OBJ Data: ${restorationResult.currentObjData ? '✅' : '❌'}`);
    
    console.log('📝 フォーム値復元:');
    console.log(`   Prompt: "${restorationResult.formValues.prompt}"`);
    console.log(`   Width: "${restorationResult.formValues.width}"`);
    console.log(`   Depth: "${restorationResult.formValues.depth}"`);
    console.log(`   Height: "${restorationResult.formValues.height}"`);
    
    console.log('📜 関連ログ:');
    restorationResult.sessionLogs.forEach(log => console.log(`   ${log}`));
    
    // 3Dキャンバスの状態確認
    const canvasState = await page.evaluate(() => {
      const container = document.getElementById('threeContainer');
      const overlay = document.getElementById('canvasOverlay');
      return {
        hasContainer: !!container,
        hasCanvas: !!container?.querySelector('canvas'),
        overlayVisible: overlay ? overlay.style.display !== 'none' : null,
        containerChildren: container ? container.children.length : 0
      };
    });
    
    console.log('🎨 3Dキャンバス状態:');
    console.log(`   Container: ${canvasState.hasContainer ? '✅' : '❌'}`);
    console.log(`   Canvas: ${canvasState.hasCanvas ? '✅' : '❌'}`);
    console.log(`   Overlay Hidden: ${canvasState.overlayVisible === false ? '✅' : '❌'}`);
    console.log(`   Container Children: ${canvasState.containerChildren}`);
    
    // エラーログの確認
    const errorLogs = logs.filter(log => log.includes('[error]'));
    if (errorLogs.length > 0) {
      console.log('❌ 検出されたエラー:');
      errorLogs.forEach(error => console.log(`   ${error}`));
    } else {
      console.log('✅ エラーなし');
    }
    
    // Three.js関連のエラーチェック
    const threeJSState = await page.evaluate(() => {
      return {
        threeAvailable: typeof THREE !== 'undefined',
        objLoaderAvailable: typeof THREE?.OBJLoader !== 'undefined',
        orbitControlsAvailable: typeof THREE?.OrbitControls !== 'undefined',
        revision: typeof THREE !== 'undefined' ? THREE.REVISION : null
      };
    });
    
    console.log('🔧 Three.js ライブラリ状態:');
    console.log(`   THREE: ${threeJSState.threeAvailable ? '✅' : '❌'} (v${threeJSState.revision})`);
    console.log(`   OBJLoader: ${threeJSState.objLoaderAvailable ? '✅' : '❌'}`);
    console.log(`   OrbitControls: ${threeJSState.orbitControlsAvailable ? '✅' : '❌'}`);
    
    // スクリーンショット撮影
    await page.screenshot({ path: 'session_restore_advanced_test.png', fullPage: true });
    console.log('📸 スクリーンショット保存: session_restore_advanced_test.png');
    
    // セッション復元が正常に機能しているかの総合判定
    const success = restorationResult.hasAssistant && 
                   restorationResult.hasSceneManager && 
                   restorationResult.sceneInitialized &&
                   restorationResult.formValues.prompt === 'テスト用シンプルな椅子' &&
                   threeJSState.threeAvailable &&
                   threeJSState.objLoaderAvailable &&
                   errorLogs.length === 0;
    
    if (success) {
      console.log('✅ セッション復元テスト成功');
    } else {
      console.log('❌ セッション復元テストで問題検出');
    }
    
  } catch (error) {
    console.log(`❌ テスト中にエラー: ${error.message}`);
    console.log(error.stack);
  }
  
  // ブラウザを15秒間開いておく
  console.log('🔍 ブラウザを15秒間開いています...');
  await page.waitForTimeout(15000);
  
  await browser.close();
}

// テスト実行
testAdvancedSessionRestore().catch(console.error); 