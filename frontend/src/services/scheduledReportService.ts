import axiosInstance from '@/lib/axios';

export interface ScheduledReport {
  id: number;
  name: string;
  description?: string;
  report_type: string;
  frequency: string;
  export_format: string;
  schedule_time?: string;
  schedule_day?: number;
  recipients: string[];
  filters?: Record<string, any>;
  is_active: boolean;
  last_run_at?: string;
  next_run_at?: string;
  created_by_id: number;
  created_by_name?: string;
  created_at: string;
  updated_at?: string;
}

export interface ReportExecution {
  id: number;
  scheduled_report_id: number;
  executed_at: string;
  status: string;
  error_message?: string;
  file_path?: string;
  file_size?: number;
  record_count?: number;
  email_sent: boolean;
  email_sent_at?: string;
  email_error?: string;
}

export interface CreateScheduledReportRequest {
  name: string;
  description?: string;
  report_type: string;
  frequency: string;
  export_format: string;
  schedule_time: string;
  schedule_day?: number;
  recipients: string[];
  filters?: Record<string, any>;
  is_active?: boolean;
}

export interface UpdateScheduledReportRequest {
  name?: string;
  description?: string;
  report_type?: string;
  frequency?: string;
  export_format?: string;
  schedule_time?: string;
  schedule_day?: number;
  recipients?: string[];
  filters?: Record<string, any>;
  is_active?: boolean;
}

export interface ExecuteReportRequest {
  send_email?: boolean;
  additional_recipients?: string[];
}

export const scheduledReportService = {
  getScheduledReports: async (isActive?: boolean, myReportsOnly: boolean = false): Promise<ScheduledReport[]> => {
    const params: Record<string, any> = {};
    if (isActive !== undefined) params.is_active = isActive;
    if (myReportsOnly) params.my_reports_only = true;
    const response = await axiosInstance.get<ScheduledReport[]>('/scheduled-reports', { params });
    return response.data;
  },

  getScheduledReport: async (id: number): Promise<ScheduledReport> => {
    const response = await axiosInstance.get<ScheduledReport>(`/scheduled-reports/${id}`);
    return response.data;
  },

  createScheduledReport: async (data: CreateScheduledReportRequest): Promise<ScheduledReport> => {
    const response = await axiosInstance.post<ScheduledReport>('/scheduled-reports', data);
    return response.data;
  },

  updateScheduledReport: async (id: number, data: UpdateScheduledReportRequest): Promise<ScheduledReport> => {
    const response = await axiosInstance.put<ScheduledReport>(`/scheduled-reports/${id}`, data);
    return response.data;
  },

  deleteScheduledReport: async (id: number): Promise<void> => {
    await axiosInstance.delete(`/scheduled-reports/${id}`);
  },

  executeReport: async (id: number, data?: ExecuteReportRequest): Promise<ReportExecution> => {
    const response = await axiosInstance.post<ReportExecution>(`/scheduled-reports/${id}/execute`, data || {});
    return response.data;
  },

  getExecutionHistory: async (id: number, limit: number = 10): Promise<ReportExecution[]> => {
    const response = await axiosInstance.get<ReportExecution[]>(`/scheduled-reports/${id}/history`, {
      params: { limit }
    });
    return response.data;
  },

  toggleActive: async (id: number): Promise<{ is_active: boolean }> => {
    const response = await axiosInstance.post<{ message: string; is_active: boolean }>(
      `/scheduled-reports/${id}/toggle-active`
    );
    return response.data;
  }
};

// Report type and frequency options for UI
export const REPORT_TYPES = [
  { value: 'sla_compliance', label: 'SLA Compliance' },
  { value: 'ticket_aging', label: 'Ticket Aging' },
  { value: 'technician_performance', label: 'Technician Performance' },
  { value: 'first_response_time', label: 'First Response Time' },
  { value: 'resolution_time', label: 'Resolution Time' },
  { value: 'ticket_volume', label: 'Ticket Volume' },
  { value: 'category_breakdown', label: 'Category Breakdown' },
];

export const REPORT_FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
];

export const EXPORT_FORMATS = [
  { value: 'pdf', label: 'PDF' },
  { value: 'excel', label: 'Excel' },
  { value: 'csv', label: 'CSV' },
];

export const DAYS_OF_WEEK = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 7, label: 'Sunday' },
];
