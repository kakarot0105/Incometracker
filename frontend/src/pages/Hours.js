import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, Clock, Calendar } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function Hours() {
  const [hours, setHours] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [entryMode, setEntryMode] = useState('weekly'); // 'daily', 'weekly', 'monthly'
  
  // Daily entry form
  const [dailyForm, setDailyForm] = useState({ 
    job_id: '', 
    date: new Date().toISOString().split('T')[0], 
    hours_worked: '' 
  });
  
  // Weekly entry form
  const [weeklyForm, setWeeklyForm] = useState({
    job_id: '',
    week_start: getMonday(new Date()).toISOString().split('T')[0],
    days: {
      monday: '',
      tuesday: '',
      wednesday: '',
      thursday: '',
      friday: '',
      saturday: '',
      sunday: ''
    }
  });
  
  // Monthly entry form
  const [monthlyForm, setMonthlyForm] = useState({
    job_id: '',
    month: new Date().toISOString().slice(0, 7), // YYYY-MM format
    entries: [] // Array of {date, hours}
  });
  
  // Helper function to get Monday of current week
  function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }
  
  // Helper function to get date for a specific day offset from week start
  function getDateForDay(weekStart, dayOffset) {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + dayOffset);
    return date.toISOString().split('T')[0];
  }
  
  useEffect(() => {
    fetchData();
  }, []);
  
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
        await axios.post(
          `${BACKEND_URL}/api/hours`,
          {
            job_id: dailyForm.job_id,
            date: dailyForm.date,
            hours_worked: parseFloat(dailyForm.hours_worked)
          },
          { withCredentials: true }
        );
        toast.success('Hours logged successfully');
      } else if (entryMode === 'weekly') {
        // Submit each day that has hours
        const daysMap = {
          monday: 0, tuesday: 1, wednesday: 2, thursday: 3,
          friday: 4, saturday: 5, sunday: 6
        };
        
        const promises = [];
        for (const [day, hours] of Object.entries(weeklyForm.days)) {
          if (hours && parseFloat(hours) > 0) {
            const date = getDateForDay(weeklyForm.week_start, daysMap[day]);
            promises.push(
              axios.post(
                `${BACKEND_URL}/api/hours`,
                {
                  job_id: weeklyForm.job_id,
                  date: date,
                  hours_worked: parseFloat(hours)
                },
                { withCredentials: true }
              )
            );
          }
        }
        
        if (promises.length === 0) {
          toast.error('Please enter hours for at least one day');
          return;
        }
        
        await Promise.all(promises);
        toast.success(`${promises.length} day(s) logged successfully`);
      } else if (entryMode === 'monthly') {
        // Submit entries with hours
        const promises = monthlyForm.entries
          .filter(entry => entry.hours && parseFloat(entry.hours) > 0)
          .map(entry =>
            axios.post(
              `${BACKEND_URL}/api/hours`,
              {
                job_id: monthlyForm.job_id,
                date: entry.date,
                hours_worked: parseFloat(entry.hours)
              },
              { withCredentials: true }
            )
          );
        
        if (promises.length === 0) {
          toast.error('Please enter hours for at least one day');
          return;
        }
        
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
    setDailyForm({ 
      job_id: '', 
      date: new Date().toISOString().split('T')[0], 
      hours_worked: '' 
    });
    setWeeklyForm({
      job_id: '',
      week_start: getMonday(new Date()).toISOString().split('T')[0],
      days: {
        monday: '', tuesday: '', wednesday: '', thursday: '',
        friday: '', saturday: '', sunday: ''
      }
    });
    setMonthlyForm({
      job_id: '',
      month: new Date().toISOString().slice(0, 7),
      entries: []
    });
  };
  
  const handleDelete = async (logId) => {
    console.log('Delete clicked for log:', logId);
    
    if (!window.confirm('Are you sure you want to delete this hours log?')) {
      console.log('User cancelled delete');
      return;
    }
    
    console.log('Attempting to delete log:', logId);
    
    try {
      const response = await axios.delete(`${BACKEND_URL}/api/hours/${logId}`, {
        withCredentials: true
      });
      console.log('Delete successful:', response.data);
      toast.success('Hours log deleted successfully');
      await fetchData();
    } catch (error) {
      console.error('Failed to delete hours log:', error);
      console.error('Error response:', error.response?.data);
      toast.error(`Failed to delete: ${error.response?.data?.detail || error.message}`);
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#344E41]"></div>
      </div>
    );
  }
  
  return (
    <div data-testid="hours-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 
            className="text-4xl font-semibold tracking-tight text-[#344E41] mb-2" 
            style={{ fontFamily: 'Outfit' }}
          >
            Hours Worked
          </h1>
          <p className="text-base leading-relaxed text-[#5C6B61]">
            Track your working hours and calculate earnings
          </p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              data-testid="log-hours-button"
              className="bg-[#344E41] hover:bg-[#2B3A28] text-white flex items-center gap-2 transition-all duration-200"
              disabled={jobs.length === 0}
              onClick={resetForms}
            >
              <Plus size={20} />
              Log Hours
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white border border-[#EAE6DF] max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-medium text-[#344E41]" style={{ fontFamily: 'Outfit' }}>
                Log Hours Worked
              </DialogTitle>
            </DialogHeader>
            
            <Tabs value={entryMode} onValueChange={setEntryMode} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="daily">Daily</TabsTrigger>
                <TabsTrigger value="weekly">Weekly</TabsTrigger>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
              </TabsList>
              
              {/* Daily Entry */}
              <TabsContent value="daily">
                <form onSubmit={handleSubmit} className="space-y-4" data-testid="hours-form">
                  <div>
                    <Label htmlFor="daily_job_id" className="text-[#5C6B61] font-medium">Job</Label>
                    <Select 
                      value={dailyForm.job_id} 
                      onValueChange={(value) => setDailyForm({ ...dailyForm, job_id: value })}
                      required
                    >
                      <SelectTrigger 
                        id="daily_job_id"
                        data-testid="job-select"
                        className="mt-1 border-[#EAE6DF] focus:border-[#344E41] focus:ring-[#344E41]"
                      >
                        <SelectValue placeholder="Select a job" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-[#EAE6DF]">
                        {jobs.map((job) => (
                          <SelectItem key={job.job_id} value={job.job_id}>
                            {job.job_name} - ${job.hourly_rate.toFixed(2)}/hr
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="daily_date" className="text-[#5C6B61] font-medium">Date</Label>
                    <Input
                      id="daily_date"
                      data-testid="date-input"
                      type="date"
                      value={dailyForm.date}
                      onChange={(e) => setDailyForm({ ...dailyForm, date: e.target.value })}
                      required
                      className="mt-1 border-[#EAE6DF] focus:border-[#344E41] focus:ring-[#344E41]"
                    />
                  </div>
                  <div>
                    <Label htmlFor="daily_hours" className="text-[#5C6B61] font-medium">Hours Worked</Label>
                    <Input
                      id="daily_hours"
                      data-testid="hours-input"
                      type="number"
                      step="0.5"
                      value={dailyForm.hours_worked}
                      onChange={(e) => setDailyForm({ ...dailyForm, hours_worked: e.target.value })}
                      required
                      className="mt-1 border-[#EAE6DF] focus:border-[#344E41] focus:ring-[#344E41]"
                      placeholder="8.0"
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                      className="flex-1 border-[#EAE6DF] text-[#5C6B61] hover:bg-[#F5F3EE]"
                      data-testid="cancel-hours-button"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-[#344E41] hover:bg-[#2B3A28] text-white"
                      data-testid="submit-hours-button"
                    >
                      Log Hours
                    </Button>
                  </div>
                </form>
              </TabsContent>
              
              {/* Weekly Entry */}
              <TabsContent value="weekly">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="weekly_job_id" className="text-[#5C6B61] font-medium">Job</Label>
                    <Select 
                      value={weeklyForm.job_id} 
                      onValueChange={(value) => setWeeklyForm({ ...weeklyForm, job_id: value })}
                      required
                    >
                      <SelectTrigger 
                        id="weekly_job_id"
                        className="mt-1 border-[#EAE6DF] focus:border-[#344E41] focus:ring-[#344E41]"
                      >
                        <SelectValue placeholder="Select a job" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-[#EAE6DF]">
                        {jobs.map((job) => (
                          <SelectItem key={job.job_id} value={job.job_id}>
                            {job.job_name} - ${job.hourly_rate.toFixed(2)}/hr
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="week_start" className="text-[#5C6B61] font-medium">Week Starting</Label>
                    <Input
                      id="week_start"
                      type="date"
                      value={weeklyForm.week_start}
                      onChange={(e) => {
                        const monday = getMonday(new Date(e.target.value));
                        setWeeklyForm({ ...weeklyForm, week_start: monday.toISOString().split('T')[0] });
                      }}
                      required
                      className="mt-1 border-[#EAE6DF] focus:border-[#344E41] focus:ring-[#344E41]"
                    />
                    <p className="text-sm text-[#5C6B61] mt-1">Week starts on Monday</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                      <div key={day}>
                        <Label htmlFor={`weekly_${day}`} className="text-[#5C6B61] font-medium capitalize">
                          {day}
                        </Label>
                        <Input
                          id={`weekly_${day}`}
                          type="number"
                          step="0.5"
                          min="0"
                          value={weeklyForm.days[day]}
                          onChange={(e) => setWeeklyForm({
                            ...weeklyForm,
                            days: { ...weeklyForm.days, [day]: e.target.value }
                          })}
                          className="mt-1 border-[#EAE6DF] focus:border-[#344E41] focus:ring-[#344E41]"
                          placeholder="0"
                        />
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                      className="flex-1 border-[#EAE6DF] text-[#5C6B61] hover:bg-[#F5F3EE]"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-[#344E41] hover:bg-[#2B3A28] text-white"
                    >
                      Log Week
                    </Button>
                  </div>
                </form>
              </TabsContent>
              
              {/* Monthly Entry */}
              <TabsContent value="monthly">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="monthly_job_id" className="text-[#5C6B61] font-medium">Job</Label>
                    <Select 
                      value={monthlyForm.job_id} 
                      onValueChange={(value) => setMonthlyForm({ ...monthlyForm, job_id: value })}
                      required
                    >
                      <SelectTrigger 
                        id="monthly_job_id"
                        className="mt-1 border-[#EAE6DF] focus:border-[#344E41] focus:ring-[#344E41]"
                      >
                        <SelectValue placeholder="Select a job" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-[#EAE6DF]">
                        {jobs.map((job) => (
                          <SelectItem key={job.job_id} value={job.job_id}>
                            {job.job_name} - ${job.hourly_rate.toFixed(2)}/hr
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="month" className="text-[#5C6B61] font-medium">Month</Label>
                    <Input
                      id="month"
                      type="month"
                      value={monthlyForm.month}
                      onChange={(e) => setMonthlyForm({ ...monthlyForm, month: e.target.value })}
                      required
                      className="mt-1 border-[#EAE6DF] focus:border-[#344E41] focus:ring-[#344E41]"
                    />
                  </div>
                  
                  <div className="bg-[#F5F3EE] p-4 border-l-4 border-[#344E41]">
                    <p className="text-sm text-[#5C6B61] mb-3">
                      <strong className="text-[#344E41]">Quick Entry:</strong> Enter total hours for the month
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="total_hours" className="text-[#5C6B61] font-medium">Total Hours</Label>
                        <Input
                          id="total_hours"
                          type="number"
                          step="0.5"
                          min="0"
                          placeholder="160"
                          className="mt-1 border-[#EAE6DF] focus:border-[#344E41] focus:ring-[#344E41]"
                          onChange={(e) => {
                            if (e.target.value && parseFloat(e.target.value) > 0) {
                              // Create one entry for the first day of the month
                              const firstDay = `${monthlyForm.month}-01`;
                              setMonthlyForm({
                                ...monthlyForm,
                                entries: [{ date: firstDay, hours: e.target.value }]
                              });
                            }
                          }}
                        />
                      </div>
                      <div>
                        <Label htmlFor="entry_date" className="text-[#5C6B61] font-medium">Date</Label>
                        <Input
                          id="entry_date"
                          type="date"
                          defaultValue={`${monthlyForm.month}-01`}
                          className="mt-1 border-[#EAE6DF] focus:border-[#344E41] focus:ring-[#344E41]"
                          onChange={(e) => {
                            if (monthlyForm.entries.length > 0) {
                              setMonthlyForm({
                                ...monthlyForm,
                                entries: [{ ...monthlyForm.entries[0], date: e.target.value }]
                              });
                            }
                          }}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-[#5C6B61] mt-2">
                      Or split hours across multiple days in the hours table below
                    </p>
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                      className="flex-1 border-[#EAE6DF] text-[#5C6B61] hover:bg-[#F5F3EE]"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-[#344E41] hover:bg-[#2B3A28] text-white"
                    >
                      Log Month
                    </Button>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>
      
      {jobs.length === 0 && (
        <div className="bg-[#FEF6F4] border border-[#E07A5F] p-4 mb-6" data-testid="no-jobs-warning">
          <p className="text-[#E07A5F] text-base">
            You need to add at least one job before you can log hours.
          </p>
        </div>
      )}
      
      {hours.length === 0 ? (
        <div className="bg-white border border-[#EAE6DF] p-12 text-center" data-testid="empty-hours-state">
          <Clock size={48} className="mx-auto mb-4 text-[#A3B18A]" />
          <h3 className="text-xl font-medium text-[#344E41] mb-2" style={{ fontFamily: 'Outfit' }}>
            No hours logged yet
          </h3>
          <p className="text-base text-[#5C6B61]">
            Start logging your working hours to calculate earnings
          </p>
        </div>
      ) : (
        <div className="bg-white border border-[#EAE6DF]" data-testid="hours-table">
          <div className="overflow-x-auto">
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
                {hours.map((log, index) => (
                  <tr 
                    key={log.log_id}
                    data-testid={`hours-row-${index}`}
                    className="border-b border-[#EAE6DF] last:border-b-0 hover:bg-[#FDFCFB]/50"
                  >
                    <td className="px-6 py-4 text-base text-[#1F2937]">
                      {new Date(log.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-base text-[#1F2937]">{log.job_name}</td>
                    <td className="px-6 py-4 text-base text-[#1F2937] text-right">{log.hours_worked}</td>
                    <td className="px-6 py-4 text-base text-[#5C6B61] text-right">
                      ${log.hourly_rate.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-base text-[#3A5A40] text-right font-medium">
                      ${log.calculated_pay.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(log.log_id)}
                        data-testid={`delete-hours-${index}`}
                        className="p-2 text-[#E07A5F] hover:bg-[#FEF6F4] transition-all duration-200"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
