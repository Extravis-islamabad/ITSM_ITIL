import { useAuth } from "@/hooks/useAuth";
import { getDashboardView } from "@/utils/roleHelpers";
import LoadingSpinner from "@/components/common/LoadingSpinner";

// Import role-specific dashboards
import AgentDashboard from "./dashboards/AgentDashboard";
import UserDashboard from "./dashboards/UserDashboard";
import ManagerDashboard from "./dashboards/ManagerDashboard";

// Admin dashboard imports
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
  BarChart3,
  Activity,
  Ticket,
  Zap,
  Target,
  Award,
  Timer,
  GitBranch,
  AlertOctagon,
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
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { formatRelativeTime } from "@/utils/helpers";
import Button from "@/components/common/Button";

const COLORS = {
  primary: "#6366f1",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#3b82f6",
  purple: "#8b5cf6",
  pink: "#ec4899",
};

const STATUS_COLORS: Record<string, string> = {
  New: COLORS.info,
  Open: COLORS.primary,
  "In Progress": COLORS.warning,
  Pending: COLORS.purple,
  Resolved: COLORS.success,
  Closed: "#6b7280",
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: COLORS.success,
  MEDIUM: COLORS.warning,
  HIGH: COLORS.danger,
  CRITICAL: "#dc2626",
};

/**
 * Admin Dashboard Component
 * Full system overview for administrators
 */
