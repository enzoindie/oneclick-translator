let isTranslated = false
let isLoading = false
let floatingButton: HTMLButtonElement | null = null

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
    padding: 10px 20px;
    background-color: #4CAF50;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  `
  document.body.appendChild(floatingButton)

  floatingButton.addEventListener("click", () =>
    toggleTranslation(translatePage, removeTranslation)
  )
}

async function toggleTranslation(
  translatePage: () => Promise<void>,
  removeTranslation: () => void
) {
  if (!floatingButton || isLoading) return

  if (isTranslated) {
    await removeTranslation()
    isTranslated = false
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
    loader.setAttribute("width", "20")
    loader.setAttribute("height", "20")
    loader.setAttribute("viewBox", "0 0 24 24")
    loader.innerHTML =
      '<path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" opacity=".2"/><path d="M12 4a8 8 0 0 1 7.89 6.7A1.53 1.53 0 0 0 21.38 12 10 10 0 1 0 12 22a9.9 9.9 0 0 0 5.62-1.72 1.53 1.53 0 0 0 .5-2.1 1.52 1.52 0 0 0-2.1-.5A7 7 0 1 1 12 5" fill="currentColor"/>'
    loader.style.animation = "spin 1s linear infinite"
    floatingButton.appendChild(loader)
    floatingButton.appendChild(document.createTextNode(" 翻译中..."))
    floatingButton.style.backgroundColor = "#999999"
  } else if (isTranslated) {
    floatingButton.innerText = "取消翻译"
    floatingButton.style.backgroundColor = "#f44336"
  } else {
    floatingButton.innerText = "翻译"
    floatingButton.style.backgroundColor = "#4CAF50"
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

function getButtonIcon(translated: boolean): string {
  if (translated) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>`;
  } else {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M5 8l6 6"></path>
      <path d="M4 14l6-6 2-3"></path>
      <path d="M2 5h12"></path>
      <path d="M7 2h1"></path>
      <path d="M22 22l-5-10-5 10"></path>
      <path d="M14 18h6"></path>
    </svg>`;
  }
}

function getLoadingIcon(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="12" y1="2" x2="12" y2="6"></line>
    <line x1="12" y1="18" x2="12" y2="22"></line>
    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
    <line x1="2" y1="12" x2="6" y2="12"></line>
    <line x1="18" y1="12" x2="22" y2="12"></line>
    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
    <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
  </svg>`;
}