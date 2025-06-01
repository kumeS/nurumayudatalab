/**
 * LLMと天気予報ウェブツール JavaScript
 * 気象庁APIを活用した天気予報システム
 */

class WeatherApp {
  constructor() {
    // ページ更新時のタブ状態を復元
    this.currentMode = this.loadTabState() || 'national';
    this.weatherData = {
      national: [],
      kansai: []
    };
    this.currentSpeech = null;
    this.isLoading = false;
    this.basicData = null;
    this.searchIndex = 0; // 検索候補のキーボードナビゲーション用
    
    // 要約データを保存（通常版とひらがな版）
    this.summaryData = {
      national: {
        normal: '',
        hiragana: ''
      },
      kansai: {
        normal: '',
        hiragana: ''
      }
    };

    // 都道府県ピックアップ（北から順）
    this.majorPrefectures = [
      { name: '北海道', emoji: '🐻', region: '北海道' },
      { name: '宮城県', emoji: '🌾', region: '東北' },
      { name: '東京都', emoji: '🗼', region: '関東' },
      { name: '神奈川県', emoji: '🌊', region: '関東' },
      { name: '新潟県', emoji: '🍙', region: '中部' },
      { name: '愛知県', emoji: '🏭', region: '中部' },
      { name: '京都府', emoji: '🏛️', region: '関西' },
      { name: '大阪府', emoji: '🏯', region: '関西' },
      { name: '兵庫県', emoji: '🍖', region: '関西' },
      { name: '広島県', emoji: '⛩️', region: '中国' },
      { name: '福岡県', emoji: '🍜', region: '九州' },
      { name: '沖縄県', emoji: '🏝️', region: '沖縄' }
    ];
    
    this.init();
  }

