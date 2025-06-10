// LLM API呼び出し
async function callLLMAPI(messages) {
  const apiUrl = 'https://nurumayu-worker.skume-bioinfo.workers.dev/';
  
  const requestData = {
    model: "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
    temperature: 0.7,
    stream: false,
    max_completion_tokens: 2000,
    messages: messages
  };
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestData)
  });
  
  if (!response.ok) {
    throw new Error(`API呼び出しに失敗しました: ${response.status}`);
  }
  
  const data = await response.json();
    
    if (data.choices && data.choices.length > 0 && data.choices[0].message) {
    return parseRecipeResponse(data.choices[0].message.content);
    } else if (data.answer) {
    return parseRecipeResponse(data.answer);
    } else {
      throw new Error('レスポンスに期待されるフィールドがありません');
    }
}

// メニュー提案レスポンス解析
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
    const messages = [{ role: "user", content: prompt }];
    try {
      const result = await callLLMAPI(messages);
      return result;
    } catch (error) {
      throw new Error(`LLM API Error: ${error.message}`);
    }
  }
};

console.log('LLM API initialized');

 