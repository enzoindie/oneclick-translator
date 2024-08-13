import {
  createFloatingButton,
  setLoading,
  updateTranslationStatus
} from "./floatingButton"
import {
  applyTranslations,
  getTextNodes,
  isInlineElement,
  needsTranslation,
  sendTranslationRequest,
  waitForPageLoad
} from "./lib"
let currentUrl = window.location.href;
// 用于存储翻译缓存的对象
let translationCache: { [key: string]: string } = {}
function getTranslationStatus(): boolean {
  return Object.keys(translationCache).length > 0
}

async function translatePage(targetLanguage = "zh-Hans") {
  setLoading(true)
  try {
    await waitForPageLoad() // 等待页面加载完成

    // 检查是否已经翻译过
    if (getTranslationStatus()) {
      console.log("页面已经翻译过，使用缓存的翻译结果")
      applyTranslationsFromCache()
      return
    }

    clearPreviousTranslations() // 清除之前的翻译

    const textNodes = getTextNodes()
    const textsToTranslate = []
    const nodeMap = new Map()
    textNodes.forEach((node, index) => {
      const text = node.textContent?.trim()
      if (text && needsTranslation(text, node.parentElement)) {
        let parentElement = node.parentElement

        // 向上查找直到找到非内联元素的父元素
        while (parentElement && isInlineElement(parentElement)) {
          parentElement = parentElement.parentElement
        }

        if (parentElement) {
          const fullText = parentElement.textContent?.trim()
          if (fullText && !textsToTranslate.includes(fullText)) {
            textsToTranslate.push(fullText)
            nodeMap.set(textsToTranslate.length - 1, parentElement)
          }
        } else {
          // 如果没有找到合适的父元素，按原来的方式处理
          textsToTranslate.push(text)
          nodeMap.set(textsToTranslate.length - 1, node)
        }
      }
    })
    if (textsToTranslate.length === 0) {
      console.log("没有找到需要翻译的文本")
      return
    }

    console.log(`总共需要翻译 ${textsToTranslate.length} 个文本元素`)

    const batchSize = 100
    for (let i = 0; i < textsToTranslate.length; i += batchSize) {
      const batch = textsToTranslate.slice(i, i + batchSize)
      console.log(
        `开始翻译第 ${i / batchSize + 1} 批，共 ${batch.length} 个文本元素`
      )

      try {
        const translatedBatch = await sendTranslationRequest(
          batch,
          targetLanguage
        )
        applyTranslations(translatedBatch, nodeMap, i)
        // 将翻译结果存入缓存
        batch.forEach((text, index) => {
          translationCache[text] = translatedBatch[index]
        })
      } catch (error) {
        console.error(`翻译第 ${i / batchSize + 1} 批时出错:`, error)
      }
    }
    updateTranslationStatus(true)
    console.log("所有翻译完成")
  } finally {
    setLoading(false)
  }
}

// 从缓存应用翻译
function applyTranslationsFromCache() {
  const textNodes = getTextNodes()
  textNodes.forEach((node) => {
    const text = node.textContent?.trim()
    if (text && translationCache[text]) {
      const parentElement = node.parentElement
      if (parentElement && !parentElement.hasAttribute("data-translated")) {
        const translatedSpan = document.createElement("span")
        translatedSpan.textContent = translationCache[text]

        const computedStyle = window.getComputedStyle(parentElement)
        translatedSpan.style.color = computedStyle.color
        translatedSpan.style.fontSize = computedStyle.fontSize
        translatedSpan.style.fontFamily = computedStyle.fontFamily

        translatedSpan.style.display = "block"
        translatedSpan.setAttribute("data-translated", "true")
        translatedSpan.setAttribute("data-translation-added", "true")

        parentElement.appendChild(translatedSpan)
        parentElement.setAttribute("data-translated", "true")
      }
    }
  })
}
function clearPreviousTranslations() {
  console.log("clearPreviousTranslations")
  updateTranslationStatus(false)
  // 删除所有带有 data-translation-added 属性的元素
  const addedElements = document.querySelectorAll("[data-translation-added]")
  addedElements.forEach((el) => el.remove())

  // 移除所有带有 data-translated 属性的元素上的该属性
  const translatedElements = document.querySelectorAll("[data-translated]")
  translatedElements.forEach((el) => el.removeAttribute("data-translated"))
}

// 在页面加载完成后创建悬浮按钮
window.addEventListener("load", () => {
  createFloatingButton(translatePage, clearPreviousTranslations);
  currentUrl = window.location.href; // 初始化当前 URL
});

// 监听 popstate 事件
window.addEventListener('popstate', checkUrlChange);

// 监听 hashchange 事件
window.addEventListener('hashchange', checkUrlChange);

// 使用 MutationObserver 监听 DOM 变化
const observer = new MutationObserver(() => {
  checkUrlChange();
});

observer.observe(document.querySelector('body'), {
  childList: true,
  subtree: true,
  attributes: true,
  characterData: true
});

function checkUrlChange() {
  if (currentUrl !== window.location.href) {
    currentUrl = window.location.href;
    translationCache = {}
    clearPreviousTranslations();
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "translatePage") {
    translatePage(request.language).then(() => sendResponse({ success: true }))
    return true // 表示会异步发送响应
  } else if (request.action === "removeTranslation") {
    clearPreviousTranslations()
    sendResponse({ success: true })
  } else if (request.action === "checkTranslation") {
    sendResponse({ hasTranslation: getTranslationStatus() })
  }
})
