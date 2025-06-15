// Replicate API汎用プロキシ用Cloudflare Worker
// ローカル側でAPI URLを受け取れるようにします
export default {
  async fetch(request, env, ctx) {
    // 1. CORSプリフライト対応
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400"
        }
      });
    }

    // 2. POST以外は拒否
    if (request.method !== "POST") {
      return new Response(JSON.stringify({
        error: "Method Not Allowed"
      }), {
        status: 405,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*" 
        }
      });
    }

    // 3. JSONパース例外処理
    let userInput;
    try {
      userInput = await request.json();
    } catch (error) {
      return new Response(JSON.stringify({
        error: "Invalid JSON",
        details: error.message
      }), {
        status: 400,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*" 
        }
      });
    }

    // 4. 必須パラメータの検証
    if (!userInput.apiUrl) {
      return new Response(JSON.stringify({
        error: "Missing required parameter: apiUrl"
      }), {
        status: 400,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*" 
        }
      });
    }

    // 5. Replicate API URLの検証（セキュリティ）
    const allowedDomains = [
      'api.replicate.com'
    ];
    
    let apiUrl;
    try {
      apiUrl = new URL(userInput.apiUrl);
    } catch (error) {
      return new Response(JSON.stringify({
        error: "Invalid API URL format"
      }), {
        status: 400,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*" 
        }
      });
    }

    if (!allowedDomains.includes(apiUrl.hostname)) {
      return new Response(JSON.stringify({
        error: "Unauthorized API domain"
      }), {
        status: 403,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*" 
        }
      });
    }

    // 6. Replicate API 呼び出し
    try {
      // API Key確認
      if (!env.REPLICATE_API_TOKEN) {
        throw new Error("REPLICATE_API_TOKEN not configured");
      }

      // Replicate APIの仕様に合わせたリクエストボディの準備
      // userInput.payload がReplicate APIに送信される完全なボディ
      const requestBody = userInput.payload || {};

      console.log(`Calling Replicate API: ${userInput.apiUrl}`);
      console.log(`Request body:`, JSON.stringify(requestBody, null, 2));

      // AbortControllerでタイムアウト制御を追加
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 120000); // 120秒のタイムアウト（Minimax Image-01の平均74.7秒に対応）

      try {
        // 非同期処理でリクエストを開始（Prefer: "wait"を削除）
        const apiRes = await fetch(userInput.apiUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.REPLICATE_API_TOKEN}`,
            "Content-Type": "application/json"
            // Prefer: "wait" を削除 - 非同期処理に変更
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });

        // タイムアウトをクリア
        clearTimeout(timeoutId);

        // レスポンスの取得
        const responseText = await apiRes.text();
        console.log(`Replicate API Response Status: ${apiRes.status}`);
        console.log(`Replicate API Response: ${responseText}`);

        if (!apiRes.ok) {
          // Replicate APIのエラーレスポンスをそのまま返す
          let errorData;
          try {
            errorData = JSON.parse(responseText);
          } catch (parseError) {
            errorData = { error: responseText };
          }
          
          return new Response(JSON.stringify({
            error: "Replicate API error",
            status: apiRes.status,
            details: errorData
          }), {
            status: apiRes.status,
            headers: { 
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*" 
            }
          });
        }

        // JSON解析を試行
        let responseData;
        try {
          responseData = JSON.parse(responseText);
        } catch (parseError) {
          throw new Error(`Failed to parse Replicate API response: ${parseError.message}`);
        }

        // 非同期レスポンスの場合、prediction URLが返される
        if (responseData.urls && responseData.urls.get) {
          // ポーリングで結果を取得
          const pollResult = await this.pollForResult(responseData.urls.get, env.REPLICATE_API_TOKEN, controller);
          if (pollResult.success) {
            responseData = pollResult.data;
          } else {
            throw new Error(pollResult.error);
          }
        }
        
        // 7. 成功レスポンス返却
        return new Response(JSON.stringify(responseData), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        });

      } catch (fetchError) {
        // タイムアウトをクリア
        clearTimeout(timeoutId);
        
        if (fetchError.name === 'AbortError') {
          throw new Error('Cloudflare Workers timeout (120 seconds) - Minimax Image-01 generation time exceeded Worker limits');
        }
        throw fetchError;
      }

    } catch (err) {
      // 8. 内部エラー処理
      console.error("Worker Error:", err);
      return new Response(JSON.stringify({
        error: "画像生成に失敗しました",
        details: err.message,
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*" 
        }
      });
    }
  },

  // ポーリング用メソッドを追加
  async pollForResult(pollUrl, apiToken, controller, maxAttempts = 20) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const pollRes = await fetch(pollUrl, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${apiToken}`,
            "Content-Type": "application/json"
          },
          signal: controller.signal
        });

        if (!pollRes.ok) {
          throw new Error(`Poll request failed: ${pollRes.status}`);
        }

        const pollData = await pollRes.json();
        console.log(`Poll attempt ${attempt + 1}: Status = ${pollData.status}`);

        if (pollData.status === 'succeeded') {
          return { success: true, data: pollData };
        } else if (pollData.status === 'failed') {
          return { success: false, error: `Generation failed: ${pollData.error}` };
        } else if (pollData.status === 'canceled') {
          return { success: false, error: 'Generation was canceled' };
        }

        // まだ処理中の場合は待機
        if (pollData.status === 'starting' || pollData.status === 'processing') {
          const waitTime = Math.min(2000 + (attempt * 1000), 8000); // 2-8秒の可変待機
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }

        // 予期しないステータス
        throw new Error(`Unexpected status: ${pollData.status}`);

      } catch (pollError) {
        if (pollError.name === 'AbortError') {
          return { success: false, error: 'Polling aborted due to timeout' };
        }
        
        // 最後の試行でない場合は再試行
        if (attempt < maxAttempts - 1) {
          console.warn(`Poll attempt ${attempt + 1} failed, retrying:`, pollError.message);
          await new Promise(resolve => setTimeout(resolve, 3000));
          continue;
        }
        
        return { success: false, error: `Polling failed: ${pollError.message}` };
      }
    }

    return { success: false, error: 'Polling exceeded maximum attempts' };
  }
}