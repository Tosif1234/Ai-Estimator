"use client"

import * as React from "react"
import Link from "next/link"
import { AlertCircle, ArrowLeft } from "lucide-react"

export default function ResetPasswordFallbackPage() {
  return (
    <div className="w-full flex flex-col justify-center items-center text-center h-full py-4">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
        <AlertCircle className="h-7 w-7" />
      </div>
      <h1 className="text-[28px] sm:text-[32px] font-extrabold tracking-tight text-[#1a1a2e] dark:text-white mb-2 transition-colors">
        Session Inactive
      </h1>
      <p className="text-[14px] sm:text-[15px] font-medium text-gray-400 dark:text-zinc-400 mb-8 max-w-[320px] transition-colors leading-relaxed">
        Your password reset session is not active or has expired. Please initiate a new password reset request.
      </p>
      
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-[320px]">
        <Link 
          href="/forgot-password"
          className="flex-1 flex items-center justify-center h-[44px] bg-[#4f75ff] hover:bg-[#3d65f5] active:bg-[#2e54e6] text-white rounded-full font-bold text-[14px] transition-all shadow-lg shadow-blue-500/30 dark:shadow-blue-500/20 active:scale-[0.98]"
        >
          Reset Password
        </Link>
        <Link 
          href="/login"
          className="flex items-center justify-center px-4 h-[44px] rounded-full border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 font-semibold text-[13px] hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Login
        </Link>
      </div>
    </div>
  )
}
