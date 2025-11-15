'use client';

import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'; // <-- point this to your Select wrapper file

type LangOption = {
  value: string;
  labelKey: string; // i18n key to render the label
  flag?: string; // optional emoji or icon code
};

// Configure your languages here
const LANGS: LangOption[] = [
  { value: 'en', labelKey: 'language.english', flag: '🇺🇸' },
  { value: 'fr', labelKey: 'language.french', flag: '🇫🇷' },
];

export default function LanguageSelector({
  className,
}: {
  className?: string;
}) {
  const { i18n, t } = useTranslation();

  // current language from i18next; normalize like "en-US" -> "en"
  const current = useMemo(
    () => (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0],
    [i18n.resolvedLanguage, i18n.language],
  );

  // ensure we have a supported language on first mount
  useEffect(() => {
    const supported = LANGS.map((l) => l.value);
    if (!supported.includes(current)) {
      i18n.changeLanguage('en');
      localStorage.setItem('i18nextLng', 'en');
    }
  }, [current, i18n]);

  const onChange = async (lng: string) => {
    await i18n.changeLanguage(lng);
    localStorage.setItem('i18nextLng', lng);

    // If you also want to inform your backend, store it or call an API here.
    // Example header usage happens when you fetch (see earlier message).
  };

  return (
    <Select value={current} onValueChange={onChange}>
      <SelectTrigger
        className={className}
        aria-label={t('select.language') || 'Language'}
      >
        <SelectValue
          placeholder={t('select.language') || 'Language'}
          aria-label={t('select.language') || 'Language'}
        />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>{t('select.language') || 'Language'}</SelectLabel>
          {LANGS.map((lang) => (
            <SelectItem key={lang.value} value={lang.value}>
              <span
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
              >
                {lang.flag ? <span aria-hidden>{lang.flag}</span> : null}
                <span>{t(lang.labelKey)}</span>
              </span>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
