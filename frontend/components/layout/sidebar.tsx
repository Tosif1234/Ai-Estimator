"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn, getAvatarUrl } from "@/lib/utils"
import { 
  LayoutDashboard, 
  FolderKanban, 
  Users, 
  Brain, 
  ChevronLeft,
  ChevronRight,
  LineChart,
  LogOut,
  User as UserIcon,
  HelpCircle,
  X
} from "lucide-react"
import { Role, useAuth, getWorkspaceLabel } from "@/components/providers/auth-provider"

interface SidebarProps {
  role: Role
  mobileOpen?: boolean
  onMobileClose?: () => void
}

const adminRoutes = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Projects", href: "/admin/projects", icon: FolderKanban },
  { name: "Users", href: "/admin/users", icon: Users },
  { name: "Estimates", href: "/admin/estimates", icon: LineChart },
]

export function Sidebar({ role, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = React.useState(false)
  const [avatarError, setAvatarError] = React.useState(false)
  const { user, logout } = useAuth()

  // Central user.role is the single source of truth
  const currentRole = user?.role || role
  const isClient = currentRole === "CLIENT"

  React.useEffect(() => {
    setAvatarError(false)
  }, [user?.avatarUrl])

  // Automatically close mobile sidebar only when pathname actually changes
  const prevPathnameRef = React.useRef(pathname)
  React.useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname
      onMobileClose?.()
    }
  }, [pathname])

  const clientWorkRoutes = [
    { name: "My Projects", href: "/client/projects", icon: FolderKanban },
  ]

  const clientAccountRoutes = [
    { name: "Profile", href: "/client/profile", icon: UserIcon },
    { name: "Help & Support", href: "/client/help", icon: HelpCircle },
  ]

  const getInitials = (name?: string | null) => {
    if (!name || !name.trim()) return "C"
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return parts[0].slice(0, 2).toUpperCase()
  }

  const renderNavLinks = (isMobile = false) => {
    if (isClient) {
      return (
        <>
          <div>
            {(!collapsed || isMobile) && (
              <div className="px-4 mb-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
                  My Work
                </p>
              </div>
            )}
            <nav className="space-y-1 px-2.5">
              {clientWorkRoutes.map((route) => {
                const isActive = pathname === route.href || pathname.startsWith(route.href + '/')
                const Icon = route.icon

                return (
                  <Link
                    key={route.href}
                    href={route.href}
                    onClick={() => isMobile && onMobileClose?.()}
                    className={cn(
                      "group flex items-center rounded-xl px-3 py-2.5 text-xs font-medium transition-colors relative min-h-[44px]",
                      isActive 
                        ? "bg-accent text-accent-foreground font-semibold" 
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                      collapsed && !isMobile && "justify-center px-0 py-2.5"
                    )}
                    title={collapsed && !isMobile ? route.name : undefined}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0", (!collapsed || isMobile) ? "mr-3" : "", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                    {(!collapsed || isMobile) && <span className="truncate">{route.name}</span>}
                  </Link>
                )
              })}
            </nav>
          </div>

          <div>
            {(!collapsed || isMobile) && (
              <div className="px-4 mb-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
                  Account
                </p>
              </div>
            )}
            <nav className="space-y-1 px-2.5">
              {clientAccountRoutes.map((route) => {
                const isActive = pathname === route.href || pathname.startsWith(route.href + '/')
                const Icon = route.icon

                return (
                  <Link
                    key={route.href}
                    href={route.href}
                    onClick={() => isMobile && onMobileClose?.()}
                    className={cn(
                      "group flex items-center rounded-xl px-3 py-2.5 text-xs font-medium transition-colors relative min-h-[44px]",
                      isActive 
                        ? "bg-accent text-accent-foreground font-semibold" 
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                      collapsed && !isMobile && "justify-center px-0 py-2.5"
                    )}
                    title={collapsed && !isMobile ? route.name : undefined}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0", (!collapsed || isMobile) ? "mr-3" : "", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                    {(!collapsed || isMobile) && <span className="truncate">{route.name}</span>}
                  </Link>
                )
              })}
            </nav>
          </div>
        </>
      )
    }

    return (
      <div>
        {(!collapsed || isMobile) && (
          <div className="px-4 mb-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
              Management
            </p>
          </div>
        )}
        <nav className="space-y-1 px-3">
          {adminRoutes.map((route) => {
            const isRootRoute = route.href === "/admin"
            const isActive = isRootRoute 
              ? pathname === route.href 
              : pathname === route.href || pathname.startsWith(route.href + '/')
            const Icon = route.icon

            return (
              <Link
                key={route.href}
                href={route.href}
                onClick={() => isMobile && onMobileClose?.()}
                className={cn(
                  "group flex items-center rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors relative min-h-[44px]",
                  isActive 
                    ? "bg-accent text-accent-foreground font-semibold" 
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  collapsed && !isMobile && "justify-center px-0 py-2.5"
                )}
                title={collapsed && !isMobile ? route.name : undefined}
              >
                <Icon className={cn("h-[18px] w-[18px] shrink-0", (!collapsed || isMobile) ? "mr-3" : "", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                {(!collapsed || isMobile) && <span className="truncate">{route.name}</span>}
              </Link>
            )
          })}
        </nav>
      </div>
    )
  }

  const renderFooter = (isMobile = false) => (
    <div className="border-t border-border p-3 space-y-1.5">
      {user && (!collapsed || isMobile) && (
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold overflow-hidden">
            {user.avatarUrl && !avatarError ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={getAvatarUrl(user.avatarUrl) || ""}
                alt={user.name || "User"}
                className="h-full w-full object-cover"
                onError={() => setAvatarError(true)}
              />
            ) : (
              getInitials(user.name)
            )}
          </div>
          <div className="min-w-0 flex-1 truncate">
            <p className="text-sm font-semibold text-foreground truncate">{user.name || (user.role === "ADMIN" ? "Admin" : "Client")}</p>
            <p className="text-xs text-muted-foreground truncate">{getWorkspaceLabel(user.role)}</p>
          </div>
        </div>
      )}
      <button
        onClick={() => {
          if (isMobile) onMobileClose?.()
          logout()
        }}
        className={cn(
          "flex w-full items-center rounded-xl p-2.5 text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors min-h-[44px]",
          collapsed && !isMobile ? "justify-center" : "justify-start"
        )}
        title="Sign out"
      >
        <LogOut className={cn("h-4 w-4 shrink-0", (!collapsed || isMobile) && "mr-3")} />
        {(!collapsed || isMobile) && <span>Sign out</span>}
      </button>
    </div>
  )

  return (
    <>
      {/* MOBILE DRAWER BACKDROP (< lg) */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity lg:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* MOBILE OFFCANVAS DRAWER (< lg) */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-full w-72 max-w-[calc(100vw-3rem)] flex-col border-r border-border bg-card shadow-2xl transition-transform duration-300 ease-in-out lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full pointer-events-none"
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4">
          <Link 
            href={isClient ? "/client/projects" : "/admin"} 
            onClick={onMobileClose}
            className="flex items-center gap-3 min-w-0"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground font-semibold shadow-2xs">
              <Brain className="h-5 w-5" />
            </div>
            <div className="flex flex-col truncate">
              <span className="font-semibold text-[15px] tracking-tight text-foreground leading-tight">
                AI Estimator
              </span>
              <span className="text-[11px] uppercase font-bold tracking-wider text-muted-foreground">
                {isClient ? "Client Portal" : "Admin Console"}
              </span>
            </div>
          </Link>
          <button
            type="button"
            onClick={onMobileClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Close navigation menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-5 space-y-6">
          {renderNavLinks(true)}
        </div>

        {renderFooter(true)}
      </aside>

      {/* DESKTOP STICKY SIDEBAR (Hidden on mobile/tablet < lg) */}
      <aside 
        className={cn(
          "hidden lg:flex sticky top-0 h-screen shrink-0 flex-col border-r border-border bg-card transition-all duration-200 ease-in-out z-20",
          collapsed ? "w-18" : "w-64"
        )}
      >
        <div className={cn("flex h-16 shrink-0 items-center border-b border-border px-4", collapsed ? "justify-center px-0" : "justify-between")}>
          <Link href={isClient ? "/client/projects" : "/admin"} className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground font-semibold shadow-2xs">
              <Brain className="h-5 w-5" />
            </div>
            {!collapsed && (
              <div className="flex flex-col truncate">
                <span className="font-semibold text-[15px] tracking-tight text-foreground leading-tight">
                  AI Estimator
                </span>
                <span className="text-[11px] uppercase font-bold tracking-wider text-muted-foreground">
                  {isClient ? "Client Portal" : "Admin Console"}
                </span>
              </div>
            )}
          </Link>
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title="Collapse sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto py-5 space-y-6">
          {renderNavLinks(false)}
        </div>

        {collapsed && (
          <div className="p-2 border-t border-border flex justify-center">
            <button
              onClick={() => setCollapsed(false)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title="Expand sidebar"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {renderFooter(false)}
      </aside>
    </>
  )
}
