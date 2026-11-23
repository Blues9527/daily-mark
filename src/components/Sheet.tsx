import { useEffect, useRef, type ReactNode } from 'react';
import { Icon } from './Icon';

interface SheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

export function Sheet({ open, title, onClose, children, footer }: SheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    const timer = window.setTimeout(() => sheetRef.current?.focus(), 30);
    return () => {
      document.removeEventListener('keydown', handleKey);
      window.clearTimeout(timer);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="sheet-layer">
      <button className="sheet-backdrop" type="button" aria-label="关闭" onClick={onClose} />
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={sheetRef}
      >
        <div className="sheet__grip" />
        <div className="sheet__head">
          <h2 className="sheet__title">{title}</h2>
          <button className="icon-btn" type="button" aria-label="关闭" onClick={onClose}>
            <Icon name="close" size={16} />
          </button>
        </div>
        <div className="sheet__body">{children}</div>
        {footer ? <div className="sheet__foot">{footer}</div> : null}
      </div>
    </div>
  );
}
