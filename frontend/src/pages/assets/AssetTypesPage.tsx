import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, PencilIcon, TrashIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { assetService } from '@/services/assetService';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Button from '@/components/common/Button';
import { Card, CardBody } from '@/components/common/Card';
import EmptyState from '@/components/common/EmptyState';
import AssetTypeModal from './AssetTypeModal';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { isManagerOrHigher } from '@/utils/roleHelpers';

export default function AssetTypesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canManageAssetTypes = isManagerOrHigher(user);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<any>(null);

  const { data: assetTypes = [], isLoading } = useQuery({
    queryKey: ['asset-types'],
    queryFn: () => assetService.getAssetTypes(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => assetService.deleteAssetType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-types'] });
      toast.success('Asset type deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to delete asset type');
    },
  });

  const handleEdit = (type: any) => {
    setSelectedType(type);
    setIsModalOpen(true);
  };

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedType(null);
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate('/assets')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Back to Assets
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Asset Types</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage categories and types of assets
            </p>
          </div>
          {canManageAssetTypes && (
            <Button
              variant="primary"
              onClick={() => setIsModalOpen(true)}
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              New Asset Type
            </Button>
          )}
        </div>
      </div>

      {/* Asset Types Grid */}
      <Card>
        <CardBody>
          {assetTypes.length === 0 ? (
            <EmptyState
              title="No asset types found"
              description="Get started by creating your first asset type"
              action={
                canManageAssetTypes && (
                  <Button variant="primary" onClick={() => setIsModalOpen(true)}>
                    <PlusIcon className="h-5 w-5 mr-2" />
                    New Asset Type
                  </Button>
                )
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assetTypes.map((type: any) => (
                <div
                  key={type.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                        style={{ backgroundColor: `${type.color}20` }}
                      >
                        {type.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{type.name}</h3>
                        <p className="text-sm text-gray-500">
                          {type.asset_count || 0} asset{type.asset_count !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    {canManageAssetTypes && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(type)}
                          className="text-accent-600 hover:text-accent-900"
                          title="Edit"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(type.id, type.name)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  {type.description && (
                    <p className="mt-2 text-sm text-gray-600">{type.description}</p>
                  )}
                  <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                    <span>{type.is_hardware ? '🔧 Hardware' : '💿 Software'}</span>
                    {type.requires_serial && <span>Serial Required</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Asset Type Modal */}
      <AssetTypeModal
        open={isModalOpen}
        onClose={handleModalClose}
        assetType={selectedType}
      />
    </div>
  );
}
