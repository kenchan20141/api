export const config = {
  runtime: 'nodejs',
};

export default async function handler(req, res) {
  // --- 🔥 新增：CORS 設定 (允許本地 HTML 連接) ---
  res.setHeader('Access-Control-Allow-Origin', '*'); // 允許所有網址/本地檔案連接
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // 處理瀏覽器的 "Preflight" 預檢請求 (當瀏覽器問 Server 俾唔俾連個陣)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  // --------------------------------------------------

  // 1. 只容許 POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method Not Allowed', type: 'invalid_request_error' } });
  }

  // 2. 驗證密碼 (Bearer Token)
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: { message: 'Missing or invalid Authorization header', type: 'authentication_error' } });
  }

  const userToken = authHeader.split(' ')[1];
  // 在 Vercel 環境變數設定 ALLOWED_KEYS="Hugo,pass2"
  const allowedKeys = (process.env.ALLOWED_KEYS || '').split(',');
  
  if (!allowedKeys.includes(userToken)) {
    return res.status(401).json({ error: { message: 'Invalid API Key (Access Denied)', type: 'authentication_error' } });
  }

  try {
    const { model, messages, stream, ...otherParams } = req.body;

    // 3. 路由選擇 (Routing)
    let targetUrl = '';
    let apiKey = '';
    let extraHeaders = {};
    let extraBody = {};

    if (model.startsWith('gemini')) {
      // --- Google Gemini ---
      targetUrl = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
      apiKey = process.env.GEMINI_API_KEY;
      
      if (model.includes('gemini-3')) {
        extraBody.reasoning_effort = "high"; 
      }
    } else {
      // --- Cerebras ---
      targetUrl = "https://api.cerebras.ai/v1/chat/completions";
      apiKey = process.env.CEREBRAS_API_KEY;
      extraHeaders['User-Agent'] = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    }

    // 4. 轉發請求
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        ...extraHeaders
      },
      body: JSON.stringify({
        model,
        messages,
        stream: false, 
        ...otherParams,
        ...extraBody
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Upstream Error (${model}):`, errorText);
      return res.status(response.status).json({ 
        error: { 
          message: `Upstream API Error: ${response.statusText}`, 
          details: errorText,
          type: 'upstream_error' 
        } 
      });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error('Gateway Error:', error);
    return res.status(500).json({ error: { message: 'Internal Server Error', type: 'server_error', details: error.message } });
  }
}
