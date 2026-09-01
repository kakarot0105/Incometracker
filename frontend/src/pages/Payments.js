import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { CreditCard, Download, Plus, ReceiptText, Trash2, Wallet } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
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

function PaymentsSkeletonPanel() {
  return (
    <div className="app-panel-solid rounded-[32px] p-6 md:p-8">
      <div className="mb-6 h-5 w-28 rounded-full bg-[#ece5d8] animate-pulse" />
      <div className="space-y-4">
        <div className="h-20 rounded-[24px] bg-[#f1eadf] animate-pulse" />
        <div className="h-20 rounded-[24px] bg-[#ede4d8] animate-pulse" />
        <div className="h-20 rounded-[24px] bg-[#f1eadf] animate-pulse" />
      </div>
    </div>
  );
}

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [hoursLogs, setHoursLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [entryMode, setEntryMode] = useState('single');
  const [generatingStatement, setGeneratingStatement] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState(null);

  const [singleForm, setSingleForm] = useState({
    job_id: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [monthlyPaymentForm, setMonthlyPaymentForm] = useState({
    job_id: '',
    month: new Date().toISOString().slice(0, 7),
    amount_received: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [paymentsRes, jobsRes, hoursRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/payments`, { withCredentials: true }),
        axios.get(`${BACKEND_URL}/api/jobs`, { withCredentials: true }),
        axios.get(`${BACKEND_URL}/api/hours`, { withCredentials: true }),
      ]);
      setPayments(paymentsRes.data);
      setJobs(jobsRes.data);
      setHoursLogs(hoursRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const resetForms = () => {
    setSingleForm({
      job_id: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setMonthlyPaymentForm({
      job_id: '',
      month: new Date().toISOString().slice(0, 7),
      amount_received: '',
    });
    setEntryMode('single');
  };

  const selectedMonthlyJob = jobs.find((job) => job.job_id === monthlyPaymentForm.job_id);
  const monthlyEarnings = useMemo(() => {
    if (!monthlyPaymentForm.job_id || !monthlyPaymentForm.month) {
      return 0;
    }

    return hoursLogs
      .filter(
        (log) =>
          log.job_id === monthlyPaymentForm.job_id &&
          log.date.slice(0, 7) === monthlyPaymentForm.month
      )
      .reduce((sum, log) => sum + log.calculated_pay, 0);
  }, [hoursLogs, monthlyPaymentForm.job_id, monthlyPaymentForm.month]);

  const monthlyHours = useMemo(() => {
    if (!monthlyPaymentForm.job_id || !monthlyPaymentForm.month) {
      return 0;
    }

    return hoursLogs
      .filter(
        (log) =>
          log.job_id === monthlyPaymentForm.job_id &&
          log.date.slice(0, 7) === monthlyPaymentForm.month
      )
      .reduce((sum, log) => sum + log.hours_worked, 0);
  }, [hoursLogs, monthlyPaymentForm.job_id, monthlyPaymentForm.month]);

  const monthlyDifference = monthlyPaymentForm.amount_received
    ? parseFloat(monthlyPaymentForm.amount_received) - monthlyEarnings
    : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (entryMode === 'single') {
        await axios.post(
          `${BACKEND_URL}/api/payments`,
          {
            job_id: singleForm.job_id || null,
            amount: parseFloat(singleForm.amount),
            date: singleForm.date,
            notes: singleForm.notes || null,
          },
          { withCredentials: true }
        );
        toast.success('Payment recorded successfully');
      } else {
        const paymentDate = `${monthlyPaymentForm.month}-01`;
        await axios.post(
          `${BACKEND_URL}/api/payments`,
          {
            job_id: monthlyPaymentForm.job_id,
            amount: parseFloat(monthlyPaymentForm.amount_received),
            date: paymentDate,
            notes: `Payment for ${new Date(`${paymentDate}T12:00:00`).toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric',
            })}`,
          },
          { withCredentials: true }
        );
        toast.success('Payment recorded successfully');
      }

      setDialogOpen(false);
      resetForms();
      fetchData();
    } catch (error) {
      console.error('Failed to record payment:', error);
      toast.error('Failed to record payment');
    }
  };

  const handleDownloadStatement = async () => {
    setGeneratingStatement(true);

    try {
      const response = await axios.get(`${BACKEND_URL}/api/reports/statement`, {
        withCredentials: true,
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      const contentDisposition = response.headers['content-disposition'];
      const filenameMatch = contentDisposition?.match(/filename="?(.+?)"?$/);
      const filename = filenameMatch
        ? filenameMatch[1]
        : `earnings_statement_${Date.now()}.pdf`;

      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Statement downloaded successfully');
    } catch (error) {
      console.error('Failed to download statement:', error);
      toast.error('Failed to generate statement');
    } finally {
      setGeneratingStatement(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!paymentToDelete) {
      return;
    }

    try {
      await axios.delete(`${BACKEND_URL}/api/payments/${paymentToDelete.payment_id}`, {
        withCredentials: true,
      });
      toast.success('Payment deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Failed to delete payment:', error);
      toast.error('Failed to delete payment');
    } finally {
      setDeleteDialogOpen(false);
      setPaymentToDelete(null);
    }
  };

  const totalReceived = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const assignedPayments = payments.filter((payment) => payment.job_name).length;
  const groupedPayments = payments.reduce((accumulator, payment) => {
    const month = payment.date.slice(0, 7);
    if (!accumulator[month]) {
      accumulator[month] = [];
    }
    accumulator[month].push(payment);
    return accumulator;
  }, {});
  const sortedMonths = Object.keys(groupedPayments).sort().reverse();

  if (loading) {
    return (
      <div className="space-y-6" data-testid="payments-page">
        <PageHero
          eyebrow="Cash In"
          title="Payments"
          description="Record incoming money and keep statements ready for export."
        />
        <PaymentsSkeletonPanel />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="payments-page">
      <PageHero
        eyebrow="Cash In"
        title="Payments"
        description="Track what has landed, tie it to the right client, and keep your statement history clean."
        actions={
          <>
            <span className="status-chip status-chip-positive">{formatCurrency(totalReceived)} received</span>
            <span className="status-chip status-chip-neutral">{formatInteger(payments.length)} payments logged</span>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <MetricPanel
            icon={Wallet}
            label="Total received"
            value={formatCurrency(totalReceived)}
            detail="All recorded incoming payments across your workspace."
          />
          <MetricPanel
            icon={ReceiptText}
            label="Assigned payments"
            value={formatInteger(assignedPayments)}
            detail="Payments attached directly to a client job."
            tone="fresh"
          />
          <MetricPanel
            icon={CreditCard}
            label="Statement months"
            value={formatInteger(sortedMonths.length)}
            detail="Monthly groups ready to review or export."
            tone="warm"
          />
        </div>
      </PageHero>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="app-panel rounded-[26px] px-4 py-3 text-sm leading-6 text-[#5a6d61]">
          Record one-off transfers or a month-end payment against the hours already logged for a client.
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            onClick={handleDownloadStatement}
            disabled={generatingStatement}
            variant="outline"
            data-testid="download-statement-button"
          >
            {generatingStatement ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#355247]/30 border-t-[#355247]" />
                Generating...
              </>
            ) : (
              <>
                <Download size={16} />
                Download Statement
              </>
            )}
          </Button>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="add-payment-button" onClick={resetForms}>
                <Plus size={18} />
                Add Payment
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle className="text-2xl text-[#173229]" style={{ fontFamily: 'Outfit' }}>
                  Record payment
                </DialogTitle>
                <DialogDescription>
                  Log a single transfer or reconcile a month-end payment against recorded hours.
                </DialogDescription>
              </DialogHeader>

              <Tabs value={entryMode} onValueChange={setEntryMode} className="w-full">
                <TabsList className="mb-5 grid w-full grid-cols-2">
                  <TabsTrigger value="single">Single Payment</TabsTrigger>
                  <TabsTrigger value="monthly">Monthly Payment</TabsTrigger>
                </TabsList>

                <TabsContent value="single">
                  <form onSubmit={handleSubmit} className="space-y-5" data-testid="payment-form">
                    <div className="app-panel rounded-[28px] p-4 space-y-4">
                      <div>
                        <Label htmlFor="single_job_id" className="text-sm font-semibold text-[#4c6154]">
                          Job
                        </Label>
                        <Select
                          value={singleForm.job_id}
                          onValueChange={(value) => setSingleForm({ ...singleForm, job_id: value })}
                        >
                          <SelectTrigger id="single_job_id" data-testid="payment-job-select" className="mt-2">
                            <SelectValue placeholder="General payment or select a job" />
                          </SelectTrigger>
                          <SelectContent>
                            {jobs.map((job) => (
                              <SelectItem key={job.job_id} value={job.job_id}>
                                {job.job_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <Label htmlFor="single_amount" className="text-sm font-semibold text-[#4c6154]">
                            Amount
                          </Label>
                          <Input
                            id="single_amount"
                            data-testid="payment-amount-input"
                            type="number"
                            step="0.01"
                            min="0"
                            value={singleForm.amount}
                            onChange={(e) => setSingleForm({ ...singleForm, amount: e.target.value })}
                            required
                            className="mt-2"
                            placeholder="500.00"
                          />
                        </div>

                        <div>
                          <Label htmlFor="single_date" className="text-sm font-semibold text-[#4c6154]">
                            Date
                          </Label>
                          <Input
                            id="single_date"
                            data-testid="payment-date-input"
                            type="date"
                            value={singleForm.date}
                            onChange={(e) => setSingleForm({ ...singleForm, date: e.target.value })}
                            required
                            className="mt-2"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="single_notes" className="text-sm font-semibold text-[#4c6154]">
                          Notes
                        </Label>
                        <Textarea
                          id="single_notes"
                          data-testid="payment-notes-input"
                          value={singleForm.notes}
                          onChange={(e) => setSingleForm({ ...singleForm, notes: e.target.value })}
                          className="mt-2"
                          placeholder="Any context you want to keep with this transfer."
                          rows={3}
                        />
                      </div>
                    </div>

                    <DialogFooter className="flex gap-3 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setDialogOpen(false)}
                        className="flex-1"
                        data-testid="cancel-payment-button"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1"
                        data-testid="submit-payment-button"
                      >
                        Record Payment
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
                          value={monthlyPaymentForm.job_id}
                          onValueChange={(value) =>
                            setMonthlyPaymentForm({ ...monthlyPaymentForm, job_id: value })
                          }
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
                          <Label htmlFor="payment_month" className="text-sm font-semibold text-[#4c6154]">
                            Month
                          </Label>
                          <Input
                            id="payment_month"
                            type="month"
                            value={monthlyPaymentForm.month}
                            onChange={(e) =>
                              setMonthlyPaymentForm({ ...monthlyPaymentForm, month: e.target.value })
                            }
                            required
                            className="mt-2"
                          />
                        </div>

                        <div>
                          <Label htmlFor="amount_received" className="text-sm font-semibold text-[#4c6154]">
                            Amount received
                          </Label>
                          <Input
                            id="amount_received"
                            type="number"
                            step="0.01"
                            min="0"
                            value={monthlyPaymentForm.amount_received}
                            onChange={(e) =>
                              setMonthlyPaymentForm({
                                ...monthlyPaymentForm,
                                amount_received: e.target.value,
                              })
                            }
                            required
                            className="mt-2"
                            placeholder="2000.00"
                          />
                        </div>
                      </div>
                    </div>

                    {monthlyPaymentForm.job_id ? (
                      <div className="grid gap-4 md:grid-cols-2">
                        <MetricPanel
                          icon={ReceiptText}
                          label="Logged hours"
                          value={formatHours(monthlyHours)}
                          detail={
                            selectedMonthlyJob
                              ? `${selectedMonthlyJob.job_name} in ${formatMonthLabel(monthlyPaymentForm.month).toLowerCase()}`
                              : 'Hours tied to the selected job and month.'
                          }
                        />
                        <MetricPanel
                          icon={Wallet}
                          label="Expected earnings"
                          value={formatCurrency(monthlyEarnings)}
                          detail={
                            monthlyPaymentForm.amount_received
                              ? monthlyDifference === 0
                                ? 'Payment matches the logged earnings exactly.'
                                : monthlyDifference > 0
                                  ? `Over by ${formatCurrency(monthlyDifference)}`
                                  : `Short by ${formatCurrency(Math.abs(monthlyDifference))}`
                              : 'Calculated from the hours already logged.'
                          }
                          tone={
                            monthlyPaymentForm.amount_received
                              ? monthlyDifference >= 0
                                ? 'fresh'
                                : 'warm'
                              : 'default'
                          }
                        />
                      </div>
                    ) : null}

                    <DialogFooter className="flex gap-3 pt-1">
                      <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                        Cancel
                      </Button>
                      <Button type="submit" className="flex-1">
                        Record Payment
                      </Button>
                    </DialogFooter>
                  </form>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {payments.length === 0 ? (
        <EmptyWorkspaceState
          icon={CreditCard}
          title="No payments recorded yet"
          description="Record your first payment to keep balances accurate and statements ready when you need them."
          testId="empty-payments-state"
          action={
            <Button
              onClick={() => {
                resetForms();
                setDialogOpen(true);
              }}
            >
              <Plus size={18} />
              Record your first payment
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {sortedMonths.map((month) => {
            const monthPayments = groupedPayments[month].sort(
              (left, right) => new Date(right.date) - new Date(left.date)
            );
            const monthTotal = monthPayments.reduce((sum, payment) => sum + payment.amount, 0);

            return (
              <section key={month} className="app-panel-solid rounded-[32px] p-6 md:p-8" data-testid="payments-table">
                <SectionHeading
                  eyebrow="Payment History"
                  title={formatMonthLabel(month)}
                  description="A clean monthly ledger of what has already come in."
                  meta={<div className="status-chip status-chip-neutral">{formatCompactCurrency(monthTotal)}</div>}
                />

                <div className="mt-6 space-y-3">
                  {monthPayments.map((payment, index) => (
                    <div
                      key={payment.payment_id}
                      data-testid={`payment-row-${index}`}
                      className="app-panel rounded-[26px] px-4 py-4"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-start gap-4">
                          <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-[#173229]/8 text-[#173229]">
                            <CreditCard size={18} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#607166]">
                              {formatShortDate(payment.date)}
                            </p>
                            <h3 className="mt-2 text-xl font-semibold tracking-tight text-[#173229]" style={{ fontFamily: 'Outfit' }}>
                              {payment.job_name || 'General payment'}
                            </h3>
                            <p className="mt-1 text-sm text-[#5a6d61]">
                              {payment.notes || 'No note attached to this payment.'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 md:gap-4">
                          <div className="text-right">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#607166]">
                              Amount
                            </p>
                            <p className="mt-2 text-2xl font-semibold tracking-tight text-[#173229]" style={{ fontFamily: 'Outfit' }}>
                              {formatCurrency(payment.amount)}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setPaymentToDelete(payment);
                              setDeleteDialogOpen(true);
                            }}
                            data-testid={`delete-payment-${index}`}
                            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#efc4b4] bg-[#fff7f4] text-[#8a4d36] transition-all hover:-translate-y-0.5 hover:bg-[#fff1eb]"
                            title="Delete payment"
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
              Delete payment
            </DialogTitle>
            <DialogDescription>
              Remove the payment of <strong className="text-[#173229]">{formatCurrency(paymentToDelete?.amount)}</strong>{' '}
              from {paymentToDelete?.job_name || 'General payment'}. This cannot be undone.
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
