/**
 * Agent Dashboard
 * Dashboard view for Support Agents - shows only assigned and team tickets
 */
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import axiosInstance from "@/lib/axios";
import { Card, CardBody } from "@/components/common/Card";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Ticket,
  Users,
} from "lucide-react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatRelativeTime } from "@/utils/helpers";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { useAuth } from "@/hooks/useAuth";

const COLORS = {
  primary: "#6366f1",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
};

const STATUS_COLORS: Record<string, string> = {
  open: COLORS.primary,
  in_progress: COLORS.warning,
  pending: "#8b5cf6",
  resolved: COLORS.success,
  closed: "#6b7280",
};

export default function AgentDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Fetch agent-specific stats
  const { data: myTickets, isLoading } = useQuery({
    queryKey: ["agent-my-tickets", user?.id],
    queryFn: async () => {
      const res = await axiosInstance.get(`/tickets?assignee_id=${user?.id}&page=1&page_size=100`);
      return res.data;
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',  // Always refetch when navigating back to dashboard
    staleTime: 0,
  });

  // Fetch team tickets
  const { data: teamTickets } = useQuery({
    queryKey: ["agent-team-tickets"],
    queryFn: async () => {
      const res = await axiosInstance.get(`/tickets?page=1&page_size=50`);
      return res.data;
    },
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
  });


  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  const tickets = myTickets?.items || [];

  // Helper to normalize status/priority for comparison (handle both cases)
  const normalizeStatus = (status: string) => (status || '').toUpperCase();
  const normalizePriority = (priority: string) => (priority || '').toUpperCase();

  // Calculate stats
  const stats = {
    assigned_to_me: tickets.length,
    in_progress: tickets.filter((t: any) => normalizeStatus(t.status) === 'IN_PROGRESS').length,
    pending: tickets.filter((t: any) => normalizeStatus(t.status) === 'PENDING').length,
    resolved_today: tickets.filter((t: any) => {
      if (normalizeStatus(t.status) !== 'RESOLVED') return false;
      const today = new Date().toDateString();
      return new Date(t.updated_at).toDateString() === today;
    }).length,
    high_priority: tickets.filter((t: any) => ['HIGH', 'CRITICAL'].includes(normalizePriority(t.priority))).length,
    unassigned_team: teamTickets?.items?.filter((t: any) => !t.assignee_id).length || 0,
  };

  // Status distribution
  const statusData = [
    { name: 'Open', value: tickets.filter((t: any) => ['NEW', 'OPEN'].includes(normalizeStatus(t.status))).length },
    { name: 'In Progress', value: stats.in_progress },
    { name: 'Pending', value: stats.pending },
    { name: 'Resolved', value: tickets.filter((t: any) => ['RESOLVED', 'CLOSED'].includes(normalizeStatus(t.status))).length },
  ].filter(item => item.value > 0);

  // Priority distribution
  const priorityData = [
    { priority: 'Low', value: tickets.filter((t: any) => normalizePriority(t.priority) === 'LOW').length },
    { priority: 'Medium', value: tickets.filter((t: any) => normalizePriority(t.priority) === 'MEDIUM').length },
    { priority: 'High', value: tickets.filter((t: any) => normalizePriority(t.priority) === 'HIGH').length },
    { priority: 'Critical', value: tickets.filter((t: any) => normalizePriority(t.priority) === 'CRITICAL').length },
  ].filter(item => item.value > 0);

  const statCards = [
    {
      title: "Assigned to Me",
      value: stats.assigned_to_me,
      icon: Ticket,
      color: "bg-blue-500",
      textColor: "text-blue-600",
      bgColor: "bg-blue-50",
      action: () => navigate(`/incidents?assignee_id=${user?.id}`),
    },
    {
      title: "In Progress",
      value: stats.in_progress,
      icon: Clock,
      color: "bg-orange-500",
      textColor: "text-orange-600",
      bgColor: "bg-orange-50",
      action: () => navigate(`/incidents?status=IN_PROGRESS&assignee_id=${user?.id}`),
    },
    {
      title: "Pending",
      value: stats.pending,
      icon: AlertTriangle,
      color: "bg-purple-500",
      textColor: "text-purple-600",
      bgColor: "bg-purple-50",
      action: () => navigate(`/incidents?status=PENDING&assignee_id=${user?.id}`),
    },
    {
      title: "Resolved Today",
      value: stats.resolved_today,
      icon: CheckCircle2,
      color: "bg-green-500",
      textColor: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "High Priority",
      value: stats.high_priority,
      icon: AlertTriangle,
      color: "bg-red-500",
      textColor: "text-red-600",
      bgColor: "bg-red-50",
      action: () => navigate(`/incidents?priority=HIGH&assignee_id=${user?.id}`),
    },
    {
      title: "Unassigned (Team)",
      value: stats.unassigned_team,
      icon: Users,
      color: "bg-gray-500",
      textColor: "text-gray-600",
      bgColor: "bg-gray-50",
      action: () => navigate(`/incidents?assignee_id=unassigned`),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600">
          Welcome back, {user?.full_name}! Here's your ticket overview.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card
              key={index}
              className="hover:shadow-lg transition-shadow duration-200 cursor-pointer"
              onClick={stat.action}
            >
              <CardBody>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="mt-2 text-3xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <div className={`${stat.bgColor} p-3 rounded-full`}>
                    <Icon className={`h-6 w-6 ${stat.textColor}`} />
                  </div>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardBody>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">My Tickets by Status</h3>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((_entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={Object.values(STATUS_COLORS)[index % Object.values(STATUS_COLORS).length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                No tickets assigned to you yet
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">My Tickets by Priority</h3>
            {priorityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={priorityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="priority" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <Tooltip />
                  <Bar dataKey="value" fill={COLORS.primary} radius={[8, 8, 0, 0]}>
                    {priorityData.map((entry: any, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.priority === 'Critical' ? COLORS.danger :
                          entry.priority === 'High' ? COLORS.warning :
                          entry.priority === 'Medium' ? COLORS.primary :
                          COLORS.success
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                No tickets assigned to you yet
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* My Recent Tickets */}
      <Card>
        <CardBody>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">My Recent Tickets</h3>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {tickets.slice(0, 10).map((ticket: any) => (
              <div
                key={ticket.id}
                className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => navigate(`/incidents/${ticket.id}`)}
              >
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                    <Ticket className="h-4 w-4 text-indigo-600" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">{ticket.ticket_number}</p>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      ['CRITICAL', 'HIGH'].includes(normalizePriority(ticket.priority))
                        ? 'bg-red-100 text-red-800'
                        : normalizePriority(ticket.priority) === 'MEDIUM'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {ticket.priority}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 truncate mt-1">{ticket.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      ['RESOLVED', 'CLOSED'].includes(normalizeStatus(ticket.status)) ? 'bg-green-100 text-green-800' :
                      normalizeStatus(ticket.status) === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                      normalizeStatus(ticket.status) === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {(ticket.status || '').replace('_', ' ')}
                    </span>
                    <span className="text-xs text-gray-500">{formatRelativeTime(ticket.created_at)}</span>
                  </div>
                </div>
              </div>
            ))}
            {tickets.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Ticket className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p>No tickets assigned to you yet</p>
                <p className="text-sm mt-1">Check the "Unassigned" queue to pick up new tickets</p>
              </div>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
