'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { api } from '@/lib/api';
import { Link } from '@/i18n/routing';

export default function ClinicDetailPage() {
  const t = useTranslations();
  const locale = useLocale();
  const params = useParams();
  const slug = params.slug as string;

  const { data, isLoading } = useQuery({
    queryKey: ['clinic', slug],
    queryFn: () => api.get<any>(`/clinics/slug/${slug}`),
  });

  const clinic = data?.data;
  if (isLoading) return <div className="container-narrow section-pad py-10"><div className="skeleton h-40" /></div>;
  if (!clinic) return <div className="container-narrow section-pad py-20 text-center">{t('common.noResults')}</div>;

  return (
    <div className="container-narrow section-pad py-10">
      <h1 className="text-h1">{locale === 'fa' ? clinic.nameFa : clinic.nameEn}</h1>
      <p className="mt-3 max-w-2xl text-body text-text-secondary">
        {locale === 'fa' ? clinic.descriptionFa : clinic.descriptionEn}
      </p>
      <h2 className="mt-10 text-h2">{t('admin.branches')}</h2>
      <ul className="mt-4 space-y-3">
        {(clinic.branches || []).map((b: any) => (
          <li key={b.id} className="card-surface p-4">
            <p className="font-medium">{locale === 'fa' ? b.nameFa : b.nameEn}</p>
            <p className="text-body-sm text-text-muted">{b.city}</p>
          </li>
        ))}
      </ul>
      <Link href={`/doctors?city=${clinic.city || ''}`} className="btn-primary mt-8 inline-flex">
        {t('nav.doctors')}
      </Link>
    </div>
  );
}
