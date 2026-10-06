'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { api } from '@/lib/api';
import { DoctorCard } from '@/components/doctors/doctor-card';

export default function SpecialtyDetailPage() {
  const t = useTranslations();
  const locale = useLocale();
  const params = useParams();
  const slug = params.slug as string;

  const { data, isLoading } = useQuery({
    queryKey: ['specialty', slug],
    queryFn: () => api.get<any>(`/specialties/slug/${slug}`),
  });

  const specialty = data?.data;
  if (isLoading) return <div className="container-narrow section-pad py-10"><div className="skeleton h-40" /></div>;
  if (!specialty) return <div className="container-narrow section-pad py-20 text-center">{t('common.noResults')}</div>;

  const doctors = (specialty.doctors || []).map((d: any) => d.doctor);

  return (
    <div className="container-narrow section-pad py-10">
      <h1 className="text-h1">{locale === 'fa' ? specialty.nameFa : specialty.nameEn}</h1>
      <p className="mt-3 text-body text-text-secondary">
        {locale === 'fa' ? specialty.descriptionFa : specialty.descriptionEn}
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {doctors.map((d: any) => d && <DoctorCard key={d.id} doctor={d} />)}
      </div>
    </div>
  );
}
