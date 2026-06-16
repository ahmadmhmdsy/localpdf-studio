import { Link } from 'react-router-dom';
import { FileText, Moon, Sun } from 'lucide-react';
import { useToolsStore } from '../../store';

export default function Header() {
  const darkMode = useToolsStore((s) => s.darkMode);
  const toggleDarkMode = useToolsStore((s) => s.toggleDarkMode);

  return (
    <header className="sticky top-0 z-50 w-full border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: 'var(--accent)' }}>
            <FileText size={18} className="text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight" style={{ color: 'var(--text)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            LocalPDF Studio
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-5">
          <Link
            to="/editor"
            className="text-sm font-semibold px-3.5 py-1.5 rounded-md transition-colors"
            style={{ color: 'var(--accent)', background: 'var(--accent-dim)' }}
          >
            Visual Editor
          </Link>
          <Link to="/tools/merge-pdf" className="text-sm font-medium transition-colors" style={{ color: 'var(--text-2)' }}>
            Merge PDF
          </Link>
          <Link to="/tools/split-pdf" className="text-sm font-medium transition-colors" style={{ color: 'var(--text-2)' }}>
            Split PDF
          </Link>
          <Link to="/tools/pdf-to-jpg" className="text-sm font-medium transition-colors" style={{ color: 'var(--text-2)' }}>
            PDF to JPG
          </Link>
          <Link to="/tools/jpg-to-pdf" className="text-sm font-medium transition-colors" style={{ color: 'var(--text-2)' }}>
            JPG to PDF
          </Link>
          <Link to="/" className="text-sm font-medium transition-colors" style={{ color: 'var(--accent)' }}>
            All PDF Tools
          </Link>
          <button
            onClick={toggleDarkMode}
            className="ml-2 flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
            style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </nav>
      </div>
    </header>
  );
}