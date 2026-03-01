// worker.js - WatchMate v2.0
// セブンネット、HMV、アニメイト、楽天ブックス対応 + メール通知

export default {
  /**
   * Cron Trigger - 30分ごとに自動実行
   */
  async scheduled(event, env, ctx) {
    console.log('WatchMate Cron triggered at:', new Date().toISOString());
    
    try {
      // 登録されているキーワードを取得
      const keywordsJson = await env.KEYWORDS_KV.get('registered_keywords');
      const keywords = keywordsJson ? JSON.parse(keywordsJson) : [];
      
      console.log(`Found ${keywords.length} keywords to scrape`);
      
      // 各キーワードでスクレイピング実行
      for (const keywordData of keywords) {
        if (!keywordData.enabled) continue;
        
        const keyword = keywordData.keyword;
        console.log(`Scraping keyword: ${keyword}`);
        
        try {
          // 各サイトでスクレイピング
          const results = {
            keyword,
            timestamp: new Date().toISOString(),
            data: {}
          };
          
          // 選択されたサイトのみスクレイピング
          const sites = keywordData.sites || ['7net', 'hmv', 'animate', 'rakuten'];
          const maxResults = keywordData.maxResults || 20;
          const promises = [];
          
          if (sites.includes('7net')) {
            promises.push(
              search7net(keyword, maxResults)
                .then(data => ({ site: '7net', data }))
                .catch(err => {
                  console.error('7net error:', err);
                  return { site: '7net', data: [] };
                })
            );
          }
          
          if (sites.includes('hmv')) {
            promises.push(
              searchHMV(keyword, maxResults)
                .then(data => ({ site: 'hmv', data }))
                .catch(err => {
                  console.error('HMV error:', err);
                  return { site: 'hmv', data: [] };
                })
            );
          }
          
          if (sites.includes('animate')) {
            promises.push(
              searchAnimate(keyword, maxResults)
                .then(data => ({ site: 'animate', data }))
                .catch(err => {
                  console.error('Animate error:', err);
                  return { site: 'animate', data: [] };
                })
            );
          }
          
          if (sites.includes('rakuten')) {
            promises.push(
              searchRakuten(keyword, maxResults)
                .then(data => ({ site: 'rakuten', data }))
                .catch(err => {
                  console.error('Rakuten error:', err);
                  return { site: 'rakuten', data: [] };
                })
            );
          }
          
          const allResults = await Promise.all(promises);
          
          // 結果をマージ
          for (const result of allResults) {
            results.data[result.site] = result.data;
          }
          
          // 前回の結果を取得
          const previousKey = `data_latest_${keyword}`;
          const previousJson = await env.KEYWORDS_KV.get(previousKey);
          const previousResults = previousJson ? JSON.parse(previousJson) : null;
          
          // 結果を保存
          await saveScrapingResult(env, keyword, results);
          
          // メール通知のチェック
          if (keywordData.emailNotification && keywordData.notifyEmail) {
            await checkAndNotify(env, keyword, results, previousResults, keywordData);
          }
          
          // レート制限対策：1秒待機
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          console.error(`Error scraping ${keyword}:`, error);
        }
      }
      
      console.log('WatchMate Cron job completed');
      
    } catch (error) {
      console.error('Cron job error:', error);
    }
  },
  
  /**
   * Fetch Handler - HTTP リクエスト処理
   */
  async fetch(request, env, ctx) {
    return handleRequest(request, env);
  }
};

/**
 * HTTPリクエストハンドラ
 */
