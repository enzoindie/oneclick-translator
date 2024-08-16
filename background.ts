const subscriptionKey = process.env.PLASMO_PUBLIC_MICROSOFTTRANSLATOR_API_KEY;
const endpoint = process.env.PLASMO_PUBLIC_MICROSOFTTRANSLATOR_ENDPOINT;

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
    console.error('translate failed:', error);
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
        console.error('translate failed:', error);
        sendResponse({ error: error.message });
      });
    return true;
  }else  if (request.action === "openPopup") {
    console.log("openPopup")
    chrome.action.openPopup()
  }
});