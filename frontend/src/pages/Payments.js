import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, CreditCard, Download } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// EmptyState Component
function EmptyState({ onAddClick }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-20 h-20 rounded-2xl bg-[#F0EDE8] flex items-center justify-center mb-6">
        <CreditCard size={32} className="text-[#A3B18A]" />
      </div>
      <h3 className="text-xl font-medium text-[#344E41] mb-2" style={{ fontFamily: 'Outfit' }}>No payments recorded yet</h3>
      <p className="text-base text-[#5C6B61] mb-6 text-center max-w-sm">Start recording payments to track your balance</p>
      <Button onClick={onAddClick} className="bg-[#344E41] hover:bg-[#2B3A28] text-white flex items-center gap-2 rounded-lg"><Plus size={18} /> Record your first payment</Button>
    </div>
  );
}

// Skeleton Row Component
function SkeletonRow() {
  return (
    <tr className="border-b border-[#EAE6DF]">
      <td className="px-6 py-4"><div className="h-4 w-24 bg-[#E8E5DF] rounded animate-pulse" /></td>
      <td className="px-6 py-4"><div className="h-4 w-32 bg-[#E8E5DF] rounded animate-pulse" /></td>
      <td className="px-6 py-4 text-right"><div className="h-4 w-20 bg-[#E8E5DF] rounded animate-pulse ml-auto" /></td>
      <td className="px-6 py-4"><div className="h-4 w-40 bg-[#E8E5DF] rounded animate-pulse" /></td>
      <td className="px-6 py-4 text-right"><div className="h-8 w-8 bg-[#E8E5DF] rounded animate-pulse ml-auto" /></td>
    </tr>
  );
}

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [entryMode, setEntryMode] = useState('single');
  const [generatingStatement, setGeneratingStatement] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState(null);
  
  const [singleForm, setSingleForm] = useState({ job_id: '', amount: '', date: new Date().toISOString().split('T')[0], notes: '' });
  const [monthlyPaymentForm, setMonthlyPaymentForm] = useState({ job_id: '', month: new Date().toISOString().slice(0, 7), amount_received: '', calculated_earnings: 0, hours_in_month: 0 });
  
  useEffect(() => {
    const calculateMonthlyEarnings = async () => {
      if (monthlyPaymentForm.job_id && monthlyPaymentForm.month) {
        try {
          const response = await axios.get(`${BACKEND_URL}/api/hours`, { withCredentials: true });
          const hoursLogs = response.data.filter(log => {
            const logDate = log.date.slice(0, 7);
            return log.job_id === monthlyPaymentForm.job_id && logDate === monthlyPaymentForm.month;
          });
          const totalEarnings = hoursLogs.reduce((sum, log) => sum + log.calculated_pay, 0);
          const totalHours = hoursLogs.reduce((sum, log) => sum + log.hours_worked, 0);
          setMonthlyPaymentForm(prev => ({ ...prev, calculated_earnings: totalEarnings, hours_in_month: totalHours }));
        } catch (error) { console.error('Failed to calculate earnings:', error); }
      }
    };
    calculateMonthlyEarnings();
  }, [monthlyPaymentForm.job_id, monthlyPaymentForm.month]);
  
  useEffect(() => { fetchData(); }, []);
  
  const fetchData = async () => {
    try {
      const [paymentsRes, jobsRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/payments`, { withCredentials: true }),
        axios.get(`${BACKEND_URL}/api/jobs`, { withCredentials: true })
      ]);
      setPayments(paymentsRes.data);
      setJobs(jobsRes.data);
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
      if (entryMode === 'single') {
        await axios.post(`${BACKEND_URL}/api/payments`, { job_id: singleForm.job_id || null, amount: parseFloat(singleForm.amount), date: singleForm.date, notes: singleForm.notes || null }, { withCredentials: true });
        toast.success('Payment recorded successfully');
      } else {
        const paymentDate = `${monthlyPaymentForm.month}-01`;
        await axios.post(`${BACKEND_URL}/api/payments`, { job_id: monthlyPaymentForm.job_id, amount: parseFloat(monthlyPaymentForm.amount_received), date: paymentDate, notes: `Payment for ${new Date(paymentDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}` }, { withCredentials: true });
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
  
  const resetForms = () => {
    setSingleForm({ job_id: '', amount: '', date: new Date().toISOString().split('T')[0], notes: '' });
    setMonthlyPaymentForm({ job_id: '', month: new Date().toISOString().slice(0, 7), amount_received: '', calculated_earnings: 0, hours_in_month: 0 });
  };
  
  const handleDownloadStatement = async () => {
    setGeneratingStatement(true);
    try {
      const response = await axios.get(`${BACKEND_URL}/api/reports/statement`, { withCredentials: true, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const contentDisposition = response.headers['content-disposition'];
      const filenameMatch = contentDisposition?.match(/filename="?(.+?)"?$/);
      const filename = filenameMatch ? filenameMatch[1] : `earnings_statement_${Date.now()}.pdf`;
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
  
  const handleDeleteClick = (payment) => { setPaymentToDelete(payment); setDeleteDialogOpen(true); };
  
  const handleDeleteConfirm = async () => {
    if (!paymentToDelete) return;
    try {
      await axios.delete(`${BACKEND_URL}/api/payments/${paymentToDelete.payment_id}`, { withCredentials: true });
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
  
  const totalReceived = payments.reduce((sum, p) => sum + p.amount, 0);
  
  // Group payments by month
  const groupedPayments = payments.reduce((acc, payment) => {
    const month = payment.date.slice(0, 7);
    if (!acc[month]) acc[month] = [];
    acc[month].push(payment);
    return acc;
  }, {});
  const sortedMonths = Object.keys(groupedPayments).sort().reverse();
  
  if (loading) {
    return (
      <div data-testid="payments-page">
        <div className="mb-8">
          <h1 className="text-4xl font-semibold tracking-tight text-[#344E41] mb-2" style={{ fontFamily: 'Outfit' }}>Payments</h1>
          <p className="text-base text-[#5C6B61]">Record payments received from clients</p>
        </div>
        <div className="bg-white border border-[#EAE6DF] rounded-xl">
          <table className="w-full"><thead className="border-b border-[#EAE6DF]"><tr className="bg-[#FDFCFB]"><th className="text-left px-6 py-4 text-sm font-medium text-[#5C6B61]">Date</th><th className="text-left px-6 py-4 text-sm font-medium text-[#5C6B61]">Job</th><th className="text-right px-6 py-4 text-sm font-medium text-[#5C6B61]">Amount</th><th className="text-left px-6 py-4 text-sm font-medium text-[#5C6B61]">Notes</th><th className="text-right px-6 py-4 text-sm font-medium text-[#5C6B61]">Actions</th></tr></thead><tbody><SkeletonRow /><SkeletonRow /><SkeletonRow /></tbody></table>
        </div>
      </div>
    );
  }
  
  return (
    <div data-testid="payments-page">
      <div className="mb-8">
        <h1 className="text-4xl font-semibold tracking-tight text-[#344E41] mb-2" style={{ fontFamily: 'Outfit' }}>Payments</h1>
        <p className="text-base leading-relaxed text-[#5C6B61]">Total received: <strong className="text-[#3A5A40]">${totalReceived.toFixed(2)}</strong></p>
      </div>
      
      <div className="flex items-center justify-end gap-3 mb-8">
        <Button onClick={handleDownloadStatement} disabled={generatingStatement} variant="outline" data-testid="download-statement-button" className="border-[#EAE6DF] text-[#5C6B61] hover:bg-[#F5F3EE] rounded-lg text-sm flex items-center gap-2">
          {generatingStatement ? (<><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#5C6B61]" />Generating...</>) : (<><Download size={16} /> Download Statement</>)}
        </Button>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-payment-button" className="bg-[#344E41] hover:bg-[#2B3A28] text-white flex items-center gap-2 transition-all duration-200 rounded-lg text-sm" onClick={resetForms}><Plus size={18} /> Add Payment</Button>
          </DialogTrigger>
          <DialogContent className="bg-white border border-[#EAE6DF] rounded-xl max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-medium text-[#344E41]" style={{ fontFamily: 'Outfit' }}>Record Payment</DialogTitle>
            </DialogHeader>
            <Tabs value={entryMode} onValueChange={setEntryMode} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4"><TabsTrigger value="single">Single Payment</TabsTrigger><TabsTrigger value="monthly">Monthly Payment</TabsTrigger></TabsList>
              <TabsContent value="single">
                <form onSubmit={handleSubmit} className="space-y-4" data-testid="payment-form">
                  <div>
                    <Label htmlFor="single_job_id" className="text-[#5C6B61] font-medium">Job (Optional)</Label>
                    <Select value={singleForm.job_id} onValueChange={(value) => setSingleForm({ ...singleForm, job_id: value })}>
                      <SelectTrigger id="single_job_id" data-testid="payment-job-select" className="mt-1 border-[#EAE6DF] focus:border-[#344E41] focus:ring-[#344E41] rounded-lg"><SelectValue placeholder="Select a job (optional)" /></SelectTrigger>
                      <SelectContent className="bg-white border border-[#EAE6DF] rounded-xl">{jobs.map((job) => (<SelectItem key={job.job_id} value={job.job_id}>{job.job_name}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="single_amount" className="text-[#5C6B61] font-medium">Amount ($)</Label>
                    <Input id="single_amount" data-testid="payment-amount-input" type="number" step="0.01" value={singleForm.amount} onChange={(e) => setSingleForm({ ...singleForm, amount: e.target.value })} required className="mt-1 border-[#EAE6DF] focus:border-[#344E41] focus:ring-[#344E41] rounded-lg" placeholder="500.00" />
                  </div>
                  <div>
                    <Label htmlFor="single_date" className="text-[#5C6B61] font-medium">Date</Label>
                    <Input id="single_date" data-testid="payment-date-input" type="date" value={singleForm.date} onChange={(e) => setSingleForm({ ...singleForm, date: e.target.value })} required className="mt-1 border-[#EAE6DF] focus:border-[#344E41] focus:ring-[#344E41] rounded-lg" />
                  </div>
                  <div>
                    <Label htmlFor="single_notes" className="text-[#5C6B61] font-medium">Notes (Optional)</Label>
                    <Textarea id="single_notes" data-testid="payment-notes-input" value={singleForm.notes} onChange={(e) => setSingleForm({ ...singleForm, notes: e.target.value })} className="mt-1 border-[#EAE6DF] focus:border-[#344E41] focus:ring-[#344E41] rounded-lg" placeholder="Any additional notes..." rows={3} />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1 border-[#EAE6DF] text-[#5C6B61] hover:bg-[#F5F3EE] rounded-lg text-sm" data-testid="cancel-payment-button">Cancel</Button>
                    <Button type="submit" className="flex-1 bg-[#344E41] hover:bg-[#2B3A28] text-white rounded-lg text-sm" data-testid="submit-payment-button">Record Payment</Button>
                  </div>
                </form>
              </TabsContent>
              <TabsContent value="monthly">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="monthly_job_id" className="text-[#5C6B61] font-medium">Job</Label>
                    <Select value={monthlyPaymentForm.job_id} onValueChange={(value) => setMonthlyPaymentForm({ ...monthlyPaymentForm, job_id: value })} required>
                      <SelectTrigger id="monthly_job_id" className="mt-1 border-[#EAE6DF] focus:border-[#344E41] focus:ring-[#344E41] rounded-lg"><SelectValue placeholder="Select a job" /></SelectTrigger>
                      <SelectContent className="bg-white border border-[#EAE6DF] rounded-xl">{jobs.map((job) => (<SelectItem key={job.job_id} value={job.job_id}>{job.job_name} - ${job.hourly_rate.toFixed(2)}/hr</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="payment_month" className="text-[#5C6B61] font-medium">Month</Label>
                    <Input id="payment_month" type="month" value={monthlyPaymentForm.month} onChange={(e) => setMonthlyPaymentForm({ ...monthlyPaymentForm, month: e.target.value })} required className="mt-1 border-[#EAE6DF] focus:border-[#344E41] focus:ring-[#344E41] rounded-lg" />
                  </div>
                  {monthlyPaymentForm.calculated_earnings > 0 && (
                    <div className="bg-[#F0EDE8] rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-[#344E41]">Hours logged: <span className="text-[#5C6B61]">{monthlyPaymentForm.hours_in_month} hours</span></p>
                        <p className="text-sm font-medium text-[#344E41]">Expected earnings: <span className="text-[#3A5A40]">${monthlyPaymentForm.calculated_earnings.toFixed(2)}</span></p>
                      </div>
                    </div>
                  )}
                  <div>
                    <Label htmlFor="amount_received" className="text-[#5C6B61] font-medium">Amount Received ($)</Label>
                    <Input id="amount_received" type="number" step="0.01" value={monthlyPaymentForm.amount_received} onChange={(e) => setMonthlyPaymentForm({ ...monthlyPaymentForm, amount_received: e.target.value })} required className="mt-1 border-[#EAE6DF] focus:border-[#344E41] focus:ring-[#344E41] rounded-lg" placeholder="2000.00" />
                    {monthlyPaymentForm.amount_received && monthlyPaymentForm.calculated_earnings > 0 && (
                      <p className={`text-sm mt-1.5 font-medium ${parseFloat(monthlyPaymentForm.amount_received) < monthlyPaymentForm.calculated_earnings ? 'text-[#E07A5F]' : 'text-[#3A5A40]'}`}>
                        {parseFloat(monthlyPaymentForm.amount_received) < monthlyPaymentForm.calculated_earnings 
                          ? `Short by $${(monthlyPaymentForm.calculated_earnings - parseFloat(monthlyPaymentForm.amount_received)).toFixed(2)}`
                          : parseFloat(monthlyPaymentForm.amount_received) > monthlyPaymentForm.calculated_earnings 
                            ? `Over by $${(parseFloat(monthlyPaymentForm.amount_received) - monthlyPaymentForm.calculated_earnings).toFixed(2)}`
                            : 'Matches ✓'}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1 border-[#EAE6DF] text-[#5C6B61] hover:bg-[#F5F3EE] rounded-lg text-sm">Cancel</Button>
                    <Button type="submit" className="flex-1 bg-[#344E41] hover:bg-[#2B3A28] text-white rounded-lg text-sm">Record Payment</Button>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>
      
      {payments.length === 0 ? (
        <div className="bg-white border border-[#EAE6DF] rounded-xl shadow-sm" data-testid="empty-payments-state"><EmptyState onAddClick={() => setDialogOpen(true)} /></div>
      ) : (
        <div className="space-y-6">
          {sortedMonths.map((month) => {
            const monthPayments = groupedPayments[month].sort((a, b) => new Date(b.date) - new Date(a.date));
            const monthTotal = monthPayments.reduce((sum, p) => sum + p.amount, 0);
            const monthName = new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            return (
              <div key={month}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-medium text-[#344E41]" style={{ fontFamily: 'Outfit' }}>{monthName}</h2>
                  <span className="text-[#3A5A40] font-medium text-sm">${monthTotal.toFixed(2)}</span>
                </div>
                <div className="bg-white border border-[#EAE6DF] rounded-xl overflow-hidden shadow-sm" data-testid="payments-table">
                  {monthPayments.map((payment, index) => (
                    <div key={payment.payment_id} data-testid={`payment-row-${index}`} className="group flex items-center justify-between px-6 py-4 border-b border-[#EAE6DF] last:border-b-0 hover:bg-[#FDFCFB]/50 transition-colors">
                      <div className="flex items-center gap-6 flex-1">
                        <span className="text-sm text-[#5C6B61] w-24">{new Date(payment.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                        <span className="text-base text-[#344E41] font-medium">{payment.job_name || 'General'}</span>
                      </div>
                      <div className="flex items-center gap-6">
                        <span className="text-base text-[#3A5A40] font-medium">${payment.amount.toFixed(2)}</span>
                        <span className="text-sm text-[#5C6B61] w-32 truncate">{payment.notes || '-'}</span>
                        <button onClick={() => handleDeleteClick(payment)} data-testid={`delete-payment-${index}`} className="p-2 text-[#E07A5F] hover:bg-[#FEF6F4] rounded-lg opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16} /></button>
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
            <DialogTitle className="text-xl font-medium text-[#344E41]" style={{ fontFamily: 'Outfit' }}>Delete Payment</DialogTitle>
            <DialogDescription className="text-[#5C6B61]">Are you sure you want to delete this payment of <strong className="text-[#344E41]">${paymentToDelete?.amount?.toFixed(2)}</strong> from {paymentToDelete?.job_name || 'General'}? This action cannot be undone.</DialogDescription>
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
