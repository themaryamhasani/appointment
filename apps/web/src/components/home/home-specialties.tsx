'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchSpecialties } from '@/lib/api';
import { Link } from '@/i18n/routing';
import { useLocale, useTranslations } from 'next-intl';

export function HomeSpecialties() {
  const t = useTranslations();
  const locale = useLocale();
  const { data, isLoading } = useQuery({
    queryKey: ['specialties'],
    queryFn: () => fetchSpecialties(),
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="skeleton h-20" />
        ))}
      </div>
    );
  }

  const items = data?.data || [];
  if (!items.length) return <p className="text-body-sm text-text-muted">{t('common.noResults')}</p>;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {items.slice(0, 8).map((s: any) => (
        <Link
          key={s.id}
          href={`/specialties/${s.slug}`}
          className="card-surface flex flex-col justify-center p-4 transition-colors hover:border-primary"
        >
          <span className="text-body font-medium text-text-primary">
            {locale === 'fa' ? s.nameFa : s.nameEn}
          </span>
          <span className="mt-1 text-caption text-text-muted">
            {s._count?.doctors ?? 0}
          </span>
        </Link>
      ))}
    </div>
  );
}
