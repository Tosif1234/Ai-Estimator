import Swal from "sweetalert2"
import "sweetalert2/dist/sweetalert2.min.css"

/**
 * Dynamically check if the application is currently rendered in Dark Mode.
 * Checks class and data attributes on documentElement and body.
 */
export function isDarkMode(): boolean {
  if (typeof document === "undefined") return false
  return (
    document.documentElement.classList.contains("dark") ||
    document.documentElement.getAttribute("data-theme") === "dark" ||
    document.body.classList.contains("dark")
  )
}

/**
 * Normalizes messages to prevent generic "Success" or "Error" notifications.
 */
function normalizeNotification(message: string, title?: string): { title: string; text?: string } {
  const trimmed = (message || "").trim()
  const lower = trimmed.toLowerCase()

  if (!title) {
    if (lower === "success" || lower === "successful") {
      return { title: "Action Completed Successfully" }
    }
    if (lower === "error" || lower === "failed") {
      return { title: "Something went wrong. Please try again." }
    }
    if (lower === "updated successfully" || lower === "updated") {
      return { title: "Updated Successfully" }
    }
    return { title: trimmed }
  }

  return { title, text: trimmed }
}

/**
 * Base configuration options for Toasts (Top-Right, Auto-dismiss, Theme-compatible)
 */
function getToastConfig(isDark: boolean) {
  return {
    toast: true,
    position: "top-end" as const,
    showConfirmButton: false,
    timer: 3500,
    timerProgressBar: true,
    buttonsStyling: false,
    background: isDark ? "#0f172a" : "#ffffff",
    color: isDark ? "#f8fafc" : "#0f172a",
    customClass: {
      popup: `swal2-toast-theme ${isDark ? "swal2-dark-mode" : "swal2-light-mode"}`,
      title: "swal2-toast-title",
      htmlContainer: "swal2-toast-body",
      timerProgressBar: "swal2-toast-progress",
    },
    didOpen: (toast: HTMLElement) => {
      toast.onmouseenter = Swal.stopTimer
      toast.onmouseleave = Swal.resumeTimer
    },
  }
}

export const swalToast = {
  success: (message: string, customTitle?: string) => {
    const isDark = isDarkMode()
    const { title, text } = normalizeNotification(message, customTitle)
    return Swal.fire({
      ...getToastConfig(isDark),
      icon: "success",
      iconColor: "#10b981",
      title,
      text,
    })
  },

  error: (message: string, customTitle?: string) => {
    const isDark = isDarkMode()
    const { title, text } = normalizeNotification(message, customTitle)
    return Swal.fire({
      ...getToastConfig(isDark),
      icon: "error",
      iconColor: "#ef4444",
      title,
      text,
    })
  },

  info: (message: string, customTitle?: string) => {
    const isDark = isDarkMode()
    const { title, text } = normalizeNotification(message, customTitle)
    return Swal.fire({
      ...getToastConfig(isDark),
      icon: "info",
      iconColor: "#4f46e5",
      title,
      text,
    })
  },

  warning: (message: string, customTitle?: string) => {
    const isDark = isDarkMode()
    const { title, text } = normalizeNotification(message, customTitle)
    return Swal.fire({
      ...getToastConfig(isDark),
      icon: "warning",
      iconColor: "#f59e0b",
      title,
      text,
    })
  },
}

/**
 * Custom Modal Alert (for large errors, validations, or important feedback)
 */
export const swalModal = {
  success: (title: string, message?: string) => {
    const isDark = isDarkMode()
    return Swal.fire({
      icon: "success",
      iconColor: "#10b981",
      title: title || "Action Completed Successfully",
      text: message,
      background: isDark ? "#0e1322" : "#ffffff",
      color: isDark ? "#f8fafc" : "#0f172a",
      buttonsStyling: false,
      customClass: {
        popup: `swal2-modal-popup ${isDark ? "swal2-dark-mode" : "swal2-light-mode"}`,
        title: "swal2-modal-title",
        htmlContainer: "swal2-modal-body",
        actions: "swal2-modal-actions",
        confirmButton: "swal2-btn-primary",
      },
      confirmButtonText: "Got it",
    })
  },

  error: (title: string, message?: string) => {
    const isDark = isDarkMode()
    return Swal.fire({
      icon: "error",
      iconColor: "#ef4444",
      title: title || "Something went wrong. Please try again.",
      text: message,
      background: isDark ? "#0e1322" : "#ffffff",
      color: isDark ? "#f8fafc" : "#0f172a",
      buttonsStyling: false,
      customClass: {
        popup: `swal2-modal-popup ${isDark ? "swal2-dark-mode" : "swal2-light-mode"}`,
        title: "swal2-modal-title",
        htmlContainer: "swal2-modal-body",
        actions: "swal2-modal-actions",
        confirmButton: "swal2-btn-destructive",
      },
      confirmButtonText: "Close",
    })
  },

  warning: (title: string, message?: string) => {
    const isDark = isDarkMode()
    return Swal.fire({
      icon: "warning",
      iconColor: "#f59e0b",
      title,
      text: message,
      background: isDark ? "#0e1322" : "#ffffff",
      color: isDark ? "#f8fafc" : "#0f172a",
      buttonsStyling: false,
      customClass: {
        popup: `swal2-modal-popup ${isDark ? "swal2-dark-mode" : "swal2-light-mode"}`,
        title: "swal2-modal-title",
        htmlContainer: "swal2-modal-body",
        actions: "swal2-modal-actions",
        confirmButton: "swal2-btn-primary",
      },
      confirmButtonText: "Understood",
    })
  },
}

/**
 * Custom Confirmation Dialog (for Delete, Destructive actions, or confirmations)
 */
export const swalConfirm = async (options: {
  title: string
  text: string
  confirmText?: string
  cancelText?: string
  isDestructive?: boolean
}): Promise<boolean> => {
  const isDark = isDarkMode()
  const result = await Swal.fire({
    title: options.title,
    text: options.text,
    icon: options.isDestructive ? "warning" : "question",
    iconColor: options.isDestructive ? "#f97316" : "#4f46e5",
    background: isDark ? "#0e1322" : "#ffffff",
    color: isDark ? "#f8fafc" : "#0f172a",
    showCancelButton: true,
    confirmButtonText: options.confirmText || (options.isDestructive ? "Delete" : "Confirm"),
    cancelButtonText: options.cancelText || "Cancel",
    reverseButtons: true,
    buttonsStyling: false,
    customClass: {
      popup: `swal2-modal-popup ${isDark ? "swal2-dark-mode" : "swal2-light-mode"}`,
      title: "swal2-modal-title",
      htmlContainer: "swal2-modal-body",
      actions: "swal2-modal-actions",
      confirmButton: options.isDestructive ? "swal2-btn-destructive" : "swal2-btn-primary",
      cancelButton: "swal2-btn-cancel",
    },
  })

  return result.isConfirmed
}

export default Swal


