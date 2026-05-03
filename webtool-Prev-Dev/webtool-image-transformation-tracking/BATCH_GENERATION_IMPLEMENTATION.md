# バッチ画像生成機能 - 実装ドキュメント

**実装日**: 2025-10-30
**バージョン**: v5.4

## 概要

複数の生成ノードで一括して画像生成を実行する機能を実装しました。並列実行により、従来の順次処理と比較して大幅な時間短縮を実現しています。

## 主な機能

### 1. 並列実行（Parallel Execution）

**技術**: `Promise.allSettled()` を使用した非同期並列処理

```javascript
// 全てのエッジ変換を並列実行
const generationPromises = edges.map(edge =>
    this.executeEdgeTransformation(edge)
);
await Promise.allSettled(generationPromises);
```

**メリット**:
- ✅ 複数のノードで同時に画像生成を開始
- ✅ 1つのエラーが他の処理に影響しない
- ✅ 処理時間が劇的に短縮（N個のノード → 約1/N倍の時間）

**例**: 5個のノードで生成する場合
- 順次処理: 5 × 30秒 = 150秒（2分30秒）
- 並列処理: ~30秒（最長の処理時間）

### 2. リアルタイムプログレス表示

**実装箇所**: `workflowApp.js:1009-1038`

```javascript
showBatchProgress(completed, total, message) {
    const percentage = (completed / total) * 100;
    progressBar.style.width = `${percentage}%`;
    progressText.textContent = message;
}
```

**表示内容**:
- ✅ 進行状況バー（0% → 100%）
- ✅ リアルタイム統計（成功数、失敗数、残り数）
- ✅ 処理完了後2秒間表示を維持

### 3. エラーハンドリング

**個別エラー処理**:
```javascript
.catch(error => {
    errorCount++;
    errors.push({
        nodeId: node.id,
        edgeId: edge.id,
        error: error.message
    });
})
```

**結果サマリー**:
- ✅ 成功数と失敗数を表示
- ✅ 失敗したエッジの詳細情報を提供
- ✅ 部分的な失敗でも成功した画像は保存される

## UI実装

### ヘッダーボタン

**場所**: `index.html:65-67`

```html
<button id="batchGenerateBtn" class="px-3 py-1.5 bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-400 hover:to-orange-500 rounded-lg transition-colors text-sm font-semibold">
    <i class="fas fa-bolt mr-1"></i>一括生成
</button>
```

**デザイン**:
- 🟡 黄色→オレンジのグラデーション（目立つデザイン）
- ⚡ 稲妻アイコンで並列実行を表現
- ホバーエフェクト付き

### 確認ダイアログ

**表示内容**:
```
{N}個のノード（{M}個のエッジ）で画像を生成します。

並列実行モード: 同時に複数のノードで生成を開始します。

よろしいですか？
```

## 使用方法

### 基本的な使い方

1. **ワークフローを作成**
   - 入力ノードを作成して画像をアップロード
   - 生成ノードを作成
   - エッジで接続してプロンプトを設定

2. **一括生成を実行**
   - ヘッダーの「⚡ 一括生成」ボタンをクリック
   - 確認ダイアログで対象ノード数を確認
   - 「OK」をクリックして実行開始

3. **進捗を確認**
   - リアルタイムで進行状況が表示される
   - 完了すると結果サマリーが表示される

### 生成可能なノードの条件

バッチ生成の対象となるノードは以下の条件を満たす必要があります：

✅ **必須条件**:
1. ノードタイプが「生成ノード」（`type: 'generated'`）
2. 入力エッジが1つ以上接続されている
3. 接続されたエッジにプロンプトが設定されている（空でない）

❌ **対象外**:
- 入力ノード（`type: 'input'`）
- エッジが接続されていない生成ノード
- プロンプトが空のエッジのみ接続されたノード

## 実装の詳細

### コードの構造

```
index.html (UI)
    ↓
workflowApp.js (orchestration)
    ├─ batchGenerateImages() - メインロジック
    ├─ showBatchProgress() - プログレス表示
    └─ hideBatchProgress() - プログレス非表示
    ↓
executeEdgeTransformation() - 個別エッジ処理
    ↓
transformationService.js
    └─ transformWithNanoBanana() - 実際のAPI呼び出し
```

### アルゴリズム

**Phase 1: 検出（Detection）**
```javascript
// 生成可能なノードを検出
for (const node of workflowEngine.nodes.values()) {
    if (node.type === 'generated') {
        const edgesWithPrompts = edges.filter(e =>
            e.target === node.id && e.prompt
        );
        if (edgesWithPrompts.length > 0) {
            generatableNodes.push({ node, edges: edgesWithPrompts });
        }
    }
}
```

