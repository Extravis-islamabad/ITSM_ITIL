import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeftIcon,
  PencilIcon,
  QrCodeIcon,
  UserPlusIcon,
  DocumentPlusIcon,
  LinkIcon,
  ClockIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { assetService } from '@/services/assetService';
import { userService } from '@/services/userService';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import { Card, CardHeader, CardBody } from '@/components/common/Card';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { isAgentOrHigher } from '@/utils/roleHelpers';
import { User } from '@/types';

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canManageAssets = isAgentOrHigher(user);

  const [showQR, setShowQR] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [showRelationshipModal, setShowRelationshipModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | ''>('');
  const [assignNotes, setAssignNotes] = useState('');
  const [returnNotes, setReturnNotes] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Contract form state
  const [contractForm, setContractForm] = useState({
    contract_type: 'WARRANTY',
    provider: '',
    contract_number: '',
    start_date: '',
    end_date: '',
    cost: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    notes: '',
  });

  // Relationship form state
  const [relationshipForm, setRelationshipForm] = useState({
    child_asset_id: '',
    relationship_type: 'CONNECTED_TO',
    description: '',
  });

  // Fetch asset details
  const { data: asset, isLoading, refetch } = useQuery({
    queryKey: ['asset', id],
    queryFn: () => assetService.getAsset(Number(id)),
    enabled: !!id,
  });

  // Fetch users for assignment dropdown
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => userService.getUsers({ page: 1, page_size: 1000 }),
    enabled: showAssignModal,
  });

  const users = usersData?.items || [];

  const handleAssign = async () => {
    if (!selectedUserId) {
      toast.error('Please select a user');
      return;
    }

    setIsAssigning(true);
    try {
      await assetService.assignAsset(Number(id), {
        user_id: Number(selectedUserId),
        notes: assignNotes || undefined,
      });
      toast.success('Asset assigned successfully');
      setShowAssignModal(false);
      setSelectedUserId('');
      setAssignNotes('');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['asset', id] });
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to assign asset');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleReturn = async () => {
    setIsAssigning(true);
    try {
      await assetService.returnAsset(Number(id), returnNotes || undefined);
      toast.success('Asset returned successfully');
      setShowReturnModal(false);
      setReturnNotes('');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['asset', id] });
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to return asset');
    } finally {
      setIsAssigning(false);
    }
  };

  // Fetch all assets for relationship dropdown (always fetch so data is ready when modal opens)
  const { data: allAssetsData, isLoading: isLoadingAssets } = useQuery({
    queryKey: ['all-assets-for-relationship'],
    queryFn: () => assetService.getAssets({ page: 1, page_size: 1000 }),
    staleTime: 30000, // Cache for 30 seconds
  });

  const allAssets = (allAssetsData?.items || []).filter((a: any) => a.id !== Number(id));

  const handleAddContract = async () => {
    if (!contractForm.provider || !contractForm.start_date || !contractForm.end_date) {
      toast.error('Please fill in required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      // Build clean data object, only include non-empty values
      const cleanData: Record<string, any> = {
        contract_type: contractForm.contract_type,
        provider: contractForm.provider,
        start_date: `${contractForm.start_date}T00:00:00`,
        end_date: `${contractForm.end_date}T00:00:00`,
      };

      // Add optional fields only if they have values
      if (contractForm.contract_number) cleanData.contract_number = contractForm.contract_number;
      if (contractForm.cost) cleanData.cost = parseFloat(contractForm.cost);
      if (contractForm.contact_name) cleanData.contact_name = contractForm.contact_name;
      if (contractForm.contact_email) cleanData.contact_email = contractForm.contact_email;
      if (contractForm.contact_phone) cleanData.contact_phone = contractForm.contact_phone;
      if (contractForm.notes) cleanData.notes = contractForm.notes;

      await assetService.createContract(Number(id), cleanData);
      toast.success('Contract added successfully');
      setShowContractModal(false);
      setContractForm({
        contract_type: 'WARRANTY',
        provider: '',
        contract_number: '',
        start_date: '',
        end_date: '',
        cost: '',
        contact_name: '',
        contact_email: '',
        contact_phone: '',
        notes: '',
      });
      refetch();
    } catch (error: any) {
      const errorDetail = error.response?.data?.detail;
      if (Array.isArray(errorDetail)) {
        toast.error(errorDetail.map((e: any) => e.msg).join(', '));
      } else {
        toast.error(errorDetail || 'Failed to add contract');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddRelationship = async () => {
    if (!relationshipForm.child_asset_id) {
      toast.error('Please select an asset');
      return;
    }

    setIsSubmitting(true);
    try {
      await assetService.createRelationship({
        parent_asset_id: Number(id),
        child_asset_id: Number(relationshipForm.child_asset_id),
        relationship_type: relationshipForm.relationship_type,
        description: relationshipForm.description || undefined,
      });
      toast.success('Relationship added successfully');
      setShowRelationshipModal(false);
      setRelationshipForm({
        child_asset_id: '',
        relationship_type: 'CONNECTED_TO',
        description: '',
      });
      refetch();
    } catch (error: any) {
      const errorDetail = error.response?.data?.detail;
      if (Array.isArray(errorDetail)) {
        toast.error(errorDetail.map((e: any) => e.msg).join(', '));
      } else {
        toast.error(errorDetail || 'Failed to add relationship');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateQR = async () => {
    try {
      const qr = await assetService.getAssetQRCode(Number(id));
      setQrCode(qr.qr_code_data);
      setShowQR(true);
    } catch (error: any) {
      toast.error('Failed to generate QR code');
    }
  };

  const handleDownloadQR = () => {
    if (!qrCode) return;
    const link = document.createElement('a');
    link.href = qrCode;
    link.download = `asset-${asset?.asset_tag}-qr.png`;
    link.click();
  };

  if (isLoading) return <LoadingSpinner />;
  if (!asset) return <div>Asset not found</div>;

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
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{asset.name}</h1>
              <Badge color={assetService.getStatusColor(asset.status)}>
                {asset.status.replace('_', ' ')}
              </Badge>
              {asset.condition && (
                <Badge
                  color={assetService.getConditionColor(asset.condition)}
                  variant="outline"
                >
                  {asset.condition}
                </Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {asset.asset_type_name} " {asset.asset_tag}
            </p>
          </div>
          <div className="flex gap-2">
            {canManageAssets && (
              <>
                <Button
                  variant="outline"
                  onClick={handleGenerateQR}
                  className="flex items-center gap-2"
                >
                  <QrCodeIcon className="w-4 h-4" />
                  QR Code
                </Button>
                <Button
                  onClick={() => navigate(`/assets/${id}/edit`)}
                  className="flex items-center gap-2"
                >
                  <PencilIcon className="w-4 h-4" />
                  Edit Asset
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQR && qrCode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Asset QR Code</h3>
            <div className="flex justify-center mb-4">
              <img src={qrCode} alt="Asset QR Code" className="w-64 h-64" />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleDownloadQR} className="flex-1">
                Download
              </Button>
              <Button variant="outline" onClick={() => setShowQR(false)} className="flex-1">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
            </CardHeader>
            <CardBody>
            <div className="grid grid-cols-2 gap-4">
              <InfoItem label="Asset Tag" value={asset.asset_tag} />
              <InfoItem label="Serial Number" value={asset.serial_number} />
              <InfoItem label="Manufacturer" value={asset.manufacturer} />
              <InfoItem label="Model" value={asset.model} />
              <InfoItem label="Location" value={asset.location} />
              <InfoItem label="Department" value={asset.department_name} />
              {asset.hostname && <InfoItem label="Hostname" value={asset.hostname} />}
              {asset.ip_address && <InfoItem label="IP Address" value={asset.ip_address} />}
              {asset.mac_address && <InfoItem label="MAC Address" value={asset.mac_address} />}
            </div>
            {asset.description && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-medium text-gray-700 mb-1">Description</p>
                <p className="text-sm text-gray-600">{asset.description}</p>
              </div>
            )}
            </CardBody>
          </Card>

          {/* Financial Information */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Financial Information</h3>
            </CardHeader>
            <CardBody>
            <div className="grid grid-cols-2 gap-4">
              <InfoItem
                label="Purchase Date"
                value={asset.purchase_date ? format(new Date(asset.purchase_date), 'PPP') : null}
              />
              <InfoItem label="Supplier" value={asset.supplier} />
              <InfoItem
                label="Purchase Cost"
                value={assetService.formatCurrency(asset.purchase_cost)}
              />
              <InfoItem
                label="Current Value"
                value={assetService.formatCurrency(asset.current_value)}
              />
              <InfoItem label="PO Number" value={asset.po_number} />
              {asset.purchase_cost && asset.current_value && (
                <InfoItem
                  label="Depreciation"
                  value={assetService.formatCurrency(
                    asset.purchase_cost - asset.current_value
                  )}
                />
              )}
            </div>
            </CardBody>
          </Card>

          {/* License Information (if applicable) */}
          {asset.license_key && (
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900">License Information</h3>
              </CardHeader>
              <CardBody>
              <div className="grid grid-cols-2 gap-4">
                <InfoItem label="License Key" value={asset.license_key} sensitive />
                <InfoItem
                  label="Expiry Date"
                  value={asset.license_expiry ? format(new Date(asset.license_expiry), 'PPP') : null}
                />
                <InfoItem label="License Seats" value={asset.license_seats?.toString()} />
              </div>
              </CardBody>
            </Card>
          )}

          {/* Assignment History */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Assignment History</h3>
                {canManageAssets && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAssignModal(true)}
                  >
                    <UserPlusIcon className="w-4 h-4 mr-1" />
                    Assign
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardBody>
            {asset.assignments && asset.assignments.length > 0 ? (
              <div className="space-y-3">
                {asset.assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className={`p-3 rounded-lg border ${
                      assignment.is_current
                        ? 'border-green-200 bg-green-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {assignment.user_name}
                        </p>
                        <p className="text-sm text-gray-500">{assignment.user_email}</p>
                      </div>
                      {assignment.is_current && (
                        <Badge color="green">Current</Badge>
                      )}
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      Assigned: {format(new Date(assignment.assigned_date), 'PPp')}
                      {assignment.returned_date && (
                        <span className="ml-2">
                          " Returned: {format(new Date(assignment.returned_date), 'PPp')}
                        </span>
                      )}
                    </div>
                    {assignment.notes && (
                      <p className="mt-1 text-sm text-gray-600">{assignment.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No assignment history</p>
            )}
            </CardBody>
          </Card>

          {/* Contracts & Warranties */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Contracts & Warranties</h3>
                {canManageAssets && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowContractModal(true)}
                  >
                    <DocumentPlusIcon className="w-4 h-4 mr-1" />
                    Add Contract
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardBody>
            {asset.contracts && asset.contracts.length > 0 ? (
              <div className="space-y-3">
                {asset.contracts.map((contract) => (
                  <div key={contract.id} className="p-3 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium text-gray-900">
                          {contract.contract_type}
                        </p>
                        <p className="text-sm text-gray-500">{contract.provider}</p>
                      </div>
                      <Badge
                        color={
                          contract.is_expired
                            ? 'red'
                            : contract.days_until_expiry && contract.days_until_expiry <= 30
                            ? 'yellow'
                            : 'green'
                        }
                      >
                        {contract.is_expired
                          ? 'Expired'
                          : `${contract.days_until_expiry} days left`}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-500">
                      {format(new Date(contract.start_date), 'PPP')} -{' '}
                      {format(new Date(contract.end_date), 'PPP')}
                    </div>
                    {contract.cost && (
                      <div className="text-sm font-medium text-gray-700 mt-1">
                        {assetService.formatCurrency(contract.cost)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No contracts or warranties</p>
            )}
            </CardBody>
          </Card>

          {/* Relationships */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Asset Relationships</h3>
                {canManageAssets && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowRelationshipModal(true)}
                  >
                    <LinkIcon className="w-4 h-4 mr-1" />
                    Add Relationship
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardBody>
            {asset.parent_relationships && asset.parent_relationships.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">This asset uses:</h4>
                <div className="space-y-2">
                  {asset.parent_relationships.map((rel) => (
                    <div key={rel.id} className="flex items-center text-sm">
                      <Badge variant="outline">{rel.relationship_type}</Badge>
                      <span className="ml-2 text-gray-900">
                        {rel.child_asset_name} ({rel.child_asset_tag})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {asset.child_relationships && asset.child_relationships.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Used by:</h4>
                <div className="space-y-2">
                  {asset.child_relationships.map((rel) => (
                    <div key={rel.id} className="flex items-center text-sm">
                      <Badge variant="outline">{rel.relationship_type}</Badge>
                      <span className="ml-2 text-gray-900">
                        {rel.parent_asset_name} ({rel.parent_asset_tag})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(!asset.parent_relationships || asset.parent_relationships.length === 0) &&
              (!asset.child_relationships || asset.child_relationships.length === 0) && (
                <p className="text-sm text-gray-500">No relationships defined</p>
              )}
            </CardBody>
          </Card>

          {/* History */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Audit History</h3>
            </CardHeader>
            <CardBody>
            {asset.history && asset.history.length > 0 ? (
              <div className="space-y-3">
                {asset.history.slice(0, 10).map((entry) => (
                  <div key={entry.id} className="flex gap-3 text-sm">
                    <ClockIcon className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-900">{entry.action}</p>
                        <span className="text-xs text-gray-500">
                          {format(new Date(entry.created_at), 'PPp')}
                        </span>
                      </div>
                      {entry.description && (
                        <p className="text-gray-600 mt-1">{entry.description}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        by {entry.user_name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No history available</p>
            )}
            </CardBody>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Current Assignment */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Current Assignment</h3>
            </CardHeader>
            <CardBody>
            {asset.assigned_to_name ? (
              <div>
                <p className="font-medium text-gray-900">{asset.assigned_to_name}</p>
                <p className="text-sm text-gray-500">{asset.assigned_to_email}</p>
                {asset.assigned_date && (
                  <p className="text-xs text-gray-500 mt-2">
                    Since {format(new Date(asset.assigned_date), 'PPP')}
                  </p>
                )}
                {canManageAssets && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full"
                    onClick={() => setShowReturnModal(true)}
                  >
                    Return Asset
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500 mb-3">Not assigned</p>
                {canManageAssets && (
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => setShowAssignModal(true)}
                  >
                    Assign Asset
                  </Button>
                )}
              </div>
            )}
            </CardBody>
          </Card>

          {/* Warranty Status */}
          {asset.warranty_end_date && (
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900">Warranty Status</h3>
              </CardHeader>
              <CardBody>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Provider:</span>
                  <span className="font-medium">{asset.warranty_provider}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Expires:</span>
                  <span className="font-medium">
                    {format(new Date(asset.warranty_end_date), 'PPP')}
                  </span>
                </div>
                {assetService.isWarrantyExpiring(asset.warranty_end_date) && (
                  <Badge color="yellow" className="w-full justify-center mt-2">
                    Expiring Soon
                  </Badge>
                )}
                {assetService.isWarrantyExpired(asset.warranty_end_date) && (
                  <Badge color="red" className="w-full justify-center mt-2">
                    Expired
                  </Badge>
                )}
              </div>
              </CardBody>
            </Card>
          )}

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Quick Stats</h3>
            </CardHeader>
            <CardBody>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Assignments:</span>
                <span className="font-medium">{asset.assignment_count || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Contracts:</span>
                <span className="font-medium">{asset.contract_count || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Relationships:</span>
                <span className="font-medium">{asset.relationship_count || 0}</span>
              </div>
              <div className="pt-3 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Created:</span>
                  <span className="font-medium">
                    {format(new Date(asset.created_at), 'PPP')}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  by {asset.created_by_name}
                </div>
              </div>
            </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Assign Asset</h3>
              <button
                onClick={() => setShowAssignModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assign To <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value ? Number(e.target.value) : '')}
                  className="form-input w-full"
                >
                  <option value="">Select a user...</option>
                  {users.map((u: User) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  rows={3}
                  className="form-input w-full"
                  placeholder="Enter assignment notes..."
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowAssignModal(false)}
                className="flex-1"
                disabled={isAssigning}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAssign}
                className="flex-1"
                disabled={isAssigning || !selectedUserId}
              >
                {isAssigning ? 'Assigning...' : 'Assign'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Return Modal */}
      {showReturnModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Return Asset</h3>
              <button
                onClick={() => setShowReturnModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Are you sure you want to return this asset? The current assignment will be ended.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Return Notes (optional)
                </label>
                <textarea
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  rows={3}
                  className="form-input w-full"
                  placeholder="Enter return notes..."
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowReturnModal(false)}
                className="flex-1"
                disabled={isAssigning}
              >
                Cancel
              </Button>
              <Button
                onClick={handleReturn}
                className="flex-1"
                disabled={isAssigning}
              >
                {isAssigning ? 'Returning...' : 'Return Asset'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Contract Modal */}
      {showContractModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add Contract / Warranty</h3>
              <button
                onClick={() => setShowContractModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contract Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={contractForm.contract_type}
                    onChange={(e) => setContractForm({ ...contractForm, contract_type: e.target.value })}
                    className="form-input w-full"
                  >
                    <option value="WARRANTY">Warranty</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="SUPPORT">Support</option>
                    <option value="LEASE">Lease</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Provider <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={contractForm.provider}
                    onChange={(e) => setContractForm({ ...contractForm, provider: e.target.value })}
                    className="form-input w-full"
                    placeholder="e.g., Dell ProSupport"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contract Number
                </label>
                <input
                  type="text"
                  value={contractForm.contract_number}
                  onChange={(e) => setContractForm({ ...contractForm, contract_number: e.target.value })}
                  className="form-input w-full"
                  placeholder="e.g., CONT-2024-001"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={contractForm.start_date}
                    onChange={(e) => setContractForm({ ...contractForm, start_date: e.target.value })}
                    className="form-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={contractForm.end_date}
                    onChange={(e) => setContractForm({ ...contractForm, end_date: e.target.value })}
                    className="form-input w-full"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cost
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={contractForm.cost}
                    onChange={(e) => setContractForm({ ...contractForm, cost: e.target.value })}
                    className="form-input w-full pl-8"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Name
                  </label>
                  <input
                    type="text"
                    value={contractForm.contact_name}
                    onChange={(e) => setContractForm({ ...contractForm, contact_name: e.target.value })}
                    className="form-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={contractForm.contact_email}
                    onChange={(e) => setContractForm({ ...contractForm, contact_email: e.target.value })}
                    className="form-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    value={contractForm.contact_phone}
                    onChange={(e) => setContractForm({ ...contractForm, contact_phone: e.target.value })}
                    className="form-input w-full"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={contractForm.notes}
                  onChange={(e) => setContractForm({ ...contractForm, notes: e.target.value })}
                  rows={2}
                  className="form-input w-full"
                  placeholder="Additional notes..."
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowContractModal(false)}
                className="flex-1"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddContract}
                className="flex-1"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Adding...' : 'Add Contract'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Relationship Modal */}
      {showRelationshipModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add Asset Relationship</h3>
              <button
                onClick={() => setShowRelationshipModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Related Asset <span className="text-red-500">*</span>
                </label>
                <select
                  value={relationshipForm.child_asset_id}
                  onChange={(e) => setRelationshipForm({ ...relationshipForm, child_asset_id: e.target.value })}
                  className="form-input w-full"
                  disabled={isLoadingAssets}
                >
                  {isLoadingAssets ? (
                    <option value="">Loading assets...</option>
                  ) : allAssets.length === 0 ? (
                    <option value="">No other assets available</option>
                  ) : (
                    <>
                      <option value="">Select an asset...</option>
                      {allAssets.map((a: any) => (
                        <option key={a.id} value={a.id}>
                          {a.asset_tag} - {a.name}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Relationship Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={relationshipForm.relationship_type}
                  onChange={(e) => setRelationshipForm({ ...relationshipForm, relationship_type: e.target.value })}
                  className="form-input w-full"
                >
                  <option value="DEPENDS_ON">Depends On</option>
                  <option value="PART_OF">Part Of</option>
                  <option value="CONNECTED_TO">Connected To</option>
                  <option value="INSTALLED_ON">Installed On</option>
                  <option value="USES">Uses</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={relationshipForm.description}
                  onChange={(e) => setRelationshipForm({ ...relationshipForm, description: e.target.value })}
                  rows={2}
                  className="form-input w-full"
                  placeholder="Describe the relationship..."
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowRelationshipModal(false)}
                className="flex-1"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddRelationship}
                className="flex-1"
                disabled={isSubmitting || !relationshipForm.child_asset_id}
              >
                {isSubmitting ? 'Adding...' : 'Add Relationship'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoItem({
  label,
  value,
  sensitive = false,
}: {
  label: string;
  value: string | number | null | undefined;
  sensitive?: boolean;
}) {
  const [showSensitive, setShowSensitive] = useState(false);

  if (!value) return null;

  return (
    <div>
      <p className="text-sm font-medium text-gray-700">{label}</p>
      <p className="mt-1 text-sm text-gray-900">
        {sensitive && !showSensitive ? (
          <button
            onClick={() => setShowSensitive(true)}
            className="text-purple-600 hover:text-purple-700"
          >
            Click to reveal
          </button>
        ) : (
          value
        )}
      </p>
    </div>
  );
}