async function handleRequest(request, env) {
  const url = new URL(request.url);
  
  // CORS preflight
  if (request.method === 'OPTIONS') {
    return handleOptions();
  }
  
  // ルーティング
  if (url.pathname === '/api/keywords') {
    return handleKeywords(request, env);
  } else if (url.pathname === '/api/keywords/add') {
    return handleAddKeyword(request, env);
  } else if (url.pathname === '/api/keywords/update') {
    return handleUpdateKeyword(request, env);
  } else if (url.pathname === '/api/keywords/delete') {
    return handleDeleteKeyword(request, env);
  } else if (url.pathname === '/api/data') {
    return handleGetData(request, env);
  } else if (url.pathname === '/api/data/latest') {
    return handleGetLatestData(request, env);
  } else if (url.pathname === '/api/data/history') {
    return handleGetHistory(request, env);
  } else if (url.pathname === '/api/search/manual') {
    return handleManualSearch(request, env);
  } else if (url.pathname === '/api/email/test') {
    return handleTestEmail(request, env);
  } else if (url.pathname === '/health') {
    return jsonResponse({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      kvEnabled: !!env.KEYWORDS_KV,
      emailEnabled: !!(env.RESEND_API_KEY || env.SENDGRID_API_KEY),
      sites: ['7net', 'hmv', 'animate', 'rakuten']
    });
  } else if (url.pathname === '/') {
    return new Response(getWelcomePage(), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
  
  return jsonResponse({ error: 'Not Found' }, 404);
}

/**
 * キーワード一覧取得
 */
async function handleKeywords(request, env) {
  try {
    const keywordsJson = await env.KEYWORDS_KV.get('registered_keywords');
    const keywords = keywordsJson ? JSON.parse(keywordsJson) : [];
    
    return jsonResponse({
      keywords,
      count: keywords.length
    });
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
}

/**
 * キーワード追加
 */
async function handleAddKeyword(request, env) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }
  
  try {
    const body = await request.json();
    const { 
      keyword, 
      sites = ['7net', 'hmv', 'animate', 'rakuten'], 
      enabled = true,
      emailNotification = false,
      notifyEmail = '',
      notifyConditions = [],
      maxResults = 20
    } = body;
    
    if (!keyword || keyword.trim().length === 0) {
      return jsonResponse({ error: 'キーワードが必要です' }, 400);
    }
    
    // 既存キーワードを取得
    const keywordsJson = await env.KEYWORDS_KV.get('registered_keywords');
    const keywords = keywordsJson ? JSON.parse(keywordsJson) : [];
    
    // 上限チェック (最大20個)
    if (keywords.length >= 20) {
      return jsonResponse({ error: 'キーワード登録数の上限(20個)に達しています' }, 400);
    }
    
    // 重複チェック
    if (keywords.some(k => k.keyword === keyword.trim())) {
      return jsonResponse({ error: 'このキーワードは既に登録されています' }, 400);
    }
    
    // 新しいキーワードを追加
    const newKeyword = {
      id: Date.now().toString(),
      keyword: keyword.trim(),
      sites,
      enabled,
      emailNotification,
      notifyEmail,
      notifyConditions, // 例: ['new_product', 'price_drop', 'stock_available']
      maxResults: Math.min(Math.max(parseInt(maxResults) || 20, 5), 100),
      createdAt: new Date().toISOString(),
      lastScraped: null,
      lastNotified: null
    };
    
    keywords.push(newKeyword);
    
    // 保存
    await env.KEYWORDS_KV.put('registered_keywords', JSON.stringify(keywords));
    
    return jsonResponse({
      message: 'キーワードを追加しました',
      keyword: newKeyword
    });
    
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
}

/**
 * キーワード更新
 */
async function handleUpdateKeyword(request, env) {
  if (request.method !== 'PUT' && request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }
  
  try {
    const body = await request.json();
    const { id, keyword, sites, enabled, emailNotification, notifyEmail, notifyConditions, maxResults } = body;
    
    if (!id) {
      return jsonResponse({ error: 'IDが必要です' }, 400);
    }
    
    const keywordsJson = await env.KEYWORDS_KV.get('registered_keywords');
    const keywords = keywordsJson ? JSON.parse(keywordsJson) : [];
    
    const index = keywords.findIndex(k => k.id === id);
    if (index === -1) {
      return jsonResponse({ error: 'キーワードが見つかりません' }, 404);
    }
    
    // 更新
    if (keyword !== undefined) keywords[index].keyword = keyword.trim();
    if (sites !== undefined) keywords[index].sites = sites;
    if (enabled !== undefined) keywords[index].enabled = enabled;
    if (emailNotification !== undefined) keywords[index].emailNotification = emailNotification;
    if (notifyEmail !== undefined) keywords[index].notifyEmail = notifyEmail;
    if (notifyConditions !== undefined) keywords[index].notifyConditions = notifyConditions;
    if (maxResults !== undefined) keywords[index].maxResults = Math.min(Math.max(parseInt(maxResults) || 20, 5), 100);
    keywords[index].updatedAt = new Date().toISOString();
    
    await env.KEYWORDS_KV.put('registered_keywords', JSON.stringify(keywords));
    
    return jsonResponse({
      message: 'キーワードを更新しました',
      keyword: keywords[index]
    });
    
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
}

/**
 * キーワード削除
 */
async function handleDeleteKeyword(request, env) {
  if (request.method !== 'DELETE' && request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }
  
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id') || (await request.json()).id;
    
    if (!id) {
      return jsonResponse({ error: 'IDが必要です' }, 400);
    }
    
    const keywordsJson = await env.KEYWORDS_KV.get('registered_keywords');
    const keywords = keywordsJson ? JSON.parse(keywordsJson) : [];
    
    const index = keywords.findIndex(k => k.id === id);
    if (index === -1) {
      return jsonResponse({ error: 'キーワードが見つかりません' }, 404);
    }
    
    const deletedKeyword = keywords[index];
    keywords.splice(index, 1);
    
    await env.KEYWORDS_KV.put('registered_keywords', JSON.stringify(keywords));
    
    return jsonResponse({
      message: 'キーワードを削除しました',
      keyword: deletedKeyword
    });
    
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
}

/**
 * 最新データ取得（全キーワード）
 */
async function handleGetData(request, env) {
  try {
    const keywordsJson = await env.KEYWORDS_KV.get('registered_keywords');
    const keywords = keywordsJson ? JSON.parse(keywordsJson) : [];
    
    const allData = [];
    for (const kw of keywords) {
      const dataKey = `data_latest_${kw.keyword}`;
      const dataJson = await env.KEYWORDS_KV.get(dataKey);
      if (dataJson) {
        allData.push(JSON.parse(dataJson));
      }
    }
    
    return jsonResponse({ data: allData });
    
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
}

/**
 * 特定キーワードの最新データ取得
 */
async function handleGetLatestData(request, env) {
  try {
    const url = new URL(request.url);
    const keyword = url.searchParams.get('keyword');
    
    if (!keyword) {
      return jsonResponse({ error: 'キーワードが必要です' }, 400);
    }
    
    const dataKey = `data_latest_${keyword}`;
    const dataJson = await env.KEYWORDS_KV.get(dataKey);
    
    if (!dataJson) {
      return jsonResponse({ error: 'データが見つかりません' }, 404);
    }
    
    return jsonResponse(JSON.parse(dataJson));
    
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
}

/**
 * 履歴データ取得
 */
async function handleGetHistory(request, env) {
  try {
    const url = new URL(request.url);
    const keyword = url.searchParams.get('keyword');
    const limit = parseInt(url.searchParams.get('limit') || '48');
    
    if (!keyword) {
      return jsonResponse({ error: 'キーワードが必要です' }, 400);
    }
    
    const historyKey = `history_${keyword}`;
    const historyJson = await env.KEYWORDS_KV.get(historyKey);
    
    if (!historyJson) {
      return jsonResponse({ history: [], count: 0 });
    }
    
    const history = JSON.parse(historyJson);
    const limitedHistory = history.slice(-limit);
    
    return jsonResponse({
      keyword,
      history: limitedHistory,
      count: limitedHistory.length
    });
    
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
}

/**
 * 手動検索
 */
async function handleManualSearch(request, env) {
  try {
    const url = new URL(request.url);
    const keyword = url.searchParams.get('keyword');
    const sites = url.searchParams.get('sites')?.split(',') || ['7net', 'hmv', 'animate', 'rakuten'];
    const maxResults = parseInt(url.searchParams.get('maxResults') || '20');
    
    if (!keyword) {
      return jsonResponse({ error: 'キーワードが必要です' }, 400);
    }
    
    const results = {
      keyword,
      timestamp: new Date().toISOString(),
      manual: true,
      data: {}
    };
    
    const promises = [];
    
    if (sites.includes('7net')) {
      promises.push(
        search7net(keyword, maxResults)
          .then(data => ({ site: '7net', data }))
          .catch(() => ({ site: '7net', data: [] }))
      );
    }
    
    if (sites.includes('hmv')) {
      promises.push(
        searchHMV(keyword, maxResults)
          .then(data => ({ site: 'hmv', data }))
          .catch(() => ({ site: 'hmv', data: [] }))
      );
    }
    
    if (sites.includes('animate')) {
      promises.push(
        searchAnimate(keyword, maxResults)
          .then(data => ({ site: 'animate', data }))
          .catch(() => ({ site: 'animate', data: [] }))
      );
    }
    
    if (sites.includes('rakuten')) {
      promises.push(
        searchRakuten(keyword, maxResults)
          .then(data => ({ site: 'rakuten', data }))
          .catch(() => ({ site: 'rakuten', data: [] }))
      );
    }
    
    const allResults = await Promise.all(promises);
    
    for (const result of allResults) {
      results.data[result.site] = result.data;
    }
    
    return jsonResponse(results);
    
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
}

/**
 * テストメール送信
 */
async function handleTestEmail(request, env) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }
  
  try {
    const body = await request.json();
    const { email } = body;
    
    if (!email) {
      return jsonResponse({ error: 'メールアドレスが必要です' }, 400);
    }
    
    const testData = {
      keyword: 'テスト商品',
      newProducts: [
        { title: 'テスト商品A', price: '¥1,000', site: '7net' },
        { title: 'テスト商品B', price: '¥2,000', site: 'hmv' }
      ]
    };
    
    const sent = await sendEmailNotification(env, email, 'test', testData);
    
    if (sent) {
      return jsonResponse({ message: 'テストメールを送信しました' });
    } else {
      return jsonResponse({ error: 'メール送信に失敗しました' }, 500);
    }
    
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
}

/**
 * スクレイピング結果を保存
 */
async function saveScrapingResult(env, keyword, results) {
  // 最新データとして保存 (1週間で自動削除: 604800秒)
  const latestKey = `data_latest_${keyword}`;
  await env.KEYWORDS_KV.put(latestKey, JSON.stringify(results), { expirationTtl: 604800 });
  
  // 履歴に追加
  const historyKey = `history_${keyword}`;
  const historyJson = await env.KEYWORDS_KV.get(historyKey);
  const history = historyJson ? JSON.parse(historyJson) : [];
  
  const summary = {
    timestamp: results.timestamp,
    counts: {}
  };
  
  for (const [site, products] of Object.entries(results.data)) {
    summary.counts[site] = products?.length || 0;
  }
  
  history.push(summary);
  
  // 最大保存件数を制限（直近96件 = 2日分）
  if (history.length > 96) {
    history.shift();
  }
  
  // 履歴データも1週間で期限切れ（更新されれば延長）
  await env.KEYWORDS_KV.put(historyKey, JSON.stringify(history), { expirationTtl: 604800 });
  
  // キーワード情報を更新
  const keywordsJson = await env.KEYWORDS_KV.get('registered_keywords');
  const keywords = keywordsJson ? JSON.parse(keywordsJson) : [];
  const keywordIndex = keywords.findIndex(k => k.keyword === keyword);
  
  if (keywordIndex !== -1) {
    keywords[keywordIndex].lastScraped = new Date().toISOString();
    await env.KEYWORDS_KV.put('registered_keywords', JSON.stringify(keywords));
  }
}

/**
 * 通知チェックとメール送信
 */
async function checkAndNotify(env, keyword, currentResults, previousResults, keywordData) {
  if (!currentResults || !keywordData.notifyEmail) return;
  
  const newProducts = [];
  
  // 新商品をチェック
  if (previousResults) {
    for (const [site, products] of Object.entries(currentResults.data)) {
      const previousProducts = previousResults.data?.[site] || [];
      const previousTitles = new Set(previousProducts.map(p => p.title));
      
      for (const product of products || []) {
        if (!previousTitles.has(product.title)) {
          newProducts.push({ ...product, site });
        }
      }
    }
  } else {
    // 初回実行時は全商品を新商品として扱わない
    return;
  }
  
  // 新商品があればメール送信
  if (newProducts.length > 0) {
    const notificationData = {
      keyword,
      newProducts,
      totalCount: newProducts.length,
      timestamp: currentResults.timestamp
    };
    
    await sendEmailNotification(env, keywordData.notifyEmail, 'new_products', notificationData);
    
    // 最終通知時刻を更新
    const keywordsJson = await env.KEYWORDS_KV.get('registered_keywords');
    const keywords = keywordsJson ? JSON.parse(keywordsJson) : [];
    const index = keywords.findIndex(k => k.id === keywordData.id);
    if (index !== -1) {
      keywords[index].lastNotified = new Date().toISOString();
      await env.KEYWORDS_KV.put('registered_keywords', JSON.stringify(keywords));
    }
  }
}

/**
 * メール送信（Resend or SendGrid）
 */
async function sendEmailNotification(env, toEmail, type, data) {
  // Resend API を優先
  if (env.RESEND_API_KEY) {
    return await sendViaResend(env, toEmail, type, data);
  }
  // SendGrid をフォールバック
  else if (env.SENDGRID_API_KEY) {
    return await sendViaSendGrid(env, toEmail, type, data);
  }
  
  console.error('No email service configured');
  return false;
}

/**
 * Resend経由でメール送信
 */
async function sendViaResend(env, toEmail, type, data) {
  try {
    const subject = type === 'test' 
      ? 'WatchMate - テストメール'
      : `WatchMate - ${data.keyword} の新商品が見つかりました！`;
    
    const html = generateEmailHTML(type, data);
    
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: env.FROM_EMAIL || 'WatchMate <noreply@watchmate.dev>',
        to: [toEmail],
        subject: subject,
        html: html
      })
    });
    
    if (response.ok) {
      console.log('Email sent successfully via Resend');
      return true;
    } else {
      const error = await response.text();
      console.error('Resend error:', error);
      return false;
    }
  } catch (error) {
    console.error('Resend send error:', error);
    return false;
  }
}

/**
 * SendGrid経由でメール送信
 */
async function sendViaSendGrid(env, toEmail, type, data) {
  try {
    const subject = type === 'test'
      ? 'WatchMate - テストメール'
      : `WatchMate - ${data.keyword} の新商品が見つかりました！`;
    
    const html = generateEmailHTML(type, data);
    
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: toEmail }]
        }],
        from: {
          email: env.FROM_EMAIL || 'noreply@watchmate.dev',
          name: 'WatchMate'
        },
        subject: subject,
        content: [{
          type: 'text/html',
          value: html
        }]
      })
    });
    
    if (response.ok || response.status === 202) {
      console.log('Email sent successfully via SendGrid');
      return true;
    } else {
      const error = await response.text();
      console.error('SendGrid error:', error);
      return false;
    }
  } catch (error) {
    console.error('SendGrid send error:', error);
    return false;
  }
}

