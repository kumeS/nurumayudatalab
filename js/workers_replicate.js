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

      const apiRes = await fetch(userInput.apiUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.REPLICATE_API_TOKEN}`,
          "Content-Type": "application/json",
          "Prefer": "wait" // 同期レスポンスを要求
        },
        body: JSON.stringify(requestBody)
      });

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
      
      // 7. 成功レスポンス返却
      return new Response(JSON.stringify(responseData), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });

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
  }
}