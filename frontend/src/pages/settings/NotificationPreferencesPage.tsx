import { useState, useEffect } from 'react';
import { Bell, Mail, Smartphone, Save, AlertCircle } from 'lucide-react';
import axiosInstance from '@/lib/axios';
import toast from 'react-hot-toast';

interface Preferences {
  email_ticket_assigned: boolean;
  email_ticket_status_changed: boolean;
  email_ticket_comment: boolean;
  email_change_approval_needed: boolean;
  email_change_status_changed: boolean;
  email_service_request_updates: boolean;
  email_sla_warnings: boolean;
  inapp_ticket_assigned: boolean;
  inapp_ticket_status_changed: boolean;
  inapp_ticket_comment: boolean;
  inapp_change_approval_needed: boolean;
  inapp_change_status_changed: boolean;
  inapp_service_request_updates: boolean;
  inapp_sla_warnings: boolean;
  enable_daily_digest: boolean;
  daily_digest_time: string;
}

export default function NotificationPreferencesPage() {
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const response = await axiosInstance.get('/notifications/preferences');
      setPreferences(response.data);
    } catch {
      toast.error('Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!preferences) return;

    try {
      setSaving(true);
      await axiosInstance.put('/notifications/preferences', preferences);
      toast.success('Notification preferences saved successfully!');
    } catch {
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (key: keyof Preferences, value: boolean | string) => {
    if (preferences) {
      setPreferences({ ...preferences, [key]: value });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Failed to load preferences</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-primary-500 to-accent-600 rounded-xl shadow-lg">
            <Bell className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notification Preferences</h1>
            <p className="text-sm text-gray-600">Manage how you receive notifications</p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>

      {/* Info Alert */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
        <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm text-blue-900 font-medium">About Notifications</p>
          <p className="text-sm text-blue-700 mt-1">
            Choose how you want to be notified about important events. You can enable both email and in-app notifications for each event type.
          </p>
        </div>
      </div>

      {/* Email Notifications */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-accent-50">
          <div className="flex items-center gap-3">
            <Mail className="h-6 w-6 text-primary-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Email Notifications</h2>
              <p className="text-sm text-gray-600">Receive notifications via email</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <PreferenceToggle
            label="Ticket Assigned"
            description="When a ticket is assigned to you"
            checked={preferences.email_ticket_assigned}
            onChange={(checked) => updatePreference('email_ticket_assigned', checked)}
          />
          <PreferenceToggle
            label="Ticket Status Changed"
            description="When a ticket's status is updated"
            checked={preferences.email_ticket_status_changed}
            onChange={(checked) => updatePreference('email_ticket_status_changed', checked)}
          />
          <PreferenceToggle
            label="New Comments"
            description="When someone comments on your tickets"
            checked={preferences.email_ticket_comment}
            onChange={(checked) => updatePreference('email_ticket_comment', checked)}
          />
          <PreferenceToggle
            label="Change Approval Needed"
            description="When a change requires your approval"
            checked={preferences.email_change_approval_needed}
            onChange={(checked) => updatePreference('email_change_approval_needed', checked)}
          />
          <PreferenceToggle
            label="Change Status Updates"
            description="When a change status is updated"
            checked={preferences.email_change_status_changed}
            onChange={(checked) => updatePreference('email_change_status_changed', checked)}
          />
          <PreferenceToggle
            label="Service Request Updates"
            description="When your service requests are updated"
            checked={preferences.email_service_request_updates}
            onChange={(checked) => updatePreference('email_service_request_updates', checked)}
          />
          <PreferenceToggle
            label="SLA Warnings"
            description="When SLA deadlines are approaching or breached"
            checked={preferences.email_sla_warnings}
            onChange={(checked) => updatePreference('email_sla_warnings', checked)}
          />
        </div>
      </div>

      {/* In-App Notifications */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-accent-50">
          <div className="flex items-center gap-3">
            <Smartphone className="h-6 w-6 text-primary-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">In-App Notifications</h2>
              <p className="text-sm text-gray-600">Receive notifications in the app</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <PreferenceToggle
            label="Ticket Assigned"
            description="When a ticket is assigned to you"
            checked={preferences.inapp_ticket_assigned}
            onChange={(checked) => updatePreference('inapp_ticket_assigned', checked)}
          />
          <PreferenceToggle
            label="Ticket Status Changed"
            description="When a ticket's status is updated"
            checked={preferences.inapp_ticket_status_changed}
            onChange={(checked) => updatePreference('inapp_ticket_status_changed', checked)}
          />
          <PreferenceToggle
            label="New Comments"
            description="When someone comments on your tickets"
            checked={preferences.inapp_ticket_comment}
            onChange={(checked) => updatePreference('inapp_ticket_comment', checked)}
          />
          <PreferenceToggle
            label="Change Approval Needed"
            description="When a change requires your approval"
            checked={preferences.inapp_change_approval_needed}
            onChange={(checked) => updatePreference('inapp_change_approval_needed', checked)}
          />
          <PreferenceToggle
            label="Change Status Updates"
            description="When a change status is updated"
            checked={preferences.inapp_change_status_changed}
            onChange={(checked) => updatePreference('inapp_change_status_changed', checked)}
          />
          <PreferenceToggle
            label="Service Request Updates"
            description="When your service requests are updated"
            checked={preferences.inapp_service_request_updates}
            onChange={(checked) => updatePreference('inapp_service_request_updates', checked)}
          />
          <PreferenceToggle
            label="SLA Warnings"
            description="When SLA deadlines are approaching or breached"
            checked={preferences.inapp_sla_warnings}
            onChange={(checked) => updatePreference('inapp_sla_warnings', checked)}
          />
        </div>
      </div>

      {/* Daily Digest */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-accent-50">
          <h2 className="text-lg font-semibold text-gray-900">Daily Digest</h2>
          <p className="text-sm text-gray-600">Receive a summary of notifications once per day</p>
        </div>

        <div className="p-6 space-y-4">
          <PreferenceToggle
            label="Enable Daily Digest"
            description="Receive a daily summary email of all notifications"
            checked={preferences.enable_daily_digest}
            onChange={(checked) => updatePreference('enable_daily_digest', checked)}
          />
          
          {preferences.enable_daily_digest && (
            <div className="ml-10 mt-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Send digest at
              </label>
              <input
                type="time"
                value={preferences.daily_digest_time}
                onChange={(e) => updatePreference('daily_digest_time', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PreferenceToggle({ 
  label, 
  description, 
  checked, 
  onChange 
}: { 
  label: string; 
  description: string; 
  checked: boolean; 
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
          checked ? 'bg-primary-600' : 'bg-gray-200'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}