import { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Briefcase,
  Pencil,
  Plus,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Wallet,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  EmptyWorkspaceState,
  MetricPanel,
  PageHero,
  SectionHeading,
} from '@/components/ProductUI';
import { formatCurrency, formatInteger } from '@/lib/formatters';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function SkeletonJobCard() {
  return (
    <div className="app-panel-solid rounded-[30px] p-6">
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <div className="h-4 w-24 rounded-full bg-[#ece5d8] animate-pulse" />
          <div className="h-9 w-36 rounded-full bg-[#e5ded2] animate-pulse" />
          <div className="h-3 w-28 rounded-full bg-[#f0e8db] animate-pulse" />
        </div>
        <div className="h-12 w-12 rounded-[16px] bg-[#ece5d8] animate-pulse" />
      </div>
      <div className="mt-6 flex gap-2">
        <div className="h-10 flex-1 rounded-full bg-[#efe7da] animate-pulse" />
        <div className="h-10 w-10 rounded-full bg-[#efe7da] animate-pulse" />
      </div>
    </div>
  );
}

function JobCard({
  job,
  index,
  onEdit,
  onToggle,
  onDelete,
  inactive = false,
}) {
  return (
    <article
      className="app-panel-solid rounded-[30px] p-5 md:p-6"
      data-testid={inactive ? `inactive-job-row-${index}` : `job-row-${index}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className={`status-chip ${inactive ? 'status-chip-warm' : 'status-chip-positive'}`}>
            {inactive ? 'Inactive' : 'Active'}
          </span>
          <h3
            className={`mt-4 text-2xl font-semibold tracking-tight ${inactive ? 'text-[#395145]' : 'text-[#173229]'}`}
            style={{ fontFamily: 'Outfit' }}
          >
            {job.job_name}
          </h3>
          <p className="mt-2 text-sm leading-6 text-[#5a6d61]">
            {inactive
              ? 'Paused for now, but kept here so the rate history stays intact.'
              : 'Available for hours, invoices, and payment tracking.'}
          </p>
        </div>

        <div
          className={`flex h-12 w-12 items-center justify-center rounded-[16px] ${
            inactive ? 'bg-[#f3c5b7]/40 text-[#8a4d36]' : 'bg-[#173229]/8 text-[#173229]'
          }`}
        >
          <Briefcase size={20} />
        </div>
      </div>

      <div className="mt-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#607166]">
            Hourly rate
          </p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-[#173229]" style={{ fontFamily: 'Outfit' }}>
            {formatCurrency(job.hourly_rate)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(job)}
            data-testid={inactive ? undefined : `edit-job-${index}`}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-border/80 bg-white/80 text-[#355247] transition-all hover:-translate-y-0.5 hover:bg-white"
            title="Edit job"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => onToggle(job)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-border/80 bg-white/80 text-[#355247] transition-all hover:-translate-y-0.5 hover:bg-white"
            title={inactive ? 'Activate job' : 'Deactivate job'}
          >
            {inactive ? <ToggleLeft size={18} /> : <ToggleRight size={18} />}
          </button>
          <button
            onClick={() => onDelete(job)}
            data-testid={inactive ? undefined : `delete-job-${index}`}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#efc4b4] bg-[#fff7f4] text-[#8a4d36] transition-all hover:-translate-y-0.5 hover:bg-[#fff1eb]"
            title="Delete job"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </article>
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
        withCredentials: true,
      });
      setJobs(response.data);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ job_name: '', hourly_rate: '' });
    setEditingJob(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        job_name: formData.job_name,
        hourly_rate: parseFloat(formData.hourly_rate),
      };

      if (editingJob) {
        await axios.put(`${BACKEND_URL}/api/jobs/${editingJob.job_id}`, payload, {
          withCredentials: true,
        });
        toast.success('Job updated successfully');
      } else {
        await axios.post(`${BACKEND_URL}/api/jobs`, payload, {
          withCredentials: true,
        });
        toast.success('Job created successfully');
      }

      setDialogOpen(false);
      resetForm();
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
      hourly_rate: job.hourly_rate.toString(),
    });
    setDialogOpen(true);
  };

  const handleToggleActive = async (job) => {
    try {
      await axios.put(
        `${BACKEND_URL}/api/jobs/${job.job_id}`,
        {
          job_name: job.job_name,
          hourly_rate: job.hourly_rate,
          is_active: !job.is_active,
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

  const handleDeleteConfirm = async () => {
    if (!jobToDelete) {
      return;
    }

    try {
      await axios.delete(`${BACKEND_URL}/api/jobs/${jobToDelete.job_id}`, {
        withCredentials: true,
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

  const activeJobs = jobs.filter((job) => job.is_active);
  const inactiveJobs = jobs.filter((job) => !job.is_active);
  const averageRate = activeJobs.length
    ? activeJobs.reduce((sum, job) => sum + job.hourly_rate, 0) / activeJobs.length
    : jobs.length
      ? jobs.reduce((sum, job) => sum + job.hourly_rate, 0) / jobs.length
      : 0;

  if (loading) {
    return (
      <div className="space-y-6" data-testid="jobs-page">
        <PageHero
          eyebrow="Client Setup"
          title="Jobs"
          description="Keep each client engagement tidy, active, and ready for tracking."
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <SkeletonJobCard />
          <SkeletonJobCard />
          <SkeletonJobCard />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="jobs-page">
      <PageHero
        eyebrow="Client Setup"
        title="Jobs"
        description="Manage the engagements that feed your hours, payments, and invoice history."
        actions={
          <>
            <span className="status-chip status-chip-positive">
              {formatInteger(activeJobs.length)} active
            </span>
            <span className="status-chip status-chip-neutral">
              {formatCurrency(averageRate)} average rate
            </span>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <MetricPanel
            icon={Briefcase}
            label="All jobs"
            value={formatInteger(jobs.length)}
            detail="Every engagement saved in your workspace."
          />
          <MetricPanel
            icon={Wallet}
            label="Active jobs"
            value={formatInteger(activeJobs.length)}
            detail="Ready for hours, invoices, and payment updates."
            tone="fresh"
          />
          <MetricPanel
            icon={ToggleLeft}
            label="Inactive jobs"
            value={formatInteger(inactiveJobs.length)}
            detail="Paused but still preserved for historical records."
            tone="warm"
          />
        </div>
      </PageHero>

      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              data-testid="add-job-button"
              onClick={() => resetForm()}
            >
              <Plus size={18} />
              Add Job
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="text-2xl text-[#173229]" style={{ fontFamily: 'Outfit' }}>
                {editingJob ? 'Edit job' : 'Add new job'}
              </DialogTitle>
              <DialogDescription>
                Save the client name and hourly rate so the rest of your workspace can stay in sync.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-5" data-testid="job-form">
              <div className="app-panel rounded-[28px] p-4 space-y-4">
                <div>
                  <Label htmlFor="job_name" className="text-sm font-semibold text-[#4c6154]">
                    Job name
                  </Label>
                  <Input
                    id="job_name"
                    data-testid="job-name-input"
                    value={formData.job_name}
                    onChange={(e) => setFormData({ ...formData, job_name: e.target.value })}
                    required
                    className="mt-2"
                    placeholder="e.g., Web Development"
                  />
                </div>

                <div>
                  <Label htmlFor="hourly_rate" className="text-sm font-semibold text-[#4c6154]">
                    Hourly rate
                  </Label>
                  <Input
                    id="hourly_rate"
                    data-testid="hourly-rate-input"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.hourly_rate}
                    onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                    required
                    className="mt-2"
                    placeholder="85.00"
                  />
                </div>
              </div>

              <DialogFooter className="flex gap-3 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    resetForm();
                  }}
                  className="flex-1"
                  data-testid="cancel-job-button"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  data-testid="submit-job-button"
                >
                  {editingJob ? 'Update job' : 'Create job'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {jobs.length === 0 ? (
        <EmptyWorkspaceState
          icon={Briefcase}
          title="No jobs yet"
          description="Add your first client engagement to start tracking hours, payments, and invoices in one place."
          testId="empty-jobs-state"
          action={
            <Button
              onClick={() => {
                resetForm();
                setDialogOpen(true);
              }}
            >
              <Plus size={18} />
              Add your first job
            </Button>
          }
        />
      ) : (
        <div className="space-y-8">
          {activeJobs.length > 0 && (
            <section className="app-panel-solid rounded-[32px] p-6 md:p-8">
              <SectionHeading
                eyebrow="Active"
                title={`${formatInteger(activeJobs.length)} active job${activeJobs.length !== 1 ? 's' : ''}`}
                description="These jobs are live and ready to receive new hours, invoices, and payments."
              />
              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {activeJobs.map((job, index) => (
                  <JobCard
                    key={job.job_id}
                    job={job}
                    index={index}
                    onEdit={handleEdit}
                    onToggle={handleToggleActive}
                    onDelete={(selectedJob) => {
                      setJobToDelete(selectedJob);
                      setDeleteDialogOpen(true);
                    }}
                  />
                ))}
              </div>
            </section>
          )}

          {inactiveJobs.length > 0 && (
            <section className="app-panel-solid rounded-[32px] p-6 md:p-8">
              <SectionHeading
                eyebrow="Archived"
                title={`${formatInteger(inactiveJobs.length)} inactive job${inactiveJobs.length !== 1 ? 's' : ''}`}
                description="Paused engagements remain available so your history and rate references stay intact."
              />
              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {inactiveJobs.map((job, index) => (
                  <JobCard
                    key={job.job_id}
                    job={job}
                    index={index}
                    inactive
                    onEdit={handleEdit}
                    onToggle={handleToggleActive}
                    onDelete={(selectedJob) => {
                      setJobToDelete(selectedJob);
                      setDeleteDialogOpen(true);
                    }}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl text-[#173229]" style={{ fontFamily: 'Outfit' }}>
              Delete job
            </DialogTitle>
            <DialogDescription>
              Remove <strong className="text-[#173229]">{jobToDelete?.job_name}</strong> permanently. This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex gap-3 pt-1">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleDeleteConfirm} variant="destructive" className="flex-1">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
