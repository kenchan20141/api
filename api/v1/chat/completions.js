// api/v1/chat/completions.js

export const config = {
  runtime: 'nodejs',
};

// 通用的 API 請求函數，支持 key 輪換
async function makeApiRequest(url, apiKey, headers, body, validKeys = [], invalidKeys = new Set()) {
  let currentApiKey = apiKey;
  let attempts = 0;
  const maxAttempts = validKeys.length > 0 ? Math.min(validKeys.length, 3) : 1;
  
  while (attempts < maxAttempts) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentApiKey}`,
          ...headers
        },
        body: JSON.stringify(body)
      });

      // 如果是認證錯誤或限流錯誤，嘗試更換key
      if (response.status === 401 || response.status === 429 || response.status === 403) {
        const errorText = await response.text();
        console.warn(`API Key failed (status ${response.status}): ${errorText}`);
        
        // 將當前失效的key加入無效集合
        invalidKeys.add(currentApiKey);
        
        // 嘗試找到下一個有效的key
        const nextKey = validKeys.find(k => !invalidKeys.has(k) && k !== currentApiKey);
        if (nextKey) {
          currentApiKey = nextKey;
          attempts++;
          continue; // 用新key重試
        } else {
          // 沒有可用的備用key了
          return {
            success: false,
            response: new Response(JSON.stringify({ 
              error: { 
                message: 'All API keys are exhausted or invalid', 
                type: 'api_key_error',
                details: errorText
              } 
            }), { status: response.status })
          };
        }
      }
      
      // 非認證/限流錯誤，直接返回
      return {
        success: true,
        response
      };
      
    } catch (error) {
      console.error(`Request attempt ${attempts + 1} failed:`, error.message);
      attempts++;
      
      // 嘗試找到下一個有效的key
      const nextKey = validKeys.find(k => !invalidKeys.has(k) && k !== currentApiKey);
      if (nextKey) {
        currentApiKey = nextKey;
        continue; // 用新key重試
      }
    }
  }
  
  // 所有嘗試都失敗
  return {
    success: false,
    response: new Response(JSON.stringify({ 
      error: { 
        message: 'All API key attempts failed', 
        type: 'service_unavailable_error' 
      } 
    }), { status: 503 })
  };
}

export default async function handler(req, res) {
  // --- 🔥 強力 CORS 設定 (修正 Connection Error) ---
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, OpenAI-Beta, x-stainless-os, x-stainless-arch, x-stainless-lang, x-stainless-runtime, x-stainless-runtime-version, x-stainless-package-version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  // --------------------------------------------------

  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method Not Allowed', type: 'invalid_request_error' } });
  }

  // 驗證你的 Gateway 密碼 (ALLOWED_KEYS)
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: { message: 'Missing Authorization header', type: 'authentication_error' } });
  }

  const userToken = authHeader.split(' ')[1];
  const allowedKeys = (process.env.ALLOWED_KEYS || '').split(',');
  
  if (!allowedKeys.includes(userToken)) {
    return res.status(401).json({ error: { message: 'Invalid API Key', type: 'authentication_error' } });
  }

  try {
    const { model, messages, stream, ...otherParams } = req.body;

    let targetUrl = '';
    let apiKeys = []; // 儲存所有可用的API keys
    let extraHeaders = {};
    let extraBody = {};
    let invalidKeys = new Set(); // 用於追蹤無效的keys
    let provider = '';

    if (model.startsWith('gemini')) {
      provider = 'gemini';
      targetUrl = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
      
      // --- 🔵 新增 GEMINI 多 KEY 支援 ---
      const rawKeys = process.env.GEMINI_API_KEY || '';
      apiKeys = rawKeys.split(',').map(k => k.trim()).filter(k => k.length > 0);
      
      if (apiKeys.length === 0) {
        return res.status(500).json({ error: { message: 'No Gemini API Keys configured on server', type: 'server_configuration_error' } });
      }
      
      if (model.includes('gemini-3')) { 
        extraBody.reasoning_effort = "high"; 
      }
    } else {
      // --- 🟢 CEREBRAS 多 KEY 支援 (保持並強化) ---
      provider = 'cerebras';
      targetUrl = "https://api.cerebras.ai/v1/chat/completions";
      
      const rawKeys = process.env.CEREBRAS_API_KEY || '';
      apiKeys = rawKeys.split(',').map(k => k.trim()).filter(k => k.length > 0);

      if (apiKeys.length === 0) {
        return res.status(500).json({ error: { message: 'No Cerebras API Keys configured on server', type: 'server_configuration_error' } });
      }

      extraHeaders['User-Agent'] = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    }

    // 隨機排序keys以實現負載均衡
    apiKeys.sort(() => Math.random() - 0.5);
    const initialApiKey = apiKeys[0];

    console.log(`[${provider.toUpperCase()}] Using initial API Key (index 0 of ${apiKeys.length})`);

    const apiRequestConfig = {
      model,
      messages,
      stream: false, // 暫時強制 false，若要支援 Stream 需改寫回傳邏輯
      ...otherParams,
      ...extraBody
    };

    // 嘗試API請求，支持自動key輪換
    const result = await makeApiRequest(
      targetUrl, 
      initialApiKey, 
      extraHeaders, 
      apiRequestConfig,
      apiKeys,
      invalidKeys
    );

    if (!result.success) {
      return result.response.json().then(json => {
        console.error(`[${provider.toUpperCase()}] All keys exhausted:`, json.error);
        return res.status(result.response.status).json(json);
      });
    }

    const response = result.response;
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[${provider.toUpperCase()}] Upstream Error:`, errorText);
      return res.status(response.status).json({ error: { message: `Upstream Error: ${errorText}`, type: 'upstream_error' } });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error('Gateway Error:', error);
    return res.status(500).json({ error: { message: error.message || 'Internal Server Error', type: 'server_error' } });
  }
}
