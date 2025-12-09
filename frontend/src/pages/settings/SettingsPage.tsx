import { useNavigate } from 'react-router-dom';
import { Card, CardBody } from '@/components/common/Card';
import {
  BellIcon,
  ClockIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  TagIcon,
  BuildingOfficeIcon,
  CloudArrowDownIcon,
} from '@heroicons/react/24/outline';

interface SettingSection {
  title: string;
  description: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  path: string;
  color: string;
}

const settingSections: SettingSection[] = [
  {
    title: 'SLA Policies',
    description: 'Configure service level agreement policies for tickets',
    icon: ClockIcon,
    path: '/settings/sla-policies',
    color: 'text-blue-600 bg-blue-100',
  },
  {
    title: 'Notification Preferences',
    description: 'Manage your notification settings and preferences',
    icon: BellIcon,
    path: '/settings/notifications',
    color: 'text-purple-600 bg-purple-100',
  },
  {
    title: 'Categories',
    description: 'Manage ticket categories and subcategories',
    icon: TagIcon,
    path: '/settings/categories',
    color: 'text-green-600 bg-green-100',
  },
  {
    title: 'Groups',
    description: 'Configure support groups and teams',
    icon: UserGroupIcon,
    path: '/settings/groups',
    color: 'text-orange-600 bg-orange-100',
  },
  {
    title: 'Asset Types',
    description: 'Manage asset types and custom fields',
    icon: BuildingOfficeIcon,
    path: '/assets/types',
    color: 'text-indigo-600 bg-indigo-100',
  },
  {
    title: 'System Settings',
    description: 'General system configuration and preferences',
    icon: Cog6ToothIcon,
    path: '/settings/system',
    color: 'text-gray-600 bg-gray-100',
  },
  {
    title: 'Integrations',
    description: 'Import data from JIRA, Trello, and Asana',
    icon: CloudArrowDownIcon,
    path: '/settings/integrations',
    color: 'text-cyan-600 bg-cyan-100',
  },
];

export default function SettingsPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your ITSM platform configuration and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {settingSections.map((section) => {
          const Icon = section.icon;
          return (
            <Card
              key={section.path}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate(section.path)}
            >
              <CardBody>
                <div className="flex items-start">
                  <div className={`p-3 rounded-lg ${section.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {section.title}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {section.description}
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardBody>
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <Cog6ToothIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                About Settings
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  Use these settings to customize your ITSM platform. Changes
                  made here will affect how tickets, SLAs, and other features
                  behave across the system.
                </p>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
