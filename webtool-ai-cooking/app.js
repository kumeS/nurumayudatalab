/**
 * AI料理提案システム JavaScript
 * LLMを活用した料理レシピ提案ツール
 */

document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});

function initializeApp() {

  // 要素の参照を取得
  const headerIngredientSearch = document.getElementById('headerIngredientSearch');
  const allIngredientsBtn = document.getElementById('allIngredientsBtn');
  const ingredientGrid = document.getElementById('ingredientGrid');
  const selectedList = document.getElementById('selectedList');
  const ingredientWarning = document.getElementById('ingredientWarning');
  const warningContent = document.getElementById('warningContent');
  const generateRecipeBtn = document.getElementById('generateRecipeBtn');
  const regenerateRecipeBtn = document.getElementById('regenerateRecipeBtn');
  const randomSelectBtn = document.getElementById('randomSelectBtn');
  const randomSettingsBtn = document.getElementById('randomSettingsBtn');
  const exportDataBtn = document.getElementById('exportDataBtn');
  const importDataBtn = document.getElementById('importDataBtn');
  const importFileInput = document.getElementById('importFileInput');
  const clearAllDataBtn = document.getElementById('clearAllDataBtn');
  const clearAllBtn = document.getElementById('clearAllBtn');
  const loadingIndicator = document.getElementById('loadingIndicator');
  const menuSelectionSection = document.getElementById('menuSelectionSection');
  const menuGrid = document.getElementById('menuGrid');
  const menuDecisionBtn = document.getElementById('menuDecisionBtn');
  const backToMenuBtn = document.getElementById('backToMenuBtn');
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
  let currentRecipe = null;
  let proposedMenus = [];
  let selectedMenuIndex = -1;
  
  // 注意喚起が必要な食材の定義
  const warningIngredients = {
    'natto': {
      name: '納豆',
      message: '納豆は独特の風味と粘りがあるため、他の食材との組み合わせに注意が必要です。',
      tips: '臭いが強いため、他の繊細な味の食材と合わせる場合は調理法を工夫しましょう。'
    },
    'pasta': {
      name: 'パスタ',
      category: 'grains',
      message: 'パスタなどの麺類は主食となるため、他の炭水化物との重複に注意してください。',
      tips: '米やパンなど他の主食と同時に選択されています。メニュー提案時にバランスを考慮します。'
    },
    'noodles': {
      name: 'うどん',
      category: 'grains',
      message: 'うどんなどの麺類は主食となるため、他の炭水化物との重複に注意してください。',
      tips: '米やパンなど他の主食と同時に選択されています。メニュー提案時にバランスを考慮します。'
    },
    'soba': {
      name: 'そば',
      category: 'grains',
      message: 'そばなどの麺類は主食となるため、他の炭水化物との重複に注意してください。',
      tips: '米やパンなど他の主食と同時に選択されています。メニュー提案時にバランスを考慮します。'
    },
    'ramen': {
      name: 'ラーメン',
      category: 'grains',
      message: 'ラーメンなどの麺類は主食となるため、他の炭水化物との重複に注意してください。',
      tips: '米やパンなど他の主食と同時に選択されています。メニュー提案時にバランスを考慮します。'
    },
    'rice': {
      name: '米',
      category: 'grains',
      message: '米は主食となるため、他の炭水化物との重複に注意してください。',
      tips: 'パスタやパンなど他の主食と同時に選択されています。メニュー提案時にバランスを考慮します。'
    },
    'bread': {
      name: 'パン',
      category: 'grains',
      message: 'パンは主食となるため、他の炭水化物との重複に注意してください。',
      tips: '米やパスタなど他の主食と同時に選択されています。メニュー提案時にバランスを考慮します。'
    }
  };
  
  // 状態保存機能
  function saveState() {
    const selectedCuisines = Array.from(document.querySelectorAll('input[name="cuisine"]:checked')).map(input => input.value);
    const selectedCookingMethods = Array.from(document.querySelectorAll('input[name="cookingMethod"]:checked')).map(input => input.value);
    
    const state = {
      selectedIngredients: selectedIngredients,
      currentCategory: currentCategory,
      settings: {
        season: document.querySelector('input[name="season"]:checked')?.value || '春',
        mealType: document.querySelector('input[name="mealType"]:checked')?.value || '昼食',
        cookingTime: document.querySelector('input[name="cookingTime"]:checked')?.value || '30分以内',
        cuisine: selectedCuisines.length > 0 ? selectedCuisines : ['和食'],
        cookingMethod: selectedCookingMethods.length > 0 ? selectedCookingMethods : ['ランダム'],
        servings: document.querySelector('input[name="servings"]:checked')?.value || '2人分'
      },
      // メニューとレシピの状態も保存
      proposedMenus: proposedMenus,
      selectedMenuIndex: selectedMenuIndex,
      currentRecipe: currentRecipe,
      // 詳細表示状態も保存
      isDetailedStepsDisplayed: currentRecipe && document.querySelector('#stepsList .detailed-step') ? true : false
    };
    localStorage.setItem('aiCookingState', JSON.stringify(state));
    console.log('状態を保存しました:', {
      selectedIngredients: selectedIngredients.length,
      currentCategory: currentCategory,
      settings: state.settings,
      hasMenus: proposedMenus.length > 0,
      hasRecipe: currentRecipe !== null
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
            const settingValue = state.settings[key];
            
            if (key === 'cuisine' || key === 'cookingMethod') {
              // 複数選択項目の場合
              // まず全てのチェックを外す
              document.querySelectorAll(`input[name="${key}"]`).forEach(input => {
                input.checked = false;
              });
              
              // 保存された値に対応するチェックボックスをオンにする
              if (Array.isArray(settingValue)) {
                settingValue.forEach(value => {
                  const checkbox = document.querySelector(`input[name="${key}"][value="${value}"]`);
                  if (checkbox) {
                    checkbox.checked = true;
                  }
                });
              } else {
                // 古い形式（文字列）の場合の互換性対応
                const checkbox = document.querySelector(`input[name="${key}"][value="${settingValue}"]`);
                if (checkbox) {
                  checkbox.checked = true;
                }
              }
            } else {
              // 単一選択項目の場合（従来通り）
              const radio = document.querySelector(`input[name="${key}"][value="${settingValue}"]`);
              if (radio) {
                radio.checked = true;
              }
            }
          });
        }
        
        // メニューの復元
        if (state.proposedMenus && Array.isArray(state.proposedMenus) && state.proposedMenus.length > 0) {
          proposedMenus = state.proposedMenus;
          selectedMenuIndex = state.selectedMenuIndex || -1;
          displayMenuSelection(proposedMenus);
          
          // 選択されたメニューがあれば復元
          if (selectedMenuIndex >= 0) {
            setTimeout(() => {
              const menuCards = document.querySelectorAll('.menu-card');
              if (menuCards[selectedMenuIndex]) {
                menuCards[selectedMenuIndex].classList.add('selected');
                const checkIcon = menuCards[selectedMenuIndex].querySelector('.menu-check');
                if (checkIcon) checkIcon.style.display = 'block';
                updateDecisionButton();
              }
            }, 100);
          }
        }
        
        // レシピの復元
        if (state.currentRecipe) {
          currentRecipe = state.currentRecipe;
          const validationResult = validateRecipeIngredients(currentRecipe);
          displayRecipe(validationResult.validatedRecipe);
          
          // 詳細表示状態の復元
          if (state.isDetailedStepsDisplayed && currentRecipe.cookingSteps) {
            setTimeout(() => {
              updateStepsSection(currentRecipe.cookingSteps);
              
              // 詳細表示ボタンの状態も復元
              const detailBtn = document.getElementById('detailRecipeBtn');
              if (detailBtn) {
                detailBtn.innerHTML = '<i class="fas fa-check"></i> 詳細表示済み';
                detailBtn.style.background = 'linear-gradient(135deg, #4CAF50, #45a049)';
                detailBtn.disabled = true;
              }
            }, 100);
          }
          
          // レシピ表示領域を表示
          const recipeResult = document.getElementById('recipeResult');
          if (recipeResult) {
            recipeResult.style.display = 'block';
          }
        }
        
        // UIを更新
        updateCategoryTab();
        renderSelectedIngredients();
        updateClearButtonState();
        
        console.log('状態を復元しました（メニュー・レシピ含む）:', {
          selectedIngredients: selectedIngredients.length,
          currentCategory: currentCategory,
          hasMenus: proposedMenus.length > 0,
          hasRecipe: currentRecipe !== null,
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
  
  // 注意喚起をチェック・表示
  function checkAndShowWarnings() {
    if (!ingredientWarning || !warningContent) return;
    
    const warnings = [];
    const grainIngredients = [];
    
    selectedIngredients.forEach(ingredient => {
      // 個別の注意喚起食材をチェック
      if (warningIngredients[ingredient.id]) {
        const warningInfo = warningIngredients[ingredient.id];
        
        // 穀物類の場合は別途処理
        if (warningInfo.category === 'grains') {
          grainIngredients.push(ingredient.name);
        } else {
          warnings.push({
            type: 'individual',
            ingredient: ingredient.name,
            message: warningInfo.message,
            tips: warningInfo.tips
          });
        }
      }
    });
    
    // 穀物類が複数選択されている場合の警告
    if (grainIngredients.length > 1) {
      warnings.push({
        type: 'grains',
        ingredients: grainIngredients,
        message: '複数の主食が選択されています。メニュー提案時に適切に使い分けます。',
        tips: '1つのメニューでは通常1種類の主食のみを使用するため、選択された主食から最適なものを自動選択します。'
      });
    }
    
    // 警告がある場合は表示
    if (warnings.length > 0) {
      let warningHtml = `
        <div class="warning-icon">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <div class="warning-text">
          <div class="warning-title">選択食材に関する注意事項</div>
      `;
      
      warnings.forEach(warning => {
        if (warning.type === 'individual') {
          warningHtml += `
            <div class="warning-message">
              <span class="warning-ingredients">${warning.ingredient}</span>
              ${warning.message}
            </div>
            <div class="warning-message" style="font-size: 0.85rem; color: #8d6e63; margin-bottom: 0.75rem;">
              💡 ${warning.tips}
            </div>
          `;
        } else if (warning.type === 'grains') {
          warningHtml += `
            <div class="warning-message">
              <span class="warning-ingredients">${warning.ingredients.join(', ')}</span>
              ${warning.message}
            </div>
            <div class="warning-message" style="font-size: 0.85rem; color: #8d6e63; margin-bottom: 0.75rem;">
              💡 ${warning.tips}
            </div>
          `;
        }
      });
      
      warningHtml += `
        </div>
      `;
      
      warningContent.innerHTML = warningHtml;
      ingredientWarning.style.display = 'block';
    } else {
      ingredientWarning.style.display = 'none';
    }
  }
  
  // 食材データ（ingredients.jsonの内容を組み込み）
  const INGREDIENTS_DATA = {
    vegetables: [
      { id: "onion", name: "たまねぎ", season: ["春", "夏", "秋", "冬"] },
      { id: "greenOnion", name: "ネギ", season: ["秋", "冬"] },
      { id: "cabbage", name: "キャベツ", season: ["春", "秋", "冬"] },
      { id: "lettuce", name: "レタス", season: ["春", "夏"] },
      { id: "tomato", name: "トマト", season: ["夏"] },
      { id: "carrot", name: "にんじん", season: ["秋", "冬"] },
      { id: "potato", name: "じゃがいも", season: ["春", "秋"] },
      { id: "pepper", name: "ピーマン", season: ["夏"] },
      { id: "eggplant", name: "なす", season: ["夏"] },
      { id: "cucumber", name: "きゅうり", season: ["夏"] },
      { id: "spinach", name: "ほうれん草", season: ["冬"] },
      { id: "beanSprouts", name: "もやし", season: ["春", "夏", "秋", "冬"] },
      { id: "whiteCabbage", name: "白菜", season: ["冬"] },
      { id: "broccoli", name: "ブロッコリー", season: ["冬"] },
      { id: "corn", name: "とうもろこし", season: ["夏"] },
      { id: "daikon", name: "大根", season: ["冬"] },
      { id: "mushroom", name: "きのこ", season: ["秋"] },
      { id: "okra", name: "オクラ", season: ["夏"] },
      { id: "zucchini", name: "ズッキーニ", season: ["夏"] },
      { id: "asparagus", name: "アスパラガス", season: ["春"] },
      { id: "redPepper", name: "赤ピーマン", season: ["夏"] },
      { id: "yellowPepper", name: "黄ピーマン", season: ["夏"] },
      { id: "sweetPotato", name: "さつまいも", season: ["秋"] },
      { id: "lotus", name: "れんこん", season: ["秋", "冬"] },
      { id: "bambooShoot", name: "たけのこ", season: ["春"] },
      { id: "ginger", name: "しょうが", season: ["春", "夏", "秋", "冬"] },
      { id: "garlic", name: "にんにく", season: ["春", "夏", "秋", "冬"] },
      { id: "greenBeans", name: "いんげん", season: ["夏"] },
      { id: "pumpkin", name: "かぼちゃ", season: ["秋"] },
      { id: "celery", name: "セロリ", season: ["春", "冬"] },
      { id: "parsley", name: "パセリ", season: ["春", "夏", "秋", "冬"] },
      { id: "shiso", name: "しそ", season: ["夏"] },
      { id: "mizuna", name: "水菜", season: ["冬"] },
      { id: "komatsuna", name: "小松菜", season: ["冬"] },
      { id: "radish", name: "ラディッシュ", season: ["春"] }
    ],
    meat: [
      { id: "beef", name: "牛肉", season: ["春", "夏", "秋", "冬"] },
      { id: "beefSteak", name: "牛ステーキ肉", season: ["春", "夏", "秋", "冬"] },
      { id: "beefRoast", name: "牛ロース", season: ["春", "夏", "秋", "冬"] },
      { id: "pork", name: "豚肉", season: ["春", "夏", "秋", "冬"] },
      { id: "porkBelly", name: "豚バラ肉", season: ["春", "夏", "秋", "冬"] },
      { id: "porkShoulder", name: "豚肩肉", season: ["春", "夏", "秋", "冬"] },
      { id: "porkLoin", name: "豚ロース", season: ["春", "夏", "秋", "冬"] },
      { id: "chickenThigh", name: "鶏もも肉", season: ["春", "夏", "秋", "冬"] },
      { id: "chickenBreast", name: "鶏むね肉", season: ["春", "夏", "秋", "冬"] },
      { id: "chickenWing", name: "手羽先", season: ["春", "夏", "秋", "冬"] },
      { id: "chickenWingette", name: "手羽元", season: ["春", "夏", "秋", "冬"] },
      { id: "groundBeef", name: "牛ひき肉", season: ["春", "夏", "秋", "冬"] },
      { id: "groundPork", name: "豚ひき肉", season: ["春", "夏", "秋", "冬"] },
      { id: "groundChicken", name: "鶏ひき肉", season: ["春", "夏", "秋", "冬"] },
      { id: "groundMixed", name: "合いびき肉", season: ["春", "夏", "秋", "冬"] },
      { id: "lamb", name: "ラム肉", season: ["春", "夏", "秋", "冬"] }
    ],
    seafood: [
      { id: "salmon", name: "鮭", season: ["秋", "冬"] },
      { id: "tuna", name: "まぐろ", season: ["春", "夏", "秋", "冬"] },
      { id: "shrimp", name: "えび", season: ["春", "夏", "秋", "冬"] },
      { id: "squid", name: "いか", season: ["春", "夏", "秋", "冬"] },
      { id: "mackerel", name: "さば", season: ["秋", "冬"] },
      { id: "yellowtail", name: "あじ", season: ["夏"] },
      { id: "cod", name: "たら", season: ["冬"] },
      { id: "sardine", name: "いわし", season: ["秋", "冬"] },
      { id: "seaBream", name: "たい", season: ["春"] },
      { id: "flounder", name: "ひらめ", season: ["冬"] },
      { id: "octopus", name: "たこ", season: ["夏"] },
      { id: "scallop", name: "ホタテ", season: ["冬"] },
      { id: "clam", name: "あさり", season: ["春"] },
      { id: "oyster", name: "牡蠣", season: ["冬"] },
      { id: "mussel", name: "ムール貝", season: ["秋", "冬"] },
      { id: "abalone", name: "アワビ", season: ["夏"] },
      { id: "turbanShell", name: "サザエ", season: ["夏"] },
      { id: "ark", name: "ハマグリ", season: ["春"] },
      { id: "cockle", name: "赤貝", season: ["春"] },
      { id: "whelk", name: "つぶ貝", season: ["秋", "冬"] },
      { id: "crab", name: "カニ", season: ["冬"] },
      { id: "lobster", name: "エビ（大）", season: ["春", "夏", "秋", "冬"] },
      { id: "eel", name: "うなぎ", season: ["夏"] },
      { id: "seaweed", name: "わかめ", season: ["春", "夏", "秋", "冬"] },
      { id: "nori", name: "のり", season: ["春", "夏", "秋", "冬"] }
    ],
    processed: [
      { id: "ham", name: "ハム", season: ["春", "夏", "秋", "冬"] },
      { id: "bacon", name: "ベーコン", season: ["春", "夏", "秋", "冬"] },
      { id: "sausage", name: "ソーセージ", season: ["春", "夏", "秋", "冬"] },
      { id: "salami", name: "サラミ", season: ["春", "夏", "秋", "冬"] },
      { id: "cheese", name: "チーズ", season: ["春", "夏", "秋", "冬"] },
      { id: "mozzarella", name: "モッツァレラチーズ", season: ["春", "夏", "秋", "冬"] },
      { id: "cheddar", name: "チェダーチーズ", season: ["春", "夏", "秋", "冬"] },
      { id: "parmesan", name: "パルメザンチーズ", season: ["春", "夏", "秋", "冬"] },
      { id: "camembert", name: "カマンベールチーズ", season: ["春", "夏", "秋", "冬"] },
      { id: "gouda", name: "ゴーダチーズ", season: ["春", "夏", "秋", "冬"] },
      { id: "blueCheeseNew", name: "ブルーチーズ", season: ["春", "夏", "秋", "冬"] },
      { id: "ricotta", name: "リコッタチーズ", season: ["春", "夏", "秋", "冬"] },
      { id: "mascarpone", name: "マスカルポーネチーズ", season: ["春", "夏", "秋", "冬"] },
      { id: "egg", name: "卵", season: ["春", "夏", "秋", "冬"] },
      { id: "tofu", name: "豆腐", season: ["春", "夏", "秋", "冬"] },
      { id: "silkTofu", name: "絹ごし豆腐", season: ["春", "夏", "秋", "冬"] },
      { id: "firmTofu", name: "木綿豆腐", season: ["春", "夏", "秋", "冬"] },
      { id: "natto", name: "納豆", season: ["春", "夏", "秋", "冬"] },
      { id: "yogurt", name: "ヨーグルト", season: ["春", "夏", "秋", "冬"] },
      { id: "butter", name: "バター", season: ["春", "夏", "秋", "冬"] },
      { id: "margarine", name: "マーガリン", season: ["春", "夏", "秋", "冬"] },
      { id: "cream", name: "生クリーム", season: ["春", "夏", "秋", "冬"] },
      { id: "milk", name: "牛乳", season: ["春", "夏", "秋", "冬"] },
      { id: "cannedTomato", name: "トマト缶", season: ["春", "夏", "秋", "冬"] },
      { id: "coconutMilk", name: "ココナッツミルク", season: ["春", "夏", "秋", "冬"] }
    ],
    grains: [
      { id: "rice", name: "米", season: ["春", "夏", "秋", "冬"] },
      { id: "bread", name: "パン", season: ["春", "夏", "秋", "冬"] },
      { id: "shokupan", name: "食パン", season: ["春", "夏", "秋", "冬"] },
      { id: "wheatFlour", name: "小麦粉", season: ["春", "夏", "秋", "冬"] },
      { id: "cornStarch", name: "片栗粉", season: ["春", "夏", "秋", "冬"] },
      { id: "noodles", name: "麺類", season: ["春", "夏", "秋", "冬"] },
      { id: "udon", name: "うどん", season: ["春", "夏", "秋", "冬"] },
      { id: "soba", name: "そば", season: ["春", "夏", "秋", "冬"] },
      { id: "pasta", name: "パスタ", season: ["春", "夏", "秋", "冬"] }
    ],
    seasonings: [
      { id: "soySauce", name: "醤油", season: ["春", "夏", "秋", "冬"] },
      { id: "lightSoySauce", name: "薄口醤油", season: ["春", "夏", "秋", "冬"] },
      { id: "darkSoySauce", name: "濃口醤油", season: ["春", "夏", "秋", "冬"] },
      { id: "miso", name: "味噌", season: ["春", "夏", "秋", "冬"] },
      { id: "redMiso", name: "赤味噌", season: ["春", "夏", "秋", "冬"] },
      { id: "whiteMiso", name: "白味噌", season: ["春", "夏", "秋", "冬"] },
      { id: "salt", name: "塩", season: ["春", "夏", "秋", "冬"] },
      { id: "sugar", name: "砂糖", season: ["春", "夏", "秋", "冬"] },
      { id: "brownSugar", name: "黒糖", season: ["春", "夏", "秋", "冬"] },
      { id: "vinegar", name: "酢", season: ["春", "夏", "秋", "冬"] },
      { id: "riceVinegar", name: "米酢", season: ["春", "夏", "秋", "冬"] },
      { id: "balsamicVinegar", name: "バルサミコ酢", season: ["春", "夏", "秋", "冬"] },
      { id: "mirin", name: "みりん", season: ["春", "夏", "秋", "冬"] },
      { id: "sake", name: "酒", season: ["春", "夏", "秋", "冬"] },
      { id: "oil", name: "サラダ油", season: ["春", "夏", "秋", "冬"] },
      { id: "oliveOil", name: "オリーブオイル", season: ["春", "夏", "秋", "冬"] },
      { id: "sesameOil", name: "ごま油", season: ["春", "夏", "秋", "冬"] },
      { id: "coconutOil", name: "ココナッツオイル", season: ["春", "夏", "秋", "冬"] },
      { id: "dashi", name: "だしの素", season: ["春", "夏", "秋", "冬"] },
      { id: "konbuDashi", name: "昆布だし", season: ["春", "夏", "秋", "冬"] },
      { id: "katsuoDashi", name: "かつおだし", season: ["春", "夏", "秋", "冬"] },
      { id: "consomme", name: "コンソメ", season: ["春", "夏", "秋", "冬"] },
      { id: "chickenStock", name: "鶏がらスープの素", season: ["春", "夏", "秋", "冬"] },
      { id: "pepper", name: "こしょう", season: ["春", "夏", "秋", "冬"] },
      { id: "blackPepper", name: "黒こしょう", season: ["春", "夏", "秋", "冬"] },
      { id: "whitePepper", name: "白こしょう", season: ["春", "夏", "秋", "冬"] },
      { id: "paprika", name: "パプリカパウダー", season: ["春", "夏", "秋", "冬"] },
      { id: "cayenne", name: "カイエンペッパー", season: ["春", "夏", "秋", "冬"] },
      { id: "cumin", name: "クミン", season: ["春", "夏", "秋", "冬"] },
      { id: "coriander", name: "コリアンダー", season: ["春", "夏", "秋", "冬"] },
      { id: "oregano", name: "オレガノ", season: ["春", "夏", "秋", "冬"] },
      { id: "basil", name: "バジル", season: ["夏"] },
      { id: "thyme", name: "タイム", season: ["春", "夏", "秋", "冬"] },
      { id: "rosemary", name: "ローズマリー", season: ["春", "夏", "秋", "冬"] },
      { id: "curry", name: "カレー粉", season: ["春", "夏", "秋", "冬"] },
      { id: "garam", name: "ガラムマサラ", season: ["春", "夏", "秋", "冬"] },
      { id: "sansho", name: "山椒", season: ["春", "夏", "秋", "冬"] },
      { id: "wasabi", name: "わさび", season: ["春", "夏", "秋", "冬"] },
      { id: "mustard", name: "からし", season: ["春", "夏", "秋", "冬"] },
      { id: "ketchup", name: "ケチャップ", season: ["春", "夏", "秋", "冬"] },
      { id: "worcestershire", name: "ウスターソース", season: ["春", "夏", "秋", "冬"] },
      { id: "tonkatsu", name: "とんかつソース", season: ["春", "夏", "秋", "冬"] },
      { id: "oysterSauce", name: "オイスターソース", season: ["春", "夏", "秋", "冬"] },
      { id: "fishSauce", name: "ナンプラー", season: ["春", "夏", "秋", "冬"] },
      { id: "tabasco", name: "タバスコ", season: ["春", "夏", "秋", "冬"] },
      { id: "honey", name: "はちみつ", season: ["春", "夏", "秋", "冬"] },
      { id: "maplesyrup", name: "メープルシロップ", season: ["春", "夏", "秋", "冬"] },
      { id: "chocolate", name: "チョコレート", season: ["春", "夏", "秋", "冬"] },
      { id: "walnut", name: "くるみ", season: ["秋", "冬"] },
      { id: "almond", name: "アーモンド", season: ["春", "夏", "秋", "冬"] },
      { id: "cocoaPowder", name: "ココアパウダー", season: ["春", "夏", "秋", "冬"] },
      { id: "vanillaEssence", name: "バニラエッセンス", season: ["春", "夏", "秋", "冬"] }
    ],
    fruits: [
      { id: "apple", name: "りんご", season: ["秋", "冬"] },
      { id: "banana", name: "バナナ", season: ["春", "夏", "秋", "冬"] },
      { id: "orange", name: "みかん", season: ["冬"] },
      { id: "strawberry", name: "いちご", season: ["春"] },
      { id: "grape", name: "ぶどう", season: ["秋"] },
      { id: "peach", name: "桃", season: ["夏"] },
      { id: "lemon", name: "レモン", season: ["冬"] },
      { id: "kiwi", name: "キウイ", season: ["春"] },
      { id: "lime", name: "ライム", season: ["春", "夏", "秋", "冬"] },
      { id: "pineapple", name: "パイナップル", season: ["夏"] },
      { id: "mango", name: "マンゴー", season: ["夏"] },
      { id: "avocado", name: "アボカド", season: ["春", "夏", "秋", "冬"] },
      { id: "coconut", name: "ココナッツ", season: ["春", "夏", "秋", "冬"] },
      { id: "grapefruit", name: "グレープフルーツ", season: ["冬"] },
      { id: "watermelon", name: "すいか", season: ["夏"] },
      { id: "melon", name: "メロン", season: ["夏"] },
      { id: "cherry", name: "さくらんぼ", season: ["夏"] },
      { id: "blueberry", name: "ブルーベリー", season: ["夏"] },
      { id: "blackberry", name: "ブラックベリー", season: ["夏"] },
      { id: "raspberry", name: "ラズベリー", season: ["夏"] }
    ]
  };

  // 食材データを読み込み
  function loadIngredientsData() {
    // 組み込まれたデータを直接使用
    ingredientsData = INGREDIENTS_DATA;
    
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
      // チーズ選択時のランダム処理
      if (ingredient.id === 'cheese') {
        const randomCheese = getRandomCheeseType();
        if (randomCheese) {
          // ランダムに選ばれたチーズを追加
          const cheeseIngredient = {
            ...randomCheese,
            category: currentCategory,
            originalSelection: 'cheese' // 元の選択がチーズだったことを記録
          };
          selectedIngredients.push(cheeseIngredient);
          
          // ユーザーに選ばれたチーズを通知
          const notification = document.createElement('div');
          notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #FF9800, #F57C00);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(255, 152, 0, 0.3);
            z-index: 1000;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 0.5rem;
          `;
          notification.innerHTML = `
            <i class="fas fa-cheese" style="font-size: 1.2rem;"></i>
            <span>「${randomCheese.name}」が選ばれました！</span>
          `;
          document.body.appendChild(notification);
          
          // 3秒後に通知を削除
          setTimeout(() => {
            notification.remove();
          }, 3000);
        }
      } else {
        // 通常の食材選択処理
        const ingredientWithCategory = {
          ...ingredient,
          category: currentCategory
        };
        selectedIngredients.push(ingredientWithCategory);
      }
    }
    
    renderSelectedIngredients();
    const searchValue = headerIngredientSearch ? headerIngredientSearch.value : '';
    renderIngredients(searchValue);
    saveState();
    updateClearButtonState();
  }
  
  // ランダムなチーズタイプを選択
  function getRandomCheeseType() {
    const cheeseTypes = [
      { id: "mozzarella", name: "モッツァレラチーズ", season: ["春", "夏", "秋", "冬"] },
      { id: "cheddar", name: "チェダーチーズ", season: ["春", "夏", "秋", "冬"] },
      { id: "parmesan", name: "パルメザンチーズ", season: ["春", "夏", "秋", "冬"] },
      { id: "camembert", name: "カマンベールチーズ", season: ["春", "夏", "秋", "冬"] },
      { id: "gouda", name: "ゴーダチーズ", season: ["春", "夏", "秋", "冬"] },
      { id: "blueCheeseNew", name: "ブルーチーズ", season: ["春", "夏", "秋", "冬"] },
      { id: "ricotta", name: "リコッタチーズ", season: ["春", "夏", "秋", "冬"] },
      { id: "mascarpone", name: "マスカルポーネチーズ", season: ["春", "夏", "秋", "冬"] }
    ];
    
    // ingredientsDataから利用可能なチーズタイプを取得
    let availableCheeseTypes = [];
    if (ingredientsData && ingredientsData.processed) {
      availableCheeseTypes = ingredientsData.processed.filter(item => 
        cheeseTypes.some(cheese => cheese.id === item.id)
      );
    }
    
    // フォールバック: ingredientsDataが利用できない場合はデフォルトリストを使用
    if (availableCheeseTypes.length === 0) {
      availableCheeseTypes = cheeseTypes;
    }
    
    // 既に選択されていないチーズタイプを選択
    const unselectedCheeseTypes = availableCheeseTypes.filter(cheese => 
      !selectedIngredients.some(selected => selected.id === cheese.id)
    );
    
    if (unselectedCheeseTypes.length === 0) {
      // すべてのチーズタイプが既に選択されている場合は、最初のものを返す
      return availableCheeseTypes[0] || cheeseTypes[0];
    }
    
    // ランダムに選択
    const randomIndex = Math.floor(Math.random() * unselectedCheeseTypes.length);
    return unselectedCheeseTypes[randomIndex];
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
    
    // 注意喚起をチェック
    checkAndShowWarnings();
  }
  
  // レシピ生成ボタンのイベントリスナー
  generateRecipeBtn.addEventListener('click', generateRecipe);
  
  // おまかせ選択ボタンのイベントリスナー
  randomSelectBtn.addEventListener('click', randomSelectIngredients);
  
      // 条件設定ランダム選択ボタンのイベントリスナー
    if (randomSettingsBtn) {
      randomSettingsBtn.addEventListener('click', randomSelectSettings);
    }
    
    // エクスポート・インポートボタンのイベントリスナー
    if (exportDataBtn) {
      exportDataBtn.addEventListener('click', exportData);
    }
    
    if (importDataBtn) {
      importDataBtn.addEventListener('click', () => {
        if (importFileInput) {
          importFileInput.click();
        }
      });
    }
    
    if (importFileInput) {
      importFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          importData(file);
          // ファイル選択をリセット（同じファイルを再選択可能にする）
          e.target.value = '';
        }
      });
    }
    
    // 全データクリアボタンのイベントリスナー
    if (clearAllDataBtn) {
      clearAllDataBtn.addEventListener('click', clearAllData);
    }
    

  
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
    // 複数選択可能な項目を配列で取得
    const selectedCuisines = Array.from(document.querySelectorAll('input[name="cuisine"]:checked')).map(input => input.value);
    const selectedCookingMethods = Array.from(document.querySelectorAll('input[name="cookingMethod"]:checked')).map(input => input.value);
    
    return {
      ingredients: selectedIngredients.map(ing => ing.name),
      season: document.querySelector('input[name="season"]:checked').value,
      mealType: document.querySelector('input[name="mealType"]:checked').value,
      cookingTime: document.querySelector('input[name="cookingTime"]:checked').value,
      cuisine: selectedCuisines,
      cookingMethod: selectedCookingMethods,
      servings: document.querySelector('input[name="servings"]:checked').value
    };
  }
  
    // メニュー提案生成
  async function generateRecipe(isRegenerate = false) {
    if (selectedIngredients.length === 0) {
      return;
    }

    const settings = getSelectedValues();

    // UI更新
    generateRecipeBtn.disabled = true;
    generateRecipeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> メニューを考えています...';
    loadingIndicator.classList.add('active');
    menuSelectionSection.style.display = 'none';
    resultsSection.style.display = 'none';

    try {
      // APIリクエスト作成
      const messages = createMenuSuggestionsMessages(settings, isRegenerate);
      const result = await callLLMAPI(messages);
      proposedMenus = result;
      displayMenuSelection(result);
    } catch (error) {
      console.error('メニュー提案エラー:', error);
    } finally {
      // UI復元
      generateRecipeBtn.disabled = false;
      generateRecipeBtn.innerHTML = '<i class="fas fa-magic"></i> メニューを提案してもらう';
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
            
            // チーズが選ばれた場合はランダムなチーズタイプに変換
            if (selectedIngredient.id === 'cheese') {
              const randomCheese = getRandomCheeseType();
              if (randomCheese) {
                selectedIngredients.push({
                  ...randomCheese,
                  category: category,
                  originalSelection: 'cheese'
                });
              }
            } else {
              selectedIngredients.push({
                ...selectedIngredient,
                category: category
              });
            }
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
14. **材料の分量について：使用しない材料は「0g」として記載し、説明文で「使いません」と記述しても矛盾ではありません**
    - **例：「豚肉: 0g」で材料リストに含め、説明で「今回は豚肉は使いません」と記述することは正しい処理です**
    - **0gの材料は実質的に使用されていないため、否定的な表現と矛盾しません**
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

  // メニュー選択画面表示
  function displayMenuSelection(menus) {
    proposedMenus = menus;
    // 状態を保存
    saveState();
    
    menuGrid.innerHTML = '';
    
    menus.forEach((menu, index) => {
      const menuCard = document.createElement('div');
      menuCard.className = 'menu-card';
      menuCard.dataset.menuIndex = index;
      
      const iconMap = {
        '簡単': 'fas fa-leaf',
        '普通': 'fas fa-balance-scale',
        '難しい': 'fas fa-fire'
      };
      
      const difficultyIcon = iconMap[menu.difficulty] || 'fas fa-utensils';
      
      // カテゴリーアイコンの設定（料理ジャンル対応を拡張）
      const categoryIconMap = {
        // 麺類
        'パスタ': 'fas fa-seedling',
        'ラーメン': 'fas fa-fire',
        'うどん': 'fas fa-water',
        'そば': 'fas fa-leaf',
        '焼きそば': 'fas fa-fire',
        // 調理法
        '炒め物': 'fas fa-fire-alt',
        '煮物': 'fas fa-tint',
        '焼き物': 'fas fa-fire',
        '蒸し料理': 'fas fa-cloud',
        '揚げ物': 'fas fa-fire-flame-curved',
        'サラダ': 'fas fa-leaf',
        'スープ': 'fas fa-bowl-food',
        '汁物': 'fas fa-soup',
        // 料理ジャンル
        '和食': 'fas fa-torii-gate',
        '洋食': 'fas fa-utensils',
        '中華': 'fas fa-dragon',
        'イタリアン': 'fas fa-pizza-slice',
        '韓国料理': 'fas fa-pepper-hot',
        'タイ料理': 'fas fa-leaf',
        'インド料理': 'fas fa-pepper-hot',
        // その他
        'カレー': 'fas fa-pepper-hot',
        'ハンバーガー': 'fas fa-hamburger',
        'ピザ': 'fas fa-pizza-slice',
        'パン': 'fas fa-bread-slice',
        'デザート': 'fas fa-ice-cream',
        'ドリンク': 'fas fa-mug-hot'
      };
      
      const categoryIcon = categoryIconMap[menu.category] || 'fas fa-utensils';
      
      // 料理ジャンルの判定（AIレスポンスから取得）
      let cuisineType = '';
      let cuisineIcon = '';
      
      // AIが返した料理ジャンル情報を使用
      if (menu.cuisine) {
        cuisineType = menu.cuisine;
        cuisineIcon = categoryIconMap[cuisineType] || 'fas fa-globe';
      } else {
        // フォールバック：設定から取得
        const settings = getSelectedValues();
        if (settings.cuisine && Array.isArray(settings.cuisine)) {
          cuisineType = settings.cuisine[0];
          cuisineIcon = categoryIconMap[cuisineType] || 'fas fa-globe';
        }
      }
      
      const categoryHtml = menu.category ? `
        <div class="menu-card-meta-item">
          <i class="${categoryIcon}"></i>
          ${menu.category}
        </div>
      ` : '';
      
      const cuisineHtml = cuisineType ? `
        <div class="menu-card-meta-item cuisine-indicator">
          <i class="${cuisineIcon}"></i>
          ${cuisineType}
        </div>
      ` : '';

      menuCard.innerHTML = `
        <div class="menu-card-title">
          <i class="fas fa-utensils"></i>
          ${menu.menuName}
        </div>
        <div class="menu-card-description">
          ${menu.description}
        </div>
        <div class="menu-card-meta">
          ${categoryHtml}
          ${cuisineHtml}
          <div class="menu-card-meta-item">
            <i class="fas fa-clock"></i>
            ${menu.cookingTime}
          </div>
          <div class="menu-card-meta-item">
            <i class="${difficultyIcon}"></i>
            ${menu.difficulty}
          </div>
          <div class="menu-card-meta-item">
            <i class="fas fa-users"></i>
            ${menu.servings}
          </div>
        </div>
      `;
      
      menuCard.addEventListener('click', () => toggleMenuSelection(index));
      menuGrid.appendChild(menuCard);
    });
    
    menuSelectionSection.style.display = 'block';
    
    // 決定ボタンを無効状態にリセット
    selectedMenuIndex = -1;
    updateDecisionButton();
  }

  // メニュー選択の切り替え
  function toggleMenuSelection(menuIndex) {
    console.log('メニュー選択:', menuIndex);
    
    // 前回選択されたカードから選択状態を除去
    const allCards = menuGrid.querySelectorAll('.menu-card');
    allCards.forEach((card, index) => {
      card.classList.remove('selected');
      // チェックアイコンを非表示
      const checkIcon = card.querySelector('.menu-check');
      if (checkIcon) {
        checkIcon.style.display = 'none';
      }
    });
    
    // 新しく選択されたカードに選択状態を追加
    if (selectedMenuIndex === menuIndex) {
      // 同じカードを再クリックした場合は選択解除
      selectedMenuIndex = -1;
      console.log('メニュー選択を解除');
    } else {
      // 新しいカードを選択
      selectedMenuIndex = menuIndex;
      allCards[menuIndex].classList.add('selected');
      
      // チェックアイコンを表示（存在しない場合は作成）
      let checkIcon = allCards[menuIndex].querySelector('.menu-check');
      if (!checkIcon) {
        checkIcon = document.createElement('div');
        checkIcon.className = 'menu-check';
        checkIcon.innerHTML = '<i class="fas fa-check-circle"></i>';
        checkIcon.style.cssText = `
          position: absolute;
          top: 10px;
          right: 10px;
          color: #4CAF50;
          font-size: 1.5rem;
          background: white;
          border-radius: 50%;
          display: none;
        `;
        allCards[menuIndex].appendChild(checkIcon);
      }
      checkIcon.style.display = 'block';
      
      console.log('メニューを選択:', proposedMenus[menuIndex]?.menuName);
    }
    
    // 状態を保存
    saveState();
    updateDecisionButton();
  }

  // 決定ボタンの状態更新
  function updateDecisionButton() {
    if (menuDecisionBtn) {
      if (selectedMenuIndex >= 0) {
        menuDecisionBtn.disabled = false;
        menuDecisionBtn.innerHTML = '<i class="fas fa-check"></i> このメニューでレシピを作成する';
      } else {
        menuDecisionBtn.disabled = true;
        menuDecisionBtn.innerHTML = '<i class="fas fa-check"></i> メニューを選択してください';
      }
    }
  }

  // メニュー決定時の処理
  async function selectMenu() {
    console.log('selectMenu called with selectedMenuIndex:', selectedMenuIndex);
    
    if (selectedMenuIndex < 0 || !proposedMenus[selectedMenuIndex]) {
      console.error('無効なメニュー選択:', { selectedMenuIndex, proposedMenusLength: proposedMenus.length });
      return;
    }
    
    const selectedMenu = proposedMenus[selectedMenuIndex];
    const settings = getSelectedValues();
    
    console.log('選択されたメニュー:', selectedMenu);
    console.log('設定:', settings);
    
    // UI更新
    loadingIndicator.classList.add('active');
    
    // ローディングテキストの安全な更新
    const loadingTextElement = loadingIndicator.querySelector('div:last-child');
    if (loadingTextElement) {
      loadingTextElement.textContent = 'レシピの詳細を作成しています...';
    }
    
    menuSelectionSection.style.display = 'none';
    
    try {
      // 選択されたメニューの詳細レシピを生成
      console.log('詳細レシピメッセージを作成中...');
      const messages = createDetailedRecipeMessages(selectedMenu, settings);
      console.log('APIを呼び出し中...');
      const result = await callLLMAPI(messages);
      console.log('API呼び出し成功:', result);
      
      // バリデーションを実行
      const validationResult = validateRecipeIngredients(result);
      currentRecipe = validationResult.validatedRecipe;
      
      console.log('レシピ表示中...');
      displayRecipe(validationResult.validatedRecipe);
      
      // 状態を保存
      saveState();
      
    } catch (error) {
      console.error('レシピ詳細生成エラー:', error);
      alert('レシピの詳細生成に失敗しました。もう一度お試しください。\n\nエラー詳細: ' + error.message);
      // エラーの場合はメニュー選択画面に戻る
      menuSelectionSection.style.display = 'block';
    } finally {
      loadingIndicator.classList.remove('active');
      
      // ローディングテキストの安全な復元
      const loadingTextElement = loadingIndicator.querySelector('div:last-child');
      if (loadingTextElement) {
        loadingTextElement.textContent = 'AIがあなたにぴったりのレシピを考えています...';
      }
    }
  }

  // 詳細レシピ生成用のメッセージ作成
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
12. **材料の分量について：使用しない材料は「0g」として記載し、説明文で「使いません」と記述しても矛盾ではありません**
    - **例：「豚肉: 0g」で材料リストに含め、説明で「今回は豚肉は使いません」と記述することは正しい処理です**
    - **0gの材料は実質的に使用されていないため、否定的な表現と矛盾しません**
`;

    return [
      {
        role: "user",
        content: prompt
      }
    ];
  }
  
  // レシピ材料バリデーション
  function validateRecipeIngredients(recipe) {
    const validationResult = {
      validatedRecipe: JSON.parse(JSON.stringify(recipe)), // ディープコピー
      violations: [],
      warnings: []
    };
    
    // 選択された食材名のリストを作成
    const selectedIngredientNames = selectedIngredients.map(ing => ing.name);
    const selectedSeasoningNames = selectedIngredients
      .filter(ing => ing.category === 'seasonings')
      .map(ing => ing.name);
    
    // 既知の調味料リスト（ingredients.jsonの調味料カテゴリに基づく）
    const knownSeasonings = [
      '醤油', '味噌', '塩', '砂糖', 'サラダ油', 'オリーブオイル', 'ごま油',
      '酢', 'みりん', 'だしの素', 'コンソメ', 'こしょう', 'にんにく',
      'ケチャップ', 'オイスターソース', 'カレー粉', '料理酒', '本みりん',
      'しょうゆ', 'みそ', 'ごま', '胡椒', 'バター', '砂糖', 'はちみつ',
      'マヨネーズ', 'ソース', 'ウスターソース', '中濃ソース', 'とんかつソース',
      'ポン酢', 'ドレッシング', 'めんつゆ', '白だし', '鶏ガラスープの素'
    ];
    
    // ingredients配列のバリデーション
    if (validationResult.validatedRecipe.ingredients && Array.isArray(validationResult.validatedRecipe.ingredients)) {
      const validIngredients = [];
      const movedToSeasonings = [];
      
      validationResult.validatedRecipe.ingredients.forEach(ingredient => {
        const ingredientName = ingredient.name;
        
        // 選択された食材に含まれているかチェック
        if (selectedIngredientNames.includes(ingredientName)) {
          validIngredients.push(ingredient);
        } else if (knownSeasonings.some(seasoning => 
          ingredientName.includes(seasoning) || seasoning.includes(ingredientName)
        )) {
          // 調味料だった場合はseasonings配列に移動
          movedToSeasonings.push({
            name: ingredientName,
            amount: ingredient.amount,
            isSelected: selectedSeasoningNames.includes(ingredientName)
          });
          
          validationResult.warnings.push({
            type: 'moved_to_seasonings',
            ingredient: ingredientName,
            message: `「${ingredientName}」は調味料のため、調味料欄に移動しました`
          });
        } else {
          // 選択されていない食材
          validationResult.violations.push({
            type: 'unauthorized_ingredient',
            ingredient: ingredientName,
            category: 'ingredients',
            message: `選択されていない食材「${ingredientName}」がレシピに含まれています`
          });
        }
      });
      
      // バリデーション結果を反映
      validationResult.validatedRecipe.ingredients = validIngredients;
      
      // 調味料配列に移動されたものを追加
      if (movedToSeasonings.length > 0) {
        if (!validationResult.validatedRecipe.seasonings) {
          validationResult.validatedRecipe.seasonings = [];
        }
        validationResult.validatedRecipe.seasonings.push(...movedToSeasonings);
      }
    }
    
    // seasonings配列のバリデーション
    if (validationResult.validatedRecipe.seasonings && Array.isArray(validationResult.validatedRecipe.seasonings)) {
      validationResult.validatedRecipe.seasonings.forEach(seasoning => {
        const seasoningName = seasoning.name;
        
        // 選択された調味料でも既知の調味料でもない場合
        if (!selectedSeasoningNames.includes(seasoningName) && 
            !knownSeasonings.some(known => 
              seasoningName.includes(known) || known.includes(seasoningName)
            )) {
          validationResult.violations.push({
            type: 'unknown_seasoning',
            ingredient: seasoningName,
            category: 'seasonings',
            message: `未知の調味料「${seasoningName}」がレシピに含まれています`
          });
        }
        
        // isSelectedフィールドの修正
        const isActuallySelected = selectedSeasoningNames.includes(seasoningName);
        if (seasoning.isSelected !== isActuallySelected) {
          seasoning.isSelected = isActuallySelected;
          validationResult.warnings.push({
            type: 'corrected_selection_status',
            ingredient: seasoningName,
            message: `「${seasoningName}」の選択状態を修正しました`
          });
        }
      });
    }
    
    // 作り方テキスト内の材料チェック（強化版）
    if (validationResult.validatedRecipe.cookingSteps && Array.isArray(validationResult.validatedRecipe.cookingSteps)) {
      const allSelectedIngredients = selectedIngredients.map(ing => ing.name);
      const stepsText = validationResult.validatedRecipe.cookingSteps.join(' ');
      const unauthorizedIngredientsInSteps = [];
      
      // 具体的な調味料チェック（ごま油対策）
      const specificSeasonings = [
        'ごま油', 'サラダ油', 'オリーブオイル', '醤油', '味噌', '塩', '砂糖',
        '酢', 'みりん', 'だしの素', 'コンソメ', 'こしょう', '胡椒', 'にんにく',
        'ケチャップ', 'オイスターソース', 'カレー粉', '料理酒', 'バター'
      ];
      
      // 特定の調味料が作り方に含まれているかチェック
      specificSeasonings.forEach(seasoning => {
        if (stepsText.includes(seasoning) && !selectedSeasoningNames.includes(seasoning)) {
          unauthorizedIngredientsInSteps.push(seasoning);
          validationResult.violations.push({
            type: 'unauthorized_seasoning_in_steps',
            ingredient: seasoning,
            category: 'cookingSteps',
            message: `作り方で「${seasoning}」が使用されていますが、選択された調味料に含まれていません`
          });
        }
      });
      
      // 全食材リストから選択されていない材料を検索
      if (typeof ingredientsData === 'object' && ingredientsData !== null) {
        Object.values(ingredientsData).forEach(categoryData => {
          if (Array.isArray(categoryData)) {
            categoryData.forEach(ingredient => {
              const ingredientName = ingredient.name;
              // 選択されていない食材が作り方に含まれているかチェック
              if (!allSelectedIngredients.includes(ingredientName) && 
                  stepsText.includes(ingredientName)) {
                // 既知の調味料でない場合のみ違反として報告
                if (!knownSeasonings.some(known => 
                  ingredientName.includes(known) || known.includes(ingredientName)
                )) {
                  unauthorizedIngredientsInSteps.push(ingredientName);
                }
              }
            });
          }
        });
      }
      
      // 重複を除去して違反として報告（調味料以外）
      [...new Set(unauthorizedIngredientsInSteps)].forEach(ingredientName => {
        // 調味料は上で既に処理済みなのでスキップ
        if (!specificSeasonings.includes(ingredientName)) {
          validationResult.violations.push({
            type: 'unauthorized_ingredient_in_steps',
            ingredient: ingredientName,
            category: 'cookingSteps',
            message: `作り方に選択されていない食材「${ingredientName}」が含まれています`
          });
        }
      });
    }
    
    // バリデーション結果をログ出力
    if (validationResult.violations.length > 0 || validationResult.warnings.length > 0) {
      console.group('🔍 レシピ材料バリデーション結果');
      
      if (validationResult.violations.length > 0) {
        console.warn('❌ 違反が検出されました:');
        validationResult.violations.forEach(violation => {
          console.warn(`  - ${violation.message}`);
        });
      }
      
      if (validationResult.warnings.length > 0) {
        console.info('⚠️ 警告・修正事項:');
        validationResult.warnings.forEach(warning => {
          console.info(`  - ${warning.message}`);
        });
      }
      
      console.groupEnd();
    }
    
    return validationResult;
  }

  // バリデーション警告表示
  function showValidationWarning(validationResult) {
    // 既存の警告要素があれば削除
    const existingWarning = document.getElementById('recipeValidationWarning');
    if (existingWarning) {
      existingWarning.remove();
    }
    
    // 警告要素を作成
    const warningDiv = document.createElement('div');
    warningDiv.id = 'recipeValidationWarning';
    warningDiv.className = 'validation-warning';
    warningDiv.style.cssText = `
      background: linear-gradient(135deg, #fff3cd, #ffeaa7);
      border: 2px solid #f39c12;
      border-radius: 8px;
      padding: 15px;
      margin: 15px 0;
      box-shadow: 0 2px 10px rgba(243, 156, 18, 0.3);
    `;
    
    let warningContent = `
      <div style="display: flex; align-items: center; margin-bottom: 10px;">
        <i class="fas fa-exclamation-triangle" style="color: #f39c12; font-size: 1.2rem; margin-right: 10px;"></i>
        <strong style="color: #856404;">レシピ生成時の注意事項</strong>
      </div>
    `;
    
    if (validationResult.violations.length > 0) {
      warningContent += `
        <div style="margin-bottom: 10px;">
          <strong style="color: #dc3545;">❌ 修正された問題:</strong>
          <ul style="margin: 5px 0; padding-left: 20px;">
      `;
      validationResult.violations.forEach(violation => {
        warningContent += `<li style="color: #856404;">${violation.message}</li>`;
      });
      warningContent += `</ul></div>`;
    }
    
    if (validationResult.warnings.length > 0) {
      warningContent += `
        <div style="margin-bottom: 10px;">
          <strong style="color: #007bff;">ℹ️ 自動調整:</strong>
          <ul style="margin: 5px 0; padding-left: 20px;">
      `;
      validationResult.warnings.forEach(warning => {
        warningContent += `<li style="color: #856404;">${warning.message}</li>`;
      });
      warningContent += `</ul></div>`;
    }
    
    warningContent += `
      <div style="font-size: 0.9rem; color: #856404; margin-top: 10px; font-style: italic;">
        💡 このメッセージは選択した食材リストに基づいてレシピを自動修正したことをお知らせしています。
      </div>
    `;
    
    warningDiv.innerHTML = warningContent;
    
    // レシピタイトルの前に挿入
    const recipeTitle = document.getElementById('recipeTitle');
    if (recipeTitle && recipeTitle.parentNode) {
      recipeTitle.parentNode.insertBefore(warningDiv, recipeTitle);
    }
    
    // 5秒後に自動的に薄くする
    setTimeout(() => {
      if (warningDiv && warningDiv.parentNode) {
        warningDiv.style.opacity = '0.7';
        warningDiv.style.transition = 'opacity 1s ease';
      }
    }, 5000);
  }

  // 矛盾チェック機能
  function checkRecipeContradictions(recipe) {
    const contradictions = [];
    
    // 材料リストから食材名と分量を抽出
    const ingredientData = [];
    if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
      ingredientData.push(...recipe.ingredients.map(ing => ({
        name: ing.name,
        amount: ing.amount || '',
        category: 'ingredient'
      })));
    }
    if (recipe.seasonings && Array.isArray(recipe.seasonings)) {
      ingredientData.push(...recipe.seasonings.map(ing => ({
        name: ing.name,
        amount: ing.amount || '',
        category: 'seasoning'
      })));
    }
    
    // 説明文とコツ・ポイントを検査対象とする
    const descriptionTexts = [
      recipe.description || '',
      recipe.tips || '',
      (recipe.ingredientUsage && recipe.ingredientUsage.reason) || '',
      (recipe.unusedIngredients && recipe.unusedIngredients.reason) || ''
    ].join(' ');
    
    // 否定的な表現パターン
    const negativePatterns = [
      '使用しません',
      '使いません', 
      '使わない',
      '使っていない',
      '使用していない',
      '入れない',
      '入れません',
      '含まない',
      '含まれていない',
      '不要',
      '必要ない',
      '省略',
      '除外'
    ];
    
    // 各食材について矛盾をチェック
    ingredientData.forEach(ingredientInfo => {
      const ingredient = ingredientInfo.name;
      const amount = ingredientInfo.amount;
      
      // 0g、0ml、0個など、実質的に使用しない分量かチェック
      const isZeroAmount = /^0\s*(g|ml|個|本|枚|片|かけ|つ|粒|滴|適量|少々)?$/i.test(amount.trim());
      
      // 0gの場合は矛盾チェックをスキップ（0gなら「使いません」でも矛盾しない）
      if (isZeroAmount) {
        console.log(`矛盾チェックスキップ: ${ingredient} (分量: ${amount}) - 0gのため使用されていない材料として扱います`);
        return;
      }
      
      // 食材名を正規化（調味料ラベルや余分な文字を除去）
      let cleanIngredientName = ingredient
        .replace(/チーズ$/, '')
        .replace(/（.*?）/, '')
        .replace(/\(.*?\)/, '')
        .replace(/\s*大さじ.*/, '')
        .replace(/\s*小さじ.*/, '')
        .replace(/\s*\d+.*/, '')
        .trim();
      
      // 短すぎる名前はスキップ（誤検出を避ける）
      if (cleanIngredientName.length < 2) {
        return;
      }
      
      // 食材の別名・略称も検索対象に含める
      const ingredientVariations = [cleanIngredientName];
      
      // 一般的な略称・別名のマッピング
      const nameVariations = {
        'ケチャップ': ['トマトケチャップ'],
        'マヨネーズ': ['マヨ'],
        'オリーブオイル': ['オリーブ油'],
        'サラダ油': ['植物油'],
        '醤油': ['しょうゆ'],
        '味噌': ['みそ'],
        '砂糖': ['お砂糖'],
        'こしょう': ['胡椒', 'ペッパー']
      };
      
      // 別名があれば追加
      if (nameVariations[cleanIngredientName]) {
        ingredientVariations.push(...nameVariations[cleanIngredientName]);
      }
      
      // 逆引きもチェック
      Object.keys(nameVariations).forEach(key => {
        if (nameVariations[key].includes(cleanIngredientName)) {
          ingredientVariations.push(key);
        }
      });
      
      // すべての否定パターンを統合
      const allNegativePatterns = [
        ...negativePatterns,
        '使用しなかった',
        '使わなかった',
        '使っていません',
        '入れていない',
        '含まれていません'
      ];
      
      // 各否定パターンで矛盾をチェック
      allNegativePatterns.forEach(pattern => {
        // 各食材のバリエーションをチェック
        ingredientVariations.forEach(variation => {
          // より柔軟な正規表現パターンを使用
          const regexPatterns = [
            new RegExp(`${variation}[^。]*?${pattern}`, 'gi'),
            new RegExp(`${pattern}[^。]*?${variation}`, 'gi'),
            new RegExp(`${variation}.*?は.*?${pattern}`, 'gi'),
            new RegExp(`${variation}.*?を.*?${pattern}`, 'gi')
          ];
          
          regexPatterns.forEach(regex => {
            const matches = descriptionTexts.match(regex);
            if (matches) {
              // 重複チェック（同じ食材・パターンの組み合わせは一度だけ）
              const existingContradiction = contradictions.find(c => 
                c.ingredient === ingredient && 
                c.pattern === pattern
              );
              
              if (!existingContradiction) {
                contradictions.push({
                  type: 'ingredient_contradiction',
                  ingredient: ingredient,
                  pattern: pattern,
                  context: matches[0],
                  matchedVariation: variation,
                  amount: amount,
                  message: `材料リストに「${ingredient}」(${amount})が含まれていますが、説明では「${matches[0]}」と記載されており矛盾しています。`
                });
              }
            }
          });
        });
      });
    });
    
    return contradictions;
  }

  // レシピ表示
  function displayRecipe(recipe) {
    // レシピのバリデーションを実行
    const validationResult = validateRecipeIngredients(recipe);
    const validatedRecipe = validationResult.validatedRecipe;
    
    // 矛盾チェックを実行
    const contradictions = checkRecipeContradictions(validatedRecipe);
    
    // 違反があった場合はコンソールにログ出力のみ
    if (validationResult.violations.length > 0) {
      const violationMessages = validationResult.violations.map(v => v.message).join('\n');
      console.error('レシピに問題が検出されました:\n' + violationMessages);
    }
    
    // 矛盾があった場合はコンソールにログ出力
    if (contradictions.length > 0) {
      const contradictionMessages = contradictions.map(c => c.message).join('\n');
      console.warn('レシピ内容の矛盾が検出されました:\n' + contradictionMessages);
    }
    
    // タイトルと説明
    recipeTitle.textContent = validatedRecipe.menuName;
    recipeDescription.textContent = validatedRecipe.description || 'AIが提案する美味しいレシピです';
    
    // メタ情報
    recipeMeta.innerHTML = '';
    const metaItems = [
      { icon: 'fas fa-clock', text: validatedRecipe.cookingTime || '調理時間不明' },
      { icon: 'fas fa-signal', text: validatedRecipe.difficulty || '普通' },
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
    
    // 食材 - バリデーション済みの食材のみ表示（調味料以外）
    if (validatedRecipe.ingredients && Array.isArray(validatedRecipe.ingredients)) {
      validatedRecipe.ingredients.forEach(ingredient => {
        const item = document.createElement('div');
        item.className = 'ingredient-item-result';
        
        // 0gかどうかチェック
        const isZeroAmount = /^0\s*(g|ml|個|本|枚|片|かけ|つ|粒|滴|適量|少々)?$/i.test(ingredient.amount.trim());
        const zeroAmountStyle = isZeroAmount ? 
          'color: #888; font-style: italic; text-decoration: line-through;' : '';
        const zeroAmountIndicator = isZeroAmount ? 
          ' <span style="color: #f44336; font-size: 0.8em;" title="使用されていません">（未使用）</span>' : '';
        
        item.innerHTML = `
          <span class="ingredient-name" style="${zeroAmountStyle}">${ingredient.name}${zeroAmountIndicator}</span>
          <span class="ingredient-amount" style="${zeroAmountStyle}">${ingredient.amount}</span>
        `;
        ingredientsList.appendChild(item);
      });
    }
    
    // 調味料（バリデーション済み）
    if (validatedRecipe.seasonings && Array.isArray(validatedRecipe.seasonings)) {
      validatedRecipe.seasonings.forEach(seasoning => {
        const item = document.createElement('div');
        item.className = 'ingredient-item-result'; // 調味料の基本スタイル
        
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
        
        // 0gかどうかチェック
        const isZeroAmount = /^0\s*(g|ml|個|本|枚|片|かけ|つ|粒|滴|適量|少々)?$/i.test(seasoning.amount.trim());
        const zeroAmountIndicator = isZeroAmount ? 
          ' <span style="color: #f44336; font-size: 0.8em;" title="使用されていません">（未使用）</span>' : '';
        
        const selectionIndicator = !isSelected ? ' <span class="added-seasoning-label" title="追加された調味料">追加</span>' : '';
        let seasoningNameStyle = 'background: linear-gradient(135deg, #fff3e0, #ffe0b2); border: 1px solid #ffb74d; padding: 2px 6px; border-radius: 4px;';
        let amountStyle = '';
        
        // 0gの場合はスタイルを変更
        if (isZeroAmount) {
          seasoningNameStyle += ' color: #888; text-decoration: line-through;';
          amountStyle = 'color: #888; font-style: italic; text-decoration: line-through;';
        }
        
        item.innerHTML = `
          <span class="ingredient-name" style="${seasoningNameStyle}">${seasoning.name}${selectionIndicator}${zeroAmountIndicator}</span>
          <span class="ingredient-amount" style="${amountStyle}">${seasoning.amount}</span>
        `;
        ingredientsList.appendChild(item);
      });
    }
    
    // 作り方
    stepsList.innerHTML = '';
    if (validatedRecipe.cookingSteps && Array.isArray(validatedRecipe.cookingSteps)) {
      validatedRecipe.cookingSteps.forEach((step, index) => {
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
          <button class="generate-btn pdf-btn" id="exportPdfBtn" style="background: linear-gradient(135deg, #f44336, #d32f2f);">
            <i class="fas fa-file-pdf"></i>
            レシピをPDF出力
          </button>
        `;
        recipeTipsSection.appendChild(regenerateButtonDiv);
        
        // 新しい再生成ボタンにイベントリスナーを追加
        const newRegenerateBtn = regenerateButtonDiv.querySelector('#regenerateRecipeBtn2');
        newRegenerateBtn.addEventListener('click', () => generateRecipe(true));
        
        // 詳細作り方ボタンにイベントリスナーを追加
        const detailBtn = regenerateButtonDiv.querySelector('#detailRecipeBtn');
        detailBtn.addEventListener('click', () => generateDetailedSteps(validatedRecipe));
        
        // PDF出力ボタンにイベントリスナーを追加
        const pdfBtn = regenerateButtonDiv.querySelector('#exportPdfBtn');
        if (pdfBtn) {
          pdfBtn.addEventListener('click', exportRecipeToPdf);
        }
      }
      
      // コツ・ポイント
      const tipsDiv = document.createElement('div');
      tipsDiv.className = 'tips-section';
      tipsDiv.innerHTML = `
        <div class="tips-title">
          <i class="fas fa-lightbulb"></i>
          コツ・ポイント
        </div>
        <div class="tips-content">${validatedRecipe.tips || '美味しく作るコツをお楽しみください！'}</div>
      `;
      recipeTipsSection.appendChild(tipsDiv);
      
      // 食材使用状況（常時表示）
      const usageDiv = document.createElement('div');
      usageDiv.className = 'ingredient-usage-section';
      usageDiv.style.marginTop = '1.5rem';
      
      let usageContent = '';
      let usageReason = '';
      
      // 新しいフォーマット（ingredientUsage）をチェック
      if (validatedRecipe.ingredientUsage) {
        const usedIngredients = validatedRecipe.ingredientUsage.used || [];
        const unusedIngredients = validatedRecipe.ingredientUsage.unused || [];
        usageReason = validatedRecipe.ingredientUsage.reason || '';
        
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
        if (validatedRecipe.ingredients) {
          usedIngredients.push(...validatedRecipe.ingredients.map(ing => ing.name));
        }
        if (validatedRecipe.seasonings) {
          usedIngredients.push(...validatedRecipe.seasonings.map(ing => ing.name));
        }
        
        const selectedIngredientNames = selectedIngredients.map(ing => ing.name);
        const unusedIngredients = selectedIngredientNames.filter(name => 
          !usedIngredients.some(usedName => 
            usedName.includes(name) || name.includes(usedName)
          )
        );
        
        if (validatedRecipe.unusedIngredients && validatedRecipe.unusedIngredients.reason) {
          usageReason = validatedRecipe.unusedIngredients.reason;
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
      
      // 矛盾チェックの結果を表示
      if (contradictions.length > 0) {
        const contradictionDiv = document.createElement('div');
        contradictionDiv.className = 'contradiction-warning-section';
        contradictionDiv.style.marginTop = '1.5rem';
        
        const contradictionMessages = contradictions.map(contradiction => 
          `<p class="contradiction-item"><i class="fas fa-exclamation-triangle"></i> ${contradiction.message}</p>`
        ).join('');
        
        contradictionDiv.innerHTML = `
          <div class="contradiction-title">
            <i class="fas fa-exclamation-triangle"></i>
            レシピ内容の矛盾点
          </div>
          <div class="contradiction-content">
            <p><strong>以下の矛盾点が検出されました:</strong></p>
            ${contradictionMessages}
            <div class="contradiction-note">
              <p><em>※ この矛盾は、AIが生成したレシピの材料リストと説明文の間に不整合があることを示しています。</em></p>
              <p><em>※ より正確なレシピが必要な場合は、「違うメニューを考える」ボタンで再生成することをお勧めします。</em></p>
            </div>
          </div>
        `;
        recipeTipsSection.appendChild(contradictionDiv);
      }
    } else {
      // 従来の方法（フォールバック）
      tipsContent.textContent = validatedRecipe.tips || '美味しく作るコツをお楽しみください！';
    }
    
    // バリデーション済みのレシピを保存
    currentRecipe = validatedRecipe;
    
    // 戻るボタンの表示（メニュー選択から来た場合のみ）
    if (proposedMenus && proposedMenus.length > 0 && backToMenuBtn) {
      backToMenuBtn.style.display = 'flex';
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
        
        // currentRecipeの作り方も更新（PDF出力で詳細版が使われるように）
        if (currentRecipe) {
          currentRecipe.cookingSteps = detailedSteps;
          // 状態を保存
          saveState();
        }
        
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
  
  // 条件設定をランダムで選択
  function randomSelectSettings() {
    // 各設定項目の選択肢を定義
    const settingOptions = {
      season: ['春', '夏', '秋', '冬'],
      mealType: ['朝食', '昼食', '夕食', 'おやつ'],
      cookingTime: ['15分以内', '30分以内', '1時間以内', '時間制限なし'],
      cuisine: ['和食', '洋食', '中華', 'イタリアン', 'その他'],
      cookingMethod: ['ランダム', '炒め物', '煮込み', '焼き物', '蒸し料理', '揚げ物', 'サラダ・生', 'スープ・汁物'],
      servings: ['1人分', '2人分', '3-4人分', '5人以上']
    };
    
    // 各設定項目をランダムで選択
    Object.keys(settingOptions).forEach(settingName => {
      const options = settingOptions[settingName];
      
      if (settingName === 'cuisine' || settingName === 'cookingMethod') {
        // 複数選択項目の場合
        // まず全てのチェックを外す
        document.querySelectorAll(`input[name="${settingName}"]`).forEach(input => {
          input.checked = false;
        });
        
        // 1-3個の項目をランダム選択
        const numSelections = Math.floor(Math.random() * 3) + 1;
        const shuffledOptions = [...options].sort(() => Math.random() - 0.5);
        
        for (let i = 0; i < Math.min(numSelections, shuffledOptions.length); i++) {
          const checkbox = document.querySelector(`input[name="${settingName}"][value="${shuffledOptions[i]}"]`);
          if (checkbox) {
            checkbox.checked = true;
          }
        }
      } else {
        // 単一選択項目の場合（従来通り）
        const randomIndex = Math.floor(Math.random() * options.length);
        const randomValue = options[randomIndex];
        
        const radioElement = document.querySelector(`input[name="${settingName}"][value="${randomValue}"]`);
        if (radioElement) {
          radioElement.checked = true;
        }
      }
    });
    
    // 状態を保存
    saveState();
    
    // ユーザーに選択内容を知らせる（簡単なフィードバック）
    if (randomSettingsBtn) {
      randomSettingsBtn.innerHTML = '<i class="fas fa-check"></i> 条件をランダム選択しました！';
      randomSettingsBtn.style.background = 'linear-gradient(135deg, #4CAF50, #45a049)';
      
      // 2秒後に元の表示に戻す
      setTimeout(() => {
        randomSettingsBtn.innerHTML = '<i class="fas fa-dice"></i> 料理条件をランダムで選ぶ';
        randomSettingsBtn.style.background = 'linear-gradient(135deg, #9C27B0, #7B1FA2)';
      }, 2000);
    }
  }
  
  // データエクスポート機能
  function exportData() {
    try {
      const currentSettings = getSelectedValues();
      
      const exportData = {
        version: "1.0",
        exportDate: new Date().toISOString(),
        appName: "AI料理提案システム",
        data: {
          selectedIngredients: selectedIngredients,
          settings: {
            season: currentSettings.season,
            mealType: currentSettings.mealType,
            cookingTime: currentSettings.cookingTime,
            cuisine: currentSettings.cuisine,
            cookingMethod: currentSettings.cookingMethod,
            servings: currentSettings.servings
          },
          currentCategory: currentCategory
        }
      };
      
      // JSONファイルとしてダウンロード
      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // ファイル名を生成（日時を含む）
      const now = new Date();
      const dateString = now.toISOString().slice(0, 19).replace(/[T:]/g, '-');
      const filename = `ai-cooking-settings-${dateString}.json`;
      
      // ダウンロード実行
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      // ユーザーフィードバック
      if (exportDataBtn) {
        const originalText = exportDataBtn.innerHTML;
        exportDataBtn.innerHTML = '<i class="fas fa-check"></i> エクスポート完了！';
        exportDataBtn.style.background = 'linear-gradient(135deg, #4CAF50, #45a049)';
        
        setTimeout(() => {
          exportDataBtn.innerHTML = originalText;
          exportDataBtn.style.background = 'linear-gradient(135deg, #4CAF50, #45a049)';
        }, 2000);
      }
      
      console.log('データエクスポート完了:', filename);
    } catch (error) {
      console.error('エクスポートエラー:', error);
      alert('設定のエクスポートに失敗しました。');
    }
  }
  
  // データインポート機能
  function importData(file) {
    if (!file) {
      console.error('ファイルが選択されていません');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const importedData = JSON.parse(e.target.result);
        
        // データ形式の検証
        if (!importedData.version || !importedData.data) {
          throw new Error('無効なデータ形式です');
        }
        
        if (importedData.appName !== "AI料理提案システム") {
          const confirmImport = confirm('このファイルは他のアプリケーション用のようですが、インポートしますか？');
          if (!confirmImport) {
            return;
          }
        }
        
        const data = importedData.data;
        
        // 選択済み食材を復元
        if (data.selectedIngredients && Array.isArray(data.selectedIngredients)) {
          selectedIngredients = data.selectedIngredients;
        }
        
        // カテゴリーを復元
        if (data.currentCategory) {
          currentCategory = data.currentCategory;
        }
        
        // 設定を復元
        if (data.settings) {
          Object.keys(data.settings).forEach(key => {
            const settingValue = data.settings[key];
            
            if (key === 'cuisine' || key === 'cookingMethod') {
              // 複数選択項目の場合
              // まず全てのチェックを外す
              document.querySelectorAll(`input[name="${key}"]`).forEach(input => {
                input.checked = false;
              });
              
              // 保存された値に対応するチェックボックスをオンにする
              if (Array.isArray(settingValue)) {
                settingValue.forEach(value => {
                  const checkbox = document.querySelector(`input[name="${key}"][value="${value}"]`);
                  if (checkbox) {
                    checkbox.checked = true;
                  }
                });
              } else {
                // 古い形式（文字列）の場合の互換性対応
                const checkbox = document.querySelector(`input[name="${key}"][value="${settingValue}"]`);
                if (checkbox) {
                  checkbox.checked = true;
                }
              }
            } else {
              // 単一選択項目の場合（従来通り）
              const radio = document.querySelector(`input[name="${key}"][value="${settingValue}"]`);
              if (radio) {
                radio.checked = true;
              }
            }
          });
        }
        
        // UIを更新
        updateCategoryTab();
        renderSelectedIngredients();
        renderIngredients();
        updateClearButtonState();
        
        // 状態を保存
        saveState();
        
        // ユーザーフィードバック
        if (importDataBtn) {
          const originalText = importDataBtn.innerHTML;
          importDataBtn.innerHTML = '<i class="fas fa-check"></i> インポート完了！';
          importDataBtn.style.background = 'linear-gradient(135deg, #4CAF50, #45a049)';
          
          setTimeout(() => {
            importDataBtn.innerHTML = originalText;
            importDataBtn.style.background = 'linear-gradient(135deg, #2196F3, #1976D2)';
          }, 2000);
        }
        
        const importDate = importedData.exportDate ? 
          new Date(importedData.exportDate).toLocaleString('ja-JP') : '不明';
        
        alert(`設定を正常にインポートしました！\n\nエクスポート日時: ${importDate}\n選択食材数: ${selectedIngredients.length}個`);
        
        console.log('データインポート完了:', {
          version: importedData.version,
          exportDate: importedData.exportDate,
          selectedIngredients: selectedIngredients.length,
          settings: data.settings
        });
        
      } catch (error) {
        console.error('インポートエラー:', error);
        alert('ファイルの読み込みに失敗しました。正しいJSONファイルを選択してください。');
      }
    };
    
    reader.onerror = function() {
      console.error('ファイル読み込みエラー');
      alert('ファイルの読み込みに失敗しました。');
    };
    
    reader.readAsText(file);
  }
  
  // すべてのデータをクリアする機能
  function clearAllData() {
    try {
      // 確認ダイアログを表示
      const confirmClear = confirm(
        'すべてのデータをクリアします。\n' +
        '選択した食材、設定、メニュー、レシピがすべて削除されますが、よろしいですか？\n\n' +
        '※ この操作は元に戻せません。'
      );
      
      if (!confirmClear) {
        return;
      }
      
      // 選択済み食材をクリア
      selectedIngredients = [];
      
      // カテゴリーを初期状態にリセット
      currentCategory = 'vegetables';
      
      // メニュー選択画面を非表示
      if (menuSelectionSection) {
        menuSelectionSection.style.display = 'none';
      }
      
      // レシピ表示画面を非表示
      if (resultsSection) {
        resultsSection.style.display = 'none';
      }
      
      // 戻るボタンを非表示
      if (backToMenuBtn) {
        backToMenuBtn.style.display = 'none';
      }
      
      // 提案されたメニューをクリア
      proposedMenus = [];
      selectedMenuIndex = -1;
      currentRecipe = null;
      
      // メニューグリッドをクリア
      if (menuGrid) {
        menuGrid.innerHTML = '';
      }
      
      // 設定を初期状態にリセット
      // 季節を春にリセット
      const springRadio = document.querySelector('input[name="season"][value="春"]');
      if (springRadio) springRadio.checked = true;
      
      // 食事タイプを昼食にリセット
      const lunchRadio = document.querySelector('input[name="mealType"][value="昼食"]');
      if (lunchRadio) lunchRadio.checked = true;
      
      // 調理時間を30分以内にリセット
      const time30Radio = document.querySelector('input[name="cookingTime"][value="30分以内"]');
      if (time30Radio) time30Radio.checked = true;
      
      // 料理ジャンルを和食のみにリセット
      document.querySelectorAll('input[name="cuisine"]').forEach(input => {
        input.checked = input.value === '和食';
      });
      
      // 調理法をランダムのみにリセット
      document.querySelectorAll('input[name="cookingMethod"]').forEach(input => {
        input.checked = input.value === 'ランダム';
      });
      
      // 人数を2人分にリセット
      const serving2Radio = document.querySelector('input[name="servings"][value="2人分"]');
      if (serving2Radio) serving2Radio.checked = true;
      
      // 検索窓をクリア
      if (headerIngredientSearch) {
        headerIngredientSearch.value = '';
      }
      
      // UIを更新
      updateCategoryTab();
      renderSelectedIngredients();
      renderIngredients();
      updateClearButtonState();
      updateDecisionButton();
      
      // レシピ生成ボタンの状態を復元
      if (generateRecipeBtn) {
        generateRecipeBtn.disabled = false;
        generateRecipeBtn.innerHTML = '<i class="fas fa-magic"></i> メニューを提案してもらう';
      }
      
      // 状態を保存
      saveState();
      
      // ユーザーフィードバック
      if (clearAllDataBtn) {
        const originalText = clearAllDataBtn.innerHTML;
        clearAllDataBtn.innerHTML = '<i class="fas fa-check"></i> クリア完了！';
        clearAllDataBtn.style.background = 'linear-gradient(135deg, #4CAF50, #45a049)';
        
        setTimeout(() => {
          clearAllDataBtn.innerHTML = originalText;
          clearAllDataBtn.style.background = 'linear-gradient(135deg, #FF9800, #F57C00)';
        }, 2000);
      }
      
      console.log('すべてのデータをクリアしました');
      
    } catch (error) {
      console.error('全データクリア処理エラー:', error);
      alert('クリア処理中にエラーが発生しました。');
    }
  }

  // メニュー・レシピ状態クリア機能
  function clearRecipeState() {
    try {
      // 確認ダイアログを表示
      const confirmClear = confirm(
        'メニュー選択とレシピ表示をクリアします。\n' +
        '現在表示中のメニューやレシピが削除されますが、よろしいですか？\n\n' +
        '※ 選択された食材や設定は保持されます。'
      );
      
      if (!confirmClear) {
        return;
      }
      
      // メニュー選択画面を非表示
      if (menuSelectionSection) {
        menuSelectionSection.style.display = 'none';
      }
      
      // レシピ表示画面を非表示
      if (resultsSection) {
        resultsSection.style.display = 'none';
      }
      
      // 戻るボタンを非表示
      if (backToMenuBtn) {
        backToMenuBtn.style.display = 'none';
      }
      
      // 提案されたメニューをクリア
      proposedMenus = [];
      selectedMenuIndex = -1;
      currentRecipe = null;
      
      // メニューグリッドをクリア
      if (menuGrid) {
        menuGrid.innerHTML = '';
      }
      
      // 決定ボタンを無効状態にリセット
      updateDecisionButton();
      
      // レシピ生成ボタンの状態を復元
      if (generateRecipeBtn) {
        generateRecipeBtn.disabled = false;
        generateRecipeBtn.innerHTML = '<i class="fas fa-magic"></i> メニューを提案してもらう';
      }
      
      // 状態を保存
      saveState();
      
      // ユーザーフィードバック
      if (clearRecipeBtn) {
        const originalText = clearRecipeBtn.innerHTML;
        clearRecipeBtn.innerHTML = '<i class="fas fa-check"></i> クリア完了！';
        clearRecipeBtn.style.background = 'linear-gradient(135deg, #4CAF50, #45a049)';
        
        setTimeout(() => {
          clearRecipeBtn.innerHTML = originalText;
          clearRecipeBtn.style.background = 'linear-gradient(135deg, #FF9800, #F57C00)';
        }, 2000);
      }
      
      console.log('メニュー・レシピ状態をクリアしました');
      
    } catch (error) {
      console.error('クリア処理エラー:', error);
      alert('クリア処理中にエラーが発生しました。');
    }
  }
  
  // レシピPDF出力機能（ブラウザネイティブPrint API使用）
  async function exportRecipeToPdf() {
    if (!currentRecipe) {
      alert('エクスポートするレシピがありません。まずレシピを生成してください。');
      return;
    }
    
    try {
      // PDF出力ボタンの状態を更新
      const exportPdfBtn = document.getElementById('exportPdfBtn');
      if (!exportPdfBtn) {
        alert('PDFボタンが見つかりません。');
        return;
      }
      
      const originalText = exportPdfBtn.innerHTML;
      exportPdfBtn.disabled = true;
      exportPdfBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PDF準備中...';
      
      // 印刷用のウィンドウを作成
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      
      // PDF用のHTMLコンテンツを作成
      const pdfContent = createPrintableContent(currentRecipe);
      
      // 印刷用ウィンドウにコンテンツを書き込み
      printWindow.document.write(pdfContent);
      printWindow.document.close();
      
      // 印刷ダイアログを表示
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        
        // 印刷後にウィンドウを閉じる
        setTimeout(() => {
          printWindow.close();
        }, 1000);
      }, 500);
      
      // ボタンの状態を復元
      exportPdfBtn.disabled = false;
      exportPdfBtn.innerHTML = '<i class="fas fa-check"></i> 印刷ダイアログを開きました';
      exportPdfBtn.style.background = 'linear-gradient(135deg, #4CAF50, #45a049)';
      
      setTimeout(() => {
        exportPdfBtn.innerHTML = originalText;
        exportPdfBtn.style.background = 'linear-gradient(135deg, #f44336, #d32f2f)';
      }, 3000);
      
    } catch (error) {
      console.error('PDF出力エラー:', error);
      alert('PDFの出力に失敗しました。もう一度お試しください。');
      
      // エラー時のボタン復元
      const exportPdfBtnError = document.getElementById('exportPdfBtn');
      if (exportPdfBtnError) {
        exportPdfBtnError.disabled = false;
        exportPdfBtnError.innerHTML = '<i class="fas fa-file-pdf"></i> レシピをPDF出力';
        exportPdfBtnError.style.background = 'linear-gradient(135deg, #f44336, #d32f2f)';
      }
    }
  }
  
  // 印刷用のHTMLコンテンツを作成
  function createPrintableContent(recipe) {
    const settings = getSelectedValues();
    const currentDate = new Date().toLocaleDateString('ja-JP');
    
    return `
      <!DOCTYPE html>
      <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${recipe.menuName} - レシピ</title>
        <style>
          @page {
            margin: 15mm;
            size: A4;
          }
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Noto Sans JP', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', Meiryo, sans-serif;
            line-height: 1.6;
            color: #333;
            font-size: 12pt;
            background: white;
          }
          
          .container {
            max-width: 100%;
            margin: 0 auto;
            padding: 0;
          }
          
          .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 3px solid #ff6b35;
            padding-bottom: 15px;
            page-break-after: avoid;
          }
          
          .recipe-title {
            color: #ff6b35;
            font-size: 24pt;
            font-weight: bold;
            margin-bottom: 8px;
          }
          
          .subtitle {
            color: #666;
            font-size: 10pt;
          }
          
          .section {
            margin-bottom: 20px;
            page-break-inside: avoid;
          }
          
          .section-title {
            font-size: 14pt;
            font-weight: bold;
            margin-bottom: 10px;
            padding-bottom: 3px;
            border-bottom: 2px solid #ccc;
          }
          
          .overview {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            border: 1px solid #ddd;
            margin-bottom: 20px;
          }
          
          .meta-info {
            display: flex;
            gap: 15px;
            margin-top: 10px;
            flex-wrap: wrap;
          }
          
          .meta-item {
            background: white;
            padding: 5px 10px;
            border-radius: 4px;
            border: 1px solid #ddd;
            font-size: 10pt;
          }
          
          .ingredients-section {
            margin-bottom: 15px;
          }
          
          .ingredients-title {
            font-size: 12pt;
            font-weight: bold;
            margin-bottom: 8px;
            color: #4CAF50;
          }
          
          .seasonings-title {
            font-size: 12pt;
            font-weight: bold;
            margin-bottom: 8px;
            color: #FF9800;
          }
          
          .ingredients-list {
            background: #f9f9f9;
            padding: 10px;
            border-radius: 6px;
            border: 1px solid #ddd;
          }
          
          .seasonings-list {
            background: #fff3e0;
            padding: 10px;
            border-radius: 6px;
            border: 1px solid #ffb74d;
          }
          
          .ingredient-item {
            display: flex;
            justify-content: space-between;
            padding: 3px 0;
            border-bottom: 1px solid #eee;
          }
          
          .ingredient-item:last-child {
            border-bottom: none;
          }
          
          .ingredient-name {
            font-weight: 500;
          }
          
          .ingredient-amount {
            color: #666;
          }
          
          .added-label {
            background: #ff9800;
            color: white;
            font-size: 8pt;
            padding: 1px 3px;
            border-radius: 2px;
            margin-left: 3px;
          }
          
          .steps-container {
            background: #fafafa;
            padding: 15px;
            border-radius: 6px;
            border: 1px solid #ddd;
          }
          
          .step-item {
            display: flex;
            margin-bottom: 12px;
            align-items: flex-start;
          }
          
          .step-item:last-child {
            margin-bottom: 0;
          }
          
          .step-number {
            background: #FF9800;
            color: white;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            margin-right: 10px;
            flex-shrink: 0;
            font-size: 10pt;
          }
          
          .step-text {
            flex: 1;
            font-size: 11pt;
          }
          
          .tips-section {
            background: #f3e5f5;
            padding: 15px;
            border-radius: 6px;
            border: 1px solid #ba68c8;
          }
          
          .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 15px;
            border-top: 2px solid #eee;
            color: #999;
            font-size: 9pt;
            page-break-inside: avoid;
          }
          
          @media print {
            body {
              font-size: 10pt;
            }
            .container {
              padding: 0;
            }
            .section {
              page-break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- ヘッダー -->
          <div class="header">
            <h1 class="recipe-title">${recipe.menuName}</h1>
            <p class="subtitle">AI料理提案システム - 生成日: ${currentDate}</p>
          </div>
          
          <!-- レシピ概要 -->
          <div class="section overview">
            <h2 class="section-title" style="color: #1976d2;">📝 レシピ概要</h2>
            <p style="margin-bottom: 10px;">${recipe.description || 'AIが提案する美味しいレシピです'}</p>
            
            <div class="meta-info">
              <div class="meta-item">⏰ ${recipe.cookingTime || '調理時間不明'}</div>
              <div class="meta-item">📊 ${recipe.difficulty || '普通'}</div>
              <div class="meta-item">👥 ${settings.servings}</div>
            </div>
          </div>
          
          <!-- 材料 -->
          <div class="section">
            <h2 class="section-title" style="color: #4CAF50;">🥬 材料</h2>
            
            ${recipe.ingredients && recipe.ingredients.length > 0 ? `
              <div class="ingredients-section">
                <h3 class="ingredients-title">食材</h3>
                <div class="ingredients-list">
                  ${recipe.ingredients.map(ingredient => `
                    <div class="ingredient-item">
                      <span class="ingredient-name">${ingredient.name}</span>
                      <span class="ingredient-amount">${ingredient.amount}</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
            
            ${recipe.seasonings && recipe.seasonings.length > 0 ? `
              <div class="ingredients-section">
                <h3 class="seasonings-title">調味料</h3>
                <div class="seasonings-list">
                  ${recipe.seasonings.map(seasoning => `
                    <div class="ingredient-item">
                      <span class="ingredient-name">
                        ${seasoning.name}
                        ${!seasoning.isSelected ? '<span class="added-label">追加</span>' : ''}
                      </span>
                      <span class="ingredient-amount">${seasoning.amount}</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>
          
          <!-- 作り方 -->
          <div class="section">
            <h2 class="section-title" style="color: #FF9800;">👩‍🍳 作り方</h2>
            <div class="steps-container">
              ${recipe.cookingSteps && recipe.cookingSteps.length > 0 ? 
                recipe.cookingSteps.map((step, index) => `
                  <div class="step-item">
                    <div class="step-number">${index + 1}</div>
                    <div class="step-text">${step}</div>
                  </div>
                `).join('') : 
                '<p style="color: #666;">作り方の情報がありません。</p>'
              }
            </div>
          </div>
          
          <!-- コツ・ポイント -->
          ${recipe.tips ? `
            <div class="section">
              <h2 class="section-title" style="color: #9C27B0;">💡 コツ・ポイント</h2>
              <div class="tips-section">
                <p>${recipe.tips}</p>
              </div>
            </div>
          ` : ''}
          
          <!-- フッター -->
          <div class="footer">
            <p>このレシピは AI料理提案システム で生成されました</p>
            <p>生成日時: ${new Date().toLocaleString('ja-JP')}</p>
          </div>
        </div>
      </body>
      </html>
    `;
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
  
    // 戻るボタンのイベントリスナーを設定
    if (backToMenuBtn) {
      backToMenuBtn.addEventListener('click', () => {
        resultsSection.style.display = 'none';
        menuSelectionSection.style.display = 'block';
        backToMenuBtn.style.display = 'none';
      });
    }
    
    // 決定ボタンのイベントリスナーを設定
    if (menuDecisionBtn) {
      menuDecisionBtn.addEventListener('click', selectMenu);
    }
  
    console.log('初期化完了');
  }
  
  // 初期化実行
  initialize();
} 