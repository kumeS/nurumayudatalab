/**
 * AI料理提案システム JavaScript
 * LLMを活用した料理レシピ提案ツール
 */
document.addEventListener('DOMContentLoaded', () => {
  // 要素の参照を取得
  const headerIngredientSearch = document.getElementById('headerIngredientSearch');
  const allIngredientsBtn = document.getElementById('allIngredientsBtn');
  const ingredientGrid = document.getElementById('ingredientGrid');
  const selectedList = document.getElementById('selectedList');
  const generateRecipeBtn = document.getElementById('generateRecipeBtn');
  const regenerateRecipeBtn = document.getElementById('regenerateRecipeBtn');
  const randomSelectBtn = document.getElementById('randomSelectBtn');
  const clearAllBtn = document.getElementById('clearAllBtn');
  const loadingIndicator = document.getElementById('loadingIndicator');
  const resultsSection = document.getElementById('resultsSection');
  
  // 結果表示要素
  const recipeTitle = document.getElementById('recipeTitle');
  const recipeDescription = document.getElementById('recipeDescription');
  const recipeMeta = document.getElementById('recipeMeta');
  const ingredientsList = document.getElementById('ingredientsList');
  const stepsList = document.getElementById('stepsList');
  const tipsContent = document.getElementById('tipsContent');
  
  // データ管理
  let ingredientsData = {};
  let selectedIngredients = [];
  let currentCategory = 'vegetables';
  
  // 状態保存機能
  function saveState() {
    const state = {
      selectedIngredients: selectedIngredients,
      currentCategory: currentCategory,
      settings: {
        season: document.querySelector('input[name="season"]:checked')?.value || '春',
        mealType: document.querySelector('input[name="mealType"]:checked')?.value || '昼食',
        cookingTime: document.querySelector('input[name="cookingTime"]:checked')?.value || '30分以内',
        cuisine: document.querySelector('input[name="cuisine"]:checked')?.value || '和食',
        servings: document.querySelector('input[name="servings"]:checked')?.value || '2人分'
      }
    };
    localStorage.setItem('aiCookingState', JSON.stringify(state));
    console.log('状態を保存しました:', {
      selectedIngredients: selectedIngredients.length,
      currentCategory: currentCategory,
      settings: state.settings
    });
  }
  
  // 状態復元機能
  function loadState() {
    try {
      const savedState = localStorage.getItem('aiCookingState');
      if (savedState) {
        const state = JSON.parse(savedState);
        
        // 選択済み食材を復元
        if (state.selectedIngredients && Array.isArray(state.selectedIngredients)) {
          selectedIngredients = state.selectedIngredients;
        }
        
        // カテゴリーを復元
        if (state.currentCategory) {
          currentCategory = state.currentCategory;
        }
        
        // 設定を復元
        if (state.settings) {
          Object.keys(state.settings).forEach(key => {
            const radio = document.querySelector(`input[name="${key}"][value="${state.settings[key]}"]`);
            if (radio) {
              radio.checked = true;
            }
          });
        }
        
        // UIを更新
        updateCategoryTab();
        renderSelectedIngredients();
        updateClearButtonState();
        
        console.log('状態を復元しました:', {
          selectedIngredients: selectedIngredients.length,
          currentCategory: currentCategory,
          settings: state.settings
        });
      }
    } catch (error) {
      console.error('状態復元エラー:', error);
      // エラーが発生した場合は初期状態に設定
      selectedIngredients = [];
      currentCategory = 'vegetables';
      updateCategoryTab();
      renderSelectedIngredients();
      updateClearButtonState();
    }
  }
  
  // カテゴリータブの表示を更新
  function updateCategoryTab() {
    // カテゴリータブの状態更新
    document.querySelectorAll('.ingredient-tab').forEach(tab => {
      tab.classList.remove('active');
      if (tab.dataset.category === currentCategory) {
        tab.classList.add('active');
      }
    });
    
    // すべて表示ボタンの状態更新
    if (allIngredientsBtn) {
      if (currentCategory === 'all') {
        allIngredientsBtn.classList.add('active');
      } else {
        allIngredientsBtn.classList.remove('active');
      }
    }
  }
  
  // クリアボタンの状態を更新
  function updateClearButtonState() {
    if (clearAllBtn) {
      clearAllBtn.disabled = selectedIngredients.length === 0;
    }
  }
  
  // 食材データを読み込み
  async function loadIngredientsData() {
    try {
      const response = await fetch('ingredients.json');
      ingredientsData = await response.json();
    } catch (error) {
      console.error('食材データの読み込みに失敗しました:', error);
      // フォールバックデータ
      ingredientsData = {
        vegetables: [
          { id: "onion", name: "たまねぎ", season: ["春", "夏", "秋", "冬"] },
          { id: "carrot", name: "にんじん", season: ["秋", "冬"] },
          { id: "potato", name: "じゃがいも", season: ["春", "秋"] },
          { id: "cabbage", name: "キャベツ", season: ["春", "秋", "冬"] },
          { id: "tomato", name: "トマト", season: ["夏"] },
          { id: "pepper", name: "ピーマン", season: ["夏"] },
          { id: "eggplant", name: "なす", season: ["夏"] },
          { id: "cucumber", name: "きゅうり", season: ["夏"] },
          { id: "spinach", name: "ほうれん草", season: ["冬"] },
          { id: "beanSprouts", name: "もやし", season: ["春", "夏", "秋", "冬"] },
          { id: "lettuce", name: "レタス", season: ["春", "夏"] },
          { id: "broccoli", name: "ブロッコリー", season: ["冬"] },
          { id: "whiteCabbage", name: "白菜", season: ["冬"] },
          { id: "corn", name: "とうもろこし", season: ["夏"] },
          { id: "daikon", name: "大根", season: ["冬"] },
          { id: "mushroom", name: "きのこ", season: ["秋"] },
          { id: "asparagus", name: "アスパラガス", season: ["春"] },
          { id: "sweetPotato", name: "さつまいも", season: ["秋"] },
          { id: "pumpkin", name: "かぼちゃ", season: ["秋"] },
          { id: "ginger", name: "しょうが", season: ["春", "夏", "秋", "冬"] }
        ],
        meat: [
          { id: "pork", name: "豚肉", season: ["春", "夏", "秋", "冬"] },
          { id: "porkBelly", name: "豚バラ肉", season: ["春", "夏", "秋", "冬"] },
          { id: "chickenThigh", name: "鶏もも肉", season: ["春", "夏", "秋", "冬"] },
          { id: "chickenBreast", name: "鶏むね肉", season: ["春", "夏", "秋", "冬"] },
          { id: "beef", name: "牛肉", season: ["春", "夏", "秋", "冬"] },
          { id: "groundPork", name: "豚ひき肉", season: ["春", "夏", "秋", "冬"] },
          { id: "groundBeef", name: "牛ひき肉", season: ["春", "夏", "秋", "冬"] },
          { id: "groundMixed", name: "合いびき肉", season: ["春", "夏", "秋", "冬"] },
          { id: "chickenWing", name: "手羽先", season: ["春", "夏", "秋", "冬"] }
        ],
        seafood: [
          { id: "salmon", name: "鮭", season: ["秋", "冬"] },
          { id: "tuna", name: "まぐろ", season: ["春", "夏", "秋", "冬"] },
          { id: "shrimp", name: "えび", season: ["春", "夏", "秋", "冬"] },
          { id: "squid", name: "いか", season: ["春", "夏", "秋", "冬"] },
          { id: "mackerel", name: "さば", season: ["秋", "冬"] },
          { id: "yellowtail", name: "あじ", season: ["夏"] },
          { id: "cod", name: "たら", season: ["冬"] },
          { id: "octopus", name: "たこ", season: ["夏"] },
          { id: "scallop", name: "ホタテ", season: ["冬"] },
          { id: "clam", name: "あさり", season: ["春"] }
        ],
        processed: [
          { id: "ham", name: "ハム", season: ["春", "夏", "秋", "冬"] },
          { id: "bacon", name: "ベーコン", season: ["春", "夏", "秋", "冬"] },
          { id: "sausage", name: "ソーセージ", season: ["春", "夏", "秋", "冬"] },
          { id: "cheese", name: "チーズ", season: ["春", "夏", "秋", "冬"] },
          { id: "mozzarella", name: "モッツァレラチーズ", season: ["春", "夏", "秋", "冬"] },
          { id: "egg", name: "卵", season: ["春", "夏", "秋", "冬"] },
          { id: "tofu", name: "豆腐", season: ["春", "夏", "秋", "冬"] },
          { id: "natto", name: "納豆", season: ["春", "夏", "秋", "冬"] },
          { id: "yogurt", name: "ヨーグルト", season: ["春", "夏", "秋", "冬"] },
          { id: "butter", name: "バター", season: ["春", "夏", "秋", "冬"] },
          { id: "milk", name: "牛乳", season: ["春", "夏", "秋", "冬"] }
        ],
        grains: [
          { id: "bread", name: "パン", season: ["春", "夏", "秋", "冬"] },
          { id: "pasta", name: "パスタ", season: ["春", "夏", "秋", "冬"] },
          { id: "rice", name: "米", season: ["春", "夏", "秋", "冬"] },
          { id: "noodles", name: "うどん", season: ["春", "夏", "秋", "冬"] },
          { id: "soba", name: "そば", season: ["春", "夏", "秋", "冬"] },
          { id: "ramen", name: "ラーメン", season: ["春", "夏", "秋", "冬"] }
        ],
        seasonings: [
          { id: "soySauce", name: "醤油", season: ["春", "夏", "秋", "冬"] },
          { id: "miso", name: "味噌", season: ["春", "夏", "秋", "冬"] },
          { id: "salt", name: "塩", season: ["春", "夏", "秋", "冬"] },
          { id: "sugar", name: "砂糖", season: ["春", "夏", "秋", "冬"] },
          { id: "oil", name: "サラダ油", season: ["春", "夏", "秋", "冬"] },
          { id: "oliveOil", name: "オリーブオイル", season: ["春", "夏", "秋", "冬"] },
          { id: "sesameOil", name: "ごま油", season: ["春", "夏", "秋", "冬"] },
          { id: "vinegar", name: "酢", season: ["春", "夏", "秋", "冬"] },
          { id: "mirin", name: "みりん", season: ["春", "夏", "秋", "冬"] },
          { id: "dashi", name: "だしの素", season: ["春", "夏", "秋", "冬"] },
          { id: "consomme", name: "コンソメ", season: ["春", "夏", "秋", "冬"] },
          { id: "pepper", name: "こしょう", season: ["春", "夏", "秋", "冬"] },
          { id: "garlic", name: "にんにく", season: ["春", "夏", "秋", "冬"] },
          { id: "ketchup", name: "ケチャップ", season: ["春", "夏", "秋", "冬"] },
          { id: "oysterSauce", name: "オイスターソース", season: ["春", "夏", "秋", "冬"] },
          { id: "curry", name: "カレー粉", season: ["春", "夏", "秋", "冬"] }
        ],
        fruits: [
          { id: "apple", name: "りんご", season: ["秋", "冬"] },
          { id: "banana", name: "バナナ", season: ["春", "夏", "秋", "冬"] },
          { id: "orange", name: "みかん", season: ["冬"] },
          { id: "strawberry", name: "いちご", season: ["春"] },
          { id: "grape", name: "ぶどう", season: ["秋"] },
          { id: "peach", name: "桃", season: ["夏"] },
          { id: "lemon", name: "レモン", season: ["冬"] },
          { id: "avocado", name: "アボカド", season: ["春", "夏", "秋", "冬"] },
          { id: "pineapple", name: "パイナップル", season: ["夏"] },
          { id: "mango", name: "マンゴー", season: ["夏"] }
        ]
      };
    }
    
    // 食材データ読み込み完了後に状態復元と初期表示を実行
    loadState();
    renderIngredients();
    updateClearButtonState();
  }
  
  // 食材表示
  function renderIngredients(searchTerm = '') {
    console.log('renderIngredients実行:', {
      searchTerm: searchTerm,
      currentCategory: currentCategory,
      categoryDataExists: currentCategory === 'all' ? 'all categories' : !!ingredientsData[currentCategory]
    });
    
    ingredientGrid.innerHTML = '';
    
    let allIngredients = [];
    
    if (currentCategory === 'all') {
      // すべてのカテゴリーの食材を統合
      Object.keys(ingredientsData).forEach(category => {
        if (ingredientsData[category] && Array.isArray(ingredientsData[category])) {
          ingredientsData[category].forEach(ingredient => {
            allIngredients.push({
              ...ingredient,
              category: category
            });
          });
        }
      });
    } else {
      // 特定のカテゴリーの食材のみ
      if (!ingredientsData[currentCategory]) return;
      allIngredients = ingredientsData[currentCategory].map(ingredient => ({
        ...ingredient,
        category: currentCategory
      }));
    }
    
    const filteredIngredients = allIngredients.filter(ingredient => 
      ingredient.name.toLowerCase().includes(searchTerm)
    );
    
    console.log('フィルタ結果:', {
      totalIngredients: allIngredients.length,
      filteredCount: filteredIngredients.length,
      filteredNames: filteredIngredients.map(ing => ing.name)
    });
    
    filteredIngredients.forEach(ingredient => {
      const ingredientElement = document.createElement('div');
      ingredientElement.className = 'ingredient-item';
      
      // すべて表示モードの場合はカテゴリー名も表示
      if (currentCategory === 'all') {
        const categoryNames = {
          vegetables: '野菜',
          meat: '肉類', 
          seafood: '魚介',
          processed: '加工品・卵乳製品',
          grains: '穀物類・麺類',
          seasonings: '調味料',
          fruits: '果物'
        };
        ingredientElement.innerHTML = `
          <div style="font-weight: bold;">${ingredient.name}</div>
          <div style="font-size: 0.7rem; color: #666; margin-top: 2px;">${categoryNames[ingredient.category] || ingredient.category}</div>
        `;
      } else {
        ingredientElement.textContent = ingredient.name;
      }
      
      ingredientElement.dataset.id = ingredient.id;
      ingredientElement.dataset.name = ingredient.name;
      
      // 選択済みかチェック
      const selectedIngredient = selectedIngredients.find(item => item.id === ingredient.id);
      if (selectedIngredient) {
        ingredientElement.classList.add('selected');
        ingredientElement.classList.add(`category-${selectedIngredient.category}`);
      }
      
      ingredientElement.addEventListener('click', () => {
        // すべて表示モードの場合は、クリック時に一時的にカテゴリーを設定
        const originalCategory = currentCategory;
        if (currentCategory === 'all') {
          currentCategory = ingredient.category;
        }
        toggleIngredient(ingredient);
        if (originalCategory === 'all') {
          currentCategory = originalCategory;
        }
      });
      
      ingredientGrid.appendChild(ingredientElement);
    });
  }
  
  // 食材選択/解除
  function toggleIngredient(ingredient) {
    const existingIndex = selectedIngredients.findIndex(item => item.id === ingredient.id);
    
    if (existingIndex >= 0) {
      // 選択解除
      selectedIngredients.splice(existingIndex, 1);
          } else {
      // 選択追加（カテゴリー情報も保存）
      const ingredientWithCategory = {
        ...ingredient,
        category: currentCategory
      };
      selectedIngredients.push(ingredientWithCategory);
    }
    
    renderSelectedIngredients();
    const searchValue = headerIngredientSearch ? headerIngredientSearch.value : '';
    renderIngredients(searchValue);
    saveState();
    updateClearButtonState();
  }
  
  // 選択済み食材の表示
  function renderSelectedIngredients() {
    if (selectedIngredients.length === 0) {
      selectedList.innerHTML = '<span style="color: #999;">まだ食材が選択されていません</span>';
      updateClearButtonState();
      return;
    }
    
    selectedList.innerHTML = '';
    
    // カテゴリーごとの色設定
    const categoryColors = {
      vegetables: '#4CAF50',      // 緑（野菜）
      meat: '#E53935',           // 赤（肉類）
      seafood: '#1E88E5',        // 青（魚介）
      processed: '#FF9800',      // オレンジ（加工品・卵・乳製品）
      grains: '#795548',         // 茶色（穀物）
      seasonings: '#8E24AA',     // 紫（調味料）
      fruits: '#E91E63'          // ピンク（果物）
    };
    
    // カテゴリーごとにグループ化して表示
    const groupedIngredients = {};
    selectedIngredients.forEach(ingredient => {
      if (!groupedIngredients[ingredient.category]) {
        groupedIngredients[ingredient.category] = [];
      }
      groupedIngredients[ingredient.category].push(ingredient);
    });
    
    // カテゴリー順で表示
    const categoryOrder = ['vegetables', 'meat', 'seafood', 'processed', 'grains', 'seasonings', 'fruits'];
    categoryOrder.forEach(category => {
      if (groupedIngredients[category]) {
        groupedIngredients[category].forEach(ingredient => {
          const tag = document.createElement('div');
          tag.className = `selected-tag category-${ingredient.category}`;
          const bgColor = categoryColors[ingredient.category] || '#666';
          tag.style.backgroundColor = bgColor;
          tag.innerHTML = `
            ${ingredient.name}
            <span class="remove" data-id="${ingredient.id}">×</span>
          `;
          
          tag.querySelector('.remove').addEventListener('click', (e) => {
            e.stopPropagation();
            toggleIngredient(ingredient);
          });
          
          selectedList.appendChild(tag);
        });
      }
    });
    
    updateClearButtonState();
  }
  
  // レシピ生成ボタンのイベントリスナー
  generateRecipeBtn.addEventListener('click', generateRecipe);
  
  // おまかせ選択ボタンのイベントリスナー
  randomSelectBtn.addEventListener('click', randomSelectIngredients);
  
  // クリアボタンのイベントリスナー
  clearAllBtn.addEventListener('click', () => {
    selectedIngredients = [];
    renderSelectedIngredients();
    renderIngredients();
    saveState();
    updateClearButtonState();
  });
  
  // 設定値を取得
  function getSelectedValues() {
    return {
      ingredients: selectedIngredients.map(ing => ing.name),
      season: document.querySelector('input[name="season"]:checked').value,
      mealType: document.querySelector('input[name="mealType"]:checked').value,
      cookingTime: document.querySelector('input[name="cookingTime"]:checked').value,
      cuisine: document.querySelector('input[name="cuisine"]:checked').value,
      servings: document.querySelector('input[name="servings"]:checked').value
    };
  }
  
  // レシピ生成
  async function generateRecipe(isRegenerate = false) {
    if (selectedIngredients.length === 0) {
      return;
    }
    
    const settings = getSelectedValues();
    
    // UI更新
    generateRecipeBtn.disabled = true;
    generateRecipeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> レシピを考えています...';
    loadingIndicator.classList.add('active');
    resultsSection.style.display = 'none';
    
    try {
      // APIリクエスト作成
      const messages = createRecipeMessages(settings, isRegenerate);
      const result = await callLLMAPI(messages);
      displayRecipe(result);
    } catch (error) {
      console.error('レシピ生成エラー:', error);
    } finally {
      // UI復元
      generateRecipeBtn.disabled = false;
      generateRecipeBtn.innerHTML = '<i class="fas fa-magic"></i> レシピを提案してもらう';
      loadingIndicator.classList.remove('active');
    }
  }
  
  // おまかせ食材選択
  function randomSelectIngredients() {
    // 現在の選択をクリア
    selectedIngredients = [];
    
    if (!ingredientsData || Object.keys(ingredientsData).length === 0) {
      return;
    }
    
    // より少ない食材数でのカテゴリーごとの選択ルール
    const selectionRules = {
      vegetables: { min: 1, max: 2 },    // 野菜: 1-2種類
      meat: { min: 0, max: 1 },          // 肉類: 0-1種類（一種類のみ）
      seafood: { min: 0, max: 1 },       // 魚介: 0-1種類
      processed: { min: 0, max: 2 },     // 加工品・卵・乳製品: 0-2種類
      grains: { min: 0, max: 1 },        // 穀物: 0-1種類
      seasonings: { min: 2, max: 3 },    // 調味料: 2-3種類
      fruits: { min: 0, max: 0 }         // 果物: 基本的に選択しない
    };
    
    // 果物を選ぶかどうかの低確率判定（10%の確率で果物を1つ選択）
    const shouldSelectFruit = Math.random() < 0.1;
    if (shouldSelectFruit && ingredientsData['fruits'] && ingredientsData['fruits'].length > 0) {
      selectionRules.fruits.max = 1;
    }
    
    // 各カテゴリーからランダム選択（肉類は特別処理）
    Object.keys(selectionRules).forEach(category => {
      if (ingredientsData[category] && ingredientsData[category].length > 0) {
        const rule = selectionRules[category];
        const count = Math.floor(Math.random() * (rule.max - rule.min + 1)) + rule.min;
        
        if (category === 'meat') {
          // 肉類は一種類のみ選択（異なる肉を混在させない）
          if (count > 0) {
            const categoryIngredients = [...ingredientsData[category]];
            const randomIndex = Math.floor(Math.random() * categoryIngredients.length);
            const selectedIngredient = categoryIngredients[randomIndex];
            
            selectedIngredients.push({
              ...selectedIngredient,
              category: category
            });
          }
        } else {
          // その他のカテゴリーは通常通り複数選択可能
          const categoryIngredients = [...ingredientsData[category]];
          
          for (let i = 0; i < Math.min(count, categoryIngredients.length); i++) {
            const randomIndex = Math.floor(Math.random() * categoryIngredients.length);
            const selectedIngredient = categoryIngredients.splice(randomIndex, 1)[0];
            
            selectedIngredients.push({
              ...selectedIngredient,
              category: category
            });
          }
        }
      }
    });
    
    // 最小食材数の確保（メイン食材が選ばれていない場合の対策）
    if (selectedIngredients.filter(ing => ing.category === 'meat' || ing.category === 'seafood').length === 0) {
      // 肉類または魚介類が選ばれていない場合、どちらか一つを追加
      const mainCategories = ['meat', 'seafood'];
      const randomMainCategory = mainCategories[Math.floor(Math.random() * mainCategories.length)];
      
      if (ingredientsData[randomMainCategory] && ingredientsData[randomMainCategory].length > 0) {
        const categoryIngredients = [...ingredientsData[randomMainCategory]];
        const randomIndex = Math.floor(Math.random() * categoryIngredients.length);
        const selectedIngredient = categoryIngredients[randomIndex];
        
        selectedIngredients.push({
          ...selectedIngredient,
          category: randomMainCategory
        });
      }
    }
    
    // 表示を更新
    renderSelectedIngredients();
    renderIngredients();
    saveState();
    updateClearButtonState();
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
- 料理ジャンル: ${settings.cuisine}
- 人数: ${settings.servings}

【回答形式】
以下のJSON形式で回答してください：

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
1. 指定された食材（調味料以外）はできるだけ多く使用すること
2. **ingredients配列には、指定された食材のみを含めること（追加の食材は含めない）**
3. **ingredients配列には調味料を含めないこと（調味料はseasonings配列に分ける）**
4. **seasonings配列では、すべての調味料にisSelectedフィールドを必ず設定すること**
   - **選択済み調味料（上記の利用可能な食材リストに含まれる調味料）：isSelected: true**
   - **追加した調味料（上記の利用可能な食材リストに含まれない調味料）：isSelected: false**
   - **フィールドの省略は禁止**
   - **重要：利用可能な食材リストをよく確認して、リストに含まれる調味料と含まれない調味料を正確に判別すること**
5. 調味料は必要に応じて自由に追加可能だが、seasonings配列に分けて記載し、isSelectedフィールドで選択済みかどうかを明記すること
6. ingredientUsageフィールドで食材の使用状況を必ず説明すること
7. 指定された条件（季節、時間、ジャンルなど）を考慮すること
8. 実際に作れる現実的なレシピにすること
9. 分量は具体的に記載すること
10. 手順は分かりやすく順序立てて記載すること
11. **指定されていない野菜や肉類などの主要食材を追加で使用しないこと**
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
  
  // レシピレスポンス解析
  function parseRecipeResponse(text) {
    try {
      // JSONの抽出を試行
      let jsonText = text;
      
      // ```json で囲まれている場合の処理
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      } else {
        // { で始まり } で終わる部分を抽出
        const startIndex = text.indexOf('{');
        const lastIndex = text.lastIndexOf('}');
        if (startIndex !== -1 && lastIndex !== -1 && lastIndex > startIndex) {
          jsonText = text.substring(startIndex, lastIndex + 1);
        }
      }
      
      const recipeData = JSON.parse(jsonText);
      
      // 必要なフィールドの検証
      if (!recipeData.menuName || !recipeData.ingredients || !recipeData.cookingSteps) {
        throw new Error('レシピデータに必要なフィールドがありません');
      }
      
      return recipeData;
    } catch (error) {
      console.error('レシピデータ解析エラー:', error);
      console.log('元のテキスト:', text);
      throw new Error('レシピの解析に失敗しました。もう一度お試しください。');
    }
  }
  
  // レシピ表示
  function displayRecipe(recipe) {
    // タイトルと説明
    recipeTitle.textContent = recipe.menuName;
    recipeDescription.textContent = recipe.description || 'AIが提案する美味しいレシピです';
    
    // メタ情報
    recipeMeta.innerHTML = '';
    const metaItems = [
      { icon: 'fas fa-clock', text: recipe.cookingTime || '調理時間不明' },
      { icon: 'fas fa-signal', text: recipe.difficulty || '普通' },
      { icon: 'fas fa-users', text: getSelectedValues().servings }
    ];
    
    metaItems.forEach(item => {
      const metaElement = document.createElement('div');
      metaElement.className = 'meta-item';
      metaElement.innerHTML = `<i class="${item.icon}"></i> ${item.text}`;
      recipeMeta.appendChild(metaElement);
    });
    
    // 材料リスト
    ingredientsList.innerHTML = '';
    
    // 選択された食材のリストを取得（調味料を除く）
    const selectedIngredientNames = selectedIngredients
      .filter(ing => ing.category !== 'seasonings')
      .map(ing => ing.name);
    
    // 選択された調味料のリストを取得
    const selectedSeasoningNames = selectedIngredients
      .filter(ing => ing.category === 'seasonings')
      .map(ing => ing.name);
    
    // 食材 - 選択された食材のみ表示（調味料以外）
    if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
      recipe.ingredients.forEach(ingredient => {
        // 選択された食材のみ表示（調味料は除外）
        if (selectedIngredientNames.includes(ingredient.name)) {
          const item = document.createElement('div');
          item.className = 'ingredient-item-result';
          
          item.innerHTML = `
            <span class="ingredient-name">${ingredient.name}</span>
            <span class="ingredient-amount">${ingredient.amount}</span>
          `;
          ingredientsList.appendChild(item);
        }
      });
    }
    
    // 調味料（選択されたもの + 追加されたもの）
    if (recipe.seasonings && Array.isArray(recipe.seasonings)) {
      recipe.seasonings.forEach(seasoning => {
        const item = document.createElement('div');
        item.className = 'ingredient-item-result seasoning-item';
        
        // 選択された調味料かどうかをチェック
        const isSelectedSeasoning = selectedSeasoningNames.includes(seasoning.name);
        
        // 調味料の選択状態を判定
        // 1. 最初に選択リストで確認（より信頼性が高い）
        // 2. isSelectedフィールドは参考程度に使用
        let isSelected;
        
        // 選択リストに含まれている場合は選択済み
        if (isSelectedSeasoning) {
          isSelected = true;
    } else {
          // 選択リストにない場合は追加された調味料
          isSelected = false;
        }
        
        const selectionClass = !isSelected ? ' not-selected-seasoning' : '';
        const selectionIndicator = !isSelected ? ' <span class="added-seasoning-label" title="追加された調味料">追加</span>' : '';
        
        item.innerHTML = `
          <span class="ingredient-name${selectionClass}">${seasoning.name}${selectionIndicator}</span>
          <span class="ingredient-amount">${seasoning.amount}</span>
        `;
        ingredientsList.appendChild(item);
      });
    }
    
    // 作り方
    stepsList.innerHTML = '';
    if (recipe.cookingSteps && Array.isArray(recipe.cookingSteps)) {
      recipe.cookingSteps.forEach((step, index) => {
        const stepElement = document.createElement('div');
        stepElement.className = 'step-item';
        stepElement.innerHTML = `
          <div class="step-number">${index + 1}</div>
          <div class="step-text">${step}</div>
        `;
        stepsList.appendChild(stepElement);
      });
    }
    
    // コツ・ポイントと食材使用状況を更新
    const recipeTipsSection = document.getElementById('recipeTips');
    if (recipeTipsSection) {
      recipeTipsSection.innerHTML = '';
      
      // 再生成ボタンをコツ・ポイントの上に表示
      if (selectedIngredients.length > 0) {
        const regenerateButtonDiv = document.createElement('div');
        regenerateButtonDiv.className = 'regenerate-button-section';
        regenerateButtonDiv.innerHTML = `
          <button class="generate-btn secondary-btn" id="regenerateRecipeBtn2">
            <i class="fas fa-redo"></i>
            同じ食材と調味料で違うメニューを考える
          </button>
          <button class="generate-btn detail-btn" id="detailRecipeBtn">
            <i class="fas fa-list-ol"></i>
            詳細な作り方を表示
          </button>
        `;
        recipeTipsSection.appendChild(regenerateButtonDiv);
        
        // 新しい再生成ボタンにイベントリスナーを追加
        const newRegenerateBtn = regenerateButtonDiv.querySelector('#regenerateRecipeBtn2');
        newRegenerateBtn.addEventListener('click', () => generateRecipe(true));
        
        // 詳細作り方ボタンにイベントリスナーを追加
        const detailBtn = regenerateButtonDiv.querySelector('#detailRecipeBtn');
        detailBtn.addEventListener('click', () => generateDetailedSteps(recipe));
      }
      
      // コツ・ポイント
      const tipsDiv = document.createElement('div');
      tipsDiv.className = 'tips-section';
      tipsDiv.innerHTML = `
        <div class="tips-title">
          <i class="fas fa-lightbulb"></i>
          コツ・ポイント
        </div>
        <div class="tips-content">${recipe.tips || '美味しく作るコツをお楽しみください！'}</div>
      `;
      recipeTipsSection.appendChild(tipsDiv);
      
      // 食材使用状況（常時表示）
      const usageDiv = document.createElement('div');
      usageDiv.className = 'ingredient-usage-section';
      usageDiv.style.marginTop = '1.5rem';
      
      let usageContent = '';
      let usageReason = '';
      
      // 新しいフォーマット（ingredientUsage）をチェック
      if (recipe.ingredientUsage) {
        const usedIngredients = recipe.ingredientUsage.used || [];
        const unusedIngredients = recipe.ingredientUsage.unused || [];
        usageReason = recipe.ingredientUsage.reason || '';
        
        if (unusedIngredients.length > 0) {
          usageContent = `
            <p><strong>使用した食材:</strong> ${usedIngredients.join('、')}</p>
            <p><strong>使用されなかった食材:</strong> ${unusedIngredients.join('、')}</p>
          `;
    } else {
          usageContent = `
            <p><strong>使用した食材:</strong> ${usedIngredients.join('、')}</p>
            <p style="color: #4CAF50;"><strong>✓ 選択された食材はすべて使用されました</strong></p>
          `;
        }
    } else {
        // 従来のフォーマット（unusedIngredients）との互換性
        const usedIngredients = [];
        if (recipe.ingredients) {
          usedIngredients.push(...recipe.ingredients.map(ing => ing.name));
        }
        if (recipe.seasonings) {
          usedIngredients.push(...recipe.seasonings.map(ing => ing.name));
        }
        
        const selectedIngredientNames = selectedIngredients.map(ing => ing.name);
        const unusedIngredients = selectedIngredientNames.filter(name => 
          !usedIngredients.some(usedName => 
            usedName.includes(name) || name.includes(usedName)
          )
        );
        
        if (recipe.unusedIngredients && recipe.unusedIngredients.reason) {
          usageReason = recipe.unusedIngredients.reason;
    } else {
          usageReason = unusedIngredients.length > 0 ? 
            '今回のレシピでは、料理のバランスや調理時間、指定されたジャンルを考慮して、これらの食材は使用しませんでした。' :
            '選択された食材はすべて使用されました。';
        }
        
        if (unusedIngredients.length > 0) {
          usageContent = `
            <p><strong>使用されなかった食材:</strong> ${unusedIngredients.join('、')}</p>
          `;
      } else {
          usageContent = `
            <p style="color: #4CAF50;"><strong>✓ 選択された食材はすべて使用されました</strong></p>
          `;
        }
      }
      
      usageDiv.innerHTML = `
        <div class="usage-title">
          <i class="fas fa-info-circle"></i>
          食材の使用状況
        </div>
        <div class="usage-content">
          ${usageContent}
          <p><strong>説明:</strong> ${usageReason}</p>
          <div class="usage-note">
            <p><em>※ 調味料については、料理に必要な場合は追加で使用しています（<span class="added-seasoning-label">追加</span>マーク付き）</em></p>
            <p><em>※ 「同じ食材と調味料で違うメニューを考える」ボタンを押すと、異なるレシピを提案できます。</em></p>
        </div>
      </div>
    `;
      recipeTipsSection.appendChild(usageDiv);
    } else {
      // 従来の方法（フォールバック）
      tipsContent.textContent = recipe.tips || '美味しく作るコツをお楽しみください！';
    }
    
    // 結果表示
    resultsSection.style.display = 'block';
    
    // スクロール位置をレシピ生成ボタンの少し下に調整
    const generateButton = document.getElementById('generateRecipeBtn');
    if (generateButton) {
      const buttonRect = generateButton.getBoundingClientRect();
      const scrollOffset = window.pageYOffset + buttonRect.bottom + 50; // ボタンの下から50px下
      window.scrollTo({ 
        top: scrollOffset, 
        behavior: 'smooth' 
      });
    } else {
      // フォールバック: 従来の方法
      resultsSection.scrollIntoView({ behavior: 'smooth' });
    }
  }
  
  // 詳細な作り方を生成
  async function generateDetailedSteps(currentRecipe) {
    if (!currentRecipe) return;
    
    const settings = getSelectedValues();
    
    // ボタンの状態を更新
    const detailBtn = document.getElementById('detailRecipeBtn');
    const regenerateBtn = document.getElementById('regenerateRecipeBtn2');
    
    if (detailBtn) {
      detailBtn.disabled = true;
      detailBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 詳細な手順を作成中...';
    }
    if (regenerateBtn) {
      regenerateBtn.disabled = true;
    }
    
    try {
      // 詳細な作り方生成用のメッセージ作成
      const messages = createDetailedStepsMessages(currentRecipe, settings);
      
      // 詳細ステップ専用のAPI呼び出し
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
      
      let responseText = '';
      if (data.choices && data.choices.length > 0 && data.choices[0].message) {
        responseText = data.choices[0].message.content;
      } else if (data.answer) {
        responseText = data.answer;
      } else {
        throw new Error('レスポンスに期待されるフィールドがありません');
      }
      
      // 詳細ステップ専用の解析関数を使用
      const result = parseDetailedStepsResponse(responseText);
      
      // レスポンスから詳細ステップを抽出
      let detailedSteps = null;
      if (result.detailedSteps && Array.isArray(result.detailedSteps)) {
        detailedSteps = result.detailedSteps;
      }
      
      if (detailedSteps && detailedSteps.length > 0) {
        // 作り方セクションのみを更新
        updateStepsSection(detailedSteps);
        
        // ボタンの文言を変更
        if (detailBtn) {
          detailBtn.innerHTML = '<i class="fas fa-check"></i> 詳細表示済み';
          detailBtn.style.background = 'linear-gradient(135deg, #4CAF50, #45a049)';
          detailBtn.disabled = true;
        }
      } else {
        throw new Error('詳細な手順の取得に失敗しました');
      }
      
    } catch (error) {
      console.error('詳細な作り方生成エラー:', error);
      if (detailBtn) {
        detailBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> 再試行';
        detailBtn.disabled = false;
      }
    } finally {
      if (regenerateBtn) {
        regenerateBtn.disabled = false;
      }
    }
  }
  
  // 詳細な作り方生成用のメッセージ作成
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
JSON形式で以下のように回答してください：

{
  "detailedSteps": [
    "詳細な手順1",
    "詳細な手順2",
    "詳細な手順3"
  ]
}
`;
    
    return [
      {
        role: "user",
        content: prompt
      }
    ];
  }
  
  // 作り方セクションのみを更新
  function updateStepsSection(detailedSteps) {
    const stepsList = document.getElementById('stepsList');
    if (!stepsList || !detailedSteps || !Array.isArray(detailedSteps)) return;
    
    stepsList.innerHTML = '';
    
    detailedSteps.forEach((step, index) => {
      const stepElement = document.createElement('div');
      stepElement.className = 'step-item detailed-step';
      stepElement.innerHTML = `
        <div class="step-number">${index + 1}</div>
        <div class="step-text">${step}</div>
      `;
      stepsList.appendChild(stepElement);
    });
    
    // 詳細表示されたことを示すスタイル追加
    stepsList.style.background = 'linear-gradient(135deg, #f8f9fa, #e3f2fd)';
    stepsList.style.border = '2px solid #2196F3';
  }
  
  // 詳細ステップ専用のレスポンス解析
  function parseDetailedStepsResponse(text) {
    try {
      // JSONの抽出を試行
      let jsonText = text;
      
      // ```json で囲まれている場合の処理
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      } else {
        // { で始まり } で終わる部分を抽出
        const startIndex = text.indexOf('{');
        const lastIndex = text.lastIndexOf('}');
        if (startIndex !== -1 && lastIndex !== -1 && lastIndex > startIndex) {
          jsonText = text.substring(startIndex, lastIndex + 1);
        }
      }
      
      const data = JSON.parse(jsonText);
      
      // detailedStepsフィールドの検証
      if (data.detailedSteps && Array.isArray(data.detailedSteps)) {
        return data;
        } else {
        throw new Error('詳細ステップデータに必要なフィールドがありません');
      }
    } catch (error) {
      console.error('詳細ステップデータ解析エラー:', error);
      console.log('元のテキスト:', text);
      throw new Error('詳細ステップの解析に失敗しました。もう一度お試しください。');
    }
  }
  
  // 初期化処理
  async function initialize() {
    console.log('アプリケーションを初期化しています...');
    
    // 食材データを読み込み
    await loadIngredientsData();
    
    // 検索機能のイベントリスナーを設定（ヘッダー検索窓）
    if (headerIngredientSearch) {
      console.log('ヘッダー検索窓が見つかりました。イベントリスナーを設定します。');
      headerIngredientSearch.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        console.log('検索実行:', searchTerm);
        renderIngredients(searchTerm);
      });
    } else {
      console.error('headerIngredientSearch 要素が見つかりません');
    }
    
    // すべての食材表示ボタンのイベントリスナーを設定
    if (allIngredientsBtn) {
      allIngredientsBtn.addEventListener('click', () => {
        currentCategory = 'all';
        updateCategoryTab();
        const searchValue = headerIngredientSearch ? headerIngredientSearch.value : '';
        renderIngredients(searchValue);
      });
    }
    
    // カテゴリータブのイベントリスナーを設定
    document.querySelectorAll('.ingredient-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const category = tab.dataset.category;
        currentCategory = category;
        updateCategoryTab();
        const searchValue = headerIngredientSearch ? headerIngredientSearch.value : '';
        renderIngredients(searchValue);
    });
  });
  
    console.log('初期化完了');
  }
  
  // 初期化実行
  initialize();
}); 