import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, TrendingUp, PieChart } from 'lucide-react';
import projectService from '@/services/projectService';
import {
  BurndownReport,
  VelocityReport,
  ProjectStatusReport,
  Sprint,
} from '@/types/project';

interface Props {
  projectId: number;
}

export default function ProjectReports({ projectId }: Props) {
  const [selectedSprintId, setSelectedSprintId] = useState<number | null>(null);

  const { data: sprints } = useQuery({
    queryKey: ['project-sprints', projectId],
    queryFn: () => projectService.getSprints(projectId),
  });

  const { data: velocityData } = useQuery({
    queryKey: ['velocity-report', projectId],
    queryFn: () => projectService.getVelocityReport(projectId),
  });

  const { data: statusData } = useQuery({
    queryKey: ['status-report', projectId],
    queryFn: () => projectService.getStatusReport(projectId),
  });

  const { data: burndownData } = useQuery({
    queryKey: ['burndown-report', projectId, selectedSprintId],
    queryFn: () => selectedSprintId ? projectService.getBurndownReport(projectId, selectedSprintId) : null,
    enabled: !!selectedSprintId,
  });

  // Simple bar chart component
  const renderVelocityChart = (data: VelocityReport) => {
    const maxPoints = Math.max(...data.data_points.map(d => Math.max(d.committed_points, d.completed_points)));

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Average Velocity:</span>
          <span className="font-bold text-gray-900 dark:text-white">{data.average_velocity} points</span>
        </div>
        <div className="space-y-3">
          {data.data_points.map((point, idx) => (
            <div key={idx}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-700 dark:text-gray-300">{point.sprint_name}</span>
                <span className="text-gray-500">{point.completed_points} / {point.committed_points}</span>
              </div>
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden flex">
                <div
                  className="h-full bg-green-500"
                  style={{ width: `${(point.completed_points / maxPoints) * 100}%` }}
                  title={`Completed: ${point.completed_points}`}
                />
                <div
                  className="h-full bg-gray-400"
                  style={{ width: `${((point.committed_points - point.completed_points) / maxPoints) * 100}%` }}
                  title={`Remaining: ${point.committed_points - point.completed_points}`}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded" />
            <span>Completed</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-gray-400 rounded" />
            <span>Committed</span>
          </div>
        </div>
      </div>
    );
  };

  // Simple pie chart / status distribution
  const renderStatusDistribution = (data: ProjectStatusReport) => {
    const colors: Record<string, string> = {
      BACKLOG: 'bg-gray-500',
      TODO: 'bg-blue-500',
      IN_PROGRESS: 'bg-yellow-500',
      QA: 'bg-purple-500',
      DONE: 'bg-green-500',
    };

    return (
      <div className="space-y-4">
        <div className="text-center">
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {data.total_tasks}
          </div>
          <div className="text-sm text-gray-500">Total Tasks</div>
        </div>

        {/* Progress bar distribution */}
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden flex">
          {data.distribution.map((item, idx) => (
            <div
              key={idx}
              className={`h-full ${colors[item.status] || 'bg-gray-400'}`}
              style={{ width: `${item.percentage}%` }}
              title={`${item.status}: ${item.count} (${item.percentage}%)`}
            />
          ))}
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-2">
          {data.distribution.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded ${colors[item.status] || 'bg-gray-400'}`} />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {item.status.replace('_', ' ')}
                </span>
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {item.count}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Burndown chart
  const renderBurndownChart = (data: BurndownReport) => {
    const maxPoints = data.total_points;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">Sprint</div>
            <div className="font-semibold text-gray-900 dark:text-white">{data.sprint_name}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Progress</div>
            <div className="font-semibold text-gray-900 dark:text-white">
              {data.completed_points} / {data.total_points} points
            </div>
          </div>
        </div>

        <div className="relative h-48 border-b border-l border-gray-300 dark:border-gray-600">
          {/* Y axis labels */}
          <div className="absolute -left-8 top-0 text-xs text-gray-500">{maxPoints}</div>
          <div className="absolute -left-8 bottom-0 text-xs text-gray-500">0</div>

          {/* Ideal line */}
          <div
            className="absolute left-0 top-0 w-full h-0.5 bg-blue-300 transform origin-left"
            style={{
              transform: `rotate(${Math.atan(1) * (180 / Math.PI) * -1}deg)`,
            }}
          />

          {/* Data points */}
          {data.data_points.length > 0 && (
            <svg className="absolute inset-0 w-full h-full">
              <polyline
                fill="none"
                stroke="#22c55e"
                strokeWidth="2"
                points={data.data_points
                  .map((point, idx) => {
                    const x = (idx / (data.data_points.length - 1 || 1)) * 100;
                    const y = 100 - (point.remaining_points / maxPoints) * 100;
                    return `${x}%,${y}%`;
                  })
                  .join(' ')}
              />
            </svg>
          )}
        </div>

        <div className="flex items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <div className="w-4 h-0.5 bg-blue-300" />
            <span>Ideal</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-0.5 bg-green-500" />
            <span>Actual</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 h-full overflow-auto">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
        Project Reports
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Task Status Distribution</h3>
          </div>
          {statusData ? (
            renderStatusDistribution(statusData)
          ) : (
            <div className="text-gray-500 text-center py-8">No data available</div>
          )}
        </div>

        {/* Velocity */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Team Velocity</h3>
          </div>
          {velocityData && velocityData.data_points.length > 0 ? (
            renderVelocityChart(velocityData)
          ) : (
            <div className="text-gray-500 text-center py-8">
              Complete some sprints to see velocity data
            </div>
          )}
        </div>

        {/* Burndown */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Sprint Burndown</h3>
            </div>
            <select
              value={selectedSprintId || ''}
              onChange={(e) => setSelectedSprintId(e.target.value ? Number(e.target.value) : null)}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
            >
              <option value="">Select a sprint</option>
              {sprints?.map((sprint: Sprint) => (
                <option key={sprint.id} value={sprint.id}>
                  {sprint.name}
                </option>
              ))}
            </select>
          </div>
          {burndownData ? (
            renderBurndownChart(burndownData)
          ) : (
            <div className="text-gray-500 text-center py-8">
              Select a sprint to view burndown chart
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
