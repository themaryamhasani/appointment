'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/stores/auth';
import { fetchLabRequests, updateLabRequestStatus } from '@/lib/api';
import { AdminShell, useAdminClinicId } from '@/components/admin/admin-shell';
import { useRouter } from '@/i18n/routing';
import { useEffect } from 'react';

export default function AdminLabRequestsPage() {
  const t = useTranslations();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clinicId = useAdminClinicId();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user) router.push('/login');
  }, [user, router]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-labs', clinicId],
    queryFn: () => fetchLabRequests({ clinicId: clinicId! }, user?.accessToken),
    enabled: !!user && !!clinicId,
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateLabRequestStatus(id, status, user?.accessToken),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-labs'] }),
  });

  return (
    <AdminShell active="labRequests">
      <h1 className="text-h1">{t('admin.labRequests')}</h1>
      {isLoading && <div className="mt-6 skeleton h-40" />}
      <ul className="mt-6 space-y-2">
        {(data?.data || []).map((lab: any) => (
          <li key={lab.id} className="card-surface p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">
                  {lab.patient?.user?.firstName} {lab.patient?.user?.lastName}
                </p>
                <p className="text-body-sm text-text-muted">{t(`lab.status.${lab.status}` as any)}</p>
                <ul className="mt-2 text-body-sm">
                  {(lab.items || []).map((i: any) => (
                    <li key={i.id}>• {i.testName}</li>
                  ))}
                </ul>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-secondary"
                  aria-busy={statusMut.isPending && statusMut.variables?.id === lab.id}
                  disabled={statusMut.isPending}
                  onClick={() => statusMut.mutate({ id: lab.id, status: 'IN_PROGRESS' })}
                >
                  {t('lab.inProgress')}
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  aria-busy={statusMut.isPending && statusMut.variables?.id === lab.id}
                  disabled={statusMut.isPending}
                  onClick={() => statusMut.mutate({ id: lab.id, status: 'COMPLETED' })}
                >
                  {t('lab.complete')}
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </AdminShell>
  );
}
