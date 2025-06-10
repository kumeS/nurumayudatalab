import asyncio
from playwright.async_api import async_playwright
import os

async def test_workflow():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()
        
        # file://プロトコルでローカルファイルを開く
        file_path = os.path.abspath('index.html')
        await page.goto(f'file://{file_path}')
        
        # ページが読み込まれるまで待機
        await page.wait_for_timeout(3000)
        
        # スクリーンショット撮影
        await page.screenshot(path='screenshot_initial.png')
        print('初期状態のスクリーンショットを撮影しました')
        
        # コンソールメッセージを記録
        console_messages = []
        page.on('console', lambda msg: console_messages.append(f'{msg.type}: {msg.text}'))
        
        # ノードパレットからノードをドラッグ&ドロップしてみる
        try:
            # 入力ノードを試す
            input_node = page.locator('[data-node-type="input"]')
            canvas = page.locator('#canvas')
            
            # ドラッグ&ドロップ実行
            await input_node.drag_to(canvas, target_position={'x': 300, 'y': 200})
            await page.wait_for_timeout(1000)
            
            # LLMノードも追加
            llm_node = page.locator('[data-node-type="llm"]')
            await llm_node.drag_to(canvas, target_position={'x': 500, 'y': 200})
            await page.wait_for_timeout(1000)
            
            # スクリーンショット撮影
            await page.screenshot(path='screenshot_with_nodes.png')
            print('ノード追加後のスクリーンショットを撮影しました')
            
            # ノードをドラッグしてみる
            node1 = page.locator('#node_0')
            if await node1.count() > 0:
                # ノードを移動させる
                await node1.drag_to(canvas, target_position={'x': 400, 'y': 300})
                await page.wait_for_timeout(1000)
                
                # ドラッグ後のスクリーンショット
                await page.screenshot(path='screenshot_after_drag.png')
                print('ノードドラッグ後のスクリーンショットを撮影しました')
                
        except Exception as e:
            print(f'ドラッグ&ドロップエラー: {e}')
        
        # コンソールメッセージを出力
        if console_messages:
            print('コンソールメッセージ:')
            for msg in console_messages:
                print(f'  {msg}')
        
        # ブラウザを5秒間開いたままにして手動確認
        print('ブラウザを5秒間開いたままにします...')
        await page.wait_for_timeout(5000)
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(test_workflow()) 