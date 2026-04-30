import type { ReactNode } from 'react';

type OperationalModalProps = {
  children: ReactNode;
  eyebrow?: string;
  isOpen: boolean;
  onClose: () => void;
  size?: 'standard' | 'wide' | 'clinical';
  title: string;
  toneLabel?: string;
};

export function OperationalModal({
  children,
  eyebrow,
  isOpen,
  onClose,
  size = 'wide',
  title,
  toneLabel,
}: OperationalModalProps) {
  if (!isOpen) {
    return null;
  }

  const titleId = `modal-${title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}`;

  return (
    <div
      className="detail-modal-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        className={`detail-modal operational-modal ${size}`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="detail-modal-header">
          <div>
            {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
            <h2 id={titleId}>{title}</h2>
          </div>
          <div className="toolbar-inline">
            {toneLabel ? (
              <span className="inline-badge">{toneLabel}</span>
            ) : null}
            <button className="ghost-button" onClick={onClose} type="button">
              Fechar
            </button>
          </div>
        </header>

        {children}
      </section>
    </div>
  );
}
