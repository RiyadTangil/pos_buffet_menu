"use client"

import { useEffect, useState, useRef } from "react"
import { Globe } from "lucide-react"
import i18n from "@/lib/i18n"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button" // optional — can replace with <button>

export default function LanguageSwitcher() {
  const { t } = useTranslation()
  const [lang, setLang] = useState<"en" | "de">("en")
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const stored =
      typeof window !== "undefined" ? localStorage.getItem("lang") : null
    setLang((i18n.language as "en" | "de") || (stored as "en" | "de") || "en")
  }, [])

  const changeLanguage = (lng: "en" | "de") => {
    i18n.changeLanguage(lng)
    if (typeof window !== "undefined") {
      localStorage.setItem("lang", lng)
    }
    setLang(lng)
    setOpen(false)
  }

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const label = lang === "de" ? t("language.german") : t("language.english")

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2"
      >
        <Globe className="w-4 h-4" />
        <span>{label}</span>
      </Button>

      {open && (
        <div className="absolute right-0 mt-2 w-40 rounded-md shadow-lg bg-white border z-50">
          <ul className="py-1 text-sm">
            <li>
              <button
                onClick={() => changeLanguage("en")}
                className="w-full px-4 py-2 text-left hover:bg-gray-100"
              >
                {t("language.english")}
              </button>
            </li>
            <li>
              <button
                onClick={() => changeLanguage("de")}
                className="w-full px-4 py-2 text-left hover:bg-gray-100"
              >
                {t("language.german")}
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}
