import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Pencil, Trash2, Briefcase, ToggleRight, ToggleLeft } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// EmptyState Component
function EmptyState({ onAddClick }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-20 h-20 rounded-2xl bg-[#F0EDE8] flex items-center justify-center mb-6">
        <Briefcase size={32} className="text-[#A3B18A]" />
      </div>
      <h3 className="text-xl font-medium text-[#344E41] mb-2" style={{ fontFamily: 'Outfit' }}>
        No jobs yet
      </h3>
      <p className="text-base text-[#5C6B61] mb-6 text-center max-w-sm">
        Add your first job to start tracking hours and earnings
      </p>
      <Button
        onClick={onAddClick}
        className="bg-[#344E41] hover:bg-[#2B3A28] text-white flex items-center gap-2 rounded-lg"
      >
        <Plus size={18} />
        Add your first job
      </Button>
    </div>
  );
}

// Skeleton Card Component
function SkeletonJobCard() {
  return (
    <div className="bg-white border border-[#EAE6DF] rounded-xl p-5 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className="space-y-2 flex-1">
          <div className="h-5 w-32 bg-[#E8E5DF] rounded animate-pulse" />
          <div className="h-4 w-20 bg-[#E8E5DF] rounded animate-pulse" />
        </div>
        <div className="h-8 w-8 bg-[#E8E5DF] rounded-full animate-pulse" />
      </div>
      <div className="h-6 w-24 bg-[#E8E5DF] rounded animate-pulse" />
    </div>
  );
}

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [formData, setFormData] = useState({ job_name: '', hourly_rate: '' });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState(null);
  
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
  
  const handleDeleteClick = (job) => {
    setJobToDelete(job);
    setDeleteDialogOpen(true);
  };
  
  const handleDeleteConfirm = async () => {
    if (!jobToDelete) return;
    
    try {
      await axios.delete(`${BACKEND_URL}/api/jobs/${jobToDelete.job_id}`, {
        withCredentials: true
      });
      toast.success('Job deleted successfully');
      fetchJobs();
    } catch (error) {
      console.error('Failed to delete job:', error);
      toast.error('Failed to delete job');
    } finally {
      setDeleteDialogOpen(false);
      setJobToDelete(null);
    }
  };
  
  const handleToggleActive = async (job) => {
    try {
      await axios.put(
        `${BACKEND_URL}/api/jobs/${job.job_id}`,
        {
          job_name: job.job_name,
          hourly_rate: job.hourly_rate,
          is_active: !job.is_active
        },
        { withCredentials: true }
      );
      toast.success(`Job ${job.is_active ? 'deactivated' : 'activated'} successfully`);
      fetchJobs();
    } catch (error) {
      console.error('Failed to toggle job status:', error);
      toast.error('Failed to update job status');
    }
  };
  
  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingJob(null);
    setFormData({ job_name: '', hourly_rate: '' });
  };
  
  const activeJobs = jobs.filter(job => job.is_active);
  const inactiveJobs = jobs.filter(job => !job.is_active);
  
  if (loading) {
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
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <SkeletonJobCard />
          <SkeletonJobCard />
          <SkeletonJobCard />
        </div>
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
              className="bg-[#344E41] hover:bg-[#2B3A28] text-white flex items-center gap-2 transition-all duration-200 rounded-lg text-sm"
              onClick={() => {
                setEditingJob(null);
                setFormData({ job_name: '', hourly_rate: '' });
              }}
            >
              <Plus size={18} />
              Add Job
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white border border-[#EAE6DF] rounded-xl">
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
                  className="mt-1 border-[#EAE6DF] focus:border-[#344E41] focus:ring-[#344E41] rounded-lg"
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
                  className="mt-1 border-[#EAE6DF] focus:border-[#344E41] focus:ring-[#344E41] rounded-lg"
                  placeholder="25.00"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDialogClose}
                  className="flex-1 border-[#EAE6DF] text-[#5C6B61] hover:bg-[#F5F3EE] rounded-lg text-sm"
                  data-testid="cancel-job-button"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-[#344E41] hover:bg-[#2B3A28] text-white rounded-lg text-sm"
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
        <div className="bg-white border border-[#EAE6DF] rounded-xl shadow-sm" data-testid="empty-jobs-state">
          <EmptyState onAddClick={() => setDialogOpen(true)} />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Active Jobs Section */}
          {activeJobs.length > 0 && (
            <div>
              <h2 className="text-xs font-medium text-[#5C6B61] uppercase tracking-wider mb-4">
                Active ({activeJobs.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeJobs.map((job, index) => (
                  <div
                    key={job.job_id}
                    data-testid={`job-row-${index}`}
                    className="group bg-white border border-[#EAE6DF] rounded-xl p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-[2px]"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-[#344E41] truncate" style={{ fontFamily: 'Outfit' }}>
                          {job.job_name}
                        </h3>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#3A5A40]/10 text-[#3A5A40] mt-2">
                          Active
                        </span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEdit(job)}
                          data-testid={`edit-job-${index}`}
                          className="p-2 text-[#5C6B61] hover:bg-[#F5F3EE] rounded-lg transition-colors"
                          title="Edit job"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleToggleActive(job)}
                          className="p-2 text-[#5C6B61] hover:bg-[#F5F3EE] rounded-lg transition-colors"
                          title="Deactivate job"
                        >
                          <ToggleRight size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(job)}
                          data-testid={`delete-job-${index}`}
                          className="p-2 text-[#E07A5F] hover:bg-[#FEF6F4] rounded-lg transition-colors"
                          title="Delete job"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <p className="text-2xl font-semibold text-[#344E41]" style={{ fontFamily: 'Outfit' }}>
                      ${job.hourly_rate.toFixed(2)}
                      <span className="text-sm font-normal text-[#5C6B61] ml-1">/hr</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Inactive Jobs Section */}
          {inactiveJobs.length > 0 && (
            <div>
              <h2 className="text-xs font-medium text-[#5C6B61] uppercase tracking-wider mb-4">
                Inactive ({inactiveJobs.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {inactiveJobs.map((job, index) => (
                  <div
                    key={job.job_id}
                    data-testid={`inactive-job-row-${index}`}
                    className="group bg-white border border-[#EAE6DF] rounded-xl p-5 shadow-sm opacity-75 transition-all duration-200 hover:shadow-md hover:opacity-100"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-[#5C6B61] truncate" style={{ fontFamily: 'Outfit' }}>
                          {job.job_name}
                        </h3>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#E07A5F]/10 text-[#E07A5F] mt-2">
                          Inactive
                        </span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEdit(job)}
                          className="p-2 text-[#5C6B61] hover:bg-[#F5F3EE] rounded-lg transition-colors"
                          title="Edit job"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleToggleActive(job)}
                          className="p-2 text-[#5C6B61] hover:bg-[#F5F3EE] rounded-lg transition-colors"
                          title="Activate job"
                        >
                          <ToggleLeft size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(job)}
                          className="p-2 text-[#E07A5F] hover:bg-[#FEF6F4] rounded-lg transition-colors"
                          title="Delete job"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <p className="text-2xl font-semibold text-[#5C6B61]" style={{ fontFamily: 'Outfit' }}>
                      ${job.hourly_rate.toFixed(2)}
                      <span className="text-sm font-normal text-[#8A9E90] ml-1">/hr</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-white border border-[#EAE6DF] rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-medium text-[#344E41]" style={{ fontFamily: 'Outfit' }}>
              Delete Job
            </DialogTitle>
            <DialogDescription className="text-[#5C6B61]">
              Are you sure you want to delete <strong className="text-[#344E41]">{jobToDelete?.job_name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="flex-1 border-[#EAE6DF] text-[#5C6B61] hover:bg-[#F5F3EE] rounded-lg text-sm"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              className="flex-1 bg-[#E07A5F] hover:bg-[#C85A3F] text-white rounded-lg text-sm"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
