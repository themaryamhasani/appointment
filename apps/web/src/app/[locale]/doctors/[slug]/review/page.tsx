'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { createReview, fetchDoctor, fetchDoctorReviews } from '@/lib/api';
import { useRouter } from '@/i18n/routing';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

export default function DoctorReviewPage() {
  const t = useTranslations();
  const params = useParams();
  const slug = String(params.slug || '');
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!user) router.push('/login');
  }, [user, router]);

  const { data: doctorRes } = useQuery({
    queryKey: ['doctor-review', slug],
    queryFn: () => fetchDoctor(slug),
    enabled: !!slug,
  });
  const doctor = doctorRes?.data;

  const { data: reviews } = useQuery({
    queryKey: ['reviews', doctor?.id],
    queryFn: () => fetchDoctorReviews(doctor.id),
    enabled: !!doctor?.id,
  });

  const mut = useMutation({
    mutationFn: () =>
      createReview(
        {
          doctorId: doctor.id,
          patientId: user?.patientId,
          rating,
          comment,
        },
        user?.accessToken,
      ),
    onSuccess: () => setDone(true),
  });

  return (
    <div className="container-narrow section-pad py-10">
      <h1 className="text-h1">{t('review.title')}</h1>
      <p className="mt-2 text-text-secondary">
        {doctor?.user?.firstName} {doctor?.user?.lastName}
      </p>
      {done ? (
        <p className="mt-6 text-success">{t('review.thanks')}</p>
      ) : (
        <div className="mt-6 card-surface max-w-lg space-y-3 p-4">
          <label className="label">{t('fields.rating')}</label>
          <select className="input" value={rating} onChange={(e) => setRating(Number(e.target.value))}>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <textarea className="input" rows={4} placeholder={t('review.comment')} value={comment} onChange={(e) => setComment(e.target.value)} />
          <button type="button" className="btn-primary" aria-busy={mut.isPending} disabled={mut.isPending} onClick={() => mut.mutate()}>
            {t('review.submit')}
          </button>
        </div>
      )}
      <ul className="mt-8 space-y-2">
        {(reviews?.data || []).map((r: any) => (
          <li key={r.id} className="card-surface p-3 text-body-sm">
            ★ {r.rating} — {r.comment || '—'}
          </li>
        ))}
      </ul>
    </div>
  );
}
