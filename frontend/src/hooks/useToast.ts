import { createContext, useContext } from "react";

export type ToastTone = "ok" | "error";

export type ToastContextValue = {
  notify: (message: string, tone?: ToastTone) => void;
};

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
