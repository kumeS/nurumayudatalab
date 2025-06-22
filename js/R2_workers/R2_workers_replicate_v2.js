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

    // 全ての出力ファイルURLを抽出
    const fileUrls = this.extractAllFileUrls(responseData);
    
    if (fileUrls.length === 0) {
      console.log("No file URLs found in response");
      return;
    }

    console.log(`Found ${fileUrls.length} file URLs to process`);

    // モデル名を抽出
    const modelName = this.extractModelName(responseData);

    // 各ファイルを並列処理
    const savePromises = fileUrls.map(async (fileUrl, index) => {
      try {
        // ファイルをダウンロード
        const fileResponse = await fetch(fileUrl);
        if (!fileResponse.ok) {
          throw new Error(`Failed to fetch file: ${fileResponse.status}`);
        }

        // Content-Typeからファイル形式を判定
        const contentType = fileResponse.headers.get('content-type') || '';
        const extension = this.getFileExtension(contentType, fileUrl);
        
        if (!extension) {
          console.warn(`Unsupported file format: ${contentType}, URL: ${fileUrl}`);
          return;
        }

        // ファイルデータを取得
        const fileData = await fileResponse.arrayBuffer();
        
        // ファイル名を生成（モデル名を含む）
        const fileName = this.generateFileName(modelName, index, extension);
        
        // R2に保存
        await env.IMAGE_BUCKET.put(fileName, fileData, {
          httpMetadata: {
            contentType: contentType || this.getContentTypeForExtension(extension)
          }
        });

        console.log(`File saved to R2: ${fileName} (${fileData.byteLength} bytes)`);
        
      } catch (error) {
        console.error(`Failed to process file ${index}:`, error);
        // 個別ファイルのエラーは継続処理
      }
    });

    // 全てのファイル処理を待機
    await Promise.all(savePromises);
  },

  // レスポンスデータから全ファイルURLを抽出（GLB、MP4、画像など）
  extractAllFileUrls(responseData) {
    const fileUrls = [];

    // TRELLIS v2の出力形式に対応
    if (responseData.output) {
      // GLBモデルファイル
      if (responseData.output.model_file) {
        fileUrls.push(responseData.output.model_file);
      }
      
      // 動画ファイル
      if (responseData.output.color_video) {
        fileUrls.push(responseData.output.color_video);
      }
      if (responseData.output.normal_video) {
        fileUrls.push(responseData.output.normal_video);
      }
      if (responseData.output.combined_video) {
        fileUrls.push(responseData.output.combined_video);
      }
      
      // 背景除去画像
      if (Array.isArray(responseData.output.no_background_images)) {
        responseData.output.no_background_images.forEach(imageUrl => {
          if (typeof imageUrl === 'string' && this.isValidUrl(imageUrl)) {
            fileUrls.push(imageUrl);
          }
        });
      }
      
      // その他の配列形式の出力
      if (Array.isArray(responseData.output)) {
        responseData.output.forEach(item => {
          if (typeof item === 'string' && this.isValidUrl(item)) {
            fileUrls.push(item);
          }
        });
      } else if (typeof responseData.output === 'string' && this.isValidUrl(responseData.output)) {
        fileUrls.push(responseData.output);
      }
    }

    // 重複を除去
    return [...new Set(fileUrls)];
  },

  // レスポンスデータから画像URLを抽出（後方互換性のため保持）
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

  // URLが有効かどうか判定
  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },

  // Content-Typeまたはファイル拡張子から正しい拡張子を取得
  getFileExtension(contentType, url) {
    // Content-Typeから判定
    const typeMap = {
      'model/gltf-binary': 'glb',
      'model/gltf+json': 'gltf',
      'application/octet-stream': null, // URLから判定
      'video/mp4': 'mp4',
      'video/mpeg': 'mp4',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg', 
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/bmp': 'bmp'
    };

    // Content-Typeがマップにある場合
    if (contentType && typeMap[contentType.toLowerCase()]) {
      return typeMap[contentType.toLowerCase()];
    }

    // URLから拡張子を抽出
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname.toLowerCase();
      const match = pathname.match(/\.([a-z0-9]+)$/);
      if (match) {
        const ext = match[1];
        // サポートする拡張子のみ許可
        if (['glb', 'gltf', 'mp4', 'mov', 'avi', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) {
          return ext === 'jpeg' ? 'jpg' : ext;
        }
      }
    } catch {
      // URL解析エラーは無視
    }

    // application/octet-streamでGLBファイルの場合
    if (contentType && contentType.toLowerCase().includes('octet-stream')) {
      try {
        const urlObj = new URL(url);
        if (urlObj.pathname.toLowerCase().includes('glb') || urlObj.pathname.toLowerCase().includes('model')) {
          return 'glb';
        }
      } catch {
        // URL解析エラーは無視
      }
    }

    return null;
  },

  // 拡張子からContent-Typeを取得
  getContentTypeForExtension(extension) {
    const extMap = {
      'glb': 'model/gltf-binary',
      'gltf': 'model/gltf+json',
      'mp4': 'video/mp4',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'bmp': 'image/bmp'
    };
    
    return extMap[extension.toLowerCase()] || 'application/octet-stream';
  },

  // Content-Typeまたは拡張子から画像の拡張子を取得（後方互換性のため保持）
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