/**
 * メールHTML生成
 */
function generateEmailHTML(type, data) {
  if (type === 'test') {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f8f9fa; padding: 30px; }
    .product { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #667eea; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>👁️🤝 WatchMate</h1>
      <p>テストメール</p>
    </div>
    <div class="content">
      <p>メール通知機能が正常に動作しています。</p>
      <p><strong>テストデータ:</strong></p>
      ${data.newProducts.map(p => `
        <div class="product">
          <strong>${p.title}</strong><br>
          価格: ${p.price}<br>
          サイト: ${p.site}
        </div>
      `).join('')}
    </div>
  </div>
</body>
</html>
    `;
  }
  
  // 新商品通知
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
    .product { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #28a745; }
    .product-title { font-weight: bold; color: #667eea; margin-bottom: 5px; }
    .product-price { color: #e91e63; font-size: 18px; font-weight: bold; }
    .product-site { color: #666; font-size: 14px; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>👁️🤝 WatchMate</h1>
      <p>新商品が見つかりました！</p>
    </div>
    <div class="content">
      <h2>キーワード: ${data.keyword}</h2>
      <p><strong>${data.totalCount}件</strong>の新しい商品が見つかりました。</p>
      
      ${data.newProducts.map(product => `
        <div class="product">
          <div class="product-title">${product.title}</div>
          <div class="product-price">${product.price}</div>
          <div class="product-site">📍 ${getSiteName(product.site)}</div>
          ${product.url ? `<a href="${product.url}" style="color: #667eea;">商品ページを見る →</a>` : ''}
        </div>
      `).join('')}
      
      <p style="margin-top: 30px; color: #666;">
        このメールは WatchMate の自動通知です。<br>
        ${new Date(data.timestamp).toLocaleString('ja-JP')}
      </p>
    </div>
    <div class="footer">
      <p>WatchMate - Never Miss a Product Update</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * サイト名取得
 */
function getSiteName(siteKey) {
  const names = {
    '7net': 'セブンネット',
    'hmv': 'HMV',
    'animate': 'アニメイト',
    'rakuten': '楽天ブックス'
  };
  return names[siteKey] || siteKey;
}

/**
 * ========================================
 * サイト固有の設定（セレクタ・パターン定義）
 * ========================================
 * 各サイトのHTML構造に基づいて、キーワード入力先と
 * 検索結果取得方法を明示的に定義
 */
const SITE_CONFIGS = {
  /**
   * セブンネット (7net.omni7.jp)
   * - キーワード入力: URLパラメータ ?keyword=
   * - 商品コンテナ: .productList .productItem または .searchResultList li
   * - 商品名: .productName, .itemName, h3.title
   * - 価格: .productPrice, .price, .itemPrice
   * - URL: a[href*="/detail/"], a[href*="/product/"]
   */
  '7net': {
    name: 'セブンネット',
    baseUrl: 'https://7net.omni7.jp',
    searchUrl: (keyword) => `https://7net.omni7.jp/search/?keyword=${encodeURIComponent(keyword)}`,
    searchMethod: 'GET',
    keywordParam: 'keyword',
    // test.sh実動作検証済みのHTML構造:
    // 商品ブロック区切り: <p class="productImg">
    // タイトル: <p class="productName"><a href="URL">TITLE</a></p>
    // 価格: <span class="u-inTaxTxt">XXX.XX</span> (小数あり、一部商品は価格なし)
    // CRLF改行のため前処理で改行除去が必要
    customParser: true
  },

  /**
   * HMV (www.hmv.co.jp)
   * - キーワード入力: URLパス /search/keyword_{キーワード}/
   * - 商品コンテナ: .productWrap, .searchResultItem
   * - 商品名: .productTitle, .itemTitle
   * - 価格: .productPrice, .price
   * - URL: a[href*="/product/"]
   */
  'hmv': {
    name: 'HMV',
    baseUrl: 'https://www.hmv.co.jp',
    searchUrl: (keyword) => `https://www.hmv.co.jp/search/adv_1/category_24/keyword_${encodeURIComponent(keyword)}/target_LBOOKS/type_sr/`,
    searchMethod: 'GET',
    keywordParam: 'path',
    // test.sh実動作検証済みのHTML構造:
    // Shift_JISエンコーディング → TextDecoder('shift_jis')で変換必要
    // タイトル: <h3 class="title"><a href="URL">TITLE</a></h3>
    // 価格: <div class="right">￥XX,XXX</div>
    // ※最初の数個の<h3 class="title">はフォームのフィルター見出し（商品ではない）
    //   実際の商品タイトルは grep -A1 '<h3 class="title">' | grep '<a href=' で抽出
    customParser: true,
    encoding: 'shift_jis'
  },

  /**
   * アニメイト (www.animate-onlineshop.jp)
   * - キーワード入力: URLパラメータ ?keyword=
   * - 商品コンテナ: .product-item, .item-box
   * - 商品名: .product-name, .item-name
   * - 価格: .product-price, .price
   * - URL: a[href*="/products/"]
   */
  'animate': {
    name: 'アニメイト',
    baseUrl: 'https://www.animate-onlineshop.jp',
    searchUrl: (keyword) => `https://www.animate-onlineshop.jp/products/list.php?mode=search&smt=${encodeURIComponent(keyword)}`,
    searchMethod: 'GET',
    keywordParam: 'smt',
    // test.sh実動作検証済みのHTML構造:
    // タイトル: <h3><a href="/pn/..." title="...">TITLE</a></h3>
    // 価格: <p class="price"><font class="notranslate">XXX</font>円(税込)</p>
    // URL: /pn/...パス
    customParser: true
  },

  /**
   * 楽天ブックス (books.rakuten.co.jp)
   * - キーワード入力: URLパラメータ ?sitem=
   * - 商品コンテナ: 検索結果リスト内の各アイテム
   * - 商品名: h3内のリンクテキスト、[l-id="search-c-item-text-*"]
   * - 価格: 「円(税込)」を含むテキスト
   * - URL: https://books.rakuten.co.jp/rb/{商品ID}/
   * 
   * 楽天ブックスの特徴:
   * - 商品リンクは l-id="search-c-item-text-XX" 形式
   * - 価格は「X,XXX円(税込)」形式
   * - カテゴリ(本/グッズ/ゲーム/CD等)がh3の前に表示
   */
  'rakuten': {
    name: '楽天ブックス',
    baseUrl: 'https://books.rakuten.co.jp',
    searchUrl: (keyword) => `https://books.rakuten.co.jp/search?sitem=${encodeURIComponent(keyword)}&g=007&l-id=search-l-genre-1`,
    searchMethod: 'GET',
    keywordParam: 'sitem',
    // test.sh実動作検証済みのHTML構造:
    // 改行でタグが分割されるため、前処理で改行除去+空白正規化が必要
    // タイトル+URL: <a href="https://books.rakuten.co.jp/rb/XXXXX/..."><span class="rbcomp__item-list__item__title">TITLE</span></a>
    // 価格: <span class="rbcomp__item-list__item__price"><em>XXX円</em></span>
    customParser: true
  }
};

