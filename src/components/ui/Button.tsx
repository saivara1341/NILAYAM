
import React from 'react';
import { styled, keyframes } from '../../stitches.config';

const shimmer = keyframes({
  '0%': { backgroundPosition: '-200% 0' },
  '100%': { backgroundPosition: '200% 0' },
});

const pulse = keyframes({
  '0%, 100%': { opacity: 1, transform: 'scale(1)' },
  '50%': { opacity: 0.8, transform: 'scale(0.98)' },
});

const StyledButton = styled('button', {
  // Base styles
  appearance: 'none',
  border: 'none',
  borderRadius: '$lg',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: '$sans',
  fontWeight: '$semibold',
  fontSize: '$sm',
  padding: '$3 $6',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  userSelect: 'none',
  whiteSpace: 'nowrap',
  gap: '$2',
  position: 'relative',
  overflow: 'hidden',
  outline: 'none',
  minHeight: '44px',
  letterSpacing: '0.01em',
  boxShadow: '0 10px 25px rgba(15, 23, 42, 0.08)',

  '&:focus-visible': {
    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.18), 0 10px 25px rgba(15, 23, 42, 0.12)',
    transform: 'translateY(-1px)',
  },

  '&:active': {
    transform: 'scale(0.96)',
  },

  '&:disabled': {
    opacity: 0.5,
    cursor: 'not-allowed',
    pointerEvents: 'none',
  },

  variants: {
    variant: {
      primary: {
        background: 'linear-gradient(135deg, $primary, $primaryDark)',
        color: 'white',
        boxShadow: '0 14px 30px rgba(37, 99, 235, 0.22)',
        '&:hover': {
          boxShadow: '0 18px 40px rgba(37, 99, 235, 0.28)',
          transform: 'translateY(-2px)',
          background: 'linear-gradient(135deg, $primaryLight, $primary)',
        },
      },
      secondary: {
        background: 'linear-gradient(135deg, #0f172a, #1e293b)',
        color: 'white',
        border: '1px solid rgba(15, 23, 42, 0.16)',
        boxShadow: '0 12px 28px rgba(15, 23, 42, 0.16)',
        '&:hover': {
          background: 'linear-gradient(135deg, #111827, #334155)',
          transform: 'translateY(-1px)',
        },
      },
      outline: {
        backgroundColor: 'rgba(255,255,255,0.76)',
        border: '1px solid rgba(148, 163, 184, 0.3)',
        color: '$text',
        '&:hover': {
          backgroundColor: 'rgba(255,255,255,0.92)',
          borderColor: '$primary',
          transform: 'translateY(-1px)',
        },
      },
      ghost: {
        backgroundColor: 'transparent',
        color: '$textMuted',
        '&:hover': {
          backgroundColor: 'rgba(148, 163, 184, 0.12)',
          color: '$text',
        },
      },
      emergency: {
        backgroundColor: '$error',
        color: 'white',
        fontWeight: '$black',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        animation: `${pulse} 2s infinite ease-in-out`,
        boxShadow: '0 0 20px rgba(239, 68, 68, 0.4)',
        '&:hover': {
          backgroundColor: '#dc2626',
          boxShadow: '0 0 30px rgba(239, 68, 68, 0.6)',
        },
      },
    },
    size: {
      sm: {
        padding: '$2 $4',
        fontSize: '$xs',
        minHeight: '38px',
      },
      md: {
        padding: '$3 $6',
        fontSize: '$sm',
      },
      lg: {
        padding: '$4 $8',
        fontSize: '$base',
        minHeight: '52px',
      },
    },
    fullWidth: {
      true: {
        width: '100%',
      },
    },
    isLoading: {
      true: {
        color: 'transparent !important',
        pointerEvents: 'none',
        '&::after': {
          content: '""',
          position: 'absolute',
          width: '16px',
          height: '16px',
          top: 'calc(50% - 8px)',
          left: 'calc(50% - 8px)',
          border: '2px solid rgba(255,255,255,0.3)',
          borderTopColor: 'white',
          borderRadius: '50%',
          animation: 'spin 0.6s linear infinite',
        },
      },
    },
  },

  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'emergency';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, leftIcon, rightIcon, isLoading, ...props }, ref) => {
    return (
      <StyledButton ref={ref} isLoading={isLoading} {...props}>
        {leftIcon && <span className="flex shrink-0">{leftIcon}</span>}
        {children}
        {rightIcon && <span className="flex shrink-0">{rightIcon}</span>}
        
        {/* Shimmer Effect on Hover */}
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </StyledButton>
    );
  }
);

Button.displayName = 'Button';

export default Button;
