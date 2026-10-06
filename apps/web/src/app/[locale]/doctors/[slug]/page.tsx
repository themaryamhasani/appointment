'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { fetchDoctor, fetchAvailability, createAppointment, createPayment, api } from '@/lib/api';
import { doctorDisplayName, formatCurrency, formatDate } from '@/lib/utils';
import { TimeSlotGrid } from '@/components/booking/time-slot-grid';
import { useAuthStore } from '@/stores/auth';
import { useRouter } from '@/i18n/routing';
import { useMemo, useState } from 'react';

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function DoctorProfilePage() {
  const t = useTranslations();
  const locale = useLocale();
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const { data: doctorRes, isLoading } = useQuery({
    queryKey: ['doctor', slug],
    queryFn: () => fetchDoctor(slug),
  });

  const doctor = doctorRes?.data;
  const branches = doctor?.branches || [];
  const [branchId, setBranchId] = useState<string>('');
  const [visitType, setVisitType] = useState<'IN_PERSON' | 'TELEHEALTH'>('IN_PERSON');
  const [date, setDate] = useState(addDays(new Date(), 1));
  const [time, setTime] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedBranchId = branchId || branches[0]?.branchId || branches[0]?.branch?.id;

  const from = date;
  const to = date;

  const { data: availRes, isLoading: loadingSlots } = useQuery({
    queryKey: ['availability', doctor?.id, selectedBranchId, from, to],
    queryFn: () => fetchAvailability(doctor.id, selectedBranchId, from, to),
    enabled: !!doctor?.id && !!selectedBranchId,
  });

  const slots = useMemo(() => {
    const days = availRes?.data || [];
    return days[0]?.slots || [];
  }, [availRes]);

  const dates = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => addDays(new Date(), i));
  }, []);

  async function handleBook() {
    if (!user) {
      router.push('/login');
      return;
    }
    if (!doctor || !selectedBranchId || !time) return;
    setBooking(true);
    setError(null);
    try {
      await api.post(
        '/slots/reserve',
        { doctorId: doctor.id, branchId: selectedBranchId, date, time },
        { token: user.accessToken },
      );
      const appt = await createAppointment(
        {
          doctorId: doctor.id,
          branchId: selectedBranchId,
          appointmentDate: date,
          startTime: time,
          visitType,
          specialtyId: doctor.specialties?.[0]?.specialtyId,
        },
        user.accessToken,
      );
      await createPayment(appt.data.id, user.accessToken);
      router.push(`/appointments/${appt.data.id}`);
    } catch (e: any) {
      if (e.code === 'APPOINTMENT_SLOT_UNAVAILABLE') setError(t('booking.slotUnavailable'));
      else if (e.code === 'RESERVATION_EXPIRED') setError(t('booking.reservationExpired'));
      else setError(t('common.error'));
    } finally {
      setBooking(false);
    }
  }

  if (isLoading) {
    return (
      <div className="container-narrow section-pad py-10">
        <div className="skeleton h-40 w-full" />
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="container-narrow section-pad py-20 text-center text-text-muted">
        {t('common.noResults')}
      </div>
    );
  }

  const name = doctorDisplayName(doctor, locale);
  const bio = locale === 'fa' ? doctor.bioFa : doctor.bioEn;
  const education = locale === 'fa' ? doctor.educationFa : doctor.educationEn;

  return (
    <div className="container-narrow section-pad py-10">
      <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="flex gap-5">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-surface-muted text-h1 text-primary">
              {doctor.user.firstName[0]}
              {doctor.user.lastName[0]}
            </div>
            <div>
              <h1 className="text-h1">{name}</h1>
              <p className="mt-1 text-body text-text-secondary">
                {doctor.specialties
                  ?.map((s: any) => (locale === 'fa' ? s.specialty.nameFa : s.specialty.nameEn))
                  .join(' · ')}
              </p>
              <p className="mt-2 text-body-sm text-text-muted">
                {doctor.experienceYears} {t('doctor.experience')} · ★ {Number(doctor.rating).toFixed(1)}
              </p>
            </div>
          </div>

          <section className="mt-10">
            <h2 className="text-h2">{t('doctor.about')}</h2>
            <p className="mt-3 text-body text-text-secondary leading-relaxed">{bio}</p>
          </section>

          {education && (
            <section className="mt-8">
              <h2 className="text-h3">{t('doctor.education')}</h2>
              <p className="mt-2 text-body text-text-secondary">{education}</p>
            </section>
          )}

          <section className="mt-8">
            <h2 className="text-h3">{t('doctor.locations')}</h2>
            <ul className="mt-3 space-y-2">
              {branches.map((b: any) => {
                const branch = b.branch;
                return (
                  <li key={b.id || b.branchId} className="text-body-sm text-text-secondary">
                    {locale === 'fa' ? branch.clinic.nameFa : branch.clinic.nameEn}
                    {' — '}
                    {locale === 'fa' ? branch.nameFa : branch.nameEn}
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 h-fit card-surface p-5 shadow-soft">
          <p className="text-body font-medium">
            {formatCurrency(Number(doctor.consultationFee), locale)}
          </p>

          <div className="mt-4">
            <label className="label">{t('booking.stepLocation')}</label>
            <select
              className="input"
              value={selectedBranchId || ''}
              onChange={(e) => {
                setBranchId(e.target.value);
                setTime(null);
              }}
            >
              {branches.map((b: any) => {
                const branch = b.branch;
                const id = b.branchId || branch.id;
                return (
                  <option key={id} value={id}>
                    {locale === 'fa' ? branch.nameFa : branch.nameEn}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="mt-4">
            <label className="label">{t('booking.stepVisitType')}</label>
            <div className="flex gap-2">
              <button
                type="button"
                className={visitType === 'IN_PERSON' ? 'btn-primary flex-1' : 'btn-secondary flex-1'}
                onClick={() => setVisitType('IN_PERSON')}
              >
                {t('booking.inPerson')}
              </button>
              <button
                type="button"
                className={visitType === 'TELEHEALTH' ? 'btn-primary flex-1' : 'btn-secondary flex-1'}
                onClick={() => setVisitType('TELEHEALTH')}
              >
                {t('booking.telehealth')}
              </button>
            </div>
          </div>

          <div className="mt-4">
            <label className="label">{t('doctor.availableDates')}</label>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {dates.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    setDate(d);
                    setTime(null);
                  }}
                  className={
                    date === d
                      ? 'btn-primary shrink-0 text-caption'
                      : 'btn-secondary shrink-0 text-caption'
                  }
                >
                  {formatDate(d, locale)}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <label className="label">{t('doctor.selectSlot')}</label>
            {loadingSlots ? (
              <div className="skeleton h-24" />
            ) : (
              <TimeSlotGrid slots={slots} selected={time} onSelect={setTime} />
            )}
          </div>

          {error && <p className="mt-3 text-body-sm text-danger">{error}</p>}

          <button
            type="button"
            className="btn-primary mt-5 w-full"
            aria-busy={booking}
            disabled={!time || booking}
            onClick={handleBook}
          >
            {t('booking.confirmBooking')}
          </button>
        </aside>
      </div>
    </div>
  );
}
