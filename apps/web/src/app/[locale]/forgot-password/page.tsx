'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { requestOtp, resetPassword } from '@/lib/api';

export default function ForgotPasswordPage() {
  const t = useTranslations();
  const [step, setStep] = useState<'phone' | 'reset'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendOtp() {
    setLoading(true);
    setError(null);
    try {
      await requestOtp({ phone, purpose: 'reset' });
      setMessage(t('auth.otpSent'));
      setStep('reset');
    } catch {
      setError(t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  async function doReset() {
    setLoading(true);
    setError(null);
    try {
      await resetPassword({ phone, code, password });
      setMessage(t('auth.passwordUpdated'));
    } catch {
      setError(t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-narrow section-pad flex justify-center py-16">
      <div className="w-full max-w-md card-surface p-8 space-y-4">
        <h1 className="text-h1">{t('auth.forgotPassword')}</h1>
        {step === 'phone' && (
          <>
            <input className="input" placeholder={t('auth.phone')} value={phone} onChange={(e) => setPhone(e.target.value)} />
            <button type="button" className="btn-primary w-full" aria-busy={loading} disabled={loading} onClick={sendOtp}>
              {t('auth.sendOtp')}
            </button>
          </>
        )}
        {step === 'reset' && (
          <>
            <input className="input" placeholder={t('auth.otpCode')} value={code} onChange={(e) => setCode(e.target.value)} />
            <input className="input" type="password" placeholder={t('auth.password')} value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="button" className="btn-primary w-full" aria-busy={loading} disabled={loading} onClick={doReset}>
              {t('auth.resetPassword')}
            </button>
          </>
        )}
        {message && <p className="text-body-sm text-success">{message}</p>}
        {error && <p className="text-body-sm text-danger">{error}</p>}
        <Link href="/login" className="btn-ghost inline-flex">
          {t('common.back')}
        </Link>
      </div>
    </div>
  );
}
