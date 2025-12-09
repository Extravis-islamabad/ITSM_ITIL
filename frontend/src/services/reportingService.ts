import axiosInstance from '@/lib/axios';

// ============================================================================
// INTERFACES
// ============================================================================

export interface SLAComplianceRequest {
  start_date?: string;
  end_date?: string;
  priority?: string;
  category_id?: number;
}

export interface SLAPriorityBreakdown {
  priority: string;
  total: number;
  met: number;
  breached: number;
  compliance: number;
}

export interface SLACategoryBreakdown {
  category_id: number;
  category_name: string;
  total: number;
  met: number;
  breached: number;
  compliance: number;
}

export interface SLATrendData {
  date: string;
  compliance: number;
  met: number;
  breached: number;
  total: number;
}

export interface SLAComplianceResponse {
  overall_compliance: number;
  response_compliance: number;
  resolution_compliance: number;
  total_tickets: number;
  response_met: number;
  response_breached: number;
  resolution_met: number;
  resolution_breached: number;
  at_risk_count: number;
  breached_count: number;
  by_priority: SLAPriorityBreakdown[];
  by_category: SLACategoryBreakdown[];
  trend_data: SLATrendData[];
}

export interface TicketAgingRequest {
  status_filter?: string[];
  priority_filter?: string;
  assignee_id?: number;
}

export interface TicketSummary {
  id: number;
  ticket_number: string;
  title: string;
  priority: string;
  status: string;
  assignee_name: string;
  created_at: string;
  age_days: number;
  age_hours: number;
}

export interface AgingBucket {
  count: number;
  tickets: TicketSummary[];
}

export interface TicketAgingResponse {
  total_open_tickets: number;
  buckets: {
    '0-24h': AgingBucket;
    '1-3d': AgingBucket;
    '3-7d': AgingBucket;
    '7-14d': AgingBucket;
    '14-30d': AgingBucket;
    '30d+': AgingBucket;
  };
  summary: {
    '0-24h': number;
    '1-3d': number;
    '3-7d': number;
    '7-14d': number;
    '14-30d': number;
    '30d+': number;
  };
}

export interface TechnicianPerformanceRequest {
  start_date: string;
  end_date: string;
  user_id?: number;
}

export interface TechnicianPerformance {
  user_id: number;
  user_name: string;
  email: string;
  total_tickets: number;
  resolved_tickets: number;
  resolution_rate: number;
  avg_resolution_time_hours: number;
  avg_response_time_hours: number;
  sla_compliance: number;
  open_tickets: number;
}

export interface ResponseTimeTrendsRequest {
  start_date: string;
  end_date: string;
  granularity?: 'daily' | 'weekly' | 'monthly';
}

export interface ResponseTimeTrend {
  period: string;
  avg_response_time_hours: number;
  min_response_time_hours: number;
  max_response_time_hours: number;
  ticket_count: number;
}

export interface ResolutionTimeAnalysisRequest {
  start_date: string;
  end_date: string;
  group_by?: 'priority' | 'category' | 'assignee';
}

export interface ResolutionTimeAnalysis {
  group: string;
  avg_resolution_time_hours: number;
  min_resolution_time_hours: number;
  max_resolution_time_hours: number;
  median_resolution_time_hours: number;
  ticket_count: number;
}

export interface TicketVolumeTrendsRequest {
  start_date: string;
  end_date: string;
  granularity?: 'daily' | 'weekly' | 'monthly';
}

export interface TicketVolumeTrendData {
  period: string;
  created: number;
  resolved: number;
  by_priority: Record<string, number>;
  by_status: Record<string, number>;
  by_type: Record<string, number>;
}

export interface TicketVolumeResponse {
  trend_data: TicketVolumeTrendData[];
  total_created: number;
  total_resolved: number;
  summary: {
    avg_daily_volume: number;
  };
}

export interface CategoryBreakdownRequest {
  start_date: string;
  end_date: string;
}

export interface CategoryBreakdown {
  category_id: number;
  category_name: string;
  total_tickets: number;
  resolved_tickets: number;
  open_tickets: number;
  resolution_rate: number;
  avg_resolution_time_hours: number;
  sla_compliance: number;
}

export interface ExportReportRequest {
  report_type: 'sla_compliance' | 'ticket_aging' | 'technician_performance' | 'ticket_volume' | 'category_breakdown';
  format: 'pdf' | 'excel' | 'csv';
  start_date?: string;
  end_date?: string;
  filters?: Record<string, any>;
}

export interface ExportResponse {
  success: boolean;
  file_path?: string;
  file_name?: string;
  download_url?: string;
  message?: string;
}