  async init() {
    this.setupEventListeners();
    
    // 保存されたタブ状態を復元してからタブを初期化
    this.restoreTabState();
    this.initTabs();
    
    // 保存された要約データを復元
    this.loadSummaryData();
    this.restoreSummaryDisplay();
    
    await this.loadBasicData();
    
    // 主要都道府県アイコンを初期化
    this.initPrefectureIcons();
    
    // 日本地図データを読み込む
    await this.loadJapanMapData();
    
    // 関西地図データを読み込む
    await this.loadKansaiMapData();
    
    // basic.jsonが正常に読み込まれた場合のみ天気データを取得
    if (this.basicData && this.basicData.length > 0) {
      await this.loadWeatherData('national');
      await this.loadMajorCitiesWeather();
      // 関西都市の天気データを読み込む（basic.json読み込み後）
      await this.loadKansaiCitiesWeather();
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

    // 更新ボタン（ページリロード）
    document.getElementById('refreshNational')?.addEventListener('click', () => {
      location.reload();
    });

    document.getElementById('refreshKansai')?.addEventListener('click', () => {
      location.reload();
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

    // 要約クリアボタン
    document.getElementById('clearSummaryNational')?.addEventListener('click', () => {
      this.clearSummary('national');
    });

    document.getElementById('clearSummaryKansai')?.addEventListener('click', () => {
      this.clearSummary('kansai');
    });

    // 検索機能
    document.getElementById('searchButton')?.addEventListener('click', () => {
      this.searchPrefecture('national');
    });



    // リアルタイム検索とキーナビゲーション
    document.getElementById('prefectureSearch')?.addEventListener('input', (e) => {
      this.handleSearchInput(e.target.value, 'national');
    });



    // キーボードナビゲーション
    document.getElementById('prefectureSearch')?.addEventListener('keydown', (e) => {
      this.handleSearchKeydown(e, 'national');
    });



    // 検索フィールドのフォーカス外れイベント
    document.getElementById('prefectureSearch')?.addEventListener('blur', () => {
      setTimeout(() => this.hideSuggestions('national'), 150);
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

    // タブ状態を保存
    this.saveTabState(mode);

    // タブ表示を更新
    this.updateTabDisplay();

    // データが未取得の場合は取得
    if (this.weatherData[mode].length === 0 && this.basicData) {
      this.loadWeatherData(mode);
    }
    
    // 関西版タブの場合、地図と都市データが読み込まれていなければ読み込む
    if (mode === 'kansai') {
      const kansaiMapContainer = document.getElementById('kansaiDotMapContainer');
      if (kansaiMapContainer && kansaiMapContainer.querySelector('#loadingKansaiMap')) {
        this.loadKansaiMapData();
      }
      
      const kansaiCitiesContainer = document.getElementById('kansaiCitiesWeather');
      if (kansaiCitiesContainer && kansaiCitiesContainer.querySelector('.loading')) {
        this.loadKansaiCitiesWeather();
      }
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
      console.log('📖 基本データを読み込み中...');
      
      // 埋め込みデータを優先的に使用
      if (window.BASIC_DATA && Array.isArray(window.BASIC_DATA)) {
        console.log('✅ 埋め込みBASIC_DATAを使用');
        this.basicData = window.BASIC_DATA;
        console.log('✅ 基本データ読み込み完了:', this.basicData.length, '件');
        
        // 最初の数件のデータ構造を確認
        console.log('📊 読み込まれたデータサンプル:', this.basicData.slice(0, 3));
        
        // APIエンドポイントが正しく設定されているかチェック
        const realApiData = this.basicData.filter(item => 
          item.overview_url && 
          item.overview_url !== "demo" && 
          item.overview_url.includes('jma.go.jp')
        );
        
        console.log(`🌐 実APIエンドポイント数: ${realApiData.length}/${this.basicData.length}`);
        console.log('🔍 実APIデータサンプル:', realApiData.slice(0, 2));
        
        return true;
      }
      
      // 埋め込みデータが利用できない場合、JSONファイルをフェッチ
      console.log('⚠️ 埋め込みデータが見つかりません。JSONファイルから読み込みます...');
      console.log('🔗 読み込みパス: ./json/basic.json');
      console.log('🌐 現在のURL:', window.location.href);
      
      const response = await fetch('./json/basic.json');
      console.log(`📡 basic.jsonレスポンス状態: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: basic.jsonの読み込みに失敗しました`);
      }
      
      this.basicData = await response.json();
      console.log('✅ basic.json読み込み完了:', this.basicData.length, '件');
      
      // 最初の数件のデータ構造を確認
      console.log('📊 読み込まれたデータサンプル:', this.basicData.slice(0, 3));
      
      if (!this.basicData || this.basicData.length === 0) {
        throw new Error('basic.jsonにデータがありません');
      }
      
      // APIエンドポイントが正しく設定されているかチェック
      const realApiData = this.basicData.filter(item => 
        item.overview_url && 
        item.overview_url !== "demo" && 
        item.overview_url.includes('jma.go.jp')
      );
      
      console.log(`🌐 実APIエンドポイント数: ${realApiData.length}/${this.basicData.length}`);
      console.log('🔍 実APIデータサンプル:', realApiData.slice(0, 2));
      
      return true;
    } catch (error) {
      console.error('❌ 基本データの読み込みエラー:', error);
      this.showError(`基本データの読み込みに失敗しました: ${error.message}`);
      
      // フォールバック: デモ用の静的データを使用
      this.basicData = this.createFallbackData();
      console.log('🔄 フォールバックデータを使用します');
      return false;
    }
  }

  createFallbackData() {
    // basic.json読み込み失敗時の緊急用フォールバックデータ
    console.warn('⚠️ basic.json読み込み失敗 - 実際のAPI URLでリトライします');
    return [
      {
        name: "東京都",
        overview_url: "https://www.jma.go.jp/bosai/forecast/data/overview_forecast/130000.json",
        forecast_url: "https://www.jma.go.jp/bosai/forecast/data/forecast/130000.json",
        demoWeather: { weather: "晴れ", temp: "22", pop: "10", wind: "北の風 弱く" },
        isFallback: true
      },
      {
        name: "大阪府", 
        overview_url: "https://www.jma.go.jp/bosai/forecast/data/overview_forecast/270000.json",
        forecast_url: "https://www.jma.go.jp/bosai/forecast/data/forecast/270000.json",
        demoWeather: { weather: "くもり", temp: "20", pop: "30", wind: "南の風 やや強く" },
        isFallback: true
      },
      {
        name: "京都府",
        overview_url: "https://www.jma.go.jp/bosai/forecast/data/overview_forecast/260000.json", 
        forecast_url: "https://www.jma.go.jp/bosai/forecast/data/forecast/260000.json",
        demoWeather: { weather: "晴れ時々くもり", temp: "19", pop: "20", wind: "西の風 弱く" },
        isFallback: true
      },
      {
        name: "兵庫県",
        overview_url: "https://www.jma.go.jp/bosai/forecast/data/overview_forecast/280000.json",
        forecast_url: "https://www.jma.go.jp/bosai/forecast/data/forecast/280000.json", 
        demoWeather: { weather: "くもり時々雨", temp: "18", pop: "60", wind: "南西の風 やや強く" },
        isFallback: true
      },
      {
        name: "奈良県",
        overview_url: "https://www.jma.go.jp/bosai/forecast/data/overview_forecast/290000.json",
        forecast_url: "https://www.jma.go.jp/bosai/forecast/data/forecast/290000.json",
        demoWeather: { weather: "晴れ", temp: "21", pop: "0", wind: "北の風 弱く" },
        isFallback: true
      },
      {
        name: "和歌山県",
        overview_url: "https://www.jma.go.jp/bosai/forecast/data/overview_forecast/300000.json",
        forecast_url: "https://www.jma.go.jp/bosai/forecast/data/forecast/300000.json",
        demoWeather: { weather: "雨のち晴れ", temp: "19", pop: "70", wind: "南の風 強く" },
        isFallback: true
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
      
      // エラー時の表示はコンソールログのみ（詳細天気データセクションは削除済み）
      console.error(`${mode}版天気データ取得エラー:`, error.message);
      
      // 関西版の場合は関西都市カードでエラー表示を処理
      if (mode === 'kansai') {
        this.showKansaiCitiesError(error.message);
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
      if (location.overview_url === "demo" || location.demoWeather) {
        console.log(`デモデータを使用: ${location.name}`);
        this.updateStatus(mode, `${index + 1}/${total} 件取得済み (デモ)`);
        
        const demoWeather = location.demoWeather || this.createFallbackWeather(location.name);
        
        return {
          name: location.name,
          overview: {
            text: `${location.name}の天気概要です。${demoWeather.weather}の予報となっています。`,
            reportDatetime: new Date().toISOString()
          },
          forecast: [{
            timeSeries: [{
              areas: [{
                weathers: [demoWeather.weather],
                winds: [demoWeather.wind],
                temps: [demoWeather.temp, demoWeather.temp],
                pops: [demoWeather.pop]
              }]
            }]
          }],
          location,
          isDemo: true
        };
      }

      // 実際のAPIを呼び出し
      console.log(`🔄 API取得開始: ${location.name}`);
      console.log(`📡 概要URL: ${location.overview_url}`);
      console.log(`📊 予報URL: ${location.forecast_url}`);
      
      // CORSプロキシを使用してAPIを呼び出し
      const proxyUrl = 'https://api.cors.lol/?url=';
      
      console.log(`🌐 プロキシ経由でAPI取得中...`);
      
      const [overviewResponse, forecastResponse] = await Promise.all([
        fetch(proxyUrl + encodeURIComponent(location.overview_url), {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          }
        }),
        fetch(proxyUrl + encodeURIComponent(location.forecast_url), {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          }
        })
      ]);

      console.log(`📡 レスポンス状態: 概要=${overviewResponse.status}, 予報=${forecastResponse.status}`);

      if (!overviewResponse.ok || !forecastResponse.ok) {
        throw new Error(`API取得失敗: ${location.name} (概要:${overviewResponse.status}, 予報:${forecastResponse.status})`);
      }

      const overviewData = await overviewResponse.json();
      const forecastData = await forecastResponse.json();

      console.log(`✅ JSON取得完了: ${location.name}`);

      const overview = overviewData;
      const forecast = forecastData;

      console.log(`🎉 API取得成功: ${location.name}`);

      // 進捗更新
      this.updateStatus(mode, `${index + 1}/${total} 件取得済み (API)`);

      return {
        name: location.name,
        overview,
        forecast,
        location,
        isDemo: false
      };

    } catch (error) {
      console.error(`❌ ${location.name}のAPI取得エラー:`, error.message);
      
      // エラー時はフォールバックデータを使用
      const fallbackWeather = this.createFallbackWeather(location.name);
      this.updateStatus(mode, `${index + 1}/${total} 件取得済み (フォールバック)`);
      
      return {
        name: location.name,
        overview: {
          text: `${location.name}の天気概要です（APIエラーのためフォールバックデータ）。エラー: ${error.message}`,
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
        location,
        isDemo: false,
        isError: true
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
    // 従来の詳細天気データ表示は削除されたため、この関数は無効化
    // 関西版は関西都市カードで表示、全国版は主要都市カードで表示
    console.log(`詳細天気データ表示: ${mode}版（新しいカードレイアウトで表示済み）`);
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
        ${data.location && data.location.overview_url && data.location.overview_url !== 'demo' ? 
          `<br><i class="fas fa-link"></i> <a href="${data.location.overview_url}" target="_blank" style="color: #007bff; text-decoration: none;">概要API</a> | <a href="${data.location.forecast_url}" target="_blank" style="color: #007bff; text-decoration: none;">予報API</a>` : 
          '<br><i class="fas fa-info-circle"></i> デモデータ使用中'
        }
      </p>
    `;
  }

  closeModal() {
    document.getElementById('weatherModal').style.display = 'none';
  }

  async generateSummary(mode) {
    const button = document.getElementById(`generateSummary${mode.charAt(0).toUpperCase() + mode.slice(1)}`);
    const output = document.getElementById(`summaryOutput${mode.charAt(0).toUpperCase() + mode.slice(1)}`);
    const progressArea = document.getElementById(`summaryProgress${mode.charAt(0).toUpperCase() + mode.slice(1)}`);
    const progressMessage = document.getElementById(`summaryProgressMessage${mode.charAt(0).toUpperCase() + mode.slice(1)}`);
    const progressFill = document.getElementById(`summaryProgressFill${mode.charAt(0).toUpperCase() + mode.slice(1)}`);
    
    if (!button || !output || !progressArea) return;

    button.disabled = true;
    this.showProgressArea(progressArea, progressMessage, progressFill, '要約生成を開始しています...', 'init');
    
    try {
      // 天気データを取得（全国版は主要都市データ、関西版は関西地方データ）
      let weatherData;
      
      if (mode === 'national') {
        // 全国版の場合は12都道府県ピックアップデータを使用
        this.showProgressArea(progressArea, progressMessage, progressFill, '全国12都道府県の天気データを収集中...', 'data-fetch');
        console.log('🎯 12都道府県ピックアップデータで要約を生成中...');
        weatherData = await this.getMajorPrefecturesWeatherData();
        
        if (!weatherData || weatherData.length === 0) {
          console.warn('⚠️ 12都道府県データが取得できませんでした。フォールバックを試行します。');
          this.showProgressArea(progressArea, progressMessage, progressFill, 'フォールバックデータを準備中...', 'fallback');
          
          // フォールバック1: 主要都市データを使用
          const majorCitiesContainer = document.getElementById('majorCitiesWeather');
          if (majorCitiesContainer && !majorCitiesContainer.querySelector('.loading')) {
            const majorCityCards = majorCitiesContainer.querySelectorAll('.major-city-card');
            weatherData = Array.from(majorCityCards).map(card => {
              const cityName = card.querySelector('.city-name').textContent.trim();
              const temp = card.querySelector('.city-temp').textContent.replace('°C', '');
              const weather = card.querySelector('.city-weather-desc').textContent;
              const details = card.querySelectorAll('.city-details span');
              const pop = details[0] ? details[0].textContent.replace('%', '').replace(/[^0-9]/g, '') : '0';
              
              return {
                name: cityName,
                overview: { text: `${cityName}の天気概要` },
                forecast: [{
                  timeSeries: [{
                    areas: [{
                      weathers: [weather],
                      temps: [temp, temp],
                      pops: [pop],
                      winds: ['風の情報']
                    }]
                  }]
                }]
              };
            });
          } else {
            // フォールバック2: 基本データを使用
            weatherData = this.weatherData[mode];
          }
        }
      } else {
        // 関西版の場合は既存の関西データを使用
        this.showProgressArea(progressArea, progressMessage, progressFill, '関西地方の天気データを収集中...', 'data-fetch');
        weatherData = this.weatherData[mode];
      }

      if (!weatherData || weatherData.length === 0) {
        this.showProgressArea(progressArea, progressMessage, progressFill, 'データ準備中のため、簡易要約を生成中...', 'simple-summary');
        
        // データがない場合は簡易的な要約を生成
        const regionName = mode === 'national' ? '全国' : '関西地方';
        const summary = `${regionName}の天気要約\n\n現在、天気データを取得・準備中です。\n\n天気情報の詳細については、各地域の天気カードをご確認ください。データが準備でき次第、より詳細な要約をご提供いたします。`;
        const hiraganaSummary = this.createSimpleHiraganaErrorMessage(summary);
        
        // 両方を内部に保存
        this.summaryData[mode].normal = summary;
        this.summaryData[mode].hiragana = hiraganaSummary;
        
        // UIには通常版のみ表示
        output.textContent = summary;
        
        // 進捗エリアを非表示にする
        this.hideProgressArea(progressArea);
        
        // 要約データを保存
        this.saveSummaryData();
        return;
      }

      // LLM用のプロンプトを生成
      this.showProgressArea(progressArea, progressMessage, progressFill, 'AI要約プロンプトを構築中...', 'prompt-build');
      const prompt = this.createSummaryPrompt(weatherData, mode);
      
      console.log('要約プロンプト:', prompt);
      
      // 【重要】LLMで要約とひらがな版を一度に生成（JavaScriptでの後処理変換は行わない）
      this.showProgressArea(progressArea, progressMessage, progressFill, 'AI言語モデルで要約を生成中...', 'llm-generate');
      const summaryResponse = await this.callLLMAPI(prompt);
      
      this.showProgressArea(progressArea, progressMessage, progressFill, '要約データを保存中...', 'data-save');
      
      // 両方を内部に保存
      this.summaryData[mode].normal = summaryResponse.summary;
      this.summaryData[mode].hiragana = summaryResponse.hiragana;
      
      // UIには通常版のみ表示
      output.textContent = summaryResponse.summary;
      
      // 進捗エリアを非表示にする
      this.hideProgressArea(progressArea);
      
      // 要約データを保存
      this.saveSummaryData();
      
      console.log('要約生成完了 - 通常版:', summaryResponse.summary.length, '文字');
      console.log('要約生成完了 - ひらがな版:', summaryResponse.hiragana.length, '文字');
      
    } catch (error) {
      console.error('要約生成エラー:', error);
      
      // エラー時はローカル要約を試行（通常版とひらがな版両方）
      try {
        this.showProgressArea(progressArea, progressMessage, progressFill, 'APIエラーのため、ローカル要約を生成中...', 'local-fallback');
        
        const weatherData = this.weatherData[mode] || [];
        const prompt = this.createSummaryPrompt(weatherData, mode);
        
        // 【フォールバック】ローカルでJSON形式要約を生成（LLM不可時のみ）
        const localSummaryResponse = this.generateLocalSummary(prompt);
        
        // 両方を内部に保存
        this.summaryData[mode].normal = localSummaryResponse.summary;
        this.summaryData[mode].hiragana = localSummaryResponse.hiragana;
        
        // UIには通常版のみ表示
        output.textContent = localSummaryResponse.summary;
        
        // 進捗エリアを非表示にする
        this.hideProgressArea(progressArea);
        
        // 要約データを保存
        this.saveSummaryData();
        
        console.log('ローカル要約を表示しました（通常版・ひらがな版両方生成）');
      } catch (localError) {
        console.error('ローカル要約生成エラー:', localError);
        this.showProgressArea(progressArea, progressMessage, progressFill, 'エラーメッセージを準備中...', 'error-handle');
        
        const regionName = mode === 'national' ? '全国' : '関西地方';
        const errorMessage = `申し訳ございません。現在、${regionName}の天気要約サービスが一時的に利用できません。\n\n各地域の詳細な天気情報は、天気カードをクリックしてご確認ください。`;
        
        // エラーメッセージも両方の形式で保存（シンプルなひらがな変換）
        this.summaryData[mode].normal = errorMessage;
        this.summaryData[mode].hiragana = this.createSimpleHiraganaErrorMessage(errorMessage);
        
        output.textContent = errorMessage;
        
        // 進捗エリアを非表示にする
        this.hideProgressArea(progressArea);
        
        // エラーメッセージも保存
        this.saveSummaryData();
      }
    } finally {
      button.disabled = false;
      button.innerHTML = `<i class="fas fa-magic"></i> ${mode === 'national' ? '全国' : '関西'}天気を要約`;
    }
  }

  /**
   * 進捗エリアを表示（ボタン周辺）
   */
  showProgressArea(progressArea, progressMessage, progressFill, message, stage) {
    if (!progressArea || !progressMessage || !progressFill) return;
    
    // 進捗エリアを表示
    progressArea.style.display = 'block';
    
    // メッセージを更新
    progressMessage.textContent = message;
    
    // プログレスバーのクラスを更新
    progressFill.className = `progress-fill ${stage}`;
    
    // フェードイン効果
    progressArea.style.opacity = '0';
    setTimeout(() => {
      progressArea.style.opacity = '1';
    }, 10);
  }

  /**
   * 進捗エリアを非表示
   */
  hideProgressArea(progressArea) {
    if (!progressArea) return;
    
    // フェードアウト効果
    progressArea.style.opacity = '0';
    setTimeout(() => {
      progressArea.style.display = 'none';
    }, 300);
  }

  /**
   * 要約生成の進捗状況を表示（レガシー・互換性用）
   */
  updateSummaryProgress(outputElement, message, stage) {
    const progressHtml = `
      <div class="summary-progress">
        <div class="progress-header">
          <i class="fas fa-spinner fa-spin"></i>
          <span class="progress-title">要約生成中...</span>
        </div>
        <div class="progress-stage ${stage}">
          <div class="progress-message">${message}</div>
          <div class="progress-bar">
            <div class="progress-fill ${stage}"></div>
          </div>
        </div>
      </div>
    `;
    
    outputElement.innerHTML = progressHtml;
  }

  /**
   * 12都道府県ピックアップの天気データを取得
   */
  async getMajorPrefecturesWeatherData() {
    try {
      console.log('📊 12都道府県ピックアップの天気データを取得中...');
      
      // 特別な地域マッピング
      const prefectureMapping = {
        '北海道': '北海道 石狩・空知・後志地方',
        '沖縄県': '沖縄本島地方'
      };

      const weatherDataPromises = this.majorPrefectures.map(async (pref) => {
        try {
          console.log(`🔍 ${pref.name} のデータを検索中...`);
          
          // 特別なマッピングがある場合は使用、そうでなければそのまま検索
          const searchName = prefectureMapping[pref.name] || pref.name;
          
          // basic.jsonから該当するデータを検索
          const locationData = this.basicData.find(data => 
            data.name.includes(searchName) || data.name === searchName
          );
          
          if (!locationData) {
            console.warn(`⚠️ ${pref.name} (検索名: ${searchName}) のデータが見つかりません`);
            return this.createFallbackPrefectureWeather(pref);
          }

          console.log(`✅ ${pref.name} データ発見: "${locationData.name}"`);

          // リアルタイム天気データを取得
          if (locationData.overview_url && locationData.forecast_url && 
              !locationData.demoWeather && !locationData.isFallback) {
            try {
              const weatherData = await this.fetchWeatherForLocation(locationData, 0, 1, 'summary');
              return {
                name: pref.name,
                emoji: pref.emoji,
                region: pref.region,
                overview: weatherData.overview,
                forecast: weatherData.forecast,
                isRealData: true
              };
            } catch (apiError) {
              console.warn(`⚠️ ${pref.name} API取得失敗、フォールバック使用:`, apiError.message);
            }
          }

          // フォールバックデータを生成
          return this.createFallbackPrefectureWeather(pref, locationData);

        } catch (error) {
          console.error(`❌ ${pref.name} の天気データ取得エラー:`, error);
          return this.createFallbackPrefectureWeather(pref);
        }
      });

      const results = await Promise.all(weatherDataPromises);
      const validResults = results.filter(result => result !== null);
      
      console.log(`✅ 12都道府県データ取得完了: ${validResults.length}/${this.majorPrefectures.length}件`);
      return validResults;

    } catch (error) {
      console.error('❌ 12都道府県データ取得エラー:', error);
      return [];
    }
  }

  /**
   * フォールバック用の都道府県天気データを作成
   */
  createFallbackPrefectureWeather(pref, locationData = null) {
    const fallbackWeather = this.createFallbackWeather(pref.name);
    
    return {
      name: pref.name,
      emoji: pref.emoji,
      region: pref.region,
      overview: { 
        text: `${pref.name}の天気は${fallbackWeather.weather}です。気温は${fallbackWeather.temp}度程度で、降水確率は${fallbackWeather.pop}%となっています。` 
      },
      forecast: [{
        timeSeries: [{
          areas: [{
            weathers: [fallbackWeather.weather],
            temps: [fallbackWeather.temp, fallbackWeather.temp],
            pops: [fallbackWeather.pop],
            winds: [fallbackWeather.wind]
          }]
        }]
      }],
      isRealData: false
    };
  }

  /**
   * 天気要約用のプロンプトを生成
   * 
   * 【重要な設計思想】
   * このメソッドはLLMに対してJSON形式で「通常版」と「ひらがな版」の両方を
   * 一度に生成するよう指示します。これにより以下の利点があります：
   * 
   * 1. 内容の完全一致保証：同一API呼び出しで生成するため内容が確実に一致
   * 2. パフォーマンス向上：API呼び出し回数が半減（2回→1回）
   * 3. コードの簡潔性：JavaScriptでの複雑な漢字→ひらがな変換ロジックが不要
   * 4. 自然な変換：LLMの自然言語処理能力により、より自然なひらがな変換
   * 
   * 【避けるべき実装】
   * - JavaScriptでの漢字→ひらがな変換マップ（100行以上のコードが必要）
   * - 2段階処理（要約生成→別途ひらがな変換）
   * - 外部ライブラリでの文字変換（依存関係増加、精度問題）
   * 
   * 【LLMを活用する理由】
   * - 文脈を理解した適切な読み方の選択（例：「今日」→「きょう」vs「こんにち」）
   * - 自然な文章構造の維持
   * - メンテナンス性の向上（プロンプト調整のみで改善可能）
   */
  createSummaryPrompt(weatherData, mode) {
    const regionName = mode === 'national' ? '全国（主要12都道府県）' : '関西地方';
    
    let weatherInfo;
    if (mode === 'national' && weatherData.length > 6) {
      // 12都道府県データの場合は地域別にグループ化して表示
      const regionGroups = {};
      weatherData.forEach(data => {
        const region = data.region || '其他';
        if (!regionGroups[region]) regionGroups[region] = [];
        
        const todayWeather = this.parseTodayWeather(data.forecast);
        regionGroups[region].push(`${data.emoji} ${data.name}: ${todayWeather.weather}、${todayWeather.temp}°C、降水確率${todayWeather.pop}%`);
      });
      
      weatherInfo = Object.entries(regionGroups)
        .map(([region, prefectures]) => `【${region}地方】\n${prefectures.join('\n')}`)
        .join('\n\n');
    } else {
      // 従来の表示方法（関西版や6都市データの場合）
      weatherInfo = weatherData.map(data => {
        const todayWeather = this.parseTodayWeather(data.forecast);
        const emoji = data.emoji || '';
        return `${emoji} ${data.name}: ${todayWeather.weather}、気温${todayWeather.temp}°C、降水確率${todayWeather.pop}%`;
      }).join('\n');
    }

    return `以下の${regionName}の天気情報を、わかりやすく要約してください。

${weatherInfo}

要約のポイント:
- 全体的な天気傾向と地域差
- 注意すべき地域や特殊な天気
- 外出・旅行時のアドバイス
- 親しみやすく分かりやすい口調で
${mode === 'national' ? '- 北海道から沖縄まで全国の状況を網羅' : ''}

以下のJSON形式で回答してください：
{
  "summary": "通常の要約文（漢字・カタカナ・ひらがな混じり、朗読に適した自然な日本語で1-2分程度で読める長さ）",
  "hiragana": "音声読み上げ用のひらがな文（summaryと同じ内容をすべてひらがなで表現、漢字・カタカナ・英数字は一切使わない）"
}

※必ず有効なJSONフォーマットで回答してください。`;
  }

  /**
   * エラーメッセージ用の簡易ひらがな変換
   * 
   * 【例外的な実装】
   * この関数のみJavaScriptでの変換を行いますが、これは以下の理由による例外です：
   * 1. エラー時のフォールバック処理（LLM APIが使用不可）
   * 2. 限定的な語彙のみ対象（エラーメッセージの定型文）
   * 3. 完全性よりも可用性を優先
   * 
   * 【通常の要約処理では使用禁止】
   * 通常の天気要約では必ずLLMのJSON出力を使用してください。
   */
  createSimpleHiraganaErrorMessage(text) {
    // エラーメッセージ用の基本的な変換のみ
    return text
      .replace(/申し訳/g, 'もうしわけ')
      .replace(/現在/g, 'げんざい')
      .replace(/天気/g, 'てんき')
      .replace(/要約/g, 'ようやく')
      .replace(/サービス/g, 'さーびす')
      .replace(/一時的/g, 'いちじてき')
      .replace(/利用/g, 'りよう')
      .replace(/各地域/g, 'かくちいき')
      .replace(/詳細/g, 'しょうさい')
      .replace(/天気/g, 'てんき')
      .replace(/情報/g, 'じょうほう')
      .replace(/クリック/g, 'くりっく')
      .replace(/確認/g, 'かくにん');
  }

  /**
   * LLM APIを呼び出してJSON形式で要約とひらがな版を取得
   * 
   * 【設計方針】
   * この関数は必ずJSON形式のレスポンスを期待し、以下の構造で返します：
   * {
   *   summary: "通常の要約文",
   *   hiragana: "ひらがな版要約文"
   * }
   * 
   * 【重要】JavaScriptでの後処理変換は行いません！
   * - LLMの自然言語処理能力を最大限活用
   * - 一度のAPI呼び出しで両方のフォーマットを取得
   * - 内容の完全一致を保証
   */
  async callLLMAPI(prompt) {
    const apiUrl = 'https://nurumayu-worker.skume-bioinfo.workers.dev/';
    
    const systemContent = "あなたは親しみやすい気象予報士です。天気情報を分かりやすく、聞き取りやすい形で要約してください。必ず指定されたJSON形式で回答してください。";

    const messages = [
      {
        role: "system",
        content: systemContent
      },
      {
        role: "user",
        content: prompt
      }
    ];
    
    const requestData = {
      model: "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
      temperature: 0.3, // JSON出力の安定性のため少し低めに設定
      stream: false,
      max_completion_tokens: 2000,
      messages: messages
    };

    try {
      console.log('LLM API呼び出し開始（JSON形式）');
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("LLMレスポンス:", data);
      
      let content = '';
      
      if (data.choices && data.choices.length > 0 && data.choices[0].message) {
        content = data.choices[0].message.content;
      } else if (data.answer) {
        content = data.answer;
      } else {
        throw new Error('レスポンスに期待されるフィールドがありません');
      }

      if (!content || !content.trim()) {
        throw new Error('レスポンス内容が空です');
      }

      // JSONパースを試行
      try {
        // JSONの前後の余分なテキストを除去
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('JSONフォーマットが見つかりません');
        }
        
        const jsonString = jsonMatch[0];
        const parsedJson = JSON.parse(jsonString);
        
        // 必要なフィールドの存在確認
        if (!parsedJson.summary || !parsedJson.hiragana) {
          throw new Error('必要なフィールド（summary、hiragana）が不足しています');
        }
        
        console.log('LLM API呼び出し成功（JSON解析完了）');
        return {
          summary: parsedJson.summary.trim(),
          hiragana: parsedJson.hiragana.trim()
        };
        
      } catch (parseError) {
        console.warn('JSON解析エラー:', parseError.message);
        console.warn('生レスポンス:', content);
        
        // JSON解析に失敗した場合、生テキストから簡易的に抽出
        const summary = content.trim();
        const hiragana = this.createSimpleHiraganaErrorMessage(summary);
        
        return {
          summary: summary,
          hiragana: hiragana
        };
      }

    } catch (error) {
      console.error('LLM API呼び出しエラー:', error);
      
      // エラー時はローカルフォールバック要約を生成
      console.log('ローカルフォールバック要約を生成します');
      return this.generateLocalSummary(prompt);
    }
  }

  /**
   * ローカルでシンプルな要約を生成（APIが利用できない場合のフォールバック）
   * 
   * 【フォールバック戦略】
   * LLM APIが利用できない場合のみ使用される緊急時対応です。
   * この関数もJSON形式で {summary, hiragana} を返し、
   * メイン処理との一貫性を保ちます。
   * 
   * 【注意】ここでも複雑なJavaScript変換は避け、
   * 最小限の基本的な変換のみ実装しています。
   */
  generateLocalSummary(prompt) {
    console.log('ローカル要約生成を実行中...');
    
    // プロンプトから天気情報を抽出
    const lines = prompt.split('\n');
    const weatherInfoLines = lines.filter(line => 
      line.includes('°C') || line.includes('%') || line.includes('風')
    );

    if (weatherInfoLines.length === 0) {
      const fallbackSummary = '現在、天気データを取得中です。しばらくお待ちください。';
      return {
        summary: fallbackSummary,
        hiragana: this.createSimpleHiraganaErrorMessage(fallbackSummary)
      };
    }

    // 基本的な天気要約を生成
    const regionName = prompt.includes('関西') ? '関西地方' : '全国';
    const weatherCount = weatherInfoLines.length;
    
    // 天気傾向を分析
    const sunnyCount = weatherInfoLines.filter(line => line.includes('晴')).length;
    const cloudyCount = weatherInfoLines.filter(line => line.includes('くもり') || line.includes('曇')).length;
    const rainyCount = weatherInfoLines.filter(line => line.includes('雨')).length;
    
    let weatherCondition;
    let hiraganaWeatherCondition;
    
    if (sunnyCount > weatherCount / 2) {
      weatherCondition = '広い範囲で晴れの天気となっており、お出かけ日和となっています。';
      hiraganaWeatherCondition = 'ひろいはんいではれのてんきとなっており、おでかけびよりとなっています。';
    } else if (cloudyCount > weatherCount / 2) {
      weatherCondition = '雲が多い天気ですが、比較的安定した一日となりそうです。';
      hiraganaWeatherCondition = 'くもがおおいてんきですが、ひかくてきあんていしたいちにちとなりそうです。';
    } else if (rainyCount > 0) {
      weatherCondition = '一部の地域で雨の予報が出ており、お出かけの際は傘をお持ちください。';
      hiraganaWeatherCondition = 'いちぶのちいきであめのよほうがでており、おでかけのさいはかさをおもちください。';
    } else {
      weatherCondition = '各地で様々な天気模様となっています。';
      hiraganaWeatherCondition = 'かくちでさまざまなてんきもようとなっています。';
    }

    const summary = `本日の${regionName}の天気をお伝えします。\n\n${weatherCondition}\n\n各地域の詳細な天気情報は、天気カードをクリックしてご確認ください。\n\n※この要約はローカルで生成されました。より詳細な情報については、各地域の天気詳細をご覧ください。`;
    
    const hiraganaSummary = `ほんじつの${regionName === '関西地方' ? 'かんさいちほう' : 'ぜんこく'}のてんきをおつたえします。\n\n${hiraganaWeatherCondition}\n\nかくちいきのしょうさいなてんきじょうほうは、てんきかーどをくりっくしてごかくにんください。\n\n※このようやくはろーかるでせいせいされました。よりしょうさいなじょうほうについては、かくちいきのてんきしょうさいをごらんください。`;

    return {
      summary: summary,
      hiragana: hiraganaSummary
    };
  }

  speakSummary(mode) {
    const output = document.getElementById(`summaryOutput${mode.charAt(0).toUpperCase() + mode.slice(1)}`);
    const button = document.getElementById(`speakSummary${mode.charAt(0).toUpperCase() + mode.slice(1)}`);
    
    if (!output || !button) return;

    // ひらがな版要約を優先的に使用（音声読み上げの精度向上のため）
    let speechText = this.summaryData[mode]?.hiragana || '';
    let displayText = this.summaryData[mode]?.normal || '';
    
    // ひらがな版がない場合は通常版を使用
    if (!speechText) {
      speechText = displayText || output.textContent.trim();
    }
    
    if (!speechText || speechText.includes('ボタンをクリック') || speechText.includes('エラーが発生')) {
      alert('読み上げるテキストがありません。先に要約を生成してください。');
      return;
    }
    
    console.log('音声読み上げ開始 - 表示テキスト:', displayText.substring(0, 50) + '...');
    console.log('音声読み上げ開始 - 読み上げテキスト:', speechText.substring(0, 50) + '...');
    
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
      this.clearHighlight(output);
      return;
    }
    
    // テキストを文に分割（ハイライト用）
    const sentences = this.splitIntoSentences(displayText);
    let currentSentenceIndex = 0;
    
    // 読み上げ用のハイライト要素を作成
    this.createHighlightableText(output, sentences);
    
    // 新しい読み上げを開始
    this.currentSpeech = new SpeechSynthesisUtterance(speechText);
    this.currentSpeech.lang = 'ja-JP';
    this.currentSpeech.rate = 0.9;
    this.currentSpeech.pitch = 1.0;
    this.currentSpeech.volume = 1.0;

    // 読み上げ進行に合わせてハイライト
    let speechProgress = 0;
    const totalLength = speechText.length;
    
    this.currentSpeech.onstart = () => {
      button.classList.add('speak-active');
      button.innerHTML = '<i class="fas fa-stop"></i> 停止';
      this.startHighlightAnimation(output, sentences, speechText);
    };

    this.currentSpeech.onend = () => {
      this.currentSpeech = null;
      this.resetSpeakButton(button);
      this.clearHighlight(output);
    };

    this.currentSpeech.onerror = (event) => {
      console.error('読み上げエラー:', event.error);
      this.currentSpeech = null;
      this.resetSpeakButton(button);
      this.clearHighlight(output);
      alert('読み上げ中にエラーが発生しました。');
    };
    
    speechSynthesis.speak(this.currentSpeech);
  }

  /**
   * テキストを文に分割
   */
  splitIntoSentences(text) {
    // 句点、改行で分割
    return text.split(/[。\n]/).filter(sentence => sentence.trim().length > 0);
  }

  /**
   * ハイライト可能なテキスト要素を作成
   */
  createHighlightableText(output, sentences) {
    const highlightContainer = document.createElement('div');
    highlightContainer.className = 'highlight-container';
    
    sentences.forEach((sentence, index) => {
      const sentenceSpan = document.createElement('span');
      sentenceSpan.className = 'sentence';
      sentenceSpan.setAttribute('data-sentence-index', index);
      sentenceSpan.textContent = sentence + (index < sentences.length - 1 ? '。' : '');
      sentenceSpan.style.cssText = `
        transition: background-color 0.3s ease;
        padding: 2px 4px;
        border-radius: 3px;
      `;
      highlightContainer.appendChild(sentenceSpan);
      
      // 改行の処理
      if (index < sentences.length - 1) {
        highlightContainer.appendChild(document.createElement('br'));
      }
    });
    
    output.innerHTML = '';
    output.appendChild(highlightContainer);
  }

  /**
   * ハイライトアニメーションを開始
   */
  startHighlightAnimation(output, sentences, speechText) {
    const sentenceSpans = output.querySelectorAll('.sentence');
    let currentIndex = 0;
    
    // 読み上げ速度に基づいてタイミングを計算
    const rate = 0.9; // currentSpeech.rateと同じ
    const baseWordsPerMinute = 150; // 日本語の平均読み上げ速度
    const adjustedWPM = baseWordsPerMinute * rate;
    
    const highlightInterval = setInterval(() => {
      if (!this.currentSpeech || currentIndex >= sentences.length) {
        clearInterval(highlightInterval);
        return;
      }
      
      // 前のハイライトをクリア
      sentenceSpans.forEach(span => {
        span.style.backgroundColor = '';
        span.style.color = '';
      });
      
      // 現在の文をハイライト
      if (sentenceSpans[currentIndex]) {
        sentenceSpans[currentIndex].style.backgroundColor = '#ffeb3b';
        sentenceSpans[currentIndex].style.color = '#333';
        
        // スクロール位置を調整
        sentenceSpans[currentIndex].scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
      
      currentIndex++;
    }, sentences.length > 0 ? (speechText.length / sentences.length) * 60 / adjustedWPM * 1000 : 2000);
    
    // 読み上げ終了時にインターバルをクリア
    this.currentSpeech.addEventListener('end', () => {
      clearInterval(highlightInterval);
    });
  }

  /**
   * ハイライトをクリア
   */
  clearHighlight(output) {
    // 元のテキストに戻す
    const displayText = output.querySelector('.highlight-container')?.textContent || output.textContent;
    output.innerHTML = displayText;
  }

  resetSpeakButton(button) {
    button.classList.remove('speak-active');
    button.innerHTML = '<i class="fas fa-volume-up"></i> 音声読み上げ';
  }

  /**
   * 要約をクリア
   */
  clearSummary(mode) {
    // 読み上げ中の場合は停止
    if (this.currentSpeech) {
      speechSynthesis.cancel();
      this.currentSpeech = null;
      
      // 読み上げボタンをリセット
      const button = document.getElementById(`speakSummary${mode.charAt(0).toUpperCase() + mode.slice(1)}`);
      if (button) {
        this.resetSpeakButton(button);
      }
    }
    
    // 確認ダイアログ
    const regionName = mode === 'national' ? '全国' : '関西';
    if (confirm(`${regionName}の要約をクリアしますか？`)) {
      this.clearSummaryData(mode);
      console.log(`${regionName}の要約をクリアしました`);
    }
  }

  showLoading(mode) {
    // 従来の詳細天気データ表示は削除されたため、この関数は無効化
    // 関西都市カードのローディングは loadKansaiCitiesWeather() で処理
    console.log(`ローディング表示: ${mode}版`);
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

  /**
   * 日本地図のJSONデータを読み込んでSVGを生成
   */
  async loadJapanMapData() {
    try {
      console.log('日本地図データを読み込み中...');
      
      // 埋め込みデータを使用（CORS問題を回避）
      if (window.JAPAN_MAP_DATA) {
        console.log('埋め込みデータを使用します');
        const mapData = window.JAPAN_MAP_DATA;
        console.log('日本地図データ読み込み完了:', mapData.dots.length, '個のドット');
        
        // データの検証
        if (!mapData.dots || !Array.isArray(mapData.dots) || mapData.dots.length === 0) {
          throw new Error('埋め込みデータの形式が正しくありません');
        }
        
        this.generateJapanMapSVG(mapData);
        return;
      }
      
      // フォールバック: Fetch APIを試行
      console.log('フォールバック: Fetch APIを試行します');
      console.log('現在のURL:', window.location.href);
      console.log('JSONファイルパス: ./json/japan_dot_map.json');
      
      const response = await fetch('./json/japan_dot_map.json');
      console.log('レスポンス状態:', response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}: 日本地図データの読み込みに失敗しました`);
      }
      
      const mapData = await response.json();
      console.log('日本地図データ読み込み完了:', mapData.dots.length, '個のドット');
      
      // データの検証
      if (!mapData.dots || !Array.isArray(mapData.dots) || mapData.dots.length === 0) {
        throw new Error('JSONデータの形式が正しくありません');
      }
      
      this.generateJapanMapSVG(mapData);
      
    } catch (error) {
      console.error('日本地図データの読み込みエラー:', error);
      console.error('エラーの詳細:', error.message);
      this.showMapLoadError(error.message);
    }
  }

  /**
   * 日本地図のSVGを生成して表示
   */
  generateJapanMapSVG(mapData) {
    const container = document.getElementById('japanDotMapContainer');
    if (!container) return;

    // ローディング表示を削除
    const loadingElement = document.getElementById('loadingMap');
    if (loadingElement) {
      loadingElement.remove();
    }

    // SVG要素を作成
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', mapData.width);
    svg.setAttribute('height', mapData.height);
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svg.style.cssText = `
      border-radius: 8px;
      background: white;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transition: transform 0.3s ease;
    `;

    // ホバー効果を追加
    svg.addEventListener('mouseenter', () => {
      svg.style.transform = 'scale(1.02)';
    });
    svg.addEventListener('mouseleave', () => {
      svg.style.transform = 'scale(1)';
    });

    // 各ドットを描画
    mapData.dots.forEach((dot, index) => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', dot.cx);
      circle.setAttribute('cy', dot.cy);
      circle.setAttribute('r', dot.r);
      circle.setAttribute('fill', dot.fill);
      
      // ドットにホバー効果を追加
      circle.style.cssText = `
        cursor: pointer;
        transition: all 0.2s ease;
      `;
      
      circle.addEventListener('mouseenter', () => {
        circle.setAttribute('r', parseFloat(dot.r) + 1);
        circle.style.filter = 'brightness(1.2)';
      });
      
      circle.addEventListener('mouseleave', () => {
        circle.setAttribute('r', dot.r);
        circle.style.filter = 'brightness(1)';
      });

      // ドットクリック時の処理を無効化
      // circle.addEventListener('click', () => {
      //   this.handleMapDotClick(dot, index);
      // });

      svg.appendChild(circle);
    });

    // タイトル要素は削除（不要な説明を除去）

    // コンテナにSVGを追加
    container.appendChild(svg);

    console.log('日本地図SVGの生成が完了しました');
  }

  /**
   * 地図のドットがクリックされた時の処理
   */
  handleMapDotClick(dot, index) {
    console.log('地図ドットクリック:', { dot, index });
    
    // 将来的にここで地域の詳細天気情報を表示
    // 現在は簡単な情報表示のみ
    const info = `
      座標: (${dot.cx}, ${dot.cy})
      色: ${dot.fill}
      ドット番号: ${index + 1}
    `;
    
    // 簡易的なツールチップ表示
    this.showMapTooltip(dot, info);
  }

  /**
   * 地図上にツールチップを表示
   */
  showMapTooltip(dot, info) {
    // 既存のツールチップを削除
    const existingTooltip = document.getElementById('mapTooltip');
    if (existingTooltip) {
      existingTooltip.remove();
    }

    const tooltip = document.createElement('div');
    tooltip.id = 'mapTooltip';
    tooltip.style.cssText = `
      position: absolute;
      background: rgba(0,0,0,0.8);
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      white-space: pre-line;
      z-index: 1000;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;
    tooltip.textContent = info;

    document.body.appendChild(tooltip);

    // 位置を調整
    const container = document.getElementById('japanDotMapContainer');
    const containerRect = container.getBoundingClientRect();
    const scale = 0.8; // CSS transform: scale(0.8) を考慮
    
    const x = containerRect.left + (dot.cx * scale);
    const y = containerRect.top + (dot.cy * scale);

    tooltip.style.left = `${x + 10}px`;
    tooltip.style.top = `${y - 10}px`;

    // フェードイン
    setTimeout(() => {
      tooltip.style.opacity = '1';
    }, 10);

    // 3秒後に自動削除
    setTimeout(() => {
      if (tooltip.parentNode) {
        tooltip.style.opacity = '0';
        setTimeout(() => {
          if (tooltip.parentNode) {
            tooltip.remove();
          }
        }, 300);
      }
    }, 3000);
  }

  /**
   * 地図読み込みエラー時の表示
   */
  showMapLoadError(errorMessage = '') {
    const container = document.getElementById('japanDotMapContainer');
    if (!container) return;

    container.innerHTML = `
      <div style="text-align: center; color: #dc3545; padding: 2rem;">
        <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
        <p style="margin: 0; font-size: 1.1rem;">日本地図の読み込みに失敗しました</p>
        ${errorMessage ? `<p style="margin: 0.5rem 0; font-size: 0.9rem; color: #666;">${errorMessage}</p>` : ''}
        <p style="margin: 0.5rem 0; font-size: 0.9rem; color: #666;">
          デバッグ情報: ブラウザの開発者ツール（F12）でコンソールを確認してください
        </p>
        <button onclick="window.weatherApp.loadJapanMapData()" style="
          margin-top: 1rem;
          padding: 0.5rem 1rem;
          background: var(--primary);
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
        ">
          <i class="fas fa-redo"></i> 再読み込み
        </button>
      </div>
    `;
  }

  /**
   * 関西地図のJSONデータを読み込んでSVGを生成
   */
  async loadKansaiMapData() {
    try {
      console.log('関西地図データを読み込み中...');
      
      // 埋め込みデータを使用（CORS問題を回避）
      if (window.KANSAI_MAP_DATA) {
        console.log('関西地図埋め込みデータを使用します');
        const mapData = window.KANSAI_MAP_DATA;
        console.log('関西地図データ読み込み完了:', mapData.dots.length, '個のドット');
        
        // データの検証
        if (!mapData.dots || !Array.isArray(mapData.dots) || mapData.dots.length === 0) {
          throw new Error('関西地図埋め込みデータの形式が正しくありません');
        }
        
        this.generateKansaiMapSVG(mapData);
        return;
      }
      
      // フォールバック: Fetch APIを試行
      console.log('フォールバック: 関西地図Fetch APIを試行します');
      
      const response = await fetch('./json/kansai_dot_map.json');
      console.log('関西地図レスポンス状態:', response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}: 関西地図データの読み込みに失敗しました`);
      }
      
      const mapData = await response.json();
      console.log('関西地図データ読み込み完了:', mapData.dots.length, '個のドット');
      
      // データの検証
      if (!mapData.dots || !Array.isArray(mapData.dots) || mapData.dots.length === 0) {
        throw new Error('関西地図JSONデータの形式が正しくありません');
      }
      
      this.generateKansaiMapSVG(mapData);
      
    } catch (error) {
      console.error('関西地図データの読み込みエラー:', error);
      console.error('エラーの詳細:', error.message);
      this.showKansaiMapLoadError(error.message);
    }
  }

