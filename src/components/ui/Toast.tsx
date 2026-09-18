import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import { useEffect } from "react";

type ToastProps = {
  tone: "success" | "error";
  message: string;
  onDismiss: () => void;
  durationMs?: number;
};

export function Toast({ tone, message, onDismiss, durationMs = 3600 }: ToastProps) {
  useEffect(() => {
    const timeout = window.setTimeout(onDismiss, durationMs);
    return () => window.clearTimeout(timeout);
  }, [durationMs, message, onDismiss, tone]);

  const Icon = tone === "success" ? CheckCircle2 : AlertTriangle;

  return (
    <div className={`toast toast--${tone}`} role={tone === "error" ? "alert" : "status"}>
      <Icon className="toast__icon" size={18} aria-hidden="true" />
      <span>{message}</span>
      <button className="toast__dismiss" type="button" onClick={onDismiss} aria-label="Dismiss notification">
        <X size={15} aria-hidden="true" />
      </button>
    </div>
  );
}
