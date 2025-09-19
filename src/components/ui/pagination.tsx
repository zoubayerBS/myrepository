import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import React from "react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const renderPageNumbers = () => {
    const pageNumbers: (number | '...')[] = [];
    const maxPagesToShow = 5; // Number of page buttons to display

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Always show first page
      pageNumbers.push(1);

      // Determine if we need to show ellipsis at the start
      if (currentPage > Math.floor(maxPagesToShow / 2) + 1) {
        pageNumbers.push('...');
      }

      // Show pages around the current page
      let startPage = Math.max(2, currentPage - Math.floor(maxPagesToShow / 2) + 1);
      let endPage = Math.min(totalPages - 1, currentPage + Math.floor(maxPagesToShow / 2) - 1);

      if (currentPage <= Math.floor(maxPagesToShow / 2) + 1) {
        endPage = maxPagesToShow - 1;
      } else if (currentPage >= totalPages - Math.floor(maxPagesToShow / 2)) {
        startPage = totalPages - maxPagesToShow + 2;
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }

      // Determine if we need to show ellipsis at the end
      if (currentPage < totalPages - Math.floor(maxPagesToShow / 2)) {
        pageNumbers.push('...');
      }

      // Always show last page
      pageNumbers.push(totalPages);
    }

    // Filter out duplicate '...' if they appear next to each other
    const uniquePageNumbers = pageNumbers.filter((item, index, arr) => {
      return !(item === '...' && arr[index - 1] === '...');
    });

    return uniquePageNumbers.map((page, index) => (
      page === '...' ? (
                <span key={`ellipsis-${index}`} className="px-2 py-1 text-sm text-gray-500">
          <MoreHorizontal className="h-4 w-4" />
        </span>
      ) : (
        <Button
          key={page}
          variant={currentPage === page ? "default" : "outline"}
          size="icon"
          className={cn("h-8 w-8", currentPage === page ? "bg-green-700 text-white" : "text-muted-foreground")}
          onClick={() => onPageChange(page as number)}
          disabled={currentPage === page}
        >
          {page}
        </Button>
      )
    ));
  };

  return (
    <div className="flex items-center justify-center space-x-2 mt-4">
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="sr-only">Previous page</span>
      </Button>
      {renderPageNumbers()}
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        <ChevronRight className="h-4 w-4" />
        <span className="sr-only">Next page</span>
      </Button>
    </div>
  );
}
