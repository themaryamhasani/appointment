'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useAuthStore } from '@/stores/auth';
import { useRouter, Link } from '@/i18n/routing';
import {
  fetchAppointment,
  startVisit,
  updateVisit,
  completeVisit,
  createPrescription,
  createLabRequest,
} from '@/lib/api';
import { AdminShell } from '@/components/admin/admin-shell';
import { formatDate } from '@/lib/utils';

export default function DoctorVisitWorkspacePage() {
  const t = useTranslations();
  const locale = useLocale();
  const params = useParams();
  const id = params.id as string;
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    chiefComplaint: '',
    symptoms: '',
    doctorNotes: '',
    diagnosis: '',
    requestedTests: '',
  });
  const [rx, setRx] = useState({ medicineName: '', dosage: '', frequency: '', duration: '', instructions: '' });
  const [labTest, setLabTest] = useState('');

  useEffect(() => {
    if (!user) router.push('/login');
  }, [user, router]);

  const { data, isLoading } = useQuery({
    queryKey: ['visit-appt', id],
    queryFn: () => fetchAppointment(id, user?.accessToken),
    enabled: !!user && !!id,
  });

  const appt = data?.data;
  const visit = appt?.visit;

  useEffect(() => {
    if (visit) {
      setForm({
        chiefComplaint: visit.chiefComplaint || '',
        symptoms: visit.symptoms || '',
        doctorNotes: visit.doctorNotes || '',
        diagnosis: visit.diagnosis || '',
        requestedTests: visit.requestedTests || '',
      });
    }
  }, [visit]);

  const startMut = useMutation({
    mutationFn: () => startVisit(id, user?.accessToken),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['visit-appt', id] }),
  });

  const saveMut = useMutation({
    mutationFn: () => updateVisit(visit.id, form, user?.accessToken),
  });

  const completeMut = useMutation({
    mutationFn: () => completeVisit(visit.id, user?.accessToken),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['visit-appt', id] }),
  });

  const rxMut = useMutation({
    mutationFn: () =>
      createPrescription(
        { visitId: visit.id, items: [rx] },
        user?.accessToken,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['visit-appt', id] }),
  });

  const labMut = useMutation({
    mutationFn: () =>
      createLabRequest(
        { visitId: visit.id, items: [{ testName: labTest }] },
        user?.accessToken,
      ),
    onSuccess: () => setLabTest(''),
  });

  if (isLoading) {
    return (
      <AdminShell active="appointments">
        <div className="skeleton h-40" />
      </AdminShell>
    );
  }

  return (
    <AdminShell active="appointments">
      <h1 className="text-h1">{t('visit.workspace')}</h1>
      <p className="mt-2 text-body-sm text-text-muted">
        {t('visit.appointment')}{' '}
        {appt?.appointmentDate
          ? formatDate(String(appt.appointmentDate).slice(0, 10), locale)
          : '—'}{' '}
        · {appt?.startTime} ·{' '}
        {appt?.patient?.user?.firstName} {appt?.patient?.user?.lastName}
      </p>

      {!visit && (
        <button type="button" className="btn-primary mt-6" aria-busy={startMut.isPending} disabled={startMut.isPending} onClick={() => startMut.mutate()}>
          {t('visit.start')}
        </button>
      )}

      {visit && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="card-surface p-5 space-y-3">
            {(['chiefComplaint', 'symptoms', 'diagnosis', 'requestedTests', 'doctorNotes'] as const).map((field) => (
              <div key={field}>
                <label className="label">{t(`visit.${field}`)}</label>
                <textarea
                  className="input min-h-[80px]"
                  value={form[field]}
                  onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                />
              </div>
            ))}
            <div className="flex gap-2">
              <button type="button" className="btn-secondary" aria-busy={saveMut.isPending} disabled={saveMut.isPending} onClick={() => saveMut.mutate()}>
                {t('common.save')}
              </button>
              <button type="button" className="btn-primary" aria-busy={completeMut.isPending} disabled={completeMut.isPending} onClick={() => completeMut.mutate()}>
                {t('visit.completeVisit')}
              </button>
            </div>
          </div>

          <div className="card-surface p-5 space-y-3">
            <h2 className="text-h3">{t('visit.prescription')}</h2>
            {visit.prescription?.items?.map((item: any) => (
              <p key={item.id} className="text-body-sm">
                {item.medicineName} — {item.dosage}, {item.frequency}, {item.duration}
              </p>
            ))}
            {!visit.prescription && (
              <>
                {(['medicineName', 'dosage', 'frequency', 'duration', 'instructions'] as const).map((f) => (
                  <input
                    key={f}
                    className="input"
                    placeholder={t(`visit.${f}`)}
                    value={rx[f]}
                    onChange={(e) => setRx({ ...rx, [f]: e.target.value })}
                  />
                ))}
                <button type="button" className="btn-primary" aria-busy={rxMut.isPending} disabled={rxMut.isPending} onClick={() => rxMut.mutate()}>
                  {t('visit.addPrescription')}
                </button>
              </>
            )}
            {appt?.visitType === 'TELEHEALTH' && visit.meetingUrl && (
              <a className="btn-secondary inline-flex" href={visit.meetingUrl} target="_blank" rel="noreferrer">
                {t('visit.joinTelehealth')}
              </a>
            )}
            <h2 className="text-h3 pt-4">{t('visit.labRequest')}</h2>
            <input
              className="input"
              placeholder={t('visit.testName')}
              value={labTest}
              onChange={(e) => setLabTest(e.target.value)}
            />
            <button
              type="button"
              className="btn-secondary"
              aria-busy={labMut.isPending}
              disabled={!labTest || labMut.isPending}
              onClick={() => labMut.mutate()}
            >
              {t('visit.createLabRequest')}
            </button>
          </div>
        </div>
      )}

      <Link href="/admin/appointments" className="btn-ghost mt-6 inline-flex">
        {t('common.back')}
      </Link>
    </AdminShell>
  );
}
