import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FlaskConical, Download, Play, LogOut,
  CheckCircle, AlertCircle, Loader2,
  Zap, GitBranch, BarChart3, Sun, Moon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../api/client';
import ParticleBackground from '../components/ParticleBackground';

const FEATURES = [
  {
    icon: Zap,
    title: 'Real-Time Execution',
    desc: 'WebSocket-powered live streaming. Watch each test result materialize the moment it completes.',
    color: '#818cf8',
    glow: 'rgba(99,102,241,0.35)',
    bg:   'rgba(99,102,241,0.07)',
    bd:   'rgba(99,102,241,0.2)',
  },
  {
    icon: GitBranch,
    title: 'GitHub Integration',
    desc: 'One-click import from any branch. Always stay in sync with your Playwright test suite on GitHub.',
    color: '#22d3ee',
    glow: 'rgba(34,211,238,0.35)',
    bg:   'rgba(34,211,238,0.07)',
    bd:   'rgba(34,211,238,0.2)',
  },
  {
    icon: BarChart3,
    title: 'Detailed Reports',
    desc: 'Full Playwright HTML reports and trace viewer links — preserved per run for deep analysis.',
    color: '#34d399',
    glow: 'rgba(52,211,153,0.35)',
    bg:   'rgba(52,211,153,0.07)',
    bd:   'rgba(52,211,153,0.2)',
  },
];

export default function LandingPage() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  async function handleImport() {
    setImporting(true);
    setImportResult(null);
    try {
      const res = await api.tests.import();
      setImportResult({ type: 'success', message: `Successfully imported ${res.imported} test case(s) from GitHub.` });
    } catch (err: any) {
      setImportResult({ type: 'error', message: err.message || 'Import failed. Check GitHub config and connectivity.' });
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-cyber flex flex-col">
      <ParticleBackground />

      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 1 }}>
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(ellipse, rgba(99,102,241,0.07) 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-0 right-1/4 w-[500px] h-[400px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.04) 0%, transparent 70%)' }}
        />
      </div>

      {/* Nav */}
      <nav className="relative flex items-center justify-between px-8 py-4" style={{ zIndex: 10 }}>
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(79,70,229,0.28), rgba(34,211,238,0.14))',
              border:     '1px solid rgba(99,102,241,0.28)',
              boxShadow:  '0 0 14px rgba(99,102,241,0.18)',
            }}
          >
            <FlaskConical className="w-5 h-5" style={{ color: '#818cf8' }} />
          </div>
          <div>
            <span className="font-bold text-base leading-none" style={{ color: 'var(--c-t1)' }}>
              <i className="not-italic font-light">i</i>Shani
            </span>
            <span className="block text-xs leading-none mt-0.5 tracking-widest" style={{ color: 'var(--c-t5)' }}>
              IAI TEST
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm" style={{ color: 'var(--c-t3)' }}>
            Welcome,{' '}
            <span className="font-semibold" style={{ color: '#818cf8' }}>{user?.first_name}</span>
          </span>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-200"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{
              color: 'var(--c-t4)',
              background: 'var(--c-surface)',
              border: '1px solid var(--c-bd)',
              backdropFilter: 'blur(10px)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.color = '#f59e0b';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(245,158,11,0.4)';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 0 10px rgba(245,158,11,0.2)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.color = 'var(--c-t4)';
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--c-bd)';
              (e.currentTarget as HTMLElement).style.boxShadow = 'none';
            }}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            onClick={() => { logout(); navigate('/'); }}
            className="flex items-center gap-1.5 text-sm transition-all duration-150"
            style={{ color: 'var(--c-t5)' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#f43f5e')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--c-t5)')}
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div
        className="relative flex-1 flex flex-col items-center justify-center px-8 pb-12"
        style={{ zIndex: 10 }}
      >
        {/* Hero content */}
        <div
          className={`text-center max-w-2xl transition-all duration-700 ease-out
            ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          {/* Floating logo */}
          <div
            className="inline-flex items-center justify-center w-24 h-24 rounded-3xl mb-8 animate-float"
            style={{
              background: 'linear-gradient(135deg, rgba(79,70,229,0.18), rgba(34,211,238,0.1))',
              border:     '1px solid rgba(99,102,241,0.22)',
              boxShadow:  '0 0 40px rgba(99,102,241,0.2), inset 0 1px 0 rgba(255,255,255,0.04)',
            }}
          >
            <FlaskConical
              className="w-12 h-12"
              style={{ color: '#818cf8', filter: 'drop-shadow(0 0 10px rgba(99,102,241,0.8))' }}
            />
          </div>

          <h1 className="text-6xl font-extrabold tracking-tight mb-2 text-gradient">
            IAI Test
          </h1>
          <p className="text-xl font-light mb-3" style={{ color: '#4f46e5' }}>
            <i className="not-italic font-semibold" style={{ color: '#818cf8' }}>i</i>Shani Automation Intelligence
          </p>
          <p className="text-sm mb-10 max-w-md mx-auto leading-relaxed" style={{ color: 'var(--c-t5)' }}>
            Import and execute your Playwright test suite from GitHub. Monitor results in real time.
          </p>

          {/* Import result */}
          {importResult && (
            <div
              className={`flex items-start gap-3 p-4 mb-8 rounded-xl text-sm text-left`}
              style={{
                color:      importResult.type === 'success' ? '#34d399' : '#f43f5e',
                background: importResult.type === 'success' ? 'rgba(52,211,153,0.06)' : 'rgba(244,63,94,0.06)',
                border:     `1px solid ${importResult.type === 'success' ? 'rgba(52,211,153,0.22)' : 'rgba(244,63,94,0.22)'}`,
              }}
            >
              {importResult.type === 'success'
                ? <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                : <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
              <span>{importResult.message}</span>
            </div>
          )}

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleImport}
              disabled={importing}
              className="btn-primary px-8 py-3.5 text-base rounded-2xl w-full sm:w-auto"
            >
              {importing
                ? <><Loader2 className="w-5 h-5 animate-spin" /> Importing…</>
                : <><Download className="w-5 h-5" /> Import Latest</>}
            </button>
            <button
              onClick={() => navigate('/tests')}
              className="btn-secondary px-8 py-3.5 text-base rounded-2xl w-full sm:w-auto"
            >
              <Play className="w-5 h-5" /> Launch Dashboard
            </button>
          </div>

          <p className="mt-6 text-xs" style={{ color: 'var(--c-t6)' }}>
            Fetches from{' '}
            <span className="font-mono" style={{ color: 'var(--c-t5)' }}>
              srijanupadhyay11-create/playwright-automation-framework
            </span>{' '}
            · main branch
          </p>
        </div>

        {/* Feature cards */}
        <div
          className={`grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-4xl w-full mt-20
            transition-all duration-700 delay-200
            ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
        >
          {FEATURES.map(f => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="glass p-6 transition-all duration-300"
                style={{ cursor: 'default' }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.borderColor = f.bd;
                  el.style.boxShadow   = `0 0 25px ${f.glow.replace('0.35', '0.1')}, 0 4px 40px rgba(0,0,0,0.2)`;
                  el.style.transform   = 'translateY(-3px)';
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.borderColor = '';
                  el.style.boxShadow   = '';
                  el.style.transform   = 'translateY(0)';
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: f.bg, border: `1px solid ${f.bd}` }}
                >
                  <Icon
                    className="w-5 h-5"
                    style={{ color: f.color, filter: `drop-shadow(0 0 5px ${f.glow})` }}
                  />
                </div>
                <h3 className="font-semibold mb-1.5" style={{ color: 'var(--c-t1)' }}>{f.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--c-t5)' }}>{f.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
