'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import { login } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useState } from 'react';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

type Form = z.infer<typeof schema>;

export default function LoginPage() {
  const t = useTranslations();
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  async function onSubmit(values: Form) {
    setError(null);
    try {
      const res = await login(values);
      setUser({ ...res.data.user, accessToken: res.data.accessToken });
      const isStaff = res.data.user.roles?.some((r: string) =>
        ['SUPER_ADMIN', 'CLINIC_ADMIN', 'SECRETARY', 'DOCTOR', 'FINANCE'].includes(r),
      );
      router.push(isStaff ? '/admin/dashboard' : '/appointments');
    } catch {
      setError(t('common.error'));
    }
  }

  return (
    <div className="container-narrow section-pad flex justify-center py-16">
      <div className="w-full max-w-md card-surface p-8">
        <h1 className="text-h1">{t('auth.loginTitle')}</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
          <div>
            <label className="label" htmlFor="email">
              {t('auth.email')}
            </label>
            <input id="email" type="email" className="input" autoComplete="email" {...register('email')} />
          </div>
          <div>
            <label className="label" htmlFor="password">
              {t('auth.password')}
            </label>
            <input
              id="password"
              type="password"
              className="input"
              autoComplete="current-password"
              {...register('password')}
            />
          </div>
          {error && <p className="text-body-sm text-danger">{error}</p>}
          <button type="submit" className="btn-primary w-full" aria-busy={isSubmitting} disabled={isSubmitting}>
            {t('auth.loginCta')}
          </button>
        </form>
        <p className="mt-6 text-center text-body-sm text-text-muted">
          {t('auth.noAccount')}{' '}
          <Link href="/register" className="text-primary hover:underline">
            {t('common.register')}
          </Link>
        </p>
        <p className="mt-4 text-center text-caption text-text-muted">
          {t('auth.demoCredentials')}
        </p>
      </div>
    </div>
  );
}
