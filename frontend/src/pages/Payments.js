import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, CreditCard } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ 
    job_id: '', 
    amount: '', 
    date: new Date().toISOString().split('T')[0],
    notes: '' 
  });
  
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
      await axios.post(
        `${BACKEND_URL}/api/payments`,
        {
          job_id: formData.job_id || null,
          amount: parseFloat(formData.amount),
          date: formData.date,
          notes: formData.notes || null
        },
        { withCredentials: true }
      );
      
      toast.success('Payment recorded successfully');
      setDialogOpen(false);
      setFormData({ 
        job_id: '', 
        amount: '', 
        date: new Date().toISOString().split('T')[0],
        notes: '' 
      });
      fetchData();
    } catch (error) {
      console.error('Failed to record payment:', error);
      toast.error('Failed to record payment');
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
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              data-testid="add-payment-button"
              className="bg-[#344E41] hover:bg-[#2B3A28] text-white flex items-center gap-2 transition-all duration-200"
            >
              <Plus size={20} />
              Add Payment
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white border border-[#EAE6DF]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-medium text-[#344E41]" style={{ fontFamily: 'Outfit' }}>
                Record Payment
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4" data-testid="payment-form">
              <div>
                <Label htmlFor="job_id" className="text-[#5C6B61] font-medium">Job (Optional)</Label>
                <Select 
                  value={formData.job_id} 
                  onValueChange={(value) => setFormData({ ...formData, job_id: value })}
                >
                  <SelectTrigger 
                    id="job_id"
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
                <Label htmlFor="amount" className="text-[#5C6B61] font-medium">Amount ($)</Label>
                <Input
                  id="amount"
                  data-testid="payment-amount-input"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                  className="mt-1 border-[#EAE6DF] focus:border-[#344E41] focus:ring-[#344E41]"
                  placeholder="500.00"
                />
              </div>
              <div>
                <Label htmlFor="date" className="text-[#5C6B61] font-medium">Date</Label>
                <Input
                  id="date"
                  data-testid="payment-date-input"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                  className="mt-1 border-[#EAE6DF] focus:border-[#344E41] focus:ring-[#344E41]"
                />
              </div>
              <div>
                <Label htmlFor="notes" className="text-[#5C6B61] font-medium">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  data-testid="payment-notes-input"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
          </DialogContent>
        </Dialog>
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
