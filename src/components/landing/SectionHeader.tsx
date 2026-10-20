import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * The one way a home page section introduces itself: a small mono label that
 * reads like a part number, a tight headline, and an optional line of context.
 */
export function SectionHeader({
  label,
  title,
  children,
  align = 'center',
  className,
}: {
  label: string;
  title: ReactNode;
  children?: ReactNode;
  align?: 'center' | 'left';
  className?: string;
}) {
  const centered = align === 'center';
  return (
    <div className={cn('flex flex-col gap-4 mb-12', centered ? 'items-center text-center' : 'items-start text-left', className)}>
      <span className="font-mono text-[11px] tracking-[0.14em] text-muted-foreground">{label}</span>
      <h2 className="text-3xl sm:text-4xl font-bold tracking-[-0.03em] leading-[1.05] max-w-2xl">{title}</h2>
      {children && (
        <p className={cn('text-muted-foreground leading-relaxed max-w-lg', centered && 'mx-auto')}>{children}</p>
      )}
    </div>
  );
}
