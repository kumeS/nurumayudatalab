// LLM API呼び出し
async function callLLMAPI(messages) {
  const apiUrl = 'https://nurumayu-worker.skume-bioinfo.workers.dev/';
  
  // 入力検証
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    throw new Error('有効なメッセージが提供されていません');
  }
  
  const requestData = {
    model: "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
    temperature: 0.7,
    stream: false,
    max_completion_tokens: 2000,
    messages: messages
  };
  
  console.log('API呼び出し開始:', apiUrl);
  console.log('リクエストデータ:', JSON.stringify(requestData, null, 2));
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });
    
    console.log('API応答ステータス:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API応答エラー:', errorText);
      throw new Error(`API呼び出しに失敗しました: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('API応答データ:', JSON.stringify(data, null, 2));
    
    // データ構造の検証と解析
    if (data.choices && data.choices.length > 0 && data.choices[0].message) {
      const content = data.choices[0].message.content;
      if (!content || (typeof content === 'string' && content.trim() === '')) {
        console.warn('API応答のcontentが空です');
        throw new Error('API returned empty content');
      }
      return parseResponse(content);
    } else if (data.answer) {
      if (!data.answer || (typeof data.answer === 'string' && data.answer.trim() === '')) {
        console.warn('API応答のanswerが空です');
        throw new Error('API returned empty answer');
      }
      return parseResponse(data.answer);
    } else {
      console.error('API応答に期待されるフィールドがありません:', Object.keys(data));
      throw new Error('レスポンスに期待されるフィールドがありません');
    }
  } catch (error) {
    console.error('API呼び出し中にエラーが発生:', error);
    
    if (error.name === 'SyntaxError') {
      throw new Error('API応答のJSON解析に失敗しました。サーバー応答が不正な形式です。');
    } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('ネットワークエラー: APIサーバーに接続できません。');
    } else {
      throw error;
    }
  }
}

// 汎用レスポンス解析関数
function parseResponse(text) {
  try {
    console.log('Raw API response:', text);
    
    // JSONかどうかの判定
    const trimmedText = text.trim();
    
    // JSONブロックの検出を試行
    let jsonText = null;
    
    // パターン1: ```json と ``` で囲まれた JSON
    let jsonMatch = trimmedText.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
      console.log('JSON found with json marker:', jsonText);
    } else {
      // パターン2: ``` と ``` で囲まれた JSON
      jsonMatch = trimmedText.match(/```\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
        console.log('JSON found with generic marker:', jsonText);
      } else {
        // パターン3: { から } までの完全なJSON
        const startIndex = trimmedText.indexOf('{');
        const lastIndex = trimmedText.lastIndexOf('}');
        if (startIndex !== -1 && lastIndex !== -1 && lastIndex > startIndex) {
          jsonText = trimmedText.substring(startIndex, lastIndex + 1);
          console.log('JSON found with brace matching:', jsonText);
        }
      }
    }
    
    // JSONが見つかった場合は解析を試行
    if (jsonText) {
      try {
        jsonText = jsonText.trim();
        jsonText = jsonText.replace(/^[^{]*/, ''); // { より前の文字を除去
        jsonText = jsonText.replace(/[^}]*$/, ''); // } より後の文字を除去
        jsonText = jsonText.replace(/```$/, ''); // 末尾の ``` を除去
        
        console.log('Cleaned JSON text:', jsonText);
        
        const data = JSON.parse(jsonText);
        console.log('Parsed JSON result:', data);
        
        // 構造化データの場合は解析結果を返す
        if (data.menus && Array.isArray(data.menus)) {
          console.log('Returning menu data');
          return data.menus;
        }
        
        if (data.menuName || data.ingredients || data.cookingSteps || data.detailedSteps) {
          console.log('Returning structured data');
          return data;
        }
        
        // その他の構造化データの場合もそのまま返す
        return data;
        
      } catch (jsonError) {
        console.warn('JSON解析に失敗、プレーンテキストとして処理:', jsonError.message);
      }
    }
    
    // JSONでない場合、またはJSONの解析に失敗した場合はプレーンテキストとして返す
    console.log('Returning as plain text');
    return trimmedText;
    
  } catch (error) {
    console.error('レスポンス解析エラー:', error);
    console.error('レスポンステキスト:', text);
    
    // エラーが発生した場合もプレーンテキストとして返す
    return text ? text.toString() : '';
  }
}

