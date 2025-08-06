import React from 'react'
import { clsx } from 'clsx'
import { Loader2 } from 'lucide-react'
import type { ButtonProps } from '@/types'

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    className,
    children,
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    onClick,
    type = 'button',
    ...props
  }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
    
    const variants = {
      primary: 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500 text-white shadow-sm',
      secondary: 'bg-gray-600 hover:bg-gray-700 focus:ring-gray-500 text-white shadow-sm',
      outline: 'border border-gray-300 bg-white hover:bg-gray-50 focus:ring-primary-500 text-gray-700 shadow-sm',
      ghost: 'hover:bg-gray-100 focus:ring-gray-500 text-gray-700',
      danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white shadow-sm',
    }
    
    const sizes = {
      sm: 'px-3 py-1.5 text-sm rounded-md',
      md: 'px-4 py-2 text-sm rounded-md',
      lg: 'px-6 py-3 text-base rounded-lg',
    }
    
    return (
      <button
        ref={ref}
        type={type}
        className={clsx(
          baseStyles,
          variants[variant],
          sizes[size],
          className
        )}
        disabled={disabled || loading}
        onClick={onClick}
        {...props}
      >
        {loading && (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
