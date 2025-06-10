// workflow-executor.js の executeLLMNode メソッドを以下に置き換えてください

async executeLLMNode(node, connectionManager) {
  const inputs = this.getNodeInputs(node.id, connectionManager);
  const inputText = Array.isArray(inputs) ? inputs.join('\n') : (inputs || '');
  
  // プロンプトの変数置換
  let prompt = node.data.prompt || '';
  prompt = prompt.replace(/\{input\}/g, inputText);
  
  try {
    // LLM API呼び出し - llm.jsのcallLLMAPIを使用
    const messages = [
      {
        role: "user",
        content: prompt
      }
    ];
    
    this.log(`LLM APIを呼び出し中... プロンプト: ${prompt.substring(0, 100)}...`);
    
    const response = await callLLMAPI(messages);
    
    this.log(`LLM API応答受信: ${JSON.stringify(response).substring(0, 100)}...`);
    
    // レスポンスの処理
    let result = '';
    
    if (Array.isArray(response)) {
      // 配列の場合は最初の要素を取得
      result = response[0] || '';
      
      // もしオブジェクトの場合は、適切なフィールドを探す
      if (typeof result === 'object') {
        result = result.content || result.text || result.answer || JSON.stringify(result);
      }
    } else if (typeof response === 'object') {
      // オブジェクトの場合は適切なフィールドを探す
      result = response.content || response.text || response.answer || JSON.stringify(response);
    } else {
      // それ以外はそのまま使用
      result = response || '';
    }
    
    return result;
    
  } catch (error) {
    this.log(`LLM API呼び出しエラー: ${error.message}`);
    throw new Error(`LLM処理エラー: ${error.message}`);
  }
}