'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations, useLocale } from 'next-intl';
import { useAuthStore } from '@/stores/auth';
import { fetchDoctors, fetchSchedules, createSchedule, fetchBranches } from '@/lib/api';
import { AdminShell, useAdminClinicId } from '@/components/admin/admin-shell';
import { useRouter } from '@/i18n/routing';
import { useEffect, useState } from 'react';
import { doctorDisplayName } from '@/lib/utils';

const DAYS = ['SATURDAY', 'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];

export default function AdminSchedulesPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clinicId = useAdminClinicId();
  const qc = useQueryClient();
  const [doctorId, setDoctorId] = useState('');
  const [form, setForm] = useState({
    branchId: '',
    dayOfWeek: 'SATURDAY',
    startTime: '09:00',
    endTime: '13:00',
    slotDurationMinutes: 20,
  });

  useEffect(() => {
    if (!user) router.push('/login');
  }, [user, router]);

  const { data: doctorsRes } = useQuery({
    queryKey: ['sched-doctors', clinicId],
    queryFn: () => fetchDoctors({ clinicId: clinicId!, limit: '50' }, user?.accessToken),
    enabled: !!clinicId,
  });

  const { data: branchesRes } = useQuery({
    queryKey: ['sched-branches', clinicId],
    queryFn: () => fetchBranches(clinicId!, user?.accessToken),
    enabled: !!clinicId,
  });

  const { data: schedulesRes, isLoading } = useQuery({
    queryKey: ['schedules', doctorId],
    queryFn: () => fetchSchedules(doctorId, undefined, user?.accessToken),
    enabled: !!doctorId,
  });

  const createMut = useMutation({
    mutationFn: () =>
      createSchedule({ ...form, doctorId }, user?.accessToken),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedules', doctorId] }),
  });

  return (
    <AdminShell active="schedules">
      <h1 className="text-h1">{t('admin.schedules')}</h1>
      <select
        className="input mt-4 max-w-md"
        value={doctorId}
        onChange={(e) => setDoctorId(e.target.value)}
      >
        <option value="">{t('common.selectDoctor')}</option>
        {(doctorsRes?.data || []).map((d: any) => (
          <option key={d.id} value={d.id}>
            {doctorDisplayName(d, locale)}
          </option>
        ))}
      </select>

      {doctorId && (
        <div className="mt-4 card-surface p-4 grid gap-3 sm:grid-cols-3">
          <select className="input" value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })}>
            <option value="">{t('common.selectBranch')}</option>
            {(branchesRes?.data || []).map((b: any) => (
              <option key={b.id} value={b.id}>{locale === 'fa' ? b.nameFa : b.nameEn}</option>
            ))}
          </select>
          <select className="input" value={form.dayOfWeek} onChange={(e) => setForm({ ...form, dayOfWeek: e.target.value })}>
            {DAYS.map((d) => <option key={d} value={d}>{t(`schedule.days.${d}` as any)}</option>)}
          </select>
          <input className="input" type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
          <input className="input" type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
          <input className="input" type="number" aria-label={t('schedule.slotDuration')} value={form.slotDurationMinutes} onChange={(e) => setForm({ ...form, slotDurationMinutes: Number(e.target.value) })} />
          <button type="button" className="btn-primary" aria-busy={createMut.isPending} disabled={createMut.isPending} onClick={() => createMut.mutate()}>{t('common.save')}</button>
        </div>
      )}

      {isLoading && <div className="mt-6 skeleton h-24" />}
      <ul className="mt-6 space-y-2">
        {(schedulesRes?.data || []).map((s: any) => (
          <li key={s.id} className="card-surface px-4 py-3 text-body-sm flex justify-between">
            <span>{t(`schedule.days.${s.dayOfWeek}` as any)} · {s.startTime}–{s.endTime}</span>
            <span className="text-text-muted">{s.slotDurationMinutes} {t('common.minutes')} · {locale === 'fa' ? s.branch?.nameFa : s.branch?.nameEn}</span>
          </li>
        ))}
      </ul>
    </AdminShell>
  );
}
