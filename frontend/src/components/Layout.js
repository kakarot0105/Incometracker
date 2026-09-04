import { useEffect, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Briefcase, Clock, CreditCard, FileText, LayoutDashboard, LogOut, Menu, X } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const navItems = [{ path: '/', icon: LayoutDashboard, label: 'Universe' }, { path: '/jobs', icon: Briefcase, label: 'Income' }, { path: '/hours', icon: Clock, label: 'Hours' }, { path: '/payments', icon: CreditCard, label: 'Payments' }, { path: '/invoices', icon: FileText, label: 'Invoices' }];

export default function Layout() {
  const { pathname } = useLocation(); const navigate = useNavigate(); const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  const logout = async () => { try { await axios.post(`${BACKEND_URL}/api/auth/logout`, {}, { withCredentials: true }); navigate('/login'); } catch { toast.error('Could not log out'); } };
  return <div className={`universe-shell ${pathname === '/' ? 'bill-shell' : ''}`} data-testid="main-layout"><header className="universe-nav"><Link to="/" className="wordmark"><i>₹</i> Track<span>My</span>Bucks</Link><button className="nav-menu" onClick={() => setOpen(!open)} aria-label="Toggle navigation">{open ? <X /> : <Menu />}</button><nav className={open ? 'nav-open' : ''}>{navItems.map(({ path, icon: Icon, label }) => <Link key={path} to={path} className={(path === pathname || (path !== '/' && pathname.startsWith(path))) ? 'active' : ''}><Icon size={15} /> {label}</Link>)}<button onClick={logout}><LogOut size={15} /> Exit</button></nav></header><main><Outlet /></main></div>;
}
