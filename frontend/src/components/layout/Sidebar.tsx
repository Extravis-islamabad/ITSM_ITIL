import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { NavLink } from 'react-router-dom';
import {
  XMarkIcon,
  HomeIcon,
  TicketIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  ServerIcon,
  BookOpenIcon,
  UsersIcon,
  ShieldCheckIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/hooks/useAuth';
import {
  getUserRole,
  isAdmin,
  isManagerOrHigher,
  isTeamLeadOrHigher,
  isAgentOrHigher
} from '@/utils/roleHelpers';
import { RefreshCw } from 'lucide-react';

interface SidebarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

// Helper to get the full avatar URL
const getAvatarUrl = (avatarUrl?: string) => {
  if (!avatarUrl) return null;
  if (avatarUrl.startsWith('/')) {
    const baseUrl = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:8000';
    return `${baseUrl}${avatarUrl}`;
  }
  return avatarUrl;
};

export default function Sidebar({ open, setOpen }: SidebarProps) {
  const { user } = useAuth();
  const [expandedItems, setExpandedItems] = useState<string[]>(['Change Management', 'Assets (CMDB)', 'Settings', 'Knowledge Base', 'Reports']);

  // Get user's role for access control
  const userRole = getUserRole(user);
  const avatarUrl = getAvatarUrl(user?.avatar_url);

  const toggleExpanded = (itemName: string) => {
    setExpandedItems(prev =>
      prev.includes(itemName)
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    );
  };

  // Main navigation - role-based access
  const navigation = [
    {
      name: 'Dashboard',
      href: '/',
      icon: HomeIcon,
      show: true, // Everyone can see dashboard
    },
    {
      name: 'Incidents',
      href: '/incidents',
      icon: TicketIcon,
      // All authenticated users can see incidents (end users see their own)
      show: !!userRole,
    },
    {
      name: 'Service Requests',
      href: '/service-requests',
      icon: ClipboardDocumentListIcon,
      // All authenticated users can see service requests
      show: !!userRole,
    },
    {
      name: 'Messages',
      href: '/chat',
      icon: ChatBubbleLeftRightIcon,
      // All authenticated users can use chat
      show: !!userRole,
    },
    {
      name: 'Change Management',
      icon: RefreshCw,
      href: '/changes',
      // All authenticated users can see changes (end users can create/view their own)
      show: !!userRole,
      subItems: [
        { name: 'All Changes', href: '/changes', show: true },
        { name: 'Calendar View', href: '/changes/calendar', show: true },
        { name: 'Create Change', href: '/changes/new', show: true },
      ],
    },
    {
      name: 'Problems',
      href: '/problems',
      icon: ExclamationTriangleIcon,
      // Only team leads and above can see problems
      show: isTeamLeadOrHigher(user),
    },
    {
      name: 'Assets (CMDB)',
      icon: ServerIcon,
      href: '/assets',
      // Only agents and above can see assets
      show: isAgentOrHigher(user),
      subItems: [
        { name: 'All Assets', href: '/assets', show: true },
        { name: 'Asset Types', href: '/assets/types', show: isManagerOrHigher(user) },
        { name: 'Add Asset', href: '/assets/new', show: isAgentOrHigher(user) },
      ],
    },
    {
      name: 'Knowledge Base',
      icon: BookOpenIcon,
      href: '/knowledge/articles',
      // Everyone can see knowledge base
      show: !!userRole,
      subItems: [
        { name: 'Articles', href: '/knowledge/articles', show: true },
        { name: 'Categories', href: '/knowledge/categories', show: isAgentOrHigher(user) },
        { name: 'Public Portal', href: '/kb', show: true },
      ],
    },
    {
      name: 'Reports',
      icon: ChartBarIcon,
      href: '/reports',
      // Only team leads and above can see reports
      show: isTeamLeadOrHigher(user),
      subItems: [
        { name: 'Overview', href: '/reports', show: true },
        { name: 'SLA Dashboard', href: '/reports/sla-dashboard', show: true },
        { name: 'SLA Tracking', href: '/reports/sla-tracking', show: true },
        { name: 'Ticket Aging', href: '/reports/ticket-aging', show: true },
        { name: 'Team Performance', href: '/reports/performance', show: isManagerOrHigher(user) },
        { name: 'Scheduled Reports', href: '/reports/scheduled', show: isManagerOrHigher(user) },
      ],
    },
  ];

  // Administration section - higher roles only
  const adminNavigation = [
    {
      name: 'Users',
      href: '/users',
      icon: UsersIcon,
      // Managers and above can manage users
      show: isManagerOrHigher(user),
    },
    {
      name: 'Roles',
      href: '/roles',
      icon: ShieldCheckIcon,
      // Only admins can manage roles
      show: isAdmin(user),
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: Cog6ToothIcon,
      // Managers and above can see settings
      show: isManagerOrHigher(user),
      subItems: [
        { name: 'Overview', href: '/settings', show: true },
        { name: 'SLA Policies', href: '/settings/sla-policies', show: isManagerOrHigher(user) },
        { name: 'Categories', href: '/settings/categories', show: isManagerOrHigher(user) },
        { name: 'Groups', href: '/settings/groups', show: isManagerOrHigher(user) },
        { name: 'Notifications', href: '/settings/notifications', show: true },
        { name: 'System', href: '/settings/system', show: isAdmin(user) },
        { name: 'Integrations', href: '/settings/integrations', show: isAdmin(user) },
      ],
    },
  ];

  // Filter sub-items based on show property
  const filterSubItems = (items: { name: string; href: string; show: boolean }[]) => {
    return items.filter(item => item.show);
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-gradient-to-b from-white to-primary-50/30">
      {/* Logo */}
      <div className="flex h-20 items-center px-6 border-b border-primary-100 bg-white">
        <img
          src="/SupportX-black@4x-8.png"
          alt="SupportX"
          className="h-10 w-auto"
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-6">
        <div className="space-y-1">
          {navigation.filter(item => item.show).map((item) => (
            <div key={item.name}>
              {item.subItems ? (
                // Parent item with children
                <div>
                  <button
                    onClick={() => toggleExpanded(item.name)}
                    className="group flex items-center w-full px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 text-gray-700 hover:bg-primary-50 hover:text-primary-700"
                  >
                    <item.icon className="mr-3 h-5 w-5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                    <span className="flex-1 text-left">{item.name}</span>
                    {expandedItems.includes(item.name) ? (
                      <ChevronDownIcon className="h-4 w-4" />
                    ) : (
                      <ChevronRightIcon className="h-4 w-4" />
                    )}
                  </button>

                  {/* Sub-items */}
                  {expandedItems.includes(item.name) && (
                    <div className="ml-4 mt-1 space-y-1">
                      {filterSubItems(item.subItems).map((subItem) => (
                        <NavLink
                          key={subItem.name}
                          to={subItem.href}
                          onClick={() => setOpen(false)}
                          className={({ isActive }) =>
                            `group flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                              isActive
                                ? 'bg-gradient-to-r from-primary-600 to-accent-600 text-white shadow-lg shadow-primary-500/30'
                                : 'text-gray-600 hover:bg-primary-50 hover:text-primary-700'
                            }`
                          }
                        >
                          <span className="mr-3 h-1.5 w-1.5 rounded-full bg-current"></span>
                          {subItem.name}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                // Regular item
                <NavLink
                  to={item.href}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-primary-600 to-accent-600 text-white shadow-lg shadow-primary-500/30'
                        : 'text-gray-700 hover:bg-primary-50 hover:text-primary-700'
                    }`
                  }
                >
                  <item.icon className="mr-3 h-5 w-5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                  {item.name}
                </NavLink>
              )}
            </div>
          ))}
        </div>

        {/* Admin Section */}
        {adminNavigation.some(item => item.show) && (
          <>
            <div className="mt-8 mb-3 px-4">
              <h3 className="text-xs font-bold text-primary-700 uppercase tracking-wider flex items-center">
                <span className="h-px flex-1 bg-primary-200 mr-3"></span>
                Administration
                <span className="h-px flex-1 bg-primary-200 ml-3"></span>
              </h3>
            </div>
            <div className="space-y-1">
              {adminNavigation.filter(item => item.show).map((item) => (
                <div key={item.name}>
                  {item.subItems ? (
                    // Parent item with children
                    <div>
                      <button
                        onClick={() => toggleExpanded(item.name)}
                        className="group flex items-center w-full px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 text-gray-700 hover:bg-primary-50 hover:text-primary-700"
                      >
                        <item.icon className="mr-3 h-5 w-5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                        <span className="flex-1 text-left">{item.name}</span>
                        {expandedItems.includes(item.name) ? (
                          <ChevronDownIcon className="h-4 w-4" />
                        ) : (
                          <ChevronRightIcon className="h-4 w-4" />
                        )}
                      </button>

                      {/* Sub-items */}
                      {expandedItems.includes(item.name) && (
                        <div className="ml-4 mt-1 space-y-1">
                          {filterSubItems(item.subItems).map((subItem) => (
                            <NavLink
                              key={subItem.name}
                              to={subItem.href}
                              onClick={() => setOpen(false)}
                              className={({ isActive }) =>
                                `group flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                                  isActive
                                    ? 'bg-gradient-to-r from-primary-600 to-accent-600 text-white shadow-lg shadow-primary-500/30'
                                    : 'text-gray-600 hover:bg-primary-50 hover:text-primary-700'
                                }`
                              }
                            >
                              <span className="mr-3 h-1.5 w-1.5 rounded-full bg-current"></span>
                              {subItem.name}
                            </NavLink>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    // Regular item
                    <NavLink
                      to={item.href}
                      onClick={() => setOpen(false)}
                      className={({ isActive }) =>
                        `group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                          isActive
                            ? 'bg-gradient-to-r from-primary-600 to-accent-600 text-white shadow-lg shadow-primary-500/30'
                            : 'text-gray-700 hover:bg-primary-50 hover:text-primary-700'
                        }`
                      }
                    >
                      <item.icon className="mr-3 h-5 w-5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                      {item.name}
                    </NavLink>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </nav>

      {/* User Info */}
      <div className="border-t border-primary-100 p-4 bg-gradient-to-r from-primary-50 to-accent-50">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white shadow-sm border border-primary-100 hover:shadow-md transition-shadow">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={user?.full_name || 'User'}
              className="w-11 h-11 rounded-xl object-cover shadow-lg"
            />
          ) : (
            <div className="w-11 h-11 bg-gradient-to-br from-primary-600 to-accent-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg">
              {user?.full_name?.substring(0, 2).toUpperCase() || 'U'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{user?.full_name || 'User'}</p>
            <p className="text-xs text-gray-500 truncate">{user?.role || 'User'}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Sidebar */}
      <Transition.Root show={open} as={Fragment}>
        <Dialog as="div" className="relative z-50 lg:hidden" onClose={setOpen}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                <Transition.Child
                  as={Fragment}
                  enter="ease-in-out duration-300"
                  enterFrom="opacity-0"
                  enterTo="opacity-100"
                  leave="ease-in-out duration-300"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                    <button
                      type="button"
                      className="-m-2.5 p-2.5"
                      onClick={() => setOpen(false)}
                    >
                      <span className="sr-only">Close sidebar</span>
                      <XMarkIcon className="h-6 w-6 text-white" />
                    </button>
                  </div>
                </Transition.Child>
                <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white shadow-2xl">
                  <SidebarContent />
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-primary-100 bg-white shadow-xl">
          <SidebarContent />
        </div>
      </div>
    </>
  );
}
