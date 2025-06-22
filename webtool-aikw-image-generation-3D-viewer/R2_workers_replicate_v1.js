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
        
        // 画像URLを抽出してR2に保存
        try {
          await this.processAndSaveImages(responseData, env);
        } catch (imageError) {
          console.error("Image processing failed:", imageError);
          // 画像保存エラーは警告のみ（クライアントへのレスポンスは継続）
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
  },

  // 画像処理・R2保存用メソッドを追加
  async processAndSaveImages(responseData, env) {
    // R2バインディング確認
    if (!env.IMAGE_BUCKET) {
      throw new Error("R2 bucket binding not configured");
    }

    // 画像URLを抽出
    const imageUrls = this.extractImageUrls(responseData);
    
    if (imageUrls.length === 0) {
      console.log("No image URLs found in response");
      return;
    }

    console.log(`Found ${imageUrls.length} image URLs to process`);

    // モデル名を抽出
    const modelName = this.extractModelName(responseData);

    // 各画像を並列処理
    const savePromises = imageUrls.map(async (imageUrl, index) => {
      try {
        // 画像をダウンロード
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
          throw new Error(`Failed to fetch image: ${imageResponse.status}`);
        }

        // Content-Typeから画像形式を判定
        const contentType = imageResponse.headers.get('content-type') || '';
        const extension = this.getImageExtension(contentType, imageUrl);
        
        if (!extension) {
          throw new Error(`Unsupported image format: ${contentType}`);
        }

        // 画像データを取得
        const imageData = await imageResponse.arrayBuffer();
        
        // ファイル名を生成（モデル名を含む）
        const fileName = this.generateFileName(modelName, index, extension);
        
        // R2に保存
        await env.IMAGE_BUCKET.put(fileName, imageData, {
          httpMetadata: {
            contentType: contentType || `image/${extension}`
          }
        });

        console.log(`Image saved to R2: ${fileName} (${imageData.byteLength} bytes)`);
        
      } catch (error) {
        console.error(`Failed to process image ${index}:`, error);
        throw error;
      }
    });

    // 全ての画像処理を待機
    await Promise.all(savePromises);
  },

  // レスポンスデータから画像URLを抽出
  extractImageUrls(responseData) {
    const imageUrls = [];

    // 一般的なReplicateのレスポンス形式に対応
    if (responseData.output) {
      if (Array.isArray(responseData.output)) {
        // 配列の場合
        responseData.output.forEach(item => {
          if (typeof item === 'string' && this.isImageUrl(item)) {
            imageUrls.push(item);
          }
        });
      } else if (typeof responseData.output === 'string' && this.isImageUrl(responseData.output)) {
        // 単一URLの場合
        imageUrls.push(responseData.output);
      } else if (typeof responseData.output === 'object') {
        // オブジェクトの場合、再帰的に検索
        this.findImageUrlsInObject(responseData.output, imageUrls);
      }
    }

    // 他の可能性のあるフィールドもチェック
    ['result', 'results', 'images', 'image', 'url', 'urls'].forEach(field => {
      if (responseData[field]) {
        if (Array.isArray(responseData[field])) {
          responseData[field].forEach(item => {
            if (typeof item === 'string' && this.isImageUrl(item)) {
              imageUrls.push(item);
            }
          });
        } else if (typeof responseData[field] === 'string' && this.isImageUrl(responseData[field])) {
          imageUrls.push(responseData[field]);
        }
      }
    });

    // 重複を除去
    return [...new Set(imageUrls)];
  },

  // オブジェクト内の画像URLを再帰的に検索
  findImageUrlsInObject(obj, imageUrls) {
    for (const key in obj) {
      if (obj[key] && typeof obj[key] === 'object') {
        this.findImageUrlsInObject(obj[key], imageUrls);
      } else if (typeof obj[key] === 'string' && this.isImageUrl(obj[key])) {
        imageUrls.push(obj[key]);
      }
    }
  },

  // URLが画像URLかどうか判定
  isImageUrl(url) {
    try {
      const urlObj = new URL(url);
      // 一般的な画像ファイル拡張子をチェック
      const pathname = urlObj.pathname.toLowerCase();
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
      
      // 拡張子チェック
      const hasImageExtension = imageExtensions.some(ext => pathname.endsWith(ext));
      
      // Replicateの画像URLパターンもチェック
      const isReplicateImage = urlObj.hostname.includes('replicate') && 
                               (pathname.includes('/prediction') || pathname.includes('/output'));
      
      return hasImageExtension || isReplicateImage;
    } catch {
      return false;
    }
  },

  // Content-Typeまたは拡張子から画像の拡張子を取得
  getImageExtension(contentType, url) {
    // Content-Typeから判定
    const typeMap = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/bmp': 'bmp'
    };

    if (contentType && typeMap[contentType.toLowerCase()]) {
      return typeMap[contentType.toLowerCase()];
    }

    // URLから拡張子を抽出
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname.toLowerCase();
      const match = pathname.match(/\.([a-z]+)$/);
      if (match) {
        const ext = match[1];
        // サポートする拡張子のみ許可
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) {
          return ext === 'jpeg' ? 'jpg' : ext;
        }
      }
    } catch {
      // URL解析エラーは無視
    }

    // デフォルトはpng
    return 'png';
  },

  // レスポンスからモデル名を抽出
  extractModelName(responseData) {
    // Replicateのレスポンスからモデル名を抽出
    if (responseData.model) {
      // "owner/model:version" 形式からモデル名部分を抽出
      const modelPath = responseData.model.split(':')[0]; // version部分を除去
      const modelName = modelPath.split('/').pop(); // owner部分を除去
      return modelName;
    }
    
    if (responseData.version && responseData.version.model) {
      const modelPath = responseData.version.model.split(':')[0];
      const modelName = modelPath.split('/').pop();
      return modelName;
    }
    
    // その他の可能性のあるフィールド
    if (responseData.prediction && responseData.prediction.model) {
      const modelPath = responseData.prediction.model.split(':')[0];
      const modelName = modelPath.split('/').pop();
      return modelName;
    }
    
    // モデル名が見つからない場合はデフォルト
    return 'unknown-model';
  },

  // ファイル名を生成（モデル名＋日時形式）
  generateFileName(modelName, index, extension) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const second = String(now.getSeconds()).padStart(2, '0');
    
    // モデル名をファイル名に適した形式に変換（特殊文字を除去）
    const safeModelName = modelName.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
    
    // 形式: モデル名-年月日-時分秒-インデックス.拡張子
    return `${safeModelName}-${year}${month}${day}-${hour}${minute}${second}-${index}.${extension}`;
  }
}