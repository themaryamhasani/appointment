'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

export function Footer() {
  const t = useTranslations();
  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <div className="container-narrow section-pad py-12">
        <div className="flex flex-col gap-8 md:flex-row md:justify-between">
          <div>
            <p className="font-display text-h3 text-primary">{t('common.appName')}</p>
            <p className="mt-2 max-w-sm text-body-sm text-text-muted">
              {t('home.heroSubtitle')}
            </p>
          </div>
          <div className="flex gap-10 text-body-sm">
            <div className="space-y-2">
              <Link href="/doctors" className="block text-text-secondary hover:text-primary">
                {t('nav.doctors')}
              </Link>
              <Link href="/clinics" className="block text-text-secondary hover:text-primary">
                {t('nav.clinics')}
              </Link>
              <Link href="/specialties" className="block text-text-secondary hover:text-primary">
                {t('nav.specialties')}
              </Link>
            </div>
            <div className="space-y-2 text-text-muted">
              <p>{t('footer.about')}</p>
              <p>{t('footer.contact')}</p>
              <p>{t('footer.privacy')}</p>
            </div>
          </div>
        </div>
        <p className="mt-10 text-caption text-text-muted">
          © {new Date().getFullYear()} {t('common.appName')}. {t('footer.rights')}
        </p>
      </div>
    </footer>
  );
}
