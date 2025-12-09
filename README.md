

# 🌍 Universal AI Gateway (HK Edition)

這是一個私有的 AI API 網關，讓你可以在香港（或任何地區）直接調用最新的 Gemini 和 Cerebras 模型，無需 VPN。此接口完全兼容 **OpenAI SDK**。

## 🔑 認證 (Authentication)
使用 **Bearer Token** 進行認證。請向管理員索取你的專屬 API Key（密碼）。

## 🌐 Base URL
```
https://hugo-api-v1.vercel.app/api/v1
```

## 🧠 支援模型 (Supported Models)

| Provider | Model ID | 簡介 |
| :--- | :--- | :--- |
| **Google** | `gemini-3-pro-preview` | **最強推介**。最新一代推理模型，極高智商。 |
| **Google** | `gemini-2.5-pro` | 穩定、強大的通用模型。 |
| **Cerebras** | `llama-3.3-70b` | Meta 最新開源模型，Cerebras 加速，速度極快。 |
| **Cerebras** | `llama3.1-8b` | 輕量級快速模型。 |
| **Cerebras** | `qwen-3-235b-a22b-instruct-2507` | Qwen (通義千問) 235B 巨型模型。 |
| **Cerebras** | `qwen-3-32b` | Qwen 中型模型。 |
| **Cerebras** | `gpt-oss-120b` | 強大的開源 GPT 模型。 |
| **Cerebras** | `zai-glm-4.6` | Zhipu GLM 4.6 模型。 |

---

## 💻 使用範例 (Code Examples)

### 1. Python (使用官方 OpenAI 庫)
這是最簡單的方法，將你的 Gateway 當作 OpenAI 來用。

```python
from openai import OpenAI

# 設定你的 Gateway 地址和密碼
client = OpenAI(
    base_url="https://hugo-api-v1.vercel.app/api/v1",
    api_key="你的_自訂_密碼"  # 例如: friend1
)

response = client.chat.completions.create(
    model="gemini-3-pro-preview", # 或 llama-3.3-70b
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Hello! 介紹一下你自己。"}
    ]
)

print(response.choices[0].message.content)
```

### 2. cURL (Command Line)
```bash
curl https://hugo-api-v1.vercel.app/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 你的_自訂_密碼" \
  -d '{
    "model": "llama-3.3-70b",
    "messages": [{"role": "user", "content": "寫一首關於香港的短詩"}]
  }'
```

### 3. JavaScript / Node.js
```javascript
import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "https://hugo-api-v1.vercel.app/api/v1",
  apiKey: "你的_自訂_密碼"
});

async function main() {
  const completion = await openai.chat.completions.create({
    messages: [{ role: "user", content: "Gemini, 你好嗎？" }],
    model: "gemini-3-pro-preview",
  });

  console.log(completion.choices[0].message.content);
}

main();
