import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PlusIcon, MagnifyingGlassIcon, ClockIcon } from '@heroicons/react/24/outline';
import { Card, CardBody } from '@/components/common/Card';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';
import axiosInstance from '@/lib/axios';
import { formatDate, formatRelativeTime } from '@/utils/helpers';
import ServiceCatalogModal from './ServiceCatalogModal';

export default function ServiceRequestsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showCatalog, setShowCatalog] = useState(false);
  
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';
  const approvalStatus = searchParams.get('approval_status') || '';
  const page = parseInt(searchParams.get('page') || '1');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['service-requests', page, search, status, approvalStatus],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('page_size', '20');
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      if (approvalStatus) params.set('approval_status', approvalStatus);
      
      const res = await axiosInstance.get(`/service-requests?${params}`);
      return res.data;
    },
  });

  const handleSearch = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set('search', value);
    } else {
      params.delete('search');
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const getApprovalBadge = (approvalStatus: string) => {
    switch (approvalStatus) {
      case 'pending':
        return <span className="badge bg-yellow-100 text-yellow-800">⏳ Pending</span>;
      case 'approved':
        return <span className="badge bg-green-100 text-green-800">✅ Approved</span>;
      case 'rejected':
        return <span className="badge bg-red-100 text-red-800">❌ Rejected</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service Requests</h1>
          <p className="mt-1 text-sm text-gray-500">Request IT services and track approvals</p>
        </div>
        <Button variant="primary" onClick={() => setShowCatalog(true)}>
          <PlusIcon className="h-5 w-5 mr-2" />
          New Request
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardBody>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search requests..."
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="form-input pl-10"
                />
              </div>
            </div>
            <select
              className="form-input"
              value={status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">All Status</option>
              <option value="NEW">New</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
            <select
              className="form-input"
              value={approvalStatus}
              onChange={(e) => handleFilterChange('approval_status', e.target.value)}
            >
              <option value="">All Approvals</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </CardBody>
      </Card>

      {/* Requests Table */}
      <Card>
        <CardBody>
          {isLoading ? (
            <LoadingSpinner />
          ) : !data?.items || data.items.length === 0 ? (
            <EmptyState
              icon={<ClockIcon />}
              title="No service requests found"
              description="Get started by creating a new service request"
              action={
                <Button variant="primary" onClick={() => setShowCatalog(true)}>
                  <PlusIcon className="h-5 w-5 mr-2" />
                  New Request
                </Button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                      Request #
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                      Title
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                      Approval
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                      Requester
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.items.map((request: any) => (
                    <tr
                      key={request.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/service-requests/${request.id}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-accent-600">
                          {request.ticket_number}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{request.title}</div>
                        {request.category_name && (
                          <div className="text-sm text-gray-500">{request.category_name}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="badge bg-blue-100 text-blue-800">
                          {request.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getApprovalBadge(request.approval_status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {request.requester_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>{formatRelativeTime(request.created_at)}</div>
                        <div className="text-xs text-gray-400">{formatDate(request.created_at, 'PP')}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Service Catalog Modal */}
      <ServiceCatalogModal
        open={showCatalog}
        onClose={() => setShowCatalog(false)}
        onSuccess={() => {
          setShowCatalog(false);
          refetch();
        }}
      />
    </div>
  );
}