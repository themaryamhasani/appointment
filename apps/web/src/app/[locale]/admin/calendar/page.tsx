'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations, useLocale } from 'next-intl';
import { useAuthStore } from '@/stores/auth';
import {
  fetchAppointments,
  fetchDoctors,
  fetchBranches,
  cancelAppointment,
  checkInAppointment,
  rescheduleAppointment,
} from '@/lib/api';
import { AdminShell, useAdminClinicId } from '@/components/admin/admin-shell';
import { useRouter } from '@/i18n/routing';
import { useEffect, useMemo, useState } from 'react';
import { doctorDisplayName, cn, formatDate } from '@/lib/utils';

type View = 'day' | 'week' | 'month';

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function toYmd(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function AdminCalendarPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clinicId = useAdminClinicId();
  const [view, setView] = useState<View>('week');
  const [anchor, setAnchor] = useState(() => new Date());
  const [doctorId, setDoctorId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [status, setStatus] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  useEffect(() => {
    if (!user) router.push('/login');
  }, [user, router]);

  const range = useMemo(() => {
    const start = new Date(anchor);
    start.setHours(0, 0, 0, 0);
    if (view === 'day') return { from: toYmd(start), to: toYmd(start) };
    if (view === 'week') {
      const day = start.getDay();
      const weekStart = addDays(start, -day);
      return { from: toYmd(weekStart), to: toYmd(addDays(weekStart, 6)) };
    }
    const monthStart = new Date(start.getFullYear(), start.getMonth(), 1);
    const monthEnd = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    return { from: toYmd(monthStart), to: toYmd(monthEnd) };
  }, [anchor, view]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['calendar', clinicId, range, doctorId, branchId, status],
    queryFn: () =>
      fetchAppointments(
        {
          clinicId: clinicId!,
          from: range.from,
          to: range.to,
          limit: '200',
          ...(doctorId ? { doctorId } : {}),
          ...(branchId ? { branchId } : {}),
          ...(status ? { status } : {}),
        },
        user?.accessToken,
      ),
    enabled: !!user && !!clinicId,
  });

  const { data: doctorsRes } = useQuery({
    queryKey: ['cal-doctors', clinicId],
    queryFn: () => fetchDoctors({ clinicId: clinicId!, limit: '50' }, user?.accessToken),
    enabled: !!clinicId,
  });
  const { data: branchesRes } = useQuery({
    queryKey: ['cal-branches', clinicId],
    queryFn: () => fetchBranches(clinicId!, user?.accessToken),
    enabled: !!clinicId,
  });

  const appointments = data?.data || [];
  const days = useMemo(() => {
    const list: string[] = [];
    let cur = new Date(range.from + 'T00:00:00Z');
    const end = new Date(range.to + 'T00:00:00Z');
    while (cur <= end) {
      list.push(toYmd(cur));
      cur = addDays(cur, 1);
    }
    return list;
  }, [range]);

  async function onDrop(date: string, time: string) {
    if (!dragId || !user) return;
    const appointmentId = dragId;
    setActionId(appointmentId);
    try {
      await rescheduleAppointment(
        appointmentId,
        { appointmentDate: date, startTime: time },
        user.accessToken,
      );
      await refetch();
    } catch {
      /* slot conflict */
    } finally {
      setActionId(null);
      setDragId(null);
    }
  }

  async function handleCheckIn(id: string) {
    setActionId(id);
    try {
      await checkInAppointment(id, user?.accessToken);
      await refetch();
    } finally {
      setActionId(null);
    }
  }

  async function handleCancel(id: string) {
    const reason = window.prompt(t('fields.reason'));
    if (!reason) return;
    setActionId(id);
    try {
      await cancelAppointment(id, reason, user?.accessToken);
      await refetch();
    } finally {
      setActionId(null);
    }
  }

  const hours = Array.from({ length: 12 }, (_, i) => `${String(8 + i).padStart(2, '0')}:00`);

  return (
    <AdminShell active="calendar">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h1">{t('admin.calendar')}</h1>
        <div className="flex gap-2">
          {(['day', 'week', 'month'] as View[]).map((v) => (
            <button
              key={v}
              type="button"
              className={view === v ? 'btn-primary' : 'btn-secondary'}
              onClick={() => setView(v)}
            >
              {t(`common.${v}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="btn-secondary" onClick={() => setAnchor(addDays(anchor, view === 'month' ? -30 : view === 'week' ? -7 : -1))}>
          {t('common.previous')}
        </button>
        <button type="button" className="btn-secondary" onClick={() => setAnchor(new Date())}>
          {t('common.today')}
        </button>
        <button type="button" className="btn-secondary" onClick={() => setAnchor(addDays(anchor, view === 'month' ? 30 : view === 'week' ? 7 : 1))}>
          {t('common.next')}
        </button>
        <select className="input max-w-[180px]" value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
          <option value="">{t('common.allDoctors')}</option>
          {(doctorsRes?.data || []).map((d: any) => (
            <option key={d.id} value={d.id}>{doctorDisplayName(d, locale)}</option>
          ))}
        </select>
        <select className="input max-w-[180px]" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
          <option value="">{t('common.allBranches')}</option>
          {(branchesRes?.data || []).map((b: any) => (
            <option key={b.id} value={b.id}>{locale === 'fa' ? b.nameFa : b.nameEn}</option>
          ))}
        </select>
        <select className="input max-w-[160px]" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">{t('common.allStatuses')}</option>
          {['PENDING', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED'].map((s) => (
            <option key={s} value={s}>{t(`appointments.status.${s}` as any)}</option>
          ))}
        </select>
      </div>

      {isLoading && <div className="mt-6 skeleton h-64" />}

      <div className="mt-6 overflow-x-auto">
        <div className={cn('grid gap-2', view === 'day' ? 'grid-cols-1' : view === 'week' ? 'grid-cols-7 min-w-[900px]' : 'grid-cols-7 min-w-[900px]')}>
          {days.map((day) => {
            const dayAppts = appointments.filter(
              (a: any) => String(a.appointmentDate).slice(0, 10) === day,
            );
            return (
              <div key={day} className="card-surface min-h-[160px] p-2">
                <p className="mb-2 text-caption font-medium text-text-muted">
                  {formatDate(day, locale)}
                </p>
                {view !== 'month' &&
                  hours.map((hour) => (
                    <div
                      key={hour}
                      className="min-h-[36px] border-t border-border/60 py-0.5"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => onDrop(day, hour)}
                    >
                      <span className="text-[10px] text-text-muted">{hour}</span>
                      {dayAppts
                        .filter((a: any) => a.startTime.startsWith(hour.slice(0, 2)))
                        .map((a: any) => (
                          <div
                            key={a.id}
                            draggable
                            onDragStart={() => setDragId(a.id)}
                            className={cn(
                              'mt-0.5 cursor-grab rounded bg-primary/10 px-1.5 py-1 text-[11px] text-text-primary transition-opacity',
                              (dragId === a.id || actionId === a.id) && 'opacity-50',
                            )}
                          >
                            {a.startTime} {a.patient?.user?.firstName}
                          </div>
                        ))}
                    </div>
                  ))}
                {view === 'month' &&
                  dayAppts.map((a: any) => (
                    <div
                      key={a.id}
                      draggable
                      onDragStart={() => setDragId(a.id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => onDrop(day, a.startTime)}
                      className="mt-1 rounded bg-surface-muted px-1.5 py-1 text-[11px]"
                    >
                      {a.startTime} {a.patient?.user?.firstName}
                    </div>
                  ))}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {appointments.slice(0, 5).map((a: any) => (
          <div key={a.id} className="card-surface flex items-center gap-2 px-3 py-2 text-caption">
            <span>{a.startTime} · {a.patient?.user?.firstName}</span>
            {a.status === 'CONFIRMED' && (
              <button
                type="button"
                className="btn-ghost"
                disabled={actionId === a.id}
                aria-busy={actionId === a.id}
                onClick={() => handleCheckIn(a.id)}
              >
                {t('common.checkIn')}
              </button>
            )}
            {['PENDING', 'CONFIRMED'].includes(a.status) && (
              <button
                type="button"
                className="btn-ghost text-danger"
                disabled={actionId === a.id}
                aria-busy={actionId === a.id}
                onClick={() => handleCancel(a.id)}
              >
                {t('common.cancel')}
              </button>
            )}
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
