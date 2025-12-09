import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ticketService } from "@/services/ticketService";
import { userService } from "@/services/userService";
import {
  ArrowLeftIcon, UserCircleIcon, ClockIcon, ChatBubbleLeftIcon,
  PaperClipIcon, ArrowDownTrayIcon, PauseIcon, PlayIcon, ArrowPathIcon
} from '@heroicons/react/24/outline';
import { Card, CardBody } from "@/components/common/Card";
import Button from "@/components/common/Button";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import Select from "@/components/common/Select";
import {
  formatDate,
  formatRelativeTime,
  getPriorityColor,
  getStatusColor,
} from "@/utils/helpers";
import toast from "react-hot-toast";
import axiosInstance from '@/lib/axios';
import { useAuth } from "@/hooks/useAuth";
import { isAgentOrHigher, isTeamLeadOrHigher, isManagerOrHigher } from "@/utils/roleHelpers";
import { CalendarDaysIcon } from '@heroicons/react/24/outline';
export default function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isStaff = isAgentOrHigher(user);
  const isLeadOrHigher = isTeamLeadOrHigher(user);
  const canOverrideDates = isManagerOrHigher(user);
  const [comment, setComment] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState<number | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [showSLAPause, setShowSLAPause] = useState(false);
  const [pauseReason, setPauseReason] = useState("");

  // Date Override Modal State
  const [showDateOverrideModal, setShowDateOverrideModal] = useState(false);
  const [overrideCreatedAt, setOverrideCreatedAt] = useState("");
  const [overrideResolvedAt, setOverrideResolvedAt] = useState("");
  const [overrideClosedAt, setOverrideClosedAt] = useState("");
  const [overrideReason, setOverrideReason] = useState("");

  const { data: ticket, isLoading } = useQuery({
    queryKey: ["ticket", id],
    queryFn: () => ticketService.getTicket(Number(id)),
    enabled: !!id,
  });

  // Permission check: Can perform agent actions if:
  // 1. User is team lead or higher (can act on any ticket), OR
  // 2. User is an agent AND (ticket is assigned to them OR ticket is unassigned)
  const isAssignedToMe = ticket?.assignee_id === user?.id;
  const isUnassigned = !ticket?.assignee_id;
  const canPerformAgentActions = isStaff && (isLeadOrHigher || isAssignedToMe || isUnassigned);

  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState("");

  const { data: usersData } = useQuery({
    queryKey: ["users"],
    queryFn: () =>
      userService.getUsers({ page: 1, page_size: 100, is_active: true }),
  });

  const { data: comments } = useQuery({
    queryKey: ["ticket-comments", id],
    queryFn: () => ticketService.getComments(Number(id)),
    enabled: !!id,
  });

  const { data: slaPauses } = useQuery({
    queryKey: ["sla-pauses", id],
    queryFn: async () => {
      const response = await axiosInstance.get(`/tickets/${id}/sla/pauses`);
      return response.data;
    },
    enabled: !!id,
  });

  const { data: activities } = useQuery({
    queryKey: ["ticket-activities", id],
    queryFn: () => ticketService.getActivities(Number(id)),
    enabled: !!id,
  });

  const { data: slaStatus } = useQuery({
    queryKey: ["sla-status", id],
    queryFn: () => ticketService.getSLAStatus(Number(id)),
    enabled: !!id,
    refetchInterval: 60000,
  });

  const { data: attachments, refetch: refetchAttachments } = useQuery({
    queryKey: ["ticket-attachments", id],
    queryFn: () => ticketService.getAttachments(Number(id)),
    enabled: !!id,
  });

  const assignMutation = useMutation({
    mutationFn: (assigneeId: number) =>
      ticketService.assignTicket(Number(id), assigneeId),
    onSuccess: () => {
      toast.success("Ticket assigned successfully");
      setIsAssigning(false);
      setSelectedAssignee(null); // ✅ Reset selection
      queryClient.invalidateQueries({ queryKey: ["ticket", id] });
      queryClient.invalidateQueries({ queryKey: ["ticket-activities", id] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] }); // ✅ Refresh ticket list
      queryClient.invalidateQueries({ queryKey: ["agent-my-tickets"] }); // ✅ Refresh agent dashboard
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] }); // ✅ Refresh dashboard stats
    },
    onError: () => toast.error("Failed to assign ticket"),
  });

  const commentMutation = useMutation({
    mutationFn: (commentText: string) =>
      ticketService.addComment(Number(id), commentText, false),
    onSuccess: () => {
      toast.success("Comment added");
      setComment("");
      queryClient.invalidateQueries({ queryKey: ["ticket-comments", id] });
      queryClient.invalidateQueries({ queryKey: ["ticket-activities", id] });
    },
    onError: () => toast.error("Failed to add comment"),
  });

  const resolveMutation = useMutation({
    mutationFn: (resolutionNotes: string) =>
      ticketService.resolveTicket(Number(id), resolutionNotes),
    onSuccess: () => {
      toast.success("Ticket resolved");
      setShowResolveModal(false);
      setResolutionNotes("");
      queryClient.invalidateQueries({ queryKey: ["ticket", id] });
      queryClient.invalidateQueries({ queryKey: ["ticket-activities", id] });
    },
    onError: () => toast.error("Failed to resolve ticket"),
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) =>
      ticketService.updateTicket(Number(id), { status }),
    onSuccess: () => {
      toast.success("Status updated successfully");
      setNewStatus(""); // ✅ Clear selection
      queryClient.invalidateQueries({ queryKey: ["ticket", id] });
      queryClient.invalidateQueries({ queryKey: ["ticket-activities", id] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] }); // ✅ Refresh list
    },
    onError: () => toast.error("Failed to update status"),
  });

  const pauseSLAMutation = useMutation({
    mutationFn: (reason: string) => ticketService.pauseSLA(Number(id), reason),
    onSuccess: () => {
      toast.success("SLA paused");
      setShowSLAPause(false);
      setPauseReason("");
      queryClient.invalidateQueries({ queryKey: ["sla-status", id] });
      queryClient.invalidateQueries({ queryKey: ["sla-pauses", id] }); // ✅ Refresh pause history
    },
    onError: () => toast.error("Failed to pause SLA"),
  });

  const resumeSLAMutation = useMutation({
    mutationFn: () => ticketService.resumeSLA(Number(id)),
    onSuccess: () => {
      toast.success("SLA resumed");
      queryClient.invalidateQueries({ queryKey: ["sla-status", id] });
      queryClient.invalidateQueries({ queryKey: ["sla-pauses", id] });
    },
    onError: () => toast.error("Failed to resume SLA"),
  });

  const recalculateSLAMutation = useMutation({
    mutationFn: () => ticketService.recalculateSLA(Number(id)),
    onSuccess: () => {
      toast.success("SLA recalculated successfully");
      queryClient.invalidateQueries({ queryKey: ["sla-status", id] });
      queryClient.invalidateQueries({ queryKey: ["ticket", id] });
      queryClient.invalidateQueries({ queryKey: ["sla-pauses", id] }); // Refresh pause history
    },
    onError: () => toast.error("Failed to resume SLA"),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) =>
      ticketService.uploadAttachment(Number(id), file),
    onSuccess: () => {
      toast.success("File uploaded successfully");
      refetchAttachments();
    },
    onError: () => toast.error("Failed to upload file"),
  });

  // Date Override Mutations
  const overrideDatesMutation = useMutation({
    mutationFn: (data: {
      created_at_override?: string;
      resolved_at_override?: string;
      closed_at_override?: string;
      override_reason: string;
    }) => ticketService.overrideDates(Number(id), data),
    onSuccess: () => {
      toast.success("Dates overridden successfully");
      setShowDateOverrideModal(false);
      resetOverrideForm();
      queryClient.invalidateQueries({ queryKey: ["ticket", id] });
      queryClient.invalidateQueries({ queryKey: ["ticket-activities", id] });
      queryClient.invalidateQueries({ queryKey: ["sla-status", id] });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || "Failed to override dates";
      toast.error(message);
    },
  });

  const clearOverridesMutation = useMutation({
    mutationFn: () => ticketService.clearDateOverrides(Number(id)),
    onSuccess: () => {
      toast.success("Date overrides cleared");
      queryClient.invalidateQueries({ queryKey: ["ticket", id] });
      queryClient.invalidateQueries({ queryKey: ["ticket-activities", id] });
      queryClient.invalidateQueries({ queryKey: ["sla-status", id] });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || "Failed to clear overrides";
      toast.error(message);
    },
  });

  const resetOverrideForm = () => {
    setOverrideCreatedAt("");
    setOverrideResolvedAt("");
    setOverrideClosedAt("");
    setOverrideReason("");
  };

  const handleDateOverride = () => {
    const data: {
      created_at_override?: string;
      resolved_at_override?: string;
      closed_at_override?: string;
      override_reason: string;
    } = {
      override_reason: overrideReason,
    };

    if (overrideCreatedAt) {
      data.created_at_override = new Date(overrideCreatedAt).toISOString();
    }
    if (overrideResolvedAt) {
      data.resolved_at_override = new Date(overrideResolvedAt).toISOString();
    }
    if (overrideClosedAt) {
      data.closed_at_override = new Date(overrideClosedAt).toISOString();
    }

    overrideDatesMutation.mutate(data);
  };

  const hasAnyOverride = overrideCreatedAt || overrideResolvedAt || overrideClosedAt;
  const isOverrideValid = hasAnyOverride && overrideReason.trim().length >= 10;

  const getAllowedStatusTransitions = (currentStatus: string) => {
    const transitions: Record<string, string[]> = {
      NEW: ["OPEN", "CANCELLED"],
      OPEN: ["IN_PROGRESS", "PENDING", "CANCELLED"],
      IN_PROGRESS: ["PENDING", "RESOLVED", "CANCELLED"],
      PENDING: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
      RESOLVED: ["CLOSED", "OPEN"],
      CLOSED: [],
    };
    return transitions[currentStatus] || [];
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      NEW: "New",
      OPEN: "Open",
      IN_PROGRESS: "In Progress",
      PENDING: "Pending",
      RESOLVED: "Resolved",
      CLOSED: "Closed",
      CANCELLED: "Cancelled",
    };
    return labels[status] || status;
  };

  const formatTimeRemaining = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours < 24) return `${hours}h ${mins}m`;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
  };

  const handleAssign = () => {
    if (selectedAssignee) {
      assignMutation.mutate(selectedAssignee);
    }
  };

  const handleAddComment = () => {
    if (comment.trim()) {
      commentMutation.mutate(comment);
    }
  };

  const handleResolve = () => {
    if (resolutionNotes.trim().length >= 10) {
      resolveMutation.mutate(resolutionNotes);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      uploadMutation.mutate(file);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Ticket not found</p>
      </div>
    );
  }

  const userOptions =
    usersData?.items.map((user: any) => ({
      value: user.id,
      label: user.full_name,
    })) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate("/incidents")}>
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {ticket.ticket_number}
            </h1>
            <p className="text-sm text-gray-500 mt-1">{ticket.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`badge ${getStatusColor(ticket.status)}`}>
            {ticket.status.replace("_", " ")}
          </span>
          <span className={`badge ${getPriorityColor(ticket.priority)}`}>
            {ticket.priority}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardBody>
              <h2 className="text-lg font-semibold mb-4">Description</h2>
              <p className="text-gray-700 whitespace-pre-wrap">
                {ticket.description}
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <ChatBubbleLeftIcon className="h-5 w-5" />
                Comments ({comments?.length || 0})
              </h2>

              <div className="space-y-4">
                {comments?.map((comment) => (
                  <div
                    key={comment.id}
                    className="border-l-4 border-accent-500 pl-4 py-2"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">
                        {comment.user_name}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatRelativeTime(comment.created_at)}
                      </span>
                    </div>
                    <p className="text-gray-700">{comment.comment}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t">
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add a comment..."
                  rows={3}
                  className="form-input w-full"
                />
                <div className="mt-2 flex justify-end">
                  <Button
                    variant="primary"
                    onClick={handleAddComment}
                    disabled={!comment.trim() || commentMutation.isPending}
                    isLoading={commentMutation.isPending}
                  >
                    Add Comment
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <PaperClipIcon className="h-5 w-5" />
                Attachments ({attachments?.length || 0})
              </h2>

              <div className="space-y-2 mb-4">
                {attachments?.map((attachment: any) => (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                  >
                    <div className="flex items-center gap-3">
                      <PaperClipIcon className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {attachment.filename}
                        </p>
                        <p className="text-xs text-gray-500">
                          {(attachment.size / 1024).toFixed(2)} KB •{" "}
                          {attachment.uploaded_by} •{" "}
                          {formatRelativeTime(attachment.uploaded_at)}
                        </p>
                      </div>
                    </div>
                    <a
                      href={`${
                        import.meta.env.VITE_API_URL
                      }/tickets/attachments/${attachment.id}/download`}
                      download
                      className="text-accent-600 hover:text-accent-700"
                    >
                      <ArrowDownTrayIcon className="h-5 w-5" />
                    </a>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4">
                <label className="form-label">Upload New File</label>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="form-input w-full"
                  disabled={uploadMutation.isPending}
                />
                {uploadMutation.isPending && (
                  <p className="text-sm text-gray-500 mt-2">Uploading...</p>
                )}
              </div>
            </CardBody>
          </Card>

          {/* SLA Pause History - Detailed View */}
          {slaPauses && slaPauses.length > 0 && (
            <Card>
              <CardBody>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <PauseIcon className="h-5 w-5" />
                  SLA Pause History ({slaPauses.length})
                </h2>
                <div className="space-y-3">
                  {slaPauses.map((pause: any) => (
                    <div
                      key={pause.id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900">
                              {pause.paused_by}
                            </span>
                            {pause.is_active ? (
                              <span className="badge bg-yellow-100 text-yellow-800">
                                Currently Paused
                              </span>
                            ) : (
                              <span className="badge bg-gray-100 text-gray-800">
                                Resumed
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-700 mb-2">
                            {pause.reason}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                        <div>
                          <p className="font-medium text-gray-700">Paused At</p>
                          <p>{formatDate(pause.paused_at, "PPp")}</p>
                        </div>
                        {pause.resumed_at && (
                          <div>
                            <p className="font-medium text-gray-700">
                              Resumed At
                            </p>
                            <p>{formatDate(pause.resumed_at, "PPp")}</p>
                          </div>
                        )}
                        {pause.resumed_by && (
                          <div>
                            <p className="font-medium text-gray-700">
                              Resumed By
                            </p>
                            <p>{pause.resumed_by}</p>
                          </div>
                        )}
                        {pause.pause_duration && (
                          <div>
                            <p className="font-medium text-gray-700">
                              Duration
                            </p>
                            <p className="font-semibold text-accent-600">
                              {formatTimeRemaining(pause.pause_duration)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Activity Timeline */}
          <Card>
            <CardBody>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <ClockIcon className="h-5 w-5" />
                Activity Timeline
              </h2>
              <div className="space-y-4">
                {activities?.map((activity) => {
                  // Determine icon and color based on activity type
                  const getActivityIcon = (type: string) => {
                    switch (type) {
                      case "created":
                        return "🎫";
                      case "assigned":
                        return "👤";
                      case "commented":
                        return "💬";
                      case "updated":
                        return "✏️";
                      case "resolved":
                        return "✅";
                      case "closed":
                        return "🔒";
                      case "sla_paused":
                        return "⏸️";
                      case "sla_resumed":
                        return "▶️";
                      default:
                        return "📝";
                    }
                  };

                  const getActivityColor = (type: string) => {
                    switch (type) {
                      case "created":
                        return "bg-blue-100 text-blue-600";
                      case "assigned":
                        return "bg-purple-100 text-purple-600";
                      case "commented":
                        return "bg-green-100 text-green-600";
                      case "sla_paused":
                        return "bg-yellow-100 text-yellow-600";
                      case "sla_resumed":
                        return "bg-green-100 text-green-600";
                      case "resolved":
                        return "bg-green-100 text-green-600";
                      case "closed":
                        return "bg-gray-100 text-gray-600";
                      default:
                        return "bg-accent-100 text-accent-600";
                    }
                  };

                  return (
                    <div key={activity.id} className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div
                          className={`h-8 w-8 rounded-full ${getActivityColor(
                            activity.activity_type
                          )} flex items-center justify-center text-lg`}
                        >
                          {getActivityIcon(activity.activity_type)}
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">
                          {activity.description}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(activity.created_at, "PPp")}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardBody>
              <h3 className="font-semibold mb-4">Ticket Information</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-xs text-gray-500">Ticket Number</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {ticket.ticket_number}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Created</dt>
                  <dd className="text-sm text-gray-900">
                    {formatDate(ticket.created_at, "PPp")}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Requester</dt>
                  <dd className="text-sm text-gray-900">
                    {ticket.requester_name}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Category</dt>
                  <dd className="text-sm text-gray-900">
                    {ticket.category_name || "Uncategorized"}
                    {ticket.subcategory_name && ` > ${ticket.subcategory_name}`}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Priority</dt>
                  <dd>
                    <span
                      className={`badge ${getPriorityColor(ticket.priority)}`}
                    >
                      {ticket.priority}
                    </span>
                  </dd>
                </div>

                {/* Linked Assets */}
                {ticket.linked_assets && ticket.linked_assets.length > 0 && (
                  <div>
                    <dt className="text-xs text-gray-500 mb-2">
                      Linked Assets ({ticket.linked_assets.length})
                    </dt>
                    <dd className="space-y-2">
                      {ticket.linked_assets.map((asset) => (
                        <Link
                          key={asset.id}
                          to={`/assets/${asset.asset_id}`}
                          className="block p-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {asset.asset_tag}
                              </p>
                              <p className="text-xs text-gray-600 truncate">
                                {asset.asset_name}
                              </p>
                            </div>
                            {asset.status && (
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                asset.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                                asset.status === 'IN_MAINTENANCE' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {asset.status}
                              </span>
                            )}
                          </div>
                          {asset.asset_type_name && (
                            <p className="text-xs text-gray-500 mt-1">
                              {asset.asset_type_name}
                            </p>
                          )}
                        </Link>
                      ))}
                    </dd>
                  </div>
                )}
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <UserCircleIcon className="h-5 w-5" />
                Assignment
              </h3>

              {!isAssigning ? (
                <div>
                  {ticket.assignee_name ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {ticket.assignee_name}
                        </p>
                        <p className="text-xs text-gray-500">Assigned</p>
                      </div>
                      {canPerformAgentActions && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsAssigning(true)}
                        >
                          Reassign
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-gray-500 mb-3">Not assigned</p>
                      {canPerformAgentActions && (
                        <Button
                          variant="primary"
                          onClick={() => setIsAssigning(true)}
                          className="w-full"
                        >
                          Assign Ticket
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <Select
                    options={userOptions}
                    placeholder="Select assignee"
                    value={selectedAssignee || undefined}
                    onChange={(e) =>
                      setSelectedAssignee(Number(e.target.value))
                    }
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      onClick={handleAssign}
                      disabled={!selectedAssignee || assignMutation.isPending}
                      isLoading={assignMutation.isPending}
                      className="flex-1"
                    >
                      Assign
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsAssigning(false);
                        setSelectedAssignee(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          {slaStatus && (
            <Card>
              <CardBody>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <ClockIcon className="h-5 w-5" />
                    SLA Status
                  </h3>
                  <div className="flex items-center gap-2">
                    {slaStatus.is_paused && (
                      <span className="badge bg-yellow-100 text-yellow-800">
                        Paused
                      </span>
                    )}
                    {isAgentOrHigher(user) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => recalculateSLAMutation.mutate()}
                        isLoading={recalculateSLAMutation.isPending}
                        title="Recalculate SLA based on current policy"
                      >
                        <ArrowPathIcon className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {!slaStatus.response && !slaStatus.resolution && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      No SLA policy assigned to this ticket.
                    </p>
                  </div>
                )}

                {slaStatus.response && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600">
                        Response Time
                      </span>
                      <span
                        className={`text-xs font-medium ${
                          slaStatus.response.is_breached
                            ? "text-red-600"
                            : slaStatus.response.remaining_minutes < 60
                            ? "text-orange-600"
                            : "text-green-600"
                        }`}
                      >
                        {slaStatus.response.is_breached
                          ? "BREACHED"
                          : formatTimeRemaining(
                              slaStatus.response.remaining_minutes
                            )}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          slaStatus.response.is_breached
                            ? "bg-red-600"
                            : slaStatus.response.remaining_minutes < 60
                            ? "bg-orange-500"
                            : "bg-green-500"
                        }`}
                        style={{
                          width: slaStatus.response.is_breached
                            ? "100%"
                            : `${Math.min(
                                100,
                                (slaStatus.response.remaining_minutes / 120) *
                                  100
                              )}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {slaStatus.resolution && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600">
                        Resolution Time
                      </span>
                      <span
                        className={`text-xs font-medium ${
                          slaStatus.resolution.is_breached
                            ? "text-red-600"
                            : slaStatus.resolution.remaining_minutes < 120
                            ? "text-orange-600"
                            : "text-green-600"
                        }`}
                      >
                        {slaStatus.resolution.is_breached
                          ? "BREACHED"
                          : formatTimeRemaining(
                              slaStatus.resolution.remaining_minutes
                            )}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          slaStatus.resolution.is_breached
                            ? "bg-red-600"
                            : slaStatus.resolution.remaining_minutes < 120
                            ? "bg-orange-500"
                            : "bg-green-500"
                        }`}
                        style={{
                          width: slaStatus.resolution.is_breached
                            ? "100%"
                            : `${Math.min(
                                100,
                                (slaStatus.resolution.remaining_minutes / 480) *
                                  100
                              )}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {slaStatus.total_pause_time > 0 && (
                  <p className="text-xs text-gray-500 mb-3">
                    Total paused:{" "}
                    {formatTimeRemaining(slaStatus.total_pause_time)}
                  </p>
                )}

                {/* SLA Pause History */}
                {slaPauses && slaPauses.length > 0 && (
                  <div className="mb-4 border-t pt-3">
                    <p className="text-xs font-medium text-gray-700 mb-2">
                      Pause History
                    </p>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {slaPauses.map((pause: any) => (
                        <div
                          key={pause.id}
                          className="text-xs bg-gray-50 p-2 rounded"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium">
                              {pause.paused_by}
                            </span>
                            {pause.is_active ? (
                              <span className="badge bg-yellow-100 text-yellow-800 text-xs">
                                Active
                              </span>
                            ) : (
                              <span className="text-gray-500">
                                {pause.pause_duration} min
                              </span>
                            )}
                          </div>
                          <p className="text-gray-600 mb-1">{pause.reason}</p>
                          <p className="text-gray-400">
                            {formatDate(pause.paused_at, "PPp")}
                            {pause.resumed_at &&
                              ` → ${formatDate(pause.resumed_at, "PPp")}`}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {canPerformAgentActions && (
                  <div className="space-y-2">
                    {!slaStatus.is_paused ? (
                      <Button
                        variant="outline"
                        onClick={() => setShowSLAPause(true)}
                        className="w-full"
                      >
                        <PauseIcon className="h-4 w-4 mr-2" />
                        Pause SLA
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        onClick={() => resumeSLAMutation.mutate()}
                        disabled={resumeSLAMutation.isPending}
                        className="w-full"
                      >
                        <PlayIcon className="h-4 w-4 mr-2" />
                        Resume SLA
                      </Button>
                    )}
                  </div>
                )}

                {showSLAPause && (
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <label className="form-label">
                      Pause Reason (min 10 characters)
                    </label>
                    <textarea
                      value={pauseReason}
                      onChange={(e) => setPauseReason(e.target.value)}
                      placeholder="Enter reason for pausing SLA..."
                      rows={3}
                      className="form-input w-full mb-2"
                    />
                    <p className="text-xs text-gray-500 mb-2">
                      {pauseReason.length}/10 characters
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() =>
                          pauseReason.trim().length >= 10 &&
                          pauseSLAMutation.mutate(pauseReason)
                        }
                        disabled={
                          pauseReason.trim().length < 10 ||
                          pauseSLAMutation.isPending
                        }
                      >
                        Pause
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowSLAPause(false);
                          setPauseReason("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          {/* Actions */}
          <Card>
            <CardBody>
              <h3 className="font-semibold mb-4">Actions</h3>
              <div className="space-y-2">
                {canPerformAgentActions && getAllowedStatusTransitions(ticket.status).length > 0 && (
                  <div className="mb-4">
                    <label className="form-label">Change Status</label>
                    <p className="text-xs text-gray-500 mb-2">
                      Current:{" "}
                      <span className="font-medium">
                        {getStatusLabel(ticket.status)}
                      </span>
                    </p>
                    <select
                      className="form-input w-full mb-2"
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      key={ticket.status} // Force re-render when status changes
                    >
                      <option value="">Select new status</option>
                      {getAllowedStatusTransitions(ticket.status).map(
                        (status) => (
                          <option key={status} value={status}>
                            {getStatusLabel(status)}
                          </option>
                        )
                      )}
                    </select>
                    <Button
                      variant="primary"
                      onClick={() =>
                        newStatus && updateStatusMutation.mutate(newStatus)
                      }
                      disabled={!newStatus || updateStatusMutation.isPending}
                      isLoading={updateStatusMutation.isPending}
                      className="w-full"
                    >
                      Update Status
                    </Button>
                  </div>
                )}

                {canPerformAgentActions && ticket.status !== "RESOLVED" && ticket.status !== "CLOSED" && (
                  <Button
                    variant="primary"
                    onClick={() => setShowResolveModal(true)}
                    className="w-full"
                  >
                    Resolve Ticket
                  </Button>
                )}

                {canPerformAgentActions && (
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/incidents/${id}/edit`)}
                    className="w-full"
                  >
                    Edit Ticket
                  </Button>
                )}

                {!canPerformAgentActions && (
                  <p className="text-sm text-gray-500 text-center py-2">
                    Contact support to update this ticket
                  </p>
                )}

                {/* Date Override Button - Manager+ only */}
                {canOverrideDates && (
                  <div className="border-t pt-4 mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <CalendarDaysIcon className="h-4 w-4" />
                      Administrative Actions
                    </h4>

                    {/* Show current overrides if any */}
                    {(ticket.created_at_override || ticket.resolved_at_override || ticket.closed_at_override) && (
                      <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-xs font-medium text-amber-800 mb-2">Active Date Overrides:</p>
                        {ticket.created_at_override && (
                          <p className="text-xs text-amber-700">
                            Created: {formatDate(ticket.created_at_override, "PPp")}
                          </p>
                        )}
                        {ticket.resolved_at_override && (
                          <p className="text-xs text-amber-700">
                            Resolved: {formatDate(ticket.resolved_at_override, "PPp")}
                          </p>
                        )}
                        {ticket.closed_at_override && (
                          <p className="text-xs text-amber-700">
                            Closed: {formatDate(ticket.closed_at_override, "PPp")}
                          </p>
                        )}
                        {ticket.override_reason && (
                          <p className="text-xs text-amber-600 mt-1 italic">
                            Reason: {ticket.override_reason}
                          </p>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => clearOverridesMutation.mutate()}
                          disabled={clearOverridesMutation.isPending}
                          isLoading={clearOverridesMutation.isPending}
                          className="mt-2 text-red-600 border-red-300 hover:bg-red-50"
                        >
                          Clear Overrides
                        </Button>
                      </div>
                    )}

                    <Button
                      variant="outline"
                      onClick={() => setShowDateOverrideModal(true)}
                      className="w-full"
                    >
                      <CalendarDaysIcon className="h-4 w-4 mr-2" />
                      Override Dates
                    </Button>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
          {/* Resolve Modal */}
          {showResolveModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold mb-4">Resolve Ticket</h3>
                <div className="space-y-4">
                  <div>
                    <label className="form-label">
                      Resolution Notes (min 10 characters)
                    </label>
                    <textarea
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      placeholder="Enter resolution notes..."
                      rows={5}
                      className="form-input w-full"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {resolutionNotes.length}/10 characters
                    </p>
                  </div>
                  <div className="flex gap-3 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowResolveModal(false);
                        setResolutionNotes("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleResolve}
                      disabled={
                        resolutionNotes.trim().length < 10 ||
                        resolveMutation.isPending
                      }
                      isLoading={resolveMutation.isPending}
                    >
                      Resolve Ticket
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Date Override Modal */}
          {showDateOverrideModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <CalendarDaysIcon className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Override Ticket Dates</h3>
                    <p className="text-sm text-gray-500">Manually adjust ticket timestamps for administrative corrections</p>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-amber-800">
                    <strong>Warning:</strong> This action will permanently modify the ticket's timeline and affect SLA calculations.
                    All changes are logged in the activity history.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Current Values Reference */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs font-medium text-gray-600 mb-2">Current Values (for reference)</p>
                    <div className="grid grid-cols-1 gap-1 text-xs text-gray-700">
                      <p>Created: {formatDate(ticket.created_at, "PPp")}</p>
                      {ticket.resolved_at && <p>Resolved: {formatDate(ticket.resolved_at, "PPp")}</p>}
                      {ticket.closed_at && <p>Closed: {formatDate(ticket.closed_at, "PPp")}</p>}
                    </div>
                  </div>

                  {/* Override Created At */}
                  <div>
                    <label className="form-label">Override Created Date/Time</label>
                    <input
                      type="datetime-local"
                      value={overrideCreatedAt}
                      onChange={(e) => setOverrideCreatedAt(e.target.value)}
                      className="form-input w-full"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Leave empty to keep original: {formatDate(ticket.created_at, "PPp")}
                    </p>
                  </div>

                  {/* Override Resolved At */}
                  <div>
                    <label className="form-label">Override Resolved Date/Time</label>
                    <input
                      type="datetime-local"
                      value={overrideResolvedAt}
                      onChange={(e) => setOverrideResolvedAt(e.target.value)}
                      className="form-input w-full"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {ticket.resolved_at
                        ? `Leave empty to keep original: ${formatDate(ticket.resolved_at, "PPp")}`
                        : "Ticket has not been resolved yet"}
                    </p>
                  </div>

                  {/* Override Closed At */}
                  <div>
                    <label className="form-label">Override Closed Date/Time</label>
                    <input
                      type="datetime-local"
                      value={overrideClosedAt}
                      onChange={(e) => setOverrideClosedAt(e.target.value)}
                      className="form-input w-full"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {ticket.closed_at
                        ? `Leave empty to keep original: ${formatDate(ticket.closed_at, "PPp")}`
                        : "Ticket has not been closed yet"}
                    </p>
                  </div>

                  {/* Override Reason */}
                  <div>
                    <label className="form-label">
                      Reason for Override <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      placeholder="Enter a detailed reason for this date override (min 10 characters)..."
                      rows={3}
                      className="form-input w-full"
                    />
                    <p className={`text-xs mt-1 ${overrideReason.length >= 10 ? 'text-green-600' : 'text-gray-500'}`}>
                      {overrideReason.length}/10 characters minimum
                    </p>
                  </div>

                  {/* Validation Message */}
                  {!hasAnyOverride && (
                    <p className="text-sm text-amber-600">
                      Please set at least one date override.
                    </p>
                  )}

                  <div className="flex gap-3 justify-end pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowDateOverrideModal(false);
                        resetOverrideForm();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleDateOverride}
                      disabled={!isOverrideValid || overrideDatesMutation.isPending}
                      isLoading={overrideDatesMutation.isPending}
                    >
                      Apply Override
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
