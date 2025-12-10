import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FolderIcon,
  Squares2X2Icon,
  ListBulletIcon,
  ChevronRightIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { Card, CardBody } from '@/components/common/Card';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';
import projectService from '@/services/projectService';
import {
  Project,
  ProjectStatus,
  getProjectStatusColor,
} from '@/types/project';
import CreateProjectModal from './CreateProjectModal';

type ViewMode = 'grid' | 'list';

export default function ProjectsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('projects-view-mode');
    return (saved as ViewMode) || 'grid';
  });

  const page = parseInt(searchParams.get('page') || '1');
  const search = searchParams.get('search') || '';
  const statusFilter = searchParams.get('status') || '';

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['projects', page, search, statusFilter],
    queryFn: () =>
      projectService.getProjects({
        page,
        page_size: 12,
        search: search || undefined,
        status: statusFilter || undefined,
      }),
  });

  const projects: Project[] = data?.items || [];
  const totalPages = data?.total_pages || 1;

  // Save view mode preference
  useEffect(() => {
    localStorage.setItem('projects-view-mode', viewMode);
  }, [viewMode]);

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

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    setSearchParams(params);
  };

  const handleProjectClick = (projectId: number) => {
    navigate(`/projects/${projectId}/board`);
  };

  const getStatusBadge = (status: ProjectStatus) => {
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getProjectStatusColor(status)}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your projects and tasks
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === 'grid'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Squares2X2Icon className="h-4 w-4" />
              <span className="hidden sm:inline">Grid</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === 'list'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ListBulletIcon className="h-4 w-4" />
              <span className="hidden sm:inline">List</span>
            </button>
          </div>

          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            <PlusIcon className="h-5 w-5 mr-2" />
            New Project
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardBody>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="form-input pl-10"
                />
              </div>
            </div>
            <select
              className="form-input"
              value={statusFilter}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">All Statuses</option>
              {Object.values(ProjectStatus).map((status) => (
                <option key={status} value={status}>
                  {status.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
        </CardBody>
      </Card>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      ) : projects.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={<FolderIcon />}
              title="No projects found"
              description="Get started by creating your first project"
              action={
                <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Create Project
                </Button>
              }
            />
          </CardBody>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div
              key={project.id}
              onClick={() => handleProjectClick(project.id)}
              className="bg-white rounded-xl border border-gray-200 p-5 cursor-pointer hover:shadow-lg hover:border-gray-300 hover:-translate-y-0.5 transition-all duration-200 ease-out"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
                    <FolderIcon className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                      {project.project_key}
                    </span>
                    <h3 className="font-semibold text-gray-900 mt-1">
                      {project.name}
                    </h3>
                  </div>
                </div>
                {getStatusBadge(project.status)}
              </div>

              {project.description && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {project.description}
                </p>
              )}

              <div className="flex items-center justify-between text-sm text-gray-500 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <UserGroupIcon className="w-4 h-4" />
                    <span>{project.member_count}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-gray-700">{project.open_task_count}</span>
                    <span>/ {project.task_count} tasks</span>
                  </div>
                </div>
                <ChevronRightIcon className="w-5 h-5 text-gray-400" />
              </div>

              {project.lead && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                    {project.lead.full_name.charAt(0)}
                  </div>
                  <span className="text-sm text-gray-600">
                    {project.lead.full_name}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <Card>
          <CardBody>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Project
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lead
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tasks
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Members
                    </th>
                    <th className="px-6 py-3 bg-gray-50"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {projects.map((project) => (
                    <tr
                      key={project.id}
                      onClick={() => handleProjectClick(project.id)}
                      className="hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center mr-3">
                            <FolderIcon className="w-5 h-5 text-primary-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {project.name}
                            </div>
                            <div className="text-xs font-mono text-gray-500">
                              {project.project_key}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(project.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {project.lead ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                              {project.lead.full_name.charAt(0)}
                            </div>
                            <span className="text-sm text-gray-900">
                              {project.lead.full_name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          <span className="font-medium">{project.open_task_count}</span>
                          <span className="text-gray-500"> / {project.task_count}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center gap-1.5">
                          <UserGroupIcon className="w-4 h-4 text-gray-400" />
                          {project.member_count}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
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
                    disabled={page === totalPages}
                  >
                    Next
                  </Button>
                </div>
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-medium">{(page - 1) * 12 + 1}</span> to{' '}
                      <span className="font-medium">
                        {Math.min(page * 12, data?.total || 0)}
                      </span>{' '}
                      of <span className="font-medium">{data?.total || 0}</span> results
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
                      disabled={page === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}
