import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  scheduledReportService,
  ScheduledReport,
  REPORT_TYPES,
  REPORT_FREQUENCIES,
  EXPORT_FORMATS,
  DAYS_OF_WEEK,
} from '@/services/scheduledReportService';
import { Card, CardBody } from '@/components/common/Card';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import {
  PlusIcon,
  CalendarIcon,
  ClockIcon,
  EnvelopeIcon,
  PlayIcon,
  PauseIcon,
  TrashIcon,
  PencilIcon,
  DocumentArrowDownIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { formatDate, formatRelativeTime } from '@/utils/helpers';

interface ScheduledReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report?: ScheduledReport;
}

function ScheduledReportModal({ isOpen, onClose, report }: ScheduledReportModalProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: report?.name || '',
    description: report?.description || '',
    report_type: report?.report_type || 'sla_compliance',
    frequency: report?.frequency || 'weekly',
    export_format: report?.export_format || 'pdf',
    schedule_time: report?.schedule_time || '09:00',
    schedule_day: report?.schedule_day || 1,
    recipients: report?.recipients?.join(', ') || '',
    is_active: report?.is_active ?? true,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => scheduledReportService.createScheduledReport(data),
    onSuccess: () => {
      toast.success('Scheduled report created successfully');
      queryClient.invalidateQueries({ queryKey: ['scheduled-reports'] });
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to create scheduled report');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      scheduledReportService.updateScheduledReport(id, data),
    onSuccess: () => {
      toast.success('Scheduled report updated successfully');
      queryClient.invalidateQueries({ queryKey: ['scheduled-reports'] });
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to update scheduled report');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...formData,
      recipients: formData.recipients.split(',').map((email) => email.trim()).filter(Boolean),
    };

    if (report) {
      updateMutation.mutate({ id: report.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4 text-center">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        <div className="relative transform overflow-hidden rounded-xl bg-white text-left shadow-xl transition-all w-full max-w-2xl">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-6 py-5">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">
                {report ? 'Edit Scheduled Report' : 'Create Scheduled Report'}
              </h3>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Report Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="form-input"
                    placeholder="Weekly SLA Report"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="form-input"
                    rows={2}
                    placeholder="Optional description..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
                    <select
                      value={formData.report_type}
                      onChange={(e) => setFormData({ ...formData, report_type: e.target.value })}
                      className="form-input"
                    >
                      {REPORT_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Export Format</label>
                    <select
                      value={formData.export_format}
                      onChange={(e) => setFormData({ ...formData, export_format: e.target.value })}
                      className="form-input"
                    >
                      {EXPORT_FORMATS.map((format) => (
                        <option key={format.value} value={format.value}>
                          {format.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                    <select
                      value={formData.frequency}
                      onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                      className="form-input"
                    >
                      {REPORT_FREQUENCIES.map((freq) => (
                        <option key={freq.value} value={freq.value}>
                          {freq.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Time (UTC)</label>
                    <input
                      type="time"
                      value={formData.schedule_time}
                      onChange={(e) => setFormData({ ...formData, schedule_time: e.target.value })}
                      className="form-input"
                    />
                  </div>

                  {(formData.frequency === 'weekly' || formData.frequency === 'monthly') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {formData.frequency === 'weekly' ? 'Day of Week' : 'Day of Month'}
                      </label>
                      {formData.frequency === 'weekly' ? (
                        <select
                          value={formData.schedule_day}
                          onChange={(e) =>
                            setFormData({ ...formData, schedule_day: parseInt(e.target.value) })
                          }
                          className="form-input"
                        >
                          {DAYS_OF_WEEK.map((day) => (
                            <option key={day.value} value={day.value}>
                              {day.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="number"
                          min="1"
                          max="31"
                          value={formData.schedule_day}
                          onChange={(e) =>
                            setFormData({ ...formData, schedule_day: parseInt(e.target.value) })
                          }
                          className="form-input"
                        />
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Recipients (comma-separated emails)
                  </label>
                  <input
                    type="text"
                    value={formData.recipients}
                    onChange={(e) => setFormData({ ...formData, recipients: e.target.value })}
                    className="form-input"
                    placeholder="email1@example.com, email2@example.com"
                    required
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                    Active (report will be generated automatically)
                  </label>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? 'Saving...'
                  : report
                  ? 'Update'
                  : 'Create'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ScheduledReportsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<ScheduledReport | undefined>();

  const { data: reports, isLoading } = useQuery({
    queryKey: ['scheduled-reports'],
    queryFn: () => scheduledReportService.getScheduledReports(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => scheduledReportService.deleteScheduledReport(id),
    onSuccess: () => {
      toast.success('Scheduled report deleted');
      queryClient.invalidateQueries({ queryKey: ['scheduled-reports'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to delete report');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: number) => scheduledReportService.toggleActive(id),
    onSuccess: (data) => {
      toast.success(`Report ${data.is_active ? 'activated' : 'deactivated'}`);
      queryClient.invalidateQueries({ queryKey: ['scheduled-reports'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to toggle report');
    },
  });

  const executeMutation = useMutation({
    mutationFn: (id: number) => scheduledReportService.executeReport(id, { send_email: true }),
    onSuccess: () => {
      toast.success('Report executed and sent via email');
      queryClient.invalidateQueries({ queryKey: ['scheduled-reports'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to execute report');
    },
  });

  const getStatusIcon = (report: ScheduledReport) => {
    if (!report.is_active) {
      return <PauseIcon className="h-5 w-5 text-gray-400" />;
    }
    return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
  };

  const getReportTypeLabel = (type: string) => {
    return REPORT_TYPES.find((t) => t.value === type)?.label || type;
  };

  const getFrequencyLabel = (frequency: string) => {
    return REPORT_FREQUENCIES.find((f) => f.value === frequency)?.label || frequency;
  };

  const handleEdit = (report: ScheduledReport) => {
    setEditingReport(report);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingReport(undefined);
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this scheduled report?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scheduled Reports</h1>
          <p className="mt-1 text-sm text-gray-500">
            Configure automatic report generation and email delivery
          </p>
        </div>
        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
          <PlusIcon className="h-5 w-5 mr-2" />
          New Schedule
        </Button>
      </div>

      {/* Reports List */}
      <Card>
        <CardBody>
          {isLoading ? (
            <LoadingSpinner />
          ) : !reports || reports.length === 0 ? (
            <div className="text-center py-12">
              <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No scheduled reports</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new scheduled report.</p>
              <div className="mt-6">
                <Button variant="primary" onClick={() => setIsModalOpen(true)}>
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Create Schedule
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="border border-gray-200 rounded-lg p-5 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      {getStatusIcon(report)}
                      <div>
                        <h3 className="font-semibold text-gray-900">{report.name}</h3>
                        {report.description && (
                          <p className="text-sm text-gray-500 mt-1">{report.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <DocumentArrowDownIcon className="h-4 w-4" />
                            {getReportTypeLabel(report.report_type)}
                          </span>
                          <span className="flex items-center gap-1">
                            <ClockIcon className="h-4 w-4" />
                            {getFrequencyLabel(report.frequency)} at {report.schedule_time}
                          </span>
                          <span className="flex items-center gap-1">
                            <EnvelopeIcon className="h-4 w-4" />
                            {report.recipients?.length || 0} recipients
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          {report.last_run_at && (
                            <span>Last run: {formatRelativeTime(report.last_run_at)}</span>
                          )}
                          {report.next_run_at && (
                            <span>Next run: {formatDate(report.next_run_at, 'PPp')}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => executeMutation.mutate(report.id)}
                        disabled={executeMutation.isPending}
                        title="Run now"
                      >
                        <PlayIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleMutation.mutate(report.id)}
                        title={report.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {report.is_active ? (
                          <PauseIcon className="h-4 w-4" />
                        ) : (
                          <PlayIcon className="h-4 w-4 text-green-600" />
                        )}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleEdit(report)} title="Edit">
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(report.id)}
                        title="Delete"
                        className="text-red-600 hover:text-red-700"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Format Badge */}
                  <div className="mt-3 flex items-center gap-2">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        report.export_format === 'pdf'
                          ? 'bg-red-100 text-red-700'
                          : report.export_format === 'excel'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {report.export_format.toUpperCase()}
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        report.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {report.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Modal */}
      <ScheduledReportModal isOpen={isModalOpen} onClose={handleCloseModal} report={editingReport} />
    </div>
  );
}
