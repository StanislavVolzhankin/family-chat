import { useLang } from '../context/LangContext'
import styles from './LangSwitcher.module.css'

function LangSwitcher() {
  const { lang, setLang } = useLang()

  return (
    <div className={styles.langSwitch}>
      <button onClick={() => setLang('ru')} disabled={lang === 'ru'}>RU</button>
      <button onClick={() => setLang('en')} disabled={lang === 'en'}>EN</button>
    </div>
  )
}

export default LangSwitcher
