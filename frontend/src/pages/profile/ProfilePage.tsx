import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { authService } from '@/services/authService';
import { Card, CardHeader, CardBody } from '@/components/common/Card';
import Input from '@/components/common/Input';
import Button from '@/components/common/Button';
import Badge from '@/components/common/Badge';
import { formatDate } from '@/utils/helpers';
import toast from 'react-hot-toast';
import {
  UserCircleIcon,
  EnvelopeIcon,
  PhoneIcon,
  BuildingOfficeIcon,
  ShieldCheckIcon,
  ClockIcon,
  CameraIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

const passwordSchema = z.object({
  old_password: z.string().min(1, 'Current password is required'),
  new_password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm_password: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
});

type PasswordFormData = z.infer<typeof passwordSchema>;

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  const passwordMutation = useMutation({
    mutationFn: (data: PasswordFormData) =>
      authService.changePassword(data.old_password, data.new_password),
    onSuccess: () => {
      toast.success('Password changed successfully');
      reset();
      setIsChangingPassword(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to change password');
    },
  });

  const avatarUploadMutation = useMutation({
    mutationFn: (file: File) => authService.uploadAvatar(file),
    onSuccess: () => {
      toast.success('Profile picture updated successfully');
      refreshUser?.();
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to upload profile picture');
    },
  });

  const avatarDeleteMutation = useMutation({
    mutationFn: () => authService.deleteAvatar(),
    onSuccess: () => {
      toast.success('Profile picture removed');
      refreshUser?.();
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to remove profile picture');
    },
  });

  const onSubmitPassword = (data: PasswordFormData) => {
    passwordMutation.mutate(data);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a valid image file (JPG, PNG, GIF, or WebP)');
      return;
    }

    avatarUploadMutation.mutate(file);

    // Reset input so the same file can be selected again
    e.target.value = '';
  };

  const handleDeleteAvatar = () => {
    if (window.confirm('Are you sure you want to remove your profile picture?')) {
      avatarDeleteMutation.mutate();
    }
  };

  // Get the full avatar URL
  const getAvatarUrl = () => {
    if (!user?.avatar_url) return null;
    // If it's a relative URL, prepend the API base URL
    if (user.avatar_url.startsWith('/')) {
      const baseUrl = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:8000';
      return `${baseUrl}${user.avatar_url}`;
    }
    return user.avatar_url;
  };

  if (!user) {
    return null;
  }

  const avatarUrl = getAvatarUrl();

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your personal information and account settings
        </p>
      </div>

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
        </CardHeader>
        <CardBody>
          <div className="flex items-start gap-6">
            {/* Avatar with upload functionality */}
            <div className="flex-shrink-0">
              <div className="relative group">
                {/* Hidden file input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                />

                {/* Avatar display */}
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={user.full_name}
                    className="h-24 w-24 rounded-full object-cover border-4 border-white shadow-lg"
                  />
                ) : (
                  <div className="h-24 w-24 rounded-full bg-gradient-to-br from-accent-600 to-secondary-600 flex items-center justify-center text-white text-3xl font-bold border-4 border-white shadow-lg">
                    {user.full_name.substring(0, 2).toUpperCase()}
                  </div>
                )}

                {/* Hover overlay with camera icon */}
                <button
                  onClick={handleAvatarClick}
                  disabled={avatarUploadMutation.isPending}
                  className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  {avatarUploadMutation.isPending ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent" />
                  ) : (
                    <CameraIcon className="h-8 w-8 text-white" />
                  )}
                </button>

                {/* Delete button - only shown if avatar exists */}
                {avatarUrl && !avatarUploadMutation.isPending && (
                  <button
                    onClick={handleDeleteAvatar}
                    disabled={avatarDeleteMutation.isPending}
                    className="absolute -bottom-1 -right-1 p-1.5 bg-red-500 hover:bg-red-600 rounded-full text-white shadow-lg transition-colors"
                    title="Remove profile picture"
                  >
                    {avatarDeleteMutation.isPending ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    ) : (
                      <TrashIcon className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>

              {/* Upload hint text */}
              <p className="mt-2 text-xs text-gray-500 text-center">
                Click to {avatarUrl ? 'change' : 'upload'}
              </p>
            </div>
            <div className="flex-1 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <div className="flex items-center text-sm text-gray-500 mb-1">
                  <UserCircleIcon className="h-4 w-4 mr-2" />
                  Full Name
                </div>
                <p className="text-base font-medium text-gray-900">{user.full_name}</p>
              </div>

              <div>
                <div className="flex items-center text-sm text-gray-500 mb-1">
                  <EnvelopeIcon className="h-4 w-4 mr-2" />
                  Email
                </div>
                <p className="text-base font-medium text-gray-900">{user.email}</p>
              </div>

              <div>
                <div className="flex items-center text-sm text-gray-500 mb-1">
                  Username
                </div>
                <p className="text-base font-medium text-gray-900">{user.username}</p>
              </div>

              {user.phone && (
                <div>
                  <div className="flex items-center text-sm text-gray-500 mb-1">
                    <PhoneIcon className="h-4 w-4 mr-2" />
                    Phone
                  </div>
                  <p className="text-base font-medium text-gray-900">{user.phone}</p>
                </div>
              )}

              {user.employee_id && (
                <div>
                  <div className="flex items-center text-sm text-gray-500 mb-1">
                    Employee ID
                  </div>
                  <p className="text-base font-medium text-gray-900">{user.employee_id}</p>
                </div>
              )}

              <div>
                <div className="flex items-center text-sm text-gray-500 mb-1">
                  <ClockIcon className="h-4 w-4 mr-2" />
                  Timezone
                </div>
                <p className="text-base font-medium text-gray-900">{user.timezone}</p>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Role & Department */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Role & Department</h2>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <div className="flex items-center text-sm text-gray-500 mb-2">
                <ShieldCheckIcon className="h-4 w-4 mr-2" />
                Role
              </div>
              <Badge variant="primary" className="text-base px-3 py-1">
                {user.role}
              </Badge>
              {user.is_superuser && (
                <Badge variant="danger" className="ml-2 text-base px-3 py-1">
                  Superuser
                </Badge>
              )}
            </div>

            {user.department && (
              <div>
                <div className="flex items-center text-sm text-gray-500 mb-2">
                  <BuildingOfficeIcon className="h-4 w-4 mr-2" />
                  Department
                </div>
                <p className="text-base font-medium text-gray-900">{user.department}</p>
              </div>
            )}

            <div>
              <div className="flex items-center text-sm text-gray-500 mb-2">
                Member Since
              </div>
              <p className="text-base font-medium text-gray-900">
                {formatDate(user.created_at, 'PPP')}
              </p>
            </div>

            {user.last_login && (
              <div>
                <div className="flex items-center text-sm text-gray-500 mb-2">
                  Last Login
                </div>
                <p className="text-base font-medium text-gray-900">
                  {formatDate(user.last_login, 'PPpp')}
                </p>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Security</h2>
            {!isChangingPassword && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsChangingPassword(true)}
              >
                Change Password
              </Button>
            )}
          </div>
        </CardHeader>
        <CardBody>
          {isChangingPassword ? (
            <form onSubmit={handleSubmit(onSubmitPassword)} className="space-y-4">
              <Input
                label="Current Password"
                type="password"
                error={errors.old_password?.message}
                {...register('old_password')}
                required
              />

              <Input
                label="New Password"
                type="password"
                error={errors.new_password?.message}
                {...register('new_password')}
                helperText="Must be at least 8 characters"
                required
              />

              <Input
                label="Confirm New Password"
                type="password"
                error={errors.confirm_password?.message}
                {...register('confirm_password')}
                required
              />

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsChangingPassword(false);
                    reset();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={passwordMutation.isPending}
                >
                  Update Password
                </Button>
              </div>
            </form>
          ) : (
            <div className="text-sm text-gray-500">
              <p>Keep your account secure by using a strong password.</p>
              <p className="mt-2">Last password change: Never (using initial password)</p>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Permissions */}
      {user.permissions && user.permissions.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">Your Permissions</h2>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {user.permissions.map((permission, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg"
                >
                  <ShieldCheckIcon className="h-4 w-4 text-accent-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {permission.action}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {permission.module} ({permission.scope})
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}