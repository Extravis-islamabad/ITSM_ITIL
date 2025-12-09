import axiosInstance from '@/lib/axios';
import {
  Asset,
  AssetDetail,
  AssetType,
  AssetAssignment,
  AssetRelationship,
  AssetContract,
  AssetAnalytics,
  AssetQRCode,
  AssetFilterParams,
  PaginatedResponse,
} from '@/types';

export const assetService = {
  // ==================== Asset Types ====================

  async getAssetTypes(is_active?: boolean): Promise<AssetType[]> {
    const params = is_active !== undefined ? { is_active } : {};
    const response = await axiosInstance.get('/assets/types', { params });
    return response.data;
  },

  async createAssetType(data: Partial<AssetType>): Promise<AssetType> {
    const response = await axiosInstance.post('/assets/types', data);
    return response.data;
  },

  async updateAssetType(id: number, data: Partial<AssetType>): Promise<AssetType> {
    const response = await axiosInstance.put(`/assets/types/${id}`, data);
    return response.data;
  },

  async deleteAssetType(id: number): Promise<void> {
    await axiosInstance.delete(`/assets/types/${id}`);
  },

  // ==================== Assets ====================

  async getAssets(params: AssetFilterParams = {}): Promise<PaginatedResponse<Asset>> {
    const response = await axiosInstance.get('/assets', { params });
    return response.data;
  },

  async getAsset(id: number): Promise<AssetDetail> {
    const response = await axiosInstance.get(`/assets/${id}`);
    return response.data;
  },

  async createAsset(data: Partial<Asset>): Promise<Asset> {
    const response = await axiosInstance.post('/assets', data);
    return response.data;
  },

  async updateAsset(id: number, data: Partial<Asset>): Promise<Asset> {
    const response = await axiosInstance.put(`/assets/${id}`, data);
    return response.data;
  },

  async deleteAsset(id: number): Promise<void> {
    await axiosInstance.delete(`/assets/${id}`);
  },

  // ==================== Asset Assignment ====================

  async assignAsset(assetId: number, data: {
    user_id: number;
    notes?: string;
  }): Promise<AssetAssignment> {
    const response = await axiosInstance.post(`/assets/${assetId}/assign`, {
      asset_id: assetId,
      ...data,
    });
    return response.data;
  },

  async returnAsset(assetId: number, notes?: string): Promise<AssetAssignment> {
    const response = await axiosInstance.post(`/assets/${assetId}/return`, { notes });
    return response.data;
  },

  // ==================== Asset Relationships ====================

  async createRelationship(data: {
    parent_asset_id: number;
    child_asset_id: number;
    relationship_type: string;
    description?: string;
  }): Promise<AssetRelationship> {
    const response = await axiosInstance.post(`/assets/${data.parent_asset_id}/relationships`, data);
    return response.data;
  },

  async deleteRelationship(relationshipId: number): Promise<void> {
    await axiosInstance.delete(`/assets/relationships/${relationshipId}`);
  },

  // ==================== Asset Contracts ====================

  async createContract(assetId: number, data: Partial<AssetContract>): Promise<AssetContract> {
    const response = await axiosInstance.post(`/assets/${assetId}/contracts`, {
      asset_id: assetId,
      ...data,
    });
    return response.data;
  },

  async updateContract(contractId: number, data: Partial<AssetContract>): Promise<AssetContract> {
    const response = await axiosInstance.put(`/assets/contracts/${contractId}`, data);
    return response.data;
  },

  async deleteContract(contractId: number): Promise<void> {
    await axiosInstance.delete(`/assets/contracts/${contractId}`);
  },

  // ==================== QR Code ====================

  async getAssetQRCode(assetId: number): Promise<AssetQRCode> {
    const response = await axiosInstance.get(`/assets/${assetId}/qr-code`);
    return response.data;
  },

  // ==================== Analytics ====================

  async getAnalytics(): Promise<AssetAnalytics> {
    const response = await axiosInstance.get('/assets/analytics/overview');
    return response.data;
  },

  // ==================== Reports ====================

  async getInventoryReport(params: {
    asset_type_id?: number;
    status?: string;
    department_id?: number;
    format?: 'json' | 'pdf';
  } = {}): Promise<any> {
    const response = await axiosInstance.get('/assets/reports/inventory', { params });
    if (params.format === 'pdf') {
      return response.data; // Binary PDF data
    }
    return response.data;
  },

  async getLifecycleReport(): Promise<any> {
    const response = await axiosInstance.get('/assets/reports/lifecycle');
    return response.data;
  },

  async getWarrantiesReport(status: 'all' | 'active' | 'expiring' | 'expired' = 'all'): Promise<any> {
    const response = await axiosInstance.get('/assets/reports/warranties', { params: { status } });
    return response.data;
  },

  async getAssignmentsReport(params: {
    user_id?: number;
    current?: boolean;
  } = {}): Promise<any> {
    const response = await axiosInstance.get('/assets/reports/assignments', { params });
    return response.data;
  },

  async getValueReport(group_by: 'type' | 'department' | 'status' = 'type'): Promise<any> {
    const response = await axiosInstance.get('/assets/reports/value', { params: { group_by } });
    return response.data;
  },

  async downloadInventoryPDF(params: {
    asset_type_id?: number;
    status?: string;
    department_id?: number;
  } = {}): Promise<void> {
    const response = await axiosInstance.get('/assets/reports/inventory', {
      params: { ...params, format: 'pdf' },
      responseType: 'blob',
    });

    // Create blob URL and trigger download
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `asset_inventory_${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  // ==================== Helper Functions ====================

  generateAssetTag(): string {
    const prefix = 'AST';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${timestamp}-${random}`;
  },

  getStatusColor(status: string): 'blue' | 'green' | 'yellow' | 'gray' | 'red' {
    const colors: { [key: string]: 'blue' | 'green' | 'yellow' | 'gray' | 'red' } = {
      'NEW': 'blue',
      'ACTIVE': 'green',
      'IN_MAINTENANCE': 'yellow',
      'RETIRED': 'gray',
      'DISPOSED': 'red',
      'LOST': 'red',
      'STOLEN': 'red',
    };
    return colors[status] || 'gray';
  },

  getConditionColor(condition: string): 'green' | 'blue' | 'yellow' | 'orange' | 'red' | 'gray' {
    const colors: { [key: string]: 'green' | 'blue' | 'yellow' | 'orange' | 'red' | 'gray' } = {
      'EXCELLENT': 'green',
      'GOOD': 'blue',
      'FAIR': 'yellow',
      'POOR': 'orange',
      'DAMAGED': 'red',
    };
    return colors[condition] || 'gray';
  },

  formatCurrency(amount?: number): string {
    if (!amount) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  },

  isWarrantyExpiring(endDate?: string, days: number = 30): boolean {
    if (!endDate) return false;
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= days;
  },

  isWarrantyExpired(endDate?: string): boolean {
    if (!endDate) return false;
    return new Date(endDate) < new Date();
  },
};
