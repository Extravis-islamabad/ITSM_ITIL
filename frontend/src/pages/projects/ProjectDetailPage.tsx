import { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  LayoutGrid,
  List,
  Calendar,
  BarChart3,
  Settings,
  Plus,
  Users,
  FolderKanban,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import projectService from '@/services/projectService';
import { ProjectDetail, getProjectStatusColor } from '@/types/project';
import ProjectKanbanBoard from '@/components/projects/ProjectKanbanBoard';
import ProjectBacklog from '@/components/projects/ProjectBacklog';
import ProjectSprints from '@/components/projects/ProjectSprints';
import ProjectReports from '@/components/projects/ProjectReports';
import ProjectSettings from '@/components/projects/ProjectSettings';
import CreateTaskModal from '@/components/projects/CreateTaskModal';

type TabType = 'board' | 'backlog' | 'sprints' | 'reports' | 'settings';

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const activeTab = (searchParams.get('tab') as TabType) || 'board';
  const [showCreateTask, setShowCreateTask] = useState(false);

  const { data: project, isLoading, error } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectService.getProject(Number(projectId)),
    enabled: !!projectId,
  });

  const setActiveTab = (tab: TabType) => {
    setSearchParams({ tab });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="text-center py-12">
        <FolderKanban className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Project not found
        </h3>
        <button
          onClick={() => navigate('/projects')}
          className="text-primary-600 hover:text-primary-700"
        >
          Back to Projects
        </button>
      </div>
    );
  }

  const tabs = [
    { id: 'board' as const, label: 'Board', icon: LayoutGrid },
    { id: 'backlog' as const, label: 'Backlog', icon: List },
    { id: 'sprints' as const, label: 'Sprints', icon: Calendar },
    { id: 'reports' as const, label: 'Reports', icon: BarChart3 },
    { id: 'settings' as const, label: 'Settings', icon: Settings },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/projects')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5 text-gray-500" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {project.project_key}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getProjectStatusColor(project.status)}`}>
                  {project.status}
                </span>
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {project.name}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Members avatars */}
            <div className="flex items-center">
              <div className="flex -space-x-2">
                {project.members?.slice(0, 4).map((member) => (
                  <div
                    key={member.id}
                    className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs font-medium"
                    title={member.user?.full_name}
                  >
                    {member.user?.full_name?.charAt(0) || '?'}
                  </div>
                ))}
                {project.member_count > 4 && (
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300">
                    +{project.member_count - 4}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => setShowCreateTask(true)}
              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Task
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-gray-200 dark:border-gray-700 -mb-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'board' && (
          <ProjectKanbanBoard
            projectId={Number(projectId)}
            columns={project.columns || []}
            activeSprint={project.active_sprint}
          />
        )}
        {activeTab === 'backlog' && (
          <ProjectBacklog projectId={Number(projectId)} />
        )}
        {activeTab === 'sprints' && (
          <ProjectSprints projectId={Number(projectId)} />
        )}
        {activeTab === 'reports' && (
          <ProjectReports projectId={Number(projectId)} />
        )}
        {activeTab === 'settings' && (
          <ProjectSettings project={project} />
        )}
      </div>

      {/* Create Task Modal */}
      {showCreateTask && (
        <CreateTaskModal
          projectId={Number(projectId)}
          onClose={() => setShowCreateTask(false)}
          onSuccess={() => {
            setShowCreateTask(false);
            queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] });
          }}
        />
      )}
    </div>
  );
}
