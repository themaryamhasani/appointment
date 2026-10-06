'use client';

import { useTranslations } from 'next-intl';

export function LoadingState({ fullPage = false }: { fullPage?: boolean }) {
  const t = useTranslations('common');
  return (
    <div
      className={fullPage ? 'flex min-h-[45vh] items-center justify-center' : 'flex items-center justify-center py-10'}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-4 text-text-muted">
        <div className="flex gap-1.5" aria-hidden>
          <span className="loading-dot" />
          <span className="loading-dot [animation-delay:120ms]" />
          <span className="loading-dot [animation-delay:240ms]" />
        </div>
        <span className="text-body-sm">{t('loading')}</span>
      </div>
    </div>
  );
}
