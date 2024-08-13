// 像素
import { Storage } from "@plasmohq/storage"

let isTranslated = false
let isLoading = false
let floatingButton: HTMLButtonElement | null = null
let isDragging = false
let startX: number, startY: number, startLeft: number, startTop: number
let hasMoved = false
const MOVE_THRESHOLD = 5

const storage = new Storage()
const storageKey = "lastSelectedLanguage"
export function createFloatingButton(
  translatePage: () => Promise<void>,
  removeTranslation: () => void
) {
  floatingButton = document.createElement("button")
  updateButtonState()
  floatingButton.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 9999;
    width: 56px;
    height: 56px;
    border-radius: 28px;
    background-color: #ffed9e;
    color: #333;
    border: none;
    cursor: point;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    overflow: visible;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    transition: background-color 0.3s ease;
    touch-action: none;
    user-select: none;
  `
  document.body.appendChild(floatingButton)

  floatingButton.addEventListener("mousedown", startDragging)
  floatingButton.addEventListener("touchstart", startDragging)
  document.addEventListener("mousemove", drag)
  document.addEventListener("touchmove", drag)
  document.addEventListener("mouseup", stopDragging)
  document.addEventListener("touchend", stopDragging)

  floatingButton.addEventListener("click", (e) => {
    if (!hasMoved) {
      toggleTranslation(translatePage, removeTranslation)
    }
  })
}

function startDragging(e: MouseEvent | TouchEvent) {
  if (!floatingButton) return
  isDragging = true
  hasMoved = false
  if (e instanceof MouseEvent) {
    startX = e.clientX
    startY = e.clientY
  } else {
    startX = e.touches[0].clientX
    startY = e.touches[0].clientY
  }
  startLeft = floatingButton.offsetLeft
  startTop = floatingButton.offsetTop
  floatingButton.style.transition = "none"
}

function drag(e: MouseEvent | TouchEvent) {
  if (!isDragging || !floatingButton) return
  e.preventDefault()
  let clientX, clientY
  if (e instanceof MouseEvent) {
    clientX = e.clientX
    clientY = e.clientY
  } else {
    clientX = e.touches[0].clientX
    clientY = e.touches[0].clientY
  }
  const deltaX = clientX - startX
  const deltaY = clientY - startY

  if (Math.abs(deltaX) > MOVE_THRESHOLD || Math.abs(deltaY) > MOVE_THRESHOLD) {
    hasMoved = true
  }

  floatingButton.style.left = `${startLeft + deltaX}px`
  floatingButton.style.top = `${startTop + deltaY}px`
  floatingButton.style.right = "auto"
  floatingButton.style.bottom = "auto"
}

function stopDragging() {
  if (!floatingButton) return
  isDragging = false
  floatingButton.style.transition = "background-color 0.3s ease"
}
async function toggleTranslation(
  translatePage: () => Promise<void>,
  removeTranslation: () => void
) {
  if (!floatingButton || isLoading) return
  // 获取上次选择的语言
  const lastSelectedLanguage = await storage.get(storageKey)

  if (!lastSelectedLanguage) {
    // 如果没有上次选择的语言,打开弹出窗口
    chrome.runtime.sendMessage({ action: "openPopup" })
    return
  }
  if (isTranslated) {
    setLoading(true)
    try {
      await removeTranslation()
      isTranslated = false
    } finally {
      setLoading(false)
    }
  } else {
    setLoading(true)
    try {
      await translatePage()
      isTranslated = true
    } finally {
      setLoading(false)
    }
  }
  updateButtonState()
}

function updateButtonState() {
  if (!floatingButton) return

  floatingButton.innerHTML = ""
  floatingButton.disabled = isLoading

  if (isLoading) {
    const loader = document.createElementNS("http://www.w3.org/2000/svg", "svg")
    loader.setAttribute("width", "24")
    loader.setAttribute("height", "24")
    loader.setAttribute("viewBox", "0 0 24 24")
    loader.innerHTML = getLoadingIcon()
    loader.style.animation = "spin 1s linear infinite"
    floatingButton.appendChild(loader)
    floatingButton.style.backgroundColor = "#e0e0e0"
  } else if (isTranslated) {
    floatingButton.innerHTML = getButtonIcon(true)
    floatingButton.style.backgroundColor = "#c6f8ff"
  } else {
    floatingButton.innerHTML = getButtonIcon(false)
    floatingButton.style.backgroundColor = "#ffed9e"
  }
}

function getButtonIcon(translated: boolean): string {
  const baseIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M5 8l6 6"></path>
    <path d="M4 14l6-6 2-3"></path>
    <path d="M2 5h12"></path>
    <path d="M7 2h1"></path>
    <path d="M22 22l-5-10-5 10"></path>
    <path d="M14 18h6"></path>
  </svg>`

  if (translated) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
      ${baseIcon}
      <circle cx="18" cy="18" r="6" fill="#4CAF50" />
      <path d="M15 18l2 2 4-4" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    </svg>`
  } else {
    return baseIcon
  }
}
export function setLoading(loading: boolean) {
  isLoading = loading
  updateButtonState()
}

export function updateTranslationStatus(status: boolean) {
  isTranslated = status
  updateButtonState()
}

// 添加一个样式来处理加载图标的旋转动画
const style = document.createElement("style")
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`
document.head.appendChild(style)

function getLoadingIcon(): string {
  return `
    <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" opacity=".2"/>
    <path d="M12 4a8 8 0 0 1 7.89 6.7A1.53 1.53 0 0 0 21.38 12 10 10 0 1 0 12 22a9.9 9.9 0 0 0 5.62-1.72 1.53 1.53 0 0 0 .5-2.1 1.52 1.52 0 0 0-2.1-.5A7 7 0 1 1 12 5" fill="currentColor"/>
  `
}
