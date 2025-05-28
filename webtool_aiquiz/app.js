/**
 * クイズ自動作成ツール JavaScript
 * LLMを活用した学習支援ツール
 */
document.addEventListener('DOMContentLoaded', () => {
  // 要素の参照を取得
  const inputArea = document.getElementById('inputArea');
  const sampleBtn = document.getElementById('sampleBtn');
  const recordBtn = document.getElementById('recordBtn');
  const generateQuizBtn = document.getElementById('generateQuizBtn');
  const resetBtn = document.getElementById('resetBtn');
  const copyBtn = document.getElementById('copyBtn');
  const loadingIndicator = document.getElementById('loadingIndicator');
  
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
  
  // サンプルテキストデータ（各レベル12個：AI基礎・機械学習・生成AI・活用事例・技術動向・AI歴史・データサイエンス・AIエンジニアリング・AI研究・実装・開発・AIビジネス・未来展望）
  const sampleTexts = {
    'sleep': [
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
      `AIの歴史は意外と古くて、1950年代から始まりました。最初は「コンピューターが人間みたいに考えられるかな？」という夢から始まったんです。昔のSF映画に出てくるロボットみたいなものを作りたかったんですね。でも当時のコンピューターはとても大きくて、部屋いっぱいの大きさでした。今のスマホの方がずっと賢いんですよ。長い時間をかけて、少しずつ今のAIになったんです。`,
      
      // データサイエンス
      `データサイエンスは「数字から答えを見つける探偵」のような仕事です。お店で何が一番売れているか、どの時間帯にお客さんが多いかなど、たくさんの数字を調べて答えを見つけます。グラフを作って「あ、雨の日はアイスクリームが売れないんだ」みたいなことが分かります。AIもこのデータを使って賢くなるので、データサイエンスはAIのご飯のようなものですね。`,
      
      // AIエンジニアリング
      `AIエンジニアは「AIを作る職人さん」です。AIが正しく動くように、プログラムを書いたり、設定を調整したりします。料理に例えると、レシピ（プログラム）を考えて、材料（データ）を準備して、美味しい料理（AI）を作る感じです。AIが間違えないように、何度もテストして、みんなが安心して使えるようにしてくれます。とても大切なお仕事ですね。`,
      
      // AI研究
      `AI研究者は「AIの新しい可能性を探す冒険家」です。今のAIよりもっと賢いAIを作ったり、今まで出来なかった新しいことができるAIを考えたりします。「AIが音楽を作れたらいいな」「AIが病気を見つけられたらいいな」という夢を実現しようと頑張っています。大学や研究所で、毎日新しい発見をしようと実験を繰り返しています。`,
      
      // 実装・開発
      `AIを実際に使えるようにするのが実装・開発です。研究でできた素晴らしいAIも、普通の人が使えなければ意味がありません。スマホのアプリにしたり、ウェブサイトで使えるようにしたり、会社のシステムに組み込んだりします。「この素晴らしいAIを、みんなが簡単に使えるようにしよう」という橋渡しの役割をしています。プログラミングの技術がとても大切です。`,
      
      // AIビジネス
      `AIビジネスは「AIでお金を稼ぐ方法を考える」ことです。どんなに素晴らしいAIでも、お金にならなければ続けることができません。「このAIを使って、どんな便利なサービスを作ろうか」「お客さんはいくらなら払ってくれるかな」と考えます。AIを使った新しい会社もたくさん生まれています。AIで世の中をもっと便利にして、同時にお金も稼ぐ方法を考える大切な分野です。`,
      
      // 未来展望
      `AIの未来はとてもワクワクします。もしかしたら、AIが先生になって勉強を教えてくれたり、AIがお医者さんのお手伝いをして病気を治してくれたりするかもしれません。家事をぜんぶAIロボットがやってくれて、人間はもっと楽しいことに時間を使えるようになるかも。でも、AIが人間の仕事を奪わないように、みんなで考えて使っていくことが大切ですね。`
    ],
    
    'beginner': [
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
      `AI研究は1956年のダートマス会議で正式に始まりました。1960年代にはエキスパートシステムが開発され、1980年代には第2次AIブームが到来しました。1990年代後半からインターネットの普及により大量データが利用可能になり、2000年代に機械学習が実用化されました。2010年代の深層学習革命により画像認識が飛躍的に向上し、2020年代には大規模言語モデルが登場して現在の生成AIブームに至っています。`,
      
      // データサイエンス
      `データサイエンスは統計学、機械学習、ドメイン知識を組み合わせてデータから価値を抽出する学問です。データの収集、クリーニング、探索的データ分析（EDA）、仮説検証、モデル構築の流れで進めます。PythonのPandas、NumPy、Matplotlib、SeabornやRのggplot2、dplyrなどのライブラリが使用されます。A/Bテストや統計的仮説検定により、データドリブンな意思決定を支援します。`,
      
      // AIエンジニアリング
      `AIエンジニアリングでは、機械学習モデルの本番環境への展開と運用が重要です。Docker、Kubernetes、CI/CDパイプラインを使用して、モデルのデプロイメントを自動化します。モデルのバージョン管理、性能モニタリング、ロードバランシング、スケーリングを考慮する必要があります。エッジコンピューティング環境では、モデルの軽量化やレイテンシ最適化が求められます。`,
      
      // AI研究
      `AI研究では理論的基盤と実験的検証の両方が重要です。論文の執筆、査読、学会発表を通じて知識を共有します。実験の再現性を確保するため、コードとデータセットの公開が推奨されています。GitHub、arXiv、Papers with Code、Weights & Biasesなどのプラットフォームを活用して研究を進めます。倫理的配慮や社会的影響の評価も研究の重要な要素です。`,
      
      // 実装・開発
      `AI アプリケーションの開発では、マイクロサービスアーキテクチャ、API Gateway、サービスメッシュを活用します。GraphQLによる効率的なデータフェッチ、WebSocketsによるリアルタイム通信、Service Worker による オフライン対応を実装します。セキュリティでは、OAuth 2.0、JWT、API レート制限、入力検証を実装し、GDPR や CCPA などの規制に準拠します。パフォーマンス最適化では、CDN、キャッシュ、データベースインデックス、N+1クエリ対策を行います。`,
      
      // AIビジネス
      `AIビジネスモデルには、SaaS（Software as a Service）、API-as-a-Service、AIコンサルティング、データプラットフォームなどがあります。ROI（投資対効果）の測定、市場分析、競合調査が重要です。プロダクトマーケットフィットを見つけるため、MVP（Minimum Viable Product）を開発し、ユーザーフィードバックを収集します。規制対応、知的財産権、データプライバシーの管理も必要です。`,
      
      // 未来展望
      `AI技術の発展により、Human-AI Collaboration、Explainable AI、AI Safety、Federated Learning、Edge AI が重要テーマとなります。脳型コンピューティング（Neuromorphic Computing）や量子機械学習により、従来の限界を超えた計算能力が実現される可能性があります。AI の民主化により、ノーコード／ローコード AI ツールが普及し、非技術者でも AI を活用できるようになります。持続可能なAI（Green AI）の重要性が高まり、エネルギー効率的なモデル設計が求められます。`
    ],
    
    'intermediate': [
      // AI基礎
      `深層学習アーキテクチャは目的に応じて選択する必要があります。CNN（畳み込みニューラルネットワーク）は画像処理に、RNN/LSTMは時系列データに、Transformerは自然言語処理に適用されます。注意機構（Attention Mechanism）により、入力の重要な部分に焦点を当てることができます。転移学習では事前学習済みモデルを活用し、少ないデータでも高性能なモデルを構築できます。ハイパーパラメータチューニングにはグリッドサーチやベイズ最適化を使用します。`,
      
      // 機械学習
      `アンサンブル学習では複数のモデルを組み合わせて予測精度を向上させます。バギング、ブースティング、スタッキングが主要な手法です。特徴量エンジニアリングでは、ドメイン知識を活用してモデルの性能向上に寄与する特徴量を作成します。データの前処理では正規化、標準化、欠損値処理、外れ値除去が重要です。モデルの解釈性向上にはSHAP値やLIMEなどの技術を使用します。`,
      
      // 生成AI
      `Large Language Model（LLM）の性能は、パラメータ数、訓練データの質と量、計算資源に依存します。In-Context LearningやFew-Shot Learning により、追加学習なしで新しいタスクに適応できます。Instruction Tuningにより、人間の指示により適切に従うモデルを作成できます。RLHF（Reinforcement Learning from Human Feedback）により、人間の価値観に沿った出力を生成するよう調整されます。プロンプトインジェクション対策やコンテンツフィルタリングなどのセキュリティ対策が重要です。`,
      
      // 活用事例
      `AIシステムの実装では、データパイプライン設計、モデルのバージョン管理、A/Bテストによる性能評価が必要です。マイクロサービスアーキテクチャにより、AIモデルをスケーラブルにデプロイできます。リアルタイム推論とバッチ処理のトレードオフを考慮し、レイテンシとスループットを最適化します。モデルのドリフト検出により、性能劣化を早期発見し、再学習のタイミングを決定します。`,
      
      // 技術動向
      `生成AIの企業導入では、ROI測定、セキュリティポリシー、ガバナンス体制の確立が課題となります。AI倫理ガイドラインに従い、バイアス軽減、プライバシー保護、透明性確保を実装します。Large Action Model（LAM）により、AIが実際の行動を実行できるようになりつつあります。マルチモーダル基盤モデルの発展により、テキスト、画像、音声を統合した AI システムが実現されています。`,
      
      // AI歴史
      `AI研究の歴史は複数のブームと冬の時代を経験しています。第1次AIブーム（1950-1960年代）では論理的推論に焦点が当てられ、第2次AIブーム（1980年代）ではエキスパートシステムが実用化されました。1990年代のAI冬の時代を経て、2000年代にビッグデータと計算能力の向上により機械学習が復活しました。2012年のAlexNetによる画像認識革命、2017年のTransformer論文、2022年のChatGPT登場が現在のAI黄金時代を築いています。`,
      
      // データサイエンス
      `高度なデータサイエンス手法には、時系列解析、因果推論、ベイズ統計、実験計画法があります。ARIMA、Prophet、LSTMを使用した時系列予測により、需要予測や異常検知を行います。因果推論では、観察データから因果関係を特定し、介入効果を推定します。ベイズ統計により、不確実性を定量化し、事前知識を活用した推論が可能です。特徴量ストアやデータ版管理により、データサイエンスワークフローを効率化できます。`,
      
      // AIエンジニアリング  
      `本番環境でのAIシステム運用では、モデルの継続的統合・継続的デプロイメント（CI/CD）、監視、スケーリングが重要です。Kubernetes上でのマイクロサービス化により、独立したモデル更新とロールバックが可能になります。カナリアデプロイメントにより、新モデルのリスクを最小化します。GPUクラスタの効率的な利用、バッチ推論の最適化、キャッシュ戦略により、コストとパフォーマンスを最適化します。`,
      
      // AI研究
      `最先端のAI研究では、Few-Shot Learning、Zero-Shot Learning、Meta-Learning、Transfer Learning、Domain Adaptation などの学習効率化手法が注目されています。Adversarial Training や Robust Optimization により、モデルの堅牢性を向上させます。Neural Architecture Search（NAS）により、タスクに最適なネットワーク構造を自動発見できます。理論的解析では、汎化誤差境界、最適化理論、情報理論的観点からモデルの性質を理解します。`,
      
      // 実装・開発
      `エンタープライズAIアプリケーションでは、Event-Driven Architecture、CQRS（Command Query Responsibility Segregation）、Event Sourcing、Saga Pattern により複雑なビジネスロジックを実装します。Domain-Driven Design（DDD）により、ビジネスドメインを反映したアーキテクチャを設計します。Observability では、OpenTelemetry、Prometheus、Grafana、Jaeger により、分散システムの監視とトレーシングを行います。Chaos Engineering により、システムの耐障害性を向上させます。`,
      
      // AIビジネス
      `AI スタートアップのバリュエーションでは、Technology Risk、Market Risk、Execution Risk、Regulatory Risk を評価します。Intellectual Property Portfolio、Data Moats、Network Effects、Switching Costs により競争優位性を構築します。Platform Economics では、Two-Sided Markets、Platform Dynamics、Winner-Take-All Effects を理解します。AI の社会実装では、Stakeholder Management、Regulatory Compliance、Ethical AI Framework、Social Impact Assessment が重要です。`,
      
      // 未来展望
      `AGI 実現への技術的課題として、Common Sense Reasoning、Few-Shot Generalization、Compositional Understanding、Causal Reasoning があります。Brain-Computer Interface や Neural Prosthetics により、人間の認知能力を拡張する技術が開発されています。Quantum-Classical Hybrid Computing により、量子優位性を活用した新しい計算パラダイムが創出される可能性があります。AI Safety Critical Systems では、Formal Verification、Runtime Monitoring、Fail-Safe Design により、高い信頼性を実現します。Sustainable AI では、Carbon-Efficient Training、Green Computing、Responsible Resource Usage が重要なテーマとなります。`
    ],
    
    'advanced': [
      // AI基礎
      `Transformer アーキテクチャの Self-Attention メカニズムは O(n²) の計算複雑度を持つため、長いシーケンスでは効率的な近似手法が必要です。Sparse Attention、Linear Attention、Flash Attention などの最適化技術により、メモリ使用量と計算時間を削減できます。Constitutional AI や Constitutional Learning により、AI システムの行動を原則に基づいて制御する研究が進んでいます。Mixture of Experts（MoE）アーキテクチャにより、パラメータ効率的な大規模モデルを実現できます。`,
      
      // 機械学習
      `Neural Architecture Search（NAS）により、タスクに最適なニューラルネットワーク構造を自動発見できます。Differentiable Neural Computer（DNC）や Neural Turing Machine（NTM）により、外部メモリを持つニューラルネットワークを実現できます。Meta-Learning（学習の学習）により、少数のサンプルから新しいタスクに迅速に適応するモデルを構築できます。Continual Learning により、破滅的忘却を回避しながら新しい知識を継続的に学習できます。`,
      
      // 生成AI
      `Chain-of-Thought プロンプティングや Tree-of-Thoughts により、複雑な推論タスクでの性能を向上させることができます。Parameter-Efficient Fine-Tuning（PEFT）手法である LoRA、AdaLoRA、QLoRA により、少ないパラメータ更新で効率的なファインチューニングが可能です。Retrieval-Augmented Generation（RAG）の高度化として、Dense Passage Retrieval や FiD（Fusion-in-Decoder）が研究されています。Constitutional AI や RLHF の改良版である DPO（Direct Preference Optimization）により、より効率的な人間の嗜好学習が可能になります。`,
      
      // 活用事例
      `MLOps の成熟度レベルに応じて、CI/CD パイプライン、特徴量ストア、モデル監視、自動再学習システムを構築します。カナリア デプロイメント、ブルーグリーン デプロイメント、A/B テストフレームワークにより、本番環境でのリスクを最小化します。Federated Learning により、プライバシーを保護しながら分散データで学習できます。Differential Privacy により、個人情報を保護しながらモデル学習を行えます。`,
      
      // 技術動向
      `AGI（Artificial General Intelligence）への道筋として、World Model、Emergent Abilities、Scaling Laws の研究が進んでいます。Neuromorphic Computing や Quantum Machine Learning により、従来のコンピューティングパラダイムを超えた AI システムが研究されています。AI Safety の分野では、Alignment Problem、Mesa-Optimization、Instrumental Convergence などの課題が議論されています。Multi-Agent Reinforcement Learning により、複数の AI エージェントが協調・競争する複雑なシステムを実現できます。`,
      
      // AI歴史
      `AI研究の理論的基盤は、チューリングの計算可能性理論（1936）、マカロックとピッツのニューロンモデル（1943）、ウィーナーのサイバネティクス（1948）に遡ります。1956年のダートマス会議でジョン・マッカーシーが「人工知能」という用語を提唱し、学問分野として確立されました。パーセプトロンの限界（1969年のミンスキー・パパート）、エキスパートシステムの興隆と衰退、コネクショニズムの復活、統計的学習理論の発展、深層学習革命、そして現在のFoundation Modelsに至る歴史的変遷は、計算理論、認知科学、統計学の融合過程として理解できます。`,
      
      // データサイエンス
      `高度な統計的機械学習手法には、Variational Inference、Markov Chain Monte Carlo（MCMC）、Gaussian Processes、Normalizing Flows があります。因果推論では、Directed Acyclic Graph（DAG）、Instrumental Variables、Regression Discontinuity Design、Difference-in-Differences を用いて観察データから因果効果を推定します。Online Learning や Bandit Algorithm により、逐次的に到着するデータに対してリアルタイムで学習・予測を行います。Topological Data Analysis により、高次元データの構造を理解できます。`,
      
      // AIエンジニアリング  
      `大規模 AI システムでは、分散学習、Model Parallelism、Data Parallelism、Pipeline Parallelism により計算を並列化します。Gradient Compression、All-Reduce、Parameter Server アーキテクチャにより、分散環境での効率的な学習を実現します。Model Compression では、Pruning、Quantization、Knowledge Distillation、Neural Architecture Search により、モデルサイズとレイテンシを最適化します。ONNX、TensorRT、OpenVINO により、異なるハードウェア環境での推論を最適化できます。`,
      
      // AI研究
      `理論的 AI 研究では、PAC Learning Theory、VC Dimension、Rademacher Complexity、Information-Theoretic Lower Bounds により学習の基礎理論を分析します。Optimization Theory では、Non-Convex Optimization、Stochastic Gradient Descent の収束性、Adam や RMSprop の理論的性質を研究します。Representation Learning では、Disentangled Representation、Self-Supervised Learning、Contrastive Learning により、データの本質的構造を学習します。Algorithmic Information Theory や Kolmogorov Complexity により、学習の本質を理解します。`,
      
      // 実装・開発
      `エンタープライズ級 AI システムでは、Event-Driven Architecture、CQRS（Command Query Responsibility Segregation）、Event Sourcing、Saga Pattern により複雑なビジネスロジックを実装します。Domain-Driven Design（DDD）により、ビジネスドメインを反映したアーキテクチャを設計します。Observability では、OpenTelemetry、Prometheus、Grafana、Jaeger により、分散システムの監視とトレーシングを行います。Chaos Engineering により、システムの耐障害性を向上させます。`,
      
      // AIビジネス
      `AI スタートアップのバリュエーションでは、Technology Risk、Market Risk、Execution Risk、Regulatory Risk を評価します。Intellectual Property Portfolio、Data Moats、Network Effects、Switching Costs により競争優位性を構築します。Platform Economics では、Two-Sided Markets、Platform Dynamics、Winner-Take-All Effects を理解します。AI の社会実装では、Stakeholder Management、Regulatory Compliance、Ethical AI Framework、Social Impact Assessment が重要です。`,
      
      // 未来展望
      `AGI 実現への技術的課題として、Common Sense Reasoning、Few-Shot Generalization、Compositional Understanding、Causal Reasoning があります。Brain-Computer Interface や Neural Prosthetics により、人間の認知能力を拡張する技術が開発されています。Quantum-Classical Hybrid Computing により、量子優位性を活用した新しい計算パラダイムが創出される可能性があります。AI Safety Critical Systems では、Formal Verification、Runtime Monitoring、Fail-Safe Design により、高い信頼性を実現します。Sustainable AI では、Carbon-Efficient Training、Green Computing、Responsible Resource Usage が重要なテーマとなります。`
    ]
  };
  
  // 各レベルのサンプルインデックスを管理
  let sampleIndices = {
    'sleep': 0,
    'beginner': 0,
    'intermediate': 0,
    'advanced': 0
  };
  
  // サンプルボタンのイベントリスナー
  sampleBtn.addEventListener('click', () => {
    const selectedLevel = document.querySelector('input[name="level"]:checked').value;
    const levelSamples = sampleTexts[selectedLevel];
    
    if (levelSamples && levelSamples.length > 0) {
      // 現在のインデックスを取得
      const currentIndex = sampleIndices[selectedLevel];
      const sampleText = levelSamples[currentIndex];
      
      // 教科名を定義
      const subjects = ['AI基礎', '機械学習', '生成AI', '活用事例', '技術動向', 'AI歴史', 'データサイエンス', 'AIエンジニアリング', 'AI研究', '実装・開発', 'AIビジネス', '未来展望'];
      const currentSubject = subjects[currentIndex];
      
      // 次のインデックスを計算（循環）
      sampleIndices[selectedLevel] = (currentIndex + 1) % levelSamples.length;
      
      // テキストを入力エリアに設定
      inputArea.value = sampleText;
      localStorage.setItem('quizInputText', inputArea.value);
      
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
  let savedInputText = localStorage.getItem('quizInputText');
  if (savedInputText) {
    inputArea.value = savedInputText;
  }

  // テキスト変更時に保存
  inputArea.addEventListener('input', () => {
    localStorage.setItem('quizInputText', inputArea.value);
  });
  
    // 理解度レベル変更時の処理
  document.querySelectorAll('input[name="level"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const selectedLevel = radio.value;
      // 選択されたレベルのサンプルインデックスをリセット
      sampleIndices[selectedLevel] = 0;
      
      // 理解度レベル変更時は入力エリアの内容を変更しない
      // ユーザーが入力した内容を保持する
    });
  });
  

  
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
  
  // クイズ生成
  generateQuizBtn.addEventListener('click', generateQuiz);
  
  function generateQuiz() {
    const input = inputArea.value.trim();
    if (!input) {
      alert('テキストを入力してください');
      return;
    }
    
    // テキスト変更チェック
    if (input !== previousInputText) {
      // テキストが変更された場合、累積をリセット
      resetCumulativeScore();
      previousInputText = input;
    }
    
    // 設定値を取得
    const level = document.querySelector('input[name="level"]:checked').value;
    const questionCount = document.querySelector('input[name="questionCount"]:checked').value;
    const quizType = document.querySelector('input[name="quizType"]:checked').value;
    
    // UI更新
    loadingIndicator.classList.add('active');
    generateQuizBtn.disabled = true;
    quizContainer.style.display = 'none';
    outputContainer.style.display = 'none';
    
    // 生成回数の表示更新
    updateGenerationInfo();
    
    // LLMにクイズ生成を依頼
    const messages = createQuizGenerationMessages(input, level, questionCount, quizType);
    callLLMAPI(messages);
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
    
    // バランス調整指示を作成
    const balanceInstructions = createBalanceInstructions(questionCount, quizType);
    
    const systemPrompt = `あなたはクイズ作成の専門家です。与えられたテキストから${levelDescriptions[level]}レベルの${typeDescriptions[quizType]}を${questionCount}問作成してください。

${variationInstructions}

${focusAreas}

${questionStyles}

${avoidanceInstructions}

${balanceInstructions}

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
${quizType === '2' ? `- 2択問題では以下の形式で問題文を作成してください：
  * 「〜は正しいですか？」
  * 「〜と言えますか？」
  * 「〜でしょうか？」
  * 「〜は事実ですか？」
  * 「〜は可能ですか？」
  など、「はい」または「いいえ」で明確に答えられる形式にしてください
- 2択問題の選択肢は必ず["はい", "いいえ"]にしてください` : ''}
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
  
  // バランス調整指示を作成
  function createBalanceInstructions(questionCount, quizType) {
    if (quizType === '2') {
      return `回答バランス: ${questionCount}問の2択問題では、「はい」が正解の問題と「いいえ」が正解の問題を可能な限り均等に分散させてください。例えば3問なら「はい」2問、「いいえ」1問、または「はい」1問、「いいえ」2問になるようにしてください。5問なら「はい」3問、「いいえ」2問、または「はい」2問、「いいえ」3問になるようにしてください。`;
    } else {
      const choiceLabels = {
        '3': '1番目・2番目・3番目',
        '4': '1番目・2番目・3番目・4番目', 
        '5': '1番目・2番目・3番目・4番目・5番目'
      };
      
      return `回答バランス: ${questionCount}問の${quizType}択問題では、正解の選択肢位置（${choiceLabels[quizType]}）を可能な限り均等に分散させてください。特定の位置（例：常に1番目）に正解が集中しないよう注意してください。`;
    }
  }
  
  // 生成情報を更新
  function updateGenerationInfo() {
    const generateBtn = document.getElementById('generateQuizBtn');
    const originalText = '<i class="fas fa-brain"></i> クイズ生成';
    
    if (generationCount === 0) {
      generateBtn.innerHTML = originalText;
    } else {
      const variationLevel = Math.min(generationCount, 5);
      const variationText = ['基本', '応用', '創造', '総合', '多角'][variationLevel - 1];
      generateBtn.innerHTML = `<i class="fas fa-brain"></i> クイズ生成 (${generationCount + 1}回目・${variationText}モード)`;
    }
  }
  
  // LLM API呼び出し
  function callLLMAPI(messages) {
    const apiUrl = 'https://nurumayu-worker.skume-bioinfo.workers.dev/';
    
    // 固定温度設定（バリエーションと安定性のバランス）
    const temperature = 0.5;
    
    const requestData = {
      model: "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
      temperature: temperature,
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
      generateQuizBtn.disabled = false;
      
      // ボタンテキストを元に戻す
      generateQuizBtn.innerHTML = '<i class="fas fa-brain"></i> クイズ生成';
      
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
      generateQuizBtn.disabled = false;
      
      // ボタンテキストを元に戻す
      generateQuizBtn.innerHTML = '<i class="fas fa-brain"></i> クイズ生成';
      
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
  
  // リセット機能
  resetBtn.addEventListener('click', () => {
    inputArea.value = '';
    localStorage.removeItem('quizInputText');
    quizContainer.style.display = 'none';
    outputContainer.style.display = 'none';
    stopRecording();
    
    // クイズ状態をリセット
    currentQuiz = null;
    userAnswers = [];
    hintUsed = [];
    score = 0;
    totalQuestions = 0;
    isQuizSubmitted = false;
    
    // 累積スコアもリセット
    resetCumulativeScore();
    previousInputText = '';
    
    // 生成履歴もリセット
    quizGenerationHistory = [];
    generationCount = 0;
    
    // 結果コンテナも削除
    const resultsContainer = document.getElementById('quizResults');
    if (resultsContainer) {
      resultsContainer.remove();
    }
  });
  
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
  
  // 初期化
  initSpeechRecognition();
  
  // 祝福演出を閉じる
  celebrationCloseBtn.addEventListener('click', () => {
    celebrationOverlay.classList.remove('show');
  });
}); 