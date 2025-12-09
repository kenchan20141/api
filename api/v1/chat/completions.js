// api/v1/chat/completions.js

export const config = {
  runtime: 'nodejs',
};

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
    let apiKey = '';
    let extraHeaders = {};
    let extraBody = {};

    if (model.startsWith('gemini')) {
      targetUrl = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
      apiKey = process.env.GEMINI_API_KEY;
      if (model.includes('gemini-3')) { extraBody.reasoning_effort = "high"; }
    } else {
      // --- 🟢 修改部分開始：CEREBRAS 多 KEY 支援 ---
      targetUrl = "https://api.cerebras.ai/v1/chat/completions";
      
      // 1. 取得所有 Keys 字串 (預設為空字串避免報錯)
      const rawKeys = process.env.CEREBRAS_API_KEY || '';
      
      // 2. 用逗號分割，並過濾掉空白或無效的項目
      const cerebrasKeys = rawKeys.split(',').map(k => k.trim()).filter(k => k.length > 0);

      // 3. 檢查是否有 Key
      if (cerebrasKeys.length === 0) {
        return res.status(500).json({ error: { message: 'No Cerebras API Keys configured on server', type: 'server_configuration_error' } });
      }

      // 4. 隨機選取一個 Key (簡單的 Load Balancing)
      const randomIndex = Math.floor(Math.random() * cerebrasKeys.length);
      apiKey = cerebrasKeys[randomIndex];

      console.log(`Using Cerebras Key Index: ${randomIndex}`); // (選用) 在 Log 顯示用了第幾個 Key，方便除錯

      extraHeaders['User-Agent'] = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
      // --- 🟢 修改部分結束 ---
    }

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
        stream: false, // 暫時強制 false，若要支援 Stream 需改寫回傳邏輯
        ...otherParams,
        ...extraBody
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
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
