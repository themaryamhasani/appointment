'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

export default function LocalizedNotFound() {
  const t = useTranslations();

  return (
    <div className="container-narrow section-pad flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="text-6xl font-semibold text-primary">404</p>
      <h1 className="mt-4 text-h1">{t('notFound.title')}</h1>
      <Link href="/" className="btn-primary mt-6 inline-flex">
        {t('notFound.backHome')}
      </Link>
    </div>
  );
}
