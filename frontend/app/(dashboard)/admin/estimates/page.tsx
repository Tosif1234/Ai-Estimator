"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/apiClient"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calculator, Clock, Download, Loader2, FileText, FileSpreadsheet, FileCode, Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { swalToast } from "@/lib/swal"
import { AdminPagination } from "@/components/admin/admin-pagination"

interface GlobalEstimate {
  id: string
  projectId: string
  version: number
  totalHours: number
  createdAt: string
  project: {
    name: string
    user?: {
      name: string | null
      email: string
    }
  }
}

const FORMAT_OPTIONS = [
  { format: "excel" as const, label: "Excel (.xlsx)", icon: FileSpreadsheet },
]

export default function AdminEstimatesPage() {
  const [search, setSearch] = React.useState("")
  const [debouncedSearch, setDebouncedSearch] = React.useState("")
  const [sortBy, setSortBy] = React.useState("createdAt")
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc")

  const [currentPage, setCurrentPage] = React.useState(1)
  const PAGE_SIZE = 10

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)
    return () => clearTimeout(handler)
  }, [search])

  // Reset pagination to page 1 on search or sort change
  React.useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, sortBy, sortOrder])

  const { data: estimates, isLoading } = useQuery({
    queryKey: ["admin", "estimates", debouncedSearch, sortBy, sortOrder],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (debouncedSearch) params.set("search", debouncedSearch)
      if (sortBy) params.set("sortBy", sortBy)
      if (sortOrder) params.set("sortOrder", sortOrder)
      const qs = params.toString() ? `?${params.toString()}` : ""
      return await apiClient.get(`/admin/estimates${qs}`) as GlobalEstimate[]
    },
  })

  const [downloadingKey, setDownloadingKey] = React.useState<string | null>(null)
  const showToast = (msg: string, isError = false) => {
    if (isError) {
      swalToast.error(msg)
    } else {
      swalToast.success(msg)
    }
  }

  const downloadReport = async (projectId: string, version: number, format: "excel" = "excel") => {
    const key = `${projectId}-${format}`
    if (downloadingKey === key) return
    setDownloadingKey(key)
    try {
      showToast("Generating Excel (.xlsx) report...")
      const { blob, filename } = await apiClient.download(
        `/projects/${projectId}/reports/excel?version=${version}`
      )
      const url = window.URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = filename ?? "estimate.xlsx"
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      window.URL.revokeObjectURL(url)
      showToast("Excel report downloaded successfully.")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message
      showToast(msg || "Unable to download Excel report.", true)
    } finally {
      setDownloadingKey(null)
    }
  }

  const totalEstimates = estimates?.length ?? 0
  const totalPages = Math.ceil(totalEstimates / PAGE_SIZE)

  React.useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [totalPages, currentPage])

  const paginatedEstimates = React.useMemo(() => {
    if (!estimates) return []
    const start = (currentPage - 1) * PAGE_SIZE
    return estimates.slice(start, start + PAGE_SIZE)
  }, [estimates, currentPage])

  return (
    <div className="space-y-8">

      <div className="border-b border-border/60 pb-6">
        <h1 className="text-2xl sm:text-[26px] lg:text-[28px] font-semibold leading-tight tracking-tight text-foreground">
          All Estimates
        </h1>
        <p className="mt-1.5 text-sm sm:text-[15px] text-muted-foreground">
          View and download estimation reports for all projects{estimates ? ` (${estimates.length} total)` : ""}.
        </p>
      </div>

      {/* Server-Side Search and Sorting Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center max-w-md flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search estimates, projects or clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 text-sm rounded-xl"
          />
        </div>

        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          <span className="text-xs sm:text-[13px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Sort by:</span>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[160px] h-11 text-sm font-medium rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt">Date Created</SelectItem>
              <SelectItem value="totalHours">Total Hours</SelectItem>
              <SelectItem value="version">Version</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="h-11 px-4 text-sm font-semibold rounded-xl flex items-center gap-2"
            onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
            title={sortOrder === "asc" ? "Ascending order" : "Descending order"}
          >
            {sortOrder === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
            {sortOrder === "asc" ? "Asc" : "Desc"}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-3 p-8 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span>Loading estimates...</span>
        </div>
      ) : (
        <Card className="rounded-2xl border-border/80 shadow-xs overflow-hidden bg-card">
          <CardHeader className="p-5 sm:p-6 pb-4">
            <CardTitle className="text-lg sm:text-xl font-semibold flex items-center gap-2.5">
              <Calculator className="h-5 w-5 text-primary" />
              Estimation Reports
            </CardTitle>
            <CardDescription className="text-sm sm:text-[15px] text-muted-foreground mt-1">
              Download Excel (.xlsx) estimation reports for all projects.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {estimates?.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                No estimates generated yet.
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {paginatedEstimates.map((estimate) => (
                  <div key={estimate.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 p-5 sm:p-6 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className="p-2.5 rounded-xl bg-primary/10 text-primary mt-0.5 shrink-0">
                        <Calculator className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-base sm:text-[17px] text-foreground truncate">{estimate.project.name}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate mt-0.5">
                          {estimate.project.user?.name || estimate.project.user?.email || "Unknown client"}
                        </p>
                        <div className="flex items-center gap-2.5 mt-2 flex-wrap">
                          <Badge variant="outline" className="text-xs px-2.5 py-1 font-semibold rounded-lg">
                            Version {estimate.version}
                          </Badge>
                          <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-lg">{estimate.totalHours} hrs</span>
                          <span className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
                            <Clock className="h-4 w-4 opacity-60" />
                            {new Date(estimate.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        className="h-10 sm:h-11 px-4 sm:px-5 text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white shadow-xs transition-all flex items-center gap-2"
                        disabled={downloadingKey === `${estimate.projectId}-excel`}
                        onClick={() => downloadReport(estimate.projectId, estimate.version, "excel")}
                      >
                        {downloadingKey === `${estimate.projectId}-excel` ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Exporting...</span>
                          </>
                        ) : (
                          <>
                            <FileSpreadsheet className="h-4 w-4" />
                            <span>Download Excel (.xlsx)</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>

          {/* Integrated Pagination Controls */}
          <AdminPagination
            currentPage={currentPage}
            totalItems={totalEstimates}
            itemsPerPage={PAGE_SIZE}
            onPageChange={setCurrentPage}
            itemName="estimates"
          />
        </Card>
      )}
    </div>
  )
}

