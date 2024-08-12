function translatePage(targetLanguage: string) {
  // 清除之前的翻译结果
  clearPreviousTranslations()
  const elements = document.querySelectorAll(
    "p, font,h1, h2, h3, h4, h5, h6, li, td, th, div, span, a"
  )
  const textsToTranslate = []
  const elementMap = new Map()

  elements.forEach((element, index) => {
    if (
      element.childNodes.length === 1 &&
      element.childNodes[0].nodeType === Node.TEXT_NODE && 
      !isInsidePreTag(element)
    ) {
      const originalText = element.textContent?.trim()
      if (originalText  && needsTranslation(originalText)) {
        textsToTranslate.push(originalText)
        elementMap.set(textsToTranslate.length - 1, element)
      }
    }
  })

  if (textsToTranslate.length === 0) {
    console.log("没有找到需要翻译的文本")
    return
  }

  console.log(`开始翻译 ${textsToTranslate.length} 个文本元素`)

  // 批量发送翻译请求
  chrome.runtime.sendMessage(
    {
      action: "translateBatch",
      texts: textsToTranslate,
      targetLanguage: targetLanguage
    },
    (response) => {
      if (chrome.runtime.lastError) {
        console.error("发送消息时出错:", chrome.runtime.lastError)
        return
      }

      if (response.error) {
        console.error("翻译失败:", response.error)
        elementMap.forEach((element) => {
          if (element && element.isConnected) {
            element.innerHTML += ` <span style="color: red;">(翻译失败)</span>`
          }
        })
      } else if (Array.isArray(response.translatedTexts)) {
        console.log(`收到 ${response.translatedTexts.length} 个翻译结果`)
        response.translatedTexts.forEach((translatedText, index) => {
          const element = elementMap.get(index)
          if (element && element.isConnected) {
            const originalText = element.textContent?.trim()
            if (originalText) {
              // 创建换行元素
              const lineBreak = document.createElement("br")
              lineBreak.setAttribute("data-translated", "true")

              // 创建翻译文本的 span 元素
              const translatedSpan = document.createElement("span")
              translatedSpan.textContent = translatedText

              // 获取原始元素的计算样式
              const computedStyle = window.getComputedStyle(element)
              translatedSpan.style.color = computedStyle.color
              translatedSpan.style.fontSize = computedStyle.fontSize
              translatedSpan.style.fontFamily = computedStyle.fontFamily

              translatedSpan.style.display = "inline"
              translatedSpan.setAttribute("data-translated", "true")

              // 在原始文本后添加换行和翻译文本
              element.appendChild(lineBreak)
              element.appendChild(translatedSpan)
            }
          }
        })
        console.log("翻译完成")
      } else {
        console.error("收到意外的响应格式:", response)
      }
    }
  )
}

function clearPreviousTranslations() {
  const translatedSpans = document.querySelectorAll('[data-translated="true"]')
  translatedSpans.forEach((span) => span.remove())
}

// 添加一个辅助函数来检查文本是否需要翻译
function needsTranslation(text: string): boolean {
  // 检查是否为纯数字
  if (/^\d+$/.test(text)) return false
  // 检查是否为纯符号（这里定义的符号可能需要根据实际需求调整）
  if (/^[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]+$/.test(text)) return false
  // 如果文本长度为1，且不是字母，则不翻译
  if (text.length === 1 && !/[a-zA-Z]/.test(text)) return false
  return true
}

// 添加这个新函数来检查元素是否在 pre 标签内
function isInsidePreTag(element: Element): boolean {
  let parent = element.parentElement
  while (parent) {
    if (parent.tagName.toLowerCase() === 'pre') {
      return true
    }
    parent = parent.parentElement
  }
  return false
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "translatePage") {
    translatePage(request.language)
    sendResponse({ success: true })
  } else if (request.action === "checkTranslation") {
    const hasTranslation = document.querySelector('[data-translated="true"]') !== null;
    console.log('hasTranslation',hasTranslation)
    sendResponse({ hasTranslation });
  } else if (request.action === "removeTranslation") {
    clearPreviousTranslations();
    sendResponse({ success: true });
  }
})