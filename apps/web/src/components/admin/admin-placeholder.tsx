'use client';

import { useTranslations } from 'next-intl';
import { AdminShell } from '@/components/admin/admin-shell';

export default function AdminPlaceholder({
  titleKey,
}: {
  titleKey:
    | 'calendar'
    | 'appointments'
    | 'doctors'
    | 'patients'
    | 'branches'
    | 'schedules'
    | 'payments'
    | 'reports'
    | 'staff'
    | 'roles'
    | 'settings'
    | 'auditLogs';
}) {
  const t = useTranslations('admin');
  return (
    <AdminShell active={titleKey}>
      <h1 className="text-h1">{t(titleKey)}</h1>
      <p className="mt-4 text-body text-text-secondary">
        {t('operationalDescription')}
      </p>
    </AdminShell>
  );
}
