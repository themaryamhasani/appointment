'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { useState } from 'react';
import { Search } from 'lucide-react';

export function HomeSearch() {
  const t = useTranslations();
  const router = useRouter();
  const [specialty, setSpecialty] = useState('');
  const [city, setCity] = useState('');
  const [date, setDate] = useState('');

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (specialty) params.set('search', specialty);
    if (city) params.set('city', city);
    router.push(`/doctors?${params.toString()}`);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="card-surface grid gap-3 p-4 shadow-soft md:grid-cols-[1fr_1fr_auto_auto] md:items-end"
    >
      <div>
        <label className="label" htmlFor="specialty">
          {t('home.specialty')}
        </label>
        <input
          id="specialty"
          className="input"
          value={specialty}
          onChange={(e) => setSpecialty(e.target.value)}
          placeholder={t('home.specialty')}
        />
      </div>
      <div>
        <label className="label" htmlFor="city">
          {t('home.location')}
        </label>
        <input
          id="city"
          className="input"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder={t('home.location')}
        />
      </div>
      <div>
        <label className="label" htmlFor="date">
          {t('home.date')}
        </label>
        <input
          id="date"
          type="date"
          className="input"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <button type="submit" className="btn-primary h-[42px] md:self-end">
        <Search size={16} />
        {t('home.searchCta')}
      </button>
    </form>
  );
}
