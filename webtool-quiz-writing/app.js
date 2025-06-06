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
  
  // サンプルテキストデータ（各レベル5つずつ：国語・数学・英語・理科・社会）
  const sampleTexts = {
    'elementary-low': [
      // 国語
      `ひらがなとカタカナは日本語の文字です。ひらがなは「あいうえお」から始まり、やわらかい音を表します。カタカナは「アイウエオ」から始まり、外国の言葉を書くときによく使います。漢字は中国から来た文字で、意味を表します。この3つの文字を使って、私たちは日本語を書いています。`,
      
      // 数学
      `数字は0、1、2、3、4、5、6、7、8、9の10個があります。これらを使っていろいろな数を作ることができます。10より大きい数は、10の位と1の位を使って表します。例えば、15は10が1つと1が5つという意味です。足し算は数を合わせること、引き算は数を減らすことです。`,
      
      // 英語
      `英語のアルファベットは26個あります。AからZまでの大文字と、aからzまでの小文字があります。「Hello」は「こんにちは」、「Thank you」は「ありがとう」という意味です。英語は世界中の人と話すときに使う言葉です。簡単な英語の言葉から覚えていきましょう。`,
      
      // 理科
      `太陽は東から昇って西に沈みます。朝になると太陽が見えて明るくなり、夜になると太陽が見えなくなって暗くなります。太陽の光で植物は育ち、私たちも元気になります。太陽はとても大切な存在です。`,
      
      // 社会
      `家族はお父さん、お母さん、子どもたちで作られています。みんなで協力して生活しています。近所には他の家族も住んでいて、みんなで町を作っています。お店で買い物をしたり、学校で勉強したりして、みんなで助け合って暮らしています。`
    ],
    
    'elementary-mid': [
      // 国語
      `物語には主人公がいて、いろいろな出来事が起こります。物語の始まり、中間、終わりがあり、主人公の気持ちが変わっていきます。登場人物の行動や言葉から、その人の気持ちを想像することが大切です。物語を読むときは、自分だったらどう思うかを考えながら読むと、より楽しく読むことができます。`,
      
      // 数学
      `かけ算は同じ数を何回も足すことです。3×4は3を4回足すことと同じで、3+3+3+3=12になります。九九を覚えると計算が早くなります。わり算はかけ算の反対で、全体を等しく分けることです。12÷3は12を3つに分けると4になるという意味です。`,
      
      // 英語
      `英語の文は主語と動詞で作られます。「I am a student.」は「私は学生です」という意味です。「I」が主語、「am」が動詞です。疑問文は「Are you happy?」のように作ります。英語では語順が日本語と違うので、慣れることが大切です。`,
      
      // 理科
      `植物は根、茎、葉の3つの部分からできています。根は土の中の水や栄養を吸い取ります。茎は水や栄養を葉に運びます。葉は太陽の光を使って栄養を作ります。この働きを光合成といいます。植物はこうして生きています。`,
      
      // 社会
      `日本には47の都道府県があります。私たちが住んでいる場所にも、市や町や村があります。それぞれの地域には特色があり、有名な食べ物や祭りがあります。地域の人々が協力して、安全で住みやすい町を作っています。地域の歴史や文化を大切にすることが重要です。`
    ],
    
    'elementary-high': [
      // 国語
      `敬語は相手を敬う気持ちを表す言葉遣いです。丁寧語は「です・ます」を使い、尊敬語は相手の行動を高めて表現し、謙譲語は自分の行動をへりくだって表現します。場面や相手に応じて適切な敬語を使うことで、良好な人間関係を築くことができます。日本語の美しい表現の一つです。`,
      
      // 数学
      `分数は全体を等しく分けた一部分を表します。1/2は全体を2つに分けた1つ分という意味です。分数の足し算では分母を同じにしてから分子を足します。小数は1より小さい数を表す方法で、0.5は1/2と同じ値です。分数と小数は日常生活でもよく使われます。`,
      
      // 英語
      `英語には現在形、過去形、未来形があります。「I play tennis.」は現在の習慣、「I played tennis yesterday.」は過去の出来事、「I will play tennis tomorrow.」は未来の予定を表します。時制を正しく使うことで、いつのことかを明確に伝えることができます。`,
      
      // 理科
      `地球は太陽の周りを1年かけて回っています。この動きを公転といいます。また、地球は自分自身も1日に1回転しています。この動きを自転といいます。自転があるから昼と夜ができ、公転があるから季節の変化が生まれます。`,
      
      // 社会
      `日本の国会は衆議院と参議院の二院制です。国会は国の法律を作る最高機関です。内閣は行政を担当し、裁判所は司法を担当します。この三権分立により、権力が一箇所に集中することを防いでいます。民主主義の基本的な仕組みです。`
    ],
    
    'junior': [
      // 国語
      `古典文学は日本の文化的遺産です。平安時代の「源氏物語」は世界最古の長編小説とされ、紫式部によって書かれました。鎌倉時代の「平家物語」は軍記物語の代表作で、「祇園精舎の鐘の声、諸行無常の響きあり」の冒頭で有名です。これらの作品は現代の私たちにも多くのことを教えてくれます。`,
      
      // 数学
      `一次関数はy=ax+bの形で表される関数です。aは傾きを表し、正の値なら右上がり、負の値なら右下がりの直線になります。bはy切片を表し、直線がy軸と交わる点のy座標です。一次関数は日常生活の様々な場面で見られ、変化の割合を表すのに役立ちます。`,
      
      // 英語
      `英語の関係代名詞は2つの文をつなぐ働きをします。「The book which I bought yesterday is interesting.」では、whichが関係代名詞として「私が昨日買った本」という修飾句を作っています。who、which、thatなどがあり、適切に使い分けることで、より複雑で正確な表現ができるようになります。`,
      
      // 理科
      `光合成は植物が太陽の光エネルギーを使って、二酸化炭素と水から糖を作り出す過程です。この過程で酸素が放出されます。光合成は葉緑体の中で行われ、クロロフィルという緑色の色素が重要な役割を果たしています。光合成により、植物は自分で栄養を作ることができます。`,
      
      // 社会
      `江戸時代は1603年から1868年まで続いた武家政治の時代です。徳川家康が江戸に幕府を開き、参勤交代制度や身分制度を確立しました。鎖国政策により外国との交流を制限しましたが、独自の文化が発達しました。この時代の政治制度や文化は現代の日本にも大きな影響を与えています。`
    ],
    
    'senior': [
      // 国語
      `夏目漱石の「こころ」は明治時代の知識人の内面を描いた代表的な心理小説です。「先生」と「私」、そして「K」の三角関係を通して、近代的自我の孤独や罪悪感、友情と恋愛の葛藤が描かれています。漱石は西洋文明と日本の伝統的価値観の間で揺れる明治の知識人の精神的苦悩を、繊細な心理描写で表現しました。`,
      
      // 数学
      `微分は関数の変化率を求める数学的手法です。f'(x)=lim[h→0]{f(x+h)-f(x)}/hで定義され、曲線上の各点における接線の傾きを表します。物理学では速度や加速度の計算に、経済学では限界費用や限界収益の分析に応用されます。微分積分学は自然科学や社会科学の基礎となる重要な数学分野です。`,
      
      // 英語
      `仮定法は現実とは異なる状況を表現する英語の文法です。「If I were you, I would study harder.」は現在の事実に反する仮定を表し、「If I had studied harder, I could have passed the exam.」は過去の事実に反する仮定を表します。仮定法を使うことで、願望、後悔、提案などの微妙なニュアンスを表現できます。`,
      
      // 理科
      `DNA（デオキシリボ核酸）は遺伝情報を保存する分子で、アデニン、グアニン、シトシン、チミンの4つの塩基から構成されています。これらの塩基の配列が遺伝子を形成し、タンパク質の設計図となります。DNAは細胞分裂時に複製され、親から子へと遺伝情報が受け継がれます。`,
      
      // 社会
      `グローバル化は経済、政治、文化の国境を越えた統合過程です。多国籍企業の活動拡大、国際貿易の増加、情報通信技術の発達により、世界各国の相互依存関係が深まっています。一方で、経済格差の拡大や文化の均質化、環境問題などの課題も生じており、持続可能な発展が求められています。`
    ]
  };
  
  // 各レベルのサンプルインデックスを管理
  let sampleIndices = {
    'elementary-low': 0,
    'elementary-mid': 0,
    'elementary-high': 0,
    'junior': 0,
    'senior': 0
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
      const subjects = ['国語', '数学', '英語', '理科', '社会'];
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
  
    // 学習レベル変更時の処理
  document.querySelectorAll('input[name="level"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const selectedLevel = radio.value;
      // 選択されたレベルのサンプルインデックスをリセット
      sampleIndices[selectedLevel] = 0;
      
      // 学習レベル変更時は入力エリアの内容を変更しない
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
    const subject = document.querySelector('input[name="subject"]:checked').value;
    
    // UI更新
    loadingIndicator.classList.add('active');
    generateQuizBtn.disabled = true;
    quizContainer.style.display = 'none';
    outputContainer.style.display = 'none';
    
    // 生成回数の表示更新
    updateGenerationInfo();
    
    // LLMにクイズ生成を依頼
    const messages = createQuizGenerationMessages(input, level, questionCount, subject);
    callLLMAPI(messages);
  }
  
  // クイズ生成用メッセージ作成
  function createQuizGenerationMessages(input, level, questionCount, subject) {
    const levelDescriptions = {
      'elementary-low': '小学生低学年（1-2年生）',
      'elementary-mid': '小学生中学年（3-4年生）',
      'elementary-high': '小学生高学年（5-6年生）',
      'junior': '中学生',
      'senior': '高校生'
    };
    
    const subjectDescriptions = {
      'japanese': '国語',
      'math': '算数・数学',
      'english': '英語',
      'science': '理科',
      'social': '社会'
    };
    
    // 生成回数に応じたバリエーション指示
    generationCount++;
    const variationInstructions = getVariationInstructions(generationCount, quizType);
    const focusAreas = getFocusAreas(generationCount);
    const questionStyles = getQuestionStyles(generationCount);
    
    // 過去の生成履歴から重複回避指示を作成
    const avoidanceInstructions = createAvoidanceInstructions();
    
    // 正解位置のバランス指示を生成
    const balanceInstructions = createBalanceInstructions(questionCount, quizType);
    
    const systemPrompt = `あなたは${subjectDescriptions[subject]}の専門教師です。与えられたテキストから${levelDescriptions[level]}レベルの記述式問題を${questionCount}問作成してください。

教科の特性を活かした問題作成：
${getSubjectSpecificInstructions(subject, level)}

以下のJSON形式で回答してください：
{
  "questions": [
    {
      "question": "記述式問題文",
      "subject": "${subject}",
      "level": "${level}",
      "expectedAnswer": "期待される回答の例",
      "scoringCriteria": {
        "excellent": "優秀な回答の基準",
        "good": "良い回答の基準",
        "average": "普通の回答の基準",
        "poor": "改善が必要な回答の基準"
      },
      "keyPoints": ["評価ポイント1", "評価ポイント2", "評価ポイント3"]
    }
  ]
}

注意事項：
- 問題は${levelDescriptions[level]}に適した難易度にしてください
- ${subjectDescriptions[subject]}の特性を活かした問題にしてください
- 記述式回答で理解度を測れる問題にしてください
- 必ずJSON形式で回答し、他の説明は含めないでください`;
    
    return [
      { role: "system", content: systemPrompt },
      { role: "user", content: `以下のテキストからクイズを作成してください：\n\n${input}` }
    ];
  }
  
  // 教科別指導方針を生成
  function getSubjectSpecificInstructions(subject, level) {
    const instructions = {
      'japanese': {
        'elementary-low': '文字の読み書き、基本的な語彙の理解、簡単な文章の内容把握を中心とした問題。',
        'elementary-mid': '文章の構成理解、登場人物の気持ち、語彙の使い分けなどを問う問題。',
        'elementary-high': '文章の要約、主題の把握、表現技法の理解などを問う問題。',
        'junior': '古典の基礎、文法、文学作品の解釈、表現力を問う問題。',
        'senior': '古典の深い理解、現代文の論理構造、小論文的な表現力を問う問題。'
      },
      'math': {
        'elementary-low': '数の概念、基本的な計算、図形の認識を問う問題。',
        'elementary-mid': '四則演算の活用、図形の性質、簡単な文章題を問う問題。',
        'elementary-high': '分数・小数の計算、面積・体積、比例・反比例を問う問題。',
        'junior': '文字式、方程式、関数、図形の証明を問う問題。',
        'senior': '二次関数、三角関数、微分・積分の概念を問う問題。'
      },
      'english': {
        'elementary-low': '基本的な英単語、簡単な挨拶、アルファベットの理解を問う問題。',
        'elementary-mid': '基本的な文法、日常会話、短い文章の理解を問う問題。',
        'elementary-high': '文法の応用、長い文章の理解、英作文を問う問題。',
        'junior': '文法の体系的理解、長文読解、英作文の表現力を問う問題。',
        'senior': '複雑な文法構造、論説文の理解、議論的な英作文を問う問題。'
      },
      'science': {
        'elementary-low': '身の回りの自然現象、生き物の特徴、物の性質を問う問題。',
        'elementary-mid': '植物・動物の仕組み、天気や季節、物質の変化を問う問題。',
        'elementary-high': '人体の仕組み、電気・磁石、天体の動きを問う問題。',
        'junior': '化学変化、生物の進化、物理法則の理解を問う問題。',
        'senior': '化学結合、遺伝の仕組み、力学・電磁気学を問う問題。'
      },
      'social': {
        'elementary-low': '家族・学校・地域社会、季節の行事、基本的なルールを問う問題。',
        'elementary-mid': '都道府県の特徴、歴史的人物、地図の読み方を問う問題。',
        'elementary-high': '日本の歴史、世界の国々、政治の仕組みを問う問題。',
        'junior': '歴史の流れ、地理的特徴、政治・経済の基本を問う問題。',
        'senior': '歴史の因果関係、地理的分析、現代社会の課題を問う問題。'
      }
    };
    
    return instructions[subject][level] || '教科の特性を活かした総合的な理解力を問う問題。';
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
  
  // 正解位置のバランス指示を作成
  function createBalanceInstructions(questionCount, quizType) {
    let instructions = "";
    
    if (quizType === '2') {
      instructions = `\n重要：2択問題では「はい」と「いいえ」の回答がバランスよく配分されるようにしてください。${questionCount}問中、可能な限り半々になるよう調整してください。`;
    } else if (quizType === '3') {
      instructions = `\n重要：3択問題では正解位置（1番目、2番目、3番目）が偏らないよう、できるだけ均等に配分してください。`;
    } else if (quizType === '4') {
      instructions = `\n重要：4択問題では正解位置（1番目、2番目、3番目、4番目）が偏らないよう、できるだけ均等に配分してください。`;
    }
    
    return instructions;
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
    
    // temperatureを0.5に固定（質問の多様性を保ちつつ安定性を確保）
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
  
  // 記述式問題カードを作成
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
    
    // 教科表示
    const subjectBadge = document.createElement('div');
    subjectBadge.className = 'subject-badge';
    const subjectNames = {
      'japanese': '国語',
      'math': '算数・数学',
      'english': '英語',
      'science': '理科',
      'social': '社会'
    };
    subjectBadge.textContent = subjectNames[question.subject] || question.subject;
    
    header.appendChild(questionNumber);
    header.appendChild(subjectBadge);
    
    // 問題文
    const questionText = document.createElement('div');
    questionText.className = 'question-text';
    questionText.textContent = question.question;
    
    // 回答入力エリア
    const answerLabel = document.createElement('label');
    answerLabel.className = 'answer-label';
    answerLabel.textContent = '回答を記述してください：';
    
    const answerTextarea = document.createElement('textarea');
    answerTextarea.className = 'answer-textarea';
    answerTextarea.id = `answer-${questionIndex}`;
    answerTextarea.placeholder = 'ここに回答を記述してください...';
    answerTextarea.addEventListener('input', () => {
      userAnswers[questionIndex] = answerTextarea.value;
      if (answerTextarea.value.trim()) {
        answerTextarea.classList.add('answered');
        card.classList.add('answered');
      } else {
        answerTextarea.classList.remove('answered');
        card.classList.remove('answered');
      }
      updateSubmitButton();
    });
    
    // カード構成
    card.appendChild(header);
    card.appendChild(questionText);
    card.appendChild(answerLabel);
    card.appendChild(answerTextarea);
    
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
    const allAnswered = userAnswers.every(answer => answer !== null && answer.trim() !== '');
    submitAllAnswersBtn.disabled = !allAnswered;
    submitAllAnswersBtn.style.display = 'block';
    
    if (allAnswered) {
      submitAllAnswersBtn.innerHTML = '<i class="fas fa-check-circle"></i> 回答を評価する';
    } else {
      const answeredCount = userAnswers.filter(answer => answer !== null && answer.trim() !== '').length;
      submitAllAnswersBtn.innerHTML = `<i class="fas fa-check-circle"></i> 回答を評価する（${answeredCount}/${totalQuestions}問記述済み）`;
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
  
  // 記述式回答評価
  submitAllAnswersBtn.addEventListener('click', evaluateAnswers);
  
  function evaluateAnswers() {
    if (isQuizSubmitted) return;
    
    isQuizSubmitted = true;
    
    // 評価プロセス開始
    loadingIndicator.classList.add('active');
    submitAllAnswersBtn.disabled = true;
    submitAllAnswersBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 評価中...';
    
    // LLMに評価を依頼
    evaluateWithLLM();
  }
  
  function evaluateWithLLM() {
    const evaluationPromises = currentQuiz.questions.map((question, index) => {
      const userAnswer = userAnswers[index];
      const evaluationMessages = createEvaluationMessages(question, userAnswer, index);
      
      return fetch('https://nurumayu-worker.skume-bioinfo.workers.dev/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
          temperature: 0.3,
          stream: false,
          max_completion_tokens: 1500,
          messages: evaluationMessages
        })
      })
      .then(response => response.json())
      .then(data => {
        if (data.choices && data.choices.length > 0 && data.choices[0].message) {
          return processEvaluationResponse(data.choices[0].message.content, index);
        } else if (data.answer) {
          return processEvaluationResponse(data.answer, index);
        } else {
          throw new Error('評価レスポンスに期待されるフィールドがありません');
        }
      });
    });
    
    Promise.all(evaluationPromises)
      .then(evaluations => {
        displayEvaluationResults(evaluations);
        calculateOverallScore(evaluations);
        loadingIndicator.classList.remove('active');
        submitAllAnswersBtn.style.display = 'none';
        retryQuizBtn.style.display = 'block';
        newQuizBtn.style.display = 'block';
      })
      .catch(error => {
        console.error('評価エラー:', error);
        loadingIndicator.classList.remove('active');
        submitAllAnswersBtn.disabled = false;
        submitAllAnswersBtn.innerHTML = '<i class="fas fa-check-circle"></i> 回答を評価する';
        alert('評価中にエラーが発生しました。もう一度お試しください。');
      });
  }
  
  // 評価用メッセージ作成
  function createEvaluationMessages(question, userAnswer, questionIndex) {
    const subjectNames = {
      'japanese': '国語',
      'math': '算数・数学', 
      'english': '英語',
      'science': '理科',
      'social': '社会'
    };
    
    const levelNames = {
      'elementary-low': '小学生低学年',
      'elementary-mid': '小学生中学年',
      'elementary-high': '小学生高学年',
      'junior': '中学生',
      'senior': '高校生'
    };
    
    const systemPrompt = `あなたは${subjectNames[question.subject]}の専門教師です。${levelNames[question.level]}の学生の記述式回答を評価してください。

評価観点：
${question.keyPoints.map(point => `- ${point}`).join('\n')}

期待される回答：
${question.expectedAnswer}

評価基準：
- 優秀（90-100点）: ${question.scoringCriteria.excellent}
- 良好（70-89点）: ${question.scoringCriteria.good}
- 普通（50-69点）: ${question.scoringCriteria.average}
- 要改善（0-49点）: ${question.scoringCriteria.poor}

以下のJSON形式で評価結果を回答してください：
{
  "score": 75,
  "level": "good",
  "strengths": ["良い点1", "良い点2"],
  "weaknesses": ["改善点1", "改善点2"], 
  "corrections": [
    {"incorrect": "間違った表現", "correct": "正しい表現", "explanation": "訂正理由"}
  ],
  "improvements": ["具体的な改善アドバイス1", "具体的な改善アドバイス2"],
  "encouragement": "励ましのメッセージ"
}

注意事項：
- scoreは0-100の数値で評価してください
- levelは"excellent", "good", "average", "poor"のいずれかです
- ${subjectNames[question.subject]}の特性を活かした専門的な評価をしてください
- 学生の学習意欲を高める建設的なフィードバックを心がけてください
- 必ずJSON形式で回答し、他の説明は含めないでください`;

    return [
      { role: "system", content: systemPrompt },
      { role: "user", content: `問題: ${question.question}\n\n学生の回答: ${userAnswer}` }
    ];
  }
  
  // 評価レスポンス処理
  function processEvaluationResponse(text, questionIndex) {
    try {
      let jsonText = text;
      
      // JSONの抽出
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      } else {
        const startIndex = text.indexOf('{');
        const lastIndex = text.lastIndexOf('}');
        if (startIndex !== -1 && lastIndex !== -1 && lastIndex > startIndex) {
          jsonText = text.substring(startIndex, lastIndex + 1);
        }
      }
      
      const evaluation = JSON.parse(jsonText);
      evaluation.questionIndex = questionIndex;
      return evaluation;
    } catch (error) {
      console.error('評価レスポンス解析エラー:', error);
      // フォールバック評価
      return {
        questionIndex: questionIndex,
        score: 50,
        level: "average",
        strengths: ["回答していただきありがとうございます"],
        weaknesses: ["評価システムにエラーが発生しました"],
        corrections: [],
        improvements: ["もう一度お試しください"],
        encouragement: "再度挑戦してみましょう！"
      };
    }
  }
  
  // 評価結果表示
  function displayEvaluationResults(evaluations) {
    const resultsContainer = document.getElementById('evaluationResults');
    resultsContainer.innerHTML = '';
    resultsContainer.style.display = 'block';
    
    evaluations.forEach((evaluation, index) => {
      const card = createEvaluationCard(evaluation, index);
      resultsContainer.appendChild(card);
    });
  }
  
  // 評価カード作成
  function createEvaluationCard(evaluation, questionIndex) {
    const card = document.createElement('div');
    card.className = `evaluation-card ${evaluation.level}`;
    
    // ヘッダー
    const header = document.createElement('div');
    header.className = 'evaluation-header';
    
    const questionNumber = document.createElement('div');
    questionNumber.className = 'evaluation-question-number';
    questionNumber.textContent = `問題 ${questionIndex + 1}`;
    
    const scoreContainer = document.createElement('div');
    scoreContainer.className = `evaluation-score ${evaluation.level}`;
    
    const scoreValue = document.createElement('span');
    scoreValue.className = 'evaluation-score-value';
    scoreValue.textContent = `${evaluation.score}点`;
    
    const levelBadge = document.createElement('span');
    levelBadge.className = 'evaluation-level-badge';
    const levelTexts = {
      'excellent': '優秀',
      'good': '良好', 
      'average': '普通',
      'poor': '要改善'
    };
    levelBadge.textContent = levelTexts[evaluation.level];
    
    scoreContainer.appendChild(scoreValue);
    scoreContainer.appendChild(levelBadge);
    
    header.appendChild(questionNumber);
    header.appendChild(scoreContainer);
    
    // コンテンツ
    const content = document.createElement('div');
    content.className = 'evaluation-content';
    
    // 良い点
    if (evaluation.strengths && evaluation.strengths.length > 0) {
      const strengthsSection = createEvaluationSection(
        '👍 良い点',
        evaluation.strengths.map(s => `• ${s}`).join('\n')
      );
      content.appendChild(strengthsSection);
    }
    
    // 改善点
    if (evaluation.weaknesses && evaluation.weaknesses.length > 0) {
      const weaknessesSection = createEvaluationSection(
        '📝 改善点',
        evaluation.weaknesses.map(w => `• ${w}`).join('\n')
      );
      content.appendChild(weaknessesSection);
    }
    
    // 訂正
    if (evaluation.corrections && evaluation.corrections.length > 0) {
      const correctionsDiv = document.createElement('div');
      correctionsDiv.className = 'corrections-highlight';
      
      const title = document.createElement('div');
      title.className = 'evaluation-section-title';
      title.innerHTML = '<i class="fas fa-edit"></i> 訂正';
      correctionsDiv.appendChild(title);
      
      evaluation.corrections.forEach(correction => {
        const item = document.createElement('div');
        item.className = 'correction-item';
        item.innerHTML = `
          <span class="correction-before">${correction.incorrect}</span>
          <span class="correction-after">→ ${correction.correct}</span>
          <div style="margin-top: 0.3rem; font-size: 0.9rem; color: #666;">${correction.explanation}</div>
        `;
        correctionsDiv.appendChild(item);
      });
      
      content.appendChild(correctionsDiv);
    }
    
    // 改善アドバイス
    if (evaluation.improvements && evaluation.improvements.length > 0) {
      const improvementsDiv = document.createElement('div');
      improvementsDiv.className = 'improvement-suggestions';
      
      const title = document.createElement('div');
      title.className = 'evaluation-section-title';
      title.innerHTML = '<i class="fas fa-lightbulb"></i> 改善アドバイス';
      improvementsDiv.appendChild(title);
      
      evaluation.improvements.forEach(improvement => {
        const item = document.createElement('div');
        item.className = 'improvement-item';
        item.innerHTML = `
          <i class="fas fa-arrow-right improvement-icon"></i>
          <span>${improvement}</span>
        `;
        improvementsDiv.appendChild(item);
      });
      
      content.appendChild(improvementsDiv);
    }
    
    // 励まし
    if (evaluation.encouragement) {
      const encouragementSection = createEvaluationSection(
        '💪 メッセージ',
        evaluation.encouragement
      );
      content.appendChild(encouragementSection);
    }
    
    card.appendChild(header);
    card.appendChild(content);
    
    return card;
  }
  
  // 評価セクション作成
  function createEvaluationSection(title, content) {
    const section = document.createElement('div');
    section.className = 'evaluation-section';
    
    const titleElement = document.createElement('div');
    titleElement.className = 'evaluation-section-title';
    titleElement.textContent = title;
    
    const contentElement = document.createElement('div');
    contentElement.className = 'evaluation-section-content';
    contentElement.textContent = content;
    
    section.appendChild(titleElement);
    section.appendChild(contentElement);
    
    return section;
  }
  
  // 総合スコア計算
  function calculateOverallScore(evaluations) {
    const totalScore = evaluations.reduce((sum, eval) => sum + eval.score, 0);
    const averageScore = totalScore / evaluations.length;
    const percentage = Math.round(averageScore);
    
    // 累積スコアに追加
    cumulativeScore += averageScore;
    cumulativeTotalQuestions += 100; // 100点満点で計算
    cumulativeQuizCount++;
    
    // スコア表示更新
    const cumulativePercentage = Math.round((cumulativeScore / cumulativeTotalQuestions) * 100);
    
    if (cumulativeQuizCount > 1) {
      quizScore.textContent = `今回: ${averageScore.toFixed(1)}点 (${percentage}%) | 合計平均: ${(cumulativeScore / cumulativeQuizCount).toFixed(1)}点`;
    } else {
      quizScore.textContent = `平均得点: ${averageScore.toFixed(1)}点 (${percentage}%)`;
    }
    
    // 祝福演出
    showCelebrationByScore(percentage);
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