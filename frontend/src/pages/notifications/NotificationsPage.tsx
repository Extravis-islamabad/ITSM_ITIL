import { useState } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { Bell, Check, CheckCheck, Trash2, Settings } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { getNotificationEmoji } from '@/constants/emojis';

export default function NotificationsPage() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const navigate = useNavigate();

  const filteredNotifications = filter === 'unread'
    ? notifications.filter(n => !n.is_read)
    : notifications;

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'CHANGE_APPROVED':
      case 'SERVICE_REQUEST_APPROVED':
      case 'SERVICE_REQUEST_COMPLETED':
        return 'from-green-100 to-emerald-100';
      case 'CHANGE_REJECTED':
      case 'SERVICE_REQUEST_REJECTED':
      case 'SLA_BREACHED':
        return 'from-red-100 to-rose-100';
      case 'CHANGE_APPROVAL_NEEDED':
      case 'SLA_BREACH_WARNING':
        return 'from-yellow-100 to-amber-100';
      default:
        return 'from-primary-100 to-accent-100';
    }
  };

  const handleNotificationClick = async (notification: any) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-primary-500 to-accent-600 rounded-xl shadow-lg">
            <Bell className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            <p className="text-sm text-gray-600">
              {unreadCount > 0 ? (
                <span className="text-primary-600 font-semibold">
                  {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                </span>
              ) : (
                'All caught up! 🎉'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
            >
              <CheckCheck className="h-4 w-4" />
              <span className="text-sm font-medium">Mark all as read</span>
            </button>
          )}
          <button
            onClick={() => navigate('/settings/notifications')}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Settings className="h-4 w-4" />
            <span className="text-sm font-medium">Preferences</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="flex gap-2 p-2">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 px-4 py-2.5 font-medium text-sm rounded-lg transition-all ${
              filter === 'all'
                ? 'bg-gradient-to-r from-primary-600 to-accent-600 text-white shadow-lg shadow-primary-500/30'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`flex-1 px-4 py-2.5 font-medium text-sm rounded-lg transition-all ${
              filter === 'unread'
                ? 'bg-gradient-to-r from-primary-600 to-accent-600 text-white shadow-lg shadow-primary-500/30'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="flex flex-col items-center justify-center py-20 px-4">
              <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-4">
                <Bell className="h-10 w-10 text-gray-400" />
              </div>
              <p className="text-gray-900 text-center text-lg font-semibold mb-2">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              </p>
              <p className="text-sm text-gray-500 text-center max-w-md">
                {filter === 'unread' 
                  ? 'Great job! You\'ve read all your notifications.'
                  : 'When you receive notifications about tickets, changes, and requests, they\'ll appear here.'
                }
              </p>
            </div>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`bg-white rounded-lg shadow-sm border transition-all cursor-pointer hover:shadow-md ${
                !notification.is_read 
                  ? 'border-primary-200 ring-2 ring-primary-100' 
                  : 'border-gray-200'
              }`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="p-5">
                <div className="flex gap-4">
                  {/* Icon */}
                  <div className="flex-shrink-0">
                    <div className={`w-12 h-12 bg-gradient-to-br ${getNotificationColor(notification.type)} rounded-xl flex items-center justify-center shadow-sm`}>
                      <span className="text-2xl">{getNotificationEmoji(notification.type)}</span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className={`font-semibold text-base ${!notification.is_read ? 'text-gray-900' : 'text-gray-700'}`}>
                            {notification.title}
                          </h3>
                          {!notification.is_read && (
                            <div className="w-2.5 h-2.5 bg-primary-600 rounded-full animate-pulse"></div>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          {notification.message}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!notification.is_read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                            className="p-2 text-primary-600 hover:bg-primary-100 rounded-lg transition-colors"
                            title="Mark as read"
                          >
                            <Check className="h-5 w-5" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center gap-4 mt-3">
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <span className="font-medium">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </span>
                      </p>
                      {notification.entity_type && (
                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full font-medium">
                          {notification.entity_type}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Empty state helper */}
      {filteredNotifications.length === 0 && filter === 'all' && (
        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            💡 Tip: You'll receive notifications when tickets are assigned to you, when changes need approval, and more.
          </p>
        </div>
      )}
    </div>
  );
}