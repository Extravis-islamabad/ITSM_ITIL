import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardBody } from '@/components/common/Card';
import Button from '@/components/common/Button';
import {
  Cog6ToothIcon,
  BuildingOfficeIcon,
  ClockIcon,
  EnvelopeIcon,
  ShieldCheckIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import axiosInstance from '@/lib/axios';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/utils/helpers';

interface SettingsSection {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  fields: SettingField[];
}

interface SettingField {
  id: string;
  label: string;
  type: 'text' | 'email' | 'number' | 'select' | 'toggle' | 'textarea';
  value: string | number | boolean;
  options?: { value: string; label: string }[];
  description?: string;
}

interface SettingsState {
  // Company Info
  company_name: string;
  company_email: string;
  company_phone: string;
  company_address: string;

  // Ticket Settings
  auto_assign_tickets: boolean;
  default_ticket_priority: string;
  ticket_prefix: string;
  require_category: boolean;

  // SLA Settings
  business_hours_start: string;
  business_hours_end: string;
  working_days: string;
  timezone: string;

  // Email Settings
  smtp_enabled: boolean;
  email_notifications: boolean;
  digest_frequency: string;

  // Security
  session_timeout: number;
  password_min_length: number;
  require_2fa: boolean;
  max_login_attempts: number;
}

const defaultSettings: SettingsState = {
  company_name: 'SupportX Inc.',
  company_email: 'support@supportx.com',
  company_phone: '+1 (555) 123-4567',
  company_address: '123 Tech Street, Silicon Valley, CA 94000',
  auto_assign_tickets: true,
  default_ticket_priority: 'MEDIUM',
  ticket_prefix: 'TKT',
  require_category: true,
  business_hours_start: '09:00',
  business_hours_end: '18:00',
  working_days: 'Mon,Tue,Wed,Thu,Fri',
  timezone: 'America/New_York',
  smtp_enabled: false,
  email_notifications: true,
  digest_frequency: 'daily',
  session_timeout: 30,
  password_min_length: 8,
  require_2fa: false,
  max_login_attempts: 5
};

export default function SystemSettingsPage() {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch settings from API
  const { data: apiSettings, isLoading } = useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const res = await axiosInstance.get('/settings/flat');
      return res.data;
    }
  });

  // Update local state when API data loads
  useEffect(() => {
    if (apiSettings) {
      setSettings({
        company_name: apiSettings.company_name || defaultSettings.company_name,
        company_email: apiSettings.company_email || defaultSettings.company_email,
        company_phone: apiSettings.company_phone || defaultSettings.company_phone,
        company_address: apiSettings.company_address || defaultSettings.company_address,
        auto_assign_tickets: apiSettings.auto_assign_tickets ?? defaultSettings.auto_assign_tickets,
        default_ticket_priority: apiSettings.default_ticket_priority || defaultSettings.default_ticket_priority,
        ticket_prefix: apiSettings.ticket_prefix || defaultSettings.ticket_prefix,
        require_category: apiSettings.require_category ?? defaultSettings.require_category,
        business_hours_start: apiSettings.business_hours_start || defaultSettings.business_hours_start,
        business_hours_end: apiSettings.business_hours_end || defaultSettings.business_hours_end,
        working_days: apiSettings.working_days || defaultSettings.working_days,
        timezone: apiSettings.timezone || defaultSettings.timezone,
        smtp_enabled: apiSettings.smtp_enabled ?? defaultSettings.smtp_enabled,
        email_notifications: apiSettings.email_notifications ?? defaultSettings.email_notifications,
        digest_frequency: apiSettings.digest_frequency || defaultSettings.digest_frequency,
        session_timeout: apiSettings.session_timeout || defaultSettings.session_timeout,
        password_min_length: apiSettings.password_min_length || defaultSettings.password_min_length,
        require_2fa: apiSettings.require_2fa ?? defaultSettings.require_2fa,
        max_login_attempts: apiSettings.max_login_attempts || defaultSettings.max_login_attempts
      });
      setHasChanges(false);
    }
  }, [apiSettings]);

  // Save settings mutation
  const saveMutation = useMutation({
    mutationFn: async (data: SettingsState) => {
      await axiosInstance.put('/settings', { settings: data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      toast.success('Settings saved successfully');
      setHasChanges(false);
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, 'Failed to save settings'));
    }
  });

  const handleChange = (field: string, value: string | number | boolean) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    saveMutation.mutate(settings);
  };

  const sections: SettingsSection[] = [
    {
      id: 'company',
      title: 'Company Information',
      description: 'Basic company details displayed throughout the system',
      icon: BuildingOfficeIcon,
      fields: [
        { id: 'company_name', label: 'Company Name', type: 'text', value: settings.company_name },
        { id: 'company_email', label: 'Support Email', type: 'email', value: settings.company_email },
        { id: 'company_phone', label: 'Phone Number', type: 'text', value: settings.company_phone },
        { id: 'company_address', label: 'Address', type: 'textarea', value: settings.company_address },
      ]
    },
    {
      id: 'tickets',
      title: 'Ticket Settings',
      description: 'Configure default ticket behavior',
      icon: DocumentTextIcon,
      fields: [
        { id: 'ticket_prefix', label: 'Ticket Number Prefix', type: 'text', value: settings.ticket_prefix, description: 'Prefix for ticket numbers (e.g., TKT-001)' },
        { id: 'default_ticket_priority', label: 'Default Priority', type: 'select', value: settings.default_ticket_priority, options: [
          { value: 'LOW', label: 'Low' },
          { value: 'MEDIUM', label: 'Medium' },
          { value: 'HIGH', label: 'High' },
          { value: 'CRITICAL', label: 'Critical' },
        ]},
        { id: 'auto_assign_tickets', label: 'Auto-assign Tickets', type: 'toggle', value: settings.auto_assign_tickets, description: 'Automatically assign tickets based on category/workload' },
        { id: 'require_category', label: 'Require Category', type: 'toggle', value: settings.require_category, description: 'Make category selection mandatory for new tickets' },
      ]
    },
    {
      id: 'business_hours',
      title: 'Business Hours',
      description: 'Define working hours for SLA calculations',
      icon: ClockIcon,
      fields: [
        { id: 'business_hours_start', label: 'Start Time', type: 'text', value: settings.business_hours_start },
        { id: 'business_hours_end', label: 'End Time', type: 'text', value: settings.business_hours_end },
        { id: 'working_days', label: 'Working Days', type: 'text', value: settings.working_days },
        { id: 'timezone', label: 'Timezone', type: 'select', value: settings.timezone, options: [
          { value: 'America/New_York', label: 'Eastern Time (ET)' },
          { value: 'America/Chicago', label: 'Central Time (CT)' },
          { value: 'America/Denver', label: 'Mountain Time (MT)' },
          { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
          { value: 'UTC', label: 'UTC' },
          { value: 'Europe/London', label: 'London (GMT)' },
          { value: 'Asia/Karachi', label: 'Pakistan (PKT)' },
        ]},
      ]
    },
    {
      id: 'email',
      title: 'Email Notifications',
      description: 'Configure email settings and notifications',
      icon: EnvelopeIcon,
      fields: [
        { id: 'smtp_enabled', label: 'Enable SMTP', type: 'toggle', value: settings.smtp_enabled, description: 'Enable email sending functionality' },
        { id: 'email_notifications', label: 'Email Notifications', type: 'toggle', value: settings.email_notifications, description: 'Send email notifications for ticket updates' },
        { id: 'digest_frequency', label: 'Digest Frequency', type: 'select', value: settings.digest_frequency, options: [
          { value: 'realtime', label: 'Real-time' },
          { value: 'hourly', label: 'Hourly' },
          { value: 'daily', label: 'Daily' },
          { value: 'weekly', label: 'Weekly' },
        ]},
      ]
    },
    {
      id: 'security',
      title: 'Security Settings',
      description: 'Configure security and authentication options',
      icon: ShieldCheckIcon,
      fields: [
        { id: 'session_timeout', label: 'Session Timeout (minutes)', type: 'number', value: settings.session_timeout },
        { id: 'password_min_length', label: 'Minimum Password Length', type: 'number', value: settings.password_min_length },
        { id: 'max_login_attempts', label: 'Max Login Attempts', type: 'number', value: settings.max_login_attempts, description: 'Lock account after this many failed attempts' },
        { id: 'require_2fa', label: 'Require 2FA', type: 'toggle', value: settings.require_2fa, description: 'Require two-factor authentication for all users' },
      ]
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
          <p className="mt-1 text-sm text-gray-500">
            General system configuration and preferences
          </p>
        </div>
        <Button onClick={handleSave} isLoading={saveMutation.isPending} disabled={!hasChanges}>
          <Cog6ToothIcon className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>

      <div className="space-y-6">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.id}>
              <CardBody>
                <div className="flex items-start gap-4 mb-6">
                  <div className="p-2 bg-primary-100 rounded-lg">
                    <Icon className="h-6 w-6 text-primary-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{section.title}</h2>
                    <p className="text-sm text-gray-500">{section.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {section.fields.map((field) => (
                    <div key={field.id} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {field.label}
                      </label>

                      {field.type === 'text' || field.type === 'email' || field.type === 'number' ? (
                        <input
                          type={field.type}
                          value={field.value as string | number}
                          onChange={(e) => handleChange(field.id, field.type === 'number' ? parseInt(e.target.value) : e.target.value)}
                          className="form-input"
                        />
                      ) : field.type === 'textarea' ? (
                        <textarea
                          value={field.value as string}
                          onChange={(e) => handleChange(field.id, e.target.value)}
                          className="form-input"
                          rows={2}
                        />
                      ) : field.type === 'select' ? (
                        <select
                          value={field.value as string}
                          onChange={(e) => handleChange(field.id, e.target.value)}
                          className="form-select"
                        >
                          {field.options?.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      ) : field.type === 'toggle' ? (
                        <div className="flex items-center">
                          <button
                            type="button"
                            onClick={() => handleChange(field.id, !field.value)}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                              field.value ? 'bg-primary-600' : 'bg-gray-200'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                field.value ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                          <span className="ml-3 text-sm text-gray-600">
                            {field.value ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                      ) : null}

                      {field.description && (
                        <p className="mt-1 text-xs text-gray-500">{field.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} isLoading={saveMutation.isPending} disabled={!hasChanges}>
          Save All Changes
        </Button>
      </div>
    </div>
  );
}
