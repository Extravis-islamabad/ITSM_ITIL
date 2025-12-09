import { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { useNavigate } from 'react-router-dom';
import {
  Bars3Icon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/hooks/useAuth';
import NotificationBell from '@/components/notifications/NotificationBell';

interface HeaderProps {
  onMenuClick: () => void;
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

export default function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const avatarUrl = getAvatarUrl(user?.avatar_url);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white/80 backdrop-blur-xl px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      {/* Mobile menu button */}
      <button
        type="button"
        className="-m-2.5 p-2.5 text-gray-700 hover:text-primary-600 lg:hidden transition-colors"
        onClick={onMenuClick}
      >
        <span className="sr-only">Open sidebar</span>
        <Bars3Icon className="h-6 w-6" />
      </button>

      {/* Mobile Logo */}
      <div className="lg:hidden">
        <img 
          src="/SupportX-black@4x-8.png" 
          alt="SupportX" 
          className="h-7 w-auto"
        />
      </div>

      {/* Separator */}
      <div className="h-6 w-px bg-gray-200 lg:hidden" />

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <div className="flex flex-1 items-center">
          {/* Search can go here */}
        </div>

        <div className="flex items-center gap-x-4 lg:gap-x-6">
          {/* Notification Bell */}
          <NotificationBell />

          {/* Separator */}
          <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200" />

          {/* Profile dropdown */}
          <Menu as="div" className="relative">
            <Menu.Button className="-m-1.5 flex items-center p-1.5 hover:bg-primary-50 rounded-xl transition-colors">
              <span className="sr-only">Open user menu</span>
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={user?.full_name || 'User'}
                  className="h-9 w-9 rounded-xl object-cover shadow-lg shadow-primary-500/30"
                />
              ) : (
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-primary-500/30">
                  {user?.full_name?.substring(0, 2).toUpperCase() || 'U'}
                </div>
              )}
              <span className="hidden lg:flex lg:items-center lg:ml-3">
                <span className="text-sm font-semibold leading-6 text-gray-900">
                  {user?.full_name || 'User'}
                </span>
                <svg className="ml-2 h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              </span>
            </Menu.Button>
            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute right-0 z-10 mt-2.5 w-64 origin-top-right rounded-xl bg-white py-2 shadow-xl ring-1 ring-gray-900/5 focus:outline-none border border-gray-100">
                <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-primary-50 to-accent-50 rounded-t-xl">
                  <p className="text-sm font-semibold text-gray-900">{user?.full_name || 'User'}</p>
                  <p className="text-xs text-gray-600 truncate mt-0.5">{user?.email || 'user@example.com'}</p>
                  <div className="mt-2">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-gradient-to-r from-primary-600 to-accent-600 text-white shadow-sm">
                      {user?.role || 'User'}
                    </span>
                  </div>
                </div>
                
                <div className="py-1">
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={() => navigate('/profile')}
                        className={`${
                          active ? 'bg-primary-50 text-primary-700' : 'text-gray-700'
                        } flex w-full items-center px-4 py-2.5 text-sm transition-colors`}
                      >
                        <UserCircleIcon className="mr-3 h-5 w-5 text-gray-400" />
                        Your Profile
                      </button>
                    )}
                  </Menu.Item>
                  
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={() => navigate('/settings')}
                        className={`${
                          active ? 'bg-primary-50 text-primary-700' : 'text-gray-700'
                        } flex w-full items-center px-4 py-2.5 text-sm transition-colors`}
                      >
                        <Cog6ToothIcon className="mr-3 h-5 w-5 text-gray-400" />
                        Settings
                      </button>
                    )}
                  </Menu.Item>
                </div>

                <div className="border-t border-gray-100 my-1" />
                
                <div className="py-1">
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={handleLogout}
                        className={`${
                          active ? 'bg-red-50 text-red-700' : 'text-red-600'
                        } flex w-full items-center px-4 py-2.5 text-sm font-medium transition-colors`}
                      >
                        <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5" />
                        Sign out
                      </button>
                    )}
                  </Menu.Item>
                </div>
              </Menu.Items>
            </Transition>
          </Menu>
        </div>
      </div>
    </div>
  );
}