/**
 * タイムアウト付きfetch
 * @param {string} url - リクエストURL
 * @param {object} options - fetchオプション
 * @param {number} timeout - タイムアウト時間（ミリ秒）
 * @returns {Promise<Response>} レスポンス
 */
async function fetchWithTimeout(url, options = {}, timeout = 30000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    throw error;
  }
}

/** 共通fetchヘッダー */
const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
};

/**
 * セブンネット検索
 * test.sh検証済み: ブロック単位パース (productImg区切り)
 */
async function search7net(keyword, maxResults = 20) {
  const config = SITE_CONFIGS['7net'];
  const searchUrl = config.searchUrl(keyword);
  
  console.log(`[7net] 検索URL: ${searchUrl}`);
  
  const response = await fetchWithTimeout(searchUrl, {
    headers: FETCH_HEADERS,
    cf: { cacheTtl: 1800, cacheEverything: true }
  }, 30000);
  
  if (!response.ok) {
    throw new Error(`7net returned ${response.status}`);
  }
  
  const html = await response.text();
  return parse7netProducts(html, searchUrl, maxResults);
}

/**
 * HMV検索
 * test.sh検証済み: Shift_JIS→UTF-8変換 + h3.title + div.right価格
 */
async function searchHMV(keyword, maxResults = 20) {
  const config = SITE_CONFIGS['hmv'];
  const searchUrl = config.searchUrl(keyword);
  
  console.log(`[HMV] 検索URL: ${searchUrl}`);
  
  const response = await fetchWithTimeout(searchUrl, {
    headers: FETCH_HEADERS,
    cf: { cacheTtl: 1800, cacheEverything: true }
  }, 30000);
  
  if (!response.ok) {
    throw new Error(`HMV returned ${response.status}`);
  }
  
  // Shift_JIS → UTF-8 変換
  let html;
  try {
    const buffer = await response.arrayBuffer();
    html = new TextDecoder('shift_jis').decode(buffer);
  } catch (e) {
    console.log('[HMV] Shift_JIS decode failed, falling back to utf-8');
    html = new TextDecoder('utf-8').decode(await response.arrayBuffer());
  }
  
  return parseHMVProducts(html, searchUrl, maxResults);
}

