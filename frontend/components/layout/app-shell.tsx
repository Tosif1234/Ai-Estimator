"use client"

import * as React from "react"
import { Sidebar } from "./sidebar"
import { Topbar } from "./topbar"
import { ClientShell } from "./client-shell"
import { useAuth } from "@/components/providers/auth-provider"

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const { user } = useAuth()
  
  if (!user) return null

  // CLIENT users receive the dedicated, sidebar-free Client Workspace Shell
  if (user.role === "CLIENT") {
    return <ClientShell user={user}>{children}</ClientShell>
  }

  // ADMIN users receive the original Admin Console layout (100% untouched)
  return (
    <div className="flex min-h-screen w-full bg-muted/20">
      <Sidebar role={user.role} />
      <div className="flex flex-1 flex-col min-w-0">
        <Topbar user={user} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-[1440px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
