'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth';
import {
  fetchInsuranceProviders,
  fetchPatientInsurance,
  linkPatientInsurance,
  fetchClinics,
} from '@/lib/api';
import { useRouter } from '@/i18n/routing';
import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

export default function ProfileInsurancePage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [clinicId, setClinicId] = useState('');
  const [providerId, setProviderId] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');

  useEffect(() => {
    if (!user) router.push('/login');
  }, [user, router]);

  const { data: clinics } = useQuery({
    queryKey: ['ins-clinics'],
    queryFn: () => fetchClinics({ limit: '20' }),
  });

  const { data: providers } = useQuery({
    queryKey: ['ins-providers', clinicId],
    queryFn: () => fetchInsuranceProviders(clinicId),
    enabled: !!clinicId,
  });

  const { data: mine } = useQuery({
    queryKey: ['my-insurance', user?.patientId],
    queryFn: () => fetchPatientInsurance(user!.patientId!, user?.accessToken),
    enabled: !!user?.patientId,
  });

  const mut = useMutation({
    mutationFn: () =>
      linkPatientInsurance(
        {
          patientId: user?.patientId,
          providerId,
          policyNumber,
        },
        user?.accessToken,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-insurance'] }),
  });

  return (
    <div className="container-narrow section-pad py-10">
      <h1 className="text-h1">{t('insurance.title')}</h1>
      <ul className="mt-4 space-y-2">
        {(mine?.data || []).map((i: any) => (
          <li key={i.id} className="card-surface p-4">
            {locale === 'fa' ? i.provider?.nameFa : i.provider?.nameEn} · {i.policyNumber}
            {i.isPrimary ? ` (${t('insurance.primary')})` : ''}
          </li>
        ))}
      </ul>
      <div className="mt-6 card-surface max-w-lg space-y-3 p-4">
        <select className="input" value={clinicId} onChange={(e) => setClinicId(e.target.value)}>
          <option value="">{t('common.selectClinic')}</option>
          {(clinics?.data || []).map((c: any) => (
            <option key={c.id} value={c.id}>{locale === 'fa' ? c.nameFa : c.nameEn}</option>
          ))}
        </select>
        <select className="input" value={providerId} onChange={(e) => setProviderId(e.target.value)}>
          <option value="">{t('common.selectProvider')}</option>
          {(providers?.data || []).map((p: any) => (
            <option key={p.id} value={p.id}>{locale === 'fa' ? p.nameFa : p.nameEn}</option>
          ))}
        </select>
        <input className="input" placeholder={t('fields.policyNumber')} value={policyNumber} onChange={(e) => setPolicyNumber(e.target.value)} />
        <button type="button" className="btn-primary" aria-busy={mut.isPending} disabled={!providerId || !policyNumber || mut.isPending} onClick={() => mut.mutate()}>
          {t('common.save')}
        </button>
      </div>
    </div>
  );
}
