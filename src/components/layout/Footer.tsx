export default function Footer() {
  return (
    <footer className="mt-auto border-t py-8" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
      <div className="container mx-auto px-4 text-center">
        <p className="text-sm" style={{ color: 'var(--text-3)', fontFamily: 'sans-serif' }}>
          &copy; {new Date().getFullYear()} LocalPDF Studio. Most tools are processed in your browser; AI, OCR, and camera tools are unavailable in the public beta and send nothing.
        </p>
      </div>
    </footer>
  );
}