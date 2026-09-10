"use client"

import * as React from "react"
import { useRouter, usePathname } from "next/navigation"
import { 
  getAccessToken, 
  getRefreshToken, 
  setTokens, 
  clearTokens, 
  onTokenRefresh, 
  onAuthFailure, 
  apiClient 
} from "@/lib/api/apiClient"

export type Role = "ADMIN" | "CLIENT"

export function getWorkspaceLabel(role?: Role | null): string {
  if (role === "ADMIN") return "Admin Workspace"
  return "Client Workspace"
}

export function decodeJwtRole(token: string | null): Role | null {
  if (!token) return null
  try {
    const parts = token.split(".")
    if (parts.length < 2) return null
    const payloadJson = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
    const payload = JSON.parse(payloadJson)
    return (payload.role as Role) || null
  } catch {
    return null
  }
}

export interface User {
  id: string
  email: string
  name: string | null
  role: Role
  avatarUrl?: string | null
  createdAt?: string | null
}

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  sessionExpiredMessage: string | null
  login: (accessToken: string, refreshToken: string, user: User) => void
  logout: () => Promise<void>
  updateUser: (data: Partial<User>) => void
  clearSessionExpiredMessage: () => void
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null)
  const [token, setToken] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [sessionExpiredMessage, setSessionExpiredMessage] = React.useState<string | null>(null)
  const router = useRouter()
  const pathname = usePathname()

  React.useEffect(() => {
    // 1. Register apiClient listeners BEFORE making authenticated requests
    const unsubscribeRefresh = onTokenRefresh((newToken) => {
      setToken(newToken)
    })

    const unsubscribeFailure = onAuthFailure((reason) => {
      clearTokens()
      localStorage.removeItem("user")
      if (typeof window !== "undefined") {
        sessionStorage.setItem("session_expired_reason", reason)
      }
      setToken(null)
      setUser(null)
      setSessionExpiredMessage(reason)
      const reasonParam = reason.toLowerCase().includes("role") ? "&reason=role_changed" : ""
      router.replace(`/login?expired=true${reasonParam}`)
    })

    // 2. Initialize and validate authentication
    const initAuth = async () => {
      const storedAccessToken = getAccessToken()
      const storedRefreshToken = getRefreshToken()
      const storedUser = localStorage.getItem("user")

      if (storedAccessToken || storedRefreshToken) {
        try {
          const me = await apiClient.get("/auth/me") as {
            userId?: string
            id?: string
            email: string
            role: Role
            name?: string
            avatarUrl?: string | null
            createdAt?: string | null
          }
          const resolvedId = me.userId || me.id || ""
          const tokenRole = decodeJwtRole(storedAccessToken)

          let parsedUser: User | null = null
          if (storedUser) {
            try {
              parsedUser = JSON.parse(storedUser)
            } catch {
              parsedUser = null
            }
          }

          const previousRole = parsedUser?.role || tokenRole

          // If role changed in DB while session was active, force immediate logout!
          if (previousRole && me.role && previousRole !== me.role) {
            const refreshToken = getRefreshToken()
            if (refreshToken) {
              const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
              fetch(`${baseUrl}/auth/logout`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ refreshToken }),
                keepalive: true,
              }).catch(() => {})
            }
            clearTokens()
            localStorage.removeItem("user")
            if (typeof window !== "undefined") {
              sessionStorage.setItem("session_expired_reason", "Your account permissions have changed. Please sign in again.")
            }
            setUser(null)
            setToken(null)
            setSessionExpiredMessage("Your account permissions have changed. Please sign in again.")
            router.replace("/login?expired=true&reason=role_changed")
            setIsLoading(false)
            return
          }

          const authenticatedUser: User = {
            id: resolvedId,
            email: me.email,
            name: me.name !== undefined ? me.name : (parsedUser?.name || null),
            role: me.role,
            avatarUrl: me.avatarUrl !== undefined ? me.avatarUrl : (parsedUser?.avatarUrl || null),
            createdAt: me.createdAt !== undefined ? me.createdAt : (parsedUser?.createdAt || null),
          }

          localStorage.setItem("user", JSON.stringify(authenticatedUser))
          setUser(authenticatedUser)
          setToken(getAccessToken())
        } catch (err: unknown) {
          clearTokens()
          localStorage.removeItem("user")
          setUser(null)
          setToken(null)
          const isRoleChange = err instanceof Error && err.message.toLowerCase().includes("role")
          if (isRoleChange) {
            if (typeof window !== "undefined") {
              sessionStorage.setItem("session_expired_reason", "Your role has changed. Please sign in again.")
            }
            setSessionExpiredMessage("Your role has changed. Please sign in again.")
            router.replace("/login?expired=true&reason=role_changed")
          } else {
            router.replace("/login?expired=true")
          }
        }
      } else {
        clearTokens()
        localStorage.removeItem("user")
        setUser(null)
        setToken(null)
      }

      setIsLoading(false)
    }

    initAuth()

    return () => {
      unsubscribeRefresh()
      unsubscribeFailure()
    }
  }, [router])

  // Protected route logic
  React.useEffect(() => {
    if (isLoading) return

    const isAuthRoute =
      pathname.startsWith("/login") ||
      pathname.startsWith("/signup") ||
      pathname.startsWith("/forgot-password") ||
      pathname.startsWith("/reset-password")
    const isAdminRoute = pathname.startsWith("/admin")
    const isClientRoute = pathname.startsWith("/client") || pathname.startsWith("/projects")

    if (!user && !isAuthRoute && pathname !== "/") {
      router.replace("/login")
    } else if (user) {
      if (isAuthRoute) {
        router.replace(user.role === "ADMIN" ? "/admin" : "/client")
      } else if (isAdminRoute && user.role !== "ADMIN") {
        router.replace("/client")
      } else if (isClientRoute && user.role !== "CLIENT") {
        router.replace("/admin")
      }
    }
  }, [user, isLoading, pathname, router])

  // Session monitoring refs to prevent race conditions, memory leaks, and redundant calls
  const isValidatingRef = React.useRef(false)
  const lastValidatedRef = React.useRef(0)
  const isLoggingOutRef = React.useRef(false)
  const userRef = React.useRef<User | null>(user)

  React.useEffect(() => {
    userRef.current = user
  }, [user])

  const validateSession = React.useCallback(async () => {
    const currentUser = userRef.current
    const currentToken = getAccessToken()

    if (!currentUser || !currentToken || isLoggingOutRef.current) {
      return
    }

    const now = Date.now()
    // Throttle checks: ensure at least 3 seconds between consecutive triggers
    if (now - lastValidatedRef.current < 3000) {
      return
    }

    if (isValidatingRef.current) {
      return
    }

    isValidatingRef.current = true
    lastValidatedRef.current = now

    try {
      const me = await apiClient.get("/auth/me") as {
        userId?: string
        id?: string
        email: string
        role: Role
        name?: string
        avatarUrl?: string | null
        createdAt?: string | null
      }

      // Detect role mismatch immediately
      if (currentUser.role && me.role && currentUser.role !== me.role) {
        isLoggingOutRef.current = true
        const refreshToken = getRefreshToken()
        if (refreshToken) {
          const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
          fetch(`${baseUrl}/auth/logout`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
            keepalive: true,
          }).catch(() => {})
        }
        clearTokens()
        localStorage.removeItem("user")
        if (typeof window !== "undefined") {
          sessionStorage.setItem("session_expired_reason", "Your account permissions have changed. Please sign in again.")
        }
        setUser(null)
        setToken(null)
        setSessionExpiredMessage("Your account permissions have changed. Please sign in again.")
        router.replace("/login?expired=true&reason=role_changed")
        return
      }

      // Seamlessly sync profile details (e.g. name or avatarUrl updated elsewhere) without logout
      if (me.name !== currentUser.name || me.avatarUrl !== currentUser.avatarUrl) {
        const updatedUser: User = {
          ...currentUser,
          name: me.name !== undefined ? me.name : currentUser.name,
          avatarUrl: me.avatarUrl !== undefined ? me.avatarUrl : currentUser.avatarUrl,
        }
        setUser(updatedUser)
        localStorage.setItem("user", JSON.stringify(updatedUser))
      }
    } catch (err: unknown) {
      const isRoleChange =
        err instanceof Error &&
        (err.message.toLowerCase().includes("role") || err.message.toLowerCase().includes("permission"))
      if (isRoleChange) {
        isLoggingOutRef.current = true
        clearTokens()
        localStorage.removeItem("user")
        if (typeof window !== "undefined") {
          sessionStorage.setItem("session_expired_reason", "Your account permissions have changed. Please sign in again.")
        }
        setUser(null)
        setToken(null)
        setSessionExpiredMessage("Your account permissions have changed. Please sign in again.")
        router.replace("/login?expired=true&reason=role_changed")
      }
    } finally {
      isValidatingRef.current = false
    }
  }, [router])

  // Periodic polling (30s) + Focus / Visibility change active session monitoring
  React.useEffect(() => {
    if (isLoading || !user || !token) {
      return
    }

    const isAuthRoute =
      pathname.startsWith("/login") ||
      pathname.startsWith("/signup") ||
      pathname.startsWith("/forgot-password") ||
      pathname.startsWith("/reset-password")

    if (isAuthRoute) {
      return
    }

    // 1. Single 30-second interval for background polling
    const intervalId = setInterval(() => {
      validateSession()
    }, 30000)

    // 2. Immediate validation on window focus
    const handleFocus = () => {
      validateSession()
    }
    window.addEventListener("focus", handleFocus)

    // 3. Immediate validation on visibilitychange when returning to tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        validateSession()
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      clearInterval(intervalId)
      window.removeEventListener("focus", handleFocus)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [isLoading, user, token, pathname, validateSession])

  const login = (accessToken: string, refreshToken: string, newUser: User) => {
    isLoggingOutRef.current = false
    setTokens({ accessToken, refreshToken })
    localStorage.setItem("user", JSON.stringify(newUser))
    setToken(accessToken)
    setUser(newUser)
    setSessionExpiredMessage(null)
    router.push(newUser.role === "ADMIN" ? "/admin" : "/client")
  }

  const logout = async () => {
    isLoggingOutRef.current = true
    const refreshToken = getRefreshToken()
    if (refreshToken) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
        await fetch(`${baseUrl}/auth/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refreshToken }),
          keepalive: true,
        }).catch(() => {
          // Navigation or network disconnect handled silently
        })
      } catch {
        // Proceed with local cleanup without logging error overlay
      }
    }

    // Always clear tokens and auth state regardless of backend response
    clearTokens()
    localStorage.removeItem("user")
    setToken(null)
    setUser(null)
    router.push("/login")
  }

  const updateUser = (data: Partial<User>) => {
    if (!user) return
    const updatedUser = { ...user, ...data }
    setUser(updatedUser)
    localStorage.setItem("user", JSON.stringify(updatedUser))
  }

  const clearSessionExpiredMessage = () => {
    setSessionExpiredMessage(null)
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("session_expired_reason")
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        sessionExpiredMessage,
        login,
        logout,
        updateUser,
        clearSessionExpiredMessage,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = React.useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

