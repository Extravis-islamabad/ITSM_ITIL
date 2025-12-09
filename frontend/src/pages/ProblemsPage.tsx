import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { problemService } from '@/services/problemService';
import {
  Problem,
  ProblemStatus,
  ProblemPriority,
  getProblemStatusColor,
  getProblemPriorityColor,
  getProblemStatusLabel
} from '@/types/problem';
import { Card, CardBody } from '@/components/common/Card';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';
import { PlusIcon, MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';
import { formatDate, formatRelativeTime } from '@/utils/helpers';
import CreateProblemModal from '@/components/problems/CreateProblemModal';
import { useAuth } from '@/hooks/useAuth';
import { isTeamLeadOrHigher } from '@/utils/roleHelpers';

export default function ProblemsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canCreateProblem = isTeamLeadOrHigher(user);

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const page = parseInt(searchParams.get('page') || '1');
  const status = searchParams.get('status') || '';
  const priority = searchParams.get('priority') || '';

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['problems', page, search, status, priority],
    queryFn: () =>
      problemService.getProblems({
        page,
        page_size: 20,
        search: search || undefined,
        status: status || undefined,
        priority: priority || undefined,
        sort_by: 'created_at',
        sort_order: 'desc',
      }),
  });

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

  const handleProblemClick = (problemId: number) => {
    navigate(`/problems/${problemId}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Problems</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track and resolve recurring issues with root cause analysis
          </p>
        </div>
        {canCreateProblem && (
          <Button
            variant="primary"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Create Problem
          </Button>
        )}
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
                  placeholder="Search problems..."
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
              {Object.values(ProblemStatus).map((s) => (
                <option key={s} value={s}>
                  {getProblemStatusLabel(s)}
                </option>
              ))}
            </select>
            <select
              className="form-input"
              value={priority}
              onChange={(e) => handleFilterChange('priority', e.target.value)}
            >
              <option value="">All Priorities</option>
              {Object.values(ProblemPriority).map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </CardBody>
      </Card>

      {/* Problems Table */}
      <Card>
        <CardBody>
          {isLoading ? (
            <LoadingSpinner />
          ) : !data?.items || data.items.length === 0 ? (
            <EmptyState
              icon={<FunnelIcon />}
              title="No problems found"
              description="Get started by creating a new problem record"
              action={
                canCreateProblem && (
                  <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Create Problem
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
                        Problem #
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
                        Impact
                      </th>
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Assigned To
                      </th>
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.items.map((problem: Problem) => (
                      <tr
                        key={problem.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleProblemClick(problem.id)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-accent-600">
                            {problem.problem_number}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {problem.title}
                          </div>
                          {problem.incident_count > 0 && (
                            <div className="text-sm text-gray-500">
                              {problem.incident_count} linked incident{problem.incident_count !== 1 ? 's' : ''}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`badge ${getProblemStatusColor(problem.status)}`}>
                            {getProblemStatusLabel(problem.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`badge ${getProblemPriorityColor(problem.priority)}`}>
                            {problem.priority}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`badge ${getProblemPriorityColor(problem.impact as any)}`}>
                            {problem.impact}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {problem.assigned_to?.full_name || (
                            <span className="text-gray-400 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div>{formatRelativeTime(problem.created_at)}</div>
                          <div className="text-xs text-gray-400">
                            {formatDate(problem.created_at, 'PP')}
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

      {/* Create Modal */}
      {isCreateModalOpen && (
        <CreateProblemModal
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            setIsCreateModalOpen(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}
