/**
 * Manager Dashboard
 * Dashboard view for Managers and Team Leads - shows team/department overview
 */
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import axiosInstance from "@/lib/axios";
import { Card, CardBody } from "@/components/common/Card";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Users,
  Activity,
  Ticket,
  GitBranch,
  AlertOctagon,
} from "lucide-react";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatRelativeTime } from "@/utils/helpers";
import LoadingSpinner from "@/components/common/LoadingSpinner";

const COLORS = {
  primary: "#6366f1",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#3b82f6",
};

const STATUS_COLORS: Record<string, string> = {
  New: COLORS.info,
  Open: COLORS.primary,
  "In Progress": COLORS.warning,
  Pending: "#8b5cf6",
  Resolved: COLORS.success,
  Closed: "#6b7280",
};

export default function ManagerDashboard() {
  const navigate = useNavigate();

  // Fetch dashboard stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ["manager-dashboard-stats"],
    queryFn: async () => {
      const res = await axiosInstance.get("/dashboard/stats");
      return res.data;
    },
    refetchInterval: 30000,
  });

  const { data: statusData } = useQuery({
    queryKey: ["manager-tickets-by-status"],
    queryFn: async () => {
      const res = await axiosInstance.get("/dashboard/tickets-by-status");
      return res.data;
    },
  });

  // Tickets by priority data - Reserved for future use
  const { data: _priorityData } = useQuery({
    queryKey: ["manager-tickets-by-priority"],
    queryFn: async () => {
      const res = await axiosInstance.get("/dashboard/tickets-by-priority");
      return res.data;
    },
  });

  const { data: trendData } = useQuery({
    queryKey: ["manager-ticket-trends"],
    queryFn: async () => {
      const res = await axiosInstance.get("/dashboard/ticket-trends?days=7");
      return res.data;
    },
  });

  const { data: activities } = useQuery({
    queryKey: ["manager-recent-activities"],
    queryFn: async () => {
      const res = await axiosInstance.get("/dashboard/recent-activities?limit=10");
      return res.data;
    },
    refetchInterval: 10000,
  });

  const { data: pendingApprovals } = useQuery({
    queryKey: ["manager-pending-approvals"],
    queryFn: async () => {
      const res = await axiosInstance.get("/service-requests/pending-approvals");
      return res.data;
    },
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  const statCards = [
    {
      title: "Open Tickets",
      value: stats?.open_tickets || 0,
      icon: Ticket,
      color: "bg-blue-500",
      textColor: "text-blue-600",
      bgColor: "bg-blue-50",
      trend: "+12%",
      trendUp: true,
    },
    {
      title: "Unassigned",
      value: stats?.unassigned || 0,
      icon: Clock,
      color: "bg-orange-500",
      textColor: "text-orange-600",
      bgColor: "bg-orange-50",
      trend: "-3%",
      trendUp: false,
    },
    {
      title: "SLA Breached",
      value: stats?.sla_breached || 0,
      icon: AlertTriangle,
      color: "bg-red-500",
      textColor: "text-red-600",
      bgColor: "bg-red-50",
      trend: "-8%",
      trendUp: false,
    },
    {
      title: "Critical",
      value: stats?.critical_tickets || 0,
      icon: AlertTriangle,
      color: "bg-red-600",
      textColor: "text-red-700",
      bgColor: "bg-red-50",
    },
    {
      title: "Resolved Today",
      value: stats?.resolved_today || 0,
      icon: CheckCircle2,
      color: "bg-green-500",
      textColor: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Pending Approvals",
      value: pendingApprovals?.length || 0,
      icon: Users,
      color: "bg-purple-500",
      textColor: "text-purple-600",
      bgColor: "bg-purple-50",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Team Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600">
          Monitor team performance and approve requests.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow duration-200">
              <CardBody>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="mt-2 text-3xl font-bold text-gray-900">{stat.value}</p>
                    {stat.trend && (
                      <div className="mt-2 flex items-center text-sm">
                        {stat.trendUp ? (
                          <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                        )}
                        <span className={stat.trendUp ? "text-green-600" : "text-red-600"}>
                          {stat.trend}
                        </span>
                        <span className="text-gray-500 ml-1">vs last week</span>
                      </div>
                    )}
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
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5 text-indigo-600" />
              Ticket Trends (Last 7 Days)
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="created"
                  stroke={COLORS.primary}
                  strokeWidth={3}
                  name="Created"
                />
                <Line
                  type="monotone"
                  dataKey="resolved"
                  stroke={COLORS.success}
                  strokeWidth={3}
                  name="Resolved"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tickets by Status</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ status, percent }) => `${status}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData?.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || COLORS.primary} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      </div>

      {/* Pending Approvals */}
      {pendingApprovals && pendingApprovals.length > 0 && (
        <Card>
          <CardBody>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              Pending Approvals ({pendingApprovals.length})
            </h3>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {pendingApprovals.map((request: any) => (
                <div
                  key={request.id}
                  className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors cursor-pointer"
                  onClick={() => navigate(`/service-requests/${request.id}`)}
                >
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
                      <Clock className="h-4 w-4 text-yellow-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{request.ticket_number}</p>
                    <p className="text-sm text-gray-700 truncate">{request.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-gray-500">{request.requester_name}</p>
                      <span className="text-xs text-gray-400">•</span>
                      <p className="text-xs text-gray-500">{formatRelativeTime(request.created_at)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Recent Activity */}
      <Card>
        <CardBody>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-indigo-600" />
            Team Recent Activity
          </h3>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {activities?.map((activity: any) => {
              // Determine icon and colors based on entity type
              const getActivityStyles = () => {
                switch (activity.entity_type) {
                  case 'change':
                    return {
                      icon: GitBranch,
                      bgColor: 'bg-purple-100',
                      iconColor: 'text-purple-600',
                      route: `/changes/${activity.entity_id}`,
                      label: activity.entity_number || activity.change_number,
                    };
                  case 'problem':
                    return {
                      icon: AlertOctagon,
                      bgColor: 'bg-orange-100',
                      iconColor: 'text-orange-600',
                      route: `/problems/${activity.entity_id}`,
                      label: activity.entity_number,
                    };
                  default: // incident
                    return {
                      icon: Ticket,
                      bgColor: 'bg-indigo-100',
                      iconColor: 'text-indigo-600',
                      route: `/incidents/${activity.entity_id || activity.ticket_id}`,
                      label: activity.entity_number || activity.ticket_number,
                    };
                }
              };

              const styles = getActivityStyles();
              const Icon = styles.icon;

              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => navigate(styles.route)}
                >
                  <div className="flex-shrink-0">
                    <div className={`h-8 w-8 rounded-full ${styles.bgColor} flex items-center justify-center`}>
                      <Icon className={`h-4 w-4 ${styles.iconColor}`} />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 truncate">{styles.label}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        activity.entity_type === 'change' ? 'bg-purple-100 text-purple-700' :
                        activity.entity_type === 'problem' ? 'bg-orange-100 text-orange-700' :
                        'bg-indigo-100 text-indigo-700'
                      }`}>
                        {activity.entity_type === 'change' ? 'Change' :
                         activity.entity_type === 'problem' ? 'Problem' : 'Incident'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 truncate">{activity.description}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {activity.user_name} • {formatRelativeTime(activity.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
            {(!activities || activities.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                <Activity className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p>No recent activity</p>
              </div>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
