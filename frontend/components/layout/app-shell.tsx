"use client"

import * as React from "react"
import { Sidebar } from "./sidebar"
import { Topbar } from "./topbar"
import { ClientShell } from "./client-shell"
import { useAuth } from "@/components/providers/auth-provider"

import { usePathname } from "next/navigation"

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const { user } = useAuth()
  const pathname = usePathname()
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false)

  const handleOpenMobileSidebar = React.useCallback(() => {
    setMobileSidebarOpen(true)
  }, [])

  const handleCloseMobileSidebar = React.useCallback(() => {
    setMobileSidebarOpen(false)
  }, [])

  React.useEffect(() => {
    setMobileSidebarOpen(false)
  }, [pathname])
  
  if (!user) return null

  // CLIENT users receive the dedicated, sidebar-free Client Workspace Shell
  if (user.role === "CLIENT") {
    return <ClientShell user={user}>{children}</ClientShell>
  }

  // ADMIN users receive the Admin Console layout with responsive mobile drawer support
  return (
    <div className="flex min-h-screen w-full bg-muted/20">
      <Sidebar 
        role={user.role} 
        mobileOpen={mobileSidebarOpen} 
        onMobileClose={handleCloseMobileSidebar} 
      />
      <div className="flex flex-1 flex-col min-w-0">
        <Topbar 
          user={user} 
          onOpenMobileSidebar={handleOpenMobileSidebar} 
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-[1440px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
