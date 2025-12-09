/**
 * User Dashboard
 * Dashboard view for End Users - shows only their own submitted tickets
 */
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import axiosInstance from "@/lib/axios";
import { Card, CardBody } from "@/components/common/Card";
import {
  Plus,
  Ticket,
  Clock,
  CheckCircle2,
  BookOpen,
} from "lucide-react";
import { formatRelativeTime } from "@/utils/helpers";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import Button from "@/components/common/Button";
import { useAuth } from "@/hooks/useAuth";

export default function UserDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Fetch user's own tickets
  const { data: myTickets, isLoading } = useQuery({
    queryKey: ["user-my-tickets"],
    queryFn: async () => {
      const res = await axiosInstance.get(`/tickets?requester_id=${user?.id}&page=1&page_size=100`);
      return res.data;
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  // Fetch user's service requests
  const { data: myRequests } = useQuery({
    queryKey: ["user-my-requests"],
    queryFn: async () => {
      const res = await axiosInstance.get(`/service-requests?requester_id=${user?.id}&page=1&page_size=50`);
      return res.data;
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  // Fetch popular KB articles
  const { data: kbArticles } = useQuery({
    queryKey: ["popular-kb-articles"],
    queryFn: async () => {
      const res = await axiosInstance.get("/knowledge/articles?page=1&page_size=5&sort=views");
      return res.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  const tickets = myTickets?.items || [];
  const requests = myRequests?.items || [];

  // Calculate stats (normalize status to lowercase for comparison)
  const stats = {
    total_tickets: tickets.length,
    open_tickets: tickets.filter((t: any) => ['NEW', 'OPEN', 'IN_PROGRESS', 'PENDING'].includes(t.status?.toUpperCase?.() || t.status)).length,
    resolved_tickets: tickets.filter((t: any) => ['RESOLVED', 'CLOSED'].includes(t.status?.toUpperCase?.() || t.status)).length,
    total_requests: requests.length,
    pending_requests: requests.filter((r: any) => r.approval_status === 'pending').length,
  };

  const statCards = [
    {
      title: "My Open Tickets",
      value: stats.open_tickets,
      icon: Ticket,
      color: "bg-blue-500",
      textColor: "text-blue-600",
      bgColor: "bg-blue-50",
      action: () => navigate(`/incidents?requester_id=${user?.id}&status=open`),
    },
    {
      title: "Total Tickets",
      value: stats.total_tickets,
      icon: Ticket,
      color: "bg-indigo-500",
      textColor: "text-indigo-600",
      bgColor: "bg-indigo-50",
      action: () => navigate(`/incidents?requester_id=${user?.id}`),
    },
    {
      title: "Resolved",
      value: stats.resolved_tickets,
      icon: CheckCircle2,
      color: "bg-green-500",
      textColor: "text-green-600",
      bgColor: "bg-green-50",
      action: () => navigate(`/incidents?requester_id=${user?.id}&status=resolved`),
    },
    {
      title: "Service Requests",
      value: stats.total_requests,
      icon: Clock,
      color: "bg-purple-500",
      textColor: "text-purple-600",
      bgColor: "bg-purple-50",
      action: () => navigate(`/service-requests`),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Support Portal</h1>
          <p className="mt-2 text-sm text-gray-600">
            Welcome back, {user?.full_name}! Manage your tickets and requests.
          </p>
        </div>
        <Button
          onClick={() => navigate("/incidents/new")}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Ticket
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* My Recent Tickets */}
        <Card>
          <CardBody>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">My Recent Tickets</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/incidents?requester_id=${user?.id}`)}
              >
                View All
              </Button>
            </div>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {tickets.slice(0, 5).map((ticket: any) => (
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
                        ['RESOLVED', 'CLOSED'].includes(ticket.status?.toUpperCase?.() || ticket.status) ? 'bg-green-100 text-green-800' :
                        ticket.status?.toUpperCase?.() === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                        ticket.status?.toUpperCase?.() === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {(ticket.status || '').replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 truncate mt-1">{ticket.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {ticket.assignee_name && (
                        <span className="text-xs text-gray-500">Assigned to: {ticket.assignee_name}</span>
                      )}
                      {!ticket.assignee_name && (
                        <span className="text-xs text-gray-500">Unassigned</span>
                      )}
                      <span className="text-xs text-gray-500">• {formatRelativeTime(ticket.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))}
              {tickets.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Ticket className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p>No tickets yet</p>
                  <Button
                    onClick={() => navigate("/incidents/new")}
                    className="mt-4"
                    size="sm"
                  >
                    Create Your First Ticket
                  </Button>
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Knowledge Base - Popular Articles */}
        <Card>
          <CardBody>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-indigo-600" />
                Popular Solutions
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/knowledge/articles")}
              >
                View All
              </Button>
            </div>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {kbArticles?.items?.slice(0, 5).map((article: any) => (
                <div
                  key={article.id}
                  className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => navigate(`/knowledge/articles/${article.id}`)}
                >
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                      <BookOpen className="h-4 w-4 text-green-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{article.title}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {article.views || 0} views
                    </p>
                  </div>
                </div>
              ))}
              {(!kbArticles?.items || kbArticles.items.length === 0) && (
                <div className="text-center py-12 text-gray-500">
                  <BookOpen className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p>No articles available</p>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardBody>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Button
              variant="outline"
              onClick={() => navigate("/incidents/new")}
              className="flex flex-col items-center gap-2 h-auto py-6"
            >
              <Plus className="h-6 w-6" />
              <span>Report an Issue</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/service-requests/new")}
              className="flex flex-col items-center gap-2 h-auto py-6"
            >
              <Clock className="h-6 w-6" />
              <span>Request Service</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/knowledge/articles")}
              className="flex flex-col items-center gap-2 h-auto py-6"
            >
              <BookOpen className="h-6 w-6" />
              <span>Browse Solutions</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(`/incidents?requester_id=${user?.id}`)}
              className="flex flex-col items-center gap-2 h-auto py-6"
            >
              <Ticket className="h-6 w-6" />
              <span>View My Tickets</span>
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
