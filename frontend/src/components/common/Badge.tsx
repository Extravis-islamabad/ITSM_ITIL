import { HTMLAttributes } from 'react';
import { cn } from '@/utils/helpers';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'secondary' | 'outline';
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'secondary' | 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'purple' | 'orange';
  children: React.ReactNode;
}

export default function Badge({ variant, color, className, children, ...props }: BadgeProps) {
  // Map color prop to variant for backwards compatibility
  const colorToVariant: { [key: string]: string } = {
    blue: 'primary',
    green: 'success',
    yellow: 'warning',
    red: 'danger',
    gray: 'secondary',
    purple: 'primary',
    orange: 'warning',
  };

  const finalVariant = variant || (color ? colorToVariant[color] : undefined) || 'primary';

  const variants = {
    primary: 'badge-primary',
    success: 'badge-success',
    warning: 'badge-warning',
    danger: 'badge-danger',
    info: 'badge-info',
    secondary: 'badge-secondary',
    outline: 'badge-outline',
  };

  return (
    <span className={cn('badge', variants[finalVariant as keyof typeof variants], className)} {...props}>
      {children}
    </span>
  );
}