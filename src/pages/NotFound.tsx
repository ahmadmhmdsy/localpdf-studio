import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/useI18n';

export default function NotFound() {
  const { t } = useI18n();
  return (
    <section className="container mx-auto max-w-2xl px-4 py-20 text-center" aria-labelledby="not-found-title">
      <p className="text-sm font-semibold uppercase tracking-wider text-[var(--text-3)]">404</p>
      <h1 id="not-found-title" className="mt-3 text-3xl font-bold text-[var(--text)]">
        {t('notFound.title')}
      </h1>
      <p className="mt-4 text-[var(--text-2)]">{t('notFound.body')}</p>
      <Link
        to="/"
        className="mt-8 inline-flex rounded-md bg-[var(--accent-solid)] px-4 py-2 font-semibold text-white"
      >
        {t('notFound.home')}
      </Link>
    </section>
  );
}
