import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, FlaskConical, Zap, AlertTriangle, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../api/client';
import ParticleBackground from '../components/ParticleBackground';

export default function LoginPage() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [visible,  setVisible]  = useState(false);
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    setError('');
    try {
      const { token, user } = await api.auth.login(email.trim(), password);
      login(token, user);
      navigate('/landing');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-cyber">
      <ParticleBackground />

      {/* Ambient glow orbs */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 1 }}>
        <div className="absolute top-1/3 -left-40 w-[520px] h-[520px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 68%)' }} />
        <div className="absolute bottom-1/4 -right-40 w-[420px] h-[420px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.05) 0%, transparent 68%)' }} />
      </div>

      {/* Theme toggle — top right */}
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-200"
        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        style={{
          zIndex: 20,
          color: 'var(--c-t4)',
          background: 'var(--c-card)',
          border: '1px solid var(--c-bd)',
          backdropFilter: 'blur(12px)',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.color = '#f59e0b';
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(245,158,11,0.4)';
          (e.currentTarget as HTMLElement).style.boxShadow = '0 0 12px rgba(245,158,11,0.2)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.color = 'var(--c-t4)';
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--c-bd)';
          (e.currentTarget as HTMLElement).style.boxShadow = 'none';
        }}
      >
        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      {/* Card */}
      <div
        className={`relative w-full max-w-sm mx-4 transition-all duration-700 ease-out
          ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        style={{ zIndex: 10 }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 animate-glow-pulse"
            style={{
              background: 'linear-gradient(135deg, rgba(79,70,229,0.22), rgba(34,211,238,0.12))',
              border:     '1px solid rgba(99,102,241,0.32)',
              boxShadow:  '0 0 28px rgba(99,102,241,0.28)',
            }}
          >
            <FlaskConical
              className="w-8 h-8"
              style={{ color: '#818cf8', filter: 'drop-shadow(0 0 8px rgba(99,102,241,0.9))' }}
            />
          </div>
          <h1 className="text-4xl font-extrabold text-gradient tracking-tight">
            <i className="not-italic font-light">i</i>Shani
          </h1>
          <p className="text-xs mt-1.5 tracking-widest uppercase font-semibold" style={{ color: 'var(--c-t5)' }}>
            IAI Test Platform
          </p>
        </div>

        {/* Glass form card */}
        <div className="glass-bright p-8 relative overflow-hidden">
          {/* Top shimmer line */}
          <div
            className="absolute top-0 left-0 right-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.7), rgba(34,211,238,0.5), transparent)' }}
          />

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Email address</label>
              <input
                type="email"
                className="input-field"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  className="input-field pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors duration-150"
                  style={{ color: 'var(--c-t5)' }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#818cf8')}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--c-t5)')}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div
                className="flex items-center gap-2 p-3 rounded-xl text-xs"
                style={{
                  background: 'rgba(244,63,94,0.07)',
                  border:     '1px solid rgba(244,63,94,0.22)',
                  color:      '#f43f5e',
                }}
              >
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" className="btn-primary w-full mt-2" disabled={loading}>
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Authenticating…</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm" style={{ color: 'var(--c-t2)' }}>
            New user?{' '}
            <Link
              to="/register"
              className="font-semibold transition-colors duration-150"
              style={{ color: '#818cf8' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#22d3ee')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#818cf8')}
            >
              Create account →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
