import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function Hours() {
  const [hours, setHours] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ 
    job_id: '', 
    date: new Date().toISOString().split('T')[0], 
    hours_worked: '' 
  });
  
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
      await axios.post(
        `${BACKEND_URL}/api/hours`,
        {
          job_id: formData.job_id,
          date: formData.date,
          hours_worked: parseFloat(formData.hours_worked)
        },
        { withCredentials: true }
      );
      
      toast.success('Hours logged successfully');
      setDialogOpen(false);
      setFormData({ 
        job_id: '', 
        date: new Date().toISOString().split('T')[0], 
        hours_worked: '' 
      });
      fetchData();
    } catch (error) {
      console.error('Failed to log hours:', error);
      toast.error('Failed to log hours');
    }
  };
  
  const handleDelete = async (logId) => {
    if (!window.confirm('Are you sure you want to delete this hours log?')) return;
    
    try {
      await axios.delete(`${BACKEND_URL}/api/hours/${logId}`, {
        withCredentials: true
      });
      toast.success('Hours log deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Failed to delete hours log:', error);
      toast.error('Failed to delete hours log');
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
            >
              <Plus size={20} />
              Log Hours
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white border border-[#EAE6DF]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-medium text-[#344E41]" style={{ fontFamily: 'Outfit' }}>
                Log Hours Worked
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4" data-testid="hours-form">
              <div>
                <Label htmlFor="job_id" className="text-[#5C6B61] font-medium">Job</Label>
                <Select 
                  value={formData.job_id} 
                  onValueChange={(value) => setFormData({ ...formData, job_id: value })}
                  required
                >
                  <SelectTrigger 
                    id="job_id"
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
                <Label htmlFor="date" className="text-[#5C6B61] font-medium">Date</Label>
                <Input
                  id="date"
                  data-testid="date-input"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                  className="mt-1 border-[#EAE6DF] focus:border-[#344E41] focus:ring-[#344E41]"
                />
              </div>
              <div>
                <Label htmlFor="hours_worked" className="text-[#5C6B61] font-medium">Hours Worked</Label>
                <Input
                  id="hours_worked"
                  data-testid="hours-input"
                  type="number"
                  step="0.5"
                  value={formData.hours_worked}
                  onChange={(e) => setFormData({ ...formData, hours_worked: e.target.value })}
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
