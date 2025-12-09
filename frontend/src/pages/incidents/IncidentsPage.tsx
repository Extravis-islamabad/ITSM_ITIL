import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ticketService, TicketFilters } from '@/services/ticketService';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ListBulletIcon,
  ViewColumnsIcon,
} from '@heroicons/react/24/outline';
import { Card, CardBody } from '@/components/common/Card';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';
import CreateTicketModal from './CreateTicketModal';
import KanbanBoard from '@/components/incidents/KanbanBoard';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, formatRelativeTime, getPriorityColor, getStatusColor } from '@/utils/helpers';

type ViewMode = 'table' | 'kanban';

export default function IncidentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canCreateIncident = !!user;

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    // Persist view mode preference
    const saved = localStorage.getItem('incidents-view-mode');
    return (saved as ViewMode) || 'table';
  });

  const page = parseInt(searchParams.get('page') || '1');
  const status = searchParams.get('status') || '';
  const priority = searchParams.get('priority') || '';
  const assigneeId = searchParams.get('assignee_id') || '';

  const isUnassigned = assigneeId === 'unassigned';
  const parsedAssigneeId = !isUnassigned && assigneeId ? parseInt(assigneeId) : undefined;

  // For Kanban view, fetch more tickets without pagination
  const filters: TicketFilters = {
    search,
    ticket_type: 'INCIDENT',
    status: viewMode === 'kanban' ? undefined : (status || undefined),
    priority: priority || undefined,
    assignee_id: !isNaN(parsedAssigneeId as number) ? parsedAssigneeId : undefined,
    is_unassigned: isUnassigned ? true : undefined,
    page: viewMode === 'kanban' ? 1 : page,
    page_size: viewMode === 'kanban' ? 100 : 20,
  };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['tickets', filters, viewMode],
    queryFn: () => ticketService.getTickets(filters),
    refetchOnMount: 'always',
    staleTime: 0,
  });

  // Save view mode preference
  useEffect(() => {
    localStorage.setItem('incidents-view-mode', viewMode);
  }, [viewMode]);

  const handleSearch = (value: string) => {
    setSearch(value);
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

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    setSearchParams(params);
  };

  const handleTicketClick = (ticketId: number) => {
    navigate(`/incidents/${ticketId}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Incidents</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage and track incident tickets
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ListBulletIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Table</span>
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === 'kanban'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ViewColumnsIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Kanban</span>
            </button>
          </div>

          {canCreateIncident && (
            <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
              <PlusIcon className="h-5 w-5 mr-2" />
              Create Incident
            </Button>
          )}
        </div>
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
                  placeholder="Search tickets..."
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="form-input pl-10"
                />
              </div>
            </div>
            {viewMode === 'table' && (
              <select
                className="form-input"
                value={status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="">All Status</option>
                <option value="NEW">New</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="PENDING">Pending</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            )}
            <select
              className="form-input"
              value={priority}
              onChange={(e) => handleFilterChange('priority', e.target.value)}
            >
              <option value="">All Priorities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </CardBody>
      </Card>

      {/* Content */}
      {viewMode === 'kanban' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-[600px]">
              <LoadingSpinner />
            </div>
          ) : !data?.items || data.items.length === 0 ? (
            <EmptyState
              icon={<FunnelIcon />}
              title="No incidents found"
              description="Get started by creating a new incident"
              action={
                canCreateIncident && (
                  <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Create Incident
                  </Button>
                )
              }
            />
          ) : (
            <KanbanBoard
              tickets={data.items}
              onRefresh={refetch}
              isLoading={isLoading}
            />
          )}
        </div>
      ) : (
        /* Table View */
        <Card>
          <CardBody>
            {isLoading ? (
              <LoadingSpinner />
            ) : !data?.items || data.items.length === 0 ? (
              <EmptyState
                icon={<FunnelIcon />}
                title="No incidents found"
                description="Get started by creating a new incident"
                action={
                  canCreateIncident && (
                    <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
                      <PlusIcon className="h-5 w-5 mr-2" />
                      Create Incident
                    </Button>
                  )
                }
              />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ticket #
                        </th>
                        <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Title
                        </th>
                        <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Priority
                        </th>
                        <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Assignee
                        </th>
                        <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Created
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {data.items.map((ticket: any) => (
                        <tr
                          key={ticket.id}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => handleTicketClick(ticket.id)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-accent-600">
                              {ticket.ticket_number}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">
                              {ticket.title}
                            </div>
                            {ticket.category_name && (
                              <div className="text-sm text-gray-500">
                                {ticket.category_name}
                                {ticket.subcategory_name && ` > ${ticket.subcategory_name}`}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`badge ${getStatusColor(ticket.status)}`}>
                              {ticket.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`badge ${getPriorityColor(ticket.priority)}`}>
                              {ticket.priority}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {ticket.assignee_name || (
                              <span className="text-gray-400 italic">Unassigned</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div>{formatRelativeTime(ticket.created_at)}</div>
                            <div className="text-xs text-gray-400">
                              {formatDate(ticket.created_at, 'PP')}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {data.total_pages > 1 && (
                  <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4">
                    <div className="flex flex-1 justify-between sm:hidden">
                      <Button
                        variant="outline"
                        onClick={() => handlePageChange(page - 1)}
                        disabled={page === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handlePageChange(page + 1)}
                        disabled={page === data.total_pages}
                      >
                        Next
                      </Button>
                    </div>
                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-700">
                          Showing <span className="font-medium">{(page - 1) * 20 + 1}</span> to{' '}
                          <span className="font-medium">
                            {Math.min(page * 20, data.total)}
                          </span>{' '}
                          of <span className="font-medium">{data.total}</span> results
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(page - 1)}
                          disabled={page === 1}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(page + 1)}
                          disabled={page === data.total_pages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardBody>
        </Card>
      )}

      {/* Create Modal */}
      <CreateTicketModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          setIsCreateModalOpen(false);
          refetch();
        }}
      />
    </div>
  );
}
