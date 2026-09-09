"use client"

import * as React from "react"
import Link from "next/link"
import { ClientTopNav } from "./client-top-nav"
import { User } from "@/components/providers/auth-provider"

interface ClientShellProps {
  user: User
  children: React.ReactNode
}

export function ClientShell({ user, children }: ClientShellProps) {
  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafd] dark:bg-[#080c15] bg-[linear-gradient(to_right,#e2e8f080_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f080_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1e293b40_1px,transparent_1px),linear-gradient(to_bottom,#1e293b40_1px,transparent_1px)] bg-[size:32px_32px] text-slate-900 dark:text-slate-100 transition-colors">
      <ClientTopNav user={user} />
      
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-10 py-5 sm:py-7 lg:py-9">
        {children}
      </main>

      {/* Production Client Footer */}
      <footer className="border-t border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-[#060910]/90 backdrop-blur-xs py-7 mt-12 transition-colors">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-10 flex flex-col sm:flex-row items-center justify-between gap-5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-indigo-600 text-white text-[9px] font-bold shadow-2xs">
              AI
            </div>
            <p>© {new Date().getFullYear()} AI Estimator Platform. All rights reserved.</p>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-xs sm:text-[13px]">
            <Link href="/client/help" className="hover:text-slate-900 dark:hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link href="/client/help" className="hover:text-slate-900 dark:hover:text-white transition-colors">
              Terms of Engagement
            </Link>
            <Link href="/client/help" className="hover:text-slate-900 dark:hover:text-white transition-colors">
              Security &amp; SOC2
            </Link>
            <Link href="/client/help" className="hover:text-slate-900 dark:hover:text-white transition-colors">
              Enterprise Support
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
