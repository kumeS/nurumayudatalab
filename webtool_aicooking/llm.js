/**
 * LLM実行 JavaScript
 * AI料理提案システムのLLM関連機能を抽出
 */

// メニュー提案用のメッセージ作成
function createMenuSuggestionsMessages(settings, isRegenerate = false) {
  const regenerateInstruction = isRegenerate ? 
    '\n【重要】前回とは異なる、全く新しいメニューを6つ提案してください。同じ料理名や似たような調理法は避けてください。' : '';

  // 料理ジャンルの分散指示を作成
  const cuisineDistributionInstruction = Array.isArray(settings.cuisine) && settings.cuisine.length > 1 ? 
    `\n【料理ジャンル分散について】\n選択された料理ジャンル（${settings.cuisine.join('、')}）を6つのメニューにできるだけ均等に分散させてください。例：\n- 2ジャンル選択時：各ジャンルから3つずつ\n- 3ジャンル選択時：各ジャンルから2つずつ\n- 4ジャンル選択時：各ジャンルから1〜2つずつ\n**和食だけに偏らず、選択されたすべてのジャンルから提案すること**` : '';

  const prompt = `
あなたは優秀な料理研究家です。以下の条件に基づいて、美味しいメニューを6つ提案してください。${regenerateInstruction}${cuisineDistributionInstruction}

【利用可能な食材】
${settings.ingredients.join('、')}

【条件】
- 季節: ${settings.season}
- 食事タイプ: ${settings.mealType}
- 調理時間: ${settings.cookingTime}
- 料理ジャンル: ${Array.isArray(settings.cuisine) ? settings.cuisine.join('、') : settings.cuisine}
- 調理法: ${Array.isArray(settings.cookingMethod) ? settings.cookingMethod.join('、') : settings.cookingMethod}
- 人数: ${settings.servings}

【回答形式】
以下のJSON形式で6つのメニューを提案してください。必ずjsonマークダウン形式で回答すること：

\`\`\`json
{
  "menus": [
    {
      "menuName": "料理名1",
      "description": "料理の簡単な説明（50文字程度）",
      "cookingTime": "調理時間（例：30分）",
      "difficulty": "難易度（簡単/普通/難しい）",
      "servings": "人数（例：2人分）",
      "cuisine": "料理ジャンル（和食/洋食/中華/イタリアン/その他のいずれか1つ）",
      "category": "料理カテゴリー（例：炒め物、煮物、パスタ、ラーメン、うどん、そば等）",
      "mainIngredients": ["主要食材1", "主要食材2", "主要食材3"]
    },
    {
      "menuName": "料理名2",
      "description": "料理の簡単な説明（50文字程度）",
      "cookingTime": "調理時間（例：20分）",
      "difficulty": "難易度（簡単/普通/難しい）",
      "servings": "人数（例：2人分）",
      "cuisine": "料理ジャンル（和食/洋食/中華/イタリアン/その他のいずれか1つ）",
      "category": "料理カテゴリー（例：炒め物、煮物、パスタ、ラーメン、うどん、そば等）",
      "mainIngredients": ["主要食材1", "主要食材2", "主要食材3"]
    },
    {
      "menuName": "料理名3",
      "description": "料理の簡単な説明（50文字程度）",
      "cookingTime": "調理時間（例：45分）",
      "difficulty": "難易度（簡単/普通/難しい）",
      "servings": "人数（例：2人分）",
      "cuisine": "料理ジャンル（和食/洋食/中華/イタリアン/その他のいずれか1つ）",
      "category": "料理カテゴリー（例：炒め物、煮物、パスタ、ラーメン、うどん、そば等）",
      "mainIngredients": ["主要食材1", "主要食材2", "主要食材3"]
    },
    {
      "menuName": "料理名4",
      "description": "料理の簡単な説明（50文字程度）",
      "cookingTime": "調理時間（例：25分）",
      "difficulty": "難易度（簡単/普通/難しい）",
      "servings": "人数（例：2人分）",
      "cuisine": "料理ジャンル（和食/洋食/中華/イタリアン/その他のいずれか1つ）",
      "category": "料理カテゴリー（例：炒め物、煮物、パスタ、ラーメン、うどん、そば等）",
      "mainIngredients": ["主要食材1", "主要食材2", "主要食材3"]
    },
    {
      "menuName": "料理名5",
      "description": "料理の簡単な説明（50文字程度）",
      "cookingTime": "調理時間（例：35分）",
      "difficulty": "難易度（簡単/普通/難しい）",
      "servings": "人数（例：2人分）",
      "cuisine": "料理ジャンル（和食/洋食/中華/イタリアン/その他のいずれか1つ）",
      "category": "料理カテゴリー（例：炒め物、煮物、パスタ、ラーメン、うどん、そば等）",
      "mainIngredients": ["主要食材1", "主要食材2", "主要食材3"]
    },
    {
      "menuName": "料理名6",
      "description": "料理の簡単な説明（50文字程度）",
      "cookingTime": "調理時間（例：40分）",
      "difficulty": "難易度（簡単/普通/難しい）",
      "servings": "人数（例：2人分）",
      "cuisine": "料理ジャンル（和食/洋食/中華/イタリアン/その他のいずれか1つ）",
      "category": "料理カテゴリー（例：炒め物、煮物、パスタ、ラーメン、うどん、そば等）",
      "mainIngredients": ["主要食材1", "主要食材2", "主要食材3"]
    }
  ]
}
\`\`\`

【重要な注意事項】
1. 指定された食材から適切なものを選んで6つの異なるメニューを提案すること（全ての食材を使う必要はありません）
2. **各メニューは全く違う料理ジャンルや調理法にすること**
3. **料理ジャンルが複数指定されている場合：各メニューごとに1つの料理ジャンルを選択して使用すること**
4. **調理法が複数指定されている場合：各メニューごとに1つの調理法を選択して使用すること**
5. **6つのメニューで指定された料理ジャンルと調理法をバランス良く使い分けること**
6. **【超重要】複数の料理ジャンルが選択されている場合は、6つのメニューを各ジャンルに可能な限り均等に分散させること。和食に偏らせてはいけません**
7. **各メニューのcuisineフィールドには、そのメニューで使用した料理ジャンルを明記すること**
8. 麺料理の場合は、categoryフィールドに具体的な麺の種類（パスタ、ラーメン、うどん、そば、焼きそば等）を記載すること
9. 指定された条件（季節、時間、ジャンル、調理法など）を考慮すること
10. 調理法が「ランダム」以外の場合は、指定された調理法を優先的に使用すること（例：「炒め物」指定の場合は炒め料理を中心に提案）
11. 実際に作れる現実的なメニューにすること
12. mainIngredientsには利用可能な食材から主要なものを3つ程度選んで記載すること
13. 調理時間は指定された条件内に収めること
14. 各メニューの説明は簡潔で魅力的にすること
15. categoryには料理の種類を明確に記載すること（炒め物、煮物、焼き物、パスタ、ラーメン、うどん、そば、カレー、サラダ等）
`;

  return [
    {
      role: "user",
      content: prompt
    }
  ];
}

