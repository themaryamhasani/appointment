'use client';

import { useMutation } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useAuthStore } from '@/stores/auth';
import { joinWaitingList, fetchDoctors } from '@/lib/api';
import { useRouter } from '@/i18n/routing';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { doctorDisplayName } from '@/lib/utils';

export default function WaitingListPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [doctorId, setDoctorId] = useState('');
  const [notes, setNotes] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!user) router.push('/login');
  }, [user, router]);

  const { data: doctors } = useQuery({
    queryKey: ['wl-doctors'],
    queryFn: () => fetchDoctors({ limit: '50' }),
  });

  const mut = useMutation({
    mutationFn: () => {
      const doctor = (doctors?.data || []).find((d: any) => d.id === doctorId);
      const clinicId =
        doctor?.branches?.[0]?.branch?.clinicId ||
        doctor?.branches?.[0]?.branch?.clinic?.id ||
        doctor?.clinicId;
      const patientId = user?.patientId;
      if (!clinicId || !patientId) throw new Error(t('waiting.missingProfile'));
      return joinWaitingList(
        { clinicId, doctorId, patientId, notes },
        user?.accessToken,
      );
    },
    onSuccess: () => setDone(true),
  });

  return (
    <div className="container-narrow section-pad py-10">
      <h1 className="text-h1">{t('admin.waitingList')}</h1>
      <p className="mt-2 text-text-secondary">{t('waiting.description')}</p>
      {done ? (
        <p className="mt-6 text-success">{t('waiting.success')}</p>
      ) : (
        <div className="mt-6 card-surface max-w-lg space-y-3 p-4">
          <select className="input" value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
            <option value="">{t('common.selectDoctor')}</option>
            {(doctors?.data || []).map((d: any) => (
              <option key={d.id} value={d.id}>
                {doctorDisplayName(d, locale)}
              </option>
            ))}
          </select>
          <textarea className="input" rows={3} placeholder={t('fields.notes')} value={notes} onChange={(e) => setNotes(e.target.value)} />
          {mut.isError && <p className="text-body-sm text-danger">{t('common.error')}</p>}
          <button type="button" className="btn-primary" aria-busy={mut.isPending} disabled={!doctorId || mut.isPending} onClick={() => mut.mutate()}>
            {t('waiting.join')}
          </button>
        </div>
      )}
    </div>
  );
}
