import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  QrCodeIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { assetService } from '@/services/assetService';
import { Asset, AssetType } from '@/types';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import { Card, CardBody } from '@/components/common/Card';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { isAgentOrHigher, isManagerOrHigher } from '@/utils/roleHelpers';
import { getErrorMessage } from '@/utils/helpers';

export default function AssetsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManageAssets = isAgentOrHigher(user);
  const canManageAssetTypes = isManagerOrHigher(user);

  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Filter states
  const [assetTypeFilter, setAssetTypeFilter] = useState<number | ''>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [conditionFilter, setConditionFilter] = useState<string>('');
  const [assignmentFilter, setAssignmentFilter] = useState<string>('');

  // Fetch asset types for filter
  const { data: assetTypes = [] } = useQuery({
    queryKey: ['asset-types'],
    queryFn: () => assetService.getAssetTypes(true),
  });

  // Fetch assets with filters
  const { data: assetsData, isLoading, refetch } = useQuery({
    queryKey: ['assets', page, pageSize, search, assetTypeFilter, statusFilter, conditionFilter, assignmentFilter],
    queryFn: () =>
      assetService.getAssets({
        page,
        page_size: pageSize,
        search: search || undefined,
        asset_type_id: assetTypeFilter || undefined,
        status: (statusFilter as any) || undefined,
        condition: (conditionFilter as any) || undefined,
        is_assigned: assignmentFilter === 'assigned' ? true : assignmentFilter === 'unassigned' ? false : undefined,
      }),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const handleDelete = async (assetId: number, assetTag: string) => {
    if (!confirm(`Are you sure you want to delete asset ${assetTag}?`)) return;

    try {
      await assetService.deleteAsset(assetId);
      toast.success('Asset deleted successfully');
      refetch();
    } catch (error: any) {
      toast.error(getErrorMessage(error, 'Failed to delete asset'));
    }
  };

  const handleExportPDF = async () => {
    try {
      toast.loading('Generating PDF report...', { id: 'pdf-export' });
      await assetService.downloadInventoryPDF({
        asset_type_id: assetTypeFilter ? Number(assetTypeFilter) : undefined,
        status: statusFilter || undefined,
      });
      toast.success('PDF downloaded successfully!', { id: 'pdf-export' });
    } catch (error: any) {
      toast.error(getErrorMessage(error, 'Failed to generate PDF'), { id: 'pdf-export' });
    }
  };

  const clearFilters = () => {
    setSearch('');
    setAssetTypeFilter('');
    setStatusFilter('');
    setConditionFilter('');
    setAssignmentFilter('');
    setPage(1);
  };

  const assets = assetsData?.items || [];
  const totalPages = assetsData?.total_pages || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Asset Management</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage hardware, software, and IT assets
            </p>
          </div>
          <div className="flex gap-2">
            {canManageAssets && (
              <Button
                variant="outline"
                onClick={handleExportPDF}
                className="flex items-center gap-2"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                Export PDF
              </Button>
            )}
            {canManageAssetTypes && (
              <Button
                variant="outline"
                onClick={() => navigate('/assets/types')}
                className="flex items-center gap-2"
              >
                Asset Types
              </Button>
            )}
            {canManageAssets && (
              <Button
                onClick={() => navigate('/assets/new')}
                className="flex items-center gap-2"
              >
                <PlusIcon className="w-4 h-4" />
                New Asset
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardBody>
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by asset tag, name, serial number, model..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 form-input"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg ${
              showFilters ? 'bg-accent-50 border-accent-500 text-accent-700' : 'border-gray-300'
            }`}
          >
            <FunnelIcon className="w-4 h-4" />
            Filters
          </button>
          {(assetTypeFilter || statusFilter || conditionFilter || assignmentFilter) && (
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Expandable Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 pt-4 border-t border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Asset Type
              </label>
              <select
                value={assetTypeFilter}
                onChange={(e) => setAssetTypeFilter(e.target.value ? Number(e.target.value) : '')}
                className="form-input"
              >
                <option value="">All Types</option>
                {assetTypes.map((type: AssetType) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="form-input"
              >
                <option value="">All Status</option>
                <option value="NEW">New</option>
                <option value="ACTIVE">Active</option>
                <option value="IN_MAINTENANCE">In Maintenance</option>
                <option value="RETIRED">Retired</option>
                <option value="DISPOSED">Disposed</option>
                <option value="LOST">Lost</option>
                <option value="STOLEN">Stolen</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Condition
              </label>
              <select
                value={conditionFilter}
                onChange={(e) => setConditionFilter(e.target.value)}
                className="form-input"
              >
                <option value="">All Conditions</option>
                <option value="EXCELLENT">Excellent</option>
                <option value="GOOD">Good</option>
                <option value="FAIR">Fair</option>
                <option value="POOR">Poor</option>
                <option value="DAMAGED">Damaged</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assignment
              </label>
              <select
                value={assignmentFilter}
                onChange={(e) => setAssignmentFilter(e.target.value)}
                className="form-input"
              >
                <option value="">All Assets</option>
                <option value="assigned">Assigned</option>
                <option value="unassigned">Unassigned</option>
              </select>
            </div>
          </div>
        )}
        </CardBody>
      </Card>

      {/* Assets Table */}
      {isLoading ? (
        <LoadingSpinner />
      ) : assets.length === 0 ? (
        <EmptyState
          title="No assets found"
          description="Get started by creating your first asset"
          action={
            canManageAssets && (
              <Button onClick={() => navigate('/assets/new')} className="flex items-center gap-2">
                <PlusIcon className="w-4 h-4" />
                New Asset
              </Button>
            )
          }
        />
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Asset Tag
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name / Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status / Condition
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned To
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {assets.map((asset: Asset) => (
                  <tr key={asset.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <QrCodeIcon className="w-5 h-5 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {asset.asset_tag}
                          </div>
                          {asset.serial_number && (
                            <div className="text-xs text-gray-500">
                              SN: {asset.serial_number}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {asset.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {asset.asset_type_name}
                      </div>
                      {asset.manufacturer && (
                        <div className="text-xs text-gray-400">
                          {asset.manufacturer} {asset.model}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <Badge color={assetService.getStatusColor(asset.status)}>
                          {asset.status.replace('_', ' ')}
                        </Badge>
                        {asset.condition && (
                          <div>
                            <Badge
                              color={assetService.getConditionColor(asset.condition)}
                              variant="outline"
                            >
                              {asset.condition}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {asset.assigned_to_name ? (
                        <div>
                          <div className="text-sm text-gray-900">
                            {asset.assigned_to_name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {asset.assigned_to_email}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {assetService.formatCurrency(asset.current_value)}
                      </div>
                      {asset.purchase_cost && asset.purchase_cost !== asset.current_value && (
                        <div className="text-xs text-gray-500">
                          Was: {assetService.formatCurrency(asset.purchase_cost)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/assets/${asset.id}`)}
                          className="text-purple-600 hover:text-purple-900"
                          title="View Details"
                        >
                          <EyeIcon className="w-5 h-5" />
                        </button>
                        {canManageAssets && (
                          <>
                            <button
                              onClick={() => navigate(`/assets/${asset.id}/edit`)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Edit"
                            >
                              <PencilIcon className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(asset.id, asset.asset_tag)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete"
                            >
                              <TrashIcon className="w-5 h-5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing page <span className="font-medium">{page}</span> of{' '}
                    <span className="font-medium">{totalPages}</span>
                    {' '}(Total: <span className="font-medium">{assetsData?.total || 0}</span> assets)
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => setPage(1)}
                      disabled={page === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      First
                    </button>
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                      {page}
                    </span>
                    <button
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                    <button
                      onClick={() => setPage(totalPages)}
                      disabled={page === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Last
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
