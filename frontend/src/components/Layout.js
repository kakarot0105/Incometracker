import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Briefcase, Clock, CreditCard, LayoutDashboard, FileText, LogOut } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  
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
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-[#EAE6DF] flex flex-col">
        <div className="p-6 border-b border-[#EAE6DF]">
          <h1 
            className="text-2xl font-medium tracking-tight text-[#344E41]" 
            style={{ fontFamily: 'Outfit' }}
            data-testid="app-title"
          >
            Salary Tracker
          </h1>
        </div>
        
        <nav className="flex-1 p-4" data-testid="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                data-testid={`nav-${item.label.toLowerCase()}`}
                className={`flex items-center gap-3 px-4 py-3 mb-2 text-base font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-[#344E41] text-white'
                    : 'text-[#5C6B61] hover:bg-[#F5F3EE] hover:-translate-y-[1px]'
                }`}
              >
                <Icon size={20} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-[#EAE6DF]">
          <button
            onClick={handleLogout}
            data-testid="logout-button"
            className="flex items-center gap-3 px-4 py-3 w-full text-base font-medium text-[#E07A5F] hover:bg-[#FEF6F4] transition-all duration-200"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>
      
      {/* Main Content */}
      <main className="ml-64 p-8" data-testid="main-content">
        <Outlet />
      </main>
    </div>
  );
}