// レシピ生成用のメッセージ作成
function createRecipeMessages(settings, isRegenerate = false) {
  const regenerateInstruction = isRegenerate ? 
    '\n【重要】前回とは異なる、全く新しいメニューを提案してください。同じ料理名や似たような調理法は避けてください。' : '';
  
  const prompt = `
あなたは優秀な料理研究家です。以下の条件に基づいて、美味しいレシピを1つ提案してください。${regenerateInstruction}

【利用可能な食材】
${settings.ingredients.join('、')}

【調味料について】
- 上記の食材リストに調味料が含まれている場合は、それらを優先的に使用してください
- 調味料については、リストにないものでも料理に必要であれば自由に追加できます
- ただし、リストにない調味料を使用する場合は、レスポンスで明確に区別してください

【条件】
- 季節: ${settings.season}
- 食事タイプ: ${settings.mealType}
- 調理時間: ${settings.cookingTime}
- 料理ジャンル: ${Array.isArray(settings.cuisine) ? settings.cuisine.join('、') : settings.cuisine}
- 調理法: ${Array.isArray(settings.cookingMethod) ? settings.cookingMethod.join('、') : settings.cookingMethod}
- 人数: ${settings.servings}

【回答形式】
以下のJSON形式で回答してください。必ずjsonマークダウン形式で回答すること：

\`\`\`json
{
  "menuName": "料理名",
  "description": "料理の簡単な説明",
  "cookingTime": "調理時間",
  "difficulty": "難易度（簡単/普通/難しい）",
  "ingredients": [
    {"name": "食材名", "amount": "分量", "isSelected": true}
  ],
  "seasonings": [
    {"name": "調味料名", "amount": "分量", "isSelected": true},
    {"name": "追加調味料名", "amount": "分量", "isSelected": false}
  ],
  "cookingSteps": [
    "手順1の説明",
    "手順2の説明",
    "手順3の説明"
  ],
  "tips": "コツやポイント",
  "ingredientUsage": {
    "used": ["使用した食材名1", "使用した食材名2"],
    "unused": ["使用しなかった食材名1", "使用しなかった食材名2"],
    "reason": "使用・未使用の具体的な理由（全て使用した場合は「選択された食材はすべて使用しました」）"
  },
  "alternatives": {
    "substitutions": [
      {"original": "元の食材", "substitute": "代替案"}
    ]
  }
}
\`\`\`

【重要な注意事項】
1. **料理ジャンルが複数指定されている場合：最も適した1つの料理ジャンルを選択して使用すること**
2. **調理法が複数指定されている場合：最も適した1つの調理法を選択して使用すること**
3. 指定された食材（調味料以外）から適切なものを選択して使用すること（全ての食材を使う必要はありません）
4. **ingredients配列には、指定された食材のみを含めること（追加の食材は含めない）**
5. **ingredients配列には調味料を含めないこと（調味料はseasonings配列に分ける）**
6. **seasonings配列では、すべての調味料にisSelectedフィールドを必ず設定すること**
   - **選択済み調味料（上記の利用可能な食材リストに含まれる調味料）：isSelected: true**
   - **追加した調味料（上記の利用可能な食材リストに含まれない調味料）：isSelected: false**
   - **フィールドの省略は禁止**
   - **重要：利用可能な食材リストをよく確認して、リストに含まれる調味料と含まれない調味料を正確に判別すること**
7. 調味料は必要に応じて自由に追加可能だが、seasonings配列に分けて記載し、isSelectedフィールドで選択済みかどうかを明記すること
8. ingredientUsageフィールドで食材の使用状況を必ず説明すること
9. 指定された条件（季節、時間、ジャンルなど）を考慮すること
10. 実際に作れる現実的なレシピにすること
11. 分量は具体的に記載すること
12. 手順は分かりやすく順序立てて記載すること
13. **指定されていない野菜や肉類などの主要食材を追加で使用しないこと**
`;
  
  return [
    {
      role: "user",
      content: prompt
    }
  ];
}

