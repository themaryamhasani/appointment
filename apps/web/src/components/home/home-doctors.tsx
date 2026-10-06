'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchDoctors } from '@/lib/api';
import { DoctorCard, DoctorCardSkeleton } from '@/components/doctors/doctor-card';
import { useTranslations } from 'next-intl';

export function HomeDoctors() {
  const t = useTranslations();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['doctors', 'home'],
    queryFn: () => fetchDoctors({ limit: '6' }),
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <DoctorCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (isError || !data?.data?.length) {
    return <p className="text-body-sm text-text-muted">{t('common.noResults')}</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {data.data.map((doctor: any) => (
        <DoctorCard key={doctor.id} doctor={doctor} />
      ))}
    </div>
  );
}