/**
 * アニメイト検索
 * test.sh検証済み: h3 > a[title] + p.price font.notranslate
 */
async function searchAnimate(keyword, maxResults = 20) {
  const config = SITE_CONFIGS['animate'];
  const searchUrl = config.searchUrl(keyword);
  
  console.log(`[Animate] 検索URL: ${searchUrl}`);
  
  const response = await fetchWithTimeout(searchUrl, {
    headers: FETCH_HEADERS,
    cf: { cacheTtl: 1800, cacheEverything: true }
  }, 30000);
  
  if (!response.ok) {
    throw new Error(`Animate returned ${response.status}`);
  }
  
  const html = await response.text();
  return parseAnimateProducts(html, searchUrl, maxResults);
}

/**
 * 楽天ブックス検索
 * test.sh検証済み: 改行除去前処理 + rbcomp__item-list__item__title/price
 */
async function searchRakuten(keyword, maxResults = 20) {
  const config = SITE_CONFIGS['rakuten'];
  const searchUrl = config.searchUrl(keyword);
  
  console.log(`[Rakuten] 検索URL: ${searchUrl}`);
  
  const response = await fetchWithTimeout(searchUrl, {
    headers: FETCH_HEADERS,
    cf: { cacheTtl: 1800, cacheEverything: true }
  }, 30000);
  
  if (!response.ok) {
    throw new Error(`Rakuten returned ${response.status}`);
  }
  
  const html = await response.text();
  return parseRakutenProducts(html, searchUrl, maxResults);
}

