import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { Card, CardBody } from '@/components/common/Card';
import Button from '@/components/common/Button';
import axiosInstance from '@/lib/axios';
import { assetService } from '@/services/assetService';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface ServiceCatalogModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ServiceCatalogModal({ open, onClose, onSuccess }: ServiceCatalogModalProps) {
  const navigate = useNavigate();
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [selectedAssets, setSelectedAssets] = useState<number[]>([]);
  const [assetSearch, setAssetSearch] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category_id: null as number | null,
    priority: 'MEDIUM',
    impact: 'MEDIUM',
    urgency: 'MEDIUM',
    asset_ids: [] as number[],
  });

  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ['service-request-templates'],
    queryFn: async () => {
      const res = await axiosInstance.get('/service-requests/templates');
      return res.data;
    },
    enabled: open,
  });

  const { data: assetsData } = useQuery({
    queryKey: ['assets-for-service-request'],
    queryFn: () => assetService.getAssets({ page: 1, page_size: 500, status: 'ACTIVE' }),
    enabled: open && !!selectedTemplate,
  });

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setSelectedTemplate(null);
      setSelectedAssets([]);
      setAssetSearch('');
      setFormData({
        title: '',
        description: '',
        category_id: null,
        priority: 'MEDIUM',
        impact: 'MEDIUM',
        urgency: 'MEDIUM',
        asset_ids: [],
      });
    }
  }, [open]);

  const toggleAsset = (assetId: number) => {
    setSelectedAssets(prev => {
      const newSelection = prev.includes(assetId)
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId];
      setFormData({ ...formData, asset_ids: newSelection });
      return newSelection;
    });
  };

  const removeAsset = (assetId: number) => {
    setSelectedAssets(prev => {
      const newSelection = prev.filter(id => id !== assetId);
      setFormData({ ...formData, asset_ids: newSelection });
      return newSelection;
    });
  };

  // Filter assets based on search
  const filteredAssets = (assetsData?.items || []).filter((asset: any) => {
    if (!assetSearch) return true;
    const searchLower = assetSearch.toLowerCase();
    return (
      asset.name?.toLowerCase().includes(searchLower) ||
      asset.asset_tag?.toLowerCase().includes(searchLower) ||
      asset.serial_number?.toLowerCase().includes(searchLower)
    );
  });

  // Get selected asset details for display
  const selectedAssetDetails = (assetsData?.items || []).filter((asset: any) =>
    selectedAssets.includes(asset.id)
  );

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await axiosInstance.post('/tickets', {
        ...data,
        asset_ids: selectedAssets.length > 0 ? selectedAssets : undefined,
        ticket_type: 'REQUEST',
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success('Service request created successfully');
      onSuccess();
      navigate(`/service-requests/${data.id}`);
    },
    onError: () => {
      toast.error('Failed to create service request');
    },
  });

  const handleTemplateSelect = (template: any) => {
    setSelectedTemplate(template);
    setSelectedAssets([]);
    setAssetSearch('');
    setFormData({
      ...formData,
      title: template.name,
      description: template.description,
      category_id: template.category_id,
      asset_ids: [],
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      asset_ids: selectedAssets.length > 0 ? selectedAssets : undefined,
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {selectedTemplate ? 'Request Details' : 'Service Catalog'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {!selectedTemplate ? (
            templatesLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-500">Loading service templates...</p>
              </div>
            ) : templates?.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Service Templates Available</h3>
                <p className="text-gray-500 mb-6">Service request templates have not been configured yet.</p>
                <p className="text-sm text-gray-400">Please contact your administrator to set up service templates.</p>
              </div>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates?.map((template: any) => (
                <Card
                  key={template.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => handleTemplateSelect(template)}
                >
                  <CardBody>
                    <div className="flex items-start gap-4">
                      <div className="text-4xl">{template.icon || '📋'}</div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-2">{template.name}</h3>
                        <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">
                            ~{template.estimated_days} days
                          </span>
                          {template.requires_approval && (
                            <span className="badge bg-yellow-100 text-yellow-800">
                              Requires Approval
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
            )
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                <div className="text-3xl">{selectedTemplate.icon}</div>
                <div>
                  <h3 className="font-semibold text-blue-900">{selectedTemplate.name}</h3>
                  <p className="text-sm text-blue-700 mt-1">{selectedTemplate.description}</p>
                  {selectedTemplate.requires_approval && (
                    <p className="text-xs text-blue-600 mt-2">
                      ⚠️ This request requires manager approval
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="form-label">Title *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="form-label">Description *</label>
                <textarea
                  className="form-input"
                  rows={5}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  placeholder="Provide detailed information about your request..."
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="form-label">Priority</label>
                  <select
                    className="form-input"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Impact</label>
                  <select
                    className="form-input"
                    value={formData.impact}
                    onChange={(e) => setFormData({ ...formData, impact: e.target.value })}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Urgency</label>
                  <select
                    className="form-input"
                    value={formData.urgency}
                    onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
              </div>

              {/* Multi-select Assets Section */}
              <div>
                <label className="form-label">Related Assets (optional)</label>

                {/* Selected Assets Display */}
                {selectedAssetDetails.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {selectedAssetDetails.map((asset: any) => (
                      <span
                        key={asset.id}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm"
                      >
                        <span className="font-medium">{asset.asset_tag}</span>
                        <span className="text-blue-600">- {asset.name}</span>
                        <button
                          type="button"
                          onClick={() => removeAsset(asset.id)}
                          className="ml-1 hover:text-blue-900"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Asset Search */}
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={assetSearch}
                    onChange={(e) => setAssetSearch(e.target.value)}
                    placeholder="Search assets by name, tag, or serial number..."
                    className="form-input pl-9"
                  />
                </div>

                {/* Asset List */}
                <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
                  {filteredAssets.length === 0 ? (
                    <div className="p-3 text-sm text-gray-500 text-center">
                      {assetSearch ? 'No assets found matching your search' : 'No active assets available'}
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {filteredAssets.slice(0, 20).map((asset: any) => (
                        <label
                          key={asset.id}
                          className="flex items-center gap-3 p-2 hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedAssets.includes(asset.id)}
                            onChange={() => toggleAsset(asset.id)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">{asset.asset_tag}</span>
                              <span className="text-gray-500">-</span>
                              <span className="text-gray-700 truncate">{asset.name}</span>
                            </div>
                            {asset.serial_number && (
                              <div className="text-xs text-gray-500">S/N: {asset.serial_number}</div>
                            )}
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            asset.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                            asset.status === 'IN_MAINTENANCE' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {asset.status}
                          </span>
                        </label>
                      ))}
                      {filteredAssets.length > 20 && (
                        <div className="p-2 text-sm text-gray-500 text-center bg-gray-50">
                          Showing first 20 results. Refine your search to see more.
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {selectedAssets.length} asset{selectedAssets.length !== 1 ? 's' : ''} selected
                </p>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedTemplate(null)}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={createMutation.isPending}
                  disabled={createMutation.isPending}
                >
                  Submit Request
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}