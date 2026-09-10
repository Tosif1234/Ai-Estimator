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

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === "asc" ? "desc" : "asc")
    } else {
      setSortBy(field)
      setSortOrder("asc")
    }
  }

  const renderSortIndicator = (field: string) => {
    if (sortBy !== field) {
      return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40 group-hover:opacity-100" />
    }
    return sortOrder === "asc"
      ? <ArrowUp className="ml-1 h-3 w-3 text-primary" />
      : <ArrowDown className="ml-1 h-3 w-3 text-primary" />
  }

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

  const downloadReport = async (projectId: string, version: number, format: "excel" | "pdf" = "excel") => {
    const key = `${projectId}-${format}`
    if (downloadingKey === key) return
    setDownloadingKey(key)
    const isPdf = format === "pdf"
    try {
      showToast(`Generating ${isPdf ? "SRS Document (.pdf)" : "Excel Workbook (.xlsx)"}...`)
      const { blob, filename } = await apiClient.download(
        `/projects/${projectId}/reports/${format}?version=${version}`
      )
      const url = window.URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = filename ?? (isPdf ? "srs-specification.pdf" : "estimate.xlsx")
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      window.URL.revokeObjectURL(url)
      showToast(`${isPdf ? "SRS PDF" : "Excel report"} downloaded successfully.`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message
      showToast(msg || `Unable to download ${isPdf ? "SRS PDF" : "Excel report"}.`, true)
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
        <div className="flex items-center max-w-md flex-1 relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search estimates, projects or clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 text-sm rounded-xl w-full"
          />
        </div>

        <div className="flex items-center gap-2.5 flex-wrap w-full sm:w-auto">
          <span className="text-xs sm:text-[13px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Sort by:</span>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[140px] sm:w-[160px] h-11 text-sm font-medium rounded-xl">
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
            className="h-11 px-3.5 sm:px-4 text-sm font-semibold rounded-xl flex items-center gap-1.5"
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
          {/* DESKTOP TABLE VIEW (Hidden on Mobile < 768px) */}
          <div className="hidden md:block w-full overflow-hidden">
            <table className="w-full text-sm text-left table-fixed">
              <thead className="text-xs uppercase bg-muted/40 text-muted-foreground border-b border-border/60">
                <tr>
                  <th className="w-[25%] px-5 py-3.5 font-semibold">
                    Project
                  </th>
                  <th className="w-[20%] px-4 py-3.5 font-semibold">
                    Client Owner
                  </th>
                  <th className="w-[11%] px-4 py-3.5 font-semibold">
                    <button
                      type="button"
                      onClick={() => handleSort("version")}
                      className="flex items-center group uppercase font-semibold text-xs text-muted-foreground hover:text-foreground"
                    >
                      Version
                      {renderSortIndicator("version")}
                    </button>
                  </th>
                  <th className="w-[13%] px-4 py-3.5 font-semibold">
                    <button
                      type="button"
                      onClick={() => handleSort("totalHours")}
                      className="flex items-center group uppercase font-semibold text-xs text-muted-foreground hover:text-foreground"
                    >
                      Total Hours
                      {renderSortIndicator("totalHours")}
                    </button>
                  </th>
                  <th className="w-[12%] px-4 py-3.5 font-semibold">
                    <button
                      type="button"
                      onClick={() => handleSort("createdAt")}
                      className="flex items-center group uppercase font-semibold text-xs text-muted-foreground hover:text-foreground"
                    >
                      Created
                      {renderSortIndicator("createdAt")}
                    </button>
                  </th>
                  <th className="w-[19%] px-5 py-3.5 font-semibold text-right">
                    Deliverables
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {estimates?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                      {debouncedSearch.trim() ? "No estimates match your search query." : "No estimates generated yet."}
                    </td>
                  </tr>
                ) : (
                  paginatedEstimates.map((estimate) => (
                    <tr key={estimate.id} className="hover:bg-muted/40 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                            <Calculator className="h-4 w-4" />
                          </div>
                          <span className="font-semibold text-sm sm:text-[15px] text-foreground truncate block" title={estimate.project.name}>
                            {estimate.project.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0 text-xs font-semibold">
                            {(estimate.project.user?.name || estimate.project.user?.email || "U")[0].toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm text-foreground truncate" title={estimate.project.user?.name || "Unnamed Client"}>
                              {estimate.project.user?.name || "Unnamed Client"}
                            </p>
                            <p className="text-xs text-muted-foreground truncate" title={estimate.project.user?.email || "No email"}>
                              {estimate.project.user?.email || "No email"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant="outline" className="text-xs px-2.5 py-0.5 font-semibold rounded-lg whitespace-nowrap">
                          Version {estimate.version}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-lg inline-block whitespace-nowrap">
                          {estimate.totalHours} hrs
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground truncate">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 opacity-60 shrink-0" />
                          <span>
                            {new Date(estimate.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Compact & Light Excel (.xlsx) Button */}
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2.5 text-xs font-medium rounded-xl border-border/80 bg-background/80 hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-500/30 dark:hover:text-emerald-400 text-muted-foreground transition-all flex items-center gap-1.5 shadow-2xs shrink-0"
                            disabled={downloadingKey === `${estimate.projectId}-excel`}
                            onClick={() => downloadReport(estimate.projectId, estimate.version, "excel")}
                            title="Download Excel (.xlsx) estimation workbook"
                          >
                            {downloadingKey === `${estimate.projectId}-excel` ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-500" />
                                <span>Exporting...</span>
                              </>
                            ) : (
                              <>
                                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                <span>Excel</span>
                              </>
                            )}
                          </Button>

                          {/* Compact & Light SRS (.pdf) Button */}
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2.5 text-xs font-medium rounded-xl border-border/80 bg-background/80 hover:bg-rose-500/10 hover:text-rose-600 hover:border-rose-500/30 dark:hover:text-rose-400 text-muted-foreground transition-all flex items-center gap-1.5 shadow-2xs shrink-0"
                            disabled={downloadingKey === `${estimate.projectId}-pdf`}
                            onClick={() => downloadReport(estimate.projectId, estimate.version, "pdf")}
                            title="Download SRS (.pdf) specification document"
                          >
                            {downloadingKey === `${estimate.projectId}-pdf` ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-500" />
                                <span>Exporting...</span>
                              </>
                            ) : (
                              <>
                                <FileText className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                                <span>SRS PDF</span>
                              </>
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* MOBILE CARD LIST VIEW (< 768px) */}
          <div className="block md:hidden divide-y divide-border">
            {estimates?.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                {debouncedSearch.trim() ? "No estimates match your search query." : "No estimates generated yet."}
              </div>
            ) : (
              paginatedEstimates.map((estimate) => (
                <div key={estimate.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                        <Calculator className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-[15px] text-foreground truncate">
                          {estimate.project.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {estimate.project.user?.name || estimate.project.user?.email || "Unknown client"}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs px-2.5 py-0.5 font-semibold rounded-lg shrink-0 whitespace-nowrap">
                      Version {estimate.version}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40 gap-2">
                    <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                      {estimate.totalHours} hrs
                    </span>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3 opacity-60 shrink-0" />
                      <span>{new Date(estimate.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-9 px-3 text-xs font-medium rounded-xl border-border/80 bg-background/80 hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-500/30 dark:hover:text-emerald-400 text-muted-foreground transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                      disabled={downloadingKey === `${estimate.projectId}-excel`}
                      onClick={() => downloadReport(estimate.projectId, estimate.version, "excel")}
                    >
                      {downloadingKey === `${estimate.projectId}-excel` ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-500" />
                      ) : (
                        <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      )}
                      <span>Excel</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-9 px-3 text-xs font-medium rounded-xl border-border/80 bg-background/80 hover:bg-rose-500/10 hover:text-rose-600 hover:border-rose-500/30 dark:hover:text-rose-400 text-muted-foreground transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                      disabled={downloadingKey === `${estimate.projectId}-pdf`}
                      onClick={() => downloadReport(estimate.projectId, estimate.version, "pdf")}
                    >
                      {downloadingKey === `${estimate.projectId}-pdf` ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-500" />
                      ) : (
                        <FileText className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                      )}
                      <span>SRS PDF</span>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

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

