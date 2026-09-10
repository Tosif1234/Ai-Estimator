"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { useTheme } from "next-themes"
import { 
  Sparkles,
  Sun, 
  Moon, 
  LogOut, 
  User as UserIcon, 
  HelpCircle, 
  ChevronDown, 
  Bell,
  Menu,
  X,
} from "lucide-react"

import { User, useAuth, getWorkspaceLabel } from "@/components/providers/auth-provider"
import { Button } from "@/components/ui/button"
import { cn, getAvatarUrl } from "@/lib/utils"

interface ClientTopNavProps {
  user: User
}

function ClientTopNavInner({ user: initialUser }: ClientTopNavProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const filter = searchParams?.get("filter")
  const { theme, setTheme } = useTheme()
  const { user: authUser, logout } = useAuth()
  const user = authUser || initialUser

  const [menuOpen, setMenuOpen] = React.useState(false)
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false)
  const [avatarError, setAvatarError] = React.useState(false)
  const menuRef = React.useRef<HTMLDivElement>(null)

  // Reset avatar error when avatar URL updates
  React.useEffect(() => {
    setAvatarError(false)
  }, [user?.avatarUrl])

  // Close account dropdown on outside click
  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClick)
    }
    return () => document.removeEventListener("mousedown", handleClick)
  }, [menuOpen])

  const displayName = user?.name?.trim() || user?.email?.split('@')[0] || "Client User"
  const resolvedAvatarUrl = getAvatarUrl(user?.avatarUrl)
  
  // Calculate initials for avatar fallback
  const initials = React.useMemo(() => {
    if (!displayName) return "CL"
    const parts = displayName.trim().split(/\s+/)
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return displayName.slice(0, 2).toUpperCase()
  }, [displayName])

  // Determine active tab matching user's reference image
  const isHomeActive = pathname === "/client"
  const isHelpActive = pathname === "/client/help"
  const isActionNeededActive = pathname === "/client/projects" && filter === "needs_action"
  const isEstimatesActive = pathname === "/client/projects" && filter === "ready"
  const isProjectsActive = pathname.startsWith("/client/projects") && !isActionNeededActive && !isEstimatesActive

  const navItems = [
    { href: "/client", label: "Home", isActive: isHomeActive },
    { href: "/client/projects", label: "My Projects", isActive: isProjectsActive },
    { href: "/client/projects?filter=needs_action", label: "Action Needed", isActive: isActionNeededActive },
    { href: "/client/projects?filter=ready", label: "Estimates & Scope", isActive: isEstimatesActive },
    { href: "/client/help", label: "Help & Guide", isActive: isHelpActive },
  ]

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-[#080c15]/95 backdrop-blur-md transition-colors">
      <div className="mx-auto flex h-16 sm:h-[72px] w-full max-w-[1560px] items-center justify-between px-4 sm:px-6 lg:px-8 xl:px-8 2xl:px-12 gap-3 sm:gap-4">
        
        {/* LEFT: Logo + Badge */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <Link 
            href="/client" 
            className="flex items-center gap-2 sm:gap-2.5 transition-opacity hover:opacity-90 shrink-0"
            title="AI Estimator Home"
          >
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 text-white font-semibold shadow-xs">
              <Sparkles className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
            </div>
            <span className="font-bold text-[18px] sm:text-[19px] lg:text-[20px] text-slate-900 dark:text-white leading-tight whitespace-nowrap">
              AI Estimator
            </span>
          </Link>

          {/* Portal badge synchronized with actual role */}
          <span className="hidden sm:inline-flex items-center px-2.5 h-[26px] sm:h-[28px] rounded-2xl text-[10px] sm:text-[11px] font-semibold tracking-wide uppercase bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100/90 dark:border-indigo-900/60 shrink-0 whitespace-nowrap">
            {user?.role === "ADMIN" ? "ADMIN CONSOLE" : "CLIENT PORTAL"}
          </span>
        </div>

        {/* CENTER / MAIN NAV PILLS (Refined subtle rounded tabs) */}
        <nav className="hidden xl:flex items-center gap-1 bg-slate-100/90 dark:bg-[#0e1322] p-1 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shrink-0 shadow-2xs">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center justify-center h-8.5 xl:h-9 px-3.5 xl:px-4 rounded-xl text-[13px] xl:text-[14px] transition-all whitespace-nowrap shrink-0",
                item.isActive
                  ? "bg-indigo-600 text-white shadow-xs font-semibold"
                  : "font-medium text-slate-600 hover:text-slate-900 hover:bg-white/80 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/60"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* RIGHT: Help, Theme, Bell & User Profile (Matches user image: squircle buttons & gradient avatar) */}
        <div className="flex items-center gap-2 sm:gap-2.5 lg:gap-3 shrink-0">
          {/* 1. Help button (squircle rounded-xl box) */}
          <Link
            href="/client/help"
            className="hidden sm:flex h-10 w-10 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 dark:bg-[#0e1322] dark:border-slate-800/80 dark:hover:bg-slate-800 items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors shrink-0"
            title="Help & Guide"
          >
            <HelpCircle className="h-[18px] w-[18px]" />
          </Link>

          {/* 2. Theme toggle button (squircle rounded-xl box with amber sun) */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="hidden sm:flex h-10 w-10 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 dark:bg-[#0e1322] dark:border-slate-800/80 dark:hover:bg-slate-800 text-amber-500 hover:text-amber-600 dark:text-amber-400 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 shrink-0"
            title="Toggle theme"
          >
            <Sun className="h-[18px] w-[18px] text-amber-500 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[18px] w-[18px] text-indigo-400 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          {/* 3. Notification bell (squircle rounded-xl box with blue dot badge) */}
          <button 
            onClick={() => {}}
            className="relative h-10 w-10 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 dark:bg-[#0e1322] dark:border-slate-800/80 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors shrink-0"
            title="Notifications"
            aria-label="Notifications"
          >
            <Bell className="h-[18px] w-[18px]" />
            <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-indigo-600 ring-2 ring-white dark:ring-[#0e1322]" />
          </button>

          {/* 4. User Profile Dropdown */}
          <div className="relative shrink-0" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2.5 p-1 sm:px-2 rounded-xl hover:bg-slate-100/70 dark:hover:bg-slate-800/70 transition-colors focus:outline-none min-h-[40px] shrink-0"
              aria-label="User account menu"
              aria-expanded={menuOpen}
            >
              <div className="relative flex h-9 w-9 lg:h-10 lg:w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 text-white text-xs sm:text-[14px] font-bold overflow-hidden shadow-xs ring-1 ring-slate-200/60 dark:ring-slate-700">
                {resolvedAvatarUrl && !avatarError ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={resolvedAvatarUrl}
                    alt={displayName}
                    className="h-full w-full object-cover"
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <div className="hidden lg:block text-left whitespace-nowrap shrink-0">
                <span className="block text-[14px] font-semibold text-slate-900 dark:text-white leading-tight whitespace-nowrap">
                  {displayName}
                </span>
                <span className="block text-[12px] text-slate-500 dark:text-slate-400 font-normal leading-none mt-0.5 whitespace-nowrap">
                  {getWorkspaceLabel(user?.role)}
                </span>
              </div>
              <ChevronDown className={cn(
                "h-4 w-4 text-slate-400 transition-transform duration-200 hidden lg:block",
                menuOpen && "rotate-180"
              )} />
            </button>

            {/* Dropdown Menu */}
            {menuOpen && (
              <div className="absolute right-0 mt-2.5 w-64 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0e1322] shadow-xl py-2 z-50 animate-in fade-in-50 zoom-in-95">
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{displayName}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{user?.email}</p>
                  <div className="mt-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50">
                      {user?.role === "ADMIN" ? "Admin Account" : "Client Account"}
                    </span>
                  </div>
                </div>

                <div className="p-1.5 space-y-1">
                  <Link
                    href="/client/profile"
                    className="flex w-full items-center px-3 py-2 rounded-lg text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium transition-colors"
                    onClick={() => setMenuOpen(false)}
                  >
                    <UserIcon className="mr-2.5 h-4 w-4 text-slate-400" />
                    Profile Settings
                  </Link>
                  <Link
                    href="/client/help"
                    className="flex w-full items-center px-3 py-2 rounded-lg text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium transition-colors"
                    onClick={() => setMenuOpen(false)}
                  >
                    <HelpCircle className="mr-2.5 h-4 w-4 text-slate-400" />
                    Help &amp; Support
                  </Link>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 p-1.5">
                  <button
                    onClick={() => {
                      setMenuOpen(false)
                      logout()
                    }}
                    className="flex w-full items-center px-3 py-2 rounded-lg text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 font-medium transition-colors"
                  >
                    <LogOut className="mr-2.5 h-4 w-4 text-red-500" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile & Tablet Menu Toggle */}
          <div className="xl:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="h-10 w-10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileNavOpen}
            >
              {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* MOBILE / TABLET NAV DRAWER */}
      {mobileNavOpen && (
        <div className="xl:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#080c15] px-4 py-3.5 space-y-3 shadow-lg">
          <div className="space-y-1.5">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileNavOpen(false)}
                className={cn(
                  "flex items-center justify-between h-11 px-4 rounded-xl text-[14px] font-medium transition-colors",
                  item.isActive
                    ? "bg-indigo-600 text-white font-semibold shadow-xs"
                    : "text-slate-700 dark:text-slate-200 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
              >
                <span>{item.label}</span>
                {item.isActive && <span className="h-2 w-2 rounded-full bg-white shrink-0" />}
              </Link>
            ))}
          </div>

          {/* Quick theme toggle & support in mobile drawer */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-xs font-medium"
            >
              <Sun className="h-4 w-4 text-amber-500 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 text-blue-400 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span>{theme === "dark" ? "Dark Mode" : "Light Mode"}</span>
            </button>

            <Link
              href="/client/help"
              onClick={() => setMobileNavOpen(false)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-xs font-medium"
            >
              <HelpCircle className="h-4 w-4" />
              <span>Documentation</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}

export function ClientTopNav(props: ClientTopNavProps) {
  return (
    <React.Suspense fallback={
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 h-16 sm:h-[72px]" />
    }>
      <ClientTopNavInner {...props} />
    </React.Suspense>
  )
}
