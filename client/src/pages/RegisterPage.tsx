import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FlaskConical, CheckCircle, AlertCircle, ChevronLeft, UserPlus } from 'lucide-react';
import { api } from '../api/client';
import ParticleBackground from '../components/ParticleBackground';

interface FormData {
  first_name: string; last_name: string; email: string;
  country_code: string; phone_number: string; dob: string;
  organisation: string; password: string; confirm_password: string;
}

const INITIAL: FormData = {
  first_name: '', last_name: '', email: '', country_code: '+1',
  phone_number: '', dob: '', organisation: '', password: '', confirm_password: '',
};

const COUNTRY_CODES = [
  { code: '+1',  label: '🇺🇸 +1 (US)' },
  { code: '+44', label: '🇬🇧 +44 (UK)' },
  { code: '+91', label: '🇮🇳 +91 (India)' },
  { code: '+61', label: '🇦🇺 +61 (Australia)' },
  { code: '+49', label: '🇩🇪 +49 (Germany)' },
  { code: '+33', label: '🇫🇷 +33 (France)' },
  { code: '+81', label: '🇯🇵 +81 (Japan)' },
  { code: '+86', label: '🇨🇳 +86 (China)' },
  { code: '+55', label: '🇧🇷 +55 (Brazil)' },
  { code: '+27', label: '🇿🇦 +27 (South Africa)' },
];

