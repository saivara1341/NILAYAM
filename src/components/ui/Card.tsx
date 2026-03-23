
import React from 'react';
import { styled } from '../../stitches.config';

const StyledCard = styled('div', {
  backgroundColor: '$glass',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  borderRadius: '$xl',
  border: '1px solid $border',
  padding: '$5',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  position: 'relative',
  overflow: 'hidden',
  flexShrink: 0,
  minWidth: 0,
  boxShadow: '$lg',

  '@md': {
    padding: '$6',
  },

  variants: {
    interactive: {
      true: {
        cursor: 'pointer',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '$premium',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
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
        backgroundColor: '$surface',
      },
      glass: {
        backdropFilter: 'blur(12px)',
        backgroundColor: '$glass',
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
