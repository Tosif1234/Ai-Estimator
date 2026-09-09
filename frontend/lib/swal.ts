import Swal from "sweetalert2"
import "sweetalert2/dist/sweetalert2.min.css"

// Custom SweetAlert2 Toast Mixin (Top-Right, Auto-dismiss, Theme-compatible)
const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3500,
  timerProgressBar: true,
  buttonsStyling: false,
  customClass: {
    popup: "swal2-toast-theme",
    title: "swal2-toast-title",
    timerProgressBar: "swal2-toast-progress",
  },
  didOpen: (toast) => {
    toast.onmouseenter = Swal.stopTimer
    toast.onmouseleave = Swal.resumeTimer
  },
})

export const swalToast = {
  success: (message: string, title?: string) =>
    Toast.fire({
      icon: "success",
      title: title || message,
      text: title ? message : undefined,
    }),

  error: (message: string, title?: string) =>
    Toast.fire({
      icon: "error",
      title: title || message,
      text: title ? message : undefined,
    }),

  info: (message: string, title?: string) =>
    Toast.fire({
      icon: "info",
      title: title || message,
      text: title ? message : undefined,
    }),

  warning: (message: string, title?: string) =>
    Toast.fire({
      icon: "warning",
      title: title || message,
      text: title ? message : undefined,
    }),
}

// Custom Modal Alert (for large errors, validations, or important feedback)
export const swalModal = {
  success: (title: string, message?: string) =>
    Swal.fire({
      icon: "success",
      iconColor: "#10b981",
      title,
      text: message,
      buttonsStyling: false,
      customClass: {
        popup: "swal2-modal-popup",
        title: "swal2-modal-title",
        htmlContainer: "swal2-modal-body",
        actions: "swal2-modal-actions",
        confirmButton: "swal2-btn-primary",
      },
      confirmButtonText: "Got it",
    }),

  error: (title: string, message?: string) =>
    Swal.fire({
      icon: "error",
      iconColor: "#ef4444",
      title,
      text: message,
      buttonsStyling: false,
      customClass: {
        popup: "swal2-modal-popup",
        title: "swal2-modal-title",
        htmlContainer: "swal2-modal-body",
        actions: "swal2-modal-actions",
        confirmButton: "swal2-btn-destructive",
      },
      confirmButtonText: "Close",
    }),

  warning: (title: string, message?: string) =>
    Swal.fire({
      icon: "warning",
      iconColor: "#f59e0b",
      title,
      text: message,
      buttonsStyling: false,
      customClass: {
        popup: "swal2-modal-popup",
        title: "swal2-modal-title",
        htmlContainer: "swal2-modal-body",
        actions: "swal2-modal-actions",
        confirmButton: "swal2-btn-primary",
      },
      confirmButtonText: "Understood",
    }),
}

// Custom Confirmation Dialog (for Delete, Destructive actions, or confirmations)
export const swalConfirm = async (options: {
  title: string
  text: string
  confirmText?: string
  cancelText?: string
  isDestructive?: boolean
}): Promise<boolean> => {
  const result = await Swal.fire({
    title: options.title,
    text: options.text,
    icon: options.isDestructive ? "warning" : "question",
    iconColor: options.isDestructive ? "#f97316" : "#2563eb",
    showCancelButton: true,
    confirmButtonText: options.confirmText || (options.isDestructive ? "Delete" : "Confirm"),
    cancelButtonText: options.cancelText || "Cancel",
    reverseButtons: true,
    buttonsStyling: false,
    customClass: {
      popup: "swal2-modal-popup",
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


