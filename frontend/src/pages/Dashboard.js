import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowDown, ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const money = (value = 0) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number.isFinite(value) ? value : 0);

function Bill() { return <div className="dashboard-bill-stage" aria-hidden="true"><div className="dashboard-dollar-bill"><div className="db-corner db-top">$</div><div className="db-corner db-bottom">$</div><div className="db-seal">TMB</div><div className="db-portrait">$</div><p>TRACKMYBUCKS<br /><small>ONE CLEAR VIEW OF YOUR MONEY</small></p><b>01</b></div></div>; }

export default function Dashboard() {
  const [summary, setSummary] = useState(null); const [open, setOpen] = useState(false); const [progress, setProgress] = useState(0);
  useEffect(() => { axios.get(`${BACKEND_URL}/api/dashboard/summary`, { withCredentials: true }).then(({ data }) => setSummary(data)).catch(() => toast.error('Unable to load your balance')); }, []);
  useEffect(() => { const update = () => setProgress(Math.min(1, window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight))); update(); window.addEventListener('scroll', update, { passive: true }); return () => window.removeEventListener('scroll', update); }, []);
  return <div className="bill-dashboard" style={{ '--dash-progress': progress }} data-testid="dashboard-page">
    <Bill />
    <section className="dash-scene dash-hero"><p>YOUR MONEY, TODAY</p><h1>Keep every<br />dollar in view.</h1><button onClick={() => setOpen(!open)} className="dash-view">{open ? 'Close your snapshot' : 'Open your snapshot'} <ArrowUpRight size={16} /></button>{open && <div className="dash-snapshot"><span>BALANCE</span><strong>{summary ? money(summary.balance) : '—'}</strong><div><b>{summary ? money(summary.total_earnings) : '—'}<small>earned</small></b><b>{summary?.active_jobs ?? '—'}<small>active jobs</small></b><b>{summary?.total_hours ?? '—'}<small>hours logged</small></b></div></div>}<span className="dash-scroll">SCROLL TO FOLLOW THE BILL <ArrowDown size={14} /></span></section>
    <section className="dash-scene dash-flow"><p>ONE BILL. EVERY MOVE.</p><h2>Earn it.<br />Track it.<br />Keep it.</h2><Link to="/hours">Log hours <ArrowUpRight size={15} /></Link></section>
    <section className="dash-scene dash-close"><p>TRACKMYBUCKS</p><h2>Take control of<br />every dollar.</h2><div><Link to="/jobs">Income <ArrowUpRight size={15} /></Link><Link to="/payments">Payments <ArrowUpRight size={15} /></Link><Link to="/invoices">Invoices <ArrowUpRight size={15} /></Link></div><small>MCP enabled · secure connected tracking</small></section>
  </div>;
}
