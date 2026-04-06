import { Outlet, Link, useLocation, useNavigate, useEffect } from 'react-router-dom';
import { Briefcase, Clock, CreditCard, LayoutDashboard, FileText, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);
  
  const handleLogout = async () => {
    try {
      await axios.post(`${BACKEND_URL}/api/auth/logout`, {}, {
        withCredentials: true
      });
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };
  
  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/jobs', icon: Briefcase, label: 'Jobs' },
    { path: '/hours', icon: Clock, label: 'Hours' },
    { path: '/payments', icon: CreditCard, label: 'Payments' },
    { path: '/invoices', icon: FileText, label: 'Invoices' },
  ];
  
  return (
    <div className="min-h-screen bg-[#FDFCFB]" data-testid="main-layout">
      {/* Mobile Header */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-[#EAE6DF] flex items-center justify-between px-4 md:hidden z-50">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 -ml-2 text-[#5C6B61] hover:bg-[#F5F3EE] rounded-lg transition-colors"
            data-testid="mobile-menu-button"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex items-center gap-2">
            {/* Logo Mark */}
            <div className="w-8 h-8 bg-[#344E41] rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-semibold" style={{ fontFamily: 'Outfit' }}>IT</span>
            </div>
            <h1 
              className="text-lg font-medium tracking-tight text-[#344E41]" 
              style={{ fontFamily: 'Outfit' }}
            >
              Income Tracker
            </h1>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside 
        className={`fixed left-0 top-0 h-full w-60 bg-white border-r border-[#EAE6DF] flex flex-col z-40 transform transition-transform duration-300 ease-in-out md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="p-4 border-b border-[#EAE6DF]">
          <div className="flex items-center gap-3">
            {/* Logo Mark */}
            <div className="w-9 h-9 bg-[#344E41] rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-semibold" style={{ fontFamily: 'Outfit' }}>IT</span>
            </div>
            <h1 
              className="text-xl font-medium tracking-tight text-[#344E41]" 
              style={{ fontFamily: 'Outfit' }}
              data-testid="app-title"
            >
              Income Tracker
            </h1>
          </div>
        </div>
        
        <nav className="flex-1 p-3" data-testid="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                data-testid={`nav-${item.label.toLowerCase()}`}
                className={`flex items-center gap-3 px-3 py-2.5 mb-1 text-sm font-medium rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-[#344E41] text-white shadow-sm'
                    : 'text-[#5C6B61] hover:bg-[#F5F3EE]'
                }`}
              >
                <Icon size={17} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        
        <div className="p-3 border-t border-[#EAE6DF]">
          <button
            onClick={handleLogout}
            data-testid="logout-button"
            className="flex items-center gap-3 px-3 py-2.5 w-full text-sm font-medium text-[#E07A5F] hover:bg-[#FEF6F4] rounded-lg transition-all duration-200"
          >
            <LogOut size={17} />
            Logout
          </button>
        </div>
      </aside>
      
      {/* Dark Overlay for Mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
          data-testid="sidebar-overlay"
        />
      )}
      
      {/* Main Content */}
      <main className="md:ml-60 pt-14 md:pt-0 p-4 md:p-8 min-h-screen" data-testid="main-content">
        <div className="max-w-5xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
