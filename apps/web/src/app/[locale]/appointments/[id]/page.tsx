'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { doctorDisplayName, formatDate } from '@/lib/utils';
import { Link } from '@/i18n/routing';

export default function AppointmentDetailPage() {
  const t = useTranslations();
  const locale = useLocale();
  const params = useParams();
  const id = params.id as string;
  const user = useAuthStore((s) => s.user);

  const { data, isLoading } = useQuery({
    queryKey: ['appointment', id],
    queryFn: () => api.get<any>(`/appointments/${id}`, { token: user?.accessToken }),
    enabled: !!user,
  });

  const a = data?.data;
  if (isLoading) return <div className="container-narrow section-pad py-10"><div className="skeleton h-40" /></div>;
  if (!a) {
    return (
      <div className="container-narrow section-pad py-20 text-center">
        <p>{t('common.noResults')}</p>
        <Link href="/login" className="btn-primary mt-4 inline-flex">{t('common.login')}</Link>
      </div>
    );
  }

  return (
    <div className="container-narrow section-pad py-10 max-w-2xl">
      <p className="text-caption text-success">{t('booking.success')}</p>
      <h1 className="mt-2 text-h1">{t('nav.appointments')}</h1>
      <div className="mt-8 card-surface p-6 space-y-4">
        <div>
          <p className="text-caption text-text-muted">{t('nav.doctors')}</p>
          <p className="text-h3">{a.doctor ? doctorDisplayName(a.doctor, locale) : a.doctorId}</p>
        </div>
        <div className="grid grid-cols-2 gap-4 text-body-sm">
          <div>
            <p className="text-caption text-text-muted">{t('booking.stepDate')}</p>
            <p>{formatDate(String(a.appointmentDate).slice(0, 10), locale)}</p>
          </div>
          <div>
            <p className="text-caption text-text-muted">{t('booking.stepTime')}</p>
            <p>{a.startTime} – {a.endTime}</p>
          </div>
          <div>
            <p className="text-caption text-text-muted">{t('fields.status')}</p>
            <p>{t(`appointments.status.${a.status}` as any)}</p>
          </div>
          <div>
            <p className="text-caption text-text-muted">{t('booking.stepLocation')}</p>
            <p>{a.branch ? (locale === 'fa' ? a.branch.nameFa : a.branch.nameEn) : '—'}</p>
          </div>
        </div>
      </div>
      <Link href="/appointments" className="btn-secondary mt-6 inline-flex">
        {t('common.back')}
      </Link>
    </div>
  );
}
