export default function Footer() {
  return (
    <footer className="mt-auto border-t py-8" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
      <div className="container mx-auto px-4 text-center">
        <p className="text-sm" style={{ color: 'var(--text-3)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          &copy; {new Date().getFullYear()} LocalPDF Studio. All processing is done locally in your browser.
        </p>
      </div>
    </footer>
  );
}