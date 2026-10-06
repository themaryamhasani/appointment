'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations, useLocale } from 'next-intl';
import { useAuthStore } from '@/stores/auth';
import {
  fetchAppointments,
  cancelAppointment,
  checkInAppointment,
  createAppointment,
  fetchDoctors,
  fetchBranches,
  fetchPatients,
} from '@/lib/api';
import { AdminShell, useAdminClinicId } from '@/components/admin/admin-shell';
import { useRouter } from '@/i18n/routing';
import { useEffect, useState } from 'react';
import { doctorDisplayName, formatDate } from '@/lib/utils';

export default function AdminAppointmentsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clinicId = useAdminClinicId();
  const qc = useQueryClient();
  const [status, setStatus] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [form, setForm] = useState({
    doctorId: '',
    branchId: '',
    patientId: '',
    appointmentDate: new Date().toISOString().slice(0, 10),
    startTime: '09:00',
  });

  useEffect(() => {
    if (!user) router.push('/login');
  }, [user, router]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-appts', clinicId, status],
    queryFn: () =>
      fetchAppointments(
        { clinicId: clinicId!, limit: '100', ...(status ? { status } : {}) },
        user?.accessToken,
      ),
    enabled: !!user && !!clinicId,
  });

  const { data: doctorsRes } = useQuery({
    queryKey: ['admin-doctors', clinicId],
    queryFn: () => fetchDoctors({ clinicId: clinicId!, limit: '50' }, user?.accessToken),
    enabled: !!clinicId && showCreate,
  });
  const { data: branchesRes } = useQuery({
    queryKey: ['admin-branches', clinicId],
    queryFn: () => fetchBranches(clinicId!, user?.accessToken),
    enabled: !!clinicId && showCreate,
  });
  const { data: patientsRes } = useQuery({
    queryKey: ['admin-patients', clinicId],
    queryFn: () =>
      fetchPatients({ clinicId: clinicId!, limit: '50' }, user?.accessToken),
    enabled: !!clinicId && showCreate,
  });

  const createMut = useMutation({
    mutationFn: () => createAppointment(form, user?.accessToken, clinicId || undefined),
    onSuccess: () => {
      setShowCreate(false);
      qc.invalidateQueries({ queryKey: ['admin-appts'] });
    },
  });

  return (
    <AdminShell active="appointments">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h1">{t('admin.appointments')}</h1>
        <button type="button" className="btn-primary" onClick={() => setShowCreate(true)}>
          {t('admin.create')}
        </button>
      </div>

      <div className="mt-4 flex gap-2">
        <select className="input max-w-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">{t('common.allStatuses')}</option>
          {['PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'].map(
            (s) => (
              <option key={s} value={s}>
                {t(`appointments.status.${s}` as any)}
              </option>
            ),
          )}
        </select>
      </div>

      {showCreate && (
        <div className="mt-4 card-surface p-4 space-y-3">
          <select
            className="input"
            value={form.doctorId}
            onChange={(e) => setForm({ ...form, doctorId: e.target.value })}
          >
            <option value="">{t('common.selectDoctor')}</option>
            {(doctorsRes?.data || []).map((d: any) => (
              <option key={d.id} value={d.id}>
                {doctorDisplayName(d, locale)}
              </option>
            ))}
          </select>
          <select
            className="input"
            value={form.branchId}
            onChange={(e) => setForm({ ...form, branchId: e.target.value })}
          >
            <option value="">{t('common.selectBranch')}</option>
            {(branchesRes?.data || []).map((b: any) => (
              <option key={b.id} value={b.id}>
                {locale === 'fa' ? b.nameFa : b.nameEn}
              </option>
            ))}
          </select>
          <select
            className="input"
            value={form.patientId}
            onChange={(e) => setForm({ ...form, patientId: e.target.value })}
          >
            <option value="">{t('common.selectPatient')}</option>
            {(patientsRes?.data || []).map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.user?.firstName} {p.user?.lastName}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              className="input"
              value={form.appointmentDate}
              onChange={(e) => setForm({ ...form, appointmentDate: e.target.value })}
            />
            <input
              type="time"
              className="input"
              value={form.startTime}
              onChange={(e) => setForm({ ...form, startTime: e.target.value })}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-primary"
              aria-busy={createMut.isPending}
              disabled={createMut.isPending}
              onClick={() => createMut.mutate()}
            >
              {t('common.save')}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      {isLoading && <div className="mt-6 skeleton h-40" />}
      <div className="mt-6 overflow-x-auto rounded border border-border bg-surface">
        <table className="w-full text-body-sm">
          <thead className="border-b border-border text-text-muted">
            <tr>
              <th className="px-3 py-2 text-start">{t('fields.date')}</th>
              <th className="px-3 py-2 text-start">{t('fields.time')}</th>
              <th className="px-3 py-2 text-start">{t('fields.doctor')}</th>
              <th className="px-3 py-2 text-start">{t('fields.patient')}</th>
              <th className="px-3 py-2 text-start">{t('fields.status')}</th>
              <th className="px-3 py-2 text-start">{t('admin.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {(data?.data || []).map((a: any) => (
              <tr key={a.id} className="border-b border-border last:border-0">
                <td className="px-3 py-2">{formatDate(String(a.appointmentDate).slice(0, 10), locale)}</td>
                <td className="px-3 py-2">{a.startTime}</td>
                <td className="px-3 py-2">
                  {a.doctor ? doctorDisplayName(a.doctor, locale) : '—'}
                </td>
                <td className="px-3 py-2">
                  {a.patient?.user?.firstName} {a.patient?.user?.lastName}
                </td>
                <td className="px-3 py-2">{t(`appointments.status.${a.status}` as any)}</td>
                <td className="px-3 py-2 space-x-2 rtl:space-x-reverse">
                  {a.status === 'CONFIRMED' && (
                    <button
                      type="button"
                      className="btn-ghost text-caption"
                      aria-busy={actionId === a.id}
                      disabled={actionId === a.id}
                      onClick={async () => {
                        setActionId(a.id);
                        try {
                          await checkInAppointment(a.id, user?.accessToken);
                          await refetch();
                        } finally {
                          setActionId(null);
                        }
                      }}
                    >
                      {t('common.checkIn')}
                    </button>
                  )}
                  {['PENDING', 'CONFIRMED'].includes(a.status) && (
                    <button
                      type="button"
                      className="btn-ghost text-caption text-danger"
                      aria-busy={actionId === a.id}
                      disabled={actionId === a.id}
                      onClick={async () => {
                        const reason = window.prompt(t('appointments.cancelReason'));
                        if (!reason) return;
                        setActionId(a.id);
                        try {
                          await cancelAppointment(a.id, reason, user?.accessToken);
                          await refetch();
                        } finally {
                          setActionId(null);
                        }
                      }}
                    >
                      {t('appointments.cancel')}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && !(data?.data || []).length && (
          <p className="p-6 text-center text-text-muted">{t('appointments.empty')}</p>
        )}
      </div>
    </AdminShell>
  );
}
