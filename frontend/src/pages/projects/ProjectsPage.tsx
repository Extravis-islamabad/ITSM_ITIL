import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  FolderKanban,
  Users,
  LayoutGrid,
  List,
  ChevronRight,
} from 'lucide-react';
import projectService from '@/services/projectService';
import {
  Project,
  ProjectStatus,
  getProjectStatusColor,
} from '@/types/project';
import CreateProjectModal from './CreateProjectModal';

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [page, setPage] = useState(1);

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

  const handleProjectClick = (projectId: number) => {
    navigate(`/projects/${projectId}/board`);
  };

  const getStatusBadge = (status: ProjectStatus) => {
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getProjectStatusColor(status)}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Projects</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage your projects and tasks
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          New Project
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Statuses</option>
          {Object.values(ProjectStatus).map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow' : ''}`}
          >
            <LayoutGrid className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded ${viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow' : ''}`}
          >
            <List className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-12">
          <FolderKanban className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No projects found
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Get started by creating your first project
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Project
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div
              key={project.id}
              onClick={() => handleProjectClick(project.id)}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 cursor-pointer hover:shadow-md hover:border-primary-500 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                    <FolderKanban className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      {project.project_key}
                    </span>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {project.name}
                    </h3>
                  </div>
                </div>
                {getStatusBadge(project.status)}
              </div>

              {project.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                  {project.description}
                </p>
              )}

              <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{project.member_count}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-medium">{project.open_task_count}</span>
                    <span>/ {project.task_count} tasks</span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5" />
              </div>

              {project.lead && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs font-medium">
                    {project.lead.full_name.charAt(0)}
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {project.lead.full_name}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Project
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Lead
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Tasks
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Members
                </th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {projects.map((project) => (
                <tr
                  key={project.id}
                  onClick={() => handleProjectClick(project.id)}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900 flex items-center justify-center mr-3">
                        <FolderKanban className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {project.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
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
                        <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs font-medium">
                          {project.lead.full_name.charAt(0)}
                        </div>
                        <span className="text-sm text-gray-900 dark:text-white">
                          {project.lead.full_name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">Unassigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {project.open_task_count} / {project.task_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {project.member_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50"
          >
            Next
          </button>
        </div>
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
