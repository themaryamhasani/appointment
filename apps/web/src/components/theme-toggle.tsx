'use client';

import { Moon, Sun } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.style.colorScheme = theme;
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const t = useTranslations('common');
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  }, []);

  const nextTheme = theme === 'dark' ? 'light' : 'dark';
  const label = nextTheme === 'dark' ? t('darkTheme') : t('lightTheme');

  return (
    <button
      type="button"
      className={compact ? 'btn-ghost w-full justify-start' : 'btn-ghost p-2.5'}
      aria-label={label}
      title={label}
      onClick={() => {
        setTheme(nextTheme);
        applyTheme(nextTheme);
        localStorage.setItem('healthcare-theme', nextTheme);
      }}
    >
      {theme === 'dark' ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
      {compact && <span>{label}</span>}
    </button>
  );
}