/**
 * ========================================
 * サイト固有パーサー（test.sh実動作検証済み）
 * ========================================
 * HTMLRewriter APIの代わりに、test.shで検証済みの正規表現パターンを使用。
 * 各サイトのHTML構造に合わせたブロック単位パースで
 * タイトル・価格の正確なペアリングを実現。
 */

/**
 * ========== HTMLユーティリティ ==========
 */
function stripTags(str) {
  return str.replace(/<[^>]+>/g, '');
}

function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

/**
 * ========== セブンネット専用パーサー ==========
 * test.sh検証済み:
 * - CRLF改行除去 → 1行化
 * - <p class="productImg"> で商品ブロック分割
 * - 各ブロック内で productName と u-inTaxTxt をペアリング
 * - u-inTaxTxt は小数（679.80）の場合あり → 整数化
 * - 一部商品は価格なし（雑誌お取置き等）
 */
function parse7netProducts(html, sourceUrl, maxResults) {
  console.log('[7net] サイト固有パーサー使用（ブロック単位）');
  
  const products = [];
  const seenTitles = new Set();
  
  // CRLF除去して1行化
  const oneline = html.replace(/\r?\n/g, '');
  
  // <p class="productImg"> で商品ブロックに分割
  const blocks = oneline.split(/<p class="productImg">/);
  
  // 最初のブロック（ヘッダー部分）はスキップ
  for (let i = 1; i < blocks.length && products.length < maxResults; i++) {
    const block = blocks[i];
    
    // タイトルとURL抽出: <p class="productName"><a href="URL"...>TITLE</a></p>
    const nameMatch = block.match(/<p class="productName"><a href="([^"]*)"[^>]*>(.+?)<\/a><\/p>/);
    if (!nameMatch) continue;
    
    let url = nameMatch[1];
    let title = stripTags(nameMatch[2]).trim();
    title = decodeHtmlEntities(title);
    
    if (!title || title.length < 3) continue;
    if (seenTitles.has(title)) continue;
    seenTitles.add(title);
    
    // URL正規化
    if (url.startsWith('//')) {
      url = 'https:' + url;
    } else if (url.startsWith('/')) {
      url = 'https://7net.omni7.jp' + url;
    }
    
    // 価格抽出: <span class="u-inTaxTxt">XXX.XX</span> (小数対応)
    const priceMatch = block.match(/<span class="u-inTaxTxt">([0-9,.]+)<\/span>/);
    let price = '価格を確認';
    if (priceMatch) {
      // 小数点以下を除去して整数表示 (679.80 → 679)
      const priceNum = priceMatch[1].split('.')[0];
      price = `¥${priceNum}(税込)`;
    }
    
    products.push({
      title,
      price,
      url,
      site: '7net',
      extractedBy: '7net-block-parser'
    });
  }
  
  console.log(`[7net] 抽出完了: ${products.length}件`);
  return products;
}

/**
 * ========== HMV専用パーサー ==========
 * test.sh検証済み:
 * - Shift_JIS → UTF-8変換は searchHMV() で実施済み
 * - タイトル: <h3 class="title"> の次行の <a href="URL">TITLE</a>
 *   ※最初の数個のh3.titleはフォームフィルター見出し（<a>タグなし）
 * - 価格: <div class="right">￥XX,XXX</div>
 * - 抽出パイプライン: grep -A1 '<h3 class="title">' | grep '<a href=' で商品のみ
 */