// 詳細レシピ用のメッセージ作成
function createDetailedRecipeMessages(selectedMenu, settings) {
  const prompt = `
あなたは優秀な料理研究家です。選択されたメニューの詳細なレシピを作成してください。

【選択されたメニュー】
料理名: ${selectedMenu.menuName}
概要: ${selectedMenu.description}
調理時間: ${selectedMenu.cookingTime}
難易度: ${selectedMenu.difficulty}
人数: ${selectedMenu.servings}

【利用可能な食材】
${settings.ingredients.join('、')}

【条件】
- 季節: ${settings.season}
- 食事タイプ: ${settings.mealType}
- 調理時間: ${settings.cookingTime}
- 料理ジャンル: ${Array.isArray(settings.cuisine) ? settings.cuisine.join('、') : settings.cuisine}
- 調理法: ${Array.isArray(settings.cookingMethod) ? settings.cookingMethod.join('、') : settings.cookingMethod}
- 人数: ${settings.servings}

【回答形式】
以下のJSON形式で詳細なレシピを回答してください。必ずjsonマークダウン形式で回答すること：

\`\`\`json
{
  "menuName": "${selectedMenu.menuName}",
  "description": "${selectedMenu.description}",
  "cookingTime": "${selectedMenu.cookingTime}",
  "difficulty": "${selectedMenu.difficulty}",
  "ingredients": [
    {"name": "食材名", "amount": "分量", "isSelected": true}
  ],
  "seasonings": [
    {"name": "調味料名", "amount": "分量", "isSelected": true},
    {"name": "追加調味料名", "amount": "分量", "isSelected": false}
  ],
  "cookingSteps": [
    "手順1の説明",
    "手順2の説明",
    "手順3の説明"
  ],
  "tips": "コツやポイント",
  "ingredientUsage": {
    "used": ["使用した食材名1", "使用した食材名2"],
    "unused": ["使用しなかった食材名1", "使用しなかった食材名2"],
    "reason": "使用・未使用の具体的な理由"
  },
  "alternatives": {
    "substitutions": [
      {"original": "元の食材", "substitute": "代替案"}
    ]
  }
}
\`\`\`

【重要な注意事項】
1. 選択されたメニューに基づいて詳細なレシピを作成すること
2. **選択されたメニューに最も適した料理ジャンル1つと調理法1つを使用すること**
3. 指定された食材から適切なものを選択して使用すること（全ての食材を使う必要はありません）
4. ingredients配列には、指定された食材のみを含めること（追加の食材は含めない）
5. ingredients配列には調味料を含めないこと（調味料はseasonings配列に分ける）
6. seasonings配列では、すべての調味料にisSelectedフィールドを必ず設定すること
7. 調理時間と難易度は選択されたメニューの設定に合わせること
8. 指定された調理法を考慮すること（「ランダム」以外の場合は特にその調理法を活かしたレシピにすること）
9. 実際に作れる現実的なレシピにすること
10. 分量は具体的に記載すること
11. 手順は分かりやすく順序立てて記載すること
`;

  return [
    {
      role: "user",
      content: prompt
    }
  ];
}

