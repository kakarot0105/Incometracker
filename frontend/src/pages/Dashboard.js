import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowDownRight, ArrowUpRight, Briefcase, Download, Landmark, Orbit, Sparkles, Target, WalletCards } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const money = (value = 0) => currency.format(Number.isFinite(value) ? value : 0);

function MoneyParticles() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current; const gl = canvas?.getContext('webgl', { alpha: true, antialias: false });
    if (!gl || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const vertex = 'attribute vec2 p; attribute float s; uniform float t; varying float a; void main(){ vec2 q=p; q.x+=sin(t*.0007+p.y*9.)*.018; q.y+=cos(t*.0005+p.x*8.)*.018; gl_Position=vec4(q,0.,1.); gl_PointSize=s*(1.+sin(t*.001+p.x*18.)*.25); a=.45+sin(t*.001+p.y*14.)*.3; }';
    const fragment = 'precision mediump float; varying float a; void main(){ float d=length(gl_PointCoord-.5); gl_FragColor=vec4(.45, .96, .87, a*(1.-smoothstep(.12,.5,d))); }';
    const compile = (type, source) => { const shader = gl.createShader(type); gl.shaderSource(shader, source); gl.compileShader(shader); return shader; };
    const program = gl.createProgram(); gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex)); gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment)); gl.linkProgram(program);
    const points = new Float32Array(90 * 3); for (let i = 0; i < 90; i += 1) { points[i * 3] = Math.random() * 2 - 1; points[i * 3 + 1] = Math.random() * 2 - 1; points[i * 3 + 2] = 1.5 + Math.random() * 4.5; }
    const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, points, gl.STATIC_DRAW);
    const resize = () => { const dpr = Math.min(window.devicePixelRatio, 1.5); canvas.width = canvas.clientWidth * dpr; canvas.height = canvas.clientHeight * dpr; gl.viewport(0, 0, canvas.width, canvas.height); };
    const position = gl.getAttribLocation(program, 'p'); const size = gl.getAttribLocation(program, 's'); const time = gl.getUniformLocation(program, 't'); let frame;
    const render = (now) => { resize(); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.useProgram(program); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 12, 0); gl.enableVertexAttribArray(size); gl.vertexAttribPointer(size, 1, gl.FLOAT, false, 12, 8); gl.uniform1f(time, now); gl.drawArrays(gl.POINTS, 0, 90); frame = requestAnimationFrame(render); };
    frame = requestAnimationFrame(render); return () => cancelAnimationFrame(frame);
  }, []);
  return <canvas className="webgl-particles" ref={canvasRef} aria-hidden="true" />;
}

function OrbitingMoney() {
  return <div className="money-universe" aria-label="A visualization of your money moving through income, spending, savings, and goals"><MoneyParticles />
    <div className="universe-glow" /><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="orbit orbit-three" />
    <div className="income-pulse pulse-a" /><div className="income-pulse pulse-b" /><div className="income-pulse pulse-c" />
    <div className="currency-piece coin coin-one">₹</div><div className="currency-piece coin coin-two">₹</div><div className="currency-piece coin coin-three">₹</div>
    <div className="expense-particle particle-one" /><div className="expense-particle particle-two" /><div className="expense-particle particle-three" />
    <div className="central-account"><span>₹</span><i /></div><div className="floating-card"><span>TRACKMYBUCKS</span><b>•••• 4821</b></div>
    <div className="vault-mini"><Landmark size={22} /><small>SAFE</small></div><div className="goal-orb"><Target size={17} /></div>
  </div>;
}

