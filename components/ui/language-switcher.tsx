"use client"

import { useEffect, useState } from 'react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Globe } from 'lucide-react'
import i18n from '@/lib/i18n'
import { useTranslation } from 'react-i18next'

export default function LanguageSwitcher() {
  const { t } = useTranslation()
  const [lang, setLang] = useState<string>('en')

  useEffect(() => {
    setLang(i18n.language || (typeof window !== 'undefined' ? localStorage.getItem('lang') || 'en' : 'en'))
  }, [])

  const changeLanguage = (lng: 'en' | 'de') => {
    i18n.changeLanguage(lng)
    if (typeof window !== 'undefined') {
      localStorage.setItem('lang', lng)
    }
    setLang(lng)
  }

  const label = lang === 'de' ? t('language.german') : t('language.english')

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Globe className="w-4 h-4" />
          <span>{label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => changeLanguage('en')}>{t('language.english')}</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => changeLanguage('de')}>{t('language.german')}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}