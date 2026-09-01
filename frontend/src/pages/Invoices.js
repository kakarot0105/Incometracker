import { useEffect, useState } from 'react';
import axios from 'axios';
import { Download, FileText, NotebookPen, ReceiptText, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  MetricPanel,
  PageHero,
  SectionHeading,
} from '@/components/ProductUI';
import { formatInteger } from '@/lib/formatters';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

function InvoicesSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="app-panel-solid rounded-[32px] p-6 md:p-8">
        <div className="mb-6 h-5 w-32 rounded-full bg-[#ece5d8] animate-pulse" />
        <div className="space-y-4">
          <div className="h-12 rounded-[20px] bg-[#f0e7dc] animate-pulse" />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-12 rounded-[20px] bg-[#ede4d8] animate-pulse" />
            <div className="h-12 rounded-[20px] bg-[#f0e7dc] animate-pulse" />
          </div>
          <div className="h-32 rounded-[24px] bg-[#efe7da] animate-pulse" />
        </div>
      </div>
      <div className="app-panel-solid rounded-[32px] p-6 md:p-8">
        <div className="mb-6 h-5 w-24 rounded-full bg-[#ece5d8] animate-pulse" />
        <div className="space-y-4">
          <div className="h-20 rounded-[24px] bg-[#f1eadf] animate-pulse" />
          <div className="h-20 rounded-[24px] bg-[#ede4d8] animate-pulse" />
          <div className="h-20 rounded-[24px] bg-[#f1eadf] animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export default function Invoices() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [formData, setFormData] = useState({
    job_id: '',
    start_date: '',
    end_date: '',
    invoice_number: '',
    notes: '',
  });

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

      const response = await axios.post(`${BACKEND_URL}/api/invoices/generate`, payload, {
        withCredentials: true,
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      const contentDisposition = response.headers['content-disposition'];
      const filenameMatch = contentDisposition?.match(/filename="?(.+?)"?$/);
      const filename = filenameMatch ? filenameMatch[1] : `invoice_${Date.now()}.pdf`;

      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Invoice generated successfully');
      setFormData({
        job_id: '',
        start_date: '',
        end_date: '',
        invoice_number: '',
        notes: '',
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

  const activeJobs = jobs.filter((job) => job.is_active);

  if (loading) {
    return (
      <div className="space-y-6" data-testid="invoices-page">
        <PageHero
          eyebrow="PDF Output"
          title="Generate invoice"
          description="Turn tracked work into a clean invoice without rebuilding the details manually."
        />
        <InvoicesSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="invoices-page">
      <PageHero
        eyebrow="PDF Output"
        title="Generate invoice"
        description="Create a polished PDF invoice from your hours history, then send it with confidence."
        actions={
          <>
            <span className="status-chip status-chip-positive">{formatInteger(activeJobs.length)} active jobs</span>
            <span className="status-chip status-chip-neutral">
              Auto numbering if you leave the invoice number blank
            </span>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <MetricPanel
            icon={ReceiptText}
            label="Invoice source"
            value="Hours logs"
            detail="Pulls directly from the work you have already recorded."
          />
          <MetricPanel
            icon={NotebookPen}
            label="Custom notes"
            value="Included"
            detail="Add payment terms, reminders, or a short thank-you message."
            tone="fresh"
          />
          <MetricPanel
            icon={Sparkles}
            label="Output"
            value="PDF"
            detail="Ready to download, send, and keep with your records."
            tone="warm"
          />
        </div>
      </PageHero>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="app-panel-solid rounded-[32px] p-6 md:p-8" data-testid="invoice-form-card">
          <SectionHeading
            eyebrow="Invoice Builder"
            title="Invoice details"
            description="Select a client, narrow the time range if needed, and generate the document."
          />

          <form onSubmit={handleGenerateInvoice} className="mt-6 space-y-5" data-testid="invoice-form">
            <div className="app-panel rounded-[28px] p-4 space-y-4">
              <div>
                <Label htmlFor="job_id" className="text-sm font-semibold text-[#4c6154]">
                  Job
                </Label>
                <Select
                  value={formData.job_id}
                  onValueChange={(value) => setFormData({ ...formData, job_id: value })}
                >
                  <SelectTrigger id="job_id" data-testid="invoice-job-select" className="mt-2">
                    <SelectValue placeholder="All jobs" />
                  </SelectTrigger>
                  <SelectContent>
                    {jobs.map((job) => (
                      <SelectItem key={job.job_id} value={job.job_id}>
                        {job.job_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-2 text-sm text-[#5a6d61]">Leave this empty to include all jobs.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="start_date" className="text-sm font-semibold text-[#4c6154]">
                    Start date
                  </Label>
                  <Input
                    id="start_date"
                    data-testid="invoice-start-date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="end_date" className="text-sm font-semibold text-[#4c6154]">
                    End date
                  </Label>
                  <Input
                    id="end_date"
                    data-testid="invoice-end-date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="mt-2"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="invoice_number" className="text-sm font-semibold text-[#4c6154]">
                  Invoice number
                </Label>
                <Input
                  id="invoice_number"
                  data-testid="invoice-number-input"
                  value={formData.invoice_number}
                  onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                  className="mt-2"
                  placeholder="INV-001"
                />
                <p className="mt-2 text-sm text-[#5a6d61]">An invoice number is generated automatically if you leave this blank.</p>
              </div>

              <div>
                <Label htmlFor="notes" className="text-sm font-semibold text-[#4c6154]">
                  Notes
                </Label>
                <Textarea
                  id="notes"
                  data-testid="invoice-notes-input"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="mt-2"
                  placeholder="Payment terms, a thank-you note, or anything you want added to the invoice."
                  rows={4}
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={generating}
              data-testid="generate-invoice-button"
              className="w-full h-12"
            >
              {generating ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Generating...
                </>
              ) : (
                <>
                  <Download size={18} />
                  Generate Invoice
                </>
              )}
            </Button>
          </form>
        </section>

        <section className="app-panel-solid rounded-[32px] p-6 md:p-8" data-testid="invoice-info-card">
          <SectionHeading
            eyebrow="What You Get"
            title="Included in every invoice"
            description="Everything is assembled from the work you already logged, so the document stays consistent with your records."
          />

          <div className="mt-6 space-y-4">
            {[
              {
                title: 'Professional PDF layout',
                description: 'A clean invoice format that is ready to send or archive immediately.',
                icon: FileText,
              },
              {
                title: 'Detailed work breakdown',
                description: 'Dates, hours, rates, and totals are pulled from your tracked time.',
                icon: ReceiptText,
              },
              {
                title: 'Flexible filters',
                description: 'Limit the invoice by client or date range when you need a specific billing period.',
                icon: Sparkles,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="app-panel rounded-[26px] p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-[#173229]/8 text-[#173229]">
                      <Icon size={18} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold tracking-tight text-[#173229]" style={{ fontFamily: 'Outfit' }}>
                        {item.title}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-[#5a6d61]">{item.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 rounded-[28px] border border-[#e8d8bf] bg-[#fbf4e6] p-5">
            <p className="page-eyebrow !bg-white/70">Best Practice</p>
            <p className="mt-4 text-sm leading-7 text-[#5a6d61]">
              Generate invoices on a steady cadence. The more consistent your billing windows are, the easier it is to match hours, payments, and statements later.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
