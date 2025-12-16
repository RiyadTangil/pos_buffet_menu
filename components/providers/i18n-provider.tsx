"use client"

import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { I18nextProvider } from 'react-i18next'
import i18n from '@/lib/i18n'

export default function I18nProvider({ children }: { children: ReactNode }) {
  // Ensure client-side language selection occurs after mount to avoid hydration mismatch
  useEffect(() => {
    try {
      const lang = localStorage.getItem('lang') || 'de'
      if (i18n.language !== lang) {
        i18n.changeLanguage(lang)
      }
    } catch {}
  }, [])

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
}
