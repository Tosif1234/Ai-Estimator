"use client"

import * as React from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Mail, Lock, User, CheckCircle2, ArrowRight, EyeOff, Eye } from "lucide-react"

import { useAuth } from "@/components/providers/auth-provider"
import { apiClient } from "@/lib/api/apiClient"
import { swalToast } from "@/lib/swal"

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long."),
  email: z.string().email("Please enter a valid email address."),
  password: z.string()
    .min(8, "Least 8 characters")
    .regex(/[a-z]/, "Lowercase (a-z)")
    .regex(/[A-Z]/, "Uppercase (A-Z)")
    .regex(/[0-9!@#$%^&*(),.?":{}|<>]/, "Least one number (0-9) or a symbol"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
})

type SignupFormValues = z.infer<typeof signupSchema>

export default function SignupPage() {
  const { login } = useAuth()
  const [error, setError] = React.useState<string | null>(null)
  const [showPassword, setShowPassword] = React.useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting, touchedFields },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    mode: "onChange"
  })

  const nameValue = watch("name", "")
  const emailValue = watch("email", "")
  const passwordValue = watch("password", "")

  const onSubmit = async (data: SignupFormValues) => {
    setError(null)
    try {
      await apiClient.post("/auth/register", {
        name: data.name,
        email: data.email,
        password: data.password,
      })

      const loginResponse = await apiClient.post("/auth/login", {
        email: data.email,
        password: data.password,
      }) as { accessToken: string; refreshToken: string }

      const user = await apiClient.get("/auth/me", {
        headers: { Authorization: `Bearer ${loginResponse.accessToken}` }
      }) as import("@/components/providers/auth-provider").User

      swalToast.success("Account created successfully! Welcome aboard.")
      login(loginResponse.accessToken, loginResponse.refreshToken, user)
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? (err.message || "An error occurred during registration.") : "An error occurred during registration."
      setError(errMsg)
      swalToast.error(errMsg)
    }
  }

  // Password validation checks
  const hasLength = passwordValue.length >= 8
  const hasNumberOrSymbol = /[0-9!@#$%^&*(),.?":{}|<>]/.test(passwordValue)
  const hasLowerAndUpper = /[a-z]/.test(passwordValue) && /[A-Z]/.test(passwordValue)

  return (
    <div className="w-full flex flex-col justify-center h-full">
      
      <div className="mb-4">
        <h1 className="text-[32px] sm:text-[36px] font-extrabold tracking-tight text-[#1a1a2e] dark:text-white mb-1 transition-colors">
          Sign Up
        </h1>
        <p className="text-[14px] sm:text-[15px] font-medium text-gray-400 dark:text-zinc-400 transition-colors">
          Turn complex requirements into precise estimates.
        </p>
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300 font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        
        {/* Name Field */}
        <div className={`relative flex items-center border-b-[1.5px] py-2 transition-all duration-200 ${
          errors.name 
            ? 'border-red-400 dark:border-red-500' 
            : 'border-gray-300 dark:border-zinc-700 hover:border-gray-400 dark:hover:border-zinc-500 focus-within:border-[#3d65f5] dark:focus-within:border-[#5e88ff] focus-within:border-b-2'
        }`}>
          <div className={`${errors.name ? 'text-red-400 dark:text-red-400' : 'text-gray-500 dark:text-zinc-400'} mr-4 transition-colors`}>
            <User className="h-5 w-5" strokeWidth={2} />
          </div>
          <input
            id="name"
            type="text"
            {...register("name")}
            placeholder="Full Name"
            className="flex-1 bg-transparent border-none outline-none text-[15px] font-bold text-gray-800 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 placeholder:font-semibold"
          />
          {touchedFields.name && nameValue && !errors.name && (
            <CheckCircle2 className="h-5 w-5 text-[#34d399] ml-2" strokeWidth={2.5} />
          )}
        </div>
        
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
            onMouseDown={(e) => { e.preventDefault(); setShowPassword(true); }}
            onMouseUp={() => setShowPassword(false)}
            onMouseLeave={() => setShowPassword(false)}
            onTouchStart={(e) => { e.preventDefault(); setShowPassword(true); }}
            onTouchEnd={() => setShowPassword(false)}
            onTouchCancel={() => setShowPassword(false)}
            onContextMenu={(e) => e.preventDefault()}
            className={`${errors.password ? 'text-red-400 hover:text-red-600' : 'text-gray-400 hover:text-gray-600 dark:text-zinc-400 dark:hover:text-zinc-200'} focus:outline-none ml-2 transition-colors select-none`}
            aria-label="Hold to reveal password"
            title="Hold to reveal password"
          >
            {showPassword ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
          </button>
        </div>

        {/* Password Checklist */}
        <div className="pl-9 space-y-1.5 mt-2">
          <div className={`flex items-center text-[12px] font-semibold transition-colors ${hasLength ? 'text-[#34d399]' : 'text-gray-400 dark:text-zinc-500'}`}>
            <span className="w-1 h-1 rounded-full bg-current mr-2"></span>
            Least 8 characters
          </div>
          <div className={`flex items-center text-[12px] font-semibold transition-colors ${hasNumberOrSymbol ? 'text-[#34d399]' : 'text-gray-400 dark:text-zinc-500'}`}>
            <span className="w-1 h-1 rounded-full bg-current mr-2"></span>
            Least one number (0-9) or a symbol
          </div>
          <div className={`flex items-center text-[12px] font-semibold transition-colors ${hasLowerAndUpper ? 'text-[#34d399]' : 'text-gray-400 dark:text-zinc-500'}`}>
            <span className="w-1 h-1 rounded-full bg-current mr-2"></span>
            Lowercase (a-z) and uppercase (A-Z)
          </div>
        </div>

        {/* Confirm Password Field */}
        <div className={`relative flex items-center border-b-[1.5px] py-2 transition-all duration-200 mt-2 ${
          errors.confirmPassword 
            ? 'border-red-400 dark:border-red-500' 
            : 'border-gray-300 dark:border-zinc-700 hover:border-gray-400 dark:hover:border-zinc-500 focus-within:border-[#3d65f5] dark:focus-within:border-[#5e88ff] focus-within:border-b-2'
        }`}>
          <div className={`${errors.confirmPassword ? 'text-red-400 dark:text-red-400' : 'text-gray-500 dark:text-zinc-400'} mr-4 transition-colors`}>
            <Lock className="h-5 w-5" strokeWidth={2} />
          </div>
          <input
            id="confirmPassword"
            type={showPassword ? "text" : "password"}
            {...register("confirmPassword")}
            placeholder="Re-Type Password"
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
            className={`${errors.confirmPassword ? 'text-red-400 hover:text-red-600' : 'text-gray-400 hover:text-gray-600 dark:text-zinc-400 dark:hover:text-zinc-200'} focus:outline-none ml-2 transition-colors select-none`}
            aria-label="Hold to reveal password"
            title="Hold to reveal password"
          >
            {showPassword ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
          </button>
        </div>

        {/* Actions Row */}
        <div className="flex items-center justify-between pt-3">
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="relative flex items-center justify-between w-[140px] h-[44px] bg-[#4f75ff] hover:bg-[#3d65f5] active:bg-[#2e54e6] text-white rounded-full font-bold text-[14px] transition-all shadow-lg shadow-blue-500/30 dark:shadow-blue-500/20 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed pl-5 pr-1.5"
          >
            {isSubmitting ? "Wait..." : "Sign Up"}
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" strokeWidth={2.5} />}
            </div>
          </button>

          <div className="flex items-center space-x-3">
            <span className="text-[12px] font-semibold text-gray-300 dark:text-zinc-600 uppercase tracking-wider">Or</span>
            <button 
              type="button" 
              className="w-9 h-9 rounded-full bg-white dark:bg-[#161c30] dark:border dark:border-white/10 shadow-[0_5px_15px_rgba(0,0,0,0.08)] dark:shadow-[0_5px_15px_rgba(0,0,0,0.3)] flex items-center justify-center hover:scale-105 dark:hover:bg-[#1f2742] transition-all"
              aria-label="Sign up with Facebook"
            >
              <svg className="w-4 h-4 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </button>
            <button 
              type="button" 
              className="w-9 h-9 rounded-full bg-white dark:bg-[#161c30] dark:border dark:border-white/10 shadow-[0_5px_15px_rgba(0,0,0,0.08)] dark:shadow-[0_5px_15px_rgba(0,0,0,0.3)] flex items-center justify-center hover:scale-105 dark:hover:bg-[#1f2742] transition-all"
              aria-label="Sign up with Google"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            </button>
          </div>
        </div>

      </form>

      {/* Footer */}
      <div className="mt-6 flex items-center justify-start">
        <div className="text-[13px] font-semibold text-gray-500 dark:text-zinc-400 transition-colors">
          Already a member? <Link href="/login" className="text-[#3d65f5] dark:text-[#5e88ff] hover:underline font-bold ml-1">Sign in</Link>
        </div>
      </div>

    </div>
  )
}
