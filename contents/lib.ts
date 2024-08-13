export function insertTranslation(element: Element, translatedText: string) {
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

  translatedSpan.style.display = "block"
  translatedSpan.setAttribute("data-translated", "true")

  // 在原始元素后添加换行和翻译文本
  element.parentNode.insertBefore(lineBreak, element.nextSibling)
  element.parentNode.insertBefore(translatedSpan, lineBreak.nextSibling)
}


// 添加一个辅助函数来检查文本是否需要翻译
export function needsTranslation(text: string): boolean {
  if (text.length <= 2) {
    return false
  }
  // 检查是否为纯数字
  if (/^\d+$/.test(text)) {
    console.log("纯数字", text)
    return false
  }
  // 检查是否为纯符号（这里定义的符号可能需要根据实际需求调整）
  if (/^[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]+$/.test(text)) {
    console.log("纯符号", text)
    return false
  }
  // 如果文本长度为1，且不是字母，则不翻译
  if (text.length === 1 && !/[a-zA-Z]/.test(text)) {
    console.log("单个字符且不是字母", text)
    return false
  }
  return true
}


// 添加这个新函数来检查元素是否在 pre 标签内
export function isInsidePreTag(element: Element): boolean {
  let parent = element.parentElement
  while (parent) {
    if (parent.tagName.toLowerCase() === 'pre') {
      return true
    }
    parent = parent.parentElement
  }
  return false
}
export function clearPreviousTranslations() {
  const translatedSpans = document.querySelectorAll('[data-translated="true"]')
  translatedSpans.forEach((span) => span.remove())
}

export function waitForPageLoad(): Promise<void> {
  return new Promise((resolve) => {
    if (document.readyState === 'complete') {
      resolve();
    } else {
      window.addEventListener('load', () => resolve());
    }
  });
}
