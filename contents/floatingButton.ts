let isTranslated = false;
let isLoading = false;
let floatingButton: HTMLButtonElement | null = null;

export function createFloatingButton(translatePage: () => Promise<void>, removeTranslation: () => void) {
  floatingButton = document.createElement('button');
  updateButtonState();
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
  `;
  document.body.appendChild(floatingButton);

  floatingButton.addEventListener('click', () => toggleTranslation(translatePage, removeTranslation));
}

async function toggleTranslation(translatePage: () => Promise<void>, removeTranslation: () => void) {
  if (!floatingButton || isLoading) return;

  if (isTranslated) {
    await removeTranslation();
    isTranslated = false;
  } else {
    setLoading(true);
    try {
      await translatePage();
      isTranslated = true;
    } finally {
      setLoading(false);
    }
  }
  updateButtonState();
}

function updateButtonState() {
  if (!floatingButton) return;

  floatingButton.innerHTML = '';
  floatingButton.disabled = isLoading;

  if (isLoading) {
    const loader = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    loader.setAttribute('width', '20');
    loader.setAttribute('height', '20');
    loader.setAttribute('viewBox', '0 0 24 24');
    loader.innerHTML = '<path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" opacity=".2"/><path d="M12 4a8 8 0 0 1 7.89 6.7A1.53 1.53 0 0 0 21.38 12 10 10 0 1 0 12 22a9.9 9.9 0 0 0 5.62-1.72 1.53 1.53 0 0 0 .5-2.1 1.52 1.52 0 0 0-2.1-.5A7 7 0 1 1 12 5" fill="currentColor"/>';
    loader.style.animation = 'spin 1s linear infinite';
    floatingButton.appendChild(loader);
    floatingButton.appendChild(document.createTextNode(' 翻译中...'));
    floatingButton.style.backgroundColor = '#999999';
  } else if (isTranslated) {
    floatingButton.innerText = '取消翻译';
    floatingButton.style.backgroundColor = '#f44336';
  } else {
    floatingButton.innerText = '翻译';
    floatingButton.style.backgroundColor = '#4CAF50';
  }
}

export function setLoading(loading: boolean) {
  isLoading = loading;
  updateButtonState();
}

export function updateTranslationStatus(status: boolean) {
  isTranslated = status;
  updateButtonState();
}

export function getTranslationStatus(): boolean {
  return isTranslated;
}

// 添加一个样式来处理加载图标的旋转动画
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);