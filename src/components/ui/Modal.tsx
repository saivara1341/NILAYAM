
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, maxWidth = 'lg' }) => {
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
      'sm': 'max-w-sm',
      'md': 'max-w-md',
      'lg': 'max-w-lg',
      'xl': 'max-w-xl',
      '2xl': 'max-w-2xl',
      '3xl': 'max-w-3xl',
      '4xl': 'max-w-4xl',
      '5xl': 'max-w-5xl',
      'full': 'max-w-full m-4',
  };

  return ReactDOM.createPortal(
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex justify-center items-end md:items-center p-0 md:p-4" 
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
      onClick={onClose} // Close on backdrop click
    >
      <div 
        className={`bg-white dark:bg-neutral-900 w-full md:w-auto md:min-w-[420px] ${maxWidthClasses[maxWidth]} rounded-t-3xl md:rounded-2xl shadow-2xl animate-slide-up-mobile md:animate-scale-in m-0 h-[92dvh] md:h-auto max-h-[92dvh] md:max-h-[90vh] flex flex-col border-t border-neutral-200 dark:border-neutral-800 md:border-none`}
        role="document"
        onClick={e => e.stopPropagation()} // Prevent close on content click
      >
        {/* Mobile Drag Handle Indicator */}
        <div className="md:hidden w-full flex justify-center pt-3 pb-1 cursor-pointer" onClick={onClose}>
            <div className="w-12 h-1.5 bg-neutral-300 dark:bg-neutral-700 rounded-full"></div>
        </div>

        <div className="sticky top-0 z-10 flex justify-between items-center p-4 md:p-5 border-b border-neutral-100 dark:border-neutral-800 shrink-0 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-sm">
          <h2 id="modal-title" className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight">{title}</h2>
          <button 
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors bg-neutral-100 dark:bg-neutral-800 p-2 rounded-full hover:rotate-90 duration-200"
            aria-label="Close modal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar overscroll-contain px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 md:p-6">
          {children}
        </div>
      </div>
      <style>{`
        @keyframes slideUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
        }
        @keyframes scaleIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
        }
        .animate-slide-up-mobile {
            animation: slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .md\\:animate-scale-in {
            animation: scaleIn 0.2s ease-out;
        }
      `}</style>
    </div>,
    document.body
  );
};

export default Modal;
