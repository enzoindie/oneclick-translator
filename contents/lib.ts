import { updateTranslationStatus } from "./floatingButton"

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
export function needsTranslation(
  text: string,
  element: Element | null
): boolean {
  // 检查元素是否已经被翻译
  if (
    element?.hasAttribute("data-translated") ||
    element?.querySelector('[data-translated="true"]')
  ) {
    return false
  }
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
    if (parent.tagName.toLowerCase() === "pre") {
      return true
    }
    parent = parent.parentElement
  }
  return false
}

export function isInlineElement(element: Element): boolean {
  const inlineElements = ["strong", "b", "em", "i", "code", "small"]
  return inlineElements.includes(element.tagName.toLowerCase())
}

export function sendTranslationRequest(
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

export function applyTranslations(
  translatedTexts: string[],
  nodeMap: Map<number, Node>,
  offset: number
) {
  translatedTexts.forEach((translatedText, index) => {
    const node = nodeMap.get(offset + index)
    if (
      node &&
      node.parentElement &&
      !node.parentElement.hasAttribute("data-translated")
    ) {
      const parentElement =
        node.nodeType === Node.ELEMENT_NODE
          ? (node as Element)
          : node.parentElement

      const translatedSpan = document.createElement("span")
      translatedSpan.textContent = translatedText

      const computedStyle = window.getComputedStyle(parentElement)
      translatedSpan.style.color = computedStyle.color
      translatedSpan.style.fontSize = computedStyle.fontSize
      translatedSpan.style.fontFamily = computedStyle.fontFamily

      translatedSpan.style.display = "block"
      translatedSpan.setAttribute("data-translated", "true")
      translatedSpan.setAttribute("data-translation-added", "true")

      parentElement.appendChild(translatedSpan)

      // 标记父元素为已翻译
      parentElement.setAttribute("data-translated", "true")
    }
  })
}

export function waitForPageLoad(): Promise<void> {
  return new Promise((resolve) => {
    if (document.readyState === "complete") {
      resolve()
    } else {
      window.addEventListener("load", () => resolve())
    }
  })
}

export function getTextNodes() {
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function (node) {
        // 排除脚本、样式和pre标签中的文本
        if (
          node.parentElement?.tagName === "SCRIPT" ||
          node.parentElement?.tagName === "STYLE" ||
          node.parentElement?.tagName === "PRE" ||
          node.parentElement?.tagName === "CODE" ||
          node.parentElement?.closest("pre, code")
        ) {
          return NodeFilter.FILTER_REJECT
        }
        // 排除空白文本节点
        if (node.textContent?.trim() === "") {
          return NodeFilter.FILTER_REJECT
        }
        return NodeFilter.FILTER_ACCEPT
      }
    }
  )

  const textNodes = []
  let currentNode
  while ((currentNode = walker.nextNode())) {
    textNodes.push(currentNode)
  }
  return textNodes
}

const PARAGRAPH_TAGS = [
  "P",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "LI",
  "TD",
  "TH"
]
const NON_TRANSLATABLE_TAGS = ["SCRIPT", "STYLE", "PRE", "CODE"]

export function getTranslatableElements() {
  const elements = []
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_ELEMENT,
    {
      acceptNode: function (node) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element
          if (PARAGRAPH_TAGS.includes(element.tagName)) {
            // 检查是否在不可翻译的标签内
            if (element.closest(NON_TRANSLATABLE_TAGS.join(","))) {
              return NodeFilter.FILTER_REJECT
            }
            return NodeFilter.FILTER_ACCEPT
          }
        }
        return NodeFilter.FILTER_SKIP
      }
    }
  )

  let currentNode
  while ((currentNode = walker.nextNode())) {
    if (currentNode.nodeType === Node.ELEMENT_NODE) {
      elements.push(currentNode as Element)
    }
  }
  return elements
}
