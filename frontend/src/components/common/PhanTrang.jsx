import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Component Phân Trang Chuẩn Hóa Toàn Hệ Thống
 * Hỗ trợ cả 0-indexed (Backend Spring Boot: 0, 1, 2...) lẫn 1-indexed (Client: 1, 2, 3...)
 */
export default function PhanTrang({
  page = 1,
  totalPages = 1,
  totalElements,
  totalItems,
  pageSize,
  itemsPerPage,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  isZeroIndexed = false,
  itemName = 'mục',
  showPageNumbers = true,
  maxPageButtons = 5,
  className = ''
}) {
  const currentPage = isZeroIndexed ? page + 1 : page;
  const currentTotalPages = Math.max(1, totalPages || 1);
  const currentSize = pageSize || itemsPerPage;
  const count = totalElements !== undefined ? totalElements : totalItems;

  const handlePrev = () => {
    if (currentPage > 1) {
      onPageChange(isZeroIndexed ? page - 1 : currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < currentTotalPages) {
      onPageChange(isZeroIndexed ? page + 1 : currentPage + 1);
    }
  };

  const handleSelectPage = (targetPage1Based) => {
    onPageChange(isZeroIndexed ? targetPage1Based - 1 : targetPage1Based);
  };

  // Tính toán các nút số trang hiển thị gọn gàng
  const getPageNumbers = () => {
    const pages = [];
    let start = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
    let end = Math.min(currentTotalPages, start + maxPageButtons - 1);
    if (end - start + 1 < maxPageButtons) {
      start = Math.max(1, end - maxPageButtons + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className={`d-flex flex-column flex-md-row justify-content-between align-items-center gap-3 ${className}`}>
      {/* Hiển thị số lượng và chọn items per page */}
      <div className="d-flex align-items-center gap-2 small text-muted">
        {onPageSizeChange && currentSize && (
          <>
            <span>Hiển thị</span>
            <select
              className="form-select form-select-sm w-auto fw-medium shadow-none cursor-pointer"
              value={currentSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </>
        )}
        {count !== undefined && (
          <span>
            {onPageSizeChange ? 'trên tổng' : 'Tổng cộng'} <strong className="text-dark">{count}</strong> {itemName}
          </span>
        )}
      </div>

      {/* Điều hướng các trang */}
      {currentTotalPages > 1 && (
        <nav aria-label="Page navigation">
          <ul className="pagination pagination-sm m-0 gap-1 align-items-center">
            <li className={`page-item ${currentPage <= 1 ? 'disabled' : ''}`}>
              <button
                type="button"
                className="page-link border-0 rounded-3 text-dark fw-medium d-inline-flex align-items-center gap-1 px-2.5 py-1"
                onClick={handlePrev}
                disabled={currentPage <= 1}
              >
                <ChevronLeft size={15} />
                <span>Trước</span>
              </button>
            </li>

            {showPageNumbers ? (
              getPageNumbers().map((pNum) => (
                <li key={pNum} className="page-item">
                  <button
                    type="button"
                    className={`page-link border-0 rounded-3 fw-bold px-3 py-1 ${
                      currentPage === pNum
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-dark hover-bg-light'
                    }`}
                    onClick={() => handleSelectPage(pNum)}
                  >
                    {pNum}
                  </button>
                </li>
              ))
            ) : (
              <li className="page-item disabled">
                <span className="page-link bg-white border-0 text-dark fw-semibold px-3 py-1">
                  Trang {currentPage} / {currentTotalPages}
                </span>
              </li>
            )}

            <li className={`page-item ${currentPage >= currentTotalPages ? 'disabled' : ''}`}>
              <button
                type="button"
                className="page-link border-0 rounded-3 text-dark fw-medium d-inline-flex align-items-center gap-1 px-2.5 py-1"
                onClick={handleNext}
                disabled={currentPage >= currentTotalPages}
              >
                <span>Sau</span>
                <ChevronRight size={15} />
              </button>
            </li>
          </ul>
        </nav>
      )}
    </div>
  );
}