  /**
   * 関西地図のSVGを生成して表示
   */
  generateKansaiMapSVG(mapData) {
    const container = document.getElementById('kansaiDotMapContainer');
    if (!container) return;

    // ローディング表示を削除
    const loadingElement = document.getElementById('loadingKansaiMap');
    if (loadingElement) {
      loadingElement.remove();
    }

    // SVG要素を作成
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', mapData.width);
    svg.setAttribute('height', mapData.height);
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svg.style.cssText = `
      border-radius: 8px;
      background: white;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transition: transform 0.3s ease;
    `;

    // ホバー効果を追加
    svg.addEventListener('mouseenter', () => {
      svg.style.transform = 'scale(1.02)';
    });
    svg.addEventListener('mouseleave', () => {
      svg.style.transform = 'scale(1)';
    });

    // 各ドットを描画
    mapData.dots.forEach((dot, index) => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', dot.cx);
      circle.setAttribute('cy', dot.cy);
      circle.setAttribute('r', dot.r);
      circle.setAttribute('fill', dot.fill);
      
      // インタラクティブ機能のためのデータ属性を追加
      circle.setAttribute('data-x', dot.data_x);
      circle.setAttribute('data-y', dot.data_y);
      circle.setAttribute('data-color', dot.data_color);
      
      // ドットにホバー効果を追加
      circle.style.cssText = `
        cursor: pointer;
        transition: all 0.2s ease;
      `;
      
      circle.addEventListener('mouseenter', () => {
        circle.setAttribute('r', parseFloat(dot.r) + 1);
        circle.style.filter = 'brightness(1.2)';
      });
      
      circle.addEventListener('mouseleave', () => {
        circle.setAttribute('r', dot.r);
        circle.style.filter = 'brightness(1)';
      });

      // ドットクリック時の処理を無効化
      // circle.addEventListener('click', () => {
      //   this.handleKansaiMapDotClick(dot, index);
      // });

      svg.appendChild(circle);
    });

