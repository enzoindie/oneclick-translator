import {
  clearPreviousTranslations,
  isInsidePreTag,getTextNodes,
  needsTranslation,
  waitForPageLoad
} from "./lib"


async function translatePage(targetLanguage: string) {
  await waitForPageLoad();
  clearPreviousTranslations();

  const textNodes = getTextNodes();
  const textsToTranslate = [];
  const nodeMap = new Map();

  textNodes.forEach((node, index) => {
    const text = node.textContent?.trim();
    if (text && needsTranslation(text, node.parentElement)) {
      textsToTranslate.push(text);
      nodeMap.set(textsToTranslate.length - 1, node);
    }
  });

  if (textsToTranslate.length === 0) {
    console.log("没有找到需要翻译的文本");
    return;
  }

  console.log(`总共需要翻译 ${textsToTranslate.length} 个文本元素`);

  const batchSize = 100;
  for (let i = 0; i < textsToTranslate.length; i += batchSize) {
    const batch = textsToTranslate.slice(i, i + batchSize);
    console.log(`开始翻译第 ${i / batchSize + 1} 批，共 ${batch.length} 个文本元素`);

    try {
      const translatedBatch = await sendTranslationRequest(batch, targetLanguage);
      applyTranslations(translatedBatch, nodeMap, i);
    } catch (error) {
      console.error(`翻译第 ${i / batchSize + 1} 批时出错:`, error);
    }
  }

  console.log("所有翻译完成");
}
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "translatePage") {
    translatePage(request.language).then(() => {
      sendResponse({ success: true })
    })
    return true // 表示我们将异步发送响应
  } else if (request.action === "checkTranslation") {
    const hasTranslation =
      document.querySelector('[data-translated="true"]') !== null
    console.log("hasTranslation", hasTranslation)
    sendResponse({ hasTranslation })
  } else if (request.action === "removeTranslation") {
    clearPreviousTranslations()
    sendResponse({ success: true })
  }
})

function sendTranslationRequest(
  texts: string[],
  targetLanguage: string
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        action: "translateBatch",
        texts: texts,
        targetLanguage: targetLanguage
      },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
        } else if (response.error) {
          reject(new Error(response.error))
        } else if (Array.isArray(response.translatedTexts)) {
          resolve(response.translatedTexts)
        } else {
          reject(new Error("收到意外的响应格式"))
        }
      }
    )
  })
}

function applyTranslations(translatedTexts: string[], nodeMap: Map<number, Node>, offset: number) {
  translatedTexts.forEach((translatedText, index) => {
    const node = nodeMap.get(offset + index);
    if (node && node.parentElement && !node.parentElement.hasAttribute('data-translated')) {
      const parentElement = node.parentElement;
      
      const lineBreak = document.createElement("br");
      lineBreak.setAttribute("data-translated", "true");
      lineBreak.setAttribute("data-translation-added", "true");

      const translatedSpan = document.createElement("span");
      translatedSpan.textContent = translatedText;

      const computedStyle = window.getComputedStyle(parentElement);
      translatedSpan.style.color = computedStyle.color;
      translatedSpan.style.fontSize = computedStyle.fontSize;
      translatedSpan.style.fontFamily = computedStyle.fontFamily;

      translatedSpan.style.display = "block";
      translatedSpan.setAttribute("data-translated", "true");
      translatedSpan.setAttribute("data-translation-added", "true");

      parentElement.appendChild(lineBreak);
      parentElement.appendChild(translatedSpan);
      
      // 标记父元素为已翻译
      parentElement.setAttribute('data-translated', 'true');
    }
  });
}