// 詳細ステップ用のメッセージ作成
function createDetailedStepsMessages(currentRecipe, settings) {
  const currentSteps = currentRecipe.cookingSteps ? 
    currentRecipe.cookingSteps.map((step, index) => `${index + 1}. ${step}`).join('\n') : '';
  
  const prompt = `
以下のレシピの作り方をより詳しく説明してください。

【料理名】
${currentRecipe.menuName}

【現在の作り方】
${currentSteps}

【要求】
上記の手順をより詳細にして、初心者でも失敗しないように以下を含めて説明してください：
- 具体的な時間
- 火加減の詳細
- 見極めポイント
- コツ

【回答形式】
以下のJSON形式で詳細な手順を回答してください。必ずjsonマークダウン形式で回答すること：

\`\`\`json
{
  "detailedSteps": [
    "詳細な手順1",
    "詳細な手順2", 
    "詳細な手順3"
  ]
}
\`\`\`
`;
  
  return [
    {
      role: "user",
      content: prompt
    }
  ];
}

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

// エクスポート（他のファイルで使用する場合）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createMenuSuggestionsMessages,
    createRecipeMessages,
    createDetailedRecipeMessages,
    createDetailedStepsMessages,
    callLLMAPI,
    parseRecipeResponse,
    parseDetailedStepsResponse
  };
} 