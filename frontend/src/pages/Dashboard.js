import { useState, useEffect } from 'react';
import axios from 'axios';
import { DollarSign, Clock, Briefcase, TrendingUp, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

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
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#344E41]"></div>
      </div>
    );
  }
  
  const metrics = [
    {
      icon: DollarSign,
      label: 'Total Earnings',
      value: `$${summary?.total_earnings?.toFixed(2) || '0.00'}`,
      color: '#3A5A40',
      testId: 'metric-earnings'
    },
    {
      icon: TrendingUp,
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
  ];
  
  return (
    <div data-testid="dashboard-page">
      <div className="mb-8">
        <div className="flex items-end justify-between">
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
                className="border-[#EAE6DF] focus:border-[#344E41] focus:ring-[#344E41]"
              />
            </div>
            <Button
              onClick={handleDownloadMonthlyReport}
              disabled={downloadingPdf}
              className="bg-[#344E41] hover:bg-[#2B3A28] text-white flex items-center gap-2"
            >
              {downloadingPdf ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Download size={18} />
                  Download Report
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.label}
              data-testid={metric.testId}
              className="bg-white border border-[#EAE6DF] p-6 transition-transform duration-200 hover:-translate-y-[2px] hover:shadow-sm"
            >
              <div className="flex items-start justify-between mb-4">
                <div 
                  className="p-3 rounded-full" 
                  style={{ backgroundColor: `${metric.color}15` }}
                >
                  <Icon size={24} style={{ color: metric.color }} />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-[#5C6B61] mb-1">{metric.label}</p>
                <p 
                  className="text-5xl font-light tracking-tighter" 
                  style={{ fontFamily: 'Outfit', color: metric.color }}
                >
                  {metric.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Job Breakdown Chart */}
      {summary?.job_breakdown && summary.job_breakdown.length > 0 && (
        <div className="bg-white border border-[#EAE6DF] p-6" data-testid="job-breakdown-chart">
          <h2 
            className="text-2xl font-medium tracking-tight text-[#344E41] mb-6" 
            style={{ fontFamily: 'Outfit' }}
          >
            Earnings by Job
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={summary.job_breakdown}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EAE6DF" />
              <XAxis 
                dataKey="job_name" 
                tick={{ fill: '#5C6B61', fontSize: 14 }}
                stroke="#EAE6DF"
              />
              <YAxis 
                tick={{ fill: '#5C6B61', fontSize: 14 }}
                stroke="#EAE6DF"
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #EAE6DF',
                  borderRadius: '0px',
                  boxShadow: 'none'
                }}
                formatter={(value) => [`$${value.toFixed(2)}`, 'Earnings']}
              />
              <Bar dataKey="earnings" fill="#344E41" radius={[0, 0, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      
      {summary?.job_breakdown && summary.job_breakdown.length === 0 && (
        <div className="bg-white border border-[#EAE6DF] p-12 text-center" data-testid="empty-state">
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
      )}
    </div>
  );
}
