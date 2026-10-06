'use client';

import { useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useAuthStore } from '@/stores/auth';
import { fetchAuditLogs } from '@/lib/api';
import { AdminShell, useAdminClinicId } from '@/components/admin/admin-shell';
import { useRouter } from '@/i18n/routing';
import { useEffect } from 'react';
import { formatDateTime } from '@/lib/utils';

export default function AdminAuditPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clinicId = useAdminClinicId();

  useEffect(() => {
    if (!user) router.push('/login');
  }, [user, router]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-audit', clinicId],
    queryFn: () =>
      fetchAuditLogs({ clinicId: clinicId!, limit: '50' }, user?.accessToken),
    enabled: !!user && !!clinicId,
  });

  return (
    <AdminShell active="auditLogs">
      <h1 className="text-h1">{t('admin.auditLogs')}</h1>
      {isLoading && <div className="mt-6 skeleton h-40" />}
      <ul className="mt-6 space-y-2">
        {(data?.data || []).map((log: any) => (
          <li key={log.id} className="card-surface px-4 py-3 text-body-sm">
            <div className="flex justify-between gap-3">
              <span className="font-medium">
                {t.has(`audit.actions.${log.action}`)
                  ? t(`audit.actions.${log.action}` as any)
                  : t('audit.unknownAction')}
              </span>
              <span className="text-text-muted">{formatDateTime(log.createdAt, locale)}</span>
            </div>
            <p className="text-caption text-text-secondary mt-1">
              {t.has(`audit.entities.${log.entity}`)
                ? t(`audit.entities.${log.entity}` as any)
                : t('audit.unknownEntity')}{' '}
              {log.entityId} · {log.actor?.firstName} {log.actor?.lastName}
            </p>
          </li>
        ))}
      </ul>
    </AdminShell>
  );
}
