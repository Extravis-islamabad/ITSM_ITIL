import { useQuery } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios';
import { CheckCircle, Circle, Clock } from 'lucide-react';

interface ProgressTrackerProps {
  changeId: number;
}

export default function ProgressTracker({ changeId }: ProgressTrackerProps) {
  const { data: progress } = useQuery({
    queryKey: ['change-progress', changeId],
    queryFn: async () => {
      const res = await axiosInstance.get(`/changes/${changeId}/progress`);
      return res.data;
    },
  });

  if (!progress || progress.total_tasks === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Implementation Progress</h3>
      
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Overall Progress</span>
          <span className="text-sm font-semibold text-primary-600">
            {progress.progress_percentage}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-primary-500 to-accent-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${progress.progress_percentage}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{progress.total_tasks}</div>
          <div className="text-xs text-gray-600">Total Tasks</div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-green-600">{progress.completed_tasks}</div>
          <div className="text-xs text-gray-600">Completed</div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Circle className="h-5 w-5 text-orange-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-orange-600">{progress.pending_tasks}</div>
          <div className="text-xs text-gray-600">Pending</div>
        </div>
      </div>
    </div>
  );
}