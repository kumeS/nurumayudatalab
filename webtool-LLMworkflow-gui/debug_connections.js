// デバッグ用スクリプト
// ブラウザのコンソールでこのスクリプトを実行して問題を診断

console.log('=== WORKFLOW EDITOR DEBUG ===');

// エディター本体の確認
const editor = window.workflowEditor;
if (!editor) {
  console.error('WorkflowEditor が見つかりません');
} else {
  console.log('WorkflowEditor OK');
}

// SVG要素の確認
const svg = document.getElementById('connections');
console.log('SVG要素:', svg);
console.log('SVG スタイル:', svg.style.cssText);
console.log('SVG transform:', svg.style.transform);

// ノードコンテナの確認
const nodeContainer = document.querySelector('.node-container');
console.log('ノードコンテナ:', nodeContainer);
console.log('ノードコンテナ transform:', nodeContainer?.style.transform);

// 現在のビューポート状態
const viewport = editor?.viewportManager;
if (viewport) {
  console.log('ビューポート状態:', {
    panX: viewport.panX,
    panY: viewport.panY,
    scale: viewport.scale
  });
}

// 現在のノード状況
const nodeManager = editor?.nodeManager;
if (nodeManager) {
  const nodes = nodeManager.getAllNodes();
  console.log(`ノード数: ${nodes.length}`);
  nodes.forEach((node, index) => {
    console.log(`ノード ${index}: ${node.id} (${node.type}) at (${node.x}, ${node.y})`);
  });
}

// 現在の接続状況
const connectionManager = editor?.connectionManager;
if (connectionManager) {
  const connections = connectionManager.getAllConnections();
  console.log(`接続数: ${connections.length}`);
  connections.forEach((conn, index) => {
    console.log(`接続 ${index}: ${conn.from} -> ${conn.to}`);
  });
  
  // SVG内のパス要素を確認
  const paths = svg.querySelectorAll('path');
  console.log(`SVG内のパス数: ${paths.length}`);
  paths.forEach((path, index) => {
    console.log(`パス ${index}:`, {
      d: path.getAttribute('d'),
      stroke: path.getAttribute('stroke'),
      strokeWidth: path.getAttribute('stroke-width'),
      vectorEffect: path.getAttribute('vector-effect')
    });
  });
}

// テスト用の関数を提供
window.debugWorkflow = {
  // 手動でノードを追加
  addTestNodes: () => {
    console.log('テストノードを追加...');
    const input = nodeManager.createNode('input', 100, 100);
    const llm = nodeManager.createNode('llm', 300, 100);
    console.log('ノード追加完了:', input, llm);
  },
  
  // 手動で接続を作成
  addTestConnection: () => {
    const nodes = nodeManager.getAllNodes();
    if (nodes.length >= 2) {
      const conn = connectionManager.createConnection(nodes[0].id, nodes[1].id);
      console.log('接続作成完了:', conn);
    } else {
      console.log('接続には最低2つのノードが必要です');
    }
  },
  
  // 接続線を強制更新
  forceUpdateConnections: () => {
    console.log('接続線を強制更新...');
    connectionManager.updateConnections();
  },
  
  // ビューポートをリセット
  resetViewport: () => {
    console.log('ビューポートをリセット...');
    viewport.resetZoom();
  },
  
  // 座標変換をテスト
  testCoordinates: (screenX, screenY) => {
    const world = viewport.screenToWorld(screenX, screenY);
    const screen = viewport.worldToScreen(world.x, world.y);
    console.log('座標変換テスト:', {
      input: { screenX, screenY },
      world: world,
      backToScreen: screen
    });
  }
};

console.log('デバッグ完了。window.debugWorkflow でテスト関数を利用できます。');
console.log('例: debugWorkflow.addTestNodes() でテストノードを追加'); 