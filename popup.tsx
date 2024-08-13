import { useState, useEffect } from "react"
import { Storage } from "@plasmohq/storage"

const storage = new Storage()
const storageKey = "lastSelectedLanguage"
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
  const [hasTranslation, setHasTranslation] = useState(false)
  const [shouldRefreshTranslation, setShouldRefreshTranslation] = useState(false)

  useEffect(() => {
    const getStorage = async () => {
      const lastSelectedLanguage = await storage.get(storageKey) // "value"
      if (lastSelectedLanguage) {
        console.log('result.lastSelectedLanguage', lastSelectedLanguage)
        setTargetLanguage(lastSelectedLanguage);
      } else {
        // 如果没有存储的语言，则使用默认语言
        const defaultLang = getDefaultLanguage();
        console.log('defaultLang', defaultLang)

        // 将默认语言保存到存储中
        setTargetLanguage(lastSelectedLanguage);
      }
    }
    getStorage()
    // 检查当前页面是否有翻译
    checkTranslationStatus();
  }, []);
  const checkTranslationStatus = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { action: "checkTranslation" },
          (response) => {
            console.log('response', response)
            if (response && response.hasTranslation) {
              setHasTranslation(true);
            } else {
              setHasTranslation(false);
            }
          }
        );
      }
    });
  };
  const handleTranslate = async () => {
    setIsTranslating(true);

    try {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0] || !tabs[0].id) {
          console.error('无法获取当前标签页');
          setIsTranslating(false);
          return;
        }
        setHasTranslation(true);
        chrome.tabs.sendMessage(
          tabs[0].id,
          { action: "translatePage", language: targetLanguage ,refreshTranslation: shouldRefreshTranslation },
          (response) => {
            console.log('收到响应:', response);
            if (chrome.runtime.lastError) {
              console.error('发送消息时出错:', chrome.runtime.lastError);
            } else if (response && response.success) {
              console.log('翻译成功');
            } else {
              console.warn('收到意外的响应');
            }
            setShouldRefreshTranslation(false) // 重置刷新标志
            setIsTranslating(false);
          }
        );
      });
    } catch (error) {
      console.error('翻译过程中发生错误:', error);
      setIsTranslating(false);
    }
  };
  const handleLanguageChange = async (e) => {
    const newLanguage = e.target.value;
    if (newLanguage !== targetLanguage) {
      setTargetLanguage(newLanguage);
      // 将新选择的语言保存到存储中
      await storage.set(storageKey, newLanguage)
      // 设置标志以指示需要刷新翻译
      setShouldRefreshTranslation(true)
    }

  };
  const handleRemoveTranslation = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { action: "removeTranslation" },
          (response) => {
            if (response && response.success) {
              setHasTranslation(false);
            }
          }
        );
      }
    });
  };
  return (
    <div className="popup-container">
      <header className="popup-header">
        <img src={Logo} alt="OneClick Translator Logo" className="logo" />
        <h1>OneClick Translator</h1>
      </header>
      <main className="popup-main">
        <select
          value={targetLanguage} onChange={handleLanguageChange}
          className="language-select"
        >
          {languages.map(lang => (
            <option key={lang.code} value={lang.code}>{lang.name}</option>
          ))}
        </select>
        <div className="button-container">
          <button
            onClick={handleRemoveTranslation}
            disabled={!hasTranslation} title="Remove Translation"
            className="remove-translation-button"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-rotate-ccw"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
          </button>
          <button
            onClick={handleTranslate}
            disabled={isTranslating}
            className="translate-button"
          >
            {isTranslating ? "Translating..." : "Translate"}
          </button>

        </div>
      </main>
    </div>
  )
}

export default IndexPopup