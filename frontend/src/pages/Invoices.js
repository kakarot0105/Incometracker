import { useState, useEffect } from 'react';
import axios from 'axios';
import { FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function Invoices() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [formData, setFormData] = useState({
    job_id: '',
    start_date: '',
    end_date: '',
    invoice_number: '',
    notes: ''
  });
  
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
  
  const handleGenerateInvoice = async (e) => {
    e.preventDefault();
    setGenerating(true);
    
    try {
      const payload = {};
      if (formData.job_id) payload.job_id = formData.job_id;
      if (formData.start_date) payload.start_date = formData.start_date;
      if (formData.end_date) payload.end_date = formData.end_date;
      if (formData.invoice_number) payload.invoice_number = formData.invoice_number;
      if (formData.notes) payload.notes = formData.notes;
      
      const response = await axios.post(
        `${BACKEND_URL}/api/invoices/generate`,
        payload,
        {
          withCredentials: true,
          responseType: 'blob'
        }
      );
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Extract filename from Content-Disposition header or use default
      const contentDisposition = response.headers['content-disposition'];
      const filenameMatch = contentDisposition?.match(/filename="?(.+?)"?$/);
      const filename = filenameMatch ? filenameMatch[1] : `invoice_${Date.now()}.pdf`;
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Invoice generated successfully');
      
      // Reset form
      setFormData({
        job_id: '',
        start_date: '',
        end_date: '',
        invoice_number: '',
        notes: ''
      });
    } catch (error) {
      console.error('Failed to generate invoice:', error);
      if (error.response?.status === 404) {
        toast.error('No hours logs found for the specified criteria');
      } else {
        toast.error('Failed to generate invoice');
      }
    } finally {
      setGenerating(false);
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
    <div data-testid="invoices-page">
      <div className="mb-8">
        <h1 
          className="text-4xl font-semibold tracking-tight text-[#344E41] mb-2" 
          style={{ fontFamily: 'Outfit' }}
        >
          Generate Invoice
        </h1>
        <p className="text-base leading-relaxed text-[#5C6B61]">
          Create professional PDF invoices from your hours logs
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Invoice Form */}
        <div className="bg-white border border-[#EAE6DF] p-6" data-testid="invoice-form-card">
          <h2 
            className="text-2xl font-medium tracking-tight text-[#344E41] mb-6" 
            style={{ fontFamily: 'Outfit' }}
          >
            Invoice Details
          </h2>
          
          <form onSubmit={handleGenerateInvoice} className="space-y-4" data-testid="invoice-form">
            <div>
              <Label htmlFor="job_id" className="text-[#5C6B61] font-medium">Job (Optional)</Label>
              <Select 
                value={formData.job_id} 
                onValueChange={(value) => setFormData({ ...formData, job_id: value })}
              >
                <SelectTrigger 
                  id="job_id"
                  data-testid="invoice-job-select"
                  className="mt-1 border-[#EAE6DF] focus:border-[#344E41] focus:ring-[#344E41]"
                >
                  <SelectValue placeholder="All jobs" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-[#EAE6DF]">
                  {jobs.map((job) => (
                    <SelectItem key={job.job_id} value={job.job_id}>
                      {job.job_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-[#5C6B61] mt-1">Leave empty to include all jobs</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_date" className="text-[#5C6B61] font-medium">Start Date (Optional)</Label>
                <Input
                  id="start_date"
                  data-testid="invoice-start-date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="mt-1 border-[#EAE6DF] focus:border-[#344E41] focus:ring-[#344E41]"
                />
              </div>
              <div>
                <Label htmlFor="end_date" className="text-[#5C6B61] font-medium">End Date (Optional)</Label>
                <Input
                  id="end_date"
                  data-testid="invoice-end-date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="mt-1 border-[#EAE6DF] focus:border-[#344E41] focus:ring-[#344E41]"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="invoice_number" className="text-[#5C6B61] font-medium">Invoice Number (Optional)</Label>
              <Input
                id="invoice_number"
                data-testid="invoice-number-input"
                value={formData.invoice_number}
                onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                className="mt-1 border-[#EAE6DF] focus:border-[#344E41] focus:ring-[#344E41]"
                placeholder="INV-001"
              />
              <p className="text-sm text-[#5C6B61] mt-1">Auto-generated if left empty</p>
            </div>
            
            <div>
              <Label htmlFor="notes" className="text-[#5C6B61] font-medium">Notes (Optional)</Label>
              <Textarea
                id="notes"
                data-testid="invoice-notes-input"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="mt-1 border-[#EAE6DF] focus:border-[#344E41] focus:ring-[#344E41]"
                placeholder="Payment terms, thank you note, etc."
                rows={3}
              />
            </div>
            
            <Button
              type="submit"
              disabled={generating}
              data-testid="generate-invoice-button"
              className="w-full bg-[#344E41] hover:bg-[#2B3A28] text-white flex items-center justify-center gap-2 transition-all duration-200"
            >
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Download size={20} />
                  Generate Invoice
                </>
              )}
            </Button>
          </form>
        </div>
        
        {/* Information Card */}
        <div className="bg-white border border-[#EAE6DF] p-6" data-testid="invoice-info-card">
          <h2 
            className="text-2xl font-medium tracking-tight text-[#344E41] mb-6" 
            style={{ fontFamily: 'Outfit' }}
          >
            What's Included
          </h2>
          
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#344E41]/10 flex items-center justify-center">
                <FileText size={16} className="text-[#344E41]" />
              </div>
              <div>
                <h3 className="text-base font-medium text-[#344E41] mb-1">Professional Format</h3>
                <p className="text-sm text-[#5C6B61]">
                  Clean, branded PDF invoice with your name and email
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#344E41]/10 flex items-center justify-center">
                <FileText size={16} className="text-[#344E41]" />
              </div>
              <div>
                <h3 className="text-base font-medium text-[#344E41] mb-1">Detailed Breakdown</h3>
                <p className="text-sm text-[#5C6B61]">
                  Date-wise listing of hours worked, rates, and amounts
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#344E41]/10 flex items-center justify-center">
                <FileText size={16} className="text-[#344E41]" />
              </div>
              <div>
                <h3 className="text-base font-medium text-[#344E41] mb-1">Automatic Calculations</h3>
                <p className="text-sm text-[#5C6B61]">
                  Total hours and earnings calculated automatically
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#344E41]/10 flex items-center justify-center">
                <FileText size={16} className="text-[#344E41]" />
              </div>
              <div>
                <h3 className="text-base font-medium text-[#344E41] mb-1">Customizable</h3>
                <p className="text-sm text-[#5C6B61]">
                  Filter by job, date range, and add custom notes
                </p>
              </div>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-[#F5F3EE] border-l-4 border-[#344E41]">
            <p className="text-sm text-[#5C6B61]">
              <strong className="text-[#344E41]">Tip:</strong> Generate invoices regularly to maintain accurate billing records. You can create multiple invoices for different time periods or clients.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