    // コンテナにSVGを追加
    container.appendChild(svg);

    console.log('関西地図SVGの生成が完了しました');
  }

  /**
   * 関西地図のドットがクリックされた時の処理
   */
  handleKansaiMapDotClick(dot, index) {
    console.log('関西地図ドットクリック:', { dot, index });
    
    const info = `
      座標: (${dot.cx}, ${dot.cy})
      グリッド: (${dot.data_x}, ${dot.data_y})
      色: ${dot.data_color}
      ドット番号: ${index + 1}
    `;
    
    // 簡易的なツールチップ表示
    this.showKansaiMapDetailTooltip(dot, info);
  }

  /**
   * 関西地図上にツールチップを表示
   */
  showKansaiMapTooltip(element, dot) {
    // 既存のツールチップを削除
    const existingTooltip = document.getElementById('kansaiMapTooltip');
    if (existingTooltip) {
      existingTooltip.remove();
    }

    const tooltip = document.createElement('div');
    tooltip.id = 'kansaiMapTooltip';
    tooltip.style.cssText = `
      position: absolute;
      background: rgba(0,0,0,0.8);
      color: white;
      padding: 6px 10px;
      border-radius: 4px;
      font-size: 12px;
      white-space: nowrap;
      z-index: 1000;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;
    tooltip.textContent = `X: ${dot.data_x}, Y: ${dot.data_y} | Color: ${dot.data_color}`;

    document.body.appendChild(tooltip);

    // 位置を調整
    const container = document.getElementById('kansaiDotMapContainer');
    const containerRect = container.getBoundingClientRect();
    
    const x = containerRect.left + dot.cx;
    const y = containerRect.top + dot.cy;

    tooltip.style.left = `${x + 10}px`;
    tooltip.style.top = `${y - 10}px`;

    // フェードイン
    setTimeout(() => {
      tooltip.style.opacity = '1';
    }, 10);
  }

  /**
   * 関西地図ツールチップを非表示
   */
  hideKansaiMapTooltip() {
    const tooltip = document.getElementById('kansaiMapTooltip');
    if (tooltip) {
      tooltip.style.opacity = '0';
      setTimeout(() => {
        if (tooltip.parentNode) {
          tooltip.remove();
        }
      }, 300);
    }
  }

  /**
   * 関西地図詳細ツールチップを表示
   */
  showKansaiMapDetailTooltip(dot, info) {
    // 既存のツールチップを削除
    const existingTooltip = document.getElementById('kansaiMapDetailTooltip');
    if (existingTooltip) {
      existingTooltip.remove();
    }

    const tooltip = document.createElement('div');
    tooltip.id = 'kansaiMapDetailTooltip';
    tooltip.style.cssText = `
      position: absolute;
      background: rgba(0,0,0,0.9);
      color: white;
      padding: 12px 16px;
      border-radius: 6px;
      font-size: 12px;
      white-space: pre-line;
      z-index: 1000;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s ease;
      max-width: 200px;
    `;
    tooltip.textContent = info;

    document.body.appendChild(tooltip);

    // 位置を調整
    const container = document.getElementById('kansaiDotMapContainer');
    const containerRect = container.getBoundingClientRect();
    
    const x = containerRect.left + dot.cx;
    const y = containerRect.top + dot.cy;

    tooltip.style.left = `${x + 15}px`;
    tooltip.style.top = `${y - 15}px`;

    // フェードイン
    setTimeout(() => {
      tooltip.style.opacity = '1';
    }, 10);

    // 5秒後に自動削除
    setTimeout(() => {
      if (tooltip.parentNode) {
        tooltip.style.opacity = '0';
        setTimeout(() => {
          if (tooltip.parentNode) {
            tooltip.remove();
          }
        }, 300);
      }
    }, 5000);
  }

  /**
   * 関西地図読み込みエラー時の表示
   */
  showKansaiMapLoadError(errorMessage = '') {
    const container = document.getElementById('kansaiDotMapContainer');
    if (!container) return;

    container.innerHTML = `
      <div style="text-align: center; color: #dc3545; padding: 2rem;">
        <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
        <p style="margin: 0; font-size: 1.1rem;">関西地図の読み込みに失敗しました</p>
        ${errorMessage ? `<p style="margin: 0.5rem 0; font-size: 0.9rem; color: #666;">${errorMessage}</p>` : ''}
        <p style="margin: 0.5rem 0; font-size: 0.9rem; color: #666;">
          デバッグ情報: ブラウザの開発者ツール（F12）でコンソールを確認してください
        </p>
        <button onclick="window.weatherApp.loadKansaiMapData()" style="
          margin-top: 1rem;
          padding: 0.5rem 1rem;
          background: var(--primary);
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
        ">
          <i class="fas fa-redo"></i> 再読み込み
        </button>
      </div>
    `;
  }

  /**
   * 主要都市の天気情報を読み込んで表示
   */
  async loadMajorCitiesWeather() {
    try {
      console.log('🏙️ 主要都市の天気データを読み込み中...');
      
      // 主要都市のデータを定義（basic.jsonとのマッピングを考慮）
      const majorCities = [
        { 
          name: '北海道', 
          region: '北海道', 
          icon: '🏔️',
          searchKeys: ['北海道 石狩・空知・後志地方'] // 札幌を含む地域
        },
        { 
          name: '東京都', 
          region: '関東', 
          icon: '🏙️',
          searchKeys: ['東京都']
        },
        { 
          name: '愛知県', 
          region: '中部', 
          icon: '🏭',
          searchKeys: ['愛知県']
        },
        { 
          name: '大阪府', 
          region: '関西', 
          icon: '🏯',
          searchKeys: ['大阪府']
        },
        { 
          name: '福岡県', 
          region: '九州', 
          icon: '🌸',
          searchKeys: ['福岡県']
        },
        { 
          name: '沖縄県', 
          region: '沖縄', 
          icon: '🏝️',
          searchKeys: ['沖縄本島地方', '沖縄県']
        }
      ];

      const container = document.getElementById('majorCitiesWeather');
      if (!container) return;

      // ローディング表示
      container.innerHTML = `
        <div class="loading" style="grid-column: 1 / -1;">
          <i class="fas fa-spinner"></i>
          <p>主要都市の天気データを取得中...</p>
        </div>
      `;

      console.log('🔍 基本データ検索開始:', this.basicData ? this.basicData.length : 0, '件');

      // 各都市の天気データを取得
      const cityWeatherPromises = majorCities.map(async (city) => {
        try {
          console.log(`🔎 ${city.name} の都市データを検索中...`);
          
          // basic.jsonから該当する都市データを検索（複数の検索キーを試行）
          let cityData = null;
          for (const searchKey of city.searchKeys) {
            cityData = this.basicData.find(data => data.name.includes(searchKey));
            if (cityData) {
              console.log(`✅ ${city.name} マッチ: "${cityData.name}" (検索キー: "${searchKey}")`);
              break;
            }
          }
          
          if (!cityData) {
            console.warn(`⚠️ ${city.name}のデータが見つかりません (検索キー: ${city.searchKeys.join(', ')})`);
            console.log('🔍 利用可能なデータ:', this.basicData.slice(0, 5).map(d => d.name));
            return this.createFallbackCityWeather(city);
          }

          console.log(`📊 ${city.name} データ詳細:`, {
            name: cityData.name,
            overview_url: cityData.overview_url,
            hasDemo: !!cityData.demoWeather,
            isFallback: !!cityData.isFallback
          });

          // 実際のAPIデータを使用してリアルタイム取得を試行
          if (cityData.overview_url && cityData.overview_url !== "demo" && !cityData.demoWeather && !cityData.isFallback) {
            console.log(`🌐 ${city.name} リアルタイムAPI取得を試行`);
            try {
              const weatherData = await this.fetchWeatherForLocation(cityData, 0, 1, 'major');
              const todayWeather = this.parseTodayWeather(weatherData.forecast);
              
              return {
                ...city,
                weather: todayWeather.weather,
                temp: todayWeather.temp,
                pop: todayWeather.pop,
                wind: todayWeather.wind,
                isRealData: true,
                cityData: cityData
              };
            } catch (apiError) {
              console.warn(`⚠️ ${city.name} API取得失敗、フォールバックを使用:`, apiError.message);
            }
          }

          // デモデータまたはフォールバックデータを使用
          if (cityData.demoWeather) {
            console.log(`📋 ${city.name} デモデータを使用`);
            return {
              ...city,
              weather: cityData.demoWeather.weather,
              temp: cityData.demoWeather.temp,
              pop: cityData.demoWeather.pop,
              wind: cityData.demoWeather.wind,
              isRealData: false,
              cityData: cityData
            };
          } else {
            // フォールバックデータを生成
            console.log(`🔄 ${city.name} フォールバックデータを生成`);
            const fallbackWeather = this.createFallbackWeather(city.name);
            return {
              ...city,
              weather: fallbackWeather.weather,
              temp: fallbackWeather.temp,
              pop: fallbackWeather.pop,
              wind: fallbackWeather.wind,
              isRealData: false,
              cityData: cityData
            };
          }
        } catch (error) {
          console.error(`❌ ${city.name}の天気データ取得エラー:`, error);
          return this.createFallbackCityWeather(city);
        }
      });

      const cityWeatherData = await Promise.all(cityWeatherPromises);
      this.displayMajorCitiesWeather(cityWeatherData);
      this.updateLastUpdated('national');

      console.log('✅ 主要都市の天気データ読み込み完了');

    } catch (error) {
      console.error('❌ 主要都市天気データ読み込みエラー:', error);
      this.showMajorCitiesError(error.message);
    }
  }

  /**
   * フォールバック用の都市天気データを作成
   */
  createFallbackCityWeather(city) {
    const fallbackWeather = this.createFallbackWeather(city.name);
    return {
      ...city,
      weather: fallbackWeather.weather,
      temp: fallbackWeather.temp,
      pop: fallbackWeather.pop,
      wind: fallbackWeather.wind,
      isRealData: false,
      cityData: null
    };
  }

  /**
   * 主要都市の天気情報を表示
   */
  displayMajorCitiesWeather(cityWeatherData) {
    const container = document.getElementById('majorCitiesWeather');
    if (!container) return;

    container.innerHTML = cityWeatherData.map(city => this.createMajorCityCard(city)).join('');

    // カードクリックイベントを追加
    container.querySelectorAll('.major-city-card').forEach((card, index) => {
      card.addEventListener('click', () => {
        this.showMajorCityDetails(cityWeatherData[index]);
      });
    });
  }

  /**
   * 主要都市カードのHTMLを生成
   */
  createMajorCityCard(city) {
    const weatherIcon = this.getWeatherIcon(city.weather);
    const weatherClass = this.getWeatherClass(city.weather);
    
    // データタイプ表示
    const dataTypeInfo = city.isRealData ? 
      `<div class="data-type real-data">🌐 リアルタイム</div>` : 
      `<div class="data-type demo-data">📋 フォールバック</div>`;

    return `
      <div class="major-city-card ${weatherClass}" data-city="${city.name}">
        ${dataTypeInfo}
        <div class="city-header">
          <div class="city-name">${city.icon} ${city.name}</div>
          <div class="city-weather-icon">${weatherIcon}</div>
        </div>
        <div class="city-temp">${city.temp}°C</div>
        <div class="city-weather-desc">${city.weather}</div>
        <div class="city-details">
          <span><i class="fas fa-eye"></i> ${city.pop}%</span>
          <span><i class="fas fa-wind"></i> ${city.wind.split(' ')[0]}</span>
        </div>
      </div>
    `;
  }

  /**
   * 主要都市の詳細情報を表示
   */
  async showMajorCityDetails(city) {
    const modal = document.getElementById('weatherModal');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');

    title.textContent = `${city.icon} ${city.name} - 詳細天気情報`;
    
    // ローディング表示
    body.innerHTML = `
      <div style="text-align: center; padding: 2rem;">
        <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary);"></i>
        <p style="margin-top: 1rem;">詳細な天気データを取得中...</p>
      </div>
    `;
    
    modal.style.display = 'block';
    
    try {
      // basic.jsonから該当する都市データを検索
      const cityData = this.basicData ? this.basicData.find(data => data.name.includes(city.name)) : null;
      
      if (!cityData) {
        throw new Error('都市データが見つかりません');
      }
      
      // 実際のAPIからデータを取得
      const detailWeatherData = await this.fetchDetailedWeatherData(cityData);
      
      // 詳細データを表示
      this.displayDetailedCityWeather(detailWeatherData, cityData);
      
    } catch (error) {
      console.error('詳細天気データ取得エラー:', error);
      
      // エラー時はフォールバックデータで表示
      const cityData = this.basicData ? this.basicData.find(data => data.name.includes(city.name)) : null;
      
      body.innerHTML = `
        <div class="weather-detail-grid">
          <div class="weather-detail-item">
            <div class="weather-detail-label">現在の天気</div>
            <div class="weather-detail-value">${city.weather}</div>
          </div>
          <div class="weather-detail-item">
            <div class="weather-detail-label">気温</div>
            <div class="weather-detail-value">${city.temp}°C</div>
          </div>
          <div class="weather-detail-item">
            <div class="weather-detail-label">降水確率</div>
            <div class="weather-detail-value">${city.pop}%</div>
          </div>
          <div class="weather-detail-item">
            <div class="weather-detail-label">風</div>
            <div class="weather-detail-value">${city.wind}</div>
          </div>
          <div class="weather-detail-item">
            <div class="weather-detail-label">地域</div>
            <div class="weather-detail-value">${city.region}</div>
          </div>
          <div class="weather-detail-item">
            <div class="weather-detail-label">天気アイコン</div>
            <div class="weather-detail-value">${this.getWeatherIcon(city.weather)}</div>
          </div>
        </div>
        
        <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 1rem; margin: 1rem 0;">
          <i class="fas fa-exclamation-triangle" style="color: #856404;"></i>
          <strong style="color: #856404;">API取得エラー</strong>
          <p style="margin: 0.5rem 0 0 0; color: #856404;">詳細データの取得に失敗しました。フォールバックデータを表示しています。</p>
          <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem; color: #856404;">エラー: ${error.message}</p>
        </div>
        
        <h4>🌤️ 天気概要（フォールバック）</h4>
        <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; line-height: 1.6;">
          ${city.name}の現在の天気は${city.weather}です。気温は${city.temp}度、降水確率は${city.pop}%となっています。
          風は${city.wind}の予報です。
        </div>
        
        <p style="margin-top: 1rem; font-size: 0.9rem; color: #666;">
          <i class="fas fa-clock"></i> 最終更新: ${new Date().toLocaleString('ja-JP')}
          ${cityData && cityData.overview_url && cityData.overview_url !== 'demo' ? 
            `<br><i class="fas fa-link"></i> <a href="${cityData.overview_url}" target="_blank" style="color: #007bff; text-decoration: none;">概要API</a> | <a href="${cityData.forecast_url}" target="_blank" style="color: #007bff; text-decoration: none;">予報API</a>` : 
            '<br><i class="fas fa-info-circle"></i> フォールバックデータ使用中'
          }
        </p>
      `;
    }
  }

  /**
   * 詳細な天気データをAPIから取得
   */
  async fetchDetailedWeatherData(locationData) {
    try {
      console.log(`🔍 詳細天気データ取得開始: ${locationData.name}`);
      
      // デモデータの場合はAPI呼び出しをスキップ
      if (locationData.overview_url === "demo" || locationData.demoWeather) {
        console.log(`📋 デモデータを使用: ${locationData.name}`);
        
        const demoWeather = locationData.demoWeather || this.createFallbackWeather(locationData.name);
        
        return {
          name: locationData.name,
          overview: {
            text: `${locationData.name}の天気概要です。${demoWeather.weather}の予報となっています。`,
            reportDatetime: new Date().toISOString()
          },
          forecast: [{
            timeSeries: [{
              areas: [{
                weathers: [demoWeather.weather],
                winds: [demoWeather.wind],
                temps: [demoWeather.temp, demoWeather.temp],
                pops: [demoWeather.pop]
              }]
            }]
          }],
          location: locationData,
          isDemo: true
        };
      }

      // CORSプロキシを使用してAPIを呼び出し
      const proxyUrl = 'https://api.cors.lol/?url=';
      
      console.log(`🌐 詳細API取得URL: ${locationData.overview_url}`);
      console.log(`📊 詳細予報URL: ${locationData.forecast_url}`);
      console.log(`🔄 プロキシ経由でリアルタイムAPI取得開始...`);
      
      const [overviewResponse, forecastResponse] = await Promise.all([
        fetch(proxyUrl + encodeURIComponent(locationData.overview_url), {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          }
        }),
        fetch(proxyUrl + encodeURIComponent(locationData.forecast_url), {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          }
        })
      ]);

      console.log(`📡 詳細APIレスポンス状態: 概要=${overviewResponse.status}, 予報=${forecastResponse.status}`);

      if (!overviewResponse.ok || !forecastResponse.ok) {
        throw new Error(`詳細API取得失敗: ${locationData.name} (概要:${overviewResponse.status}, 予報:${forecastResponse.status})`);
      }

      const overviewData = await overviewResponse.json();
      const forecastData = await forecastResponse.json();

      console.log(`✅ 詳細JSON解析開始: ${locationData.name}`);

      const overview = overviewData;
      const forecast = forecastData;

      console.log(`🎉 詳細天気データ取得完了: ${locationData.name}`);
      
      return {
        name: locationData.name,
        overview,
        forecast,
        location: locationData,
        isDemo: false
      };

    } catch (error) {
      console.error(`❌ ${locationData.name}の詳細データ取得エラー:`, error.message);
      console.error(`🔍 エラー詳細:`, error);
      throw error;
    }
  }

  /**
   * 詳細な天気データを表示
   */
  displayDetailedCityWeather(weatherData, locationData) {
    const modal = document.getElementById('weatherModal');
    const body = document.getElementById('modalBody');
    
    if (!body) return;

    // 天気情報を解析
    const todayWeather = this.parseTodayWeather(weatherData.forecast);
    
    // 概要テキストを準備
    let overviewText = weatherData.overview.text || `${weatherData.name}の天気情報です。`;
    
    // 長すぎる場合は短縮
    if (overviewText.length > 300) {
      overviewText = overviewText.substring(0, 300) + '...';
    }

    body.innerHTML = `
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
        <div class="weather-detail-item">
          <div class="weather-detail-label">天気アイコン</div>
          <div class="weather-detail-value">${this.getWeatherIcon(todayWeather.weather)}</div>
        </div>
        <div class="weather-detail-item">
          <div class="weather-detail-label">データソース</div>
          <div class="weather-detail-value">${weatherData.isDemo ? 'デモデータ' : 'リアルタイムAPI'}</div>
        </div>
      </div>
      
              ${weatherData.isDemo || weatherData.isError ? 
        `<div style="background: #d1ecf1; border: 1px solid #bee5eb; border-radius: 8px; padding: 1rem; margin: 1rem 0;">
          <i class="fas fa-info-circle" style="color: #0c5460;"></i>
          <strong style="color: #0c5460;">${weatherData.isError ? 'フォールバックデータ' : 'デモデータ'}使用中</strong>
          <p style="margin: 0.5rem 0 0 0; color: #0c5460;">${weatherData.isError ? 'APIエラーのため代替データを表示しています。' : 'このデータはデモ用のサンプルデータです。'}</p>
        </div>` : 
        `<div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; padding: 1rem; margin: 1rem 0;">
          <i class="fas fa-check-circle" style="color: #155724;"></i>
          <strong style="color: #155724;">リアルタイムデータ</strong> - 気象庁APIから取得した最新データです。最終更新: ${new Date(weatherData.overview.reportDatetime).toLocaleString('ja-JP')}
        </div>`
      }
      
      <h4>🌤️ 気象庁概要</h4>
      <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; white-space: pre-wrap; line-height: 1.6;">
