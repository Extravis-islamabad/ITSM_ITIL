import { format, formatDistanceToNow } from 'date-fns';
import { clsx, ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(date: string | Date, formatStr: string = 'PPp'): string {
  if (!date) return '';
  return format(new Date(date), formatStr);
}

export function formatRelativeTime(date: string | Date): string {
  if (!date) return '';
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function truncate(str: string, length: number = 50): string {
  if (!str || str.length <= length) return str;
  return str.substring(0, length) + '...';
}

export function getInitials(name: string): string {
  if (!name) return '';
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    critical: 'text-red-700 bg-red-100 border-red-200',
    high: 'text-orange-700 bg-orange-100 border-orange-200',
    medium: 'text-yellow-700 bg-yellow-100 border-yellow-200',
    low: 'text-blue-700 bg-blue-100 border-blue-200',
  };
  return colors[priority.toLowerCase()] || colors.medium;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    new: 'text-blue-700 bg-blue-100',
    open: 'text-blue-700 bg-blue-100',
    'in progress': 'text-yellow-700 bg-yellow-100',
    'in_progress': 'text-yellow-700 bg-yellow-100',
    pending: 'text-orange-700 bg-orange-100',
    resolved: 'text-green-700 bg-green-100',
    closed: 'text-gray-700 bg-gray-100',
    cancelled: 'text-red-700 bg-red-100',
  };
  return colors[status.toLowerCase()] || colors.open;
}

export function downloadFile(data: Blob, filename: string): void {
  const url = window.URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export function hasPermission(
  userPermissions: Array<{ module: string; action: string; scope: string }> | undefined,
  module: string,
  action: string
): boolean {
  if (!userPermissions) return false;
  return userPermissions.some(
    (p) => p.module === module && p.action === action
  );
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: number | undefined;
  return (...args: Parameters<T>) => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => func(...args), delay) as unknown as number;
  };
}