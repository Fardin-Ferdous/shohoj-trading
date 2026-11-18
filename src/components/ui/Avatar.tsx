import React, { useEffect, useState } from 'react';
import { cn } from '../../utils/formatters';

interface UserAvatarProps {
  src?: string;
  name: string;
  color?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<UserAvatarProps['size']>, string> = {
  xs: 'h-8 w-8 text-xs',
  sm: 'h-9 w-9 text-xs',
  md: 'h-11 w-11 text-sm',
  lg: 'h-14 w-14 text-lg',
};

export function UserAvatar({
  src,
  name,
  color = '#10b981',
  size = 'md',
  className,
}: UserAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [src]);

  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  if (src && !imgFailed) {
    return (
      <div
        className={cn(
          'rounded-full overflow-hidden border border-white/15 bg-slate-900 shrink-0',
          SIZE_CLASSES[size],
          className
        )}
      >
        <img
          src={src}
          alt={name}
          onError={() => setImgFailed(true)}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-display font-bold text-slate-950 border border-white/15 shrink-0',
        SIZE_CLASSES[size],
        className
      )}
      style={{ backgroundColor: color }}
      aria-label={name}
    >
      {initials || 'ST'}
    </div>
  );
}
