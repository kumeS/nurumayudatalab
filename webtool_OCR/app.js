/**
 * NuruMayu StudyLab - AI OCR学習支援ツール JavaScript
 * MVPバージョン
 */
document.addEventListener('DOMContentLoaded', () => {
  // 要素の参照を取得
  const inputArea = document.getElementById('inputArea');
  const sampleBtn = document.getElementById('sampleBtn');
  const recordBtn = document.getElementById('recordBtn');
  const clearBtn = document.getElementById('clearBtn');
  const copyBtn = document.getElementById('copyBtn');
  const loadingIndicator = document.getElementById('loadingIndicator');
  
  // 状態管理用のキー
  const STORAGE_KEYS = {
    ACTIVE_TAB: 'nurumayuActiveTab',
    INPUT_TEXT: 'quizInputText',
    OCR_TEXT: 'ocrTextContent',
    OCR_IMAGE_NAME: 'ocrImageName'
  };
  
  // タブ関連要素
  const tabOcr = document.getElementById('tab-ocr');
  const tabText = document.getElementById('tab-text');
  const contentOcr = document.getElementById('content-ocr');
  const contentText = document.getElementById('content-text');
  
  // OCR関連要素
  const imageUpload = document.getElementById('imageUpload');
  const imageUploadZone = document.getElementById('imageUploadZone');
  const imagePreview = document.getElementById('imagePreview');
  const previewImage = document.getElementById('previewImage');
  const imageFileName = document.getElementById('imageFileName');
  const removeImageBtn = document.getElementById('removeImageBtn');
  const startOcrBtn = document.getElementById('startOcrBtn');
  const correctOcrBtn = document.getElementById('correctOcrBtn');
  const ocrProgress = document.getElementById('ocrProgress');
  const progressFill = document.getElementById('progressFill');
  const progressPercent = document.getElementById('progressPercent');
  const ocrResult = document.getElementById('ocrResult');
  const ocrText = document.getElementById('ocrText');
  
  // 学習コンテンツ生成関連要素
  const generateContentTextBtn = document.getElementById('generateContentTextBtn');
  const resetContentTextBtn = document.getElementById('resetContentTextBtn');
  const generateContentOcrBtn = document.getElementById('generateContentOcrBtn');
  const resetContentOcrBtn = document.getElementById('resetContentOcrBtn');
  
  // クイズ関連要素
  const quizContainer = document.getElementById('quizContainer');
  const quizProgress = document.getElementById('quizProgress');
  const quizScore = document.getElementById('quizScore');
  const allQuestions = document.getElementById('allQuestions');
  const quizFeedback = document.getElementById('quizFeedback');
  const submitAllAnswersBtn = document.getElementById('submitAllAnswersBtn');
  const retryQuizBtn = document.getElementById('retryQuizBtn');
  const newQuizBtn = document.getElementById('newQuizBtn');
  const quizData = document.getElementById('quizData');
  const outputContainer = document.querySelector('.output-container');
  
  // 祝福演出関連要素
  const celebrationOverlay = document.getElementById('celebrationOverlay');
  const celebrationScore = document.getElementById('celebrationScore');
  const celebrationCloseBtn = document.getElementById('celebrationCloseBtn');
  
  // 音声録音関連変数
  let mediaRecorder = null;
  let audioChunks = [];
  let isRecording = false;
  let isPaused = false;
  let recognition = null;
  
  // クイズ関連変数
  let currentQuiz = null;
  let userAnswers = []; // ユーザーの回答を記録
  let hintUsed = []; // ヒント使用状況を記録
  let score = 0;
  let totalQuestions = 0;
  let isQuizSubmitted = false; // 採点済みかどうか
  
  // 累積スコア管理
  let previousInputText = '';
  let cumulativeScore = 0;
  let cumulativeTotalQuestions = 0;
  let cumulativeQuizCount = 0;
  
  // クイズ生成履歴管理
  let quizGenerationHistory = [];
  let generationCount = 0;
  
  // OCR関連変数
  let currentImageFile = null;
  let ocrWorker = null;
  let currentOcrText = '';
  
  // サンプルテキストデータ（各レベル6つずつ：AI基礎・機械学習・生成AI・活用事例・技術動向・AI歴史）
  const sampleTexts = {
    'elementary-low': [
      // AI基礎
      `コンピューターにも、とてもかしこいものがあります。それがAI（エーアイ）です。AIは、人のように考えたり、話したりできるコンピューターです。みんなのおうちにあるスマホやタブレットにも、AIがいます。「OK グーグル」と言うと、こたえてくれるでしょう？あれがAIです。AIは、みんなのお友だちのようなコンピューターなのです。`,
      
      // 機械学習
      `コンピューターも「べんきょう」ができます。犬の写真をたくさん見せると、「これが犬だ」と覚えます。つぎに、犬の写真を見せると、「犬だ！」と分かるようになります。人の赤ちゃんが、ママやパパの顔を覚えるのと同じです。コンピューターは、たくさん見て、たくさん覚えて、だんだんかしこくなるのです。`,
      
      // 生成AI
      `AIは、とてもじょうずに絵を描いたり、お話を作ったりできます。「ねこの絵を描いて」と言うと、かわいいねこの絵を描いてくれます。「楽しいお話を作って」と言うと、おもしろいお話を作ってくれます。みんなが工作をするように、AIは、コンピューターの中で、いろいろなものを作ってくれるのです。`,
      
      // 活用事例
      `AIは、いろいろなところで、みんなのお手伝いをしています。お店で、おかしを買うときの機械にもAIがいます。車が安全に走れるように見張ってくれたり、病院で先生のお手伝いをしたりもします。お家のお掃除ロボットも、AIが動かしています。AIは、みんなの生活を楽しく、便利にしてくれているのです。`,
      
      // 技術動向
      `最近、AIがもっとすごくなりました。おしゃべりがとても上手になって、人とまるで友だちのように話ができます。絵を描くのも上手になって、写真みたいにきれいな絵を描けます。これから、AIはもっともっと上手になって、みんなの勉強や遊びを手伝ってくれるかもしれませんね。`,
      
      // AI歴史
      `AIは、とても昔から人が作りたいと思っていました。昔の人は、「コンピューターが人のように考えられたらいいな」と思ったのです。最初は、とても大きなコンピューターでした。お部屋全部くらい大きかったのです。でも、だんだん小さくなって、今はみんなのスマホにもAIがいます。長い時間をかけて、AIは上手になったのです。`
    ],
    
    'elementary-mid': [
      // AI基礎
      `AIって何？と聞かれたら、「コンピューターが人間みたいに考える技術」と答えればOKです。スマホのSiriやGoogleアシスタントに話しかけると答えてくれますよね。あれがAIです。写真を撮ると自動で人の顔にピントが合うのも、YouTubeがあなたの好きそうな動画をおすすめしてくれるのも、全部AIが働いているからです。`,
      
      // 機械学習
      `機械学習は、コンピューターが「練習」して賢くなることです。例えば、犬の写真を1000枚見せると、コンピューターは「あ、これが犬なんだ」と覚えます。そして新しい写真を見せても「これは犬だね」と分かるようになります。人間の赤ちゃんが言葉を覚えるのと似ていますね。たくさん見て、たくさん聞いて、だんだん上手になるのです。`,
      
      // 生成AI
      `生成AIは「作るAI」です。ChatGPTに「猫の詩を書いて」と言うと、本当に詩を作ってくれます。絵を描くAIもあって、「青い空と白い雲」と言葉で伝えると、実際に絵を描いてくれます。まるで魔法みたいですが、実はたくさんの文章や絵を見て学習した結果なんです。創作のお手伝いをしてくれる便利な友達のような存在です。`,
      
      // 活用事例
      `AIは身の回りのいろんなところで活躍しています。コンビニのレジで商品をピッとスキャンするのも、電車の自動改札も、実はAIが使われています。病院では先生がレントゲン写真を見るときにAIがお手伝いしたり、車の自動ブレーキもAIが危険を察知してくれます。お掃除ロボットのルンバも、部屋の形を覚えて効率よくお掃除してくれますね。`,
      
      // 技術動向
      `最近、AIがとても話題になっています。2022年にChatGPTというAIが登場して、みんなが「すごい！」と驚きました。質問すると人間みたいに答えてくれるからです。今では絵を描くAI、音楽を作るAI、動画を作るAIもあります。これからもっと便利になって、宿題を手伝ってくれたり、お料理のレシピを考えてくれたりするかもしれませんね。`,
      
      // AI歴史
      `AIの歴史は意外と古くて、1950年代から始まりました。最初は「コンピューターが人間みたいに考えられるかな？」という夢から始まったんです。昔のSF映画に出てくるロボットみたいなものを作りたかったんですね。でも当時のコンピューターはとても大きくて、部屋いっぱいの大きさでした。今のスマホの方がずっと賢いんですよ。長い時間をかけて、少しずつ今のAIになったんです。`
    ],
    
    'elementary-high': [
      // AI基礎
      `人工知能（AI）は、コンピューターが人間のように学習し、判断し、問題を解決する技術です。身近な例として、スマートフォンの音声アシスタント、動画サイトのおすすめ機能、写真アプリの自動補正などがあります。AIは大きく分けて、決められたルールに従って動く「ルールベースAI」と、データから学習する「機械学習AI」があります。現在話題のChatGPTなどは機械学習AIの一種で、大量の文章データから学習して人間のような文章を生成できます。`,
      
      // 機械学習
      `機械学習は、コンピューターがデータから自動的にパターンを見つけて学習する方法です。例えば、メールのスパム判定では、たくさんのスパムメールと正常なメールを学習させることで、新しいメールがスパムかどうかを自動判断できるようになります。教師あり学習、教師なし学習、強化学習という3つの主要な方法があり、それぞれ異なる目的で使われます。画像認識、音声認識、自然言語処理など、私たちの身の回りの多くの技術で活用されています。`,
      
      // 生成AI
      `生成AIは、新しい文章、画像、音楽などを自動的に作り出すAIです。ChatGPTのような文章生成AIは、インターネット上の膨大な文章を学習して、まるで人間が書いたような自然な文章を生成できます。画像生成AIでは、「青い空に白い雲が浮かぶ風景」のような説明文から、実際にそのような画像を作り出すことができます。これらの技術は、創作活動の支援や教育分野での活用が期待されています。`,
      
      // 活用事例
      `AIは医療、教育、交通、エンターテインメントなど、様々な分野で活用されています。医療では、レントゲン写真の診断支援やがんの早期発見に役立っています。教育では、一人一人の学習進度に合わせた個別指導システムが開発されています。自動運転車では、周囲の状況を認識して安全な運転を支援します。また、翻訳アプリや音楽の自動作曲、ゲームのAIキャラクターなど、身近なところでもAIが活躍しています。`,
      
      // 技術動向
      `最近のAI技術の進歩は目覚ましく、特に2022年以降の生成AIの発展が注目されています。ChatGPTのような会話AI、DALL-Eのような画像生成AI、音楽や動画を作るAIなど、クリエイティブな分野でのAI活用が急速に広がっています。また、複数の能力を持つマルチモーダルAIや、スマートフォンなどの端末で動作するエッジAIの開発も進んでいます。これからAIはさらに身近な存在になり、学習や仕事、日常生活をサポートしてくれるでしょう。`,
      
      // AI歴史
      `AIの研究は1950年代から始まりました。最初は計算やチェスなどの単純なゲームからスタートし、1980年代にはエキスパートシステムという専門知識を活用するAIが実用化されました。1990年代にインターネットが普及すると大量のデータが利用できるようになり、機械学習が本格的に発展しました。2010年代に入ると深層学習という新しい技術により画像認識や音声認識が飛躍的に向上し、2020年代には現在のような高性能な生成AIが登場したのです。`
    ],
    
    'junior': [
      // AI基礎
      `人工知能（AI）は、機械学習、深層学習、自然言語処理などの技術から構成されています。機械学習はデータからパターンを学習する技術で、教師あり学習、教師なし学習、強化学習の3つの手法があります。深層学習はニューラルネットワークを多層化した手法で、画像認識や音声認識で高い性能を発揮します。AIシステムの構築には、データ収集、前処理、モデル訓練、評価のプロセスが必要です。`,
      
      // 機械学習
      `機械学習アルゴリズムには線形回帰、決定木、ランダムフォレスト、サポートベクターマシンなどがあります。分類問題では正解ラベルのあるデータを使って学習し、回帰問題では連続値を予測します。クラスタリングは教師なし学習の手法で、データをグループに分けます。モデルの性能は交差検証や混同行列を使って評価し、過学習を防ぐために正則化技術を用います。`,
      
      // 生成AI
      `生成AIは大規模言語モデル（LLM）と呼ばれる技術をベースにしています。GPTシリーズはTransformerアーキテクチャを使用し、トークン化されたテキストデータで事前学習されます。プロンプトエンジニアリングにより、AIに適切な指示を与えて望む出力を得ることができます。ファインチューニングやRAG（Retrieval-Augmented Generation）により、特定用途に特化したAIシステムを構築できます。`,
      
      // 活用事例
      `AIの実装にはPythonやTensorFlow、PyTorchなどのツールが使用されます。クラウドプラットフォーム（AWS、Google Cloud、Azure）ではAIサービスが提供されており、APIを通じて音声認識、画像解析、自然言語処理機能を利用できます。MLOpsの概念により、機械学習モデルの開発から運用までのライフサイクル管理が重要視されています。`,
      
      // 技術動向
      `AI技術のトレンドとして、Foundation ModelsやマルチモーダルAI、エッジAIが注目されています。AutoMLにより、専門知識がなくても機械学習モデルを構築できるようになりました。説明可能AI（XAI）は、AIの判断根拠を理解可能にする技術です。責任あるAIの概念により、公平性、透明性、説明責任が重視されています。`,
      
      // AI歴史
      `AI研究は1956年のダートマス会議で正式に始まりました。1960年代にはエキスパートシステムが開発され、1980年代には第2次AIブームが到来しました。1990年代後半からインターネットの普及により大量データが利用可能になり、2000年代に機械学習が実用化されました。2010年代の深層学習革命により画像認識が飛躍的に向上し、2020年代には大規模言語モデルが登場して現在の生成AIブームに至っています。`
    ],
    
    'senior': [
      // AI基礎
      `人工知能の基盤技術には、確率・統計、線形代数、微積分などの数学的知識が必要です。ニューラルネットワークは人間の脳の神経細胞を模倣した計算モデルで、活性化関数、損失関数、最適化アルゴリズムによって学習が進行します。バックプロパゲーション（誤差逆伝播法）により、出力誤差を入力層まで逆算して重みを更新します。過学習を防ぐため、ドロップアウト、正則化、データ拡張などの手法が用いられます。`,
      
      // 機械学習
      `アンサンブル学習では複数のモデルを組み合わせて予測精度を向上させます。バギング、ブースティング、スタッキングが主要な手法です。特徴量エンジニアリングでは、ドメイン知識を活用してモデルの性能向上に寄与する特徴量を作成します。データの前処理では正規化、標準化、欠損値処理、外れ値除去が重要です。モデルの解釈性向上にはSHAP値やLIMEなどの技術を使用します。`,
      
      // 生成AI
      `Large Language Model（LLM）の性能は、パラメータ数、訓練データの質と量、計算資源に依存します。In-Context LearningやFew-Shot Learning により、追加学習なしで新しいタスクに適応できます。Instruction Tuningにより、人間の指示により適切に従うモデルを作成できます。RLHF（Reinforcement Learning from Human Feedback）により、人間の価値観に沿った出力を生成するよう調整されます。プロンプトインジェクション対策やコンテンツフィルタリングなどのセキュリティ対策が重要です。`,
      
      // 活用事例
      `AIシステムの実装では、データパイプライン設計、モデルのバージョン管理、A/Bテストによる性能評価が必要です。マイクロサービスアーキテクチャにより、AIモデルをスケーラブルにデプロイできます。リアルタイム推論とバッチ処理のトレードオフを考慮し、レイテンシとスループットを最適化します。モデルのドリフト検出により、性能劣化を早期発見し、再学習のタイミングを決定します。`,
      
      // 技術動向
      `生成AIの企業導入では、ROI測定、セキュリティポリシー、ガバナンス体制の確立が課題となります。AI倫理ガイドラインに従い、バイアス軽減、プライバシー保護、透明性確保を実装します。Large Action Model（LAM）により、AIが実際の行動を実行できるようになりつつあります。マルチモーダル基盤モデルの発展により、テキスト、画像、音声を統合した AI システムが実現されています。`,
      
      // AI歴史
      `AI研究の歴史は複数のブームと冬の時代を経験しています。第1次AIブーム（1950-1960年代）では論理的推論に焦点が当てられ、第2次AIブーム（1980年代）ではエキスパートシステムが実用化されました。1990年代のAI冬の時代を経て、2000年代にビッグデータと計算能力の向上により機械学習が復活しました。2012年のAlexNetによる画像認識革命、2017年のTransformer論文、2022年のChatGPT登場が現在のAI黄金時代を築いています。`
    ],
    
    'university': [
      // AI基礎
      `深層学習アーキテクチャは目的に応じて選択する必要があります。CNN（畳み込みニューラルネットワーク）は画像処理に、RNN/LSTMは時系列データに、Transformerは自然言語処理に適用されます。注意機構（Attention Mechanism）により、入力の重要な部分に焦点を当てることができます。転移学習では事前学習済みモデルを活用し、少ないデータでも高性能なモデルを構築できます。ハイパーパラメータチューニングにはグリッドサーチやベイズ最適化を使用します。`,
      
      // 機械学習
      `マルチモーダル学習では異なる種類のデータ（テキスト、画像、音声）を統合して学習します。GAN（敵対的生成ネットワーク）では生成器と識別器が競合することで、リアルなデータを生成できます。強化学習では報酬信号に基づいてエージェントが最適な行動を学習し、Q学習やポリシー勾配法などのアルゴリズムが使用されます。連合学習（Federated Learning）により、プライバシーを保護しながら分散環境で機械学習を行えます。`,
      
      // 生成AI
      `大規模言語モデルの性能は主にパラメータ数とトレーニングデータの質・量によって決まります。GPT-4のようなモデルはIn-Context LearningやFew-Shot Learningにより、少数の例から新しいタスクを学習できます。RLHF（Reinforcement Learning from Human Feedback）により、人間の価値観に沿った出力を生成できます。Parameter-Efficient Fine-tuning（PEFT）では、少ないパラメータの更新で特定タスクに適応できます。`,
      
      // 活用事例
      `AI開発のベストプラクティスには、データバイアスの除去、モデルの解釈可能性確保、A/Bテストによる効果検証が含まれます。エッジコンピューティングでは、モデルの軽量化（量子化、プルーニング、知識蒸留）が重要です。リアルタイム推論では、レイテンシとスループットのトレードオフを考慮したアーキテクチャ設計が必要です。DevOpsとMLOpsの統合により、継続的インテグレーション・継続的デリバリー（CI/CD）パイプラインを構築できます。`,
      
      // 技術動向
      `次世代AI技術として、神経記号学習（Neural-Symbolic Learning）やカジュアル推論（Causal Inference）、メタ学習（Meta-Learning）が注目されています。量子機械学習では、量子コンピューターの特性を活用した新しいアルゴリズムが研究されています。グリーンAIの概念により、計算効率とエネルギー効率を両立したAIシステムの開発が重要視されています。AGI（汎用人工知能）に向けた研究では、マルチタスク学習と転移学習の高度化が進んでいます。`,
      
      // AI歴史
      `AI研究の発展は計算資源の向上と密接に関連しています。1970年代のAI冬の時代から、1980年代のエキスパートシステムブーム、1990年代の統計的機械学習の台頭、2000年代のウェブデータ活用、2010年代のビッグデータとGPU活用による深層学習革命まで、技術的ブレークスルーと社会的期待のサイクルが繰り返されてきました。現在のTransformer時代は、注意機構の発明（2017年）から始まり、計算パワーの指数的増加により実現されています。`
    ]
  };
  
  // 各レベルのサンプルインデックスを管理
  let sampleIndices = {
    'elementary-low': 0,
    'elementary-mid': 0,
    'elementary-high': 0,
    'junior': 0,
    'senior': 0,
    'university': 0
  };
  
  // サンプルボタンのイベントリスナー
  sampleBtn.addEventListener('click', () => {
    const selectedLevel = document.querySelector('input[name="level-text"]:checked').value;
    const levelSamples = sampleTexts[selectedLevel];
    
    if (levelSamples && levelSamples.length > 0) {
      // 現在のインデックスを取得
      const currentIndex = sampleIndices[selectedLevel];
      const sampleText = levelSamples[currentIndex];
      
      // 教科名を定義
      const subjects = ['AI基礎', '機械学習', '生成AI', '活用事例', '技術動向', 'AI歴史'];
      const currentSubject = subjects[currentIndex];
      
      // 次のインデックスを計算（循環）
      sampleIndices[selectedLevel] = (currentIndex + 1) % levelSamples.length;
      
      // テキストを入力エリアに設定
      inputArea.value = sampleText;
      localStorage.setItem(STORAGE_KEYS.INPUT_TEXT, inputArea.value);
      
      // 入力エリアをハイライト
      inputArea.classList.add('highlight-input');
      setTimeout(() => {
        inputArea.classList.remove('highlight-input');
      }, 1000);
      
      // サンプル入力完了のフィードバック（短時間のハイライトのみ）
      sampleBtn.classList.add('copy-success');
      setTimeout(() => {
        sampleBtn.classList.remove('copy-success');
      }, 1000);
    }
  });
  
    // 保存されたテキストを読み込み
  let savedInputText = localStorage.getItem(STORAGE_KEYS.INPUT_TEXT);
  if (savedInputText) {
    inputArea.value = savedInputText;
  }

  // テキスト変更時に保存
  inputArea.addEventListener('input', () => {
    localStorage.setItem(STORAGE_KEYS.INPUT_TEXT, inputArea.value);
  });

  // OCRテキスト変更時に保存
  if (ocrText) {
    ocrText.addEventListener('input', () => {
      saveOcrText(ocrText.value);
    });
  }
  
  // タブ切り替え機能
  function switchTab(targetTab) {
    // すべてのタブとコンテンツを非アクティブにする
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => {
      content.style.display = 'none';
      content.classList.remove('active');
    });
    
    // 選択されたタブとコンテンツをアクティブにする
    targetTab.classList.add('active');
    const contentId = targetTab.id.replace('tab-', 'content-');
    const targetContent = document.getElementById(contentId);
    if (targetContent) {
      targetContent.style.display = 'block';
      targetContent.classList.add('active');
    }
    
    // タブ状態を保存
    saveTabState(targetTab.id);
  }
  
  // タブクリックイベント
  tabOcr.addEventListener('click', () => switchTab(tabOcr));
  tabText.addEventListener('click', () => switchTab(tabText));
  


  // OCRイベントリスナー
  imageUploadZone.addEventListener('click', () => {
    imageUpload.click();
  });

  imageUploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    imageUploadZone.classList.add('dragover');
  });

  imageUploadZone.addEventListener('dragleave', () => {
    imageUploadZone.classList.remove('dragover');
  });

  imageUploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    imageUploadZone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleImageUpload(files[0]);
    }
  });

  imageUpload.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleImageUpload(e.target.files[0]);
    }
  });

  removeImageBtn.addEventListener('click', () => {
    clearImageUpload();
  });

  startOcrBtn.addEventListener('click', () => {
    performOCR();
  });

  correctOcrBtn.addEventListener('click', () => {
    correctOCRText();
  });



  // クリアボタンの処理
  clearBtn.addEventListener('click', () => {
    inputArea.value = '';
    localStorage.removeItem('quizInputText');
  });

  // 学習コンテンツ生成ボタン（テキスト入力タブ）
  generateContentTextBtn.addEventListener('click', () => {
    generateLearningContent('text');
  });

  resetContentTextBtn.addEventListener('click', () => {
    resetContent('text');
  });

  // 学習コンテンツ生成ボタン（OCRタブ）
  generateContentOcrBtn.addEventListener('click', () => {
    generateLearningContent('ocr');
  });

  resetContentOcrBtn.addEventListener('click', () => {
    resetContent('ocr');
  });

  // コンテンツトグルボタンのイベントリスナー
  setupContentToggleButtons();

    // 理解度レベル変更時の処理（テキスト入力タブ）
  document.querySelectorAll('input[name="level-text"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const selectedLevel = radio.value;
      // 選択されたレベルのサンプルインデックスをリセット
      sampleIndices[selectedLevel] = 0;
      
      // 理解度レベル変更時は入力エリアの内容を変更しない
      // ユーザーが入力した内容を保持する
    });
  });

  // 理解度レベル変更時の処理（OCRタブ）
  document.querySelectorAll('input[name="level-ocr"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const selectedLevel = radio.value;
      // 選択されたレベルのサンプルインデックスをリセット
      sampleIndices[selectedLevel] = 0;
    });
  });
  

  
  // 画像アップロード処理
  function handleImageUpload(file) {
    if (!file.type.startsWith('image/')) {
      alert('画像ファイルを選択してください。');
      return;
    }

    currentImageFile = file;
    
    // 画像プレビューを表示
    const reader = new FileReader();
    reader.onload = (e) => {
      previewImage.src = e.target.result;
      imageFileName.textContent = file.name;
      imagePreview.style.display = 'block';
      startOcrBtn.disabled = false;
    };
    reader.readAsDataURL(file);
  }

  // 画像アップロードのクリア
  function clearImageUpload() {
    currentImageFile = null;
    imagePreview.style.display = 'none';
    imageUpload.value = '';
    startOcrBtn.disabled = true;
    ocrResult.style.display = 'none';
    ocrProgress.style.display = 'none';
    correctOcrBtn.style.display = 'none';
    
    // OCR関連の保存データもクリア
    ocrText.value = '';
    localStorage.removeItem(STORAGE_KEYS.OCR_TEXT);
    localStorage.removeItem(STORAGE_KEYS.OCR_IMAGE_NAME);
  }

  // OCR実行
  async function performOCR() {
    if (!currentImageFile) {
      alert('画像をアップロードしてください。');
      return;
    }

    try {
      // プログレス表示
      ocrProgress.style.display = 'block';
      progressFill.style.width = '0%';
      progressPercent.textContent = '0%';
      startOcrBtn.disabled = true;

      // 言語設定を取得
      const language = document.querySelector('input[name="ocrLanguage"]:checked').value;

      // Tesseract.jsでOCR実行
      if (!ocrWorker) {
        ocrWorker = await Tesseract.createWorker(language);
      }

      const { data: { text } } = await ocrWorker.recognize(currentImageFile, {
        logger: (progress) => {
          const percent = Math.round(progress.progress * 100);
          progressFill.style.width = percent + '%';
          progressPercent.textContent = percent + '%';
        }
      });

      // 結果表示
      ocrText.value = text.trim();
      ocrResult.style.display = 'block';
      correctOcrBtn.style.display = 'inline-block';
      
      // OCRテキストと画像名を保存
      saveOcrText(text.trim());
      saveImageName(currentImageFile.name);
      
      // プログレス非表示
      ocrProgress.style.display = 'none';
      startOcrBtn.disabled = false;

    } catch (error) {
      console.error('OCRエラー:', error);
      alert('文字認識に失敗しました。画像を確認してもう一度お試しください。');
      ocrProgress.style.display = 'none';
      startOcrBtn.disabled = false;
    }
  }

  // OCR結果のAI補正
  async function correctOCRText() {
    const originalText = ocrText.value.trim();
    if (!originalText) {
      alert('補正するテキストがありません。');
      return;
    }

    try {
      correctOcrBtn.disabled = true;
      correctOcrBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> AI補正中...';

      const messages = [
        {
          role: "system",
          content: "あなたはOCR結果の誤字脱字を修正する専門家です。文脈を理解して、自然で読みやすい日本語に修正してください。内容の意味は変えずに、明らかな誤認識のみを修正してください。"
        },
        {
          role: "user",
          content: `以下のOCR結果を修正してください：\n\n${originalText}`
        }
      ];

      const correctedText = await callLLMAPI(messages);
      if (correctedText && correctedText.trim()) {
        ocrText.value = correctedText.trim();
        saveOcrText(correctedText.trim());
      }

    } catch (error) {
      console.error('AI補正エラー:', error);
      alert('AI補正に失敗しました。手動で修正してください。');
    } finally {
      correctOcrBtn.disabled = false;
      correctOcrBtn.innerHTML = '<i class="fas fa-magic"></i> AI補正';
    }
  }

  // 学習コンテンツ生成
  function generateLearningContent(tabType) {
    let text = '';
    
    if (tabType === 'text') {
      text = inputArea.value.trim();
      if (!text) {
        alert('学習内容を入力してください。');
        return;
      }
    } else if (tabType === 'ocr') {
      text = ocrText.value.trim();
      if (!text) {
        alert('OCR結果がありません。画像をアップロードして文字認識を実行してください。');
        return;
      }
    }
    
    // 選択されたコンテンツタイプを取得
    const selectedTypes = getSelectedContentTypes(tabType);
    
    if (selectedTypes.length === 0) {
      alert('生成するコンテンツを選択してください。');
      return;
    }
    
    // クイズが選択されている場合は既存のクイズ生成機能を使用
    if (selectedTypes.includes('quiz')) {
      generateQuiz(text, tabType);
    } else {
      // クイズ以外のコンテンツ生成は今後の実装予定
      alert('要約・詳しい説明機能は今後のアップデートで実装予定です。現在はクイズ機能のみご利用いただけます。');
    }
  }

  // コンテンツリセット
  function resetContent(tabType) {
    if (tabType === 'text') {
      inputArea.value = '';
      localStorage.removeItem(STORAGE_KEYS.INPUT_TEXT);
    } else if (tabType === 'ocr') {
      clearImageUpload();
      currentOcrText = '';
    }
    
    // クイズ結果もリセット
    quizContainer.style.display = 'none';
    outputContainer.style.display = 'none';
  }

  // 音声認識の初期化
  function initSpeechRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'ja-JP';
      
      recognition.onstart = () => {
        console.log('音声認識開始');
      };
      
      recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        if (finalTranscript) {
          inputArea.value += finalTranscript;
          localStorage.setItem('quizInputText', inputArea.value);
        }
      };
      
      recognition.onerror = (event) => {
        console.error('音声認識エラー:', event.error);
        stopRecording();
      };
      
      recognition.onend = () => {
        if (isRecording && !isPaused) {
          recognition.start(); // 継続録音
        }
      };
    }
  }
  
  // 音声録音開始/停止/一時停止
  recordBtn.addEventListener('click', () => {
    if (!isRecording) {
      startRecording();
    } else if (isPaused) {
      resumeRecording();
    } else {
      pauseRecording();
    }
  });
  
  function startRecording() {
    if (!recognition) {
      initSpeechRecognition();
    }
    
    if (recognition) {
      isRecording = true;
      isPaused = false;
      recordBtn.classList.add('recording');
      recordBtn.innerHTML = '<i class="fas fa-pause"></i> 一時停止';
      
      try {
        recognition.start();
      } catch (error) {
        console.error('音声認識開始エラー:', error);
        stopRecording();
      }
    } else {
      alert('お使いのブラウザは音声認識に対応していません。');
    }
  }
  
  function pauseRecording() {
    if (recognition && isRecording) {
      isPaused = true;
      recordBtn.classList.remove('recording');
      recordBtn.classList.add('paused');
      recordBtn.innerHTML = '<i class="fas fa-play"></i> 再開';
      recognition.stop();
    }
  }
  
  function resumeRecording() {
    if (recognition && isRecording && isPaused) {
      isPaused = false;
      recordBtn.classList.remove('paused');
      recordBtn.classList.add('recording');
      recordBtn.innerHTML = '<i class="fas fa-pause"></i> 一時停止';
      recognition.start();
    }
  }
  
  function stopRecording() {
    if (recognition) {
      recognition.stop();
    }
    isRecording = false;
    isPaused = false;
    recordBtn.classList.remove('recording', 'paused');
    recordBtn.innerHTML = '<i class="fas fa-microphone"></i> 音声録音';
  }
  
  // クイズ生成関数は generateContentBtn.addEventListener で既に設定済み
  
  function generateQuiz(inputText, tabType) {
    const input = inputText;
    if (!input) {
      alert('学習内容を入力してください。');
      return;
    }
    
    // テキスト変更チェック
    if (input !== previousInputText) {
      // テキストが変更された場合、累積をリセット
      resetCumulativeScore();
      previousInputText = input;
    }
    
    // 設定値を取得（タブ別）
    const levelName = tabType === 'text' ? 'level-text' : 'level-ocr';
    const questionCountName = tabType === 'text' ? 'questionCount-text' : 'questionCount-ocr';
    const quizTypeName = tabType === 'text' ? 'quizType-text' : 'quizType-ocr';
    
    const level = document.querySelector(`input[name="${levelName}"]:checked`).value;
    const questionCount = document.querySelector(`input[name="${questionCountName}"]:checked`).value;
    const quizType = document.querySelector(`input[name="${quizTypeName}"]:checked`).value;
    
    // UI更新
    loadingIndicator.classList.add('active');
    const generateBtn = tabType === 'text' ? generateContentTextBtn : generateContentOcrBtn;
    generateBtn.disabled = true;
    quizContainer.style.display = 'none';
    outputContainer.style.display = 'none';
    
    // 生成回数の表示更新
    updateGenerationInfo(tabType);
    
    // LLMにクイズ生成を依頼
    const messages = createQuizGenerationMessages(input, level, questionCount, quizType);
    callLLMAPI(messages, tabType);
  }
  
  // クイズ生成用メッセージ作成
  function createQuizGenerationMessages(input, level, questionCount, quizType) {
    const levelDescriptions = {
      'sleep': '寝てても分かるレベル（AIの基本概念を簡単に）',
      'beginner': '初級レベル（AI技術の基礎を丁寧に）',
      'intermediate': '中級レベル（AI活用の実践的内容）',
      'advanced': '上級者向けの難しいやつ（AI専門知識・最新技術）'
    };
    
    const typeDescriptions = {
      '2': 'はい・いいえの2択問題',
      '3': '3択問題',
      '4': '4択問題',
      '5': '5択問題'
    };
    
    // 生成回数に応じたバリエーション指示
    generationCount++;
    const variationInstructions = getVariationInstructions(generationCount, quizType);
    const focusAreas = getFocusAreas(generationCount);
    const questionStyles = getQuestionStyles(generationCount);
    
    // 過去の生成履歴から重複回避指示を作成
    const avoidanceInstructions = createAvoidanceInstructions();
    
    const systemPrompt = `あなたはクイズ作成の専門家です。与えられたテキストから${levelDescriptions[level]}レベルの${typeDescriptions[quizType]}を${questionCount}問作成してください。

${variationInstructions}

${focusAreas}

${questionStyles}

${avoidanceInstructions}

以下のJSON形式で回答してください：
{
  "questions": [
    {
      "question": "問題文",
      "options": ["選択肢1", "選択肢2"${quizType > 2 ? ', "選択肢3"' : ''}${quizType > 3 ? ', "選択肢4"' : ''}${quizType > 4 ? ', "選択肢5"' : ''}],
      "correct": 0,
      "hint": "間違えた時のヒント",
      "explanation": "正解時の解説"
    }
  ]
}

注意事項：
- 問題は${levelDescriptions[level]}に適した難易度にしてください
- correctは正解の選択肢のインデックス（0から始まる）
- ${quizType === '2' ? '2択問題では「はい」「いいえ」形式を基本としてください' : ''}
- ${quizType === '5' ? '5択問題では多様で紛らわしい選択肢を含めて難易度を高めてください' : ''}
- ヒントは間違えた時に理解を助ける内容にしてください
- 解説は正解の理由を分かりやすく説明してください
- 必ずJSON形式で回答し、他の説明は含めないでください
- 前回と異なる視点や角度から問題を作成してください`;
    
    return [
      { role: "system", content: systemPrompt },
      { role: "user", content: `以下のテキストからクイズを作成してください：\n\n${input}` }
    ];
  }
  
  // バリエーション指示を生成
  function getVariationInstructions(count, quizType) {
    const variations = [
      "基本的な理解を確認する問題を中心に作成してください。",
      "応用的な思考力を問う問題を含めてください。前回とは異なる角度から問題を作成し、より深い理解を促す内容にしてください。",
      "創造的で発展的な問題を作成してください。テキストの内容を実生活に応用したり、関連する事例を考えさせる問題を含めてください。",
      "総合的な理解力を測る問題を作成してください。複数の概念を組み合わせたり、批判的思考を促す問題を含めてください。",
      "多角的な視点から問題を作成してください。テキストの内容を異なる文脈で考えさせる問題や、比較・対比を求める問題を含めてください。"
    ];
    
    const index = Math.min(count - 1, variations.length - 1);
    return variations[index];
  }
  
  // 焦点領域を生成
  function getFocusAreas(count) {
    const focusOptions = [
      ["事実確認", "基本概念の理解"],
      ["因果関係", "プロセスの理解", "比較・対比"],
      ["応用・実践", "問題解決", "創造的思考"],
      ["分析・評価", "批判的思考", "統合的理解"],
      ["多面的分析", "関連性の発見", "発展的思考"]
    ];
    
    const index = Math.min(count - 1, focusOptions.length - 1);
    const selectedFocus = focusOptions[index];
    return `特に以下の観点を重視してください: ${selectedFocus.join('、')}`;
  }
  
  // 問題スタイルを生成
  function getQuestionStyles(count) {
    const styles = [
      "直接的で明確な問題文を使用してください。",
      "「なぜ」「どのように」を含む問題文を積極的に使用してください。",
      "具体例や事例を含む問題文を作成してください。",
      "仮定や条件を含む問題文を作成してください。",
      "複数の要素を組み合わせた複合的な問題文を作成してください。"
    ];
    
    const index = Math.min(count - 1, styles.length - 1);
    return styles[index];
  }
  
  // 重複回避指示を作成
  function createAvoidanceInstructions() {
    if (quizGenerationHistory.length === 0) {
      return "";
    }
    
    const recentQuestions = quizGenerationHistory.slice(-2).flat();
    if (recentQuestions.length === 0) {
      return "";
    }
    
    const questionKeywords = recentQuestions.map(q => {
      // 問題文から主要なキーワードを抽出
      const words = q.question.split(/[、。？！\s]+/).filter(word => word.length > 2);
      return words.slice(0, 3); // 最初の3つのキーワード
    }).flat();
    
    if (questionKeywords.length > 0) {
      return `重複回避: 前回の問題では「${questionKeywords.slice(0, 5).join('」「')}」などのキーワードが使用されました。今回は異なる視点や表現を使用してください。`;
    }
    
    return "";
  }
  
  // 生成情報を更新
  function updateGenerationInfo(tabType) {
    const generateBtn = tabType === 'text' ? generateContentTextBtn : generateContentOcrBtn;
    const originalText = '<i class="fas fa-brain"></i> 学習コンテンツ生成';
    
    if (generationCount === 0) {
      generateBtn.innerHTML = originalText;
    } else {
      const variationLevel = Math.min(generationCount, 5);
      const variationText = ['基本', '応用', '創造', '総合', '多角'][variationLevel - 1];
      generateBtn.innerHTML = `<i class="fas fa-brain"></i> 学習コンテンツ生成 (${generationCount + 1}回目・${variationText}モード)`;
    }
  }
  
  // LLM API呼び出し
  function callLLMAPI(messages, tabType) {
    const apiUrl = 'https://nurumayu-worker.skume-bioinfo.workers.dev/';
    
    // 生成回数に応じてtemperatureを調整（バリエーション向上）
    const baseTemperature = 0.7;
    const temperatureVariation = Math.min(generationCount * 0.1, 0.3);
    const adjustedTemperature = Math.min(baseTemperature + temperatureVariation, 1.0);
    
    const requestData = {
      model: "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
      temperature: adjustedTemperature,
      stream: false,
      max_completion_tokens: 2000,
      messages: messages
    };
    
    fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    })
    .then(response => response.json())
    .then(data => {
      loadingIndicator.classList.remove('active');
      const generateBtn = tabType === 'text' ? generateContentTextBtn : generateContentOcrBtn;
      generateBtn.disabled = false;
      
      // ボタンテキストを元に戻す
      generateBtn.innerHTML = '<i class="fas fa-brain"></i> 学習コンテンツ生成';
      
      console.log("LLMレスポンス:", data);
      
      if (data.choices && data.choices.length > 0 && data.choices[0].message) {
        const text = data.choices[0].message.content;
        processQuizResponse(text);
      } else if (data.answer) {
        processQuizResponse(data.answer);
      } else {
        throw new Error('レスポンスに期待されるフィールドがありません');
      }
    })
    .catch(error => {
      console.error('LLM API呼び出しエラー:', error);
      loadingIndicator.classList.remove('active');
      const generateBtn = tabType === 'text' ? generateContentTextBtn : generateContentOcrBtn;
      generateBtn.disabled = false;
      
      // ボタンテキストを元に戻す
      generateBtn.innerHTML = '<i class="fas fa-brain"></i> 学習コンテンツ生成';
      
      alert(`エラーが発生しました: ${error.message}`);
    });
  }
  
  // クイズレスポンス処理
  function processQuizResponse(text) {
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
      
      console.log("抽出されたJSON:", jsonText);
      
      const quizData = JSON.parse(jsonText);
      
      if (quizData.questions && Array.isArray(quizData.questions) && quizData.questions.length > 0) {
        currentQuiz = quizData;
        totalQuestions = quizData.questions.length;
        isQuizSubmitted = false;
        
        // 生成履歴に追加
        quizGenerationHistory.push(quizData.questions);
        // 履歴は最大5回分まで保持
        if (quizGenerationHistory.length > 5) {
          quizGenerationHistory.shift();
        }
        
        // クイズデータを表示エリアに設定
        document.getElementById('quizData').value = JSON.stringify(quizData, null, 2);
        outputContainer.style.display = 'block';
        
        // クイズ開始
        startQuiz();
      } else {
        throw new Error('有効なクイズデータが見つかりません');
      }
    } catch (error) {
      console.error('クイズデータ解析エラー:', error);
      console.log('元のテキスト:', text);
      alert('クイズの生成に失敗しました。もう一度お試しください。');
    }
  }
  
  // クイズ開始
  function startQuiz() {
    quizContainer.style.display = 'block';
    
    // 前回の結果表示をクリア
    const resultsContainer = document.getElementById('quizResults');
    if (resultsContainer) {
      resultsContainer.remove();
    }
    
    // 変数を初期化
    userAnswers = new Array(currentQuiz.questions.length).fill(null);
    hintUsed = new Array(currentQuiz.questions.length).fill(false);
    score = 0;
    isQuizSubmitted = false;
    
    showAllQuestions();
  }
  
  // 全問題を同時表示
  function showAllQuestions() {
    // プログレス更新
    quizProgress.textContent = `問題 1-${totalQuestions} / ${totalQuestions}`;
    quizScore.textContent = '未回答';
    
    // 全問題コンテナをクリア
    allQuestions.innerHTML = '';
    
    // 各問題を生成
    currentQuiz.questions.forEach((question, questionIndex) => {
      const questionCard = createQuestionCard(question, questionIndex);
      allQuestions.appendChild(questionCard);
    });
    
    // フィードバック非表示
    quizFeedback.style.display = 'none';
    
    // ボタン状態初期化
    updateSubmitButton();
    retryQuizBtn.style.display = 'none';
    newQuizBtn.style.display = 'none';
  }
  
  // 問題カードを作成
  function createQuestionCard(question, questionIndex) {
    const card = document.createElement('div');
    card.className = 'question-card';
    card.dataset.questionIndex = questionIndex;
    
    // 問題ヘッダー
    const header = document.createElement('div');
    header.className = 'question-header';
    
    const questionNumber = document.createElement('div');
    questionNumber.className = 'question-number';
    questionNumber.textContent = `問題 ${questionIndex + 1}`;
    
    const hintButton = document.createElement('button');
    hintButton.className = 'hint-button';
    hintButton.innerHTML = '<i class="fas fa-lightbulb"></i> ヒント';
    hintButton.addEventListener('click', () => showQuestionHint(questionIndex));
    
    header.appendChild(questionNumber);
    header.appendChild(hintButton);
    
    // 問題文
    const questionText = document.createElement('div');
    questionText.className = 'question-text';
    questionText.textContent = question.question;
    
    // 選択肢
    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'question-options';
    
    question.options.forEach((option, optionIndex) => {
      const optionElement = document.createElement('div');
      optionElement.className = 'option-item';
      optionElement.textContent = option;
      optionElement.dataset.questionIndex = questionIndex;
      optionElement.dataset.optionIndex = optionIndex;
      optionElement.addEventListener('click', () => selectAnswer(questionIndex, optionIndex, optionElement));
      optionsContainer.appendChild(optionElement);
    });
    
    // カード構成
    card.appendChild(header);
    card.appendChild(questionText);
    card.appendChild(optionsContainer);
    
    return card;
  }
  
  // 回答選択
  function selectAnswer(questionIndex, optionIndex, element) {
    if (isQuizSubmitted) return;
    
    // 同じ問題の他の選択肢の選択状態をクリア
    const questionCard = document.querySelector(`[data-question-index="${questionIndex}"]`);
    questionCard.querySelectorAll('.option-item').forEach(item => {
      item.classList.remove('selected');
    });
    
    // 選択状態を設定
    element.classList.add('selected');
    userAnswers[questionIndex] = optionIndex;
    
    // 問題カードに回答済みマークを追加
    questionCard.classList.add('answered');
    
    // 全問回答チェック
    updateSubmitButton();
  }
  
  // 提出ボタンの状態を更新
  function updateSubmitButton() {
    const allAnswered = userAnswers.every(answer => answer !== null);
    submitAllAnswersBtn.disabled = !allAnswered;
    submitAllAnswersBtn.style.display = 'block';
    
    if (allAnswered) {
      submitAllAnswersBtn.innerHTML = '<i class="fas fa-check-circle"></i> 回答する';
    } else {
      const answeredCount = userAnswers.filter(answer => answer !== null).length;
      submitAllAnswersBtn.innerHTML = `<i class="fas fa-check-circle"></i> 回答する（${answeredCount}/${totalQuestions}問選択済み）`;
    }
  }
  
  // ヒント表示
  function showQuestionHint(questionIndex) {
    if (isQuizSubmitted || hintUsed[questionIndex]) return;
    
    const question = currentQuiz.questions[questionIndex];
    const questionCard = document.querySelector(`[data-question-index="${questionIndex}"]`);
    
    // ヒント使用済みマーク
    hintUsed[questionIndex] = true;
    
    // ヒントボタンを無効化
    const hintButton = questionCard.querySelector('.hint-button');
    hintButton.disabled = true;
    hintButton.innerHTML = '<i class="fas fa-lightbulb"></i> ヒント済み（-0.5点）';
    hintButton.classList.add('used');
    
    // ヒント表示エリアを追加
    let hintDisplay = questionCard.querySelector('.hint-display');
    if (!hintDisplay) {
      hintDisplay = document.createElement('div');
      hintDisplay.className = 'hint-display';
      questionCard.appendChild(hintDisplay);
    }
    
    hintDisplay.innerHTML = `<i class="fas fa-lightbulb hint-icon"></i><strong>ヒント:</strong> ${question.hint}`;
  }
  
  // 一括採点
  submitAllAnswersBtn.addEventListener('click', submitAllAnswers);
  
  function submitAllAnswers() {
    if (isQuizSubmitted) return;
    
    isQuizSubmitted = true;
    score = 0;
    
    // 各問題を採点
    currentQuiz.questions.forEach((question, questionIndex) => {
      const userAnswer = userAnswers[questionIndex];
      const isCorrect = userAnswer === question.correct;
      const questionCard = document.querySelector(`[data-question-index="${questionIndex}"]`);
      
      // 得点計算（ヒント使用時は0.5点）
      if (isCorrect) {
        score += hintUsed[questionIndex] ? 0.5 : 1;
      }
      
      // 選択肢の色分け
      const options = questionCard.querySelectorAll('.option-item');
      options.forEach((option, optionIndex) => {
        if (optionIndex === question.correct) {
          option.classList.add('correct');
        } else if (optionIndex === userAnswer && !isCorrect) {
          option.classList.add('incorrect');
        }
      });
      
      // 問題カードのスタイル更新
      if (isCorrect) {
        questionCard.classList.add('correct');
      } else {
        questionCard.classList.add('incorrect');
      }
      
      // 解説またはフィードバック表示
      addQuestionFeedback(questionCard, question, isCorrect);
    });
    
    // 累積スコアに追加
    cumulativeScore += score;
    cumulativeTotalQuestions += totalQuestions;
    cumulativeQuizCount++;
    
    // スコア更新
    const percentage = Math.round((score / totalQuestions) * 100);
    const cumulativePercentage = Math.round((cumulativeScore / cumulativeTotalQuestions) * 100);
    
    if (cumulativeQuizCount > 1) {
      quizScore.textContent = `今回: ${score.toFixed(1)} / ${totalQuestions} (${percentage}%) | 合計: ${cumulativeScore.toFixed(1)} / ${cumulativeTotalQuestions} (${cumulativePercentage}%)`;
    } else {
      quizScore.textContent = `得点: ${score.toFixed(1)} / ${totalQuestions} (${percentage}%)`;
    }
    
    // 結果表示
    showQuizResults();
    
    // ボタン状態更新
    submitAllAnswersBtn.style.display = 'none';
    retryQuizBtn.style.display = 'block';
    newQuizBtn.style.display = 'block';
  }
  
  // 問題にフィードバックを追加
  function addQuestionFeedback(questionCard, question, isCorrect) {
    let feedbackDisplay = questionCard.querySelector('.explanation-display, .question-feedback');
    if (!feedbackDisplay) {
      feedbackDisplay = document.createElement('div');
      questionCard.appendChild(feedbackDisplay);
    }
    
    if (isCorrect) {
      feedbackDisplay.className = 'explanation-display';
      feedbackDisplay.innerHTML = `<i class="fas fa-check-circle explanation-icon"></i><strong>正解！</strong> ${question.explanation}`;
    } else {
      feedbackDisplay.className = 'question-feedback';
      feedbackDisplay.innerHTML = `<i class="fas fa-times-circle feedback-icon"></i><strong>不正解</strong><br>
                                   <strong>正解:</strong> ${question.options[question.correct]}<br>
                                   <strong>アドバイス:</strong> ${question.explanation}`;
    }
  }
  
  // 結果サマリー表示
  function showQuizResults() {
    const percentage = Math.round((score / totalQuestions) * 100);
    const correctCount = Math.floor(score);
    const partialCount = (score % 1 > 0) ? 1 : 0; // ヒント使用による0.5点
    const incorrectCount = totalQuestions - correctCount - partialCount;
    
    // 累積結果の計算
    const cumulativePercentage = Math.round((cumulativeScore / cumulativeTotalQuestions) * 100);
    const cumulativeCorrectCount = Math.floor(cumulativeScore);
    const cumulativePartialCount = (cumulativeScore % 1 > 0) ? Math.ceil(cumulativeScore - cumulativeCorrectCount) : 0;
    const cumulativeIncorrectCount = cumulativeTotalQuestions - cumulativeCorrectCount - cumulativePartialCount;
    
    // 結果コンテナを作成
    let resultsContainer = document.getElementById('quizResults');
    if (!resultsContainer) {
      resultsContainer = document.createElement('div');
      resultsContainer.id = 'quizResults';
      resultsContainer.className = 'quiz-results';
      quizContainer.insertBefore(resultsContainer, allQuestions);
    }
    
    // スコア評価（今回の結果で判定）
    let scoreClass, scoreMessage;
    if (percentage === 100) {
      scoreClass = 'score-excellent';
      scoreMessage = '完璧です！';
    } else if (percentage >= 80) {
      scoreClass = 'score-excellent';
      scoreMessage = '素晴らしい！';
    } else if (percentage >= 60) {
      scoreClass = 'score-good';
      scoreMessage = 'よく頑張りました！';
    } else if (percentage >= 40) {
      scoreClass = 'score-average';
      scoreMessage = 'もう少し頑張りましょう！';
    } else {
      scoreClass = 'score-poor';
      scoreMessage = '復習して再挑戦！';
    }
    
    // 結果表示のHTML生成
    let resultsHTML = `
      <div class="results-score ${scoreClass}">今回: ${score.toFixed(1)} / ${totalQuestions}</div>
      <div class="results-percentage ${scoreClass}">${percentage}% - ${scoreMessage}</div>
    `;
    
    // 累積結果表示（2回目以降のみ）
    if (cumulativeQuizCount > 1) {
      let cumulativeScoreClass;
      if (cumulativePercentage === 100) {
        cumulativeScoreClass = 'score-excellent';
      } else if (cumulativePercentage >= 80) {
        cumulativeScoreClass = 'score-excellent';
      } else if (cumulativePercentage >= 60) {
        cumulativeScoreClass = 'score-good';
      } else if (cumulativePercentage >= 40) {
        cumulativeScoreClass = 'score-average';
      } else {
        cumulativeScoreClass = 'score-poor';
      }
      
      resultsHTML += `
        <div style="margin-top: 1rem; padding-top: 1rem; border-top: 2px solid #e0e0e0;">
          <div class="results-score ${cumulativeScoreClass}">合計: ${cumulativeScore.toFixed(1)} / ${cumulativeTotalQuestions}</div>
          <div class="results-percentage ${cumulativeScoreClass}">合計正解率: ${cumulativePercentage}% (${cumulativeQuizCount}回実施)</div>
        </div>
      `;
    }
    
    resultsHTML += `
      <div class="results-breakdown">
        <div class="breakdown-item">
          <div class="breakdown-number score-excellent">${correctCount}</div>
          <div class="breakdown-label">正解</div>
        </div>
        ${partialCount > 0 ? `
          <div class="breakdown-item">
            <div class="breakdown-number score-average">${partialCount}</div>
            <div class="breakdown-label">部分正解</div>
          </div>
        ` : ''}
        <div class="breakdown-item">
          <div class="breakdown-number score-poor">${incorrectCount}</div>
          <div class="breakdown-label">不正解</div>
        </div>
      </div>
    `;
    
    // 累積の内訳表示（2回目以降のみ）
    if (cumulativeQuizCount > 1) {
      resultsHTML += `
        <div class="results-breakdown" style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid #f0f0f0;">
          <div class="breakdown-item">
            <div class="breakdown-number score-excellent">${cumulativeCorrectCount}</div>
            <div class="breakdown-label">合計正解</div>
          </div>
          ${cumulativePartialCount > 0 ? `
            <div class="breakdown-item">
              <div class="breakdown-number score-average">${cumulativePartialCount}</div>
              <div class="breakdown-label">合計部分正解</div>
            </div>
          ` : ''}
          <div class="breakdown-item">
            <div class="breakdown-number score-poor">${cumulativeIncorrectCount}</div>
            <div class="breakdown-label">合計不正解</div>
          </div>
        </div>
      `;
    }
    
    resultsContainer.innerHTML = resultsHTML;
    
    // 祝福演出を表示（今回の結果で判定）
    showCelebrationByScore(percentage);
  }
  
  // 正解率に応じた祝福演出
  function showCelebrationByScore(percentage) {
    let celebrationType, title, message, medalIcon;
    
    if (percentage === 100) {
      celebrationType = 'excellent';
      title = '🏆 パーフェクト！ 🏆';
      message = '全問正解おめでとうございます！';
      medalIcon = '🥇';
    } else if (percentage >= 80) {
      celebrationType = 'good';
      title = '🥈 素晴らしい！ 🥈';
      message = '高得点おめでとうございます！';
      medalIcon = '🥈';
    } else if (percentage >= 60) {
      celebrationType = 'average';
      title = '🥉 よく頑張りました！ 🥉';
      message = '合格ラインクリア！';
      medalIcon = '🥉';
    } else if (percentage >= 40) {
      celebrationType = 'encouraging';
      title = '💪 もう少し！ 💪';
      message = 'あと一歩で合格です！';
      medalIcon = '🎯';
    } else {
      celebrationType = 'motivating';
      title = '📚 復習して再挑戦！ 📚';
      message = '基礎からしっかり学習しましょう！';
      medalIcon = '🌟';
    }
    
    // 祝福オーバーレイの内容を更新
    const celebrationTitle = document.querySelector('.celebration-title');
    const celebrationMessage = document.querySelector('.celebration-message');
    const celebrationScoreElement = document.querySelector('.celebration-score');
    const celebrationButton = document.querySelector('.celebration-button');
    
    celebrationTitle.textContent = title;
    celebrationMessage.textContent = message;
    celebrationScoreElement.textContent = `得点: ${score.toFixed(1)} / ${totalQuestions}`;
    celebrationButton.innerHTML = `${medalIcon} 素晴らしい結果です！`;
    
    // オーバーレイのクラスを設定
    celebrationOverlay.className = `celebration-overlay ${celebrationType}`;
    
    // 紙吹雪の色を設定
    const confetti = document.querySelectorAll('.confetti');
    confetti.forEach((element, index) => {
      element.className = `confetti ${getConfettiColor(celebrationType, index)}`;
    });
    
    // 演出を表示
    setTimeout(() => {
      celebrationOverlay.classList.add('show');
    }, 500);
  }
  
  // 紙吹雪の色を取得
  function getConfettiColor(type, index) {
    const colors = {
      excellent: ['gold', 'gold', 'gold', 'gold', 'gold', 'gold', 'gold', 'gold', 'gold', 'gold'],
      good: ['silver', 'silver', 'silver', 'silver', 'silver', 'silver', 'silver', 'silver', 'silver', 'silver'],
      average: ['bronze', 'bronze', 'bronze', 'bronze', 'bronze', 'bronze', 'bronze', 'bronze', 'bronze', 'bronze'],
      encouraging: ['orange', 'orange', 'orange', 'orange', 'orange', 'orange', 'orange', 'orange', 'orange', 'orange'],
      motivating: ['purple', 'purple', 'purple', 'purple', 'purple', 'purple', 'purple', 'purple', 'purple', 'purple']
    };
    return colors[type][index % colors[type].length];
  }
  
  // 再テスト機能
  retryQuizBtn.addEventListener('click', () => {
    // 結果コンテナを削除
    const resultsContainer = document.getElementById('quizResults');
    if (resultsContainer) {
      resultsContainer.remove();
    }
    
    // 状態をリセット
    userAnswers = new Array(currentQuiz.questions.length).fill(null);
    hintUsed = new Array(currentQuiz.questions.length).fill(false);
    score = 0;
    isQuizSubmitted = false;
    
    // スコア表示をリセット
    quizScore.textContent = '未回答';
    
    // 問題を再表示
    showAllQuestions();
  });
  
  // 新しいクイズ機能
  newQuizBtn.addEventListener('click', () => {
    // 結果コンテナを削除
    const resultsContainer = document.getElementById('quizResults');
    if (resultsContainer) {
      resultsContainer.remove();
    }
    
    // クイズコンテナを非表示
    quizContainer.style.display = 'none';
    
    // 状態をリセット
    currentQuiz = null;
    userAnswers = [];
    hintUsed = [];
    score = 0;
    totalQuestions = 0;
    isQuizSubmitted = false;
    
    // スコア表示をリセット
  });
  
  // コピー機能
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(quizData.value).then(() => {
      copyBtn.classList.add('copy-success');
      setTimeout(() => {
        copyBtn.classList.remove('copy-success');
      }, 2000);
    }).catch(err => {
      console.error('コピーに失敗しました', err);
      alert('コピーできませんでした。');
    });
  });
  
  // リセット機能は resetContentBtn で実装済み
  
  // 累積スコアをリセット
  function resetCumulativeScore() {
    cumulativeScore = 0;
    cumulativeTotalQuestions = 0;
    cumulativeQuizCount = 0;
  }
  
  // 使い方表示トグル
  const toggleGuide = document.querySelector('.toggle-guide');
  const guideContent = document.querySelector('.guide-content');
  
  if (toggleGuide && guideContent) {
    toggleGuide.addEventListener('click', function() {
      guideContent.style.display = guideContent.style.display === 'none' ? 'block' : 'none';
      this.classList.toggle('active');
      
      const heading = this.querySelector('h3');
      if (heading) {
        if (guideContent.style.display === 'block') {
          heading.textContent = '使い方を隠す';
        } else {
          heading.textContent = '使い方を表示';
        }
          }
        });
      }
      
  // クイズデータ表示トグル
  const toggleQuizData = document.querySelector('.toggle-quiz-data');
  const quizDataContent = document.querySelector('.quiz-data-content');
  
  if (toggleQuizData && quizDataContent) {
    toggleQuizData.addEventListener('click', function() {
      quizDataContent.style.display = quizDataContent.style.display === 'none' ? 'block' : 'none';
      this.classList.toggle('active');
      
      const heading = this.querySelector('h3');
      if (heading) {
        if (quizDataContent.style.display === 'block') {
          heading.textContent = '生成されたクイズデータを隠す';
    } else {
          heading.textContent = '生成されたクイズデータを表示';
        }
      }
    });
  }
  
  // ページ離脱時に音声録音を停止
  window.addEventListener('beforeunload', () => {
    stopRecording();
  });
  
  // コンテンツトグルボタンの設定
  function setupContentToggleButtons() {
    // 全てのトグルボタンにイベントリスナーを追加
    document.querySelectorAll('.content-toggle-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        this.classList.toggle('active');
        
        // クイズボタンの状態をチェックしてグレイアウトを制御
        const tabType = this.id.includes('-text') ? 'text' : 'ocr';
        const quizButton = document.querySelector(`#content-quiz-${tabType}`);
        const quizSettings = document.querySelector(`#quiz-settings-${tabType}`);
        
        if (quizButton && quizSettings) {
          if (quizButton.classList.contains('active')) {
            quizSettings.classList.remove('disabled');
          } else {
            quizSettings.classList.add('disabled');
          }
        }
      });
    });
    
    // 初期状態の設定
    updateQuizSettingsState('text');
    updateQuizSettingsState('ocr');
  }
  
  // クイズ設定の状態を更新
  function updateQuizSettingsState(tabType) {
    const quizButton = document.querySelector(`#content-quiz-${tabType}`);
    const quizSettings = document.querySelector(`#quiz-settings-${tabType}`);
    
    if (quizButton && quizSettings) {
      if (quizButton.classList.contains('active')) {
        quizSettings.classList.remove('disabled');
      } else {
        quizSettings.classList.add('disabled');
      }
    }
  }
  
  // 選択されたコンテンツタイプを取得
  function getSelectedContentTypes(tabType) {
    const contentTypes = [];
    const buttons = document.querySelectorAll(`[id^="content-"][id$="-${tabType}"]`);
    
    buttons.forEach(btn => {
      if (btn.classList.contains('active')) {
        contentTypes.push(btn.dataset.content);
      }
    });
    
    return contentTypes;
  }

  // 初期化
  initSpeechRecognition();
  restoreAppState();
  
  // 状態復元機能
  function restoreAppState() {
    // アクティブタブの復元
    const savedTab = localStorage.getItem(STORAGE_KEYS.ACTIVE_TAB);
    if (savedTab) {
      const targetTab = document.getElementById(savedTab);
      if (targetTab) {
        switchTab(targetTab);
      }
    }
    
    // OCRテキストの復元
    const savedOcrText = localStorage.getItem(STORAGE_KEYS.OCR_TEXT);
    if (savedOcrText && ocrText) {
      ocrText.value = savedOcrText;
      ocrResult.style.display = 'block';
      correctOcrBtn.style.display = 'inline-block';
    }
    
    // 保存された画像名の復元（参考情報として）
    const savedImageName = localStorage.getItem(STORAGE_KEYS.OCR_IMAGE_NAME);
    if (savedImageName && savedOcrText) {
      // OCR結果があって画像名も保存されている場合の表示
      console.log('前回処理した画像:', savedImageName);
    }
  }
  
  // タブ状態の保存
  function saveTabState(tabId) {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_TAB, tabId);
  }
  
  // OCRテキストの保存
  function saveOcrText(text) {
    localStorage.setItem(STORAGE_KEYS.OCR_TEXT, text);
  }
  
  // 画像名の保存
  function saveImageName(name) {
    localStorage.setItem(STORAGE_KEYS.OCR_IMAGE_NAME, name);
  }
  
  // 祝福演出を閉じる
  celebrationCloseBtn.addEventListener('click', () => {
    celebrationOverlay.classList.remove('show');
  });
}); 