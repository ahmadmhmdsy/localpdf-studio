import { useI18n } from '../../i18n/useI18n';

export default function Footer() {
  const { t } = useI18n();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t py-8" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
      <div className="container mx-auto px-4 text-center">
        <p className="text-sm" style={{ color: 'var(--text-3)', fontFamily: 'sans-serif' }}>
          {t('shell.footer.copyright', { year })}
        </p>
      </div>
    </footer>
  );
}
