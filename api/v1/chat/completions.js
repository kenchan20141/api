// api/v1/chat/completions.js

export const config = {
  runtime: 'nodejs',
};

export default async function handler(req, res) {
  // --- 🔥 強力 CORS 設定 (修正 Connection Error) ---
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  // 關鍵修正：OpenAI SDK 會傳好多怪 Headers (x-stainless...)，要全部允許
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, OpenAI-Beta, x-stainless-os, x-stainless-arch, x-stainless-lang, x-stainless-runtime, x-stainless-runtime-version, x-stainless-package-version');

  // 處理瀏覽器 Preflight 請求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  // --------------------------------------------------

  // 1. 只容許 POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method Not Allowed', type: 'invalid_request_error' } });
  }

  // 2. 驗證密碼
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

    // 3. 路由選擇
    let targetUrl = '';
    let apiKey = '';
    let extraHeaders = {};
    let extraBody = {};

    if (model.startsWith('gemini')) {
      targetUrl = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
      apiKey = process.env.GEMINI_API_KEY;
      if (model.includes('gemini-3')) { extraBody.reasoning_effort = "high"; }
    } else {
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
      // 在 Vercel Logs 顯示錯誤，方便除錯
      console.error(`Upstream Error (${model}):`, errorText);
      return res.status(response.status).json({ error: { message: `Upstream Error: ${errorText}`, type: 'upstream_error' } });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error('Gateway Error:', error);
    return res.status(500).json({ error: { message: error.message, type: 'server_error' } });
  }
}