${overviewText}
      </div>
      
      <p style="margin-top: 1rem; font-size: 0.9rem; color: #666;">
        <i class="fas fa-clock"></i> 最終更新: ${new Date(weatherData.overview.reportDatetime).toLocaleString('ja-JP')}
        ${locationData && locationData.overview_url && locationData.overview_url !== 'demo' ? 
          `<br><i class="fas fa-link"></i> <a href="${locationData.overview_url}" target="_blank" style="color: #007bff; text-decoration: none;">概要API</a> | <a href="${locationData.forecast_url}" target="_blank" style="color: #007bff; text-decoration: none;">予報API</a>` : 
          '<br><i class="fas fa-info-circle"></i> デモデータ使用中'
        }
      </p>
    `;
  }

  /**
   * 主要都市天気データ読み込みエラー時の表示
   */
  showMajorCitiesError(errorMessage) {
    const container = document.getElementById('majorCitiesWeather');
    if (!container) return;

    container.innerHTML = `
      <div class="error-message" style="grid-column: 1 / -1;">
        <i class="fas fa-exclamation-triangle"></i>
        <p>主要都市の天気データを取得できませんでした</p>
        <p style="font-size: 0.9rem;">エラー: ${errorMessage}</p>
        <button class="button" onclick="window.weatherApp.loadMajorCitiesWeather()">
          <i class="fas fa-redo"></i> 再試行
        </button>
      </div>
    `;
  }

  /**
   * 関西都市の天気情報を読み込んで表示
   */
  async loadKansaiCitiesWeather() {
    try {
      console.log('🏛️ 関西都市の天気データを読み込み中...');
      
      // 関西都市のデータを定義（basic.jsonとのマッピングを考慮）
      const kansaiCities = [
        { 
          name: '大阪府', 
          region: '関西', 
          icon: '🏯',
          searchKeys: ['大阪府']
        },
        { 
          name: '京都府', 
          region: '関西', 
          icon: '🏛️',
          searchKeys: ['京都府']
        },
        { 
          name: '兵庫県', 
          region: '関西', 
          icon: '⛩️',
          searchKeys: ['兵庫県']
        },
        { 
          name: '和歌山県', 
          region: '関西', 
          icon: '🍊',
          searchKeys: ['和歌山県']
        },
        { 
          name: '奈良県', 
          region: '関西', 
          icon: '🦌',
          searchKeys: ['奈良県']
        },
        { 
          name: '滋賀県', 
          region: '関西', 
          icon: '🏔️',
          searchKeys: ['滋賀県']
        }
      ];

      const container = document.getElementById('kansaiCitiesWeather');
      if (!container) return;

      // ローディング表示
      container.innerHTML = `
        <div class="loading" style="grid-column: 1 / -1;">
          <i class="fas fa-spinner"></i>
          <p>関西都市の天気データを取得中...</p>
        </div>
      `;

      console.log('🔍 関西都市データ検索開始:', this.basicData ? this.basicData.length : 0, '件');

      // 各都市の天気データを取得
      const cityWeatherPromises = kansaiCities.map(async (city) => {
        try {
          console.log(`🔎 ${city.name} の都市データを検索中...`);
          
          // basic.jsonから該当する都市データを検索（複数の検索キーを試行）
          let cityData = null;
          for (const searchKey of city.searchKeys) {
            cityData = this.basicData.find(data => data.name.includes(searchKey));
            if (cityData) {
              console.log(`✅ ${city.name} マッチ: "${cityData.name}" (検索キー: "${searchKey}")`);
              break;
            }
          }
          
          if (!cityData) {
            console.warn(`⚠️ ${city.name}のデータが見つかりません (検索キー: ${city.searchKeys.join(', ')})`);
            return this.createFallbackCityWeather(city);
          }

          console.log(`📊 ${city.name} データ詳細:`, {
            name: cityData.name,
            overview_url: cityData.overview_url,
            hasDemo: !!cityData.demoWeather,
            isFallback: !!cityData.isFallback
          });

          // 実際のAPIデータを使用してリアルタイム取得を試行
          if (cityData.overview_url && cityData.overview_url !== "demo" && !cityData.demoWeather && !cityData.isFallback) {
            console.log(`🌐 ${city.name} リアルタイムAPI取得を試行`);
            try {
              const weatherData = await this.fetchWeatherForLocation(cityData, 0, 1, 'kansai');
              const todayWeather = this.parseTodayWeather(weatherData.forecast);
              
              return {
                ...city,
                weather: todayWeather.weather,
                temp: todayWeather.temp,
                pop: todayWeather.pop,
                wind: todayWeather.wind,
                isRealData: true,
                cityData: cityData
              };
            } catch (apiError) {
              console.warn(`⚠️ ${city.name} API取得失敗、フォールバックを使用:`, apiError.message);
            }
          }

          // デモデータまたはフォールバックデータを使用
          if (cityData.demoWeather) {
            console.log(`📋 ${city.name} デモデータを使用`);
            return {
              ...city,
              weather: cityData.demoWeather.weather,
              temp: cityData.demoWeather.temp,
              pop: cityData.demoWeather.pop,
              wind: cityData.demoWeather.wind,
              isRealData: false,
              cityData: cityData
            };
          } else {
            // フォールバックデータを生成
            console.log(`🔄 ${city.name} フォールバックデータを生成`);
            const fallbackWeather = this.createFallbackWeather(city.name);
            return {
              ...city,
              weather: fallbackWeather.weather,
              temp: fallbackWeather.temp,
              pop: fallbackWeather.pop,
              wind: fallbackWeather.wind,
              isRealData: false,
              cityData: cityData
            };
          }
        } catch (error) {
          console.error(`❌ ${city.name}の天気データ取得エラー:`, error);
          return this.createFallbackCityWeather(city);
        }
      });

      const cityWeatherData = await Promise.all(cityWeatherPromises);
      this.displayKansaiCitiesWeather(cityWeatherData);
      this.updateLastUpdated('kansai');

      console.log('✅ 関西都市の天気データ読み込み完了');

    } catch (error) {
      console.error('❌ 関西都市天気データ読み込みエラー:', error);
      this.showKansaiCitiesError(error.message);
    }
  }

  /**
   * 関西都市の天気情報を表示
   */
  displayKansaiCitiesWeather(cityWeatherData) {
    const container = document.getElementById('kansaiCitiesWeather');
    if (!container) return;

    container.innerHTML = cityWeatherData.map(city => this.createKansaiCityCard(city)).join('');

    // カードクリックイベントを追加
    container.querySelectorAll('.kansai-city-card').forEach((card, index) => {
      card.addEventListener('click', () => {
        this.showKansaiCityDetails(cityWeatherData[index]);
      });
    });
  }

  /**
   * 関西都市カードのHTMLを生成
   */
  createKansaiCityCard(city) {
    const weatherIcon = this.getWeatherIcon(city.weather);
    const weatherClass = this.getWeatherClass(city.weather);
    
    // データタイプ表示
    const dataTypeInfo = city.isRealData ? 
      `<div class="data-type real-data">🌐 リアルタイム</div>` : 
      `<div class="data-type demo-data">📋 フォールバック</div>`;

    return `
      <div class="kansai-city-card ${weatherClass}" data-city="${city.name}">
        ${dataTypeInfo}
        <div class="city-header">
          <div class="city-name">${city.icon} ${city.name}</div>
          <div class="city-weather-icon">${weatherIcon}</div>
        </div>
        <div class="city-temp">${city.temp}°C</div>
        <div class="city-weather-desc">${city.weather}</div>
        <div class="city-details">
          <span><i class="fas fa-eye"></i> ${city.pop}%</span>
          <span><i class="fas fa-wind"></i> ${city.wind.split(' ')[0]}</span>
        </div>
      </div>
    `;
  }

  /**
   * 関西都市の詳細情報を表示
   */
  async showKansaiCityDetails(city) {
    const modal = document.getElementById('weatherModal');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');

    title.textContent = `${city.icon} ${city.name} - 詳細天気情報`;
    
    // ローディング表示
    body.innerHTML = `
      <div style="text-align: center; padding: 2rem;">
        <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary);"></i>
        <p style="margin-top: 1rem;">詳細な天気データを取得中...</p>
      </div>
    `;
    
    modal.style.display = 'block';
    
    try {
      // basic.jsonから該当する都市データを検索
      const cityData = this.basicData ? this.basicData.find(data => data.name.includes(city.name)) : null;
      
      if (!cityData) {
        throw new Error('都市データが見つかりません');
      }
      
      // 実際のAPIからデータを取得
      const detailWeatherData = await this.fetchDetailedWeatherData(cityData);
      
      // 詳細データを表示
      this.displayDetailedCityWeather(detailWeatherData, cityData);
      
    } catch (error) {
      console.error('詳細天気データ取得エラー:', error);
      
      // エラー時はフォールバックデータで表示
      const cityData = this.basicData ? this.basicData.find(data => data.name.includes(city.name)) : null;
      
      body.innerHTML = `
        <div class="weather-detail-grid">
          <div class="weather-detail-item">
            <div class="weather-detail-label">現在の天気</div>
            <div class="weather-detail-value">${city.weather}</div>
          </div>
          <div class="weather-detail-item">
            <div class="weather-detail-label">気温</div>
            <div class="weather-detail-value">${city.temp}°C</div>
          </div>
          <div class="weather-detail-item">
            <div class="weather-detail-label">降水確率</div>
            <div class="weather-detail-value">${city.pop}%</div>
          </div>
          <div class="weather-detail-item">
            <div class="weather-detail-label">風</div>
            <div class="weather-detail-value">${city.wind}</div>
          </div>
          <div class="weather-detail-item">
            <div class="weather-detail-label">地域</div>
            <div class="weather-detail-value">${city.region}</div>
          </div>
          <div class="weather-detail-item">
            <div class="weather-detail-label">天気アイコン</div>
            <div class="weather-detail-value">${this.getWeatherIcon(city.weather)}</div>
          </div>
        </div>
        
        <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 1rem; margin: 1rem 0;">
          <i class="fas fa-exclamation-triangle" style="color: #856404;"></i>
          <strong style="color: #856404;">API取得エラー</strong>
          <p style="margin: 0.5rem 0 0 0; color: #856404;">詳細データの取得に失敗しました。フォールバックデータを表示しています。</p>
          <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem; color: #856404;">エラー: ${error.message}</p>
        </div>
        
        <h4>🌤️ 天気概要（フォールバック）</h4>
        <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; line-height: 1.6;">
          ${city.name}の現在の天気は${city.weather}です。気温は${city.temp}度、降水確率は${city.pop}%となっています。
          風は${city.wind}の予報です。
        </div>
        
        <p style="margin-top: 1rem; font-size: 0.9rem; color: #666;">
          <i class="fas fa-clock"></i> 最終更新: ${new Date().toLocaleString('ja-JP')}
          ${cityData && cityData.overview_url && cityData.overview_url !== 'demo' ? 
            `<br><i class="fas fa-link"></i> <a href="${cityData.overview_url}" target="_blank" style="color: #007bff; text-decoration: none;">概要API</a> | <a href="${cityData.forecast_url}" target="_blank" style="color: #007bff; text-decoration: none;">予報API</a>` : 
            '<br><i class="fas fa-info-circle"></i> フォールバックデータ使用中'
          }
        </p>
      `;
    }
  }

  /**
   * 関西都市天気データ読み込みエラー時の表示
   */
  showKansaiCitiesError(errorMessage) {
    const container = document.getElementById('kansaiCitiesWeather');
    if (!container) return;

    container.innerHTML = `
      <div class="error-message" style="grid-column: 1 / -1;">
        <i class="fas fa-exclamation-triangle"></i>
        <p>関西都市の天気データを取得できませんでした</p>
        <p style="font-size: 0.9rem;">エラー: ${errorMessage}</p>
        <button class="button" onclick="window.weatherApp.loadKansaiCitiesWeather()">
          <i class="fas fa-redo"></i> 再試行
        </button>
      </div>
    `;
  }

  /**
   * 要約データをlocalStorageに保存
   */
  saveSummaryData() {
    try {
      const summaryToSave = {
        national: this.summaryData.national,
        kansai: this.summaryData.kansai,
        timestamp: Date.now()
      };
      localStorage.setItem('weatherApp_summaryData', JSON.stringify(summaryToSave));
      console.log('要約データを保存しました');
    } catch (error) {
      console.warn('要約データの保存に失敗:', error);
    }
  }

  /**
   * localStorageから要約データを読み込み
   */
  loadSummaryData() {
    try {
      const savedData = localStorage.getItem('weatherApp_summaryData');
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        
        // 24時間以内のデータのみ復元（古いデータは削除）
        const twentyFourHours = 24 * 60 * 60 * 1000;
        if (parsedData.timestamp && (Date.now() - parsedData.timestamp) < twentyFourHours) {
          this.summaryData.national = parsedData.national || { normal: '', hiragana: '' };
          this.summaryData.kansai = parsedData.kansai || { normal: '', hiragana: '' };
          console.log('要約データを復元しました');
          return true;
        } else {
          console.log('要約データが古いため削除します');
          localStorage.removeItem('weatherApp_summaryData');
        }
      }
    } catch (error) {
      console.warn('要約データの読み込みに失敗:', error);
    }
    return false;
  }

  /**
   * 要約データをクリア
   */
  clearSummaryData(mode = null) {
    if (mode) {
      // 特定のモードのみクリア
      this.summaryData[mode] = { normal: '', hiragana: '' };
      
      // UIからも削除
      const output = document.getElementById(`summaryOutput${mode.charAt(0).toUpperCase() + mode.slice(1)}`);
      if (output) {
        output.textContent = `${mode === 'national' ? '全国' : '関西'}天気を要約ボタンをクリックして、AI要約を生成してください。`;
      }
    } else {
      // 全てクリア
      this.summaryData = {
        national: { normal: '', hiragana: '' },
        kansai: { normal: '', hiragana: '' }
      };
      
      // UIからも削除
      const nationalOutput = document.getElementById('summaryOutputNational');
      const kansaiOutput = document.getElementById('summaryOutputKansai');
      if (nationalOutput) {
        nationalOutput.textContent = '全国天気を要約ボタンをクリックして、AI要約を生成してください。';
      }
      if (kansaiOutput) {
        kansaiOutput.textContent = '関西天気を要約ボタンをクリックして、AI要約を生成してください。';
      }
    }
    
    // localStorageからも削除
    try {
      if (mode) {
        // 特定のモードのみの場合は、残りのデータを保存し直す
        this.saveSummaryData();
      } else {
        localStorage.removeItem('weatherApp_summaryData');
      }
      console.log('要約データをクリアしました');
    } catch (error) {
      console.warn('要約データのクリアに失敗:', error);
    }
  }

  /**
   * 要約表示を復元
   */
  restoreSummaryDisplay() {
    // 全国版の要約を復元
    if (this.summaryData.national.normal) {
      const nationalOutput = document.getElementById('summaryOutputNational');
      if (nationalOutput) {
        nationalOutput.textContent = this.summaryData.national.normal;
      }
    }
    
    // 関西版の要約を復元
    if (this.summaryData.kansai.normal) {
      const kansaiOutput = document.getElementById('summaryOutputKansai');
      if (kansaiOutput) {
        kansaiOutput.textContent = this.summaryData.kansai.normal;
      }
    }
  }

  /**
   * タブ状態をlocalStorageに保存
   */
  saveTabState(mode) {
    try {
      localStorage.setItem('weatherApp_currentTab', mode);
      console.log('タブ状態を保存しました:', mode);
    } catch (error) {
      console.warn('タブ状態の保存に失敗:', error);
    }
  }

  /**
   * localStorageからタブ状態を読み込み
   */
  loadTabState() {
    try {
      const savedTab = localStorage.getItem('weatherApp_currentTab');
      console.log('保存されたタブ状態:', savedTab);
      return savedTab;
    } catch (error) {
      console.warn('タブ状態の読み込みに失敗:', error);
      return null;
    }
  }

  /**
   * ページ読み込み時にタブ状態を復元
   */
  restoreTabState() {
    const savedMode = this.currentMode;
    
    if (savedMode && (savedMode === 'national' || savedMode === 'kansai')) {
      console.log('タブ状態を復元中:', savedMode);
      
      // DOM要素の状態を更新
      document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
      });
      
      document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
      });

      // 保存されたタブをアクティブに
      const tabElement = document.getElementById(`tab-${savedMode}`);
      const paneElement = document.getElementById(savedMode);
      
      if (tabElement && paneElement) {
        tabElement.classList.add('active');
        paneElement.classList.add('active');
        console.log('タブ状態の復元完了:', savedMode);
      } else {
        console.warn('タブ要素が見つかりません:', savedMode);
        // フォールバック：全国版に設定
        this.currentMode = 'national';
        document.getElementById('tab-national').classList.add('active');
        document.getElementById('national').classList.add('active');
      }
    } else {
      console.log('デフォルトタブ（全国版）を設定');
      this.currentMode = 'national';
      document.getElementById('tab-national').classList.add('active');
      document.getElementById('national').classList.add('active');
    }
  }

  /**
   * 都道府県検索機能
   */
  async searchPrefecture(mode) {
    const inputId = mode === 'national' ? 'prefectureSearch' : 'prefectureSearchKansai';
    const resultsId = mode === 'national' ? 'searchResults' : 'searchResultsKansai';
    
    const searchInput = document.getElementById(inputId);
    const resultsContainer = document.getElementById(resultsId);
    
    if (!searchInput || !resultsContainer) {
      console.error('検索要素が見つかりません');
      return;
    }

    const searchTerm = searchInput.value.trim();
    
    if (!searchTerm) {
      resultsContainer.innerHTML = '検索語を入力してください。';
      return;
    }

    console.log(`🔍 都道府県検索: "${searchTerm}"`);
    
    // basicDataから検索
    if (!this.basicData || this.basicData.length === 0) {
      resultsContainer.innerHTML = `
        <div class="no-results">
          <i class="fas fa-exclamation-triangle"></i>
          都道府県データが読み込まれていません。ページを更新してください。
        </div>
      `;
      return;
    }

    // 特別な地域マッピング
    const specialMappings = {
      '北海道': '北海道 石狩・空知・後志地方',
      '沖縄県': '沖縄本島地方',
      '沖縄': '沖縄本島地方'
    };

    let searchResults = [];

    // 特別なマッピングがある場合は優先的に表示
    if (specialMappings[searchTerm]) {
      const specialResult = this.basicData.find(item => 
        item.name === specialMappings[searchTerm]
      );
      if (specialResult) {
        searchResults.push(specialResult);
        console.log(`🎯 特別マッピング適用: "${searchTerm}" → "${specialResult.name}"`);
      }
    }

    // 通常の検索結果を追加（特別な結果と重複しないように）
    const normalResults = this.basicData.filter(item => 
      item.name && 
      item.name.includes(searchTerm) &&
      !searchResults.some(existing => existing.name === item.name)
    );

    searchResults = searchResults.concat(normalResults);

    console.log(`📊 検索結果: ${searchResults.length}件`);
    if (searchResults.length > 0) {
      console.log(`🔍 最優先結果: "${searchResults[0].name}"`);
    }

    if (searchResults.length === 0) {
      resultsContainer.innerHTML = `
        <div class="no-results">
          <i class="fas fa-search"></i>
          「${searchTerm}」に一致する都道府県が見つかりませんでした。
        </div>
      `;
      return;
    }

    // 検索結果を表示（非同期）
    await this.displaySearchResults(searchResults, resultsContainer);
  }

  /**
   * 主要都道府県アイコンを初期化（全国版のみ）
   */
  initPrefectureIcons() {
    const container = document.getElementById('prefectureIconsGrid');
    
    if (!container) return;

    const iconsHTML = this.majorPrefectures.map(pref => `
      <div class="prefecture-icon" onclick="window.weatherApp.selectPrefectureFromIcon('${pref.name}', 'national')">
        <span class="prefecture-icon-emoji">${pref.emoji}</span>
        <div class="prefecture-icon-name">${pref.name}</div>
        <div class="prefecture-icon-region">${pref.region}</div>
      </div>
    `).join('');

    container.innerHTML = iconsHTML;
  }

  /**
   * アイコンから都道府県を選択
   */
  selectPrefectureFromIcon(prefName, mode) {
    const inputId = mode === 'national' ? 'prefectureSearch' : 'prefectureSearchKansai';
    const input = document.getElementById(inputId);
    
    if (input) {
      input.value = prefName;
      this.searchPrefecture(mode);
    }
  }

  /**
   * 検索入力ハンドラー（リアルタイム検索）
   */
  handleSearchInput(value, mode) {
    if (!value.trim()) {
      this.hideSuggestions(mode);
      return;
    }

    const suggestions = this.getSuggestions(value, mode);
    this.showSuggestions(suggestions, mode);
  }

  /**
   * 検索候補を取得
   */
  getSuggestions(searchTerm, mode) {
    if (!this.basicData || this.basicData.length === 0) {
      return [];
    }

    // 特別な地域マッピング
    const specialMappings = {
      '北海道': '北海道 石狩・空知・後志地方',
      '沖縄県': '沖縄本島地方',
      '沖縄': '沖縄本島地方'
    };

    let results = [];

    // 特別なマッピングがある場合は優先的に表示
    if (specialMappings[searchTerm]) {
      const specialResult = this.basicData.find(item => 
        item.name === specialMappings[searchTerm]
      );
      if (specialResult) {
        results.push(specialResult);
      }
    }

    // 通常の検索結果を追加（特別な結果と重複しないように）
    const normalResults = this.basicData.filter(item => 
      item.name && 
      item.name.includes(searchTerm) &&
      !results.some(existing => existing.name === item.name)
    );

    results = results.concat(normalResults);

    return results.slice(0, 5); // 最大5件まで表示
  }

  /**
   * 検索候補を表示
   */
  showSuggestions(suggestions, mode) {
    const containerId = mode === 'national' ? 'searchSuggestions' : 'searchSuggestionsKansai';
    const container = document.getElementById(containerId);
    
    if (!container) return;

    if (suggestions.length === 0) {
      container.innerHTML = '';
      return;
    }

    const suggestionsHTML = suggestions.map((item, index) => `
      <div class="search-suggestion-item" 
           data-index="${index}"
           onclick="window.weatherApp.selectSuggestion('${item.name}', '${mode}')">
        ${item.name}
      </div>
    `).join('');

    container.innerHTML = suggestionsHTML;
    this.searchIndex = 0;
  }

  /**
   * 検索候補を隠す
   */
  hideSuggestions(mode) {
    const containerId = mode === 'national' ? 'searchSuggestions' : 'searchSuggestionsKansai';
    const container = document.getElementById(containerId);
    
    if (container) {
      container.innerHTML = '';
    }
  }

  /**
   * 検索候補を選択
   */
  selectSuggestion(name, mode) {
    const inputId = mode === 'national' ? 'prefectureSearch' : 'prefectureSearchKansai';
    const input = document.getElementById(inputId);
    
    if (input) {
      input.value = name;
      this.hideSuggestions(mode);
      this.searchPrefecture(mode);
    }
  }

  /**
   * キーボードナビゲーション
   */
  handleSearchKeydown(e, mode) {
    const containerId = mode === 'national' ? 'searchSuggestions' : 'searchSuggestionsKansai';
    const container = document.getElementById(containerId);
    const suggestions = container?.querySelectorAll('.search-suggestion-item');

    if (!suggestions || suggestions.length === 0) {
      if (e.key === 'Enter') {
        this.searchPrefecture(mode);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.searchIndex = Math.min(this.searchIndex + 1, suggestions.length - 1);
        this.updateSuggestionHighlight(suggestions);
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        this.searchIndex = Math.max(this.searchIndex - 1, 0);
        this.updateSuggestionHighlight(suggestions);
        break;
      
      case 'Enter':
        e.preventDefault();
        if (suggestions[this.searchIndex]) {
          const name = suggestions[this.searchIndex].textContent.trim();
          this.selectSuggestion(name, mode);
        }
        break;
      
      case 'Escape':
        this.hideSuggestions(mode);
        break;
    }
  }

  /**
   * 検索候補のハイライト更新
   */
  updateSuggestionHighlight(suggestions) {
    suggestions.forEach((item, index) => {
      if (index === this.searchIndex) {
        item.classList.add('highlighted');
      } else {
        item.classList.remove('highlighted');
      }
    });
  }

  /**
   * 検索結果を表示（詳細天気情報を含む）
   */
  async displaySearchResults(results, container) {
    if (results.length === 0) {
      container.innerHTML = `
        <div class="no-results">
          <i class="fas fa-search"></i>
          該当する都道府県が見つかりませんでした。
        </div>
      `;
      return;
    }

    // ローディング表示
    container.innerHTML = `
      <div class="search-loading">
        <i class="fas fa-spinner fa-spin"></i>
        <p>詳細な天気情報を取得中...</p>
      </div>
    `;

    let html = '';
    
    for (let i = 0; i < results.length; i++) {
      const item = results[i];
      const overviewUrl = item.overview_url || '';
      const forecastUrl = item.forecast_url || '';
      
      // URLが有効かどうかを判定
      const isValidOverview = overviewUrl && overviewUrl !== 'demo' && overviewUrl.includes('http');
      const isValidForecast = forecastUrl && forecastUrl !== 'demo' && forecastUrl.includes('http');
      
      html += `
        <div class="search-result-weather-card">
          <div class="search-result-header">
            <div class="search-result-name">
              <i class="fas fa-map-marker-alt"></i>
              ${item.name}
            </div>
            <div class="search-result-counter">
              ${i + 1}/${results.length}
            </div>
          </div>
      `;

      // APIからデータを取得して表示
      if (isValidOverview || isValidForecast) {
        try {
          const weatherData = await this.fetchSearchResultWeatherData(overviewUrl, forecastUrl);
          html += this.generateSearchResultWeatherHTML(weatherData, item.name, overviewUrl, forecastUrl);
        } catch (error) {
          console.error(`${item.name}の天気データ取得エラー:`, error);
          html += this.generateSearchResultErrorHTML();
        }
      } else {
        html += this.generateSearchResultNoDataHTML();
      }

      html += '</div>';
    }

    container.innerHTML = html;
  }

  /**
   * 検索結果用の天気データを取得
   */
  async fetchSearchResultWeatherData(overviewUrl, forecastUrl) {
    const promises = [];
    
    if (overviewUrl) {
      promises.push(
        this.fetchWeatherData(overviewUrl)
          .then(data => ({ type: 'overview', data }))
          .catch(error => ({ type: 'overview', data: null, error }))
      );
    }
    
    if (forecastUrl) {
      promises.push(
        this.fetchWeatherData(forecastUrl)
          .then(data => ({ type: 'forecast', data }))
          .catch(error => ({ type: 'forecast', data: null, error }))
      );
    }

    const results = await Promise.all(promises);
    
    const weatherData = {
      overview: null,
      forecast: null
    };

    results.forEach(result => {
      if (result.data) {
        weatherData[result.type] = result.data;
      }
    });

    return weatherData;
  }

  /**
   * 検索結果用の天気HTMLを生成
   */
  generateSearchResultWeatherHTML(weatherData, locationName, overviewUrl, forecastUrl) {
    let html = '<div class="search-result-weather-content">';

    // 概要情報の表示
    if (weatherData.overview) {
      html += this.generateSearchResultOverviewHTML(weatherData.overview);
    }

    // 予報情報の表示
    if (weatherData.forecast && weatherData.forecast.length > 0) {
      html += this.generateSearchResultForecastHTML(weatherData.forecast);
    }

    // 詳細表示ボタン
    html += `
      <div class="search-result-actions">
        <button class="button search-detail-btn" onclick="window.weatherApp.showDetailedWeather('${locationName}', '${overviewUrl}', '${forecastUrl}')">
          <i class="fas fa-expand-alt"></i> 詳細表示
        </button>
      </div>
    `;

    html += '</div>';
    return html;
  }

  /**
   * 検索結果用の概要HTMLを生成
   */
  generateSearchResultOverviewHTML(overviewData) {
    if (!overviewData) return '';

    let html = '<div class="search-result-overview">';
    
    if (overviewData.headlineText && overviewData.headlineText.trim()) {
      html += `
        <div class="search-overview-headline">
          <i class="fas fa-exclamation-triangle"></i>
          <span>${overviewData.headlineText.replace(/\n/g, ' ').substring(0, 100)}</span>
          ${overviewData.headlineText.length > 100 ? '...' : ''}
        </div>
      `;
    }

    if (overviewData.text && overviewData.text.trim()) {
      const shortText = overviewData.text.replace(/\n/g, ' ').substring(0, 150);
      html += `
        <div class="search-overview-text">
          <i class="fas fa-file-alt"></i>
          <span>${shortText}${overviewData.text.length > 150 ? '...' : ''}</span>
        </div>
      `;
    }

    if (overviewData.reportDatetime) {
      html += `
        <div class="search-overview-time">
          <i class="fas fa-clock"></i>
          <span>発表: ${new Date(overviewData.reportDatetime).toLocaleString('ja-JP')}</span>
        </div>
      `;
    }

    html += '</div>';
    return html;
  }

  /**
   * 検索結果用の予報HTMLを生成
   */
  generateSearchResultForecastHTML(forecastData) {
    if (!forecastData || forecastData.length === 0) return '';

    let html = '<div class="search-result-forecast">';
    
    // 最初の予報データを使用
    const firstForecast = forecastData[0];
    if (firstForecast && firstForecast.timeSeries && firstForecast.timeSeries.length > 0) {
      const timeSeries = firstForecast.timeSeries[0];
      if (timeSeries.timeDefines && timeSeries.areas && timeSeries.areas.length > 0) {
        const area = timeSeries.areas[0];
        const today = timeSeries.timeDefines[0];
        
        if (area.weathers && area.weathers.length > 0) {
          const weather = area.weathers[0];
          const icon = this.getWeatherIconFromCode(weather);
          
          html += `
            <div class="search-forecast-today">
              <div class="search-forecast-icon">${icon}</div>
              <div class="search-forecast-info">
                <div class="search-forecast-weather">${weather}</div>
                <div class="search-forecast-time">
                  <i class="fas fa-calendar"></i>
                  ${new Date(today).toLocaleDateString('ja-JP')}
                </div>
              </div>
            </div>
          `;
        }

        // 温度情報も表示
        if (area.temps && area.temps.length > 0) {
          html += `
            <div class="search-forecast-temp">
              <i class="fas fa-thermometer-half"></i>
              ${area.temps[0]}℃
            </div>
          `;
        }
      }
    }

    html += '</div>';
    return html;
  }

  /**
   * 検索結果エラー用HTMLを生成
   */
  generateSearchResultErrorHTML() {
    return `
      <div class="search-result-error">
        <i class="fas fa-exclamation-triangle"></i>
        <span>天気データの取得に失敗しました</span>
      </div>
    `;
  }

  /**
   * 検索結果データなし用HTMLを生成
   */
  generateSearchResultNoDataHTML() {
    return `
      <div class="search-result-no-data">
        <i class="fas fa-info-circle"></i>
        <span>この地域の詳細な天気データは利用できません</span>
      </div>
    `;
  }

  /**
   * 詳細天気情報を表示
   */
  async showDetailedWeather(locationName, overviewUrl, forecastUrl) {
    console.log(`🌤️ 詳細天気情報を取得中: ${locationName}`);
    
    // モーダルを表示
    const modal = document.getElementById('weatherModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    if (!modal || !modalTitle || !modalBody) {
      console.error('モーダル要素が見つかりません');
      return;
    }

    modalTitle.innerHTML = `<i class="fas fa-cloud-sun"></i> ${locationName} 詳細天気情報`;
    modalBody.innerHTML = `
      <div class="loading">
        <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 1rem;"></i>
        <p>天気データを取得中...</p>
      </div>
    `;
    
    modal.style.display = 'block';

    try {
      // 概要データと予報データを並行取得
      const [overviewData, forecastData] = await Promise.all([
        this.fetchWeatherData(overviewUrl),
        this.fetchWeatherData(forecastUrl)
      ]);

      // データを処理してグラフィカルに表示
      const detailHTML = this.generateDetailedWeatherHTML(locationName, overviewData, forecastData);
      modalBody.innerHTML = detailHTML;

    } catch (error) {
      console.error('天気データの取得に失敗:', error);
      modalBody.innerHTML = `
        <div class="weather-detail-card">
          <div class="no-results">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>天気データの取得に失敗しました</h3>
            <p>しばらく時間をおいて再度お試しください。</p>
            <p class="error-detail">エラー詳細: ${error.message}</p>
          </div>
        </div>
      `;
    }
  }

  /**
   * 天気データを取得
   */
  async fetchWeatherData(url) {
    if (!url || url === 'なし' || url === 'demo' || !url.includes('http')) {
      throw new Error('無効なURL');
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  }

  /**
   * 詳細天気情報のHTMLを生成
   */
  generateDetailedWeatherHTML(locationName, overviewData, forecastData) {
    let html = '';

    // ヘッダー部分
    html += `
      <div class="weather-detail-card">
        <div class="weather-detail-header">
          <div class="weather-detail-title">
            <i class="fas fa-map-marker-alt"></i>
            ${locationName}
          </div>
          <div class="weather-detail-time">
            <i class="fas fa-clock"></i>
            ${new Date().toLocaleString('ja-JP')} 時点
          </div>
        </div>
    `;

    // 概要テキスト表示（改良版）
    if (overviewData) {
      html += this.generateOverviewHTML(overviewData);
    }

    // 予報データ表示
    if (forecastData && forecastData.length > 0) {
      html += this.generateForecastHTML(forecastData);
    }

    html += '</div>';

    return html;
  }

  /**
   * 気象概要HTMLを生成（詳細版）
   */
  generateOverviewHTML(overviewData) {
    let html = `
      <div class="weather-overview-section">
        <h4><i class="fas fa-file-alt"></i> 気象庁発表概要</h4>
    `;

    // 基本情報
    if (overviewData.targetArea) {
      html += `
        <div class="overview-header">
          <div class="overview-target">
            <i class="fas fa-map-marker-alt"></i>
            対象地域: <strong>${overviewData.targetArea}</strong>
          </div>
      `;
    }

    if (overviewData.reportDatetime) {
      html += `
          <div class="overview-datetime">
            <i class="fas fa-calendar-alt"></i>
            発表日時: <strong>${new Date(overviewData.reportDatetime).toLocaleString('ja-JP')}</strong>
          </div>
        </div>
      `;
    }

    if (overviewData.publishingOffice) {
      html += `
        <div class="overview-office">
          <i class="fas fa-building"></i>
          発表機関: <strong>${overviewData.publishingOffice}</strong>
        </div>
      `;
    }

    // ヘッドライン（重要情報）
    if (overviewData.headlineText && overviewData.headlineText.trim()) {
      html += `
        <div class="overview-headline">
          <h5><i class="fas fa-exclamation-triangle" style="color: #f39c12;"></i> 重要情報</h5>
          <div class="headline-content">${overviewData.headlineText.replace(/\n/g, '<br>')}</div>
        </div>
      `;
    }

    // 詳細な気象解説
    if (overviewData.text && overviewData.text.trim()) {
      const parsedText = this.parseWeatherOverviewText(overviewData.text);
      html += `
        <div class="overview-text">
          <h5><i class="fas fa-cloud-sun"></i> 詳細な気象解説</h5>
          <div class="weather-description">${parsedText}</div>
        </div>
      `;
    }

    html += '</div>';

    return html;
  }

  /**
   * 気象概要テキストをパースして読みやすく整形
   */
  parseWeatherOverviewText(text) {
    if (!text || typeof text !== 'string') {
      return '気象情報がありません。';
    }

    // 改行で分割
    const lines = text.split('\n').filter(line => line.trim());
    let formattedText = '';

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      if (!trimmedLine) return;

      // 地域名や重要な見出しを検出
      if (trimmedLine.includes('地方は') || 
          trimmedLine.includes('について') || 
          trimmedLine.includes('【') && trimmedLine.includes('】')) {
        formattedText += `<div class="weather-section-header"><i class="fas fa-map"></i> ${trimmedLine}</div>`;
      }
      // 日付や時間に関する情報
      else if (trimmedLine.match(/\d+日|今日|明日|今夜|朝|昼|夕方|夜/)) {
        formattedText += `<div class="weather-time-info"><i class="fas fa-clock"></i> ${trimmedLine}</div>`;
      }
      // 注意警戒情報
      else if (trimmedLine.includes('注意') || 
               trimmedLine.includes('警戒') || 
               trimmedLine.includes('気を付け')) {
        formattedText += `<div class="weather-warning"><i class="fas fa-exclamation-triangle"></i> ${trimmedLine}</div>`;
      }
      // 海上情報
      else if (trimmedLine.includes('海上') || 
               trimmedLine.includes('波') || 
               trimmedLine.includes('うねり')) {
        formattedText += `<div class="weather-marine-info"><i class="fas fa-water"></i> ${trimmedLine}</div>`;
      }
      // 通常の文章
      else {
        formattedText += `<p class="weather-normal-text">${trimmedLine}</p>`;
      }
    });

    return formattedText || text.replace(/\n/g, '<br>');
  }

  /**
   * 予報データのHTMLを生成（統合版）
   */
  generateForecastHTML(forecastData) {
    let html = '<h4><i class="fas fa-chart-line"></i> 天気予報</h4>';

    if (!forecastData || forecastData.length === 0) {
      return html + '<p>予報データがありません。</p>';
    }

    try {
      // 統合された天気予報データを構築
      const integratedForecast = this.buildIntegratedForecast(forecastData);
      
      if (!integratedForecast || integratedForecast.length === 0) {
        return html + '<p>予報データの解析に失敗しました。</p>';
      }

      html += '<div class="integrated-forecast-container">';
      
      // エリア別に整理されたデータを表示
      integratedForecast.forEach(areaForecast => {
        html += this.generateAreaForecastHTML(areaForecast);
      });
      
      html += '</div>';
      
    } catch (error) {
      console.error('予報HTML生成エラー:', error);
      html += '<p>予報データの表示でエラーが発生しました。</p>';
    }

    return html;
  }

  /**
   * 統合された予報データを構築
   */
  buildIntegratedForecast(forecastData) {
    const integratedData = new Map(); // areaName -> forecast data

    try {
      // 最初のforecastデータから処理
      const forecast = forecastData[0];
      if (!forecast || !forecast.timeSeries) {
        return [];
      }

      // 各timeSeriesからデータを収集
      const weatherSeries = forecast.timeSeries.find(ts => 
        ts.areas && ts.areas[0] && ts.areas[0].weathers
      );
      const popSeries = forecast.timeSeries.find(ts => 
        ts.areas && ts.areas[0] && ts.areas[0].pops
      );
      const tempSeries = forecast.timeSeries.find(ts => 
        ts.areas && ts.areas[0] && ts.areas[0].temps
      );

      if (!weatherSeries || !weatherSeries.areas) {
        return [];
      }

      // 各エリアごとに統合データを作成
      weatherSeries.areas.forEach(weatherArea => {
        const areaName = weatherArea.area?.name || '不明なエリア';
        
        // 対応する降水確率と気温データを検索
        const popArea = popSeries?.areas?.find(area => 
          area.area?.name === areaName || area.area?.code === weatherArea.area?.code
        );
        const tempArea = tempSeries?.areas?.find(area => 
          area.area?.name === areaName || area.area?.code === weatherArea.area?.code
        );

        // 統合データを構築
        const areaData = {
          areaName: areaName,
          areaCode: weatherArea.area?.code || '',
          timeDefines: weatherSeries.timeDefines || [],
          weathers: weatherArea.weathers || [],
          weatherCodes: weatherArea.weatherCodes || [],
          winds: weatherArea.winds || [],
          waves: weatherArea.waves || [],
          pops: popArea?.pops || [],
          temps: tempArea?.temps || [],
          popTimeDefines: popSeries?.timeDefines || [],
          tempTimeDefines: tempSeries?.timeDefines || []
        };

        integratedData.set(areaName, areaData);
      });

      return Array.from(integratedData.values());

    } catch (error) {
      console.error('統合予報データ構築エラー:', error);
      return [];
    }
  }

  /**
   * エリア別予報HTMLを生成
   */
  generateAreaForecastHTML(areaData) {
    const { areaName, timeDefines, weathers, weatherCodes, winds, waves, pops, temps } = areaData;
    
    let html = `
      <div class="area-forecast-section">
        <h5 class="area-forecast-title">
          <i class="fas fa-map-marker-alt"></i> ${areaName}
        </h5>
        <div class="forecast-timeline">
    `;

    // 最大3日分の予報を表示
    const maxDays = Math.min(timeDefines.length, 3);
    
    for (let i = 0; i < maxDays; i++) {
      const date = new Date(timeDefines[i]);
      const weather = weathers[i] || '情報なし';
      const weatherCode = weatherCodes[i] || '000';
      const wind = winds[i] || '情報なし';
      const wave = waves[i] || '';
      
      // 対応する降水確率と気温を取得
      const pop = this.findCorrespondingData(pops, areaData.popTimeDefines, timeDefines[i]);
      const temp = this.findCorrespondingData(temps, areaData.tempTimeDefines, timeDefines[i]);
      
      const weatherIcon = this.getWeatherIconFromCode(weatherCode);
      const weatherClass = this.getWeatherClassFromCode(weatherCode);
      
      // 日付表示（シンプルな形式）
      const dayLabel = date.toLocaleDateString('ja-JP', { 
        month: 'numeric', 
        day: 'numeric',
        weekday: 'short'
      });

      html += `
        <div class="forecast-day-card ${weatherClass}">
          <div class="forecast-day-header">
            <div class="forecast-day-label">${dayLabel}</div>
          </div>
          
          <div class="forecast-main-info">
            <div class="forecast-weather-icon">${weatherIcon}</div>
            <div class="forecast-weather-desc">${weather}</div>
          </div>
          
          <div class="forecast-details-grid">
            ${temp ? `
              <div class="forecast-detail-item">
                <i class="fas fa-thermometer-half"></i>
                <span class="detail-label">気温</span>
                <span class="detail-value">${temp}°C</span>
              </div>
            ` : ''}
            
            ${pop ? `
              <div class="forecast-detail-item">
                <i class="fas fa-eye"></i>
                <span class="detail-label">降水確率</span>
                <span class="detail-value">${pop}%</span>
              </div>
            ` : ''}
            
            <div class="forecast-detail-item">
              <i class="fas fa-wind"></i>
              <span class="detail-label">風</span>
              <span class="detail-value">${wind}</span>
            </div>
            
            ${wave && wave !== '情報なし' ? `
              <div class="forecast-detail-item">
                <i class="fas fa-water"></i>
                <span class="detail-label">波</span>
                <span class="detail-value">${wave}</span>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }

    html += `
        </div>
      </div>
    `;

    return html;
  }

  /**
   * 対応するデータを時間軸から検索
   */
  findCorrespondingData(dataArray, timeDefines, targetTime) {
    if (!dataArray || !timeDefines || dataArray.length === 0) {
      return null;
    }

    const targetDate = new Date(targetTime).toDateString();
    
    for (let i = 0; i < timeDefines.length && i < dataArray.length; i++) {
      const currentDate = new Date(timeDefines[i]).toDateString();
      if (currentDate === targetDate) {
        return dataArray[i];
      }
    }
    
    // 完全一致しない場合は、最初のデータを返す（フォールバック）
    return dataArray[0] || null;
  }

  /**
   * 天気コードからアイコンを取得
   */
  getWeatherIconFromCode(code) {
    const codeNum = parseInt(code);
    
    if (codeNum >= 100 && codeNum <= 199) return '☀️'; // 晴れ
    if (codeNum >= 200 && codeNum <= 299) return '☁️'; // 曇り
    if (codeNum >= 300 && codeNum <= 399) return '🌧️'; // 雨
    if (codeNum >= 400 && codeNum <= 499) return '❄️'; // 雪
    
    return '🌤️'; // デフォルト
  }

  /**
   * 天気コードからCSSクラスを取得
   */
  getWeatherClassFromCode(code) {
    const codeNum = parseInt(code);
    
    if (codeNum >= 100 && codeNum <= 199) return 'sunny';
    if (codeNum >= 200 && codeNum <= 299) return 'cloudy';
    if (codeNum >= 300 && codeNum <= 399) return 'rainy';
    if (codeNum >= 400 && codeNum <= 499) return 'snowy';
    
    return 'cloudy';
  }
}

// アプリケーション初期化
document.addEventListener('DOMContentLoaded', () => {
  window.weatherApp = new WeatherApp();
}); 