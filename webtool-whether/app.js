/**
 * LLMと天気予報ウェブツール JavaScript
 * 気象庁APIを活用した天気予報システム
 */

class WeatherApp {
  constructor() {
    this.currentMode = 'national';
    this.weatherData = {
      national: [],
      kansai: []
    };
    this.currentSpeech = null;
    this.isLoading = false;
    this.basicData = null;
    
    this.init();
  }

  async init() {
    this.setupEventListeners();
    this.initTabs();
    await this.loadBasicData();
    
    // basic.jsonが正常に読み込まれた場合のみ天気データを取得
    if (this.basicData && this.basicData.length > 0) {
      await this.loadWeatherData('national');
  } else {
      this.showError('基本データが読み込まれていません');
    }
  }

  setupEventListeners() {
    // タブ切り替え
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const mode = e.target.id.replace('tab-', '');
        this.switchTab(mode);
      });
    });

    // 更新ボタン
    document.getElementById('refreshNational')?.addEventListener('click', () => {
      this.loadWeatherData('national');
    });

    document.getElementById('refreshKansai')?.addEventListener('click', () => {
      this.loadWeatherData('kansai');
    });

    // LLM機能ボタン
    document.getElementById('generateSummaryNational')?.addEventListener('click', () => {
      this.generateSummary('national');
    });

    document.getElementById('generateSummaryKansai')?.addEventListener('click', () => {
      this.generateSummary('kansai');
    });

    document.getElementById('speakSummaryNational')?.addEventListener('click', () => {
      this.speakSummary('national');
    });

    document.getElementById('speakSummaryKansai')?.addEventListener('click', () => {
      this.speakSummary('kansai');
    });

    // モーダルクローズ
    document.getElementById('closeModal')?.addEventListener('click', () => {
      this.closeModal();
    });

    // モーダル外クリックでクローズ
    document.getElementById('weatherModal')?.addEventListener('click', (e) => {
      if (e.target.id === 'weatherModal') {
        this.closeModal();
      }
    });

    // ページ離脱時に読み上げを停止
    window.addEventListener('beforeunload', () => {
      if (this.currentSpeech) {
        speechSynthesis.cancel();
      }
    });

    // 地図要素のクリックイベント
    this.setupMapClickEvents();
  }

  setupMapClickEvents() {
    // 地図がクリックされた時のイベントハンドラを設定
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('map-prefecture')) {
        const prefName = e.target.getAttribute('data-pref');
        this.showPrefectureWeather(prefName);
      }
      
      // 都市マーカーがクリックされた時
      if (e.target.classList.contains('city-marker')) {
        const cityName = e.target.getAttribute('data-city');
        const weatherData = e.target.getAttribute('data-weather');
        this.showCityWeatherPopup(e.target, cityName, weatherData);
      }
    });
    
    // 地図の都道府県にホバー効果を追加
    document.addEventListener('mouseover', (e) => {
      if (e.target.classList.contains('map-prefecture')) {
        const prefName = e.target.getAttribute('data-pref');
        e.target.setAttribute('title', `${prefName}の詳細天気情報を表示`);
      }
      
      // 都市マーカーにホバー効果を追加
      if (e.target.classList.contains('city-marker')) {
        const cityName = e.target.getAttribute('data-city');
        e.target.setAttribute('title', `${cityName}の天気情報をクリックで表示`);
      }
    });

    // ポップアップのクローズボタン
    document.getElementById('popupClose')?.addEventListener('click', () => {
      this.hideWeatherPopup();
    });

    // ポップアップ外をクリックしたときに閉じる
    document.addEventListener('click', (e) => {
      const popup = document.getElementById('weatherPopup');
      if (popup && popup.style.display === 'block' && !popup.contains(e.target) && !e.target.classList.contains('city-marker')) {
        this.hideWeatherPopup();
      }
    });
  }

  initTabs() {
    this.updateTabDisplay();
  }

  switchTab(mode) {
    // 前のタブから active クラスを削除
    document.querySelectorAll('.tab').forEach(tab => {
      tab.classList.remove('active');
    });
    
    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.remove('active');
    });

    // 新しいタブをアクティブに
    document.getElementById(`tab-${mode}`).classList.add('active');
    document.getElementById(mode).classList.add('active');

    this.currentMode = mode;
    console.log('タブ切り替え:', mode);

    // データが未取得の場合は取得
    if (this.weatherData[mode].length === 0 && this.basicData) {
      this.loadWeatherData(mode);
    }
  }

  updateTabDisplay() {
    document.querySelectorAll('.tab').forEach(tab => {
      if (tab.classList.contains('active')) {
        tab.style.cssText = `
          background-color: #fff;
          color: var(--primary);
          font-weight: bold;
          border-bottom: 3px solid var(--primary);
          box-shadow: 0 -2px 5px rgba(0, 0, 0, 0.1);
        `;
      } else {
        tab.style.cssText = `
          background-color: #f8f9fa;
          color: var(--text-secondary);
          font-weight: normal;
          border-bottom: none;
          box-shadow: none;
        `;
      }
    });
  }
  
  async loadBasicData() {
    try {
      console.log('basic.jsonを読み込み中...');
      const response = await fetch('./basic.json');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: basic.jsonの読み込みに失敗しました`);
      }
      this.basicData = await response.json();
      console.log('basic.json読み込み完了:', this.basicData.length, '件');
      
      if (!this.basicData || this.basicData.length === 0) {
        throw new Error('basic.jsonにデータがありません');
      }
      
      return true;
    } catch (error) {
      console.error('basic.jsonの読み込みエラー:', error);
      this.showError(`基本データの読み込みに失敗しました: ${error.message}`);
      
      // フォールバック: デモ用の静的データを使用
      this.basicData = this.createFallbackData();
      console.log('フォールバックデータを使用します');
      return false;
    }
  }

  createFallbackData() {
    // デモ用の静的天気データ
    return [
      {
        name: "東京都",
        overview_url: "demo",
        forecast_url: "demo",
        demoWeather: { weather: "晴れ", temp: "22", pop: "10", wind: "北の風 弱く" }
      },
      {
        name: "大阪府", 
        overview_url: "demo",
        forecast_url: "demo",
        demoWeather: { weather: "くもり", temp: "20", pop: "30", wind: "南の風 やや強く" }
      },
      {
        name: "京都府",
        overview_url: "demo", 
        forecast_url: "demo",
        demoWeather: { weather: "晴れ時々くもり", temp: "19", pop: "20", wind: "西の風 弱く" }
      },
      {
        name: "兵庫県",
        overview_url: "demo",
        forecast_url: "demo", 
        demoWeather: { weather: "くもり時々雨", temp: "18", pop: "60", wind: "南西の風 やや強く" }
      },
      {
        name: "奈良県",
        overview_url: "demo",
        forecast_url: "demo",
        demoWeather: { weather: "晴れ", temp: "21", pop: "0", wind: "北の風 弱く" }
      },
      {
        name: "和歌山県",
        overview_url: "demo",
        forecast_url: "demo",
        demoWeather: { weather: "雨のち晴れ", temp: "19", pop: "70", wind: "南の風 強く" }
      }
    ];
  }

  async loadWeatherData(mode) {
    if (this.isLoading) return;
    
    this.isLoading = true;
    this.showLoading(mode);
    
    try {
      let dataToFetch;
      
      if (mode === 'national') {
        // 全国版：basic.jsonから主要都市を選択（パフォーマンスのため最初の10都市）
        dataToFetch = this.basicData ? this.basicData.slice(0, 10) : [];
      } else {
        // 関西版：関西地方のデータのみ
        dataToFetch = this.getKansaiData();
      }

      console.log(`${mode}版データ取得開始:`, dataToFetch.length, '件');
      this.updateStatus(mode, `0/${dataToFetch.length} 件取得済み`);

      const weatherPromises = dataToFetch.map((location, index) => 
        this.fetchWeatherForLocation(location, index, dataToFetch.length, mode)
      );

      const results = await Promise.allSettled(weatherPromises);
      const successfulResults = results
        .filter(result => result.status === 'fulfilled' && result.value !== null)
        .map(result => result.value);

      console.log(`取得結果: ${successfulResults.length}/${dataToFetch.length} 件成功`);

      if (successfulResults.length === 0) {
        throw new Error('すべての地域でデータ取得に失敗しました');
      }

      this.weatherData[mode] = successfulResults;
      this.displayWeatherData(mode);
      this.updateLastUpdated(mode);
      
      console.log(`${mode}版天気データ取得完了:`, successfulResults.length, '件');
      
    } catch (error) {
      console.error('天気データ取得エラー:', error);
      this.showError(`天気データの取得に失敗しました: ${error.message}`);
      
      // エラー時の表示
      const container = document.getElementById(`${mode}Weather`);
      if (container) {
        container.innerHTML = `
          <div class="error-message">
            <i class="fas fa-exclamation-triangle"></i>
            <p>天気データを取得できませんでした</p>
            <p style="font-size: 0.9rem;">エラー: ${error.message}</p>
            <button class="button" onclick="window.weatherApp.loadWeatherData('${mode}')">
              <i class="fas fa-redo"></i> 再試行
            </button>
          </div>
        `;
      }
    } finally {
      this.isLoading = false;
    }
  }

  getKansaiData() {
    // 関西地方のデータを抽出
    const kansaiRegions = [
      '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県'
    ];
    
    return this.basicData ? this.basicData.filter(location => 
      kansaiRegions.some(region => location.name.includes(region))
    ) : [];
  }

  async fetchWeatherForLocation(location, index, total, mode) {
    try {
      // デモデータの場合はAPIを呼ばない
      if (location.overview_url === "demo") {
        console.log(`デモデータを使用: ${location.name}`);
        this.updateStatus(mode, `${index + 1}/${total} 件取得済み`);
        
        return {
          name: location.name,
          overview: {
            text: `${location.name}の天気概要です。${location.demoWeather.weather}の予報となっています。`,
            reportDatetime: new Date().toISOString()
          },
          forecast: [{
            timeSeries: [{
              areas: [{
                weathers: [location.demoWeather.weather],
                winds: [location.demoWeather.wind],
                temps: [location.demoWeather.temp, location.demoWeather.temp],
                pops: [location.demoWeather.pop]
              }]
            }]
          }],
          location
        };
      }

      // 実際のAPIを呼び出し（CORS制限により失敗する可能性あり）
      console.log(`API取得試行: ${location.name}`);
      
      // CORSプロキシを使用してAPIを呼び出し
      const proxyUrl = 'https://api.allorigins.win/get?url=';
      const [overviewResponse, forecastResponse] = await Promise.all([
        fetch(proxyUrl + encodeURIComponent(location.overview_url)),
        fetch(proxyUrl + encodeURIComponent(location.forecast_url))
      ]);

      if (!overviewResponse.ok || !forecastResponse.ok) {
        throw new Error(`API取得失敗: ${location.name}`);
      }

      const overviewData = await overviewResponse.json();
      const forecastData = await forecastResponse.json();

      const overview = JSON.parse(overviewData.contents);
      const forecast = JSON.parse(forecastData.contents);

      // 進捗更新
      this.updateStatus(mode, `${index + 1}/${total} 件取得済み`);

      return {
        name: location.name,
        overview,
        forecast,
        location
      };

    } catch (error) {
      console.error(`${location.name}のデータ取得エラー:`, error);
      
      // エラー時はフォールバックデータを使用
      const fallbackWeather = this.createFallbackWeather(location.name);
      this.updateStatus(mode, `${index + 1}/${total} 件取得済み (フォールバック)`);
      
      return {
        name: location.name,
        overview: {
          text: `${location.name}の天気概要です（フォールバックデータ）。`,
          reportDatetime: new Date().toISOString()
        },
        forecast: [{
          timeSeries: [{
            areas: [{
              weathers: [fallbackWeather.weather],
              winds: [fallbackWeather.wind],
              temps: [fallbackWeather.temp, fallbackWeather.temp],
              pops: [fallbackWeather.pop]
            }]
          }]
        }],
        location
      };
    }
  }

  createFallbackWeather(locationName) {
    // 地域名に基づいて適当な天気データを生成
    const weathers = ["晴れ", "くもり", "晴れ時々くもり", "くもり時々晴れ"];
    const winds = ["北の風 弱く", "南の風 弱く", "西の風 やや強く", "東の風 弱く"];
    const temps = ["18", "19", "20", "21", "22"];
    const pops = ["0", "10", "20", "30"];
    
    const hash = locationName.length % 4;
    
    return {
      weather: weathers[hash],
      wind: winds[hash],
      temp: temps[hash],
      pop: pops[hash]
    };
  }

  displayWeatherData(mode) {
    const container = document.getElementById(`${mode}Weather`);
    if (!container) return;

    const weatherData = this.weatherData[mode].filter(data => data !== null);

    if (weatherData.length === 0) {
      container.innerHTML = `
        <div class="error-message">
          <i class="fas fa-exclamation-triangle"></i>
          天気データを取得できませんでした
          <button class="button" onclick="window.weatherApp.loadWeatherData('${mode}')" style="margin-top: 1rem;">
            <i class="fas fa-redo"></i> 再試行
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = weatherData.map(data => this.createWeatherCard(data)).join('');

    // カードクリックイベントを追加
    container.querySelectorAll('.weather-card').forEach((card, index) => {
      card.addEventListener('click', () => {
        this.showWeatherDetails(weatherData[index]);
      });
    });
  }

  createWeatherCard(data) {
    const { name, overview, forecast } = data;
    
    // 天気情報を解析
    const todayWeather = this.parseTodayWeather(forecast);
    const weatherClass = this.getWeatherClass(todayWeather.weather);
    const weatherIcon = this.getWeatherIcon(todayWeather.weather);

    return `
      <div class="weather-card ${weatherClass}">
        <div class="weather-header">
          <div class="weather-location">${name}</div>
          <div class="weather-icon">${weatherIcon}</div>
        </div>
        <div class="weather-temp">${todayWeather.temp}°C</div>
        <div class="weather-description">${todayWeather.weather}</div>
        <div class="weather-info">
          <div><i class="fas fa-wind"></i> ${todayWeather.wind}</div>
          <div><i class="fas fa-eye"></i> 降水確率: ${todayWeather.pop}%</div>
        </div>
        <div class="weather-details">
          更新: ${new Date(overview.reportDatetime).toLocaleString('ja-JP')}
        </div>
      </div>
    `;
  }

  parseTodayWeather(forecast) {
    try {
      // 今日の天気情報を取得
      const timeSeries = forecast[0]?.timeSeries || [];
      const weatherSeries = timeSeries.find(series => series.areas[0]?.weathers);
      const tempSeries = timeSeries.find(series => series.areas[0]?.temps);
      const popSeries = timeSeries.find(series => series.areas[0]?.pops);

      const weather = weatherSeries?.areas[0]?.weathers?.[0] || '情報なし';
      const wind = weatherSeries?.areas[0]?.winds?.[0] || '情報なし';
      const temp = tempSeries?.areas[0]?.temps?.[1] || tempSeries?.areas[0]?.temps?.[0] || '--'; // 最高気温または利用可能な気温
      const pop = popSeries?.areas[0]?.pops?.[0] || '0';

      return { weather, wind, temp, pop };
    } catch (error) {
      console.error('天気情報解析エラー:', error);
      return { weather: '情報取得エラー', wind: '--', temp: '--', pop: '0' };
    }
  }

  getWeatherClass(weather) {
    if (weather.includes('晴') || weather.includes('快晴')) return 'sunny';
    if (weather.includes('雨') || weather.includes('雷')) return 'rainy';
    if (weather.includes('雪')) return 'snowy';
    if (weather.includes('くもり') || weather.includes('曇')) return 'cloudy';
    return 'cloudy';
  }

  getWeatherIcon(weather) {
    if (weather.includes('晴') || weather.includes('快晴')) return '☀️';
    if (weather.includes('雨') || weather.includes('雷')) return '🌧️';
    if (weather.includes('雪')) return '❄️';
    if (weather.includes('くもり') || weather.includes('曇')) return '☁️';
    return '🌤️';
  }

  showPrefectureWeather(prefName) {
    // 地図から都道府県がクリックされた時の処理
    const weatherData = this.weatherData[this.currentMode];
    const prefData = weatherData.find(data => data.name.includes(prefName));
    
    if (prefData) {
      this.showWeatherDetails(prefData);
    } else {
      alert(`${prefName}の詳細データが見つかりません`);
    }
  }

  showWeatherDetails(data) {
    const modal = document.getElementById('weatherModal');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');

    title.textContent = `${data.name} - 詳細天気情報`;
    
    // 詳細情報を生成
    const detailHtml = this.generateDetailContent(data);
    body.innerHTML = detailHtml;

    modal.style.display = 'block';
  }

  generateDetailContent(data) {
    const { overview, forecast } = data;
    const todayWeather = this.parseTodayWeather(forecast);

    return `
      <div class="weather-detail-grid">
        <div class="weather-detail-item">
          <div class="weather-detail-label">現在の天気</div>
          <div class="weather-detail-value">${todayWeather.weather}</div>
        </div>
        <div class="weather-detail-item">
          <div class="weather-detail-label">気温</div>
          <div class="weather-detail-value">${todayWeather.temp}°C</div>
        </div>
        <div class="weather-detail-item">
          <div class="weather-detail-label">降水確率</div>
          <div class="weather-detail-value">${todayWeather.pop}%</div>
        </div>
        <div class="weather-detail-item">
          <div class="weather-detail-label">風</div>
          <div class="weather-detail-value">${todayWeather.wind}</div>
        </div>
      </div>
      
      <h4>🌤️ 気象庁概要</h4>
      <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; white-space: pre-wrap; line-height: 1.6;">
${overview.text}
      </div>
      
      <p style="margin-top: 1rem; font-size: 0.9rem; color: #666;">
        <i class="fas fa-clock"></i> 最終更新: ${new Date(overview.reportDatetime).toLocaleString('ja-JP')}
      </p>
    `;
  }

  closeModal() {
    document.getElementById('weatherModal').style.display = 'none';
  }

  async generateSummary(mode) {
    const button = document.getElementById(`generateSummary${mode.charAt(0).toUpperCase() + mode.slice(1)}`);
    const output = document.getElementById(`summaryOutput${mode.charAt(0).toUpperCase() + mode.slice(1)}`);
    
    if (!button || !output) return;

    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 要約生成中...';
    
    try {
      const weatherData = this.weatherData[mode];
      if (weatherData.length === 0) {
        throw new Error('天気データがありません');
      }

      // LLM用のプロンプトを生成
      const prompt = this.createSummaryPrompt(weatherData, mode);
      
      // LLM APIを呼び出し
      const summary = await this.callLLMAPI(prompt);
      
      output.textContent = summary;
      
    } catch (error) {
      console.error('要約生成エラー:', error);
      output.textContent = `要約生成中にエラーが発生しました: ${error.message}`;
    } finally {
      button.disabled = false;
      button.innerHTML = `<i class="fas fa-magic"></i> ${mode === 'national' ? '全国' : '関西'}天気を要約`;
    }
  }

  createSummaryPrompt(weatherData, mode) {
    const regionName = mode === 'national' ? '全国' : '関西地方';
    
    const weatherInfo = weatherData.map(data => {
      const todayWeather = this.parseTodayWeather(data.forecast);
      return `${data.name}: ${todayWeather.weather}、気温${todayWeather.temp}°C、降水確率${todayWeather.pop}%`;
    }).join('\n');

    return `以下の${regionName}の天気情報を、わかりやすく要約してください。朗読に適した自然な日本語で、1-2分程度で読める長さにまとめてください。

${weatherInfo}

要約のポイント:
- 全体的な天気傾向
- 注意すべき地域や天気
- 外出時のアドバイス
- 親しみやすい口調で`;
  }

  async callLLMAPI(prompt) {
    // 既存のLLM API呼び出し関数を使用
    const messages = [
      {
        role: "system",
        content: "あなたは親しみやすい気象予報士です。天気情報を分かりやすく、聞き取りやすい形で要約してください。"
      },
      {
        role: "user",
        content: prompt
      }
    ];

    try {
      const response = await fetch('https://llama-4-maverick-17b-128e-instruct-fp8-llmhub-api.hf.space/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-4-maverick-17b-128e-instruct-fp8',
          messages: messages,
          max_tokens: 1000,
          temperature: 0.7,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || '要約の生成に失敗しました。';
      
    } catch (error) {
      console.error('LLM API呼び出しエラー:', error);
      throw new Error('AI要約サービスに接続できませんでした。');
    }
  }

  speakSummary(mode) {
    const output = document.getElementById(`summaryOutput${mode.charAt(0).toUpperCase() + mode.slice(1)}`);
    const button = document.getElementById(`speakSummary${mode.charAt(0).toUpperCase() + mode.slice(1)}`);
    
    if (!output || !button) return;

    const text = output.textContent.trim();
    
    if (!text || text.includes('ボタンをクリック') || text.includes('エラーが発生')) {
      alert('読み上げるテキストがありません。先に要約を生成してください。');
      return;
    }
    
    // Web Speech API対応チェック
    if (!('speechSynthesis' in window)) {
      alert('お使いのブラウザは音声読み上げ機能に対応していません。');
      return;
    }
    
    // 現在の読み上げを停止
    if (this.currentSpeech) {
      speechSynthesis.cancel();
      this.currentSpeech = null;
      this.resetSpeakButton(button);
      return;
    }
    
    // 新しい読み上げを開始
    this.currentSpeech = new SpeechSynthesisUtterance(text);
    this.currentSpeech.lang = 'ja-JP';
    this.currentSpeech.rate = 0.9;
    this.currentSpeech.pitch = 1.0;
    this.currentSpeech.volume = 1.0;

    this.currentSpeech.onstart = () => {
      button.classList.add('speak-active');
      button.innerHTML = '<i class="fas fa-stop"></i> 停止';
    };

    this.currentSpeech.onend = () => {
      this.currentSpeech = null;
      this.resetSpeakButton(button);
    };

    this.currentSpeech.onerror = (event) => {
      console.error('読み上げエラー:', event.error);
      this.currentSpeech = null;
      this.resetSpeakButton(button);
      alert('読み上げ中にエラーが発生しました。');
    };
    
    speechSynthesis.speak(this.currentSpeech);
  }

  resetSpeakButton(button) {
    button.classList.remove('speak-active');
    button.innerHTML = '<i class="fas fa-volume-up"></i> 音声読み上げ';
  }

  showLoading(mode) {
    const container = document.getElementById(`${mode}Weather`);
    if (container) {
      container.innerHTML = `
        <div class="loading">
          <i class="fas fa-spinner"></i>
          <p>${mode === 'national' ? '全国' : '関西地方'}の天気データを取得中...</p>
        </div>
      `;
    }
  }

  updateStatus(mode, message) {
    const element = document.getElementById(mode === 'national' ? 'dataCount' : 'dataCountKansai');
    if (element) {
      element.textContent = message;
    }
  }

  updateLastUpdated(mode) {
    const element = document.getElementById(mode === 'national' ? 'lastUpdated' : 'lastUpdatedKansai');
    if (element) {
      element.textContent = new Date().toLocaleString('ja-JP');
    }
  }

  showCityWeatherPopup(element, cityName, weatherDataStr) {
    try {
      const weatherData = JSON.parse(weatherDataStr);
      const popup = document.getElementById('weatherPopup');
      const rect = element.getBoundingClientRect();
      
      // ポップアップの位置を計算
      const x = rect.left + (rect.width / 2);
      const y = rect.top - 10;
      
      // ポップアップの内容を設定
      document.getElementById('popupCityName').textContent = cityName;
      document.getElementById('popupTemp').textContent = `${weatherData.temp}°C`;
      document.getElementById('popupWeatherText').textContent = weatherData.weather;
      document.getElementById('popupWeatherIcon').textContent = this.getWeatherIcon(weatherData.weather);
      document.getElementById('popupDetails').textContent = `降水確率: ${weatherData.pop}%`;
      
      // ポップアップを表示
      popup.style.display = 'block';
      popup.style.left = `${x - 100}px`; // ポップアップの幅の半分を引く
      popup.style.top = `${y}px`;
      
      // 画面端での調整
      const popupRect = popup.getBoundingClientRect();
      if (popupRect.right > window.innerWidth) {
        popup.style.left = `${window.innerWidth - popupRect.width - 20}px`;
      }
      if (popupRect.left < 0) {
        popup.style.left = '20px';
      }
      if (popupRect.top < 0) {
        popup.style.top = `${rect.bottom + 10}px`;
      }
      
      // アニメーション効果
      popup.style.opacity = '0';
      popup.style.transform = 'translateY(-10px) scale(0.9)';
      setTimeout(() => {
        popup.style.transition = 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)';
        popup.style.opacity = '1';
        popup.style.transform = 'translateY(0) scale(1)';
      }, 10);
      
    } catch (error) {
      console.error('ポップアップ表示エラー:', error);
    }
  }

  hideWeatherPopup() {
    const popup = document.getElementById('weatherPopup');
    if (popup) {
      popup.style.transition = 'all 0.2s ease-out';
      popup.style.opacity = '0';
      popup.style.transform = 'translateY(-10px) scale(0.9)';
      setTimeout(() => {
        popup.style.display = 'none';
        popup.style.transition = '';
      }, 200);
    }
  }

  showError(message) {
    console.error('エラー:', message);
    // エラーメッセージの表示ロジックを追加することができます
  }
}

// アプリケーション初期化
document.addEventListener('DOMContentLoaded', () => {
  window.weatherApp = new WeatherApp();
}); 