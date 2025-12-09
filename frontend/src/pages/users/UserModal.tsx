import { Fragment, useEffect, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { userService } from '@/services/userService';
import { roleService } from '@/services/roleService';
import Button from '@/components/common/Button';
import toast from 'react-hot-toast';
import { User } from '@/types';

interface UserModalProps {
  open: boolean;
  onClose: () => void;
  user?: User | null;
}

interface UserFormData {
  full_name: string;
  username: string;
  email: string;
  password: string;
  phone: string;
  employee_id: string;
  role_id: string;
  timezone: string;
}

export default function UserModal({ open, onClose, user }: UserModalProps) {
  const queryClient = useQueryClient();
  const isEdit = !!user;

  const [formData, setFormData] = useState<UserFormData>({
    full_name: '',
    username: '',
    email: '',
    password: '',
    phone: '',
    employee_id: '',
    role_id: '',
    timezone: 'UTC',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch roles
  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: () => roleService.getRoles({ page: 1, page_size: 100 }),
    enabled: open,
  });

  // Reset form when modal opens/closes or user changes
  useEffect(() => {
    if (open && user) {
      setFormData({
        full_name: user.full_name || '',
        username: user.username || '',
        email: user.email || '',
        password: '',
        phone: user.phone || '',
        employee_id: user.employee_id || '',
        role_id: user.role_id?.toString() || '',
        timezone: user.timezone || 'UTC',
      });
      setErrors({});
    } else if (open && !user) {
      setFormData({
        full_name: '',
        username: '',
        email: '',
        password: '',
        phone: '',
        employee_id: '',
        role_id: '',
        timezone: 'UTC',
      });
      setErrors({});
    }
  }, [open, user]);

  const createMutation = useMutation({
    mutationFn: (data: any) => userService.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User created successfully!');
      onClose();
    },
    onError: (error: any) => {
      const detail = error.response?.data?.detail;
      if (typeof detail === 'string') {
        toast.error(detail);
      } else {
        toast.error('Failed to create user');
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      userService.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User updated successfully!');
      onClose();
    },
    onError: (error: any) => {
      const detail = error.response?.data?.detail;
      if (typeof detail === 'string') {
        toast.error(detail);
      } else {
        toast.error('Failed to update user');
      }
    },
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    }

    if (!isEdit && !formData.password) {
      newErrors.password = 'Password is required';
    } else if (!isEdit && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.role_id) {
      newErrors.role_id = 'Role is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const payload: any = {
      full_name: formData.full_name.trim(),
      username: formData.username.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim() || null,
      employee_id: formData.employee_id.trim() || null,
      role_id: parseInt(formData.role_id),
      timezone: formData.timezone,
      language: 'en',
    };

    // Only include password if provided
    if (formData.password) {
      payload.password = formData.password;
    }

    if (isEdit && user) {
      updateMutation.mutate({ id: user.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleChange = (field: keyof UserFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6">
                <div className="absolute right-0 top-0 pr-4 pt-4">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="sm:flex sm:items-start">
                  <div className="w-full mt-3 text-center sm:mt-0 sm:text-left">
                    <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900">
                      {isEdit ? 'Edit User' : 'Create New User'}
                    </Dialog.Title>

                    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                      {/* Row 1: Full Name & Username */}
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Full Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={formData.full_name}
                            onChange={(e) => handleChange('full_name', e.target.value)}
                            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm ${
                              errors.full_name ? 'border-red-300' : ''
                            }`}
                            placeholder="John Doe"
                          />
                          {errors.full_name && (
                            <p className="mt-1 text-sm text-red-600">{errors.full_name}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Username <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={formData.username}
                            onChange={(e) => handleChange('username', e.target.value)}
                            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm ${
                              errors.username ? 'border-red-300' : ''
                            }`}
                            placeholder="johndoe"
                          />
                          {errors.username && (
                            <p className="mt-1 text-sm text-red-600">{errors.username}</p>
                          )}
                        </div>
                      </div>

                      {/* Row 2: Email & Password */}
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Email <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => handleChange('email', e.target.value)}
                            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm ${
                              errors.email ? 'border-red-300' : ''
                            }`}
                            placeholder="john@example.com"
                          />
                          {errors.email && (
                            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Password {!isEdit && <span className="text-red-500">*</span>}
                          </label>
                          <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => handleChange('password', e.target.value)}
                            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm ${
                              errors.password ? 'border-red-300' : ''
                            }`}
                            placeholder={isEdit ? 'Leave blank to keep current' : '••••••••'}
                          />
                          {errors.password && (
                            <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                          )}
                        </div>
                      </div>

                      {/* Row 3: Phone & Employee ID */}
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Phone
                          </label>
                          <input
                            type="text"
                            value={formData.phone}
                            onChange={(e) => handleChange('phone', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                            placeholder="+1234567890"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Employee ID
                          </label>
                          <input
                            type="text"
                            value={formData.employee_id}
                            onChange={(e) => handleChange('employee_id', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                            placeholder="EMP001"
                          />
                        </div>
                      </div>

                      {/* Row 4: Role & Timezone */}
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Role <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={formData.role_id}
                            onChange={(e) => handleChange('role_id', e.target.value)}
                            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm ${
                              errors.role_id ? 'border-red-300' : ''
                            }`}
                          >
                            <option value="">Select a role</option>
                            {rolesData?.items?.map((role: any) => (
                              <option key={role.id} value={role.id}>
                                {role.display_name || role.name}
                              </option>
                            ))}
                          </select>
                          {errors.role_id && (
                            <p className="mt-1 text-sm text-red-600">{errors.role_id}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Timezone
                          </label>
                          <select
                            value={formData.timezone}
                            onChange={(e) => handleChange('timezone', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                          >
                            <option value="UTC">UTC</option>
                            <option value="America/New_York">Eastern Time</option>
                            <option value="America/Chicago">Central Time</option>
                            <option value="America/Denver">Mountain Time</option>
                            <option value="America/Los_Angeles">Pacific Time</option>
                            <option value="Asia/Karachi">Pakistan Time</option>
                            <option value="Asia/Dubai">Dubai Time</option>
                            <option value="Europe/London">London Time</option>
                          </select>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse gap-3">
                        <Button
                          type="submit"
                          variant="primary"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? 'Saving...' : isEdit ? 'Update User' : 'Create User'}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={onClose}
                          disabled={isSubmitting}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}