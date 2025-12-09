import axiosInstance from '@/lib/axios';
import { Ticket, TicketDetail, TicketComment, TicketActivity, PaginatedResponse, TicketStats } from '@/types';

export interface TicketCreateRequest {
  title: string;
  description: string;
  ticket_type?: 'INCIDENT' | 'REQUEST';
  category_id?: number;
  subcategory_id?: number;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  impact?: 'LOW' | 'MEDIUM' | 'HIGH';
  urgency?: 'LOW' | 'MEDIUM' | 'HIGH';
  asset_id?: number;  // Legacy single asset field
  asset_ids?: number[];  // New multiple assets field
}

export interface TicketUpdateRequest {
  title?: string;
  description?: string;
  category_id?: number;
  subcategory_id?: number;
  priority?: string;
  impact?: string;
  urgency?: string;
  status?: string;
  assignee_id?: number;
  assigned_group_id?: number;
  asset_id?: number;  // Legacy single asset field
  asset_ids?: number[];  // New multiple assets field
}

export interface TicketFilters {
  search?: string;
  ticket_type?: string;
  status?: string;
  priority?: string;
  category_id?: number;
  assignee_id?: number;
  is_unassigned?: boolean;
  requester_id?: number;
  assigned_group_id?: number;
  page?: number;
  page_size?: number;
}

export const ticketService = {
  getTickets: async (filters?: TicketFilters): Promise<PaginatedResponse<Ticket>> => {
    // Clean up filters - remove empty strings and undefined values
    const cleanFilters: Record<string, any> = {};
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          cleanFilters[key] = value;
        }
      });
    }
    const response = await axiosInstance.get<PaginatedResponse<Ticket>>('/tickets', { params: cleanFilters });
    return response.data;
  },

  getTicket: async (id: number): Promise<TicketDetail> => {
    const response = await axiosInstance.get<TicketDetail>(`/tickets/${id}`);
    return response.data;
  },

  getTicketByNumber: async (ticketNumber: string): Promise<TicketDetail> => {
    const response = await axiosInstance.get<TicketDetail>(`/tickets/number/${ticketNumber}`);
    return response.data;
  },

  createTicket: async (data: TicketCreateRequest): Promise<Ticket> => {
    const response = await axiosInstance.post<Ticket>('/tickets', data);
    return response.data;
  },

  updateTicket: async (id: number, data: TicketUpdateRequest): Promise<Ticket> => {
    const response = await axiosInstance.put<Ticket>(`/tickets/${id}`, data);
    return response.data;
  },

  assignTicket: async (id: number, assigneeId?: number, groupId?: number): Promise<Ticket> => {
    const response = await axiosInstance.post<Ticket>(`/tickets/${id}/assign`, {
      assignee_id: assigneeId,
      assigned_group_id: groupId,
    });
    return response.data;
  },

  resolveTicket: async (id: number, resolutionNotes: string): Promise<Ticket> => {
    const response = await axiosInstance.post<Ticket>(`/tickets/${id}/resolve`, {
      resolution_notes: resolutionNotes,
    });
    return response.data;
  },

  closeTicket: async (id: number, closureCode?: string): Promise<Ticket> => {
    const response = await axiosInstance.post<Ticket>(`/tickets/${id}/close`, {
      closure_code: closureCode,
    });
    return response.data;
  },

  addComment: async (ticketId: number, comment: string, isInternal: boolean = false): Promise<TicketComment> => {
    const response = await axiosInstance.post<TicketComment>(`/tickets/${ticketId}/comments`, {
      comment,
      is_internal: isInternal,
    });
    return response.data;
  },

  getComments: async (ticketId: number, includeInternal: boolean = true): Promise<TicketComment[]> => {
    const response = await axiosInstance.get<TicketComment[]>(`/tickets/${ticketId}/comments`, {
      params: { include_internal: includeInternal },
    });
    return response.data;
  },

  getActivities: async (ticketId: number): Promise<TicketActivity[]> => {
    const response = await axiosInstance.get<TicketActivity[]>(`/tickets/${ticketId}/activities`);
    return response.data;
  },

  getStats: async (): Promise<TicketStats> => {
    const response = await axiosInstance.get<TicketStats>('/tickets/stats');
    return response.data;
  },

  pauseSLA: async (ticketId: number, reason: string) => {
    const response = await axiosInstance.post(`/tickets/${ticketId}/sla/pause`, { reason });
    return response.data;
  },

  resumeSLA: async (ticketId: number) => {
    const response = await axiosInstance.post(`/tickets/${ticketId}/sla/resume`);
    return response.data;
  },

  getSLAStatus: async (ticketId: number) => {
    const response = await axiosInstance.get(`/tickets/${ticketId}/sla/status`);
    return response.data;
  },

  uploadAttachment: async (ticketId: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axiosInstance.post(`/tickets/${ticketId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getAttachments: async (ticketId: number) => {
    const response = await axiosInstance.get(`/tickets/${ticketId}/attachments`);
    return response.data;
  },

  getSLAPauses: async (ticketId: number) => {
    const response = await axiosInstance.get(`/tickets/${ticketId}/sla/pauses`);
    return response.data;
  },

  recalculateSLA: async (ticketId: number) => {
    const response = await axiosInstance.post(`/tickets/${ticketId}/sla/recalculate`);
    return response.data;
  },

  overrideDates: async (ticketId: number, data: {
    created_at_override?: string;
    resolved_at_override?: string;
    closed_at_override?: string;
    override_reason: string;
  }) => {
    const response = await axiosInstance.post(`/tickets/${ticketId}/override-dates`, data);
    return response.data;
  },

  clearDateOverrides: async (ticketId: number) => {
    const response = await axiosInstance.delete(`/tickets/${ticketId}/override-dates`);
    return response.data;
  },
};