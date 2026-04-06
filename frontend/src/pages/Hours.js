import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Plus, Trash2, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// EmptyState Component
function EmptyState({ onAddClick }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-20 h-20 rounded-2xl bg-[#F0EDE8] flex items-center justify-center mb-6">
        <Clock size={32} className="text-[#A3B18A]" />
      </div>
      <h3 className="text-xl font-medium text-[#344E41] mb-2" style={{ fontFamily: 'Outfit' }}>
        No hours logged yet
      </h3>
      <p className="text-base text-[#5C6B61] mb-6 text-center max-w-sm">
        Start logging your working hours to calculate earnings
      </p>
      <Button
        onClick={onAddClick}
        className="bg-[#344E41] hover:bg-[#2B3A28] text-white flex items-center gap-2 rounded-lg"
      >
        <Plus size={18} />
        Log your first hours
      </Button>
    </div>
  );
}

// Skeleton Row Component
function SkeletonRow() {
  return (
    <tr className="border-b border-[#EAE6DF]">
      <td className="px-6 py-4"><div className="h-4 w-24 bg-[#E8E5DF] rounded animate-pulse" /></td>
      <td className="px-6 py-4"><div className="h-4 w-32 bg-[#E8E5DF] rounded animate-pulse" /></td>
      <td className="px-6 py-4 text-right"><div className="h-4 w-12 bg-[#E8E5DF] rounded animate-pulse ml-auto" /></td>
      <td className="px-6 py-4 text-right"><div className="h-4 w-16 bg-[#E8E5DF] rounded animate-pulse ml-auto" /></td>
      <td className="px-6 py-4 text-right"><div className="h-4 w-20 bg-[#E8E5DF] rounded animate-pulse ml-auto" /></td>
      <td className="px-6 py-4 text-right"><div className="h-8 w-8 bg-[#E8E5DF] rounded animate-pulse ml-auto" /></td>
    </tr>
  );
}

