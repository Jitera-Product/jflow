import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { LoaderCircle } from 'lucide-react';
import * as React from 'react';
import { cn } from '@/lib/cn';

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap rounded-full text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          'bg-[image:var(--btn-gradient)] text-white shadow-xs hover:bg-primary/90 active:bg-primary/75 disabled:bg-[image:var(--btn-gradient-disabled)] disabled:!opacity-100 disabled:text-white/40',
        destructive:
          'bg-destructive text-white shadow-xs hover:bg-destructive/90 active:bg-destructive/75 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
        outline:
          'border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground active:bg-accent/80 active:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50',
        primary: 'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 active:bg-primary/75',
        secondary: 'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80 active:bg-secondary/70',
        ghost:
          'hover:bg-accent hover:text-accent-foreground active:bg-accent/80 active:text-accent-foreground dark:hover:bg-accent/50',
        link: 'text-primary underline-offset-4 hover:underline active:opacity-70',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 rounded-full gap-1.5 px-3 has-[>svg]:px-2.5',
        lg: 'h-10 rounded-full px-6 has-[>svg]:px-4',
        xs: 'h-6 rounded-sm px-2 has-[>svg]:px-2 text-xs',
        icon: 'size-9',
        'icon-sm': 'size-7',
      },
      loading: {
        true: 'pointer-events-none',
        false: '',
      },
    },
    compoundVariants: [
      { variant: 'default', loading: true, className: 'opacity-60' },
      { variant: 'destructive', loading: true, className: 'opacity-50' },
      { variant: 'outline', loading: true, className: 'opacity-50' },
      { variant: 'primary', loading: true, className: 'opacity-50' },
      { variant: 'secondary', loading: true, className: 'opacity-50' },
      { variant: 'ghost', loading: true, className: 'opacity-50' },
      { variant: 'link', loading: true, className: 'opacity-50' },
    ],
    defaultVariants: {
      variant: 'default',
      size: 'default',
      loading: false,
    },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild = false,
  children,
  loading = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    loading?: boolean;
  }) {
  if (asChild) {
    return (
      <Slot data-slot="button" className={cn(buttonVariants({ variant, size, loading, className }))} {...props}>
        {children}
      </Slot>
    );
  }

  return (
    <button data-slot="button" className={cn(buttonVariants({ variant, size, loading, className }))} {...props} disabled={props.disabled || loading}>
      {loading && <LoaderCircle className="animate-spin" />}
      {loading && size === 'icon' ? null : children}
    </button>
  );
}
