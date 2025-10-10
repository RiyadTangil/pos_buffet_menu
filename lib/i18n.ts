"use client"

import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import enCommon from '@/locales/en/common.json'
import deCommon from '@/locales/de/common.json'

const resources = {
  en: { common: enCommon },
  de: { common: deCommon }
}

// Initialize once in client
if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: typeof window !== 'undefined' ? (localStorage.getItem('lang') || 'en') : 'en',
      fallbackLng: 'en',
      ns: ['common'],
      defaultNS: 'common',
      interpolation: { escapeValue: false }
    })
}

export default i18n