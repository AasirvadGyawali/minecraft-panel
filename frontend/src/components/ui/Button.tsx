import { ButtonHTMLAttributes } from 'react'
import clsx from 'clsx'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger'
  isLoading?: boolean
}

export default function Button({
  children,
  variant = 'primary',
  isLoading = false,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      className={clsx(
        // Base styles for all buttons
        'px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2',
        // Disabled state
        'disabled:opacity-50 disabled:cursor-not-allowed',
        // Variant styles
        variant === 'primary' && 'bg-green-600 hover:bg-green-700 text-white',
        variant === 'secondary' && 'bg-gray-700 hover:bg-gray-600 text-white',
        variant === 'danger' && 'bg-red-600 hover:bg-red-700 text-white',
        className
      )}
    >
      {isLoading && (
        // Spinning loader icon
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
      )}
      {children}
    </button>
  )
}