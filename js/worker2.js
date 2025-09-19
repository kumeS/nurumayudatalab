export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. CORSプリフライト対応
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400"
        }
      });
    }

    // 2. モデル一覧取得エンドポイント（/models）
    if (url.pathname === "/models" && request.method === "GET") {
      try {
        const apiRes = await fetch(
          "https://api.intelligence.io.solutions/api/v1/models",
          {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${env.IONET_API_KEY}`,
              "Content-Type": "application/json"
            }
          }
        );

        const modelsData = await apiRes.json();

        return new Response(JSON.stringify(modelsData), {
          status: apiRes.status,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Access-Control-Allow-Origin": "*"
          }
        });

      } catch (err) {
        console.error("Model API Error:", err);
        return new Response(JSON.stringify({ error: "Failed to fetch models" }), {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        });
      }
    }

    // 3. POST以外は拒否（チャット完了エンドポイント）
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: { "Access-Control-Allow-Origin": "*" }
      });
    }

    // 4. JSONパース例外処理
    let userInput;
    try {
      userInput = await request.json();                  // JSON パース :contentReference[oaicite:5]{index=5}
    } catch {
      return new Response("Invalid JSON", {
        status: 400,
        headers: { "Access-Control-Allow-Origin": "*" }
      });
    }

    // 5. IOnet API 呼び出し（stream 対応）
    try {
      const apiRes = await fetch(
        "https://api.intelligence.io.solutions/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.IONET_API_KEY}`, // API キー保持 :contentReference[oaicite:6]{index=6}
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            ...userInput,
            max_completion_tokens: userInput.max_completion_tokens ?? 1024, // 出力上限 :contentReference[oaicite:7]{index=7}
            stream: userInput.stream === true                   // ストリーミング指定 :contentReference[oaicite:8]{index=8}
          })
        }
      );

      // 6. ストリーミングレスポンス返却
      return new Response(apiRes.body, {
        status: apiRes.status,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Access-Control-Allow-Origin": "*"                 // 常にCORS許可 :contentReference[oaicite:9]{index=9}
        }
      });

    } catch (err) {
      // 7. 内部エラー処理
      console.error("Worker Error:", err);                  // デバッグログ :contentReference[oaicite:10]{index=10}
      return new Response("Internal Server Error", {
        status: 500,
        headers: { "Access-Control-Allow-Origin": "*" }
      });
    }
  }
}
