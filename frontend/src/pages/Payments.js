import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, CreditCard, Download } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [entryMode, setEntryMode] = useState('single');
  const [generatingStatement, setGeneratingStatement] = useState(false);
  
  // Single payment form
  const [singleForm, setSingleForm] = useState({ 
    job_id: '', 
    amount: '', 
    date: new Date().toISOString().split('T')[0],
    notes: '' 
  });
  
  // Weekly/Monthly payment form
  const [monthlyPaymentForm, setMonthlyPaymentForm] = useState({
    job_id: '',
    month: new Date().toISOString().slice(0, 7), // YYYY-MM format
    amount_received: '',
    calculated_earnings: 0,
    hours_in_month: 0
  });
  
  // Calculate earnings for the selected job and month
  useEffect(() => {
    const calculateMonthlyEarnings = async () => {
      if (monthlyPaymentForm.job_id && monthlyPaymentForm.month) {
        try {
          const response = await axios.get(`${BACKEND_URL}/api/hours`, {
            withCredentials: true
          });
          
          // Filter hours for selected job and month
          const hoursLogs = response.data.filter(log => {
            const logDate = log.date.slice(0, 7); // Get YYYY-MM from date
            return log.job_id === monthlyPaymentForm.job_id && logDate === monthlyPaymentForm.month;
          });
          
          const totalEarnings = hoursLogs.reduce((sum, log) => sum + log.calculated_pay, 0);
          const totalHours = hoursLogs.reduce((sum, log) => sum + log.hours_worked, 0);
          
          setMonthlyPaymentForm(prev => ({
            ...prev,
            calculated_earnings: totalEarnings,
            hours_in_month: totalHours
          }));
        } catch (error) {
          console.error('Failed to calculate earnings:', error);
        }
      }
    };
    
    calculateMonthlyEarnings();
  }, [monthlyPaymentForm.job_id, monthlyPaymentForm.month]);
  
  useEffect(() => {
    fetchData();
  }, []);
  
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
        await axios.post(
          `${BACKEND_URL}/api/payments`,
          {
            job_id: singleForm.job_id || null,
            amount: parseFloat(singleForm.amount),
            date: singleForm.date,
            notes: singleForm.notes || null
          },
          { withCredentials: true }
        );
        toast.success('Payment recorded successfully');
      } else {
        // Monthly payment entry
        // Get first day of the selected month for the date
        const paymentDate = `${monthlyPaymentForm.month}-01`;
        
        await axios.post(
          `${BACKEND_URL}/api/payments`,
          {
            job_id: monthlyPaymentForm.job_id,
            amount: parseFloat(monthlyPaymentForm.amount_received),
            date: paymentDate,
            notes: `Payment for ${new Date(paymentDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
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
  
  const resetForms = () => {
    setSingleForm({ 
      job_id: '', 
      amount: '', 
      date: new Date().toISOString().split('T')[0],
      notes: '' 
    });
    setMonthlyPaymentForm({
      job_id: '',
      month: new Date().toISOString().slice(0, 7),
      amount_received: '',
      calculated_earnings: 0,
      hours_in_month: 0
    });
  };
  
  const handleDownloadStatement = async () => {
    setGeneratingStatement(true);
    try {
      const response = await axios.get(
        `${BACKEND_URL}/api/reports/statement`,
        {
          withCredentials: true,
          responseType: 'blob'
        }
      );
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const contentDisposition = response.headers['content-disposition'];
      const filenameMatch = contentDisposition?.match(/filename="?(.+?)\"?$/);
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
  
  const handleDelete = async (paymentId) => {
    if (!window.confirm('Are you sure you want to delete this payment?')) return;
    
    try {
      await axios.delete(`${BACKEND_URL}/api/payments/${paymentId}`, {
        withCredentials: true
      });
      toast.success('Payment deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Failed to delete payment:', error);
      toast.error('Failed to delete payment');
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
    <div data-testid="payments-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 
            className="text-4xl font-semibold tracking-tight text-[#344E41] mb-2" 
            style={{ fontFamily: 'Outfit' }}
          >
            Payments
          </h1>
          <p className="text-base leading-relaxed text-[#5C6B61]">
            Record payments received from clients
          </p>
        </div>
        
        <div className="flex gap-3">
          <Button
            onClick={handleDownloadStatement}
            disabled={generatingStatement}
            data-testid="download-statement-button"
            className="bg-[#A3B18A] hover:bg-[#8FA376] text-white flex items-center gap-2 transition-all duration-200"
          >
            {generatingStatement ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Generating...
              </>
            ) : (
              <>
                <Download size={20} />
                Download Statement
              </>
            )}
          </Button>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                data-testid="add-payment-button"
                className="bg-[#344E41] hover:bg-[#2B3A28] text-white flex items-center gap-2 transition-all duration-200"
                onClick={resetForms}
              >
                <Plus size={20} />
                Add Payment
              </Button>
            </DialogTrigger>
          <DialogContent className="bg-white border border-[#EAE6DF] max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-medium text-[#344E41]" style={{ fontFamily: 'Outfit' }}>
                Record Payment
              </DialogTitle>
            </DialogHeader>
            
            <Tabs value={entryMode} onValueChange={setEntryMode} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="single">Single Payment</TabsTrigger>
                <TabsTrigger value="monthly">Monthly Payment</TabsTrigger>
              </TabsList>
              
              {/* Single Payment */}
              <TabsContent value="single">
                <form onSubmit={handleSubmit} className="space-y-4" data-testid="payment-form">
                  <div>
                    <Label htmlFor="single_job_id" className="text-[#5C6B61] font-medium">Job (Optional)</Label>
                    <Select 
                      value={singleForm.job_id} 
                      onValueChange={(value) => setSingleForm({ ...singleForm, job_id: value })}
                    >
                      <SelectTrigger 
                        id="single_job_id"
                        data-testid="payment-job-select"
                        className="mt-1 border-[#EAE6DF] focus:border-[#344E41] focus:ring-[#344E41]"
                      >
                        <SelectValue placeholder="Select a job (optional)" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-[#EAE6DF]">
                        {jobs.map((job) => (
                          <SelectItem key={job.job_id} value={job.job_id}>
                            {job.job_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="single_amount" className="text-[#5C6B61] font-medium">Amount ($)</Label>
                    <Input
                      id="single_amount"
                      data-testid="payment-amount-input"
                      type="number"
                      step="0.01"
                      value={singleForm.amount}
                      onChange={(e) => setSingleForm({ ...singleForm, amount: e.target.value })}
                      required
                      className="mt-1 border-[#EAE6DF] focus:border-[#344E41] focus:ring-[#344E41]"
                      placeholder="500.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="single_date" className="text-[#5C6B61] font-medium">Date</Label>
                    <Input
                      id="single_date"
                      data-testid="payment-date-input"
                      type="date"
                      value={singleForm.date}
                      onChange={(e) => setSingleForm({ ...singleForm, date: e.target.value })}
                      required
                      className="mt-1 border-[#EAE6DF] focus:border-[#344E41] focus:ring-[#344E41]"
                    />
                  </div>
                  <div>
                    <Label htmlFor="single_notes" className="text-[#5C6B61] font-medium">Notes (Optional)</Label>
                    <Textarea
                      id="single_notes"
                      data-testid="payment-notes-input"
                      value={singleForm.notes}
                      onChange={(e) => setSingleForm({ ...singleForm, notes: e.target.value })}
                      className="mt-1 border-[#EAE6DF] focus:border-[#344E41] focus:ring-[#344E41]"
                      placeholder="Any additional notes..."
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                      className="flex-1 border-[#EAE6DF] text-[#5C6B61] hover:bg-[#F5F3EE]"
                      data-testid="cancel-payment-button"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-[#344E41] hover:bg-[#2B3A28] text-white"
                      data-testid="submit-payment-button"
                    >
                      Record Payment
                    </Button>
                  </div>
                </form>
              </TabsContent>
              
              {/* Monthly Payment */}
              <TabsContent value="monthly">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="monthly_job_id" className="text-[#5C6B61] font-medium">Job</Label>
                    <Select 
                      value={monthlyPaymentForm.job_id} 
                      onValueChange={(value) => setMonthlyPaymentForm({ ...monthlyPaymentForm, job_id: value })}
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
                    <Label htmlFor="payment_month" className="text-[#5C6B61] font-medium">Month</Label>
                    <Input
                      id="payment_month"
                      type="month"
                      value={monthlyPaymentForm.month}
                      onChange={(e) => setMonthlyPaymentForm({ ...monthlyPaymentForm, month: e.target.value })}
                      required
                      className="mt-1 border-[#EAE6DF] focus:border-[#344E41] focus:ring-[#344E41]"
                    />
                  </div>
                  
                  {monthlyPaymentForm.calculated_earnings > 0 && (
                    <div className="bg-[#F5F3EE] p-4 border-l-4 border-[#3A5A40]">
                      <p className="text-sm font-medium text-[#344E41] mb-1">
                        Your Earnings This Month
                      </p>
                      <p className="text-2xl font-semibold text-[#3A5A40] mb-2">
                        ${monthlyPaymentForm.calculated_earnings.toFixed(2)}
                      </p>
                      <p className="text-sm text-[#5C6B61]">
                        Based on {monthlyPaymentForm.hours_in_month} hours logged
                      </p>
                      {monthlyPaymentForm.amount_received && parseFloat(monthlyPaymentForm.amount_received) !== monthlyPaymentForm.calculated_earnings && (
                        <p className="text-sm font-medium mt-2" style={{
                          color: parseFloat(monthlyPaymentForm.amount_received) < monthlyPaymentForm.calculated_earnings ? '#E07A5F' : '#3A5A40'
                        }}>
                          {parseFloat(monthlyPaymentForm.amount_received) < monthlyPaymentForm.calculated_earnings 
                            ? `Underpaid by $${(monthlyPaymentForm.calculated_earnings - parseFloat(monthlyPaymentForm.amount_received)).toFixed(2)}`
                            : `Overpaid by $${(parseFloat(monthlyPaymentForm.amount_received) - monthlyPaymentForm.calculated_earnings).toFixed(2)}`
                          }
                        </p>
                      )}
                    </div>
                  )}
                  
                  {monthlyPaymentForm.job_id && monthlyPaymentForm.month && monthlyPaymentForm.calculated_earnings === 0 && (
                    <div className="bg-[#FEF6F4] p-4 border-l-4 border-[#E07A5F]">
                      <p className="text-sm text-[#E07A5F]">
                        No hours logged for this job in {new Date(monthlyPaymentForm.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  )}
                  
                  <div>
                    <Label htmlFor="amount_received" className="text-[#5C6B61] font-medium">Amount Received ($)</Label>
                    <Input
                      id="amount_received"
                      type="number"
                      step="0.01"
                      value={monthlyPaymentForm.amount_received}
                      onChange={(e) => setMonthlyPaymentForm({ ...monthlyPaymentForm, amount_received: e.target.value })}
                      required
                      className="mt-1 border-[#EAE6DF] focus:border-[#344E41] focus:ring-[#344E41]"
                      placeholder="2000.00"
                    />
                    <p className="text-sm text-[#5C6B61] mt-1">How much did you actually receive?</p>
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
                      Record Payment
                    </Button>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>
      </div>
      
      {payments.length === 0 ? (
        <div className="bg-white border border-[#EAE6DF] p-12 text-center" data-testid="empty-payments-state">
          <CreditCard size={48} className="mx-auto mb-4 text-[#A3B18A]" />
          <h3 className="text-xl font-medium text-[#344E41] mb-2" style={{ fontFamily: 'Outfit' }}>
            No payments recorded yet
          </h3>
          <p className="text-base text-[#5C6B61]">
            Start recording payments to track your balance
          </p>
        </div>
      ) : (
        <div className="bg-white border border-[#EAE6DF]" data-testid="payments-table">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-[#EAE6DF]">
                <tr className="bg-[#FDFCFB]">
                  <th className="text-left px-6 py-4 text-sm font-medium text-[#5C6B61]">Date</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-[#5C6B61]">Job</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-[#5C6B61]">Amount</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-[#5C6B61]">Notes</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-[#5C6B61]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment, index) => (
                  <tr 
                    key={payment.payment_id}
                    data-testid={`payment-row-${index}`}
                    className="border-b border-[#EAE6DF] last:border-b-0 hover:bg-[#FDFCFB]/50"
                  >
                    <td className="px-6 py-4 text-base text-[#1F2937]">
                      {new Date(payment.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-base text-[#1F2937]">
                      {payment.job_name || 'General'}
                    </td>
                    <td className="px-6 py-4 text-base text-[#3A5A40] text-right font-medium">
                      ${payment.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-base text-[#5C6B61]">
                      {payment.notes || '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(payment.payment_id)}
                        data-testid={`delete-payment-${index}`}
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