function AdminDashboard() {
  const navigate = useNavigate();

  // ✅ ALL HOOKS MUST BE AT THE TOP - BEFORE ANY CONDITIONAL RETURNS
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await axiosInstance.get("/dashboard/stats");
      return res.data;
    },
    refetchInterval: 30000,
  });

  const { data: statusData } = useQuery({
    queryKey: ["tickets-by-status"],
    queryFn: async () => {
      const res = await axiosInstance.get("/dashboard/tickets-by-status");
      return res.data;
    },
  });

  const { data: priorityData } = useQuery({
    queryKey: ["tickets-by-priority"],
    queryFn: async () => {
      const res = await axiosInstance.get("/dashboard/tickets-by-priority");
      return res.data;
    },
  });

  const { data: trendData } = useQuery({
    queryKey: ["ticket-trends"],
    queryFn: async () => {
      const res = await axiosInstance.get("/dashboard/ticket-trends?days=7");
      return res.data;
    },
  });

  const { data: activities } = useQuery({
    queryKey: ["recent-activities"],
    queryFn: async () => {
      const res = await axiosInstance.get("/dashboard/recent-activities?limit=10");
      return res.data;
    },
    refetchInterval: 10000,
  });

  // ✅ MOVED BEFORE THE LOADING CHECK
  const { data: pendingApprovals } = useQuery({
    queryKey: ["pending-approvals"],
    queryFn: async () => {
      const res = await axiosInstance.get("/service-requests/pending-approvals");
      return res.data;
    },
    refetchInterval: 30000,
  });

  // New modern chart queries
  const { data: slaPerformance } = useQuery({
    queryKey: ["sla-performance"],
    queryFn: async () => {
      const res = await axiosInstance.get("/dashboard/sla-performance");
      return res.data;
    },
  });

  const { data: topCategories } = useQuery({
    queryKey: ["top-categories"],
    queryFn: async () => {
      const res = await axiosInstance.get("/dashboard/top-categories?limit=5");
      return res.data;
    },
  });

  const { data: agentPerformance } = useQuery({
    queryKey: ["agent-performance"],
    queryFn: async () => {
      const res = await axiosInstance.get("/dashboard/agent-performance?limit=5");
      return res.data;
    },
  });

  const { data: weeklyComparison } = useQuery({
    queryKey: ["weekly-comparison"],
    queryFn: async () => {
      const res = await axiosInstance.get("/dashboard/weekly-comparison");
      return res.data;
    },
  });

  const { data: avgResolutionTime } = useQuery({
    queryKey: ["avg-resolution-time"],
    queryFn: async () => {
      const res = await axiosInstance.get("/dashboard/avg-resolution-time");
      return res.data;
    },
  });

  // ✅ NOW THE EARLY RETURN IS AFTER ALL HOOKS
  if (statsLoading) {
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
      title: "My Tickets",
      value: stats?.my_tickets || 0,
      icon: Users,
      color: "bg-purple-500",
      textColor: "text-purple-600",
      bgColor: "bg-purple-50",
      trend: "+5%",
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
      title: "Pending",
      value: stats?.pending_tickets || 0,
      icon: Clock,
      color: "bg-yellow-500",
      textColor: "text-yellow-600",
      bgColor: "bg-yellow-50",
    },
    {
      title: "Total Tickets",
      value: stats?.total_tickets || 0,
      icon: BarChart3,
      color: "bg-indigo-500",
      textColor: "text-indigo-600",
      bgColor: "bg-indigo-50",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600">
          Welcome back! Here's what's happening with your tickets today.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
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

      {/* SLA Performance & Weekly Comparison Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* SLA Performance Gauge */}
        <Card className="lg:col-span-1">
          <CardBody>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Target className="h-5 w-5 text-green-600" />
              SLA Performance
            </h3>
            <div className="flex flex-col items-center">
              <div className="relative w-40 h-40">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="80" cy="80" r="70" fill="none" stroke="#e5e7eb" strokeWidth="12" />
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    fill="none"
                    stroke={slaPerformance?.overall_rate >= 90 ? COLORS.success : slaPerformance?.overall_rate >= 70 ? COLORS.warning : COLORS.danger}
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={`${(slaPerformance?.overall_rate || 0) * 4.4} 440`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-gray-900">{slaPerformance?.overall_rate || 0}%</span>
                  <span className="text-xs text-gray-500">Overall</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4 w-full">
                <div className="text-center p-2 bg-blue-50 rounded-lg">
                  <p className="text-lg font-bold text-blue-600">{slaPerformance?.response_rate || 0}%</p>
                  <p className="text-xs text-gray-600">Response SLA</p>
                </div>
                <div className="text-center p-2 bg-green-50 rounded-lg">
                  <p className="text-lg font-bold text-green-600">{slaPerformance?.resolution_rate || 0}%</p>
                  <p className="text-xs text-gray-600">Resolution SLA</p>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Weekly Comparison */}
        <Card className="lg:col-span-2">
          <CardBody>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-600" />
              This Week vs Last Week
            </h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Tickets Created</p>
                      <p className="text-2xl font-bold text-gray-900">{weeklyComparison?.this_week?.created || 0}</p>
                    </div>
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm ${
                      (weeklyComparison?.trends?.created || 0) <= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {(weeklyComparison?.trends?.created || 0) <= 0 ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
                      {Math.abs(weeklyComparison?.trends?.created || 0)}%
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Last week: {weeklyComparison?.last_week?.created || 0}</p>
                </div>
                <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Tickets Resolved</p>
                      <p className="text-2xl font-bold text-gray-900">{weeklyComparison?.this_week?.resolved || 0}</p>
                    </div>
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm ${
                      (weeklyComparison?.trends?.resolved || 0) >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {(weeklyComparison?.trends?.resolved || 0) >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                      {Math.abs(weeklyComparison?.trends?.resolved || 0)}%
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Last week: {weeklyComparison?.last_week?.resolved || 0}</p>
                </div>
              </div>
              <div className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={[
                    { name: 'Created', thisWeek: weeklyComparison?.this_week?.created || 0, lastWeek: weeklyComparison?.last_week?.created || 0 },
                    { name: 'Resolved', thisWeek: weeklyComparison?.this_week?.resolved || 0, lastWeek: weeklyComparison?.last_week?.resolved || 0 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="thisWeek" name="This Week" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="lastWeek" name="Last Week" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Trends & Status Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardBody>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5 text-indigo-600" />
              Ticket Trends (Last 7 Days)
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={COLORS.success} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "none",
                    borderRadius: "12px",
                    boxShadow: "0 10px 40px -10px rgba(0, 0, 0, 0.2)",
                  }}
                />
                <Legend />
                <Area type="monotone" dataKey="created" stroke={COLORS.primary} fillOpacity={1} fill="url(#colorCreated)" strokeWidth={2} name="Created" />
                <Area type="monotone" dataKey="resolved" stroke={COLORS.success} fillOpacity={1} fill="url(#colorResolved)" strokeWidth={2} name="Resolved" />
              </AreaChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-600" />
              Tickets by Status
            </h3>
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={250}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey="value"
                    paddingAngle={3}
                  >
                    {statusData?.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || COLORS.primary} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "none",
                      borderRadius: "12px",
                      boxShadow: "0 10px 40px -10px rgba(0, 0, 0, 0.2)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {statusData?.map((entry: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_COLORS[entry.status] || COLORS.primary }} />
                      <span className="text-sm text-gray-700">{entry.status}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Priority, Categories & Agent Performance Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardBody>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              By Priority
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={priorityData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="priority" type="category" tick={{ fontSize: 11 }} width={70} />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {priorityData?.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[entry.priority] || COLORS.primary} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Timer className="h-5 w-5 text-blue-600" />
              Avg Resolution Time
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={avgResolutionTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="priority" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} label={{ value: 'Hours', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                <Tooltip formatter={(value: any) => [`${value} hrs`, 'Avg Time']} />
                <Bar dataKey="hours" fill={COLORS.info} radius={[4, 4, 0, 0]}>
                  {avgResolutionTime?.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[entry.priority] || COLORS.info} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-600" />
              Top Performers
            </h3>
            <div className="space-y-3">
              {agentPerformance?.length > 0 ? agentPerformance?.map((agent: any, index: number) => (
                <div key={index} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                    index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-amber-600' : 'bg-gray-300'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{agent.name}</p>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div
                        className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full"
                        style={{ width: `${(agent.resolved / (agentPerformance[0]?.resolved || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-bold text-indigo-600">{agent.resolved}</span>
                </div>
              )) : (
                <p className="text-sm text-gray-500 text-center py-4">No resolved tickets this month</p>
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Recent Activity & Categories Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardBody>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5 text-indigo-600" />
              Recent Activity
            </h3>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
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

        <Card>
          <CardBody>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-teal-600" />
              Top Categories
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topCategories} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="category" type="category" tick={{ fontSize: 11 }} width={120} />
                <Tooltip />
                <Bar dataKey="value" fill={COLORS.primary} radius={[0, 8, 8, 0]}>
                  {topCategories?.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={[COLORS.primary, COLORS.purple, COLORS.info, COLORS.success, COLORS.warning][index % 5]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      </div>

      {/* Pending Approvals */}
      {pendingApprovals && pendingApprovals.length > 0 && (
        <div className="grid grid-cols-1">
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
              <div className="mt-4 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => navigate("/service-requests?approval_status=pending")}
                  className="w-full"
                >
                  View All Pending
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}

/**
 * Main Dashboard Component
 * Routes to appropriate dashboard based on user role
 */
export default function Dashboard() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  // Route to appropriate dashboard based on user role
  const dashboardView = getDashboardView(user);

  switch (dashboardView) {
    case 'admin':
      return <AdminDashboard />;
    case 'manager':
      return <ManagerDashboard />;
    case 'agent':
      return <AgentDashboard />;
    case 'user':
      return <UserDashboard />;
    default:
      return <UserDashboard />;
  }
}