function parseHMVProducts(html, sourceUrl, maxResults) {
  console.log('[HMV] サイト固有パーサー使用');
  
  const products = [];
  const seenTitles = new Set();
  
  // タイトルとURL: <h3 class="title">の次行にある<a href="...">TITLE</a>
  // 複数行にまたがるため、h3.titleブロック全体をマッチ
  const titlePattern = /<h3 class="title">\s*<a href="([^"]*)"[^>]*>([^<]+)<\/a>/gi;
  const titles = [];
  let m;
  while ((m = titlePattern.exec(html)) !== null) {
    const url = m[1].startsWith('/') ? 'https://www.hmv.co.jp' + m[1] : m[1];
    const title = decodeHtmlEntities(m[2].trim());
    if (title && title.length > 3) {
      titles.push({ title, url });
    }
  }
  
  // 価格: <div class="right">￥XX,XXX</div>
  const pricePattern = /<div class="right">￥([0-9,]+)<\/div>/gi;
  const prices = [];
  while ((m = pricePattern.exec(html)) !== null) {
    prices.push(m[1]);
  }
  
  // ペアリング（test.shで titles.length === prices.length を検証済み）
  for (let i = 0; i < titles.length && products.length < maxResults; i++) {
    const { title, url } = titles[i];
    if (seenTitles.has(title)) continue;
    seenTitles.add(title);
    
    const price = i < prices.length ? `¥${prices[i]}(税込)` : '価格を確認';
    
    products.push({
      title,
      price,
      url,
      site: 'hmv',
      extractedBy: 'hmv-specific-parser'
    });
  }
  
  console.log(`[HMV] 抽出完了: ${products.length}件`);
  return products;
}

/**
 * ========== アニメイト専用パーサー ==========
 * test.sh検証済み:
 * - タイトルとURL: <h3><a href="/pn/..." title="...">TITLE</a></h3>
 * - 価格: <p class="price"><font class="notranslate">XXX</font>円(税込)</p>
 * - タイトル数 === 価格数（test.shで40=40を検証済み）
 */
function parseAnimateProducts(html, sourceUrl, maxResults) {
  console.log('[Animate] サイト固有パーサー使用');
  
  const products = [];
  const seenTitles = new Set();
  
  // タイトルとURL: <h3><a href="URL"...>TITLE</a></h3>
  const titlePattern = /<h3><a href="([^"]*)"[^>]*>([^<]+)<\/a><\/h3>/gi;
  const titles = [];
  let m;
  while ((m = titlePattern.exec(html)) !== null) {
    let url = m[1];
    if (url.startsWith('/')) {
      url = 'https://www.animate-onlineshop.jp' + url;
    }
    const title = stripTags(decodeHtmlEntities(m[2].trim()));
    if (title && title.length > 3) {
      titles.push({ title, url });
    }
  }
  
  // 価格: <p class="price"><font class="notranslate">XXX</font>円
  const pricePattern = /<p class="price"><font class="notranslate">([0-9,]+)<\/font>円/gi;
  const prices = [];
  while ((m = pricePattern.exec(html)) !== null) {
    prices.push(m[1]);
  }
  
  // ペアリング
  for (let i = 0; i < titles.length && products.length < maxResults; i++) {
    const { title, url } = titles[i];
    if (seenTitles.has(title)) continue;
    seenTitles.add(title);
    
    const price = i < prices.length ? `¥${prices[i]}(税込)` : '価格を確認';
    
    products.push({
      title,
      price,
      url,
      site: 'animate',
      extractedBy: 'animate-specific-parser'
    });
  }
  
  console.log(`[Animate] 抽出完了: ${products.length}件`);
  return products;
}

/**
 * ========== 楽天ブックス専用パーサー ==========
 * test.sh検証済み:
 * - 前処理: 改行除去 + タグ間の空白正規化
 * - タイトル+URL: <a href="https://books.rakuten.co.jp/rb/XXXXX/...">
 *                 <span class="rbcomp__item-list__item__title">TITLE</span></a>
 * - 価格: <span class="rbcomp__item-list__item__price"><em>XXX円</em></span>
 * - タイトル数 === 価格数（test.shで30=30を検証済み）
 */
function parseRakutenProducts(html, sourceUrl, maxResults) {
  console.log('[楽天ブックス] サイト固有パーサー使用');
  
  const products = [];
  const seenTitles = new Set();
  
  // 前処理: 改行除去 + タグ間空白正規化（test.shと同じ処理）
  const oneline = html.replace(/\r?\n/g, '').replace(/>\s+</g, '><');
  
  // タイトルとURL同時抽出
  // <a href="https://books.rakuten.co.jp/rb/XXXXX/..."><span class="rbcomp__item-list__item__title">TITLE</span>
  const titlePattern = /<a href="(https:\/\/books\.rakuten\.co\.jp\/rb\/\d+\/[^"]*)"><span class="rbcomp__item-list__item__title">([^<]+)<\/span>/gi;
  const titles = [];
  let m;
  while ((m = titlePattern.exec(oneline)) !== null) {
    const url = m[1];
    const title = decodeHtmlEntities(m[2].trim());
    if (title && title.length > 3) {
      titles.push({ title, url });
    }
  }
  
  // 価格: <span class="rbcomp__item-list__item__price"><em>XXX円</em>
  const pricePattern = /<span class="rbcomp__item-list__item__price"><em>([0-9,]+)円<\/em>/gi;
  const prices = [];
  while ((m = pricePattern.exec(oneline)) !== null) {
    prices.push(m[1]);
  }
  
  // ペアリング
  for (let i = 0; i < titles.length && products.length < maxResults; i++) {
    const { title, url } = titles[i];
    if (seenTitles.has(title)) continue;
    seenTitles.add(title);
    
    const price = i < prices.length ? `¥${prices[i]}(税込)` : '価格を確認';
    
    products.push({
      title,
      price,
      url,
      site: 'rakuten',
      extractedBy: 'rakuten-specific-parser'
    });
  }
  
  console.log(`[楽天ブックス] 抽出完了: ${products.length}件`);
  return products;
}

