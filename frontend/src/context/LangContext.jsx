import { createContext, useContext, useState } from 'react'
import ru from '../locales/ru.json'
import en from '../locales/en.json'

const locales = { ru, en }

const LangContext = createContext(null)

export function LangProvider({ children }) {
  const [lang, setLang] = useState('ru')

  return (
    <LangContext.Provider value={{ lang, setLang, t: locales[lang] }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useLang must be used within LangProvider')
  return ctx
}
