import type { ButtonHTMLAttributes } from 'react';

const variants = {
  secondary: 'border border-gray-300 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800',
  danger: 'bg-red-700 text-white hover:bg-red-800',
  dangerGhost: 'hover:bg-red-100 dark:hover:bg-red-900',
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
};

export function Button({ variant = 'secondary', type = 'button', className = '', ...props }: Props) {
  return (
    <button
      type={type}
      className={`rounded-md px-3 py-1.5 text-sm font-medium ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
