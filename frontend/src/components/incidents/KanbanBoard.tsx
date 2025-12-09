import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketService } from '@/services/ticketService';
import {
  ClockIcon,
  UserCircleIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  EllipsisHorizontalIcon,
} from '@heroicons/react/24/outline';
import { formatRelativeTime, getPriorityColor } from '@/utils/helpers';
import toast from 'react-hot-toast';

interface Ticket {
  id: number;
  ticket_number: string;
  title: string;
  status: string;
  priority: string;
  assignee_name?: string;
  assignee_id?: number;
  requester_name?: string;
  category_name?: string;
  created_at: string;
  updated_at?: string;
  sla_breach_at?: string;
}

interface KanbanBoardProps {
  tickets: Ticket[];
  onRefresh: () => void;
  isLoading?: boolean;
}

interface KanbanColumn {
  id: string;
  title: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ReactNode;
}

const COLUMNS: KanbanColumn[] = [
  {
    id: 'NEW',
    title: 'New',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    icon: <ClockIcon className="h-4 w-4" />,
  },
  {
    id: 'OPEN',
    title: 'Open',
    color: 'text-cyan-700',
    bgColor: 'bg-cyan-50',
    borderColor: 'border-cyan-200',
    icon: <ArrowPathIcon className="h-4 w-4" />,
  },
  {
    id: 'IN_PROGRESS',
    title: 'In Progress',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    icon: <ArrowPathIcon className="h-4 w-4 animate-spin" />,
  },
  {
    id: 'PENDING',
    title: 'Pending',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    icon: <EllipsisHorizontalIcon className="h-4 w-4" />,
  },
  {
    id: 'RESOLVED',
    title: 'Resolved',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    icon: <CheckCircleIcon className="h-4 w-4" />,
  },
  {
    id: 'CLOSED',
    title: 'Closed',
    color: 'text-gray-700',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    icon: <XCircleIcon className="h-4 w-4" />,
  },
];

const PRIORITY_ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

export default function KanbanBoard({ tickets, onRefresh, isLoading }: KanbanBoardProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [draggedTicket, setDraggedTicket] = useState<Ticket | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const updateStatusMutation = useMutation({
    mutationFn: ({ ticketId, status }: { ticketId: number; status: string }) =>
      ticketService.updateTicket(ticketId, { status }),
    onSuccess: () => {
      toast.success('Status updated successfully');
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      onRefresh();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to update status');
    },
  });

  const getTicketsByStatus = (status: string): Ticket[] => {
    return tickets
      .filter((t) => t.status === status)
      .sort((a, b) => {
        // Sort by priority first
        const priorityDiff = PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority);
        if (priorityDiff !== 0) return priorityDiff;
        // Then by created date (newest first)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  };

  const handleDragStart = (e: React.DragEvent, ticket: Ticket) => {
    setDraggedTicket(ticket);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', ticket.id.toString());
    // Add a slight delay to allow the drag image to be captured
    setTimeout(() => {
      (e.target as HTMLElement).style.opacity = '0.5';
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.target as HTMLElement).style.opacity = '1';
    setDraggedTicket(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (draggedTicket && draggedTicket.status !== columnId) {
      updateStatusMutation.mutate({
        ticketId: draggedTicket.id,
        status: columnId,
      });
    }
    setDraggedTicket(null);
  };

  const handleTicketClick = (ticketId: number) => {
    navigate(`/incidents/${ticketId}`);
  };

  const getPriorityIndicator = (priority: string) => {
    const colors: Record<string, string> = {
      CRITICAL: 'bg-red-500',
      HIGH: 'bg-orange-500',
      MEDIUM: 'bg-yellow-500',
      LOW: 'bg-green-500',
    };
    return colors[priority] || 'bg-gray-500';
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 min-h-[600px]">
      {COLUMNS.map((column) => {
        const columnTickets = getTicketsByStatus(column.id);
        const isOver = dragOverColumn === column.id;

        return (
          <div
            key={column.id}
            className="flex-shrink-0 w-80"
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            {/* Column Header */}
            <div
              className={`flex items-center justify-between px-4 py-3 rounded-t-xl ${column.bgColor} border ${column.borderColor} border-b-0`}
            >
              <div className="flex items-center gap-2">
                <span className={column.color}>{column.icon}</span>
                <h3 className={`font-semibold ${column.color}`}>{column.title}</h3>
              </div>
              <span
                className={`px-2.5 py-1 text-xs font-bold rounded-full ${column.bgColor} ${column.color} border ${column.borderColor}`}
              >
                {columnTickets.length}
              </span>
            </div>

            {/* Column Body */}
            <div
              className={`min-h-[500px] p-3 rounded-b-xl border transition-all duration-200 ${
                isOver
                  ? `${column.bgColor} ${column.borderColor} border-2 border-dashed`
                  : 'bg-gray-50/50 border-gray-200'
              }`}
            >
              <div className="space-y-3">
                {columnTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, ticket)}
                    onDragEnd={handleDragEnd}
                    onClick={() => handleTicketClick(ticket.id)}
                    className={`group bg-white rounded-xl border border-gray-200 p-4 cursor-pointer
                      hover:shadow-lg hover:border-gray-300 hover:-translate-y-0.5
                      transition-all duration-200 ease-out
                      ${draggedTicket?.id === ticket.id ? 'opacity-50 scale-95' : ''}
                    `}
                  >
                    {/* Priority Indicator */}
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {ticket.ticket_number}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <div
                          className={`w-2 h-2 rounded-full ${getPriorityIndicator(ticket.priority)}`}
                          title={ticket.priority}
                        />
                        <span className={`text-xs font-medium ${getPriorityColor(ticket.priority).replace('badge ', '')}`}>
                          {ticket.priority}
                        </span>
                      </div>
                    </div>

                    {/* Title */}
                    <h4 className="font-medium text-gray-900 text-sm mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors">
                      {ticket.title}
                    </h4>

                    {/* Category */}
                    {ticket.category_name && (
                      <div className="mb-3">
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                          {ticket.category_name}
                        </span>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-2">
                        {ticket.assignee_name ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center">
                              <span className="text-xs font-medium text-primary-700">
                                {ticket.assignee_name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="text-xs text-gray-600 truncate max-w-[80px]">
                              {ticket.assignee_name.split(' ')[0]}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-gray-400">
                            <UserCircleIcon className="w-5 h-5" />
                            <span className="text-xs italic">Unassigned</span>
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">
                        {formatRelativeTime(ticket.created_at)}
                      </span>
                    </div>

                    {/* SLA Warning */}
                    {ticket.sla_breach_at && new Date(ticket.sla_breach_at) < new Date() && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                        <ExclamationTriangleIcon className="w-3 h-3" />
                        SLA Breached
                      </div>
                    )}
                  </div>
                ))}

                {columnTickets.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                    <div className={`w-12 h-12 rounded-full ${column.bgColor} flex items-center justify-center mb-2`}>
                      <span className={column.color}>{column.icon}</span>
                    </div>
                    <p className="text-sm">No tickets</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Loading Overlay */}
      {(isLoading || updateStatusMutation.isPending) && (
        <div className="fixed inset-0 bg-black/10 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl px-6 py-4 flex items-center gap-3">
            <ArrowPathIcon className="w-5 h-5 text-primary-600 animate-spin" />
            <span className="text-gray-700">Updating...</span>
          </div>
        </div>
      )}
    </div>
  );
}
