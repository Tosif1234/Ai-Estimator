"use client"

import * as React from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Mail, Lock, CheckCircle2, ArrowRight, AlertCircle, KeyRound, Eye, EyeOff } from "lucide-react"

import { authApi } from "@/lib/api/authApi"
import { swalToast } from "@/lib/swal"

const emailSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address."),
})

const otpSchema = z.object({
  otp: z.string().trim().regex(/^\d{6}$/, "OTP must be exactly 6 digits."),
})

const passwordSchema = z.object({
  newPassword: z.string().min(8, "Password must be at least 8 characters."),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
})

type EmailFormValues = z.infer<typeof emailSchema>
type OtpFormValues = z.infer<typeof otpSchema>
type PasswordFormValues = z.infer<typeof passwordSchema>

export default function ForgotPasswordPage() {
  const [step, setStep] = React.useState<0 | 1 | 2 | 3>(0)
  const [email, setEmail] = React.useState("")
  const [otp, setOtp] = React.useState("")
  const [resetToken, setResetToken] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [resendCooldown, setResendCooldown] = React.useState(0)
  const [showPassword, setShowPassword] = React.useState(false)

  React.useEffect(() => {
    let timer: NodeJS.Timeout
    if (resendCooldown > 0) {
      timer = setInterval(() => setResendCooldown((prev) => prev - 1), 1000)
    }
    return () => clearInterval(timer)
  }, [resendCooldown])

  const emailForm = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
  })

  const otpForm = useForm<OtpFormValues>({
    resolver: zodResolver(otpSchema),
  })

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
  })

  const onEmailSubmit = async (data: EmailFormValues) => {
    setError(null)
    try {
      await authApi.forgotPassword(data.email)
      setEmail(data.email)
      setStep(1)
      setResendCooldown(120)
      swalToast.success("Verification code sent to your email.")
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "An error occurred while requesting OTP."
      setError(errMsg)
      swalToast.error(errMsg)
    }
  }

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return
    setError(null)
    try {
      const response = await authApi.forgotPassword(email) as { retryAfterSeconds?: number }
      if (response && response.retryAfterSeconds) {
        setResendCooldown(response.retryAfterSeconds)
      } else {
        setResendCooldown(120)
      }
      swalToast.info("A new OTP code has been sent.")
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to resend OTP."
      setError(errMsg)
      swalToast.error(errMsg)
    }
  }

  const onOtpSubmit = async (data: OtpFormValues) => {
    setError(null)
    try {
      const res = await authApi.verifyResetOtp({ email, otp: data.otp }) as { resetToken?: string }
      if (res && res.resetToken) {
        setResetToken(res.resetToken)
      }
      setOtp(data.otp)
      setStep(2)
      swalToast.success("Code verified successfully.")
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Invalid or expired OTP."
      setError(errMsg)
      swalToast.error(errMsg)
    }
  }

  const onPasswordSubmit = async (data: PasswordFormValues) => {
    setError(null)
    try {
      await authApi.resetPassword({ email, resetToken, otp, newPassword: data.newPassword })
      setEmail("")
      setOtp("")
      setResetToken("")
      setStep(3)
      swalToast.success("Password reset successfully! You can now log in.")
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to reset password."
      setError(errMsg)
      swalToast.error(errMsg)
    }
  }

  return (
    <div className="w-full flex flex-col justify-center h-full">
      
      {step === 0 && (
        <>
          <div className="mb-4">
            <h1 className="text-[32px] sm:text-[36px] font-extrabold tracking-tight text-[#1a1a2e] dark:text-white mb-1 transition-colors">
              Reset Password
            </h1>
            <p className="text-[14px] sm:text-[15px] font-medium text-gray-400 dark:text-zinc-400 transition-colors">
              Enter your email address to receive a verification code.
            </p>
          </div>

          {error && (
            <div className="mb-3 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 font-medium text-[13px] text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <p className="leading-tight">{error}</p>
            </div>
          )}

          <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
            <div className={`relative flex items-center border-b-[1.5px] py-2 transition-all duration-200 ${
              emailForm.formState.errors.email 
                ? 'border-red-400 dark:border-red-500' 
                : 'border-gray-300 dark:border-zinc-700 hover:border-gray-400 dark:hover:border-zinc-500 focus-within:border-[#3d65f5] dark:focus-within:border-[#5e88ff] focus-within:border-b-2'
            }`}>
              <div className={`${emailForm.formState.errors.email ? 'text-red-400 dark:text-red-400' : 'text-gray-500 dark:text-zinc-400'} mr-4 transition-colors`}>
                <Mail className="h-5 w-5" strokeWidth={2} />
              </div>
              <input
                id="email"
                type="email"
                {...emailForm.register("email")}
                placeholder="Email Address"
                className="flex-1 bg-transparent border-none outline-none text-[15px] font-bold text-gray-800 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 placeholder:font-semibold"
              />
              {emailForm.formState.touchedFields.email && emailForm.watch("email") && !emailForm.formState.errors.email && (
                <CheckCircle2 className="h-5 w-5 text-[#34d399] ml-2" strokeWidth={2.5} />
              )}
            </div>

            <div className="flex items-center justify-between pt-4">
              <button 
                type="submit" 
                disabled={emailForm.formState.isSubmitting}
                className="relative flex items-center justify-between w-[160px] h-[44px] bg-[#4f75ff] hover:bg-[#3d65f5] active:bg-[#2e54e6] text-white rounded-full font-bold text-[14px] transition-all shadow-lg shadow-blue-500/30 dark:shadow-blue-500/20 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed pl-5 pr-1.5"
              >
                {emailForm.formState.isSubmitting ? "Sending..." : "Send Code"}
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  {emailForm.formState.isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" strokeWidth={2.5} />}
                </div>
              </button>
            </div>
          </form>

          <div className="mt-8 flex items-center justify-start">
            <div className="text-[13px] font-semibold text-gray-500 dark:text-zinc-400 transition-colors">
              Remember your password? <Link href="/login" className="text-[#3d65f5] dark:text-[#5e88ff] hover:underline font-bold ml-1">Back to Login</Link>
            </div>
          </div>
        </>
      )}

      {step === 1 && (
        <>
          <div className="mb-4">
            <h1 className="text-[32px] sm:text-[36px] font-extrabold tracking-tight text-[#1a1a2e] dark:text-white mb-1 transition-colors">
              Verify OTP
            </h1>
            <p className="text-[14px] sm:text-[15px] font-medium text-gray-400 dark:text-zinc-400 transition-colors">
              Enter the 6-digit code sent to <span className="font-bold text-gray-700 dark:text-zinc-200">{email}</span>
            </p>
          </div>

          {error && (
            <div className="mb-3 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 font-medium text-[13px] text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <p className="leading-tight">{error}</p>
            </div>
          )}

          <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-4">
            <div className={`relative flex items-center border-b-[1.5px] py-2 transition-all duration-200 ${
              otpForm.formState.errors.otp 
                ? 'border-red-400 dark:border-red-500' 
                : 'border-gray-300 dark:border-zinc-700 hover:border-gray-400 dark:hover:border-zinc-500 focus-within:border-[#3d65f5] dark:focus-within:border-[#5e88ff] focus-within:border-b-2'
            }`}>
              <div className={`${otpForm.formState.errors.otp ? 'text-red-400 dark:text-red-400' : 'text-gray-500 dark:text-zinc-400'} mr-4 transition-colors`}>
                <KeyRound className="h-5 w-5" strokeWidth={2} />
              </div>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                autoFocus
                {...otpForm.register("otp")}
                placeholder="000000"
                className="flex-1 bg-transparent border-none outline-none text-[18px] tracking-[0.5em] font-bold text-gray-800 dark:text-white placeholder:text-gray-300 dark:placeholder:text-zinc-600"
              />
            </div>

            <div className="flex items-center justify-between pt-4">
              <button 
                type="submit" 
                disabled={otpForm.formState.isSubmitting}
                className="relative flex items-center justify-between w-[150px] h-[44px] bg-[#4f75ff] hover:bg-[#3d65f5] active:bg-[#2e54e6] text-white rounded-full font-bold text-[14px] transition-all shadow-lg shadow-blue-500/30 dark:shadow-blue-500/20 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed pl-5 pr-1.5"
              >
                {otpForm.formState.isSubmitting ? "Wait..." : "Verify"}
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  {otpForm.formState.isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" strokeWidth={2.5} />}
                </div>
              </button>

              <div className="text-[13px] font-semibold text-gray-400 dark:text-zinc-400">
                {resendCooldown > 0 ? (
                  <span>Resend in <span className="text-gray-600 dark:text-zinc-200 font-bold">{resendCooldown}s</span></span>
                ) : (
                  <button 
                    type="button" 
                    onClick={handleResendOtp}
                    className="text-[#3d65f5] dark:text-[#5e88ff] hover:underline font-bold focus:outline-none"
                  >
                    Resend Code
                  </button>
                )}
              </div>
            </div>
          </form>

          <div className="mt-8 flex items-center justify-start">
            <button 
              type="button" 
              onClick={() => {
                setStep(0)
                setError(null)
                setResendCooldown(0)
              }}
              className="text-[13px] font-semibold text-gray-500 dark:text-zinc-400 hover:text-[#3d65f5] dark:hover:text-[#5e88ff] transition-colors"
            >
              ← Change email address
            </button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div className="mb-4">
            <h1 className="text-[32px] sm:text-[36px] font-extrabold tracking-tight text-[#1a1a2e] dark:text-white mb-1 transition-colors">
              New Password
            </h1>
            <p className="text-[14px] sm:text-[15px] font-medium text-gray-400 dark:text-zinc-400 transition-colors">
              Create a new password to secure your account.
            </p>
          </div>

          {error && (
            <div className="mb-3 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 font-medium text-[13px] text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <p className="leading-tight">{error}</p>
            </div>
          )}

          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
            <div className={`relative flex items-center border-b-[1.5px] py-2 transition-all duration-200 ${
              passwordForm.formState.errors.newPassword 
                ? 'border-red-400 dark:border-red-500' 
                : 'border-gray-300 dark:border-zinc-700 hover:border-gray-400 dark:hover:border-zinc-500 focus-within:border-[#3d65f5] dark:focus-within:border-[#5e88ff] focus-within:border-b-2'
            }`}>
              <div className={`${passwordForm.formState.errors.newPassword ? 'text-red-400 dark:text-red-400' : 'text-gray-500 dark:text-zinc-400'} mr-4 transition-colors`}>
                <Lock className="h-5 w-5" strokeWidth={2} />
              </div>
              <input
                id="newPassword"
                type={showPassword ? "text" : "password"}
                autoFocus
                {...passwordForm.register("newPassword")}
                placeholder="New Password"
                className="flex-1 bg-transparent border-none outline-none text-[15px] font-bold text-gray-800 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 placeholder:font-semibold tracking-[0.2em]"
              />
              <button 
                type="button" 
                onMouseDown={(e) => { e.preventDefault(); setShowPassword(true); }}
                onMouseUp={() => setShowPassword(false)}
                onMouseLeave={() => setShowPassword(false)}
                onTouchStart={(e) => { e.preventDefault(); setShowPassword(true); }}
                onTouchEnd={() => setShowPassword(false)}
                onTouchCancel={() => setShowPassword(false)}
                onContextMenu={(e) => e.preventDefault()}
                className={`${passwordForm.formState.errors.newPassword ? 'text-red-400 hover:text-red-600' : 'text-gray-400 hover:text-gray-600 dark:text-zinc-400 dark:hover:text-zinc-200'} focus:outline-none ml-2 transition-colors select-none`}
                aria-label="Hold to reveal password"
                title="Hold to reveal password"
              >
                {showPassword ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
              </button>
            </div>

            <div className={`relative flex items-center border-b-[1.5px] py-2 transition-all duration-200 mt-2 ${
              passwordForm.formState.errors.confirmPassword 
                ? 'border-red-400 dark:border-red-500' 
                : 'border-gray-300 dark:border-zinc-700 hover:border-gray-400 dark:hover:border-zinc-500 focus-within:border-[#3d65f5] dark:focus-within:border-[#5e88ff] focus-within:border-b-2'
            }`}>
              <div className={`${passwordForm.formState.errors.confirmPassword ? 'text-red-400 dark:text-red-400' : 'text-gray-500 dark:text-zinc-400'} mr-4 transition-colors`}>
                <Lock className="h-5 w-5" strokeWidth={2} />
              </div>
              <input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                {...passwordForm.register("confirmPassword")}
                placeholder="Confirm Password"
                className="flex-1 bg-transparent border-none outline-none text-[15px] font-bold text-gray-800 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 placeholder:font-semibold tracking-[0.2em]"
              />
              <button 
                type="button" 
                onMouseDown={(e) => { e.preventDefault(); setShowPassword(true); }}
                onMouseUp={() => setShowPassword(false)}
                onMouseLeave={() => setShowPassword(false)}
                onTouchStart={(e) => { e.preventDefault(); setShowPassword(true); }}
                onTouchEnd={() => setShowPassword(false)}
                onTouchCancel={() => setShowPassword(false)}
                onContextMenu={(e) => e.preventDefault()}
                className={`${passwordForm.formState.errors.confirmPassword ? 'text-red-400 hover:text-red-600' : 'text-gray-400 hover:text-gray-600 dark:text-zinc-400 dark:hover:text-zinc-200'} focus:outline-none ml-2 transition-colors select-none`}
                aria-label="Hold to reveal password"
                title="Hold to reveal password"
              >
                {showPassword ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
              </button>
            </div>

            <div className="flex items-center justify-between pt-4">
              <button 
                type="submit" 
                disabled={passwordForm.formState.isSubmitting}
                className="relative flex items-center justify-between w-[180px] h-[44px] bg-[#4f75ff] hover:bg-[#3d65f5] active:bg-[#2e54e6] text-white rounded-full font-bold text-[14px] transition-all shadow-lg shadow-blue-500/30 dark:shadow-blue-500/20 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed pl-5 pr-1.5"
              >
                {passwordForm.formState.isSubmitting ? "Wait..." : "Save Password"}
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  {passwordForm.formState.isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" strokeWidth={2.5} />}
                </div>
              </button>
            </div>
          </form>
          
          <div className="mt-8 flex items-center justify-start">
            <button 
              type="button" 
              onClick={() => {
                setStep(0)
                setError(null)
                setEmail("")
                setOtp("")
              }}
              className="text-[13px] font-semibold text-gray-500 dark:text-zinc-400 hover:text-[#3d65f5] dark:hover:text-[#5e88ff] transition-colors"
            >
              Cancel reset
            </button>
          </div>
        </>
      )}

      {step === 3 && (
        <div className="flex flex-col items-center justify-center text-center py-8">
          <div className="w-16 h-16 bg-green-100 dark:bg-emerald-950/50 dark:border dark:border-emerald-800/40 rounded-full flex items-center justify-center mb-6 shadow-sm">
            <CheckCircle2 className="h-8 w-8 text-green-500 dark:text-emerald-400" strokeWidth={2.5} />
          </div>
          <h1 className="text-[28px] sm:text-[32px] font-extrabold tracking-tight text-[#1a1a2e] dark:text-white mb-2 transition-colors">
            Password Reset
          </h1>
          <p className="text-[14px] sm:text-[15px] font-medium text-gray-400 dark:text-zinc-400 mb-8 max-w-[280px] transition-colors">
            Your password has been successfully reset. You can now log in with your new password.
          </p>
          <Link 
            href="/login"
            className="flex items-center justify-center w-full max-w-[200px] h-[44px] bg-[#4f75ff] hover:bg-[#3d65f5] active:bg-[#2e54e6] text-white rounded-full font-bold text-[14px] transition-all shadow-lg shadow-blue-500/30 dark:shadow-blue-500/20 active:scale-[0.98]"
          >
            Return to Login
          </Link>
        </div>
      )}

    </div>
  )
}
