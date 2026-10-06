'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations, useLocale } from 'next-intl';
import { fetchAppointments, cancelAppointment } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { Link, useRouter } from '@/i18n/routing';
import { useEffect, useState } from 'react';
import { doctorDisplayName, formatDate } from '@/lib/utils';

export default function AppointmentsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) router.push('/login');
  }, [user, router]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['appointments', user?.id],
    queryFn: () => fetchAppointments({ limit: '50' }, user?.accessToken),
    enabled: !!user,
  });

  const items = data?.data || [];
  const today = new Date().toISOString().slice(0, 10);
  const filtered = items.filter((a: any) => {
    const d = a.appointmentDate?.slice?.(0, 10) || String(a.appointmentDate).slice(0, 10);
    if (tab === 'upcoming') {
      return d >= today && !['CANCELLED', 'COMPLETED', 'EXPIRED', 'REJECTED', 'NO_SHOW'].includes(a.status);
    }
    return d < today || ['CANCELLED', 'COMPLETED', 'EXPIRED', 'REJECTED', 'NO_SHOW'].includes(a.status);
  });

  async function handleCancel(id: string) {
    const reason = window.prompt(t('appointments.cancelReason'));
    if (!reason || !user) return;
    setCancellingId(id);
    try {
      await cancelAppointment(id, reason, user.accessToken);
      await refetch();
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div className="container-narrow section-pad py-10">
      <h1 className="text-h1">{t('appointments.title')}</h1>
      <div className="mt-6 flex gap-2">
        <button
          type="button"
          className={tab === 'upcoming' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => setTab('upcoming')}
        >
          {t('appointments.upcoming')}
        </button>
        <button
          type="button"
          className={tab === 'past' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => setTab('past')}
        >
          {t('appointments.past')}
        </button>
      </div>

      {isLoading && <div className="mt-8 skeleton h-40" />}

      {!isLoading && !filtered.length && (
        <div className="mt-16 text-center">
          <p className="text-body text-text-muted">{t('appointments.empty')}</p>
          <Link href="/doctors" className="btn-primary mt-4 inline-flex">
            {t('common.bookAppointment')}
          </Link>
        </div>
      )}

      <ul className="mt-8 space-y-3">
        {filtered.map((a: any) => (
          <li key={a.id} className="card-surface flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Link href={`/appointments/${a.id}`} className="text-h3 hover:text-primary">
                {a.doctor
                  ? doctorDisplayName(a.doctor, locale)
                  : a.doctorId}
              </Link>
              <p className="mt-1 text-body-sm text-text-secondary">
                {formatDate(String(a.appointmentDate).slice(0, 10), locale)} · {a.startTime} ·{' '}
                {t(`appointments.status.${a.status}` as any)}
              </p>
              {a.branch && (
                <p className="text-caption text-text-muted">
                  {locale === 'fa' ? a.branch.nameFa : a.branch.nameEn}
                </p>
              )}
            </div>
            {['PENDING', 'CONFIRMED'].includes(a.status) && (
              <button
                type="button"
                className="btn-secondary text-danger"
                disabled={cancellingId === a.id}
                aria-busy={cancellingId === a.id}
                onClick={() => handleCancel(a.id)}
              >
                {t('appointments.cancel')}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
