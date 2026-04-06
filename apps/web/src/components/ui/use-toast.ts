"use client";

import { useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import type { ToastActionElement, ToastProps } from "@/components/ui/toast";

const TOAST_LIMIT = 1;
const TOAST_REMOVE_DELAY_MS = 400;
/** Radix pauses its timer on pointer move; we dismiss with our own timer instead. */
const DEFAULT_AUTO_DISMISS_MS = 5_000;

type AutoDismissHandle = ReturnType<typeof globalThis.setTimeout>;

const autoDismissTimers = new Map<string, AutoDismissHandle>();

const clearAutoDismiss = (toastId: string) => {
  const existing = autoDismissTimers.get(toastId);
  if (existing !== undefined) {
    clearTimeout(existing);
    autoDismissTimers.delete(toastId);
  }
};

const clearAllAutoDismiss = () => {
  for (const t of autoDismissTimers.values()) {
    clearTimeout(t);
  }
  autoDismissTimers.clear();
};

type ToasterToast = ToastProps & {
  id: string;
  title?: ReactNode;
  description?: ReactNode;
  action?: ToastActionElement;
};

type Action =
  | { type: "ADD_TOAST"; toast: ToasterToast }
  | { type: "UPDATE_TOAST"; toast: Partial<ToasterToast> }
  | { type: "DISMISS_TOAST"; toastId?: string }
  | { type: "REMOVE_TOAST"; toastId?: string };

interface State {
  toasts: ToasterToast[];
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

const genId = (): string => crypto.randomUUID();

let dispatch: (action: Action) => void;

const addToRemoveQueue = (toastId: string): void => {
  if (toastTimeouts.has(toastId)) return;

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({ type: "REMOVE_TOAST", toastId });
  }, TOAST_REMOVE_DELAY_MS);

  toastTimeouts.set(toastId, timeout);
};

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };
    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t,
        ),
      };
    case "DISMISS_TOAST": {
      const { toastId } = action;
      if (toastId) {
        clearAutoDismiss(toastId);
        addToRemoveQueue(toastId);
      } else {
        state.toasts.forEach((t) => {
          clearAutoDismiss(t.id);
          addToRemoveQueue(t.id);
        });
      }
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined ? { ...t, open: false } : t,
        ),
      };
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        clearAllAutoDismiss();
        return { ...state, toasts: [] };
      }
      clearAutoDismiss(action.toastId);
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };
  }
};

const listeners = new Set<() => void>();

let memoryState: State = { toasts: [] };

dispatch = (action: Action) => {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => listener());
};

type ToastInput = Omit<ToasterToast, "id">;

const toast = ({
  duration: autoDismissAfterMs = DEFAULT_AUTO_DISMISS_MS,
  ...props
}: ToastInput) => {
  const id = genId();

  const update = (next: ToasterToast) =>
    dispatch({ type: "UPDATE_TOAST", toast: { ...next, id } });

  const dismiss = () => {
    clearAutoDismiss(id);
    dispatch({ type: "DISMISS_TOAST", toastId: id });
  };

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      duration: Number.POSITIVE_INFINITY,
      onOpenChange: (open: boolean) => {
        if (!open) dismiss();
      },
    },
  });

  if (autoDismissAfterMs > 0 && Number.isFinite(autoDismissAfterMs)) {
    const tid = globalThis.setTimeout(() => {
      autoDismissTimers.delete(id);
      dispatch({ type: "DISMISS_TOAST", toastId: id });
    }, autoDismissAfterMs);
    autoDismissTimers.set(id, tid);
  }

  return { id, dismiss, update };
};

const useToast = () => {
  const state = useSyncExternalStore(
    (onStoreChange) => {
      const listener = () => onStoreChange();
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => memoryState,
    () => ({ toasts: [] }),
  );

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => {
      if (toastId === undefined) {
        memoryState.toasts.forEach((t) => clearAutoDismiss(t.id));
      } else {
        clearAutoDismiss(toastId);
      }
      dispatch({ type: "DISMISS_TOAST", toastId });
    },
  };
};

export { useToast, toast };