export default function Dashboard() {
  const [summary, setSummary] = useState(null); const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); const [downloading, setDownloading] = useState(false); const [snapshotOpen, setSnapshotOpen] = useState(false);
  useEffect(() => { axios.get(`${BACKEND_URL}/api/dashboard/summary`, { withCredentials: true }).then(({ data }) => setSummary(data)).catch(() => toast.error('Unable to load your money universe')).finally(() => setLoading(false)); }, []);
  const downloadReport = async () => { setDownloading(true); try { const response = await axios.get(`${BACKEND_URL}/api/reports/monthly-spreadsheet?month=${selectedMonth}`, { withCredentials: true, responseType: 'blob' }); const url = window.URL.createObjectURL(new Blob([response.data])); const link = document.createElement('a'); link.href = url; link.download = `trackmybucks_${selectedMonth}.pdf`; link.click(); window.URL.revokeObjectURL(url); toast.success('Your report is ready'); } catch (error) { toast.error(error.response?.status === 404 ? 'No hours logged for this month' : 'Could not generate your report'); } finally { setDownloading(false); } };
  const earned = summary?.total_earnings ?? 0; const balance = summary?.balance ?? 0;
  return <div className="journey" data-testid="dashboard-page">
    <section className="journey-scene hero-scene"><div className="scene-copy hero-copy"><p className="scene-kicker"><Orbit size={14} /> LIVE MONEY UNIVERSE</p><h1>Know where<br />your money goes.</h1><p className="scene-lede">A living view of every rupee you earn, keep, and put to work.</p><div className="hero-actions"><Link to="/hours" className="primary-orbit-button">Start tracking <ArrowUpRight size={17} /></Link><button className="snapshot-button" onClick={() => setSnapshotOpen((open) => !open)} aria-expanded={snapshotOpen}>Your snapshot <ArrowUpRight size={16} /></button><span className="scroll-cue">SCROLL TO EXPLORE <i /></span></div>{snapshotOpen && <div className="account-snapshot"><span>RIGHT NOW</span><strong>{loading ? '—' : money(balance)}</strong><div><b>{loading ? '—' : money(earned)}<small>earned</small></b><b>{summary?.active_jobs ?? '—'}<small>active sources</small></b><b>{summary?.total_hours ?? '—'}<small>hours tracked</small></b></div></div>}</div><OrbitingMoney /><div className="corner-status"><span className="status-dot" /> Synced just now</div></section>
    <section className="journey-scene income-scene"><div className="scene-index">01 <span>INCOME</span></div><div className="scene-copy right-copy"><p className="scene-kicker"><ArrowDownRight size={14} /> INCOMING</p><h2>Every paycheque<br />finds its centre.</h2><p className="scene-lede">Income flows in. Your balance becomes clear.</p><div className="money-glass-card income-card"><span>Total earned</span><strong>{loading ? '—' : money(earned)}</strong><Link to="/jobs">See income sources <ArrowUpRight size={15} /></Link></div></div><div className="income-streams" aria-hidden="true"><i /><i /><i /><b>₹</b></div></section>
    <section className="journey-scene expense-scene"><div className="scene-copy"><p className="scene-kicker"><ArrowUpRight size={14} /> OUTGOING</p><h2>Spending takes<br />its own course.</h2><p className="scene-lede">See what leaves, without staring at a spreadsheet.</p><Link to="/payments" className="quiet-link">Explore payment activity <ArrowUpRight size={16} /></Link></div><div className="expense-routes" aria-hidden="true"><div className="route route-1" /><div className="route route-2" /><div className="route route-3" /><span className="route-dot dot-1" /><span className="route-dot dot-2" /><span className="route-dot dot-3" /></div><div className="scene-index right-index">02 <span>FLOW</span></div></section>
    <section className="journey-scene vault-scene"><div className="vault-structure" aria-hidden="true"><div className="vault-ring" /><div className="vault-door"><Landmark size={54} /><span>RESERVE</span><b>••••</b></div><div className="vault-shine" /></div><div className="scene-copy right-copy"><p className="scene-kicker"><Landmark size={14} /> PROTECTED</p><h2>What you keep<br />becomes momentum.</h2><p className="scene-lede">A clear reserve turns daily discipline into calm.</p><div className="money-glass-card vault-card"><span>Current balance</span><strong>{loading ? '—' : money(balance)}</strong><em>{balance >= 0 ? 'Growing with every move' : 'Ready for a reset'}</em></div></div><div className="scene-index">03 <span>RESERVE</span></div></section>
    <section className="journey-scene path-scene"><div className="scene-copy path-copy"><p className="scene-kicker"><WalletCards size={14} /> THE PLAN</p><h2>A budget is a path.<br />Not a prison.</h2><p className="scene-lede">Stay close to the next useful decision, then keep moving.</p><Link to="/hours" className="primary-orbit-button">Log your next move <ArrowUpRight size={17} /></Link></div><div className="light-path" aria-hidden="true"><span /><span /><span /><span /></div></section>
    <section className="journey-scene destination-scene"><div className="destination-star star-one" /><div className="destination-star star-two" /><div className="destination-star star-three" /><div className="scene-copy centred-copy"><p className="scene-kicker"><Target size={14} /> DESTINATIONS AHEAD</p><h2>Every rupee can<br />have a destination.</h2><p className="scene-lede">Build the view. Choose what’s next.</p><div className="milestone-row"><span>01<br /><b>First reserve</b></span><i /><span>02<br /><b>Clear balance</b></span><i /><span>03<br /><b>Big goal</b></span></div></div></section>
    <section className="journey-scene finale-scene"><div className="finale-orb"><Sparkles size={42} /></div><div className="scene-copy centred-copy"><p className="scene-kicker">TRACKMYBUCKS</p><h2>Take control of<br />every rupee.</h2><div className="finale-actions"><Link to="/jobs" className="primary-orbit-button">Open your tracker <ArrowUpRight size={17} /></Link><Link to="/invoices" className="quiet-link">Create an invoice</Link></div><div className="report-control"><Label htmlFor="report-month">Your monthly report</Label><div><Input id="report-month" type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} /><Button onClick={downloadReport} disabled={downloading}>{downloading ? 'Preparing' : <><Download size={15} /> Download</>}</Button></div></div></div><p className="mcp-note">MCP is enabled for secure, connected money tracking.</p></section>
  </div>;
}
