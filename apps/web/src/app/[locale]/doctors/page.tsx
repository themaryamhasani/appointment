'use client';

import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { fetchDoctors } from '@/lib/api';
import { DoctorCard, DoctorCardSkeleton } from '@/components/doctors/doctor-card';
import { Suspense, useState } from 'react';

function DoctorsPageContent() {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [city, setCity] = useState(searchParams.get('city') || '');

  const { data, isLoading } = useQuery({
    queryKey: ['doctors', search, city],
    queryFn: () =>
      fetchDoctors({
        ...(search ? { search } : {}),
        ...(city ? { city } : {}),
        limit: '24',
      }),
  });

  return (
    <div className="container-narrow section-pad py-10">
      <h1 className="text-h1">{t('nav.doctors')}</h1>
      <form
        className="mt-6 flex flex-col gap-3 sm:flex-row"
        onSubmit={(e) => e.preventDefault()}
      >
        <input
          className="input"
          placeholder={t('common.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <input
          className="input sm:max-w-xs"
          placeholder={t('home.location')}
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
      </form>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <DoctorCardSkeleton key={i} />)
          : (data?.data || []).map((d: any) => <DoctorCard key={d.id} doctor={d} />)}
      </div>

      {!isLoading && !data?.data?.length && (
        <p className="mt-12 text-center text-text-muted">{t('common.noResults')}</p>
      )}
    </div>
  );
}

export default function DoctorsPage() {
  return (
    <Suspense fallback={<div className="container-narrow section-pad py-10"><div className="skeleton h-64" /></div>}>
      <DoctorsPageContent />
    </Suspense>
  );
}
