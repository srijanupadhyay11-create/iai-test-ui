import { useNavigate, Routes, Route, useLocation, Link } from 'react-router-dom';
import { FlaskConical, TestTube2, BarChart2, LogOut, Home, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import TestCasesTab from '../components/TestCasesTab';
import TestRunsTab from '../components/TestRunsTab';
import ExecutionDetails from '../components/ExecutionDetails';

const TABS = [
  { id: 'cases', label: 'Test Cases', icon: TestTube2, path: '/tests' },
  { id: 'runs',  label: 'Test Runs',  icon: BarChart2, path: '/tests/runs' },
];

export default function TestManagementPage() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate  = useNavigate();
  const location  = useLocation();
  const activeTab = location.pathname.startsWith('/tests/runs') ? 'runs' : 'cases';

  return (
    <div className="min-h-screen bg-cyber flex flex-col">
      {/* Top Nav */}
      <header
        className="sticky top-0 z-20"
        style={{
          background:   'var(--c-nav)',
          borderBottom: '1px solid var(--c-bd0)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: 'var(--c-sdw)',
        }}
      >
        {/* Top accent line */}
        <div
          className="h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.5), rgba(34,211,238,0.3), transparent)' }}
        />

        <div className="max-w-7xl mx-auto px-6 flex items-center h-14 gap-4">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(79,70,229,0.3), rgba(34,211,238,0.15))',
                border:     '1px solid rgba(99,102,241,0.3)',
                boxShadow:  '0 0 12px rgba(99,102,241,0.2)',
              }}
            >
              <FlaskConical className="w-4 h-4" style={{ color: '#818cf8' }} />
            </div>
            <div>
              <span className="font-bold text-sm leading-none" style={{ color: 'var(--c-t1)' }}>
                <i className="not-italic font-light">i</i>Shani
              </span>
              <span
                className="block text-xs leading-none mt-0.5 font-semibold tracking-widest"
                style={{ color: 'var(--c-t5)' }}
              >
                IAI TEST
              </span>
            </div>
          </div>

          {/* Tabs */}
          <nav className="flex items-center ml-6 h-full">
            {TABS.map(tab => {
              const Icon   = tab.icon;
              const active = activeTab === tab.id;
              return (
                <Link
                  key={tab.id}
                  to={tab.path}
                  className="relative flex items-center gap-1.5 px-4 h-full text-sm font-medium transition-all duration-200"
                  style={{ color: active ? '#818cf8' : 'var(--c-t5)' }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--c-t3)'; }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--c-t5)'; }}
                >
                  <Icon
                    className="w-4 h-4 transition-all duration-200"
                    style={{ filter: active ? 'drop-shadow(0 0 6px rgba(99,102,241,0.7))' : 'none' }}
                  />
                  {tab.label}
                  {active && (
                    <span
                      className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
                      style={{
                        background: 'linear-gradient(90deg, #6366f1, #22d3ee)',
                        boxShadow:  '0 0 8px rgba(99,102,241,0.6)',
                      }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="ml-auto flex items-center gap-3">
            {/* Home */}
            <Link
              to="/landing"
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-all duration-150"
              title="Home"
              style={{ color: 'var(--c-t5)', background: 'var(--c-surface)', border: '1px solid var(--c-bd0)' }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.color = '#818cf8';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.35)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.color = 'var(--c-t5)';
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--c-bd0)';
              }}
            >
              <Home className="w-4 h-4" />
            </Link>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-all duration-150"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              style={{ color: 'var(--c-t5)', background: 'var(--c-surface)', border: '1px solid var(--c-bd0)' }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.color = '#f59e0b';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(245,158,11,0.35)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.color = 'var(--c-t5)';
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--c-bd0)';
              }}
            >
              {theme === 'dark'
                ? <Sun className="w-4 h-4" />
                : <Moon className="w-4 h-4" />}
            </button>

            {/* User pill */}
            <div
              className="flex items-center gap-2 px-3 py-1 rounded-lg"
              style={{ background: 'var(--c-surface)', border: '1px solid var(--c-bd0)' }}
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: 'linear-gradient(135deg, #4f46e5, #6d28d9)', color: '#fff', fontSize: '0.6rem' }}
              >
                {user?.first_name?.[0]?.toUpperCase()}
              </div>
              <span className="text-xs font-medium" style={{ color: 'var(--c-t3)' }}>
                {user?.first_name} {user?.last_name}
              </span>
            </div>

            {/* Sign out */}
            <button
              onClick={() => { logout(); navigate('/'); }}
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-all duration-150"
              title="Sign out"
              style={{ color: 'var(--c-t5)', background: 'var(--c-surface)', border: '1px solid var(--c-bd0)' }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.color = '#f43f5e';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(244,63,94,0.3)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.color = 'var(--c-t5)';
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--c-bd0)';
              }}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-6">
        <Routes>
          <Route index element={<TestCasesTab />} />
          <Route path="runs" element={<TestRunsTab />} />
          <Route path="runs/:runId" element={<ExecutionDetails />} />
        </Routes>
      </main>
    </div>
  );
}
