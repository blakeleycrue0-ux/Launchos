import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'light' | 'outline-dark' | 'accent';
type Size = 'sm' | 'md' | 'lg';

interface CommonProps {
  variant?: Variant;
  size?: Size;
  block?: boolean;
}

function classes({ variant = 'secondary', size = 'md', block }: CommonProps, extra?: string) {
  return ['btn', `btn--${variant}`, size !== 'md' && `btn--${size}`, block && 'btn--block', extra]
    .filter(Boolean)
    .join(' ');
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, CommonProps {
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, block, loading = false, disabled, className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={classes({ variant, size, block }, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
});

export function ButtonLink({ variant, size, block, className, ...rest }: LinkProps & CommonProps) {
  return <Link className={classes({ variant, size, block }, className)} {...rest} />;
}
