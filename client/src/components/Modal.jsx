import { useEffect } from 'react';

export default function Modal({ onClose, children, wide }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-3 sm:p-8" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`card w-full ${wide ? 'max-w-4xl' : 'max-w-md'} p-5`}>{children}</div>
    </div>
  );
}
