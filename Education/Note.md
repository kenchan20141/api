

# 專題研習指引：跨越數碼邊界 — 構建個人化 AI API 網關
# Project Study Guide: Crossing Digital Borders – Building a Personalized AI API Gateway

---

##  中文版 

### 課程簡介
本單元旨在探討網絡地理限制（Geo-blocking）的技術原理，並教授如何利用現代雲端技術（Serverless Computing）構建合法的技術解決方案。學生將親手部署一個位於美國節點的 API 中轉站（Proxy），以解決 Google Gemini 及 Cerebras 等先進 AI 模型在特定地區無法直接存取的問題。

---

### 第一部分：理論基礎 

#### 1. 問題背景：為何會出現「存取被拒」？
當我們在香港直接嘗試連接 Google Gemini 或 Cerebras 的 API 時，可能會收到 `403 Forbidden` 或 `Location not supported` 的錯誤訊息。這是因為 API 供應商實施了**地理圍欄（Geo-fencing）**技術：
*   **IP 地址識別：** 每一部連接互聯網的裝置都有一個 IP 地址，就像網絡上的「門牌號碼」。
*   **地區偵測：** API 伺服器會讀取請求者的 IP 地址，若發現該 IP 屬於「不支援地區」（如香港），伺服器便會拒絕請求。

#### 2. 解決方案：反向代理 (Reverse Proxy)
要解決此問題，我們不需要親身前往美國，只需要在網絡架構中引入一個「中間人」，這就是**代理（Proxy）**的概念。

**運作流程圖解：**

*   **情境 A：直接連接（失敗）**
    > 學生 (香港 IP) ➡️ 發送請求 ➡️ ⛔️ **AI 伺服器** (偵測到香港 IP，攔截！)

*   **情境 B：透過 Vercel 代理連接（成功）**
    > 1. 學生 (香港 IP) ➡️ 發送請求 ➡️ ✅ **Vercel 伺服器 (美國 IP)**
    > 2. **Vercel 伺服器** (以美國身份) ➡️ 轉發請求 ➡️ ✅ **AI 伺服器** (偵測到美國 IP，放行！)
    > 3. **AI 伺服器** ➡️ 回傳答案 ➡️ **Vercel 伺服器** ➡️ 回傳給學生

#### 3. 技術核心：Serverless Function (無伺服器函數)
我們使用的 Vercel 平台提供 "Serverless" 服務。
*   **特點：** 我們無需購買或維護實體伺服器，只需上傳代碼。
*   **地理優勢：** 我們透過設定檔 (`vercel.json`)，強制指派代碼在 **美國東岸 (Washington, D.C. - iad1)** 的數據中心執行。
*   **結果：** 無論身處何地，對外發出的請求都會顯示為來自美國的 IP 地址。

---

### 第二部分：實戰部署 

本部分將指導每位同學建立屬於自己的 AI Gateway。

#### 準備工作：獲取 API 金鑰 (Get API Keys)
在開始部署前，你需要先申請 AI 服務的「通行證」（API Key）。請前往以下官方網站申請：

