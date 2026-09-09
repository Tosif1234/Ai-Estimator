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
      setToken(null)
      setUser(null)
      setSessionExpiredMessage(reason)
      router.replace("/login?expired=true")
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

          let parsedUser: User
          if (storedUser) {
            try {
              parsedUser = JSON.parse(storedUser)
              parsedUser.id = resolvedId || parsedUser.id
              parsedUser.email = me.email
              parsedUser.name = me.name !== undefined ? me.name : (parsedUser.name || null)
              parsedUser.role = me.role
              parsedUser.avatarUrl = me.avatarUrl !== undefined ? me.avatarUrl : (parsedUser.avatarUrl || null)
              parsedUser.createdAt = me.createdAt !== undefined ? me.createdAt : (parsedUser.createdAt || null)
            } catch {
              parsedUser = {
                id: resolvedId,
                email: me.email,
                name: me.name || null,
                role: me.role,
                avatarUrl: me.avatarUrl || null,
                createdAt: me.createdAt || null,
              }
            }
          } else {
            parsedUser = {
              id: resolvedId,
              email: me.email,
              name: me.name || null,
              role: me.role,
              avatarUrl: me.avatarUrl || null,
              createdAt: me.createdAt || null,
            }
          }

          localStorage.setItem("user", JSON.stringify(parsedUser))
          setUser(parsedUser)
          setToken(getAccessToken())
        } catch {
          clearTokens()
          localStorage.removeItem("user")
          setUser(null)
          setToken(null)
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

  const login = (accessToken: string, refreshToken: string, newUser: User) => {
    setTokens({ accessToken, refreshToken })
    localStorage.setItem("user", JSON.stringify(newUser))
    setToken(accessToken)
    setUser(newUser)
    setSessionExpiredMessage(null)
    router.push(newUser.role === "ADMIN" ? "/admin" : "/client")
  }

  const logout = async () => {
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