**Phase 2: 並列実行（Parallel Execution）**
```javascript
// 全エッジの変換Promiseを作成
const promises = [];
for (const { node, edges } of generatableNodes) {
    for (const edge of edges) {
        promises.push(
            executeEdgeTransformation(edge)
                .then(() => successCount++)
                .catch(error => errors.push(error))
        );
    }
}

// 全て完了まで待機
await Promise.allSettled(promises);
```

**Phase 3: 結果集計（Result Aggregation）**
```javascript
// 成功数と失敗数を集計
const summary = {
    success: successCount,
    error: errorCount,
    total: promises.length
};
```

## パフォーマンス分析

### 並列実行の効果

| ノード数 | 順次処理 | 並列処理 | 改善率 |
|---------|---------|---------|-------|
| 1個 | 30秒 | 30秒 | 0% |
| 3個 | 90秒 | 30秒 | **67%短縮** |
| 5個 | 150秒 | 30秒 | **80%短縮** |
| 10個 | 300秒 | 30秒 | **90%短縮** |

**注**: 実際の処理時間はAPI応答時間やネットワーク状況に依存します。

### メモリ使用量

並列実行により一時的にメモリ使用量が増加しますが、以下の対策を実装済み：

- ✅ `Promise.allSettled()` で各Promiseを独立して管理
- ✅ エラー時のメモリリークを防止
- ✅ 完了後のプログレスバー自動非表示（2秒後）

## エラーハンドリング

### エラーの種類と対処

1. **生成可能なノードがない**
   ```
   アラート: "生成可能なノードがありません。\n\n生成ノードに入力エッジを接続し、プロンプトを設定してください。"
   ```

2. **一部のノードが失敗**
   ```
   成功: 3個
   失敗: 2個
   合計: 5個

   失敗の詳細:
   ノード node-123 (エッジ edge-456): API error occurred
   ノード node-789 (エッジ edge-012): Network timeout
   ```

3. **全てのノードが失敗**
   - 失敗したノードの詳細を全て表示
   - コンソールログにエラースタックを出力

### ロバスト性の確保

```javascript
// Promise.allSettled() は全Promiseが完了するまで待機
// 一部が失敗しても他の処理は継続される
await Promise.allSettled(promises);
```

## テスト方法

### 基本テスト

1. **単一ノードテスト**
   - 1つの生成ノードでバッチ実行
   - 正常に完了することを確認

2. **複数ノードテスト**
   - 3-5個の生成ノードでバッチ実行
   - 並列実行が動作することを確認

3. **エラーハンドリングテスト**
   - APIキーを無効化してバッチ実行
   - エラーメッセージが正しく表示されることを確認

### 負荷テスト

1. **大量ノードテスト**
   - 10個以上の生成ノードでバッチ実行
   - メモリ使用量とパフォーマンスを監視

2. **長時間実行テスト**
   - 複雑なプロンプトで時間のかかる生成を実行
   - タイムアウトやメモリリークがないか確認

## トラブルシューティング

### よくある問題

**Q1: バッチ生成ボタンをクリックしても何も起こらない**

A: 以下を確認してください：
- 生成ノードが存在するか
- エッジが接続されているか
- プロンプトが設定されているか

**Q2: 全てのノードで失敗する**

A: APIキーの設定を確認してください：
- 設定モーダル（⚙️）を開く
- Replicate API Keyが正しく入力されているか確認

**Q3: プログレスバーが動かない**

A: ブラウザのコンソール（F12）を開いてエラーを確認してください。

## 今後の拡張案

### 短期的な改善
- [ ] 並列実行数の制限（同時実行数を3-5個に制限してAPI制限を回避）
- [ ] リトライ機能の追加（失敗したノードを再試行）
- [ ] キャンセルボタンの追加（実行中の処理を中断）

### 中期的な改善
- [ ] バッチ実行履歴の保存
- [ ] 実行速度の最適化（キャッシュ活用）
- [ ] プログレスバーの詳細化（各ノードの状態を個別表示）

## 参考情報

- **Promise.allSettled()**: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled
- **非同期処理のベストプラクティス**: https://javascript.info/async-await
- **エラーハンドリング**: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Control_flow_and_error_handling

---

**実装者**: Claude Code
**レビュー**: 久米慧嗣 (Satoshi Kume)
**ライセンス**: MIT
