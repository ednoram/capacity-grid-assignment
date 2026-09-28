import type { ReactNode } from 'react';

type Props = {
  message: string;
  className?: string;
  children?: ReactNode;
};

export function ErrorNotice({ message, className = '', children }: Props) {
  return (
    <div
      role="alert"
      className={`rounded-md bg-red-50 px-4 py-3 text-red-800 dark:bg-red-950 dark:text-red-200 ${className}`}
    >
      <p>{message}</p>
      {children}
    </div>
  );
}
