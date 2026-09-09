"use client"

import * as React from "react"
import Link from "next/link"
import { Users, FolderKanban, FileText, AlertCircle, CheckCircle2, ArrowRight, LineChart } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/apiClient"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface AdminStats {
  totalClients: number
  totalProjects: number
  totalRequirements: number
  totalEstimates: number
  projectsNeedingClarification: number
  projectsReadyForEstimation: number
}

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: async () => {
      return await apiClient.get("/admin/stats") as AdminStats
    }
  })

  return (
    <div className="space-y-8 lg:space-y-10">
      {/* Header */}
      <div className="border-b border-border/60 pb-6 sm:pb-7">
        <h1 className="text-2xl sm:text-[26px] lg:text-[28px] font-semibold leading-tight tracking-tight text-foreground">
          System Administration
        </h1>
        <p className="mt-1.5 text-sm sm:text-[15px] text-muted-foreground">
          Platform-wide telemetry, client user accounts, and estimation rule catalogs.
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-5 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="rounded-2xl border-border/80 shadow-xs p-5 sm:p-6">
          <div className="flex items-center justify-between pb-3">
            <span className="text-xs sm:text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">Total Client Users</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl lg:text-[32px] font-semibold tracking-tight text-foreground">{isLoading ? "-" : stats?.totalClients || 0}</div>
            <p className="text-xs sm:text-[13px] text-muted-foreground mt-1">Registered clients on platform</p>
          </div>
        </Card>

        <Card className="rounded-2xl border-border/80 shadow-xs p-5 sm:p-6">
          <div className="flex items-center justify-between pb-3">
            <span className="text-xs sm:text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">Active Projects</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FolderKanban className="h-5 w-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl lg:text-[32px] font-semibold tracking-tight text-foreground">{isLoading ? "-" : stats?.totalProjects || 0}</div>
            <p className="text-xs sm:text-[13px] text-muted-foreground mt-1">Cross-client workspace count</p>
          </div>
        </Card>

        <Card className="rounded-2xl border-border/80 shadow-xs p-5 sm:p-6">
          <div className="flex items-center justify-between pb-3">
            <span className="text-xs sm:text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">Generated Estimates</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <LineChart className="h-5 w-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl lg:text-[32px] font-semibold tracking-tight text-foreground">{isLoading ? "-" : stats?.totalEstimates || 0}</div>
            <p className="text-xs sm:text-[13px] text-muted-foreground mt-1">Total estimate deliverables</p>
          </div>
        </Card>

        <Card className="rounded-2xl border-border/80 shadow-xs p-5 sm:p-6">
          <div className="flex items-center justify-between pb-3">
            <span className="text-xs sm:text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">Saved Requirements</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <FileText className="h-5 w-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl lg:text-[32px] font-semibold tracking-tight text-foreground">{isLoading ? "-" : stats?.totalRequirements || 0}</div>
            <p className="text-xs sm:text-[13px] text-muted-foreground mt-1">Analyzed client specifications</p>
          </div>
        </Card>

        <Card className="rounded-2xl border-border/80 shadow-xs p-5 sm:p-6">
          <div className="flex items-center justify-between pb-3">
            <span className="text-xs sm:text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">In Clarification</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
              <AlertCircle className="h-5 w-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl lg:text-[32px] font-semibold tracking-tight text-foreground">{isLoading ? "-" : stats?.projectsNeedingClarification || 0}</div>
            <p className="text-xs sm:text-[13px] text-muted-foreground mt-1">Projects with pending questions</p>
          </div>
        </Card>

        <Card className="rounded-2xl border-border/80 shadow-xs p-5 sm:p-6">
          <div className="flex items-center justify-between pb-3">
            <span className="text-xs sm:text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">Ready for Estimation</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl lg:text-[32px] font-semibold tracking-tight text-foreground">{isLoading ? "-" : stats?.projectsReadyForEstimation || 0}</div>
            <p className="text-xs sm:text-[13px] text-muted-foreground mt-1">Workspaces ready to calculate</p>
          </div>
        </Card>
      </div>

      {/* Quick Navigation Modules */}
      <div className="space-y-5">
        <h2 className="text-[17px] sm:text-[18px] font-semibold text-foreground">Management Modules</h2>
        <div className="grid gap-5 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { title: "User Accounts", desc: "Manage client and admin users, credentials, and roles", href: "/admin/users", icon: Users },
            { title: "Projects Oversight", desc: "Inspect all client project scopes, status, and readiness", href: "/admin/projects", icon: FolderKanban },
            { title: "Estimates Registry", desc: "Audit all generated estimate versions and totals", href: "/admin/estimates", icon: LineChart },
          ].map((item, idx) => (
            <Link key={idx} href={item.href} className="group">
              <Card className="h-full rounded-2xl border-border/80 transition-all hover:border-primary/50 hover:shadow-xs p-5 sm:p-6 flex flex-col justify-between">
                <div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-base sm:text-[17px] text-foreground group-hover:text-primary transition-colors">{item.title}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 leading-relaxed">{item.desc}</p>
                </div>
                <div className="pt-5 flex items-center text-xs sm:text-sm font-semibold text-primary">
                  <span>Manage</span>
                  <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
