import { useEffect, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Clock,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Sparkles,
  X,
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/jobs', icon: Briefcase, label: 'Jobs' },
  { path: '/hours', icon: Clock, label: 'Hours' },
  { path: '/payments', icon: CreditCard, label: 'Payments' },
  { path: '/invoices', icon: FileText, label: 'Invoices' },
];

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const activeItem =
    navItems.find((item) =>
      item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)
    ) || navItems[0];

  const todayLabel = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date());

  const handleLogout = async () => {
    try {
      await axios.post(
        `${BACKEND_URL}/api/auth/logout`,
        {},
        {
          withCredentials: true,
        }
      );
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  return (
    <div className="app-shell" data-testid="main-layout">
      <div className="pointer-events-none fixed inset-x-0 top-0 z-0 h-[32rem] bg-[radial-gradient(circle_at_top_right,rgba(167,239,138,0.24),transparent_34%),radial-gradient(circle_at_top_left,rgba(239,193,119,0.18),transparent_28%)]" />

      <header className="fixed left-3 right-3 top-3 z-50 flex h-16 items-center justify-between rounded-[24px] border border-border/70 bg-[rgba(252,250,245,0.86)] px-4 shadow-[0_24px_40px_-28px_rgba(18,37,29,0.45)] backdrop-blur-xl md:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen((open) => !open)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/80 text-[#355247] transition-colors hover:bg-white"
            data-testid="mobile-menu-button"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[16px] bg-[#173229] text-sm font-semibold text-white shadow-[0_18px_36px_-20px_rgba(23,50,41,0.7)]">
              IT
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-[#173229]">Income Tracker</h1>
              <p className="text-xs text-[#5a6d61]">{activeItem.label}</p>
            </div>
          </div>
        </div>

        <span className="page-eyebrow !bg-white/75 !px-3 !py-1.5 !text-[0.65rem]">
          {todayLabel}
        </span>
      </header>

      <aside
        className={`fixed bottom-3 left-3 top-3 z-40 w-[min(18rem,calc(100vw-1.5rem))] transform transition-transform duration-300 ease-out md:bottom-5 md:left-5 md:top-5 md:w-72 md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-[110%]'
        }`}
      >
        <div className="app-panel-dark flex h-full flex-col overflow-hidden rounded-[32px]">
          <div className="border-b border-white/10 px-5 pb-5 pt-6">
            <div className="page-eyebrow !border-white/10 !bg-white/10 !text-[#d8e8df]">
              Freelance Finance
            </div>

            <div className="mt-5 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#a7ef8a] text-[1rem] font-semibold text-[#173229] shadow-[0_18px_40px_-20px_rgba(167,239,138,0.8)]">
                IT
              </div>
              <div>
                <h1
                  className="text-2xl font-semibold tracking-tight text-white"
                  data-testid="app-title"
                  style={{ fontFamily: 'Outfit' }}
                >
                  Income Tracker
                </h1>
                <p className="mt-1 text-sm text-[#b7c8bf]">
                  Hours, payments, and clean reports.
                </p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-3 py-4" data-testid="sidebar-nav">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.path === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.path);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  data-testid={`nav-${item.label.toLowerCase()}`}
                  className={`mb-1.5 flex items-center gap-3 rounded-full px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-[#a7ef8a] text-[#173229] shadow-[0_18px_36px_-24px_rgba(167,239,138,0.9)]'
                      : 'text-[#d4e2db] hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon size={17} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mx-3 mb-3 rounded-[28px] border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Sparkles size={16} className="text-[#a7ef8a]" />
              {activeItem.label}
            </div>
            <p className="mt-3 text-sm leading-6 text-[#b7c8bf]">
              Stay on top of what you earned, what was paid, and what still needs attention.
            </p>
          </div>

          <div className="border-t border-white/10 p-3">
            <button
              onClick={handleLogout}
              data-testid="logout-button"
              className="flex w-full items-center gap-3 rounded-full px-4 py-3 text-sm font-semibold text-[#f6cfbf] transition-all duration-200 hover:bg-white/10 hover:text-white"
            >
              <LogOut size={17} />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-[rgba(12,20,16,0.42)] backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
          data-testid="sidebar-overlay"
        />
      )}

      <main
        className="relative z-10 min-h-screen px-4 pb-6 pt-24 md:ml-[19rem] md:px-6 md:pb-10 md:pt-10 lg:ml-[20rem]"
        data-testid="main-content"
      >
        <div className="mx-auto max-w-6xl">
          <div className="app-panel-solid mb-6 hidden items-center justify-between rounded-full px-4 py-3 md:flex">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#244437]">
              <Sparkles size={16} className="text-[#4d7a63]" />
              {activeItem.label}
            </div>
            <div className="text-sm text-[#5a6d61]">{todayLabel}</div>
          </div>

          <Outlet />
        </div>
      </main>
    </div>
  );
}
