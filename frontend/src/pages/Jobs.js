import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Pencil, Trash2, Briefcase } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [formData, setFormData] = useState({ job_name: '', hourly_rate: '' });
  
  useEffect(() => {
    fetchJobs();
  }, []);
  
  const fetchJobs = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/jobs`, {
        withCredentials: true
      });
      setJobs(response.data);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingJob) {
        await axios.put(
          `${BACKEND_URL}/api/jobs/${editingJob.job_id}`,
          {
            job_name: formData.job_name,
            hourly_rate: parseFloat(formData.hourly_rate)
          },
          { withCredentials: true }
        );
        toast.success('Job updated successfully');
      } else {
        await axios.post(
          `${BACKEND_URL}/api/jobs`,
          {
            job_name: formData.job_name,
            hourly_rate: parseFloat(formData.hourly_rate)
          },
          { withCredentials: true }
        );
        toast.success('Job created successfully');
      }
      
      setDialogOpen(false);
      setFormData({ job_name: '', hourly_rate: '' });
      setEditingJob(null);
      fetchJobs();
    } catch (error) {
      console.error('Failed to save job:', error);
      toast.error('Failed to save job');
    }
  };
  
  const handleEdit = (job) => {
    setEditingJob(job);
    setFormData({
      job_name: job.job_name,
      hourly_rate: job.hourly_rate.toString()
    });
    setDialogOpen(true);
  };
  
  const handleDelete = async (jobId) => {
    if (!window.confirm('Are you sure you want to delete this job?')) return;
    
    try {
      await axios.delete(`${BACKEND_URL}/api/jobs/${jobId}`, {
        withCredentials: true
      });
      toast.success('Job deleted successfully');
      fetchJobs();
    } catch (error) {
      console.error('Failed to delete job:', error);
      toast.error('Failed to delete job');
    }
  };
  
  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingJob(null);
    setFormData({ job_name: '', hourly_rate: '' });
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#344E41]"></div>
      </div>
    );
  }
  
  return (
    <div data-testid="jobs-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 
            className="text-4xl font-semibold tracking-tight text-[#344E41] mb-2" 
            style={{ fontFamily: 'Outfit' }}
          >
            Jobs
          </h1>
          <p className="text-base leading-relaxed text-[#5C6B61]">
            Manage your jobs and hourly rates
          </p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              data-testid="add-job-button"
              className="bg-[#344E41] hover:bg-[#2B3A28] text-white flex items-center gap-2 transition-all duration-200"
              onClick={() => {
                setEditingJob(null);
                setFormData({ job_name: '', hourly_rate: '' });
              }}
            >
              <Plus size={20} />
              Add Job
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white border border-[#EAE6DF]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-medium text-[#344E41]" style={{ fontFamily: 'Outfit' }}>
                {editingJob ? 'Edit Job' : 'Add New Job'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4" data-testid="job-form">
              <div>
                <Label htmlFor="job_name" className="text-[#5C6B61] font-medium">Job Name</Label>
                <Input
                  id="job_name"
                  data-testid="job-name-input"
                  value={formData.job_name}
                  onChange={(e) => setFormData({ ...formData, job_name: e.target.value })}
                  required
                  className="mt-1 border-[#EAE6DF] focus:border-[#344E41] focus:ring-[#344E41]"
                  placeholder="e.g., Web Development"
                />
              </div>
              <div>
                <Label htmlFor="hourly_rate" className="text-[#5C6B61] font-medium">Hourly Rate ($)</Label>
                <Input
                  id="hourly_rate"
                  data-testid="hourly-rate-input"
                  type="number"
                  step="0.01"
                  value={formData.hourly_rate}
                  onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                  required
                  className="mt-1 border-[#EAE6DF] focus:border-[#344E41] focus:ring-[#344E41]"
                  placeholder="25.00"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDialogClose}
                  className="flex-1 border-[#EAE6DF] text-[#5C6B61] hover:bg-[#F5F3EE]"
                  data-testid="cancel-job-button"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-[#344E41] hover:bg-[#2B3A28] text-white"
                  data-testid="submit-job-button"
                >
                  {editingJob ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      {jobs.length === 0 ? (
        <div className="bg-white border border-[#EAE6DF] p-12 text-center" data-testid="empty-jobs-state">
          <Briefcase size={48} className="mx-auto mb-4 text-[#A3B18A]" />
          <h3 className="text-xl font-medium text-[#344E41] mb-2" style={{ fontFamily: 'Outfit' }}>
            No jobs yet
          </h3>
          <p className="text-base text-[#5C6B61]">
            Add your first job to start tracking hours and earnings
          </p>
        </div>
      ) : (
        <div className="bg-white border border-[#EAE6DF]" data-testid="jobs-table">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-[#EAE6DF]">
                <tr className="bg-[#FDFCFB]">
                  <th className="text-left px-6 py-4 text-sm font-medium text-[#5C6B61]">Job Name</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-[#5C6B61]">Hourly Rate</th>
                  <th className="text-center px-6 py-4 text-sm font-medium text-[#5C6B61]">Status</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-[#5C6B61]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job, index) => (
                  <tr 
                    key={job.job_id}
                    data-testid={`job-row-${index}`}
                    className="border-b border-[#EAE6DF] last:border-b-0 hover:bg-[#FDFCFB]/50"
                  >
                    <td className="px-6 py-4 text-base text-[#1F2937]">{job.job_name}</td>
                    <td className="px-6 py-4 text-base text-[#1F2937] text-right font-medium">
                      ${job.hourly_rate.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span 
                        className={`inline-block px-3 py-1 text-sm font-medium ${
                          job.is_active 
                            ? 'bg-[#3A5A40]/10 text-[#3A5A40]' 
                            : 'bg-[#E07A5F]/10 text-[#E07A5F]'
                        }`}
                      >
                        {job.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(job)}
                          data-testid={`edit-job-${index}`}
                          className="p-2 text-[#344E41] hover:bg-[#F5F3EE] transition-all duration-200"
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(job.job_id)}
                          data-testid={`delete-job-${index}`}
                          className="p-2 text-[#E07A5F] hover:bg-[#FEF6F4] transition-all duration-200"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
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
