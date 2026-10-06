'use client';

import { useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { fetchClinics } from '@/lib/api';
import { Link } from '@/i18n/routing';
import { MapPin } from 'lucide-react';

export default function ClinicsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const { data, isLoading } = useQuery({
    queryKey: ['clinics'],
    queryFn: () => fetchClinics({ limit: '50' }),
  });

  return (
    <div className="container-narrow section-pad py-10">
      <h1 className="text-h1">{t('nav.clinics')}</h1>
      {isLoading && <div className="mt-8 skeleton h-40" />}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {(data?.data || []).map((c: any) => (
          <Link key={c.id} href={`/clinics/${c.slug}`} className="card-surface p-6 hover:shadow-soft transition-shadow">
            <h2 className="text-h2">{locale === 'fa' ? c.nameFa : c.nameEn}</h2>
            {c.city && (
              <p className="mt-2 flex items-center gap-1 text-body-sm text-text-muted">
                <MapPin size={14} /> {c.city}
              </p>
            )}
            <p className="mt-3 text-body-sm text-text-secondary line-clamp-2">
              {locale === 'fa' ? c.descriptionFa : c.descriptionEn}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