/**
 * HTML解析（汎用）- 後方互換性のため残す
 * @deprecated サイト固有パーサーを使用してください
 */
function parseProducts(html, site, sourceUrl, maxResults) {
  console.log(`[DEPRECATED] parseProducts called for ${site}`);
  // サイト固有パーサーにルーティング
  switch (site) {
    case '7net': return parse7netProducts(html, sourceUrl, maxResults);
    case 'hmv': return parseHMVProducts(html, sourceUrl, maxResults);
    case 'animate': return parseAnimateProducts(html, sourceUrl, maxResults);
    case 'rakuten': return parseRakutenProducts(html, sourceUrl, maxResults);
    default: return [];
  }
}

/**
 * CORS対応
 */
function handleOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    }
  });
}

/**
 * JSONレスポンス
 */
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}

/**
 * ウェルカムページ
 */
function getWelcomePage() {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>WatchMate API v2.0 - Never Miss a Product Update</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            max-width: 900px; 
            margin: 0 auto; 
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container {
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .logo {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo-icon {
            font-size: 64px;
            margin-bottom: 10px;
        }
        h1 { 
            color: #667eea;
            text-align: center;
            margin-bottom: 10px;
        }
        .tagline {
            text-align: center;
            color: #666;
            font-size: 18px;
            margin-bottom: 30px;
            font-style: italic;
        }
        .version {
            text-align: center;
            background: #28a745;
            color: white;
            padding: 5px 15px;
            border-radius: 20px;
            display: inline-block;
            margin-bottom: 20px;
        }
        .feature {
            display: inline-block;
            background: #d4edda;
            color: #155724;
            padding: 8px 15px;
            border-radius: 20px;
            margin: 5px;
            font-size: 14px;
        }
        .sites {
            background: #e3f2fd;
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
        }
        .site-badge {
            display: inline-block;
            background: white;
            padding: 10px 15px;
            border-radius: 5px;
            margin: 5px;
            border-left: 3px solid #667eea;
        }
        .endpoint { 
            background: #f8f9fa;
            padding: 20px;
            margin: 15px 0;
            border-radius: 10px;
            border-left: 4px solid #667eea;
        }
        .endpoint h3 {
            color: #667eea;
            margin-bottom: 10px;
        }
        code { 
            background: #e9ecef;
            padding: 3px 8px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            font-size: 13px;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e9ecef;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">
            <div class="logo-icon">👁️🤝</div>
            <h1>WatchMate API</h1>
            <div class="version">v2.0</div>
            <p class="tagline">Never Miss a Product Update</p>
        </div>
        
        <div style="margin-bottom: 30px; text-align: center;">
            <span class="feature">✓ 4 Sites</span>
            <span class="feature">✓ Auto-scraping</span>
            <span class="feature">✓ Email Alerts</span>
            <span class="feature">✓ 100% Free</span>
        </div>
        
        <div class="sites">
            <h3 style="margin-bottom: 15px;">📚 対応サイト</h3>
            <span class="site-badge">📘 セブンネット</span>
            <span class="site-badge">🎵 HMV</span>
            <span class="site-badge">⭐ アニメイト</span>
            <span class="site-badge">📕 楽天ブックス</span>
        </div>
        
        <h2 style="color: #667eea;">📡 API Endpoints</h2>
        
        <div class="endpoint">
            <h3>GET /api/keywords</h3>
            <p>登録キーワード一覧を取得</p>
        </div>
        
        <div class="endpoint">
            <h3>POST /api/keywords/add</h3>
            <p>新しいキーワードを追加（メール通知設定可能）</p>
            <code>{"keyword": "商品名", "sites": ["7net","hmv","animate","rakuten"], "emailNotification": true, "notifyEmail": "you@example.com"}</code>
        </div>
        
        <div class="endpoint">
            <h3>GET /api/data/latest?keyword=商品名</h3>
            <p>特定キーワードの最新データを取得</p>
        </div>
        
        <div class="endpoint">
            <h3>POST /api/email/test</h3>
            <p>テストメール送信</p>
            <code>{"email": "you@example.com"}</code>
        </div>
        
        <h2 style="color: #667eea; margin-top: 40px;">📧 メール通知機能</h2>
        <div style="background: #fff3cd; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <p><strong>新商品が見つかったときに自動メール通知！</strong></p>
            <p style="margin-top: 10px;">
              環境変数に <code>RESEND_API_KEY</code> または <code>SENDGRID_API_KEY</code> を設定してください。
            </p>
        </div>
        
        <h2 style="color: #667eea; margin-top: 40px;">⏰ 自動監視</h2>
        <div style="background: #e3f2fd; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <p style="margin: 0; font-size: 16px;">
                <strong>スケジュール:</strong> 30分ごと（1日48回）<br>
                <strong>対象サイト:</strong> 4サイト同時監視<br>
                <strong>通知:</strong> 新商品発見時にメール送信
            </p>
        </div>
        
        <div class="footer">
            <p><strong>WatchMate v2.0</strong> - Never Miss a Product Update 🔍</p>
            <p style="font-size: 14px; margin-top: 10px;">
                Powered by Cloudflare Workers ⚡
            </p>
        </div>
    </div>
</body>
</html>`;
}
