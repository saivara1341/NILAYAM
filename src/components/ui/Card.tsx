
import React from 'react';
import { styled } from '../../stitches.config';

const StyledCard = styled('div', {
  background: 'linear-gradient(180deg, rgba(255,255,255,0.9), rgba(248,250,252,0.88))',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  borderRadius: '1.75rem',
  border: '1px solid rgba(148, 163, 184, 0.16)',
  padding: '$5',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  position: 'relative',
  overflow: 'hidden',
  flexShrink: 0,
  minWidth: 0,
  boxShadow: '0 18px 40px rgba(15, 23, 42, 0.07)',

  '&::before': {
    content: '""',
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(135deg, rgba(255,255,255,0.35), transparent 40%)',
    pointerEvents: 'none',
  },

  '& > *': {
    position: 'relative',
    zIndex: 1,
  },

  '@md': {
    padding: '$6',
  },

  variants: {
    interactive: {
      true: {
        cursor: 'pointer',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 22px 48px rgba(15, 23, 42, 0.12)',
          borderColor: '$primary',
        },
        '&:active': {
          transform: 'scale(0.98)',
        },
      },
    },
    variant: {
      flat: {
        backdropFilter: 'none',
        background: '$surface',
      },
      glass: {
        backdropFilter: 'blur(12px)',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.9), rgba(248,250,252,0.88))',
      },
    }
  },

  defaultVariants: {
    variant: 'glass',
  }
});

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
  variant?: 'flat' | 'glass';
}

const Card: React.FC<CardProps> = ({ children, className, onClick, ...props }) => {
  return (
    <StyledCard 
      onClick={onClick} 
      interactive={!!onClick}
      className={className}
      {...props}
    >
      {children}
    </StyledCard>
  );
};

export default Card;
