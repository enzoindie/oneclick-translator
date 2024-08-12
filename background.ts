const subscriptionKey = '90e39224c4e34a67b61c8d6bb5536349';
const endpoint = 'https://api.cognitive.microsofttranslator.com/';

async function translateTexts(texts: string[], to: string = 'zh-Hans'): Promise<string[]> {
  const url = `${endpoint}/translate?api-version=3.0&to=${to}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': subscriptionKey,
        // 'Ocp-Apim-Subscription-Region': location,
        'Content-type': 'application/json',
      },
      body: JSON.stringify(texts.map(text => ({ text }))),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
    }

    const result = await response.json();
    return result.map(item => item.translations[0].text);
  } catch (error) {
    console.error('翻译出错:', error);
    throw error;
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "translateBatch") {
    translateTexts(request.texts, request.targetLanguage)
      .then(translatedTexts => {
        sendResponse({ translatedTexts: translatedTexts });
      })
      .catch(error => {
        console.error('翻译失败:', error);
        sendResponse({ error: error.message });
      });
    return true; // 表示将异步发送响应
  }
});