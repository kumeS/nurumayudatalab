/**
 * AI音声会話ツール JavaScript
 * 音声認識とAI会話システム
 */
document.addEventListener('DOMContentLoaded', () => {
  // DOM要素の取得
  const recordBtn = document.getElementById('recordBtn');
  const stopSpeakBtn = document.getElementById('stopSpeakBtn');
  const textInput = document.getElementById('textInput');
  const sendTextBtn = document.getElementById('sendTextBtn');
  const clearBtn = document.getElementById('clearBtn');
  const conversationArea = document.getElementById('conversationArea');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const loadingIndicator = document.getElementById('loadingIndicator');
  const startTime = document.getElementById('startTime');

  // 状態管理
  let isRecording = false;
  let isProcessing = false;
  let isSpeaking = false;
  let recognition = null;
  let currentSpeech = null;
  let conversationHistory = [];

  // 設定管理
  let settings = {
    speechRate: 1.0,
    speechPitch: 1.0,
    speechVolume: 0.8,
    autoSave: true,
    maxHistoryLength: 50
  };

  // 初期化
  init();

  function init() {
    // 開始時刻を設定
    startTime.textContent = formatTime(new Date());
    
    // 設定とデータの読み込み
    loadSettings();
    loadConversationHistory();
    
    // 音声認識の初期化
    initSpeechRecognition();
    
    // イベントリスナーの設定
    setupEventListeners();
    
    // 初期状態の設定
    updateStatus('ready', '待機中');
    
    // システム情報の表示（履歴がない場合のみ）
    if (conversationHistory.length === 0) {
      addMessage('system', 'AI音声会話ツールが起動しました。以下の機能をご利用いただけます：\n• 音声認識による会話（日本語対応）\n• テキスト入力による会話\n• 音声読み上げ機能\n• 会話履歴の自動保存\n• 音声設定のカスタマイズ\n\n「音声で話す」ボタンを押して話しかけるか、下のテキスト欄に入力してください。', false);
    }
  }

  // 設定の読み込み
  function loadSettings() {
    try {
      const savedSettings = localStorage.getItem('voiceChatSettings');
      if (savedSettings) {
        settings = { ...settings, ...JSON.parse(savedSettings) };
        console.log('設定を読み込みました:', settings);
      }
    } catch (error) {
      console.warn('設定の読み込みに失敗しました:', error);
    }
  }

  // 設定の保存
  function saveSettings() {
    try {
      localStorage.setItem('voiceChatSettings', JSON.stringify(settings));
      console.log('設定を保存しました');
    } catch (error) {
      console.warn('設定の保存に失敗しました:', error);
    }
  }

  // 会話履歴の読み込み
  function loadConversationHistory() {
    if (!settings.autoSave) return;
    
    try {
      const savedHistory = localStorage.getItem('voiceChatHistory');
      if (savedHistory) {
        const historyData = JSON.parse(savedHistory);
        conversationHistory = historyData.messages || [];
        
        // 履歴をUIに復元
        if (conversationHistory.length > 0) {
          conversationHistory.forEach(msg => {
            addMessage(msg.role === 'user' ? 'user' : 'ai', msg.content, false);
          });
          
          addMessage('system', `前回の会話（${conversationHistory.length}件）を復元しました`, false);
        }
        
        console.log(`会話履歴を復元しました: ${conversationHistory.length}件`);
      }
    } catch (error) {
      console.warn('会話履歴の読み込みに失敗しました:', error);
    }
  }

  // 会話履歴の保存
  function saveConversationHistory() {
    if (!settings.autoSave) return;
    
    try {
      const historyData = {
        timestamp: new Date().toISOString(),
        messages: conversationHistory.slice(-settings.maxHistoryLength)
      };
      
      localStorage.setItem('voiceChatHistory', JSON.stringify(historyData));
      console.log('会話履歴を保存しました');
    } catch (error) {
      console.warn('会話履歴の保存に失敗しました:', error);
    }
  }

  // 音声認識の初期化
  function initSpeechRecognition() {
    if ('webkitSpeechRecognition' in window) {
      recognition = new webkitSpeechRecognition();
    } else if ('SpeechRecognition' in window) {
      recognition = new SpeechRecognition();
    } else {
      showError('このブラウザは音声認識に対応していません。');
      recordBtn.disabled = true;
      return;
    }

    // 音声認識の設定を最適化
    recognition.continuous = false;
    recognition.interimResults = true; // 中間結果を表示
    recognition.lang = 'ja-JP';
    recognition.maxAlternatives = 3; // 複数の候補を取得

    // 音声認識イベント
    recognition.onstart = () => {
      console.log('音声認識開始');
      isRecording = true;
      updateStatus('listening', '音声を聞いています... (話し始めてください)');
      recordBtn.classList.add('recording');
      recordBtn.innerHTML = '<i class="fas fa-stop"></i> 録音停止';
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }
      
      // 中間結果をステータスに表示
      if (interimTranscript) {
        updateStatus('listening', `認識中: "${interimTranscript}"`);
      }
      
      // 最終結果の処理
      if (finalTranscript.trim()) {
        console.log('認識結果:', finalTranscript);
        updateStatus('processing', '音声を処理しています...');
        addMessage('user', finalTranscript);
        sendToAI(finalTranscript);
      }
    };

    recognition.onerror = (event) => {
      console.error('音声認識エラー:', event.error);
      isRecording = false;
      updateStatus('ready', '待機中');
      recordBtn.classList.remove('recording');
      recordBtn.innerHTML = '<i class="fas fa-microphone"></i> 音声で話す';
      
      let errorMessage = '音声認識エラーが発生しました。';
      
      switch (event.error) {
        case 'no-speech':
          errorMessage = '音声が検出されませんでした。もう一度はっきりと話してください。';
          break;
        case 'audio-capture':
          errorMessage = 'マイクへのアクセスが拒否されました。ブラウザの設定を確認してください。';
          break;
        case 'not-allowed':
          errorMessage = 'マイクの使用が許可されていません。ブラウザの設定でマイクを許可してください。';
          break;
        case 'network':
          errorMessage = 'ネットワークエラーが発生しました。インターネット接続を確認してください。';
          break;
        case 'service-not-allowed':
          errorMessage = '音声認識サービスが利用できません。';
          break;
        case 'bad-grammar':
          errorMessage = '音声認識の設定にエラーがあります。';
          break;
        case 'language-not-supported':
          errorMessage = '日本語音声認識がサポートされていません。';
          break;
        default:
          errorMessage = `音声認識エラー: ${event.error}`;
      }
      
      showError(errorMessage);
    };

    recognition.onend = () => {
      console.log('音声認識終了');
      isRecording = false;
      recordBtn.classList.remove('recording');
      recordBtn.innerHTML = '<i class="fas fa-microphone"></i> 音声で話す';
      
      if (!isProcessing) {
        updateStatus('ready', '待機中 - マイクボタンを押して話しかけてください');
      }
    };
  }

  // イベントリスナーの設定
  function setupEventListeners() {
    // 録音ボタン
    recordBtn.addEventListener('click', toggleRecording);
    
    // 音声停止ボタン
    stopSpeakBtn.addEventListener('click', stopSpeaking);
    
    // テキスト送信ボタン
    sendTextBtn.addEventListener('click', sendTextMessage);
    
    // テキスト入力でEnterキー
    textInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendTextMessage();
      }
    });
    
    // クリアボタン
    clearBtn.addEventListener('click', clearConversation);
    
    // 設定パネル関連
    setupSettingsListeners();
    
    // ページ離脱時の音声停止
    window.addEventListener('beforeunload', () => {
      if (currentSpeech) {
        speechSynthesis.cancel();
      }
      if (recognition && isRecording) {
        recognition.stop();
      }
    });
  }

  // 設定パネルのイベントリスナー
  function setupSettingsListeners() {
    const settingsToggle = document.getElementById('settingsToggle');
    const settingsPanel = document.getElementById('settingsPanel');
    const speechRateSlider = document.getElementById('speechRate');
    const speechPitchSlider = document.getElementById('speechPitch');
    const speechVolumeSlider = document.getElementById('speechVolume');
    const autoSaveCheckbox = document.getElementById('autoSave');
    const maxHistorySlider = document.getElementById('maxHistory');
    const testSpeechBtn = document.getElementById('testSpeech');
    const exportHistoryBtn = document.getElementById('exportHistory');
    const resetSettingsBtn = document.getElementById('resetSettings');
    
    // 設定パネルの表示/非表示
    settingsToggle.addEventListener('click', () => {
      settingsPanel.style.display = settingsPanel.style.display === 'none' ? 'block' : 'none';
      updateSettingsUI();
    });
    
    // 音声速度設定
    speechRateSlider.addEventListener('input', (e) => {
      settings.speechRate = parseFloat(e.target.value);
      document.getElementById('rateValue').textContent = settings.speechRate.toFixed(1);
      saveSettings();
    });
    
    // 音声ピッチ設定
    speechPitchSlider.addEventListener('input', (e) => {
      settings.speechPitch = parseFloat(e.target.value);
      document.getElementById('pitchValue').textContent = settings.speechPitch.toFixed(1);
      saveSettings();
    });
    
    // 音声音量設定
    speechVolumeSlider.addEventListener('input', (e) => {
      settings.speechVolume = parseFloat(e.target.value);
      document.getElementById('volumeValue').textContent = settings.speechVolume.toFixed(1);
      saveSettings();
    });
    
    // 自動保存設定
    autoSaveCheckbox.addEventListener('change', (e) => {
      settings.autoSave = e.target.checked;
      saveSettings();
    });
    
    // 最大履歴数設定
    maxHistorySlider.addEventListener('input', (e) => {
      settings.maxHistoryLength = parseInt(e.target.value);
      document.getElementById('historyValue').textContent = settings.maxHistoryLength;
      saveSettings();
    });
    
    // 音声テスト
    testSpeechBtn.addEventListener('click', () => {
      const testText = `音声テストです。速度 ${settings.speechRate}、ピッチ ${settings.speechPitch}、音量 ${settings.speechVolume} で再生しています。`;
      speakText(testText);
    });
    
    // 履歴エクスポート
    exportHistoryBtn.addEventListener('click', exportConversationHistory);
    
    // 設定リセット
    resetSettingsBtn.addEventListener('click', resetSettings);
  }

  // 設定UIの更新
  function updateSettingsUI() {
    document.getElementById('speechRate').value = settings.speechRate;
    document.getElementById('speechPitch').value = settings.speechPitch;
    document.getElementById('speechVolume').value = settings.speechVolume;
    document.getElementById('autoSave').checked = settings.autoSave;
    document.getElementById('maxHistory').value = settings.maxHistoryLength;
    
    document.getElementById('rateValue').textContent = settings.speechRate.toFixed(1);
    document.getElementById('pitchValue').textContent = settings.speechPitch.toFixed(1);
    document.getElementById('volumeValue').textContent = settings.speechVolume.toFixed(1);
    document.getElementById('historyValue').textContent = settings.maxHistoryLength;
  }

  // 会話履歴のエクスポート
  function exportConversationHistory() {
    if (conversationHistory.length === 0) {
      showError('エクスポートする会話履歴がありません。');
      return;
    }
    
    const exportData = {
      timestamp: new Date().toISOString(),
      conversationCount: conversationHistory.length,
      messages: conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: new Date().toISOString()
      }))
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voice-chat-history-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    addMessage('system', '会話履歴をエクスポートしました。', false);
  }

  // 設定のリセット
  function resetSettings() {
    if (confirm('設定をすべてリセットしますか？この操作は取り消せません。')) {
      // デフォルト設定に戻す
      settings = {
        speechRate: 1.0,
        speechPitch: 1.0,
        speechVolume: 0.8,
        autoSave: true,
        maxHistoryLength: 50
      };
      
      saveSettings();
      updateSettingsUI();
      addMessage('system', '設定をリセットしました。', false);
    }
  }

  // 録音の開始/停止
  function toggleRecording() {
    if (isRecording) {
      recognition.stop();
    } else if (recognition && !isProcessing) {
      try {
        recognition.start();
      } catch (error) {
        console.error('音声認識開始エラー:', error);
        showError('音声認識を開始できませんでした。');
      }
    }
  }

  // テキストメッセージの送信
  function sendTextMessage() {
    const text = textInput.value.trim();
    if (!text || isProcessing) return;

    addMessage('user', text);
    textInput.value = '';
    sendToAI(text);
  }

  // AIへのメッセージ送信（履歴管理を最適化）
  function sendToAI(userMessage) {
    isProcessing = true;
    updateStatus('processing', 'AI処理中...');
    loadingIndicator.classList.add('active');

    // 会話履歴に追加
    conversationHistory.push({ role: 'user', content: userMessage });
    
    // 履歴が長すぎる場合は古いものを削除
    if (conversationHistory.length > settings.maxHistoryLength) {
      const deleteCount = conversationHistory.length - settings.maxHistoryLength;
      conversationHistory.splice(0, deleteCount);
      console.log(`古い履歴 ${deleteCount}件を削除しました`);
    }

    // APIリクエストの準備（最新10件の履歴のみ使用）
    const recentHistory = conversationHistory.slice(-10);
    const messages = [
      {
        role: 'system',
        content: 'あなたは親しみやすいAIアシスタントです。ユーザーと自然な会話を行います。簡潔で分かりやすく、親しみやすい口調で答えてください。長すぎず、適度な長さで返答してください。'
      },
      ...recentHistory
    ];

    // LLM API呼び出し
    callLLMAPI(messages);
  }

  // LLM APIの呼び出し
  function callLLMAPI(messages) {
    const apiUrl = 'https://nurumayu-worker.skume-bioinfo.workers.dev/';
    const requestData = {
      model: "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
      temperature: 0.8,
      stream: false,
      max_completion_tokens: 500,
      messages: messages
    };

    // タイムアウト付きfetch
    const timeoutMs = 30000; // 30秒
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData),
      signal: controller.signal
    })
    .then(response => {
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    })
    .then(data => {
      console.log('LLMレスポンス:', data);
      
      let aiResponse = '';
      if (data.choices && data.choices.length > 0 && data.choices[0].message) {
        aiResponse = data.choices[0].message.content;
      } else if (data.answer) {
        aiResponse = data.answer;
      } else if (data.content) {
        aiResponse = data.content;
      } else if (data.response) {
        aiResponse = data.response;
      } else {
        throw new Error('APIレスポンスの形式が予期されていません');
      }

      if (aiResponse && aiResponse.trim()) {
        // 会話履歴に追加
        conversationHistory.push({ role: 'assistant', content: aiResponse });
        
        // メッセージを表示
        addMessage('ai', aiResponse);
        
        // 音声で読み上げ
        speakText(aiResponse);
      } else {
        throw new Error('AIからの応答が空です');
      }
    })
    .catch(error => {
      clearTimeout(timeoutId);
      console.error('LLM API呼び出しエラー:', error);
      
      let errorMessage = 'すみません、エラーが発生しました。';
      let userMessage = '';
      
      if (error.name === 'AbortError') {
        errorMessage = 'リクエストがタイムアウトしました。ネットワークを確認してください。';
        userMessage = 'API_TIMEOUT';
      } else if (error.message.includes('HTTP 429')) {
        errorMessage = 'API利用制限に達しました。少し時間をおいてからお試しください。';
        userMessage = 'API_RATE_LIMIT';
      } else if (error.message.includes('HTTP 5')) {
        errorMessage = 'サーバーエラーが発生しました。少し時間をおいてからお試しください。';
        userMessage = 'SERVER_ERROR';
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage = 'ネットワークに接続できません。インターネット接続を確認してください。';
        userMessage = 'NETWORK_ERROR';
      } else {
        userMessage = error.message;
      }
      
      addMessage('ai', errorMessage);
      showError(`AI処理エラー: ${userMessage}`);
      
      // エラー時の自動リトライ（ネットワークエラーの場合のみ）
      if (error.message.includes('Failed to fetch') && !error.isRetry) {
        setTimeout(() => {
          console.log('API呼び出しを自動リトライします...');
          error.isRetry = true;
          callLLMAPI(messages);
        }, 3000);
      }
    })
    .finally(() => {
      clearTimeout(timeoutId);
      isProcessing = false;
      loadingIndicator.classList.remove('active');
      if (!isSpeaking) {
        updateStatus('ready', '待機中');
      }
    });
  }

  // メッセージを会話エリアに追加
  function addMessage(type, text, autoSave = true) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    
    const contentDiv = document.createElement('div');
    contentDiv.textContent = text;
    
    const timeDiv = document.createElement('div');
    timeDiv.className = 'message-time';
    timeDiv.textContent = formatTime(new Date());
    
    // メッセージアクション（音声再生ボタン）
    if (type === 'ai') {
      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'message-actions';
      
      const speakButton = document.createElement('button');
      speakButton.className = 'action-btn';
      speakButton.innerHTML = '<i class="fas fa-volume-up"></i>';
      speakButton.title = '読み上げ';
      speakButton.addEventListener('click', () => speakText(text));
      
      actionsDiv.appendChild(speakButton);
      messageDiv.appendChild(actionsDiv);
    }
    
    messageDiv.appendChild(contentDiv);
    messageDiv.appendChild(timeDiv);
    
    conversationArea.appendChild(messageDiv);
    
    // スクロールを最下部に
    conversationArea.scrollTop = conversationArea.scrollHeight;
    
    // 自動保存（システムメッセージ以外）
    if (autoSave && type !== 'system') {
      // 少し遅延させて保存
      setTimeout(() => {
        saveConversationHistory();
      }, 500);
    }
  }

  // テキストの音声読み上げ
  function speakText(text) {
    // Web Speech API対応チェック
    if (!('speechSynthesis' in window)) {
      showError('このブラウザは音声読み上げに対応していません。');
      return;
    }

    // 現在の読み上げを停止
    if (currentSpeech) {
      speechSynthesis.cancel();
      currentSpeech = null;
      updateSpeakingUI(false);
    }

    // 新しい読み上げを開始
    currentSpeech = new SpeechSynthesisUtterance(text);
    
    // 音声設定の最適化
    currentSpeech.lang = 'ja-JP';
    currentSpeech.rate = settings.speechRate;
    currentSpeech.pitch = settings.speechPitch;
    currentSpeech.volume = settings.speechVolume;

    // 日本語音声を優先的に選択
    const voices = speechSynthesis.getVoices();
    const japaneseVoice = voices.find(voice => 
      voice.lang.includes('ja') || voice.name.includes('Japanese')
    );
    if (japaneseVoice) {
      currentSpeech.voice = japaneseVoice;
      console.log('日本語音声を選択:', japaneseVoice.name);
    }

    currentSpeech.onstart = () => {
      isSpeaking = true;
      updateStatus('speaking', `音声再生中... (${Math.ceil(text.length / 10)}秒予想)`);
      updateSpeakingUI(true);
    };

    currentSpeech.onend = () => {
      isSpeaking = false;
      currentSpeech = null;
      updateSpeakingUI(false);
      if (!isProcessing) {
        updateStatus('ready', '待機中 - 次の質問をどうぞ');
      }
    };

    currentSpeech.onerror = (event) => {
      console.error('音声読み上げエラー:', event.error);
      isSpeaking = false;
      currentSpeech = null;
      updateSpeakingUI(false);
      
      let errorMsg = '音声読み上げエラーが発生しました。';
      if (event.error === 'network') {
        errorMsg = 'ネットワークエラーにより音声読み上げができませんでした。';
      } else if (event.error === 'synthesis-unavailable') {
        errorMsg = '音声合成機能が利用できません。';
      }
      
      showError(errorMsg);
      if (!isProcessing) {
        updateStatus('ready', '待機中');
      }
    };

    // 音声キューが空になるまで待機してから再生
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
    }
    
    setTimeout(() => {
      speechSynthesis.speak(currentSpeech);
    }, 100);
  }

  // 音声停止
  function stopSpeaking() {
    if (currentSpeech) {
      speechSynthesis.cancel();
      currentSpeech = null;
      isSpeaking = false;
      updateSpeakingUI(false);
      if (!isProcessing) {
        updateStatus('ready', '待機中');
      }
    }
  }

  // 読み上げ中のUI更新
  function updateSpeakingUI(speaking) {
    if (speaking) {
      stopSpeakBtn.classList.remove('disabled');
      stopSpeakBtn.classList.add('speaking');
    } else {
      stopSpeakBtn.classList.add('disabled');
      stopSpeakBtn.classList.remove('speaking');
    }
  }

  // ステータス更新
  function updateStatus(status, text) {
    statusText.textContent = text;
    
    // ステータスドットの更新
    statusDot.className = 'status-dot';
    if (status === 'listening') {
      statusDot.classList.add('listening');
    } else if (status === 'processing') {
      statusDot.classList.add('processing');
    } else if (status === 'speaking') {
      statusDot.classList.add('speaking');
    }
  }

  // 会話履歴のクリア
  function clearConversation() {
    if (confirm('会話履歴をクリアしますか？')) {
      // システムメッセージ以外を削除
      const systemMessage = conversationArea.querySelector('.message.system');
      conversationArea.innerHTML = '';
      if (systemMessage) {
        conversationArea.appendChild(systemMessage);
      }
      
      // 履歴をクリア
      conversationHistory = [];
      
      // ローカルストレージからも削除
      localStorage.removeItem('voiceChatHistory');
      
      // 音声停止
      stopSpeaking();
      
      // ステータスリセット
      updateStatus('ready', '待機中');
      
      addMessage('system', '会話履歴をクリアしました。', false);
    }
  }

  // エラーメッセージの表示
  function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    // 既存のエラーメッセージを削除
    const existingError = document.querySelector('.error-message');
    if (existingError) {
      existingError.remove();
    }
    
    // 会話エリアの前に挿入
    conversationArea.parentNode.insertBefore(errorDiv, conversationArea);
    
    // 5秒後に自動削除
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.remove();
      }
    }, 5000);
  }

  // 時刻フォーマット
  function formatTime(date) {
    return date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  // 音声認識の可用性チェック
  function checkSpeechRecognitionSupport() {
    if (!recognition) {
      recordBtn.disabled = true;
      recordBtn.classList.add('disabled');
      recordBtn.innerHTML = '<i class="fas fa-microphone-slash"></i> 音声認識非対応';
      showError('このブラウザは音声認識に対応していません。テキスト入力をご利用ください。');
    }
  }

  // 音声合成の可用性チェック
  function checkSpeechSynthesisSupport() {
    if (!('speechSynthesis' in window)) {
      stopSpeakBtn.style.display = 'none';
      console.warn('このブラウザは音声合成に対応していません。');
    }
  }

  // 初期チェック実行
  checkSpeechRecognitionSupport();
  checkSpeechSynthesisSupport();
});