export interface CurrentKPIs {
  sla_compliance: {
    overall: number;
    response: number;
    resolution: number;
    at_risk_count: number;
    breached_count: number;
  };
  response_time: {
    avg_hours: number;
    trend: 'up' | 'down';
  };
  resolution_time: {
    avg_hours: number;
  };
  ticket_volume: {
    today: number;
    yesterday: number;
    change: number;
    change_percent: number;
  };
  technician_workload: Array<{
    user_id: number;
    name: string;
    open_tickets: number;
  }>;
}

// ============================================================================
// REPORTING SERVICE
// ============================================================================

class ReportingService {
  // SLA Compliance Report
  async getSLACompliance(request: SLAComplianceRequest): Promise<SLAComplianceResponse> {
    const response = await axiosInstance.post('/reports/sla-compliance', request);
    return response.data;
  }

  // Ticket Aging Report
  async getTicketAging(request: TicketAgingRequest): Promise<TicketAgingResponse> {
    const response = await axiosInstance.post('/reports/ticket-aging', request);
    return response.data;
  }

  // Technician Performance Report
  async getTechnicianPerformance(
    request: TechnicianPerformanceRequest
  ): Promise<TechnicianPerformance[]> {
    const response = await axiosInstance.post('/reports/technician-performance', request);
    return response.data;
  }

  // Response Time Trends
  async getResponseTimeTrends(
    request: ResponseTimeTrendsRequest
  ): Promise<ResponseTimeTrend[]> {
    const response = await axiosInstance.post('/reports/response-time-trends', request);
    return response.data;
  }

  // Resolution Time Analysis
  async getResolutionTimeAnalysis(
    request: ResolutionTimeAnalysisRequest
  ): Promise<ResolutionTimeAnalysis[]> {
    const response = await axiosInstance.post('/reports/resolution-time-analysis', request);
    return response.data;
  }

  // Ticket Volume Trends
  async getTicketVolumeTrends(
    request: TicketVolumeTrendsRequest
  ): Promise<TicketVolumeResponse> {
    const response = await axiosInstance.post('/reports/ticket-volume-trends', request);
    return response.data;
  }

  // Category Breakdown
  async getCategoryBreakdown(
    request: CategoryBreakdownRequest
  ): Promise<CategoryBreakdown[]> {
    const response = await axiosInstance.post('/reports/category-breakdown', request);
    return response.data;
  }

  // Export Report
  async exportReport(request: ExportReportRequest): Promise<ExportResponse> {
    const response = await axiosInstance.post('/reports/export', request);
    const data = response.data as ExportResponse;

    // Automatically trigger download if download_url is available
    if (data.success && data.download_url) {
      // Use axios to fetch the file with auth headers
      const downloadResponse = await axiosInstance.get(data.download_url, {
        responseType: 'blob',
      });

      // Create a blob URL and trigger download
      const blob = new Blob([downloadResponse.data], {
        type: request.format === 'pdf' ? 'application/pdf' :
              request.format === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' :
              'text/csv'
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = data.file_name || `report.${request.format === 'excel' ? 'xlsx' : request.format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }

    return data;
  }

  // Get Current KPIs
  async getCurrentKPIs(): Promise<CurrentKPIs> {
    const response = await axiosInstance.get('/reports/kpis/current');
    return response.data;
  }

  // Legacy endpoints (for backwards compatibility)
  async getTicketVolume(startDate?: string, endDate?: string, groupBy: string = 'day') {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    params.append('group_by', groupBy);

    const response = await axiosInstance.get(`/reports/ticket-volume?${params.toString()}`);
    return response.data;
  }

  async getAgentPerformance(startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    const response = await axiosInstance.get(`/reports/agent-performance?${params.toString()}`);
    return response.data;
  }

  async getSLAComplianceLegacy(startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    const response = await axiosInstance.get(`/reports/sla-compliance?${params.toString()}`);
    return response.data;
  }

  async getCategoryAnalysis(startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    const response = await axiosInstance.get(`/reports/category-analysis?${params.toString()}`);
    return response.data;
  }

  async getReportsSummary(startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    const response = await axiosInstance.get(`/reports/summary?${params.toString()}`);
    return response.data;
  }

  // SLA by Customer
  async getSLAByCustomer(startDate?: string, endDate?: string, limit: number = 20) {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    params.append('limit', limit.toString());

    const response = await axiosInstance.get(`/reports/sla/by-customer?${params.toString()}`);
    return response.data;
  }

  // SLA by Project (Category)
  async getSLAByProject(startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    const response = await axiosInstance.get(`/reports/sla/by-project?${params.toString()}`);
    return response.data;
  }

  // SLA by Percentage with detailed breakdown
  async getSLAByPercentage(startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    const response = await axiosInstance.get(`/reports/sla/by-percentage?${params.toString()}`);
    return response.data;
  }
}

export default new ReportingService();
