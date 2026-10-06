'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchClinics } from '@/lib/api';
import { Link } from '@/i18n/routing';
import { useLocale, useTranslations } from 'next-intl';
import { MapPin } from 'lucide-react';

export function HomeClinics() {
  const t = useTranslations();
  const locale = useLocale();
  const { data, isLoading } = useQuery({
    queryKey: ['clinics', 'home'],
    queryFn: () => fetchClinics({ limit: '3' }),
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton h-32" />
        ))}
      </div>
    );
  }

  const items = data?.data || [];
  if (!items.length) return <p className="text-body-sm text-text-muted">{t('common.noResults')}</p>;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {items.map((c: any) => (
        <Link
          key={c.id}
          href={`/clinics/${c.slug}`}
          className="card-surface p-5 transition-shadow hover:shadow-soft"
        >
          <h3 className="text-h3">{locale === 'fa' ? c.nameFa : c.nameEn}</h3>
          {c.city && (
            <p className="mt-2 flex items-center gap-1.5 text-body-sm text-text-muted">
              <MapPin size={14} />
              {c.city}
            </p>
          )}
          <p className="mt-3 line-clamp-2 text-body-sm text-text-secondary">
            {locale === 'fa' ? c.descriptionFa : c.descriptionEn}
          </p>
        </Link>
      ))}
    </div>
  );
}
