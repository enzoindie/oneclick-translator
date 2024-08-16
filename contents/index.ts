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
// as cache object
let translationCache: { [key: string]: string } = {}
function getTranslationStatus(): boolean {
  return Object.keys(translationCache).length > 0
}

async function translatePage(targetLanguage = "zh-Hans",refreshTranslation: boolean = false) {
  setLoading(true)
  try {
    await waitForPageLoad() // wait page load

    // check if already translated
    if (getTranslationStatus()&&!refreshTranslation) {
      applyTranslationsFromCache()
      return
    }

    clearPreviousTranslations() // remove previous translations

    const textNodes = getTextNodes()
    const textsToTranslate = []
    const nodeMap = new Map()
    textNodes.forEach((node, index) => {
      const text = node.textContent?.trim()
      if (text && needsTranslation(text, node.parentElement)) {
        let parentElement = node.parentElement

        // find parent element until non-inline element
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
          // if no suitable parent element, handle it as before
          textsToTranslate.push(text)
          nodeMap.set(textsToTranslate.length - 1, node)
        }
      }
    })
    if (textsToTranslate.length === 0) {
      return
    }

    console.log(`total ${textsToTranslate.length} texts to translate`)

    const batchSize = 100
    for (let i = 0; i < textsToTranslate.length; i += batchSize) {
      const batch = textsToTranslate.slice(i, i + batchSize)
      console.log(
        `start translating batch ${i / batchSize + 1}, total ${batch.length} texts`
      )

      try {
        const translatedBatch = await sendTranslationRequest(
          batch,
          targetLanguage
        )
        applyTranslations(translatedBatch, nodeMap, i)
        // save translation to cache
        batch.forEach((text, index) => {
          translationCache[text] = translatedBatch[index]
        })
      } catch (error) {
        console.error(`error translating batch ${i / batchSize + 1}:`, error)
      }
    }
    updateTranslationStatus(true)
   
  } finally {
    setLoading(false)
  }
}

// apply translations from cache
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
  // remove all elements with data-translation-added attribute
  const addedElements = document.querySelectorAll("[data-translation-added]")
  addedElements.forEach((el) => el.remove())

  // remove data-translated attribute from all elements with data-translated attribute
  const translatedElements = document.querySelectorAll("[data-translated]")
  translatedElements.forEach((el) => el.removeAttribute("data-translated"))
}

// create floating button after page load
window.addEventListener("load", () => {
  createFloatingButton(translatePage, clearPreviousTranslations);
  currentUrl = window.location.href; 
});

// listen popstate event
window.addEventListener('popstate', checkUrlChange);

// listen hashchange event
window.addEventListener('hashchange', checkUrlChange);

// listen DOM changes using MutationObserver
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
    translatePage(request.language,request.refreshTranslation).then(() => sendResponse({ success: true }))
    return true // indicate async response
  } else if (request.action === "removeTranslation") {
    clearPreviousTranslations()
    sendResponse({ success: true })
  } else if (request.action === "checkTranslation") {
    sendResponse({ hasTranslation: getTranslationStatus() })
  }
})
