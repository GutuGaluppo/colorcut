import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

type ModalProps = {
  title: string;
  onDismiss: () => void;
  children: ReactNode;
  actions?: ReactNode;
};

export function Modal({ title, onDismiss, children, actions }: ModalProps) {
  const dismissButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    dismissButtonRef.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onDismiss();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onDismiss]);

  return (
    <div className="modal-overlay" onClick={onDismiss}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal__header">
          <h2 id="modal-title">{title}</h2>
          <button
            ref={dismissButtonRef}
            className="modal__dismiss"
            type="button"
            onClick={onDismiss}
            aria-label="Close dialog"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <div className="modal__body">{children}</div>
        {actions && <div className="modal__actions">{actions}</div>}
      </div>
    </div>
  );
}
