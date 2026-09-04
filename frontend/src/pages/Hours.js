import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { CalendarDays, Clock, Plus, Trash2, Wallet } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  EmptyWorkspaceState,
  MetricPanel,
  PageHero,
  SectionHeading,
} from '@/components/ProductUI';
import {
  formatCompactCurrency,
  formatCurrency,
  formatHours,
  formatInteger,
  formatMonthLabel,
  formatShortDate,
} from '@/lib/formatters';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

function getMonday(date) {
  const clone = new Date(date);
  const day = clone.getDay();
  const diff = clone.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(clone.setDate(diff));
}

function getDateForDay(weekStart, dayOffset) {
  const date = new Date(weekStart);
  date.setDate(date.getDate() + dayOffset);
  return date.toISOString().split('T')[0];
}

function HoursSkeletonPanel() {
  return (
    <div className="app-panel-solid rounded-[32px] p-6 md:p-8">
      <div className="mb-6 h-5 w-32 rounded-full bg-[#ece5d8] animate-pulse" />
      <div className="space-y-4">
        <div className="h-20 rounded-[24px] bg-[#f2eadf] animate-pulse" />
        <div className="h-20 rounded-[24px] bg-[#efe6da] animate-pulse" />
        <div className="h-20 rounded-[24px] bg-[#f2eadf] animate-pulse" />
      </div>
    </div>
  );
}

const weekdayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function Hours() {
  const [hours, setHours] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [entryMode, setEntryMode] = useState('daily');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [logToDelete, setLogToDelete] = useState(null);

  const [dailyForm, setDailyForm] = useState({
    job_id: '',
    date: new Date().toISOString().split('T')[0],
    hours_worked: '',
  });
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
      sunday: '',
    },
  });
  const [monthlyForm, setMonthlyForm] = useState({
    job_id: '',
    month: new Date().toISOString().slice(0, 7),
    entries: [],
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [hoursRes, jobsRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/hours`, { withCredentials: true }),
        axios.get(`${BACKEND_URL}/api/jobs`, { withCredentials: true }),
      ]);
      setHours(hoursRes.data);
      setJobs(jobsRes.data.filter((job) => job.is_active));
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const resetForms = () => {
    setDailyForm({
      job_id: '',
      date: new Date().toISOString().split('T')[0],
      hours_worked: '',
    });
    setWeeklyForm({
      job_id: '',
      week_start: getMonday(new Date()).toISOString().split('T')[0],
      days: {
        monday: '',
        tuesday: '',
        wednesday: '',
        thursday: '',
        friday: '',
        saturday: '',
        sunday: '',
      },
    });
    setMonthlyForm({
      job_id: '',
      month: new Date().toISOString().slice(0, 7),
      entries: [],
    });
    setEntryMode('daily');
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
            hours_worked: parseFloat(dailyForm.hours_worked),
          },
          { withCredentials: true }
        );
        toast.success('Hours logged successfully');
      } else if (entryMode === 'weekly') {
        const dayMap = {
          monday: 0,
          tuesday: 1,
          wednesday: 2,
          thursday: 3,
          friday: 4,
          saturday: 5,
          sunday: 6,
        };
        const requests = [];

        for (const [day, value] of Object.entries(weeklyForm.days)) {
          if (value && parseFloat(value) > 0) {
            requests.push(
              axios.post(
                `${BACKEND_URL}/api/hours`,
                {
                  job_id: weeklyForm.job_id,
                  date: getDateForDay(weeklyForm.week_start, dayMap[day]),
                  hours_worked: parseFloat(value),
                },
                { withCredentials: true }
              )
            );
          }
        }

        if (requests.length === 0) {
          toast.error('Please enter hours for at least one day');
          return;
        }

        await Promise.all(requests);
        toast.success(`${requests.length} day(s) logged successfully`);
      } else {
        const totalHours = parseFloat(monthlyForm.entries[0]?.hours);
        if (!totalHours || totalHours <= 0) {
          toast.error('Please enter a total greater than zero');
          return;
        }
        await axios.post(
          `${BACKEND_URL}/api/hours/monthly`,
          { job_id: monthlyForm.job_id, month: monthlyForm.month, total_hours: totalHours },
          { withCredentials: true }
        );
        toast.success('Monthly total logged successfully');
      }

      setDialogOpen(false);
      resetForms();
      fetchData();
    } catch (error) {
      console.error('Failed to log hours:', error);
      toast.error('Failed to log hours');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!logToDelete) {
      return;
    }

    try {
      await axios.delete(`${BACKEND_URL}/api/hours/${logToDelete.log_id}`, {
        withCredentials: true,
      });
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

  const weekTotal = Object.values(weeklyForm.days).reduce(
    (sum, value) => sum + (parseFloat(value) || 0),
    0
  );
  const selectedWeeklyJob = jobs.find((job) => job.job_id === weeklyForm.job_id);
  const selectedDailyJob = jobs.find((job) => job.job_id === dailyForm.job_id);
  const monthlySelectedJob = jobs.find((job) => job.job_id === monthlyForm.job_id);
  const weeklyEstimatedEarnings = weekTotal * (selectedWeeklyJob?.hourly_rate || 0);
  const dailyEstimatedEarnings =
    (parseFloat(dailyForm.hours_worked) || 0) * (selectedDailyJob?.hourly_rate || 0);
  const monthlyEstimatedEarnings =
    (parseFloat(monthlyForm.entries[0]?.hours) || 0) * (monthlySelectedJob?.hourly_rate || 0);

  const groupedHours = hours.reduce((accumulator, log) => {
    const month = log.date.slice(0, 7);
    if (!accumulator[month]) {
      accumulator[month] = [];
    }
    accumulator[month].push(log);
    return accumulator;
  }, {});

  const sortedMonths = Object.keys(groupedHours).sort().reverse();
  const totalHours = hours.reduce((sum, log) => sum + log.hours_worked, 0);
  const totalEarnings = hours.reduce((sum, log) => sum + log.calculated_pay, 0);
  const trackedClients = new Set(hours.map((log) => log.job_name)).size;

  if (loading) {
    return (
      <div className="space-y-6" data-testid="hours-page">
        <PageHero
          eyebrow="Time Tracking"
          title="Hours worked"
          description="Capture time in the rhythm that fits your week and keep earnings current."
        />
        <HoursSkeletonPanel />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="hours-page">
      <PageHero
        eyebrow="Time Tracking"
        title="Hours worked"
        description="Capture work quickly, estimate earnings instantly, and keep each month ready for invoices."
        actions={
          <>
            <span className="status-chip status-chip-positive">{formatHours(totalHours)}</span>
            <span className="status-chip status-chip-neutral">{formatCurrency(totalEarnings)} earned</span>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <MetricPanel
            icon={Clock}
            label="Total hours"
            value={formatHours(totalHours)}
            detail="All logged hours across your active clients."
            testId="metric-hours-summary"
          />
          <MetricPanel
            icon={Wallet}
            label="Estimated earnings"
            value={formatCurrency(totalEarnings)}
            detail="Calculated directly from logged time and rates."
            tone="fresh"
          />
          <MetricPanel
            icon={CalendarDays}
            label="Tracked months"
            value={formatInteger(sortedMonths.length)}
            detail={`${formatInteger(trackedClients)} client${trackedClients === 1 ? '' : 's'} represented in your log history.`}
            tone="warm"
          />
        </div>
      </PageHero>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {jobs.length === 0 ? (
          <div
            className="app-panel rounded-[26px] px-4 py-3 text-sm leading-6 text-[#5a6d61]"
            data-testid="no-jobs-warning"
          >
            You need at least one active job before you can log hours.{' '}
            <Link to="/jobs" className="font-semibold text-[#173229] underline">
              Add a job now
            </Link>
          </div>
        ) : (
          <div className="app-panel rounded-[26px] px-4 py-3 text-sm leading-6 text-[#5a6d61]">
            Pick the fastest entry mode for the week: a daily log, a weekly batch, or a quick month total.
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              data-testid="log-hours-button"
              disabled={jobs.length === 0}
              onClick={resetForms}
            >
              <Plus size={18} />
              Log Hours
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="text-2xl text-[#173229]" style={{ fontFamily: 'Outfit' }}>
                Log hours worked
              </DialogTitle>
              <DialogDescription>
                Choose the entry style that matches how you keep time this week.
              </DialogDescription>
            </DialogHeader>

            <Tabs value={entryMode} onValueChange={setEntryMode} className="w-full">
              <TabsList className="mb-5 grid w-full grid-cols-3">
                <TabsTrigger value="daily">Daily</TabsTrigger>
                <TabsTrigger value="weekly">Weekly</TabsTrigger>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
              </TabsList>

              <TabsContent value="daily">
                <form onSubmit={handleSubmit} className="space-y-5" data-testid="hours-form">
                  <div className="app-panel rounded-[28px] p-4 grid gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <Label htmlFor="daily_job_id" className="text-sm font-semibold text-[#4c6154]">
                        Job
                      </Label>
                      <Select
                        value={dailyForm.job_id}
                        onValueChange={(value) => setDailyForm({ ...dailyForm, job_id: value })}
                        required
                      >
                        <SelectTrigger id="daily_job_id" data-testid="job-select" className="mt-2">
                          <SelectValue placeholder="Select a job" />
                        </SelectTrigger>
                        <SelectContent>
                          {jobs.map((job) => (
                            <SelectItem key={job.job_id} value={job.job_id}>
                              {job.job_name} - {formatCurrency(job.hourly_rate)}/hr
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="daily_date" className="text-sm font-semibold text-[#4c6154]">
                        Date
                      </Label>
                      <Input
                        id="daily_date"
                        data-testid="date-input"
                        type="date"
                        value={dailyForm.date}
                        onChange={(e) => setDailyForm({ ...dailyForm, date: e.target.value })}
                        required
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="daily_hours" className="text-sm font-semibold text-[#4c6154]">
                        Hours worked
                      </Label>
                      <Input
                        id="daily_hours"
                        data-testid="hours-input"
                        type="number"
                        step="0.5"
                        min="0"
                        value={dailyForm.hours_worked}
                        onChange={(e) => setDailyForm({ ...dailyForm, hours_worked: e.target.value })}
                        required
                        className="mt-2"
                        placeholder="8.0"
                      />
                    </div>
                  </div>

                  {dailyForm.job_id && dailyForm.hours_worked ? (
                    <div className="app-panel rounded-[26px] px-4 py-4 text-sm text-[#5a6d61]">
                      Estimated earnings for this entry:{' '}
                      <strong className="text-[#173229]">{formatCurrency(dailyEstimatedEarnings)}</strong>
                    </div>
                  ) : null}

                  <DialogFooter className="flex gap-3 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                      className="flex-1"
                      data-testid="cancel-hours-button"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1" data-testid="submit-hours-button">
                      Log Hours
                    </Button>
                  </DialogFooter>
                </form>
              </TabsContent>

              <TabsContent value="weekly">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="app-panel rounded-[28px] p-4 space-y-4">
                    <div>
                      <Label htmlFor="weekly_job_id" className="text-sm font-semibold text-[#4c6154]">
                        Job
                      </Label>
                      <Select
                        value={weeklyForm.job_id}
                        onValueChange={(value) => setWeeklyForm({ ...weeklyForm, job_id: value })}
                        required
                      >
                        <SelectTrigger id="weekly_job_id" className="mt-2">
                          <SelectValue placeholder="Select a job" />
                        </SelectTrigger>
                        <SelectContent>
                          {jobs.map((job) => (
                            <SelectItem key={job.job_id} value={job.job_id}>
                              {job.job_name} - {formatCurrency(job.hourly_rate)}/hr
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="week_start" className="text-sm font-semibold text-[#4c6154]">
                        Week starting
                      </Label>
                      <Input
                        id="week_start"
                        type="date"
                        value={weeklyForm.week_start}
                        onChange={(e) => {
                          const monday = getMonday(new Date(e.target.value));
                          setWeeklyForm({
                            ...weeklyForm,
                            week_start: monday.toISOString().split('T')[0],
                          });
                        }}
                        required
                        className="mt-2"
                      />
                      <p className="mt-2 text-sm text-[#5a6d61]">Week starts on Monday.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 md:grid-cols-7">
                      {weekdayKeys.map((day, index) => (
                        <div key={day}>
                          <Label htmlFor={`weekly_${day}`} className="text-xs font-semibold uppercase tracking-[0.18em] text-[#607166]">
                            {weekdayLabels[index]}
                          </Label>
                          <Input
                            id={`weekly_${day}`}
                            type="number"
                            step="0.5"
                            min="0"
                            value={weeklyForm.days[day]}
                            onChange={(e) =>
                              setWeeklyForm({
                                ...weeklyForm,
                                days: { ...weeklyForm.days, [day]: e.target.value },
                              })
                            }
                            className="mt-2 h-11"
                            placeholder="0"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {weekTotal > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      <MetricPanel
                        icon={Clock}
                        label="Week total"
                        value={formatHours(weekTotal)}
                        detail="Combined from the daily entries you entered above."
                      />
                      <MetricPanel
                        icon={Wallet}
                        label="Estimated earnings"
                        value={formatCurrency(weeklyEstimatedEarnings)}
                        detail="Calculated from the selected hourly rate."
                        tone="fresh"
                      />
                    </div>
                  ) : null}

                  <DialogFooter className="flex gap-3 pt-1">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1">
                      Log Week
                    </Button>
                  </DialogFooter>
                </form>
              </TabsContent>

              <TabsContent value="monthly">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="app-panel rounded-[28px] p-4 space-y-4">
                    <div>
                      <Label htmlFor="monthly_job_id" className="text-sm font-semibold text-[#4c6154]">
                        Job
                      </Label>
                      <Select
                        value={monthlyForm.job_id}
                        onValueChange={(value) => setMonthlyForm({ ...monthlyForm, job_id: value })}
                        required
                      >
                        <SelectTrigger id="monthly_job_id" className="mt-2">
                          <SelectValue placeholder="Select a job" />
                        </SelectTrigger>
                        <SelectContent>
                          {jobs.map((job) => (
                            <SelectItem key={job.job_id} value={job.job_id}>
                              {job.job_name} - {formatCurrency(job.hourly_rate)}/hr
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label htmlFor="month" className="text-sm font-semibold text-[#4c6154]">
                          Month
                        </Label>
                        <Input
                          id="month"
                          type="month"
                          value={monthlyForm.month}
                          onChange={(e) => setMonthlyForm({ ...monthlyForm, month: e.target.value })}
                          required
                          className="mt-2"
                        />
                      </div>

                      <div className="rounded-[20px] border border-[#dbe3da] bg-white/60 px-4 py-3 text-sm leading-6 text-[#5a6d61]">
                        The entry covers the entire calendar month and is stored as one aggregate record.
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="total_hours" className="text-sm font-semibold text-[#4c6154]">
                        Total hours
                      </Label>
                      <Input
                        id="total_hours"
                        type="number"
                        step="0.5"
                        min="0"
                        placeholder="160"
                        className="mt-2"
                        onChange={(e) => {
                          if (e.target.value && parseFloat(e.target.value) > 0) {
                            const firstDay = `${monthlyForm.month}-01`;
                            setMonthlyForm({
                              ...monthlyForm,
                              entries: [{ date: firstDay, hours: e.target.value }],
                            });
                          } else {
                            setMonthlyForm({ ...monthlyForm, entries: [] });
                          }
                        }}
                      />
                      <p className="mt-2 text-sm text-[#5a6d61]">
                        Quick entry records the whole month in a single line item.
                      </p>
                    </div>
                  </div>

                  {monthlyForm.entries.length > 0 ? (
                    <div className="app-panel rounded-[26px] px-4 py-4 text-sm text-[#5a6d61]">
                      Estimated earnings for {formatMonthLabel(monthlyForm.month).toLowerCase()}:{' '}
                      <strong className="text-[#173229]">{formatCurrency(monthlyEstimatedEarnings)}</strong>
                    </div>
                  ) : null}

                  <DialogFooter className="flex gap-3 pt-1">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1">
                      Log Month
                    </Button>
                  </DialogFooter>
                </form>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {hours.length === 0 ? (
        <EmptyWorkspaceState
          icon={Clock}
          title="No hours logged yet"
          description="Start recording work to calculate earnings and prepare clean invoices later."
          testId="empty-hours-state"
          action={
            jobs.length > 0 ? (
              <Button
                onClick={() => {
                  resetForms();
                  setDialogOpen(true);
                }}
              >
                <Plus size={18} />
                Log your first hours
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="space-y-6">
          {sortedMonths.map((month) => {
            const monthLogs = groupedHours[month].sort(
              (left, right) => new Date(right.date) - new Date(left.date)
            );
            const monthHours = monthLogs.reduce((sum, log) => sum + log.hours_worked, 0);
            const monthPay = monthLogs.reduce((sum, log) => sum + log.calculated_pay, 0);

            return (
              <section key={month} className="app-panel-solid rounded-[32px] p-6 md:p-8" data-testid="hours-table">
                <SectionHeading
                  eyebrow="Monthly Log"
                  title={formatMonthLabel(month)}
                  description="Grouped by month so your billing periods stay easy to scan."
                  meta={
                    <div className="status-chip status-chip-neutral">
                      {formatHours(monthHours)} • {formatCompactCurrency(monthPay)}
                    </div>
                  }
                />

                <div className="mt-6 space-y-3">
                  {monthLogs.map((log, index) => (
                    <div
                      key={log.log_id}
                      data-testid={`hours-row-${index}`}
                      className="app-panel rounded-[26px] px-4 py-4"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-start gap-4">
                          <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-[#173229]/8 text-[#173229]">
                            <Clock size={18} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#607166]">
                              {log.entry_type === 'range'
                                ? `${formatShortDate(log.start_date)} – ${formatShortDate(log.end_date)}`
                                : formatShortDate(log.date)}
                            </p>
                            <h3 className="mt-2 text-xl font-semibold tracking-tight text-[#173229]" style={{ fontFamily: 'Outfit' }}>
                              {log.job_name}
                            </h3>
                            <p className="mt-1 text-sm text-[#5a6d61]">
                              {log.hours_worked} hour{log.hours_worked === 1 ? '' : 's'} at{' '}
                              {formatCurrency(log.hours_worked > 0 ? log.calculated_pay / log.hours_worked : 0)}/hr
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 md:gap-4">
                          <div className="text-right">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#607166]">
                              Earnings
                            </p>
                            <p className="mt-2 text-2xl font-semibold tracking-tight text-[#173229]" style={{ fontFamily: 'Outfit' }}>
                              {formatCurrency(log.calculated_pay)}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setLogToDelete(log);
                              setDeleteDialogOpen(true);
                            }}
                            data-testid={`delete-hours-${index}`}
                            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#efc4b4] bg-[#fff7f4] text-[#8a4d36] transition-all hover:-translate-y-0.5 hover:bg-[#fff1eb]"
                            title="Delete hours entry"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl text-[#173229]" style={{ fontFamily: 'Outfit' }}>
              Delete hours entry
            </DialogTitle>
            <DialogDescription>
              Remove the entry for <strong className="text-[#173229]">{logToDelete?.job_name}</strong> on{' '}
            {logToDelete
              ? logToDelete.entry_type === 'range'
                ? `${new Date(logToDelete.start_date).toLocaleDateString()} to ${new Date(logToDelete.end_date).toLocaleDateString()}`
                : new Date(logToDelete.date).toLocaleDateString()
              : ''}. This cannot be undone.
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
