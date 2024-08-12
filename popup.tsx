import { useState, useEffect } from "react"
import "./style.css" // 确保创建并导入这个 CSS 文件
import Logo from "data-base64:~assets/icon.png"
const languages = [
  { code: 'zh-Hans', name: '中文（简体）' },
  { code: 'es', name: 'Español' },
  { code: 'ja', name: '日本語' },
  { code: 'ru', name: 'Русский' },
  { code: 'de', name: 'Deutsch' },
  { code: 'fr', name: 'Français' },
  { code: 'en', name: 'English' },
  { code: 'ko', name: '한국어' },
  { code: 'it', name: 'Italiano' },
  { code: 'pt', name: 'Português' },
];

function getDefaultLanguage(): string {
  const browserLang = navigator.language || (navigator.languages && navigator.languages[0]);
  const langCode = browserLang.split('-')[0]; // 获取主要语言代码

  // 查找匹配的语言代码
  const matchedLang = languages.find(lang => lang.code.startsWith(langCode));
  return matchedLang ? matchedLang.code : 'en'; // 如果没有匹配的,默认使用英语
}

function IndexPopup() {
  const [isTranslating, setIsTranslating] = useState(false)
  const [targetLanguage, setTargetLanguage] = useState('zh-Hans')

  useEffect(() => {
    // 组件加载时设置默认语言
    setTargetLanguage(getDefaultLanguage());
  }, []);
  
  const handleTranslate = async () => {
    setIsTranslating(true)
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(
        tabs[0].id, 
        { action: "translatePage", language: targetLanguage },
        (response) => {
          if (response.success) {
            setIsTranslating(false)
          }
        }
      )
    })
  }

  return (
    <div className="popup-container">
      <header className="popup-header">
        <img src={Logo} alt="OneClick Translator Logo" className="logo" />
        <h1>OneClick Translator</h1>
      </header>
      <main className="popup-main">
      <select 
          value={targetLanguage} 
          onChange={(e) => setTargetLanguage(e.target.value)}
          className="language-select"
        >
          {languages.map(lang => (
            <option key={lang.code} value={lang.code}>{lang.name}</option>
          ))}
        </select>
        <button 
          onClick={handleTranslate} 
          disabled={isTranslating}
          className="translate-button"
        >
          {isTranslating ? "Translating..." : "Translate"}
        </button>
      </main>
    </div>
  )
}

export default IndexPopup