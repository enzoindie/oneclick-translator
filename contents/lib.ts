
export function insertTranslation(element: Element, translatedText: string) {
  // create line break element
  const lineBreak = document.createElement("br")
  lineBreak.setAttribute("data-translated", "true")

  // create translated text span element
  const translatedSpan = document.createElement("span")
  translatedSpan.textContent = translatedText

  // get original element's computed style
  const computedStyle = window.getComputedStyle(element)
  translatedSpan.style.color = computedStyle.color
  translatedSpan.style.fontSize = computedStyle.fontSize
  translatedSpan.style.fontFamily = computedStyle.fontFamily

  translatedSpan.style.display = "block"
  translatedSpan.setAttribute("data-translated", "true")

  // add line break and translated text after original element
  element.parentNode.insertBefore(lineBreak, element.nextSibling)
  element.parentNode.insertBefore(translatedSpan, lineBreak.nextSibling)
}

// add a helper function to check if text needs translation
export function needsTranslation(
  text: string,
  element: Element | null
): boolean {
  // check if element has been translated
  if (
    element?.hasAttribute("data-translated") ||
    element?.querySelector('[data-translated="true"]')
  ) {
    return false
  }
  if (text.length <= 2) {
    return false
  }
  // check if it's pure number
  if (/^\d+$/.test(text)) {
    return false
  }
  // check if it's pure symbol
  if (/^[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]+$/.test(text)) {
    return false
  }
  // if text length is 1 and not a letter, don't translate
  if (text.length === 1 && !/[a-zA-Z]/.test(text)) {
    console.log("single character and not a letter", text)
    return false
  }
  return true
}

// add this new function to check if element is inside pre tag
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
          reject(new Error("received unexpected response format"))
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

      // mark parent element as translated
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
        // exclude script, style and text in pre tag
        if (
          node.parentElement?.tagName === "SCRIPT" ||
          node.parentElement?.tagName === "STYLE" ||
          node.parentElement?.tagName === "PRE" ||
          node.parentElement?.tagName === "CODE" ||
          node.parentElement?.closest("pre, code")
        ) {
          return NodeFilter.FILTER_REJECT
        }
        // exclude blank text node
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
            // check if it's inside non-translatable tags
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