export default function Hours() {
  const [hours, setHours] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [entryMode, setEntryMode] = useState('daily');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [logToDelete, setLogToDelete] = useState(null);
  
  const [dailyForm, setDailyForm] = useState({ job_id: '', date: new Date().toISOString().split('T')[0], hours_worked: '' });
  const [weeklyForm, setWeeklyForm] = useState({
    job_id: '', week_start: getMonday(new Date()).toISOString().split('T')[0],
    days: { monday: '', tuesday: '', wednesday: '', thursday: '', friday: '', saturday: '', sunday: '' }
  });
  const [monthlyForm, setMonthlyForm] = useState({ job_id: '', month: new Date().toISOString().slice(0, 7), entries: [] });
  
  function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }
  
  function getDateForDay(weekStart, dayOffset) {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + dayOffset);
    return date.toISOString().split('T')[0];
  }
  
  useEffect(() => { fetchData(); }, []);
  
  const fetchData = async () => {
    try {
      const [hoursRes, jobsRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/hours`, { withCredentials: true }),
        axios.get(`${BACKEND_URL}/api/jobs`, { withCredentials: true })
      ]);
      setHours(hoursRes.data);
      setJobs(jobsRes.data.filter(j => j.is_active));
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (entryMode === 'daily') {
        await axios.post(`${BACKEND_URL}/api/hours`, { job_id: dailyForm.job_id, date: dailyForm.date, hours_worked: parseFloat(dailyForm.hours_worked) }, { withCredentials: true });
        toast.success('Hours logged successfully');
      } else if (entryMode === 'weekly') {
        const daysMap = { monday: 0, tuesday: 1, wednesday: 2, thursday: 3, friday: 4, saturday: 5, sunday: 6 };
        const promises = [];
        for (const [day, hours] of Object.entries(weeklyForm.days)) {
          if (hours && parseFloat(hours) > 0) {
            promises.push(axios.post(`${BACKEND_URL}/api/hours`, { job_id: weeklyForm.job_id, date: getDateForDay(weeklyForm.week_start, daysMap[day]), hours_worked: parseFloat(hours) }, { withCredentials: true }));
          }
        }
        if (promises.length === 0) { toast.error('Please enter hours for at least one day'); return; }
        await Promise.all(promises);
        toast.success(`${promises.length} day(s) logged successfully`);
      } else if (entryMode === 'monthly') {
        const promises = monthlyForm.entries.filter(entry => entry.hours && parseFloat(entry.hours) > 0).map(entry =>
          axios.post(`${BACKEND_URL}/api/hours`, { job_id: monthlyForm.job_id, date: entry.date, hours_worked: parseFloat(entry.hours) }, { withCredentials: true })
        );
        if (promises.length === 0) { toast.error('Please enter hours for at least one day'); return; }
        await Promise.all(promises);
        toast.success(`${promises.length} day(s) logged successfully`);
      }
      setDialogOpen(false);
      resetForms();
      fetchData();
    } catch (error) {
      console.error('Failed to log hours:', error);
      toast.error('Failed to log hours');
    }
  };
  
  const resetForms = () => {
    setDailyForm({ job_id: '', date: new Date().toISOString().split('T')[0], hours_worked: '' });
    setWeeklyForm({ job_id: '', week_start: getMonday(new Date()).toISOString().split('T')[0], days: { monday: '', tuesday: '', wednesday: '', thursday: '', friday: '', saturday: '', sunday: '' } });
    setMonthlyForm({ job_id: '', month: new Date().toISOString().slice(0, 7), entries: [] });
  };
  
  const handleDeleteClick = (log) => { setLogToDelete(log); setDeleteDialogOpen(true); };
  
  const handleDeleteConfirm = async () => {
    if (!logToDelete) return;
    try {
      await axios.delete(`${BACKEND_URL}/api/hours/${logToDelete.log_id}`, { withCredentials: true });
      toast.success('Hours log deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Failed to delete hours log:', error);
      toast.error(`Failed to delete: ${error.response?.data?.detail || error.message}`);
    } finally {
      setDeleteDialogOpen(false);
      setLogToDelete(null);
    }
  };
  
  const weekTotal = Object.values(weeklyForm.days).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
  const selectedJob = jobs.find(j => j.job_id === weeklyForm.job_id);
  const weeklyEstimatedEarnings = weekTotal * (selectedJob?.hourly_rate || 0);
  const dailyJob = jobs.find(j => j.job_id === dailyForm.job_id);
  const dailyEstimatedEarnings = (parseFloat(dailyForm.hours_worked) || 0) * (dailyJob?.hourly_rate || 0);
  
  // Group hours by month
  const groupedHours = hours.reduce((acc, log) => {
    const month = log.date.slice(0, 7);
    if (!acc[month]) acc[month] = [];
    acc[month].push(log);
    return acc;
  }, {});
  const sortedMonths = Object.keys(groupedHours).sort().reverse();
  
  if (loading) {
    return (
      <div data-testid="hours-page">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-[#344E41] mb-2" style={{ fontFamily: 'Outfit' }}>Hours Worked</h1>
            <p className="text-base leading-relaxed text-[#5C6B61]">Track your working hours and calculate earnings</p>
          </div>
        </div>
        <div className="bg-white border border-[#EAE6DF] rounded-xl">
          <table className="w-full">
            <thead className="border-b border-[#EAE6DF]">
              <tr className="bg-[#FDFCFB]">
                <th className="text-left px-6 py-4 text-sm font-medium text-[#5C6B61]">Date</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-[#5C6B61]">Job</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-[#5C6B61]">Hours</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-[#5C6B61]">Rate</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-[#5C6B61]">Earnings</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-[#5C6B61]">Actions</th>
              </tr>
            </thead>
            <tbody>
              <SkeletonRow /><SkeletonRow /><SkeletonRow />
            </tbody>
          </table>
        </div>
      </div>
    );
  }
  
  return (
    <div data-testid="hours-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-[#344E41] mb-2" style={{ fontFamily: 'Outfit' }}>Hours Worked</h1>
          <p className="text-base leading-relaxed text-[#5C6B61]">Track your working hours and calculate earnings</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="log-hours-button" className="bg-[#344E41] hover:bg-[#2B3A28] text-white flex items-center gap-2 transition-all duration-200 rounded-lg text-sm" disabled={jobs.length === 0} onClick={resetForms}>
              <Plus size={18} /> Log Hours
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white border border-[#EAE6DF] rounded-xl max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-medium text-[#344E41]" style={{ fontFamily: 'Outfit' }}>Log Hours Worked</DialogTitle>
            </DialogHeader>
            <Tabs value={entryMode} onValueChange={setEntryMode} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="daily">Daily</TabsTrigger>
                <TabsTrigger value="weekly">Weekly</TabsTrigger>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
              </TabsList>
              <TabsContent value="daily">
                <form onSubmit={handleSubmit} className="space-y-4" data-testid="hours-form">
                  <div>
                    <Label htmlFor="daily_job_id" className="text-[#5C6B61] font-medium">Job</Label>
                    <Select value={dailyForm.job_id} onValueChange={(value) => setDailyForm({ ...dailyForm, job_id: value })} required>
                      <SelectTrigger id="daily_job_id" data-testid="job-select" className="mt-1 border-[#EAE6DF] focus:border-[#344E41] focus:ring-[#344E41] rounded-lg">
                        <SelectValue placeholder="Select a job" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-[#EAE6DF] rounded-xl">
                        {jobs.map((job) => (<SelectItem key={job.job_id} value={job.job_id}>{job.job_name} - ${job.hourly_rate.toFixed(2)}/hr</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="daily_date" className="text-[#5C6B61] font-medium">Date</Label>
                    <Input id="daily_date" data-testid="date-input" type="date" value={dailyForm.date} onChange={(e) => setDailyForm({ ...dailyForm, date: e.target.value })} required className="mt-1 border-[#EAE6DF] focus:border-[#344E41] focus:ring-[#344E41] rounded-lg" />
                  </div>
                  <div>
                    <Label htmlFor="daily_hours" className="text-[#5C6B61] font-medium">Hours Worked</Label>
                    <Input id="daily_hours" data-testid="hours-input" type="number" step="0.5" value={dailyForm.hours_worked} onChange={(e) => setDailyForm({ ...dailyForm, hours_worked: e.target.value })} required className="mt-1 border-[#EAE6DF] focus:border-[#344E41] focus:ring-[#344E41] rounded-lg" placeholder="8.0" />
                    {dailyForm.job_id && dailyForm.hours_worked && (<p className="text-sm text-[#3A5A40] mt-1.5 font-medium">Estimated earnings: ${dailyEstimatedEarnings.toFixed(2)}</p>)}
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1 border-[#EAE6DF] text-[#5C6B61] hover:bg-[#F5F3EE] rounded-lg text-sm" data-testid="cancel-hours-button">Cancel</Button>
                    <Button type="submit" className="flex-1 bg-[#344E41] hover:bg-[#2B3A28] text-white rounded-lg text-sm" data-testid="submit-hours-button">Log Hours</Button>
                  </div>
                </form>
              </TabsContent>
              <TabsContent value="weekly">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="weekly_job_id" className="text-[#5C6B61] font-medium">Job</Label>
                    <Select value={weeklyForm.job_id} onValueChange={(value) => setWeeklyForm({ ...weeklyForm, job_id: value })} required>
                      <SelectTrigger id="weekly_job_id" className="mt-1 border-[#EAE6DF] focus:border-[#344E41] focus:ring-[#344E41] rounded-lg">
                        <SelectValue placeholder="Select a job" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-[#EAE6DF] rounded-xl">
                        {jobs.map((job) => (<SelectItem key={job.job_id} value={job.job_id}>{job.job_name} - ${job.hourly_rate.toFixed(2)}/hr</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="week_start" className="text-[#5C6B61] font-medium">Week Starting</Label>
                    <Input id="week_start" type="date" value={weeklyForm.week_start} onChange={(e) => { const monday = getMonday(new Date(e.target.value)); setWeeklyForm({ ...weeklyForm, week_start: monday.toISOString().split('T')[0] }); }} required className="mt-1 border-[#EAE6DF] focus:border-[#344E41] focus:ring-[#344E41] rounded-lg" />
                    <p className="text-sm text-[#5C6B61] mt-1">Week starts on Monday</p>
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day, idx) => (
                      <div key={day}>
                        <Label htmlFor={`weekly_${day}`} className="text-[#5C6B61] font-medium text-xs capitalize">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][idx]}</Label>
                        <Input id={`weekly_${day}`} type="number" step="0.5" min="0" value={weeklyForm.days[day]} onChange={(e) => setWeeklyForm({ ...weeklyForm, days: { ...weeklyForm.days, [day]: e.target.value } })} className="mt-1 border-[#EAE6DF] focus:border-[#344E41] focus:ring-[#344E41] rounded-lg h-9 text-sm" placeholder="0" />
                      </div>
                    ))}
                  </div>
                  {weekTotal > 0 && (
                    <div className="bg-[#F5F3EE] p-4 rounded-lg border-l-4 border-[#3A5A40]">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-[#5C6B61]">Week Total</p>
                          <p className="text-2xl font-semibold text-[#344E41]" style={{ fontFamily: 'Outfit' }}>{weekTotal.toFixed(1)} hours</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-[#5C6B61]">Estimated Earnings</p>
                          <p className="text-2xl font-semibold text-[#3A5A40]" style={{ fontFamily: 'Outfit' }}>${weeklyEstimatedEarnings.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1 border-[#EAE6DF] text-[#5C6B61] hover:bg-[#F5F3EE] rounded-lg text-sm">Cancel</Button>
                    <Button type="submit" className="flex-1 bg-[#344E41] hover:bg-[#2B3A28] text-white rounded-lg text-sm">Log Week</Button>
                  </div>
                </form>
              </TabsContent>
              <TabsContent value="monthly">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="monthly_job_id" className="text-[#5C6B61] font-medium">Job</Label>
                    <Select value={monthlyForm.job_id} onValueChange={(value) => setMonthlyForm({ ...monthlyForm, job_id: value })} required>
                      <SelectTrigger id="monthly_job_id" className="mt-1 border-[#EAE6DF] focus:border-[#344E41] focus:ring-[#344E41] rounded-lg">
                        <SelectValue placeholder="Select a job" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-[#EAE6DF] rounded-xl">
                        {jobs.map((job) => (<SelectItem key={job.job_id} value={job.job_id}>{job.job_name} - ${job.hourly_rate.toFixed(2)}/hr</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="month" className="text-[#5C6B61] font-medium">Month</Label>
                    <Input id="month" type="month" value={monthlyForm.month} onChange={(e) => setMonthlyForm({ ...monthlyForm, month: e.target.value })} required className="mt-1 border-[#EAE6DF] focus:border-[#344E41] focus:ring-[#344E41] rounded-lg" />
                  </div>
                  <div className="bg-[#F5F3EE] p-4 rounded-lg border-l-4 border-[#344E41]">
                    <p className="text-sm text-[#5C6B61] mb-3"><strong className="text-[#344E41]">Quick Entry:</strong> Enter total hours for the month</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="total_hours" className="text-[#5C6B61] font-medium">Total Hours</Label>
                        <Input id="total_hours" type="number" step="0.5" min="0" placeholder="160" className="mt-1 border-[#EAE6DF] focus:border-[#344E41] focus:ring-[#344E41] rounded-lg" onChange={(e) => { if (e.target.value && parseFloat(e.target.value) > 0) { const firstDay = `${monthlyForm.month}-01`; setMonthlyForm({ ...monthlyForm, entries: [{ date: firstDay, hours: e.target.value }] }); } }} />
                      </div>
                      <div>
                        <Label htmlFor="entry_date" className="text-[#5C6B61] font-medium">Date</Label>
                        <Input id="entry_date" type="date" defaultValue={`${monthlyForm.month}-01`} className="mt-1 border-[#EAE6DF] focus:border-[#344E41] focus:ring-[#344E41] rounded-lg" onChange={(e) => { if (monthlyForm.entries.length > 0) { setMonthlyForm({ ...monthlyForm, entries: [{ ...monthlyForm.entries[0], date: e.target.value }] }); } }} />
                      </div>
                    </div>
                    <p className="text-xs text-[#5C6B61] mt-2">Or split hours across multiple days in the hours table below</p>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1 border-[#EAE6DF] text-[#5C6B61] hover:bg-[#F5F3EE] rounded-lg text-sm">Cancel</Button>
                    <Button type="submit" className="flex-1 bg-[#344E41] hover:bg-[#2B3A28] text-white rounded-lg text-sm">Log Month</Button>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>
      
      {jobs.length === 0 && (
        <div className="bg-[#FEF6F4] border border-[#E07A5F] rounded-lg p-4 mb-6" data-testid="no-jobs-warning">
          <p className="text-[#E07A5F] text-sm">You need to add at least one job before you can log hours. <Link to="/jobs" className="underline font-medium">Add a job now</Link></p>
        </div>
      )}
      
      {hours.length === 0 ? (
        <div className="bg-white border border-[#EAE6DF] rounded-xl shadow-sm" data-testid="empty-hours-state">
          <EmptyState onAddClick={() => jobs.length > 0 && setDialogOpen(true)} />
        </div>
      ) : (
        <div className="space-y-6">
          {sortedMonths.map((month) => {
            const monthLogs = groupedHours[month].sort((a, b) => new Date(b.date) - new Date(a.date));
            const monthTotal = monthLogs.reduce((sum, log) => sum + log.hours_worked, 0);
            const monthPay = monthLogs.reduce((sum, log) => sum + log.calculated_pay, 0);
            const monthName = new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            return (
              <div key={month}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-medium text-[#344E41]" style={{ fontFamily: 'Outfit' }}>{monthName}</h2>
                  <div className="text-right text-sm">
                    <span className="text-[#5C6B61]">{monthTotal.toFixed(1)} hours · </span>
                    <span className="text-[#3A5A40] font-medium">${monthPay.toFixed(2)}</span>
                  </div>
                </div>
                <div className="bg-white border border-[#EAE6DF] rounded-xl overflow-hidden shadow-sm" data-testid="hours-table">
                  {monthLogs.map((log, index) => (
                    <div key={log.log_id} data-testid={`hours-row-${index}`} className="group flex items-center justify-between px-6 py-4 border-b border-[#EAE6DF] last:border-b-0 hover:bg-[#FDFCFB]/50 transition-colors">
                      <div className="flex items-center gap-6 flex-1">
                        <span className="text-sm text-[#5C6B61] w-24">{new Date(log.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                        <span className="text-base text-[#344E41] font-medium">{log.job_name}</span>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <span className="text-base text-[#5C6B61]">{log.hours_worked}h · </span>
                          <span className="text-base text-[#3A5A40] font-medium">${log.calculated_pay.toFixed(2)}</span>
                        </div>
                        <button onClick={() => handleDeleteClick(log)} data-testid={`delete-hours-${index}`} className="p-2 text-[#E07A5F] hover:bg-[#FEF6F4] rounded-lg opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-white border border-[#EAE6DF] rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-medium text-[#344E41]" style={{ fontFamily: 'Outfit' }}>Delete Hours Log</DialogTitle>
            <DialogDescription className="text-[#5C6B61]">Are you sure you want to delete this hours entry for <strong className="text-[#344E41]">{logToDelete?.job_name}</strong> on {logToDelete && new Date(logToDelete.date).toLocaleDateString()}? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="flex-1 border-[#EAE6DF] text-[#5C6B61] hover:bg-[#F5F3EE] rounded-lg text-sm">Cancel</Button>
            <Button onClick={handleDeleteConfirm} className="flex-1 bg-[#E07A5F] hover:bg-[#C85A3F] text-white rounded-lg text-sm">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
