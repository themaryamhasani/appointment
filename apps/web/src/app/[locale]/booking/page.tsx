'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, Link } from '@/i18n/routing';
import { BookingProgress } from '@/components/booking/booking-progress';
import { TimeSlotGrid } from '@/components/booking/time-slot-grid';
import {
  fetchDoctors,
  fetchAvailability,
  reserveSlot,
  createAppointment,
  createPayment,
  API_URL,
} from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useBookingStore } from '@/stores/auth';
import { doctorDisplayName, formatDate } from '@/lib/utils';

function addDays(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function BookingPageContent() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const search = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const booking = useBookingStore();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [doctorSlugOrId] = useState(search.get('doctor') || '');

  const { data: doctorsRes } = useQuery({
    queryKey: ['booking-doctors'],
    queryFn: () => fetchDoctors({ limit: '50' }),
  });

  const selectedDoctor = useMemo(() => {
    const list = doctorsRes?.data || [];
    return (
      list.find((d: any) => d.id === booking.doctorId || d.slug === doctorSlugOrId || d.id === doctorSlugOrId) ||
      list.find((d: any) => d.slug === doctorSlugOrId)
    );
  }, [doctorsRes, booking.doctorId, doctorSlugOrId]);

  useEffect(() => {
    if (selectedDoctor && !booking.doctorId) {
      booking.setField({ doctorId: selectedDoctor.id, step: 1 });
    }
  }, [selectedDoctor, booking]);

  const branches = selectedDoctor?.branches || [];
  const branchId = booking.branchId || branches[0]?.branchId || branches[0]?.branch?.id;

  useEffect(() => {
    if (branchId && !booking.branchId) booking.setField({ branchId });
  }, [branchId, booking]);

  const date = booking.date || addDays(1);
  const { data: availRes, isLoading: loadingSlots } = useQuery({
    queryKey: ['booking-avail', booking.doctorId, branchId, date],
    queryFn: () => fetchAvailability(booking.doctorId!, branchId, date, date),
    enabled: !!booking.doctorId && !!branchId && booking.step >= 3,
  });
  const slots = availRes?.data?.[0]?.slots || [];

  async function finish() {
    if (!user) {
      router.push('/login');
      return;
    }
    if (!booking.doctorId || !branchId || !booking.time) return;
    setLoading(true);
    setError(null);
    try {
      await reserveSlot(
        {
          doctorId: booking.doctorId,
          branchId,
          date,
          time: booking.time,
        },
        user.accessToken,
      );
      const appt = await createAppointment(
        {
          doctorId: booking.doctorId,
          branchId,
          appointmentDate: date,
          startTime: booking.time,
          visitType: booking.visitType,
          specialtyId: selectedDoctor?.specialties?.[0]?.specialtyId,
        },
        user.accessToken,
      );
      const pay = await createPayment(appt.data.id, user.accessToken);
      booking.reset();
      const redirect = pay.data?.redirectUrl || pay.data?.metadata?.redirectUrl;
      if (redirect && String(redirect).startsWith('http')) {
        window.location.href = redirect;
        return;
      }
      if (redirect && String(redirect).includes('mock-checkout')) {
        // Mock: complete via webhook then go to appointment
        await fetch(`${API_URL}/payments/webhook`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            providerRef: pay.data.providerRef,
            idempotencyKey: pay.data.idempotencyKey,
            status: 'PAID',
          }),
        });
      }
      router.push(`/appointments/${appt.data.id}`);
    } catch (e: any) {
      setError(e?.code === 'APPOINTMENT_SLOT_UNAVAILABLE' ? t('booking.slotUnavailable') : t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-narrow section-pad py-10 max-w-3xl">
      <h1 className="text-h1">{t('booking.title')}</h1>
      <div className="mt-6">
        <BookingProgress current={booking.step} />
      </div>

      {booking.step === 0 && (
        <div className="mt-8 space-y-2">
          {(doctorsRes?.data || []).map((d: any) => (
            <button
              key={d.id}
              type="button"
              className="card-surface w-full p-4 text-start hover:border-primary"
              onClick={() => booking.setField({ doctorId: d.id, step: 1 })}
            >
              {doctorDisplayName(d, locale)}
            </button>
          ))}
        </div>
      )}

      {booking.step === 1 && selectedDoctor && (
        <div className="mt-8 space-y-3">
          <p className="text-h3">{doctorDisplayName(selectedDoctor, locale)}</p>
          {(branches || []).map((b: any) => {
            const id = b.branchId || b.branch?.id;
            const branch = b.branch || b;
            return (
              <button
                key={id}
                type="button"
                className="btn-secondary w-full justify-start"
                onClick={() => booking.setField({ branchId: id, step: 2 })}
              >
                {locale === 'fa' ? branch.nameFa : branch.nameEn}
              </button>
            );
          })}
        </div>
      )}

      {booking.step === 2 && (
        <div className="mt-8 flex gap-3">
          <button type="button" className="btn-primary flex-1" onClick={() => booking.setField({ visitType: 'IN_PERSON', step: 3, date })}>
            {t('booking.inPerson')}
          </button>
          <button type="button" className="btn-secondary flex-1" onClick={() => booking.setField({ visitType: 'TELEHEALTH', step: 3, date })}>
            {t('booking.telehealth')}
          </button>
        </div>
      )}

      {booking.step === 3 && (
        <div className="mt-8 space-y-4">
          <div className="flex gap-2 overflow-x-auto">
            {Array.from({ length: 14 }, (_, i) => addDays(i + 1)).map((d) => (
              <button
                key={d}
                type="button"
                className={date === d ? 'btn-primary shrink-0' : 'btn-secondary shrink-0'}
                onClick={() => booking.setField({ date: d, time: null })}
              >
                {formatDate(d, locale)}
              </button>
            ))}
          </div>
          <button type="button" className="btn-primary" onClick={() => booking.setField({ step: 4 })}>
            {t('common.next')}
          </button>
        </div>
      )}

      {booking.step === 4 && (
        <div className="mt-8">
          {loadingSlots ? <div className="skeleton h-24" /> : (
            <TimeSlotGrid
              slots={slots}
              selected={booking.time}
              onSelect={(time) => booking.setField({ time, step: 5 })}
            />
          )}
        </div>
      )}

      {booking.step >= 5 && (
        <div className="mt-8 card-surface p-6 space-y-3">
          <p className="text-body">
            {selectedDoctor && doctorDisplayName(selectedDoctor, locale)} · {date} · {booking.time}
          </p>
          {error && <p className="text-danger text-body-sm">{error}</p>}
          <button type="button" className="btn-primary w-full" aria-busy={loading} disabled={loading} onClick={finish}>
            {t('booking.confirmBooking')}
          </button>
          <Link href="/doctors" className="btn-ghost inline-flex">{t('common.back')}</Link>
        </div>
      )}
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={<div className="container-narrow section-pad py-10"><div className="skeleton h-64" /></div>}>
      <BookingPageContent />
    </Suspense>
  );
}
