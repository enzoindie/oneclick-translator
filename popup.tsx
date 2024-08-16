import { useState, useEffect } from "react"
import { Storage } from "@plasmohq/storage"

const storage = new Storage()
const storageKey = "lastSelectedLanguage"
import "./style.css"
import Logo from "data-base64:~assets/icon.png"
const languages = [
  { code: '', name: 'Select' }, 
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

function IndexPopup() {
  const [isTranslating, setIsTranslating] = useState(false)
  const [targetLanguage, setTargetLanguage] = useState('')
  const [hasTranslation, setHasTranslation] = useState(false)
  const [shouldRefreshTranslation, setShouldRefreshTranslation] = useState(false)

  useEffect(() => {
    const getStorage = async () => {
      const lastSelectedLanguage = await storage.get(storageKey) // "value"
      if (lastSelectedLanguage) {
        console.log('result.lastSelectedLanguage', lastSelectedLanguage)
        setTargetLanguage(lastSelectedLanguage);
      }
    }
    getStorage()
    // check current tab translation status
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
    if (!targetLanguage) {
      alert('select language')
      return
    }
    setIsTranslating(true);

    try {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0] || !tabs[0].id) {
          console.error('get tab failed');
          setIsTranslating(false);
          return;
        }
        setHasTranslation(true);
        chrome.tabs.sendMessage(
          tabs[0].id,
          { action: "translatePage", language: targetLanguage, refreshTranslation: shouldRefreshTranslation },
          (response) => {
            console.log('get response:', response);
            setShouldRefreshTranslation(false) // reset refresh flag
            setIsTranslating(false);
          }
        );
      });
    } catch (error) {
      console.error('translate process failed:', error);
      setIsTranslating(false);
    }
  };
  const handleLanguageChange = async (e) => {
    const newLanguage = e.target.value;
    if (newLanguage !== targetLanguage) {
      setTargetLanguage(newLanguage);
      // save language to storage
      if (newLanguage) {
        await storage.set(storageKey, newLanguage)
        // set flag to refresh translation
        setShouldRefreshTranslation(true)
      }
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