export default function RegisterPage() {
  const [form,    setForm]    = useState<FormData>(INITIAL);
  const [errors,  setErrors]  = useState<Partial<Record<keyof FormData | 'global', string>>>({});
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  function set(field: keyof FormData, value: string) {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: undefined }));
  }

  function validate(): boolean {
    const e: typeof errors = {};
    if (!form.first_name.trim()) e.first_name = 'First name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.phone_number.trim()) e.phone_number = 'Phone number is required';
    else if (!/^\d{10}$/.test(form.phone_number.replace(/\s/g, ''))) e.phone_number = 'Enter a valid 10-digit number';
    if (!form.dob) e.dob = 'Date of birth is required';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 6) e.password = 'Password must be at least 6 characters';
    if (form.password !== form.confirm_password) e.confirm_password = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function isSubmitDisabled() {
    return !form.first_name || !form.email || !form.phone_number || !form.dob || !form.password || !form.confirm_password;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await api.auth.register({
        first_name: form.first_name, last_name: form.last_name,
        email: form.email, phone: `${form.country_code}${form.phone_number}`,
        dob: form.dob, organisation: form.organisation, password: form.password,
      });
      setSuccess(true);
    } catch (err: any) {
      setErrors({ global: err.message });
    } finally {
      setLoading(false);
    }
  }

  function handleReset() { setForm(INITIAL); setErrors({}); setSuccess(false); }

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-cyber py-8 px-4">
      <ParticleBackground />

      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 1 }}>
        <div className="absolute top-1/4 -left-40 w-[500px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 right-1/3 w-[400px] h-[400px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.05) 0%, transparent 70%)' }} />
      </div>

      <div className="relative w-full max-w-lg" style={{ zIndex: 10 }}>
        {/* Logo */}
        <div className="text-center mb-6">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3"
            style={{
              background: 'linear-gradient(135deg, rgba(79,70,229,0.22), rgba(34,211,238,0.12))',
              border:     '1px solid rgba(99,102,241,0.32)',
              boxShadow:  '0 0 22px rgba(99,102,241,0.25)',
            }}
          >
            <FlaskConical className="w-7 h-7" style={{ color: '#818cf8', filter: 'drop-shadow(0 0 7px rgba(99,102,241,0.9))' }} />
          </div>
          <h1 className="text-3xl font-extrabold text-gradient tracking-tight">
            <i className="not-italic font-light">i</i>Shani
          </h1>
          <p className="text-xs mt-1 tracking-widest uppercase font-semibold" style={{ color: '#1e3a5f' }}>
            IAI Test Platform
          </p>
        </div>

        {/* Form card */}
        <div className="glass-bright p-8 relative overflow-hidden">
          {/* Top shimmer */}
          <div className="absolute top-0 left-0 right-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.7), rgba(167,139,250,0.5), transparent)' }} />

          <div className="flex items-center gap-2.5 mb-6">
            <Link
              to="/"
              className="w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-150"
              style={{ color: '#1e3a5f', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(99,102,241,0.15)' }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.color = '#818cf8';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.4)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.color = '#1e3a5f';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.15)';
              }}
            >
              <ChevronLeft className="w-4 h-4" />
            </Link>
            <div>
              <h2 className="text-base font-semibold text-slate-200">Create your account</h2>
              <p className="text-xs" style={{ color: '#1e3a5f' }}>Join the iShani platform</p>
            </div>
          </div>

          {success && (
            <div
              className="flex items-start gap-3 p-4 mb-5 rounded-xl text-sm"
              style={{ background: 'rgba(52,211,153,0.07)', border: '1px solid rgba(52,211,153,0.22)', color: '#34d399' }}
            >
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Registration successful!</strong>{' '}
                <Link to="/" className="underline font-medium">Sign in here</Link>
              </span>
            </div>
          )}

          {errors.global && (
            <div
              className="flex items-center gap-2.5 p-3 mb-5 rounded-xl text-sm"
              style={{ background: 'rgba(244,63,94,0.07)', border: '1px solid rgba(244,63,94,0.22)', color: '#f43f5e' }}
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {errors.global}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">First Name <span style={{ color: '#f43f5e' }}>*</span></label>
                <input
                  className={`input-field ${errors.first_name ? 'has-error' : ''}`}
                  placeholder="Jane"
                  value={form.first_name}
                  onChange={e => set('first_name', e.target.value)}
                />
                {errors.first_name && <p className="error-text">{errors.first_name}</p>}
              </div>
              <div>
                <label className="label">Last Name</label>
                <input
                  className="input-field"
                  placeholder="Doe"
                  value={form.last_name}
                  onChange={e => set('last_name', e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="label">Email <span style={{ color: '#f43f5e' }}>*</span></label>
              <input
                type="email"
                className={`input-field ${errors.email ? 'has-error' : ''}`}
                placeholder="jane@example.com"
                value={form.email}
                onChange={e => set('email', e.target.value)}
              />
              {errors.email && <p className="error-text">{errors.email}</p>}
            </div>

            <div>
              <label className="label">Phone Number <span style={{ color: '#f43f5e' }}>*</span></label>
              <div className="flex gap-2">
                <select
                  className="input-field w-44 flex-shrink-0"
                  value={form.country_code}
                  onChange={e => set('country_code', e.target.value)}
                >
                  {COUNTRY_CODES.map(c => (
                    <option key={c.code} value={c.code}>{c.label}</option>
                  ))}
                </select>
                <input
                  type="tel"
                  className={`input-field flex-1 ${errors.phone_number ? 'has-error' : ''}`}
                  placeholder="10-digit number"
                  maxLength={10}
                  value={form.phone_number}
                  onChange={e => set('phone_number', e.target.value.replace(/\D/g, ''))}
                />
              </div>
              {errors.phone_number && <p className="error-text">{errors.phone_number}</p>}
            </div>

            <div>
              <label className="label">Date of Birth <span style={{ color: '#f43f5e' }}>*</span></label>
              <input
                type="date"
                className={`input-field ${errors.dob ? 'has-error' : ''}`}
                max={today}
                value={form.dob}
                onChange={e => set('dob', e.target.value)}
              />
              {errors.dob && <p className="error-text">{errors.dob}</p>}
            </div>

            <div>
              <label className="label">Organisation</label>
              <input
                className="input-field"
                placeholder="Company or organisation name"
                value={form.organisation}
                onChange={e => set('organisation', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Password <span style={{ color: '#f43f5e' }}>*</span></label>
                <input
                  type="password"
                  className={`input-field ${errors.password ? 'has-error' : ''}`}
                  placeholder="Min 6 characters"
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                />
                {errors.password && <p className="error-text">{errors.password}</p>}
              </div>
              <div>
                <label className="label">Confirm Password <span style={{ color: '#f43f5e' }}>*</span></label>
                <input
                  type="password"
                  className={`input-field ${errors.confirm_password ? 'has-error' : ''}`}
                  placeholder="Repeat password"
                  value={form.confirm_password}
                  onChange={e => set('confirm_password', e.target.value)}
                />
                {errors.confirm_password && <p className="error-text">{errors.confirm_password}</p>}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="btn-primary flex-1 py-2.5"
                disabled={loading || isSubmitDisabled()}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Registering…
                  </>
                ) : (
                  <><UserPlus className="w-4 h-4" /> Register</>
                )}
              </button>
              <button type="button" className="btn-secondary px-6" onClick={handleReset}>
                Reset
              </button>
            </div>
          </form>

          <p className="mt-5 text-center text-sm" style={{ color: '#1e293b' }}>
            Already have an account?{' '}
            <Link
              to="/"
              className="font-semibold transition-colors duration-150"
              style={{ color: '#818cf8' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#22d3ee')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#818cf8')}
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