// メニュー提案レスポンス解析（後方互換性のため保持）
function parseRecipeResponse(text) {
  try {
    console.log('Raw API response:', text);
    
    // 複数の JSON 抽出パターンを試行
    let jsonText = null;
    
    // パターン1: ```json と ``` で囲まれた JSON
    let jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
      console.log('JSON found with json marker:', jsonText);
    } else {
      // パターン2: ``` と ``` で囲まれた JSON
      jsonMatch = text.match(/```\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
        console.log('JSON found with generic marker:', jsonText);
      } else {
        // パターン3: { から } までの最初の完全なJSON
        const startIndex = text.indexOf('{');
        const lastIndex = text.lastIndexOf('}');
        if (startIndex !== -1 && lastIndex !== -1 && lastIndex > startIndex) {
          jsonText = text.substring(startIndex, lastIndex + 1);
          console.log('JSON found with brace matching:', jsonText);
        } else {
          // パターン4: 直接JSONとして解析
          jsonText = text.trim();
          console.log('Using text directly as JSON:', jsonText);
        }
      }
    }
    
    if (!jsonText) {
      throw new Error('JSONコンテンツが見つかりません');
    }
    
    // JSONをクリーンアップ
    jsonText = jsonText.trim();
    
    // 不要な文字を除去
    jsonText = jsonText.replace(/^[^{]*/, ''); // { より前の文字を除去
    jsonText = jsonText.replace(/[^}]*$/, ''); // } より後の文字を除去
    jsonText = jsonText.replace(/```$/, ''); // 末尾の ``` を除去
    
    console.log('Cleaned JSON text:', jsonText);
    
    const data = JSON.parse(jsonText);
    console.log('Parsed result:', data);
    
    // メニューデータの場合
    if (data.menus && Array.isArray(data.menus)) {
      console.log('Returning menu data');
      return data.menus;
    }
    
    // レシピデータの場合（従来の処理）
    if (data.menuName || data.ingredients || data.cookingSteps) {
      console.log('Returning recipe data');
      return data;
    }
    
    throw new Error('有効なデータが見つかりません');
    
  } catch (error) {
    console.error('データ解析エラー:', error);
    console.error('レスポンステキスト:', text);
    
    // エラーの詳細を提供
    if (error instanceof SyntaxError) {
      throw new Error(`JSONの構文エラー: ${error.message}\n\n受信したテキスト:\n${text.substring(0, 500)}...`);
    } else {
      throw new Error(`データの解析に失敗しました: ${error.message}\n\n受信したテキスト:\n${text.substring(0, 500)}...`);
    }
  }
}

// 詳細ステップ専用のレスポンス解析
function parseDetailedStepsResponse(text) {
  try {
    console.log('詳細ステップ Raw API response:', text);
    
    // 複数の JSON 抽出パターンを試行
    let jsonText = null;
    
    // パターン1: ```json と ``` で囲まれた JSON
    let jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
      console.log('詳細ステップ JSON found with json marker:', jsonText);
    } else {
      // パターン2: ``` と ``` で囲まれた JSON
      jsonMatch = text.match(/```\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
        console.log('詳細ステップ JSON found with generic marker:', jsonText);
      } else {
        // パターン3: { から } までの最初の完全なJSON
        const startIndex = text.indexOf('{');
        const lastIndex = text.lastIndexOf('}');
        if (startIndex !== -1 && lastIndex !== -1 && lastIndex > startIndex) {
          jsonText = text.substring(startIndex, lastIndex + 1);
          console.log('詳細ステップ JSON found with brace matching:', jsonText);
        } else {
          // パターン4: 直接JSONとして解析
          jsonText = text.trim();
          console.log('詳細ステップ Using text directly as JSON:', jsonText);
        }
      }
    }
    
    if (!jsonText) {
      throw new Error('詳細ステップのJSONコンテンツが見つかりません');
    }
    
    // JSONをクリーンアップ
    jsonText = jsonText.trim();
    jsonText = jsonText.replace(/^[^{]*/, ''); // { より前の文字を除去
    jsonText = jsonText.replace(/[^}]*$/, ''); // } より後の文字を除去
    jsonText = jsonText.replace(/```$/, ''); // 末尾の ``` を除去
    
    console.log('詳細ステップ Cleaned JSON text:', jsonText);
    
    const data = JSON.parse(jsonText);
    console.log('詳細ステップ Parsed result:', data);
    
    // detailedStepsフィールドの検証
    if (data.detailedSteps && Array.isArray(data.detailedSteps)) {
      return data;
    } else {
      throw new Error('詳細ステップデータに必要なフィールドがありません');
    }
  } catch (error) {
    console.error('詳細ステップデータ解析エラー:', error);
    console.error('レスポンステキスト:', text);
    
    // エラーの詳細を提供
    if (error instanceof SyntaxError) {
      throw new Error(`詳細ステップのJSONの構文エラー: ${error.message}\n\n受信したテキスト:\n${text.substring(0, 500)}...`);
    } else {
      throw new Error(`詳細ステップの解析に失敗しました: ${error.message}\n\n受信したテキスト:\n${text.substring(0, 500)}...`);
    }
  }
}

// window.llmAPI の初期化
window.llmAPI = {
  generateText: async function(prompt, options = {}) {
    // 入力検証
    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      throw new Error('Input is required for LLM processing');
    }
    
    const messages = [{ role: "user", content: prompt }];
    try {
      console.log('LLM API呼び出し開始:', prompt.substring(0, 100) + '...');
      const result = await callLLMAPI(messages);
      
      // レスポンス検証
      if (!result) {
        throw new Error('API returned empty response');
      }
      
      if (typeof result === 'string' && result.trim() === '') {
        throw new Error('API returned empty string response');
      }
      
      console.log('LLM API呼び出し成功:', typeof result, result.toString().substring(0, 100) + '...');
      return result;
    } catch (error) {
      console.error('LLM API呼び出しエラー:', error);
      
      // エラーメッセージの詳細化
      let errorMessage = error.message;
      if (errorMessage.includes('JSONの構文エラー')) {
        errorMessage = 'API応答の解析に失敗しました。APIサーバーの応答形式を確認してください。';
      } else if (errorMessage.includes('API呼び出しに失敗しました')) {
        errorMessage = 'APIサーバーとの通信に失敗しました。ネットワーク接続を確認してください。';
      }
      
      throw new Error(`LLM API Error: ${errorMessage}`);
    }
  }
};

console.log('LLM API initialized');

 