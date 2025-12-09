import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios';
import { Card, CardBody } from '@/components/common/Card';
import { Calendar, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO } from 'date-fns';

export default function ChangeCalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { data: changes } = useQuery({
    queryKey: ['changes', 'calendar', format(currentMonth, 'yyyy-MM')],
    queryFn: async () => {
      const res = await axiosInstance.get('/changes', {
        params: {
          page: 1,
          page_size: 1000,
          // Include all statuses that have planned dates for visibility
          status: 'DRAFT,SUBMITTED,PENDING_APPROVAL,APPROVED,SCHEDULED,IN_PROGRESS,IMPLEMENTED',
        },
      });
      return res.data.items;
    },
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Group changes by date
  const changesByDate = changes?.reduce((acc: any, change: any) => {
    if (change.planned_start) {
      const date = format(parseISO(change.planned_start), 'yyyy-MM-dd');
      if (!acc[date]) acc[date] = [];
      acc[date].push(change);
    }
    return acc;
  }, {}) || {};

  const getRiskColor = (risk: string) => {
    const colors: any = {
      LOW: 'bg-green-500',
      MEDIUM: 'bg-yellow-500',
      HIGH: 'bg-orange-500',
      CRITICAL: 'bg-red-500',
    };
    return colors[risk] || 'bg-gray-500';
  };

  const previousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const today = () => setCurrentMonth(new Date());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl">
            <Calendar className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Change Calendar</h1>
            <p className="text-sm text-gray-600">View scheduled changes on calendar</p>
          </div>
        </div>
      </div>

      <Card>
        <CardBody>
          {/* Calendar Controls */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <button
                onClick={previousMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="h-5 w-5 text-gray-600" />
              </button>
              <h2 className="text-xl font-semibold text-gray-900 min-w-[200px] text-center">
                {format(currentMonth, 'MMMM yyyy')}
              </h2>
              <button
                onClick={nextMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight className="h-5 w-5 text-gray-600" />
              </button>
            </div>
            <button
              onClick={today}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
            >
              Today
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {/* Day Headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center font-semibold text-sm text-gray-600 py-2">
                {day}
              </div>
            ))}

            {/* Calendar Days */}
            {days.map((day) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayChanges = changesByDate[dateKey] || [];
              const isToday = isSameDay(day, new Date());

              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[120px] border rounded-lg p-2 ${
                    !isSameMonth(day, currentMonth)
                      ? 'bg-gray-50 opacity-50'
                      : 'bg-white hover:bg-gray-50'
                  } ${isToday ? 'ring-2 ring-primary-500' : ''}`}
                >
                  <div className={`text-sm font-medium mb-1 ${
                    isToday ? 'text-primary-600' : 'text-gray-700'
                  }`}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-1">
                    {dayChanges.slice(0, 3).map((change: any) => (
                      <div
                        key={change.id}
                        className={`text-xs p-1.5 rounded cursor-pointer hover:opacity-80 transition-opacity ${
                          getRiskColor(change.risk)
                        } text-white`}
                        title={`${change.change_number}: ${change.title}`}
                      >
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span className="font-medium truncate">
                            {change.change_number}
                          </span>
                        </div>
                        <div className="truncate">{change.title}</div>
                      </div>
                    ))}
                    {dayChanges.length > 3 && (
                      <div className="text-xs text-gray-500 pl-1">
                        +{dayChanges.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-6 mt-6 pt-6 border-t border-gray-200">
            <span className="text-sm font-medium text-gray-700">Risk Level:</span>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-green-500"></div>
                <span className="text-xs text-gray-600">Low</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-yellow-500"></div>
                <span className="text-xs text-gray-600">Medium</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-orange-500"></div>
                <span className="text-xs text-gray-600">High</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-red-500"></div>
                <span className="text-xs text-gray-600">Critical</span>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}