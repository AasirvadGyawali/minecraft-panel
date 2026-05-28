import { InputHTMLAttributes } from 'react'
import clsx from 'clsx'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export default function Input({ label, error, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-gray-300">
          {label}
        </label>
      )}
      <input
        {...props}
        className={clsx(
          'px-3 py-2 bg-gray-800 border rounded-lg text-white placeholder-gray-500',
          'focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent',
          'transition-all duration-200',
          error ? 'border-red-500' : 'border-gray-700',
          className
        )}
      />
      {error && (
        <span className="text-xs text-red-400">{error}</span>
      )}
    </div>
  )
}