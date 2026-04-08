import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Briefcase,
  Clock,
  DollarSign,
  Download,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const hourFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function formatCurrency(value = 0) {
  return currencyFormatter.format(Number.isFinite(value) ? value : 0);
}

function formatHours(value = 0) {
  return hourFormatter.format(Number.isFinite(value) ? value : 0);
}

function formatAxisCurrency(value) {
  if (Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(Math.abs(value) >= 10000 ? 0 : 1)}k`;
  }
  return `$${value}`;
}

function SkeletonCard({ className }) {
  return (
    <div className={cn('app-panel-solid overflow-hidden rounded-[28px] p-6', className)}>
      <div className="mb-6 flex items-start justify-between">
        <div className="h-10 w-10 rounded-[16px] bg-[#e8e1d6] animate-pulse" />
      </div>
      <div className="space-y-3">
        <div className="h-3 w-28 rounded-full bg-[#e8e1d6] animate-pulse" />
        <div className="h-10 w-44 rounded-full bg-[#e8e1d6] animate-pulse" />
        <div className="h-3 w-36 rounded-full bg-[#efe7da] animate-pulse" />
      </div>
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="app-panel-solid rounded-[32px] p-6 md:p-8">
      <div className="mb-6 h-5 w-32 rounded-full bg-[#e8e1d6] animate-pulse" />
      <div className="data-soft-grid h-[320px] rounded-[28px] bg-[#fbf7f0]" />
    </div>
  );
}

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [exportMode, setExportMode] = useState('month'); // 'month' or 'range'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/dashboard/summary`, {
        withCredentials: true,
      });
      setSummary(response.data);
    } catch (error) {
      console.error('Failed to fetch summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadMonthlyReport = async () => {
    if (exportMode === 'range' && (!startDate || !endDate)) {
      toast.error('Please select both start and end dates');
      return;
    }

    setDownloadingPdf(true);
    try {
      const qs = exportMode === 'month'
        ? `?month=${selectedMonth}`
        : `?start_date=${startDate}&end_date=${endDate}`;

      const response = await axios.get(
        `${BACKEND_URL}/api/reports/monthly-spreadsheet${qs}`,
        {
          withCredentials: true,
          responseType: 'blob',
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      let filename = 'timesheet.pdf';
      if (exportMode === 'month') {
        const monthName = new Date(`${selectedMonth}-01T12:00:00`).toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric',
        });
        filename = `timesheet_${monthName.replace(' ', '_')}.pdf`;
      } else {
        filename = `timesheet_${startDate}_to_${endDate}.pdf`;
      }

      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Timesheet downloaded');
    } catch (error) {
      console.error('Failed to download report:', error);
      if (error.response?.status === 404) {
        toast.error('No hours logged for this month');
      } else {
        toast.error('Failed to generate report');
      }
    } finally {
      setDownloadingPdf(false);
    }
  };

  const selectedMonthLabel = new Date(`${selectedMonth}-01T12:00:00`).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
  const balanceValue = summary?.balance ?? 0;
  const balancePositive = balanceValue >= 0;

  const metrics = [
    {
      icon: DollarSign,
      label: 'Total earnings',
      value: formatCurrency(summary?.total_earnings),
      detail: 'Across all logged work',
      featured: true,
      span: 'xl:col-span-5',
      testId: 'metric-earnings',
    },
    {
      icon: balancePositive ? TrendingUp : TrendingDown,
      label: 'Balance',
      value: formatCurrency(balanceValue),
      detail: balancePositive ? 'Still outstanding to you' : 'Payments ahead of earnings',
      tone: balancePositive ? 'fresh' : 'warm',
      span: 'xl:col-span-3',
      testId: 'metric-balance',
    },
    {
      icon: DollarSign,
      label: 'Payments received',
      value: formatCurrency(summary?.payments_received),
      detail: 'Money already collected',
      tone: 'default',
      span: 'xl:col-span-4',
      testId: 'metric-payments',
    },
    {
      icon: Clock,
      label: 'Tracked hours',
      value: `${formatHours(summary?.total_hours)} hrs`,
      detail: 'Logged across all jobs',
      tone: 'default',
      span: 'xl:col-span-6',
      testId: 'metric-hours',
    },
    {
      icon: Briefcase,
      label: 'Active jobs',
      value: summary?.active_jobs || 0,
      detail: summary?.active_jobs ? 'Current client engagements' : 'Ready for your first client',
      tone: 'soft',
      span: 'xl:col-span-6',
      testId: 'metric-jobs',
    },
  ];

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      <section className="app-panel-solid relative overflow-hidden rounded-[32px] px-6 py-7 md:px-8 md:py-8">
        <div className="pointer-events-none absolute -right-10 top-0 h-40 w-40 rounded-full bg-[rgba(167,239,138,0.22)] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-0 h-40 w-40 rounded-full bg-[rgba(239,193,119,0.18)] blur-3xl" />

        <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <div className="page-eyebrow">Freelance Finance Cockpit</div>
            <h1 className="page-title mt-4">Dashboard</h1>
            <p className="page-subtitle mt-3 max-w-xl">
              A quick read on what you have earned, what has been paid, and what still needs
              attention.
            </p>

            {!loading && (
              <div className="mt-5 flex flex-wrap gap-3">
                <span className="status-chip status-chip-positive">
                  <Briefcase size={14} />
                  {summary?.active_jobs
                    ? `${summary.active_jobs} active job${summary.active_jobs !== 1 ? 's' : ''}`
                    : 'Ready for your first client'}
                </span>
                <span
                  className={cn(
                    'status-chip',
                    balancePositive ? 'status-chip-neutral' : 'status-chip-warm'
                  )}
                >
                  {balancePositive
                    ? `${formatCurrency(balanceValue)} outstanding`
                    : 'Payments currently ahead'}
                </span>
              </div>
            )}
          </div>

          <div className="w-full max-w-md rounded-[28px] border border-border/80 bg-white/70 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.86)] backdrop-blur-xl">
            <div className="flex items-center justify-between mb-2">
              <p className="page-eyebrow !bg-white/75 !mb-0">Export Timesheet</p>
              <div className="flex bg-white/50 backdrop-blur-md border border-black/5 rounded-full p-1 shadow-sm">
                <button
                  onClick={() => setExportMode('month')}
                  className={cn("text-[11px] font-medium px-3 py-1 rounded-full transition-all duration-200", exportMode === 'month' ? "bg-[#061b31] text-white shadow-md" : "text-[#5a6d61] hover:text-[#061b31]")}
                >By Month</button>
                <button
                  onClick={() => setExportMode('range')}
                  className={cn("text-[11px] font-medium px-3 py-1 rounded-full transition-all duration-200", exportMode === 'range' ? "bg-[#061b31] text-white shadow-md" : "text-[#5a6d61] hover:text-[#061b31]")}
                >Custom Range</button>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              {exportMode === 'month' ? (
                <div className="flex-1">
                  <Label htmlFor="month_selector" className="text-sm font-semibold text-[#4c6154]">Month</Label>
                  <Input
                    id="month_selector"
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="mt-2"
                  />
                </div>
              ) : (
                <div className="flex-1 flex gap-2">
                  <div className="flex-1">
                    <Label className="text-xs font-semibold text-[#4c6154]">Start</Label>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1 h-9 text-sm" />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs font-semibold text-[#4c6154]">End</Label>
                    <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1 h-9 text-sm" />
                  </div>
                </div>
              )}

              <Button
                onClick={handleDownloadMonthlyReport}
                disabled={downloadingPdf || (exportMode === 'range' && (!startDate || !endDate))}
                className="h-11 px-5 sm:w-auto"
              >
                {downloadingPdf ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Preparing...
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    Export
                  </>
                )}
              </Button>
            </div>
            <p className="mt-3 text-xs leading-5 text-[#5a6d61]">
              Generate a polished PDF breaking down hours, payments, and balance owed.
            </p>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-12">
          <SkeletonCard className="xl:col-span-5" />
          <SkeletonCard className="xl:col-span-3" />
          <SkeletonCard className="xl:col-span-4" />
          <SkeletonCard className="xl:col-span-6" />
          <SkeletonCard className="xl:col-span-6" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-12">
          {metrics.map((metric) => {
            const Icon = metric.icon;

            return (
              <article
                key={metric.label}
                data-testid={metric.testId}
                className={cn(
                  'relative overflow-hidden rounded-[30px] border p-5 md:p-6',
                  metric.span,
                  metric.featured
                    ? 'border-transparent bg-[linear-gradient(135deg,#173229,#23483b)] text-white shadow-[0_32px_80px_-36px_rgba(23,50,41,0.75)]'
                    : 'app-panel-solid'
                )}
              >
                {metric.featured && (
                  <div className="pointer-events-none absolute -right-10 top-0 h-32 w-32 rounded-full bg-white/10 blur-3xl" />
                )}

                <div className="relative z-10 flex items-start justify-between gap-4">
                  <div>
                    <p
                      className={cn(
                        'text-xs font-semibold uppercase tracking-[0.18em]',
                        metric.featured ? 'text-white/72' : 'text-[#607166]'
                      )}
                    >
                      {metric.label}
                    </p>
                    <p
                      className={cn(
                        'metric-value mt-4',
                        metric.featured ? 'text-white' : 'text-[#173229]'
                      )}
                    >
                      {metric.value}
                    </p>
                    <p
                      className={cn(
                        'mt-3 max-w-[18rem] text-sm leading-6',
                        metric.featured ? 'text-white/70' : 'text-[#5a6d61]'
                      )}
                    >
                      {metric.detail}
                    </p>
                  </div>

                  <div
                    className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-[16px]',
                      metric.featured
                        ? 'bg-white/10 text-white'
                        : metric.tone === 'fresh'
                          ? 'bg-[#a7ef8a]/35 text-[#1d4427]'
                          : metric.tone === 'warm'
                            ? 'bg-[#f3c5b7]/45 text-[#8a4d36]'
                            : 'bg-[#173229]/8 text-[#173229]'
                    )}
                  >
                    <Icon size={20} />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {loading ? (
        <SkeletonChart />
      ) : summary?.job_breakdown && summary.job_breakdown.length > 0 ? (
        <section
          className="app-panel-solid rounded-[32px] p-6 md:p-8"
          data-testid="job-breakdown-chart"
        >
          <div className="flex flex-col gap-4 border-b border-border/70 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="page-eyebrow">Revenue Mix</div>
              <h2
                className="mt-4 text-3xl font-semibold tracking-tight text-[#173229]"
                style={{ fontFamily: 'Outfit' }}
              >
                Earnings by job
              </h2>
              <p className="mt-2 text-sm leading-7 text-[#5a6d61]">
                See which engagements are carrying the month and where your workload is landing.
              </p>
            </div>

            <span className="status-chip status-chip-neutral">{selectedMonthLabel}</span>
          </div>

          <div className="mt-6 h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={summary.job_breakdown}
                margin={{ top: 12, right: 12, left: -12, bottom: 0 }}
              >
                <CartesianGrid vertical={false} stroke="rgba(24,54,45,0.08)" />
                <XAxis
                  dataKey="job_name"
                  tick={{ fill: '#607166', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#607166', fontSize: 12 }}
                  tickFormatter={formatAxisCurrency}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(167,239,138,0.12)' }}
                  contentStyle={{
                    backgroundColor: 'rgba(255,255,255,0.96)',
                    border: '1px solid rgba(46,70,56,0.12)',
                    borderRadius: '20px',
                    boxShadow: '0 24px 60px -32px rgba(18,37,29,0.35)',
                    backdropFilter: 'blur(14px)',
                  }}
                  labelStyle={{ color: '#173229', fontWeight: 600 }}
                  formatter={(value) => [formatCurrency(Number(value)), 'Earnings']}
                />
                <Bar dataKey="earnings" fill="#173229" radius={[12, 12, 4, 4]} maxBarSize={56} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      ) : (
        <section className="app-panel-solid rounded-[32px] p-12 text-center" data-testid="empty-state">
          <div className="mx-auto max-w-md">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#a7ef8a]/25 text-[#173229]">
              <Briefcase size={28} />
            </div>
            <h3
              className="mt-6 text-3xl font-semibold tracking-tight text-[#173229]"
              style={{ fontFamily: 'Outfit' }}
            >
              No jobs yet
            </h3>
            <p className="mt-3 text-base leading-7 text-[#5a6d61]">
              Start with your first client to turn this dashboard into a live picture of your
              earnings.
            </p>
            <Button asChild variant="secondary" className="mt-6">
              <Link to="/jobs">Add your first job</Link>
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
