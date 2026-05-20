import { useEffect } from "react";
import { TriangleAlert, Info, X } from "lucide-react";

const AUTO_DISMISS_MS = 4000;

export default function CustomToast({ dialog, onClose }) {
  const isConfirm = dialog?.type === "confirm";

  useEffect(() => {
    if (!dialog || isConfirm) return;
    const timer = setTimeout(onClose, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [dialog, isConfirm, onClose]);

  if (!dialog) return null;

  const isWarning = dialog.type === "warning" || isConfirm;

  const colors = isWarning
    ? { bg: "#fff8e1", border: "#f59e0b", icon: "#f59e0b", text: "#92400e" }
    : { bg: "#eff6ff", border: "#3b82f6", icon: "#3b82f6", text: "#1e3a5f" };

  return (
    <div
      style={{
        position: "fixed",
        top: 90,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 10,
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: 8,
        padding: "10px 14px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        minWidth: 240,
        maxWidth: 380,
        pointerEvents: "all",
        animation: "toast-in 0.2s ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <span style={{ color: colors.icon, flexShrink: 0, paddingTop: 1 }}>
          {isWarning ? <TriangleAlert size={18} /> : <Info size={18} />}
        </span>
        <p style={{ margin: 0, fontSize: "0.875rem", color: colors.text, lineHeight: 1.5, flex: 1 }}>
          {dialog.message}
        </p>
        {!isConfirm && (
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: colors.icon, padding: 0, flexShrink: 0 }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {isConfirm && (
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button
            onClick={onClose}
            style={{ padding: "4px 12px", background: "transparent", border: `1px solid ${colors.border}`, borderRadius: 4, cursor: "pointer", fontSize: "0.8rem", color: colors.text }}
          >
            Annuler
          </button>
          <button
            onClick={() => { dialog.onConfirm?.(); onClose(); }}
            style={{ padding: "4px 12px", background: "#d9534f", color: "white", border: "none", borderRadius: 4, cursor: "pointer", fontSize: "0.8rem" }}
          >
            Confirmer
          </button>
        </div>
      )}

      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}
