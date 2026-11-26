import { Eye, EyeOff } from 'lucide-react';
import * as React from 'react';
import { cn } from '@/lib/cn';
import { Button } from './Button';

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const isPasswordType = type === 'password';

    const baseInputClassName = cn(
      'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
      'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
      'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
      // Prevent Chrome autofill from changing background color
      '[&:-webkit-autofill]:!bg-transparent [&:-webkit-autofill]:shadow-[0_0_0_100px_var(--color-autofill-bg)_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:var(--color-autofill-text)]',
      '[&:-webkit-autofill:hover]:!bg-transparent [&:-webkit-autofill:hover]:shadow-[0_0_0_100px_var(--color-autofill-bg)_inset]',
      '[&:-webkit-autofill:focus-visible]:!bg-transparent [&:-webkit-autofill:focus-visible]:shadow-[0_0_0_100px_var(--color-autofill-bg)_inset] [&:-webkit-autofill:focus-visible]:ring-ring/50 [&:-webkit-autofill:focus-visible]:ring-[3px]',
      '[&:-webkit-autofill:active]:!bg-transparent [&:-webkit-autofill:active]:shadow-[0_0_0_100px_var(--color-autofill-bg)_inset]',
      isPasswordType && 'pr-10',
      className,
    );

    if (isPasswordType) {
      return (
        <div className="relative">
          <input
            ref={ref}
            type={showPassword ? 'text' : 'password'}
            data-slot="input"
            className={baseInputClassName}
            {...props}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={() => setShowPassword(!showPassword)}
            disabled={props.disabled}
            tabIndex={-1}
          >
            {showPassword ? (
              <Eye className="h-4 w-4 text-muted-foreground" />
            ) : (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="sr-only">{showPassword ? 'Hide password' : 'Show password'}</span>
          </Button>
        </div>
      );
    }

    return <input ref={ref} type={type} data-slot="input" className={baseInputClassName} {...props} />;
  },
);
Input.displayName = 'Input';
