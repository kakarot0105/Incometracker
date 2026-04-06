import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { DollarSign, Clock, Briefcase, TrendingUp, TrendingDown, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Skeleton Card Component
function SkeletonCard() {
  return (
    <div className="bg-white border border-[#EAE6DF] rounded-xl p-6 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-full bg-[#E8E5DF] animate-pulse" />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-20 bg-[#E8E5DF] rounded animate-pulse" />
        <div className="h-8 w-28 bg-[#E8E5DF] rounded animate-pulse" />
      </div>
    </div>
  );
}

// Skeleton Chart Component
function SkeletonChart() {
  return (
    <div className="bg-white border border-[#EAE6DF] rounded-xl p-6">
      <div className="h-6 w-32 bg-[#E8E5DF] rounded animate-pulse mb-6" />
      <div className="h-[250px] bg-[#E8E5DF] rounded-xl animate-pulse" />
    </div>
  );
}

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  
  useEffect(() => {
    fetchSummary();
  }, []);
  
  const fetchSummary = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/dashboard/summary`, {
        withCredentials: true
      });
      setSummary(response.data);
    } catch (error) {
      console.error('Failed to fetch summary:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleDownloadMonthlyReport = async () => {
    setDownloadingPdf(true);
    try {
      const response = await axios.get(
        `${BACKEND_URL}/api/reports/monthly-spreadsheet?month=${selectedMonth}`,
        {
          withCredentials: true,
          responseType: 'blob'
        }
      );
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const monthName = new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const filename = `timesheet_${monthName.replace(' ', '_')}.pdf`;
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Monthly report downloaded');
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
  
  const metrics = [
    {
      icon: DollarSign,
      label: 'Total Earnings',
      value: `$${summary?.total_earnings?.toFixed(2) || '0.00'}`,
      color: '#3A5A40',
      testId: 'metric-earnings'
    },
    {
      icon: summary?.balance < 0 ? TrendingDown : TrendingUp,
      label: 'Balance',
      value: `$${summary?.balance?.toFixed(2) || '0.00'}`,
      color: summary?.balance >= 0 ? '#3A5A40' : '#E07A5F',
      testId: 'metric-balance'
    },
    {
      icon: Clock,
      label: 'Total Hours',
      value: summary?.total_hours?.toFixed(1) || '0.0',
      color: '#A3B18A',
      testId: 'metric-hours'
    },
    {
      icon: Briefcase,
      label: 'Active Jobs',
      value: summary?.active_jobs || 0,
      color: '#344E41',
      testId: 'metric-jobs'
    },
    {
      icon: DollarSign,
      label: 'Payments Received',
      value: `$${summary?.payments_received?.toFixed(2) || '0.00'}`,
      color: '#588157',
      testId: 'metric-payments'
    },
  ];
  
  return (
    <div data-testid="dashboard-page">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 
              className="text-4xl font-semibold tracking-tight text-[#344E41] mb-2" 
              style={{ fontFamily: 'Outfit' }}
            >
              Dashboard
            </h1>
            <p className="text-base leading-relaxed text-[#5C6B61]">
              Your earnings overview at a glance
            </p>
          </div>
          
          <div className="flex items-end gap-3">
            <div>
              <Label htmlFor="month_selector" className="text-[#5C6B61] text-sm font-medium mb-1 block">
                Select Month
              </Label>
              <Input
                id="month_selector"
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="border-[#EAE6DF] focus:border-[#344E41] focus:ring-[#344E41] h-9 text-sm"
              />
            </div>
            <Button
              onClick={handleDownloadMonthlyReport}
              disabled={downloadingPdf}
              className="bg-[#344E41] hover:bg-[#2B3A28] text-white flex items-center gap-2 h-9 text-sm px-4 rounded-lg"
            >
              {downloadingPdf ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Download size={16} />
                  Download
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Metrics Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
            {metrics.map((metric) => {
              const Icon = metric.icon;
              const alphaColor = metric.color + '18'; // Add 18 for alpha hex
              
              return (
                <div
                  key={metric.label}
                  data-testid={metric.testId}
                  className="bg-white border border-[#EAE6DF] rounded-xl p-5 shadow-sm transition-transform duration-200 hover:-translate-y-[2px] hover:shadow-md"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div 
                      className="w-9 h-9 rounded-full flex items-center justify-center" 
                      style={{ backgroundColor: alphaColor }}
                    >
                      <Icon size={17} style={{ color: metric.color }} />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#5C6B61] uppercase tracking-wide mb-1">{metric.label}</p>
                    <p 
                      className="text-2xl font-semibold tracking-tight" 
                      style={{ fontFamily: 'Outfit', color: metric.color }}
                    >
                      {metric.value}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Active Jobs Count Line */}
          <div className="mb-8 text-sm text-[#5C6B61]">
            {summary?.active_jobs > 0 ? (
              <span>Tracking <strong className="text-[#344E41]">{summary.active_jobs}</strong> active job{summary.active_jobs !== 1 ? 's' : ''}</span>
            ) : (
              <span>No active jobs. <Link to="/jobs" className="text-[#344E41] underline">Add one</Link> to get started.</span>
            )}
          </div>
        </>
      )}
      
      {/* Job Breakdown Chart */}
      {loading ? (
        <SkeletonChart />
      ) : summary?.job_breakdown && summary.job_breakdown.length > 0 ? (
        <div className="bg-white border border-[#EAE6DF] rounded-xl p-6 shadow-sm" data-testid="job-breakdown-chart">
          <h2 
            className="text-xl font-medium tracking-tight text-[#344E41] mb-6" 
            style={{ fontFamily: 'Outfit' }}
          >
            Earnings by Job
          </h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={summary.job_breakdown}>
              <XAxis 
                dataKey="job_name" 
                tick={{ fill: '#8A9E90', fontSize: 12 }}
                axisLine={{ stroke: '#EAE6DF' }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fill: '#8A9E90', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #EAE6DF',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                formatter={(value) => [`$${value.toFixed(2)}`, 'Earnings']}
              />
              <Bar dataKey="earnings" fill="#344E41" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : summary?.job_breakdown && summary.job_breakdown.length === 0 && !loading ? (
        <div className="bg-white border border-[#EAE6DF] rounded-xl p-12 text-center shadow-sm" data-testid="empty-state">
          <div className="max-w-md mx-auto">
            <Briefcase size={48} className="mx-auto mb-4 text-[#A3B18A]" />
            <h3 className="text-xl font-medium text-[#344E41] mb-2" style={{ fontFamily: 'Outfit' }}>
              No jobs yet
            </h3>
            <p className="text-base text-[#5C6B61] mb-6">
              Start by adding your first job to track your earnings
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
