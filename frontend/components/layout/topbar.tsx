"use client"

import * as React from "react"
import Link from "next/link"
import { useTheme } from "next-themes"
import { User, useAuth, getWorkspaceLabel } from "@/components/providers/auth-provider"
import { Button } from "@/components/ui/button"
import { Sun, Moon, LogOut, ChevronDown, User as UserIcon, Menu, Brain } from "lucide-react"

import { getAvatarUrl } from "@/lib/utils"

interface TopbarProps {
  user: User
  onOpenMobileSidebar?: () => void
}

function getInitials(name: string | null): string {
  if (!name || !name.trim()) return "U"
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return parts[0].slice(0, 2).toUpperCase()
}

function getDisplayName(name: string | null): string {
  if (!name || !name.trim()) return "User"
  return name.trim()
}

export function Topbar({ user: initialUser, onOpenMobileSidebar }: TopbarProps) {
  const { theme, setTheme } = useTheme()
  const { user: authUser, logout } = useAuth()
  const user = authUser || initialUser
  const [menuOpen, setMenuOpen] = React.useState(false)
  const [avatarError, setAvatarError] = React.useState(false)
  const menuRef = React.useRef<HTMLDivElement>(null)

  // Reset avatar error when avatar URL updates
  React.useEffect(() => {
    setAvatarError(false)
  }, [user?.avatarUrl])

  // Close menu on outside click
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

  const initials = getInitials(user.name)
  const displayName = getDisplayName(user.name)
  const resolvedAvatarUrl = getAvatarUrl(user.avatarUrl)

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-border bg-card/95 backdrop-blur px-4 sm:px-6 lg:px-8">
      {/* Left side — workspace context & mobile hamburger */}
      <div className="flex flex-1 items-center gap-2">
        {onOpenMobileSidebar && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation()
              onOpenMobileSidebar()
            }}
            className="h-10 w-10 text-muted-foreground hover:text-foreground rounded-xl lg:hidden -ml-1.5"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <div className="flex items-center gap-2 lg:hidden">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground font-semibold shadow-2xs">
            <Brain className="h-4 w-4" />
          </div>
          <span className="font-semibold text-sm tracking-tight text-foreground">
            AI Estimator
          </span>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center space-x-3">
        {/* Theme toggle */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="h-10 w-10 text-muted-foreground hover:text-foreground rounded-xl"
          title="Toggle theme"
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        {/* User profile */}
        <div className="relative" ref={menuRef}>
          <button 
            className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-muted/70 transition-colors focus:outline-none group"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {/* Avatar with initials or image */}
            <div className="relative flex h-9 w-9 shrink-0">
              <div className="flex h-full w-full items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold overflow-hidden">
                {resolvedAvatarUrl && !avatarError ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={resolvedAvatarUrl}
                    alt={displayName}
                    className="h-full w-full object-cover"
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  initials
                )}
              </div>
            </div>
            {/* Name & role */}
            <div className="hidden text-left sm:block">
              <p className="text-sm font-semibold leading-none text-foreground">{displayName}</p>
              <p className="text-xs font-medium text-muted-foreground mt-1">
                {getWorkspaceLabel(user.role)}
              </p>
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 hidden sm:block ${menuOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-border bg-popover shadow-lg py-1.5 z-50 animate-in fade-in-50 zoom-in-95">
              {/* User info header */}
              <div className="px-4 py-3 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="relative flex h-10 w-10 shrink-0">
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold overflow-hidden">
                      {resolvedAvatarUrl && !avatarError ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={resolvedAvatarUrl}
                          alt={displayName}
                          className="h-full w-full object-cover"
                          onError={() => setAvatarError(true)}
                        />
                      ) : (
                        initials
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>
                <div className="mt-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
                    {getWorkspaceLabel(user.role)}
                  </span>
                </div>
              </div>
              <div className="p-1.5 space-y-1">
                <Link
                  href={user.role === "ADMIN" ? "/admin/profile" : "/client/profile"}
                  className="flex w-full items-center px-3.5 py-2 rounded-xl text-sm text-foreground hover:bg-muted font-medium transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  <UserIcon className="mr-2.5 h-4 w-4 text-muted-foreground" />
                  My Profile
                </Link>
                <button
                  onClick={() => {
                    setMenuOpen(false)
                    logout()
                  }}
                  className="flex w-full items-center px-3.5 py-2 rounded-xl text-sm text-destructive hover:bg-destructive/10 font-medium transition-colors"
                >
                  <LogOut className="mr-2.5 h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
