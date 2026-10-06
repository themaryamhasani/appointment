import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { HomeSearch } from '@/components/home/home-search';
import { HomeDoctors } from '@/components/home/home-doctors';
import { HomeSpecialties } from '@/components/home/home-specialties';
import { HomeClinics } from '@/components/home/home-clinics';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <>
      <section className="relative overflow-hidden border-b border-border bg-surface">
        <div
          className="hero-glow pointer-events-none absolute inset-0 opacity-60"
        />
        <div className="container-narrow section-pad relative py-14 md:py-20">
          <div className="max-w-2xl">
            <p className="mb-3 font-display text-display text-primary">{t('common.appName')}</p>
            <h1 className="text-balance text-h1 text-text-primary md:text-display">
              {t('home.heroTitle')}
            </h1>
            <p className="mt-4 max-w-xl text-body-lg text-text-secondary">
              {t('home.heroSubtitle')}
            </p>
          </div>
          <div className="mt-8">
            <HomeSearch />
          </div>
        </div>
      </section>

      <section className="container-narrow section-pad py-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-h2">{t('home.specialtiesTitle')}</h2>
            <p className="mt-1 text-body-sm text-text-muted">{t('home.specialtiesSubtitle')}</p>
          </div>
          <Link href="/specialties" className="text-body-sm text-primary hover:underline">
            {t('common.viewAll')}
          </Link>
        </div>
        <HomeSpecialties />
      </section>

      <section className="bg-surface border-y border-border">
        <div className="container-narrow section-pad py-16">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-h2">{t('home.doctorsTitle')}</h2>
              <p className="mt-1 text-body-sm text-text-muted">{t('home.doctorsSubtitle')}</p>
            </div>
            <Link href="/doctors" className="text-body-sm text-primary hover:underline">
              {t('common.viewAll')}
            </Link>
          </div>
          <HomeDoctors />
        </div>
      </section>

      <section className="container-narrow section-pad py-16">
        <div className="mb-8">
          <h2 className="text-h2">{t('home.clinicsTitle')}</h2>
          <p className="mt-1 text-body-sm text-text-muted">{t('home.clinicsSubtitle')}</p>
        </div>
        <HomeClinics />
      </section>

      <section className="bg-surface border-y border-border">
        <div className="container-narrow section-pad py-16">
          <h2 className="text-h2 mb-10">{t('home.howTitle')}</h2>
          <ol className="grid gap-8 md:grid-cols-3">
            {[t('home.how1'), t('home.how2'), t('home.how3')].map((text, i) => (
              <li key={i} className="flex gap-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-body-sm font-medium text-primary">
                  {i + 1}
                </span>
                <p className="pt-1.5 text-body text-text-secondary">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="container-narrow section-pad py-16">
        <h2 className="text-h2 mb-8">{t('home.faqTitle')}</h2>
        <div className="max-w-2xl space-y-6">
          <div>
            <h3 className="text-h3">{t('home.faq1q')}</h3>
            <p className="mt-2 text-body text-text-secondary">{t('home.faq1a')}</p>
          </div>
          <div>
            <h3 className="text-h3">{t('home.faq2q')}</h3>
            <p className="mt-2 text-body text-text-secondary">{t('home.faq2a')}</p>
          </div>
        </div>
      </section>
    </>
  );
}
