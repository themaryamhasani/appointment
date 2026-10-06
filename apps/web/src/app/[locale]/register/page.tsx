'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocale, useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import { register as registerApi, login } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useState } from 'react';

const schema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

type Form = z.infer<typeof schema>;

export default function RegisterPage() {
  const t = useTranslations();
  const locale = useLocale();
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
      await registerApi({ ...values, locale });
      const res = await login({ email: values.email, password: values.password });
      setUser({ ...res.data.user, accessToken: res.data.accessToken });
      router.push('/appointments');
    } catch {
      setError(t('common.error'));
    }
  }

  return (
    <div className="container-narrow section-pad flex justify-center py-16">
      <div className="w-full max-w-md card-surface p-8">
        <h1 className="text-h1">{t('auth.registerTitle')}</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">{t('auth.firstName')}</label>
              <input className="input" {...register('firstName')} />
            </div>
            <div>
              <label className="label">{t('auth.lastName')}</label>
              <input className="input" {...register('lastName')} />
            </div>
          </div>
          <div>
            <label className="label">{t('auth.email')}</label>
            <input type="email" className="input" {...register('email')} />
          </div>
          <div>
            <label className="label">{t('auth.password')}</label>
            <input type="password" className="input" {...register('password')} />
          </div>
          {error && <p className="text-body-sm text-danger">{error}</p>}
          <button type="submit" className="btn-primary w-full" aria-busy={isSubmitting} disabled={isSubmitting}>
            {t('auth.registerCta')}
          </button>
        </form>
        <p className="mt-6 text-center text-body-sm text-text-muted">
          {t('auth.hasAccount')}{' '}
          <Link href="/login" className="text-primary hover:underline">
            {t('common.login')}
          </Link>
        </p>
      </div>
    </div>
  );
}
