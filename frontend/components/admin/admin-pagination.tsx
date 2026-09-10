"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface AdminPaginationProps {
  currentPage: number
  totalItems: number
  itemsPerPage?: number
  onPageChange: (page: number) => void
  itemName?: string
  className?: string
}

export function AdminPagination({
  currentPage,
  totalItems,
  itemsPerPage = 10,
  onPageChange,
  itemName = "records",
  className,
}: AdminPaginationProps) {
  const totalPages = Math.ceil(totalItems / itemsPerPage)

  // If there are 10 or fewer records (or 0), do not show unnecessary pagination controls
  if (totalItems <= itemsPerPage || totalPages <= 1) {
    return null
  }

  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  // Generate pagination items with ellipses for large page counts
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const delta = 1 // adjacent pages to current

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (currentPage > 3) {
        pages.push("...")
      }

      const start = Math.max(2, currentPage - delta)
      const end = Math.min(totalPages - 1, currentPage + delta)

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }

      if (currentPage < totalPages - 2) {
        pages.push("...")
      }
      pages.push(totalPages)
    }

    return pages
  }

  const pages = getPageNumbers()

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 sm:px-6 py-4 border-t border-border/60 bg-card select-none",
        className
      )}
    >
      {/* Result Information Summary */}
      <p className="text-xs sm:text-sm text-muted-foreground font-medium text-center sm:text-left">
        Showing <span className="font-semibold text-foreground">{startItem}–{endItem}</span> of{" "}
        <span className="font-semibold text-foreground">{totalItems}</span> {itemName}
      </p>

      {/* Mobile Navigation Controls (< sm) */}
      <div className="flex sm:hidden items-center justify-between w-full gap-2 pt-2 border-t border-border/40">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="h-9 px-3 text-xs font-medium rounded-lg border-border/80 hover:bg-muted/60 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Prev
        </Button>

        <span className="text-xs font-medium text-muted-foreground">
          Page <span className="font-semibold text-foreground">{currentPage}</span> of{" "}
          <span className="font-semibold text-foreground">{totalPages}</span>
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className="h-9 px-3 text-xs font-medium rounded-lg border-border/80 hover:bg-muted/60 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          aria-label="Next page"
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* Desktop Navigation Controls (>= sm) */}
      <div className="hidden sm:flex items-center justify-center gap-1.5">
        {/* Previous Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="h-9 sm:h-10 px-2.5 sm:px-3 text-xs sm:text-sm font-medium rounded-lg sm:rounded-xl border-border/80 hover:bg-muted/60 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4 sm:mr-1" />
          <span>Previous</span>
        </Button>

        {/* Page Number Buttons */}
        <div className="flex items-center gap-1">
          {pages.map((page, idx) => {
            if (typeof page === "string") {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="flex h-9 sm:h-10 w-7 sm:w-8 items-center justify-center text-xs text-muted-foreground select-none"
                >
                  …
                </span>
              )
            }

            const isActive = page === currentPage

            return (
              <button
                key={page}
                type="button"
                onClick={() => onPageChange(page)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex h-9 sm:h-10 min-w-[36px] sm:min-w-[40px] px-2.5 items-center justify-center rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                    : "text-foreground hover:bg-muted/70 hover:text-foreground border border-transparent"
                )}
              >
                {page}
              </button>
            )
          })}
        </div>

        {/* Next Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className="h-9 sm:h-10 px-2.5 sm:px-3 text-xs sm:text-sm font-medium rounded-lg sm:rounded-xl border-border/80 hover:bg-muted/60 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          aria-label="Next page"
        >
          <span>Next</span>
          <ChevronRight className="h-4 w-4 sm:ml-1" />
        </Button>
      </div>
    </div>
  )
}
