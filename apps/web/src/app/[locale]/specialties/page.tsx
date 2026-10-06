'use client';

import { useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { fetchSpecialties } from '@/lib/api';
import { Link } from '@/i18n/routing';

export default function SpecialtiesPage() {
  const t = useTranslations();
  const locale = useLocale();
  const { data, isLoading } = useQuery({
    queryKey: ['specialties'],
    queryFn: () => fetchSpecialties(),
  });

  return (
    <div className="container-narrow section-pad py-10">
      <h1 className="text-h1">{t('nav.specialties')}</h1>
      {isLoading && <div className="mt-8 skeleton h-40" />}
      <div className="mt-8 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        {(data?.data || []).map((s: any) => (
          <Link key={s.id} href={`/specialties/${s.slug}`} className="card-surface p-5 hover:border-primary transition-colors">
            <h2 className="text-h3">{locale === 'fa' ? s.nameFa : s.nameEn}</h2>
            <p className="mt-2 text-caption text-text-muted">{t('common.doctorsCount', { count: s._count?.doctors ?? 0 })}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
