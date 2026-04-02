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
  
  // Weekly batch payment form
  const [weeklyForm, setWeeklyForm] = useState({
    job_id: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    total_amount: '',
    calculated_amount: 0,
    hours_breakdown: [],
    notes: ''
  });
  
  function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }
  
  // Calculate payment amount based on logged hours
  useEffect(() => {
    const calculatePayment = async () => {
      if (weeklyForm.job_id && weeklyForm.start_date && weeklyForm.end_date) {
        try {
          const response = await axios.get(`${BACKEND_URL}/api/hours`, {
            withCredentials: true
          });
          
          const hoursLogs = response.data.filter(log => {
            return log.job_id === weeklyForm.job_id &&
                   log.date >= weeklyForm.start_date &&
                   log.date <= weeklyForm.end_date;
          });
          
          const totalAmount = hoursLogs.reduce((sum, log) => sum + log.calculated_pay, 0);
          
          setWeeklyForm(prev => ({
            ...prev,
            calculated_amount: totalAmount,
            total_amount: totalAmount.toFixed(2),
            hours_breakdown: hoursLogs
          }));
        } catch (error) {
          console.error('Failed to calculate payment:', error);
        }
      }
    };
    
    calculatePayment();
  }, [weeklyForm.job_id, weeklyForm.start_date, weeklyForm.end_date]);
  
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
        // Weekly batch entry
        await axios.post(
          `${BACKEND_URL}/api/payments`,
          {
            job_id: weeklyForm.job_id || null,
            amount: parseFloat(weeklyForm.total_amount),
            date: weeklyForm.start_date,
            notes: weeklyForm.notes ? 
              `${weeklyForm.start_date} to ${weeklyForm.end_date}: ${weeklyForm.notes}` : 
              `Payment for ${weeklyForm.start_date} to ${weeklyForm.end_date}`
          },
          { withCredentials: true }
        );
        toast.success('Weekly payment recorded successfully');
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
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 6);
    setWeeklyForm({
      job_id: '',
      start_date: today.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      total_amount: '',
      calculated_amount: 0,
      hours_breakdown: [],
      notes: ''
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
                <TabsTrigger value="weekly">Weekly Payment</TabsTrigger>
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
              
              {/* Weekly Payment */}
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
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="start_date" className="text-[#5C6B61] font-medium">Start Date</Label>
                      <Input
                        id="start_date"
                        type="date"
                        value={weeklyForm.start_date}
                        onChange={(e) => {
                          const startDate = new Date(e.target.value);
                          const endDate = new Date(startDate);
                          endDate.setDate(startDate.getDate() + 6);
                          setWeeklyForm({ 
                            ...weeklyForm, 
                            start_date: e.target.value,
                            end_date: endDate.toISOString().split('T')[0]
                          });
                        }}
                        required
                        className="mt-1 border-[#EAE6DF] focus:border-[#344E41] focus:ring-[#344E41]"
                      />
                    </div>
                    <div>
                      <Label htmlFor="end_date" className="text-[#5C6B61] font-medium">End Date</Label>
                      <Input
                        id="end_date"
                        type="date"
                        value={weeklyForm.end_date}
                        onChange={(e) => setWeeklyForm({ ...weeklyForm, end_date: e.target.value })}
                        required
                        className="mt-1 border-[#EAE6DF] focus:border-[#344E41] focus:ring-[#344E41]"
                      />
                    </div>
                  </div>
                  
                  {weeklyForm.hours_breakdown.length > 0 && (
                    <div className="bg-[#F5F3EE] p-4 border-l-4 border-[#3A5A40]">
                      <p className="text-sm font-medium text-[#344E41] mb-2">
                        Hours Found: {weeklyForm.hours_breakdown.reduce((sum, log) => sum + log.hours_worked, 0)} hours
                      </p>
                      <div className="space-y-1">
                        {weeklyForm.hours_breakdown.map((log, idx) => (
                          <p key={idx} className="text-sm text-[#5C6B61]">
                            {new Date(log.date).toLocaleDateString()}: {log.hours_worked}h × ${log.hourly_rate}/hr = ${log.calculated_pay.toFixed(2)}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <Label htmlFor="total_amount" className="text-[#5C6B61] font-medium">
                      Total Amount ($)
                      {weeklyForm.calculated_amount > 0 && (
                        <span className="text-[#3A5A40] font-semibold ml-2">
                          (Auto-calculated: ${weeklyForm.calculated_amount.toFixed(2)})
                        </span>
                      )}
                    </Label>
                    <Input
                      id="total_amount"
                      type="number"
                      step="0.01"
                      value={weeklyForm.total_amount}
                      onChange={(e) => setWeeklyForm({ ...weeklyForm, total_amount: e.target.value })}
                      required
                      className="mt-1 border-[#EAE6DF] focus:border-[#344E41] focus:ring-[#344E41]"
                      placeholder="0.00"
                    />
                    <p className="text-sm text-[#5C6B61] mt-1">
                      {weeklyForm.calculated_amount > 0 
                        ? 'Amount auto-calculated from logged hours (you can adjust if needed)'
                        : 'Enter amount or log hours first to auto-calculate'
                      }
                    </p>
                  </div>
                  
                  <div>
                    <Label htmlFor="weekly_notes" className="text-[#5C6B61] font-medium">Notes (Optional)</Label>
                    <Textarea
                      id="weekly_notes"
                      value={weeklyForm.notes}
                      onChange={(e) => setWeeklyForm({ ...weeklyForm, notes: e.target.value })}
                      className="mt-1 border-[#EAE6DF] focus:border-[#344E41] focus:ring-[#344E41]"
                      placeholder="Additional details..."
                      rows={3}
                    />
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