1.  **Google Gemini API Key:**
    *   網址：[https://aistudio.google.com/api-keys](https://aistudio.google.com/api-keys)
    *   *注意：申請時可能需要使用 VPN 連接至美國/台灣節點，但申請後使用時無需 VPN。*
2.  **Cerebras API Key:**
    *   網址：[https://www.cerebras.ai/](https://www.cerebras.ai/) (點擊 "Get Started" 或 "Developers")

---

#### 步驟一：獲取代碼 (Fork Repository)
我們需要複製一份預備好的代碼到你自己的 GitHub 帳戶中。

1.  登入你的 **GitHub** 帳號。
2.  進入已準備的專案連結：
    *   `[https://github.com/hugow0528/Universal-AI-Gateway]`
3.  點擊頁面右上角的 **"Fork"** 按鈕。
4.  在彈出的視窗中點擊 **"Create fork"**。
    *   *意義：這代表你將這份代碼「複印」了一份到你自己的名下，現在你有權修改及控制它。*

#### 步驟二：連接 Vercel 雲端平台
1.  前往 [vercel.com](https://vercel.com) 並登入（建議使用 GitHub 帳號登入）。
2.  在 Dashboard 點擊 **"Add New..."** 按鈕，選擇 **"Project"**。
3.  在左側你會看到 "Import Git Repository"，找到你剛剛 Fork 的專案（名稱應為 `hk-ai-gateway` 或類似），點擊 **"Import"**。

#### 步驟三：設定環境變數 (Environment Variables)
**這是最關鍵的一步。** 為了資訊安全，我們絕不能將 API Key 直接寫在代碼中，而是要存放在伺服器的保險箱（環境變數）裡。

在 "Configure Project" 頁面，展開 **"Environment Variables"** 部分，加入以下設定：

| Key (變數名稱) | Value (變數值) | 說明 |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | `AIzaSy...` | 填入你剛申請的 Google Key |
| `CEREBRAS_API_KEY` | `csk-...` | 填入你剛申請的 Cerebras Key |
| `ALLOWED_KEYS` | `my_password_123` | **自訂密碼**。這是用來保護你自己 API 的密碼，防止外人盜用。 |

*輸入完一組 Key 和 Value 後，請務必點擊 "Add" 按鈕，確保三組都已加入列表。*

#### 步驟四：部署與驗證 (Deploy & Verify)
1.  確認設定無誤後，點擊底部的 **"Deploy"** 按鈕。
2.  等待約 1 分鐘，看到滿屏的慶祝動畫即代表部署成功！
3.  點擊 **"Continue to Dashboard"**。
4.  在 Dashboard 頁面，你會看到一個 **Domains**（例如 `your-project.vercel.app`）。
5.  **你的 API 地址為：** `https://your-project.vercel.app/api/v1/chat/completions`

---
---

## English Version

### Module Introduction
This module aims to explore the technical principles of Geo-blocking and teach how to construct legitimate technical solutions using modern cloud technology (Serverless Computing). Students will deploy a US-based API Proxy using Vercel to resolve access issues for advanced AI models like Google Gemini and Cerebras in specific regions.

---

### Part 1: Theory

#### 1. The Problem: Why "Access Denied"?
When we attempt to connect directly to Google Gemini or Cerebras APIs from Hong Kong, we may encounter `403 Forbidden` or `Location not supported` errors. This is due to **Geo-fencing** technology implemented by API providers:
*   **IP Address Identification:** Every device connected to the internet has an IP address, acting like a digital "street address."
*   **Region Detection:** The API server reads the requester's IP. If the IP belongs to an "unsupported region" (e.g., Hong Kong), the server blocks the request.

#### 2. The Solution: Reverse Proxy
To solve this, we don't need to physically travel to the US. We simply introduce a "middleman" into the network architecture. This is the concept of a **Proxy**.

**Workflow Diagram:**

*   **Scenario A: Direct Connection (Failed)**
    > Student (HK IP) ➡️ Sends Request ➡️ ⛔️ **AI Server** (Detects HK IP, Blocked!)

*   **Scenario B: Connection via Vercel Proxy (Success)**
    > 1. Student (HK IP) ➡️ Sends Request ➡️ ✅ **Vercel Server (US IP)**
    > 2. **Vercel Server** (Acting as US identity) ➡️ Forwards Request ➡️ ✅ **AI Server** (Detects US IP, Allowed!)
    > 3. **AI Server** ➡️ Returns Answer ➡️ **Vercel Server** ➡️ Returns to Student

#### 3. Core Technology: Serverless Functions
We utilize the Vercel platform, which provides "Serverless" services.
*   **Feature:** No need to buy or maintain physical servers; simply upload the code.
*   **Geographic Advantage:** By using a configuration file (`vercel.json`), we force the code to execute in a data center located on the **US East Coast (Washington, D.C. - iad1)**.
*   **Result:** Regardless of your physical location, all outgoing requests appear to come from a US IP address.

---

### Part 2: Deployment Guide

This section guides each student in building their own AI Gateway.

#### Preparation: Get API Keys
Before deploying, you need to apply for "access passes" (API Keys) from the AI services. Please visit the official websites:

1.  **Google Gemini API Key:**
    *   URL: [https://aistudio.google.com/api-keys](https://aistudio.google.com/api-keys)
    *   *Note: You may need a VPN connected to the US/Taiwan to apply, but no VPN is needed for usage after deployment.*
2.  **Cerebras API Key:**
    *   URL: [https://www.cerebras.ai/](https://www.cerebras.ai/) (Click "Get Started" or "Developers")

---

#### Step 1: Fork Repository
You need to copy the code prepared by the teacher to your own GitHub account.

1.  Log in to your **GitHub** account.
2.  Go to the project link provided by the teacher:
    *   `https://github.com/hugow0528/Universal-AI-Gateway`
3.  Click the **"Fork"** button in the top right corner.
4.  Click **"Create fork"** in the pop-up window.
    *   *Meaning: This creates a copy of the code under your name, giving you permission to modify and control it.*

#### Step 2: Connect to Vercel
1.  Go to [vercel.com](https://vercel.com) and log in (Login with GitHub is recommended).
2.  Click the **"Add New..."** button on the Dashboard and select **"Project"**.
3.  Under "Import Git Repository" on the left, find the project you just forked (named `hk-ai-gateway` or similar) and click **"Import"**.

#### Step 3: Set Environment Variables
**This is the most critical step.** For security, we must never write API Keys directly into the code. Instead, we store them in the server's safe (Environment Variables).

On the "Configure Project" page, expand the **"Environment Variables"** section and add the following:

| Key Name | Value | Description |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | `AIzaSy...` | Paste your Google Key here |
| `CEREBRAS_API_KEY` | `csk-...` | Paste your Cerebras Key here |
| `ALLOWED_KEYS` | `my_password_123` | **Custom Password**. This protects your API from unauthorized use. |

*After entering each Key and Value, ensure you click the "Add" button so they appear in the list.*

#### Step 4: Deploy & Verify
1.  After confirming the settings, click the **"Deploy"** button at the bottom.
2.  Wait for about 1 minute. When you see the celebration animation, the deployment is successful!
3.  Click **"Continue to Dashboard"**.
4.  On the Dashboard page, you will see a **Domains** link (e.g., `your-project.vercel.app`).
5.  **Your API Endpoint is:** `https://your-project.vercel.app/api/v1/chat/completions`
