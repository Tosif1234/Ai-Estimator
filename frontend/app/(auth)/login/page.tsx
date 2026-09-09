"use client"

import * as React from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Mail, Lock, CheckCircle2, ArrowRight, EyeOff, Eye, AlertCircle } from "lucide-react"

import { useAuth } from "@/components/providers/auth-provider"
import { apiClient } from "@/lib/api/apiClient"
import { swalToast } from "@/lib/swal"

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const { login, sessionExpiredMessage, clearSessionExpiredMessage } = useAuth()
  const [error, setError] = React.useState<string | null>(null)
  const [hasDismissedNotice, setHasDismissedNotice] = React.useState(false)
  const [showPassword, setShowPassword] = React.useState(false)

  // Derived expired notice without triggering cascading render effect
  const isQueryExpired = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("expired") === "true"
  const expiredNotice = !hasDismissedNotice ? (sessionExpiredMessage || (isQueryExpired ? "Your session has expired. Please sign in again." : null)) : null

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting, touchedFields },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: "onChange"
  })

  const emailValue = watch("email", "")

  const onSubmit = async (data: LoginFormValues) => {
    setError(null)
    setHasDismissedNotice(true)
    clearSessionExpiredMessage()
    try {
      const response = await apiClient.post("/auth/login", data) as {
        accessToken: string
        refreshToken: string
      }

      const user = await apiClient.get("/auth/me", {
        headers: { Authorization: `Bearer ${response.accessToken}` }
      }) as import("@/components/providers/auth-provider").User

      swalToast.success("Welcome back! Signing you in...")
      login(response.accessToken, response.refreshToken, user)
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? (err.message || "Invalid email or password.") : "An error occurred during login."
      setError(errMsg)
      swalToast.error(errMsg)
    }
  }

  return (
    <div className="w-full flex flex-col justify-center h-full">

      <div className="mb-4">
        <h1 className="text-[32px] sm:text-[36px] font-extrabold tracking-tight text-[#1a1a2e] dark:text-white mb-1 transition-colors">
          Sign In
        </h1>
        <p className="text-[14px] sm:text-[15px] font-medium text-gray-400 dark:text-zinc-400 transition-colors">
          Access your AI Estimator dashboard securely.
        </p>
      </div>

      {(expiredNotice || error) && (
        <div className={`mb-3 flex items-start gap-3 rounded-lg border p-3 font-medium text-[13px] ${
          expiredNotice 
            ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300' 
            : 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300'
        }`}>
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <p className="leading-tight">
            {expiredNotice || error}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        <div className="space-y-3">
          {/* Email Field */}
          <div className={`relative flex items-center border-b-[1.5px] py-2 transition-all duration-200 ${
            errors.email 
              ? 'border-red-400 dark:border-red-500' 
              : 'border-gray-300 dark:border-zinc-700 hover:border-gray-400 dark:hover:border-zinc-500 focus-within:border-[#3d65f5] dark:focus-within:border-[#5e88ff] focus-within:border-b-2'
          }`}>
            <div className={`${errors.email ? 'text-red-400 dark:text-red-400' : 'text-gray-500 dark:text-zinc-400'} mr-4 transition-colors`}>
              <Mail className="h-5 w-5" strokeWidth={2} />
            </div>
            <input
              id="email"
              type="email"
              {...register("email")}
              placeholder="Email Address"
              className="flex-1 bg-transparent border-none outline-none text-[15px] font-bold text-gray-800 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 placeholder:font-semibold"
            />
            {touchedFields.email && emailValue && !errors.email && (
              <CheckCircle2 className="h-5 w-5 text-[#34d399] ml-2" strokeWidth={2.5} />
            )}
          </div>

          {/* Password Field */}
          <div className={`relative flex items-center border-b-[1.5px] py-2 transition-all duration-200 ${
            errors.password 
              ? 'border-red-400 dark:border-red-500' 
              : 'border-gray-300 dark:border-zinc-700 hover:border-gray-400 dark:hover:border-zinc-500 focus-within:border-[#3d65f5] dark:focus-within:border-[#5e88ff] focus-within:border-b-2'
          }`}>
            <div className={`${errors.password ? 'text-red-400 dark:text-red-400' : 'text-gray-500 dark:text-zinc-400'} mr-4 transition-colors`}>
              <Lock className="h-5 w-5" strokeWidth={2} />
            </div>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              {...register("password")}
              placeholder="Password"
              className="flex-1 bg-transparent border-none outline-none text-[15px] font-bold text-gray-800 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 placeholder:font-semibold tracking-[0.2em]"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className={`${errors.password ? 'text-red-400 hover:text-red-600' : 'text-gray-400 hover:text-gray-600 dark:text-zinc-400 dark:hover:text-zinc-200'} focus:outline-none ml-2 transition-colors`}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
            </button>
          </div>

          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center space-x-2.5 cursor-pointer group">
              <div className="relative flex items-center justify-center">
                <input 
                  type="checkbox" 
                  className="peer appearance-none w-4 h-4 border-2 border-gray-300 dark:border-zinc-600 dark:bg-zinc-800/80 rounded-[4px] checked:bg-[#3d65f5] dark:checked:bg-[#5e88ff] checked:border-[#3d65f5] dark:checked:border-[#5e88ff] transition-all cursor-pointer" 
                />
                <CheckIcon className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" />
              </div>
              <span className="text-[13px] font-bold text-gray-400 group-hover:text-gray-600 dark:text-zinc-400 dark:group-hover:text-zinc-200 transition-colors">
                Remember me
              </span>
            </label>
            <Link
              href="/forgot-password"
              className="text-[13px] font-bold text-[#3d65f5] dark:text-[#5e88ff] hover:underline transition-colors focus:outline-none"
            >
              Forgot Password?
            </Link>
          </div>
        </div>

        {/* Actions Row */}
        <div className="flex items-center justify-between pt-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="relative flex items-center justify-between w-[140px] h-[44px] bg-[#4f75ff] hover:bg-[#3d65f5] active:bg-[#2e54e6] text-white rounded-full font-bold text-[14px] transition-all shadow-lg shadow-blue-500/30 dark:shadow-blue-500/20 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed pl-5 pr-1.5"
          >
            {isSubmitting ? "Wait..." : "Sign In"}
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" strokeWidth={2.5} />}
            </div>
          </button>

          <div className="flex items-center space-x-3">
            <span className="text-[12px] font-semibold text-gray-300 dark:text-zinc-600 uppercase tracking-wider">Or</span>
            <button 
              type="button" 
              className="w-9 h-9 rounded-full bg-white dark:bg-[#161c30] dark:border dark:border-white/10 shadow-[0_5px_15px_rgba(0,0,0,0.08)] dark:shadow-[0_5px_15px_rgba(0,0,0,0.3)] flex items-center justify-center hover:scale-105 dark:hover:bg-[#1f2742] transition-all"
              aria-label="Sign in with Facebook"
            >
              <svg className="w-4 h-4 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
            </button>
            <button 
              type="button" 
              className="w-9 h-9 rounded-full bg-white dark:bg-[#161c30] dark:border dark:border-white/10 shadow-[0_5px_15px_rgba(0,0,0,0.08)] dark:shadow-[0_5px_15px_rgba(0,0,0,0.3)] flex items-center justify-center hover:scale-105 dark:hover:bg-[#1f2742] transition-all"
              aria-label="Sign in with Google"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
            </button>
          </div>
        </div>

      </form>

      {/* Footer */}
      <div className="mt-6 flex items-center justify-start">
        <div className="text-[13px] font-semibold text-gray-500 dark:text-zinc-400 transition-colors">
          New here? <Link href="/signup" className="text-[#3d65f5] dark:text-[#5e88ff] hover:underline font-bold ml-1">Sign up</Link>
        </div>
      </div>

    </div>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}
