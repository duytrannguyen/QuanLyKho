import React, { useState, useEffect, useMemo } from 'react';
import {
  Package, Search, PackageMinus, X,
  AlertTriangle, CheckCircle2, XCircle, RotateCcw, SlidersHorizontal
} from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import { formatCurrency } from '../../utils/dinh_dang';

export default function TrangTonKhoPhuKien() {
  const [accessories, setAccessories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // State Bộ Lọc & Tìm kiếm
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [stockFilter, setStockFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('default'); // default, price_desc, price_asc, qty_desc, qty_asc, name_asc

  // State Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    fetchAccessories();
  }, []);

  const fetchAccessories = async () => {
    setIsLoading(true);
    try {
      const res = await axiosClient.get('/accessory/all');
      setAccessories(res.data || []);
    } catch (err) {
      console.error("Lỗi lấy danh sách phụ kiện:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Tính toán KPI Thống kê
  const kpiStats = useMemo(() => {
    const total = accessories.length;
    const inStock = accessories.filter(a => a.quantity > 5).length;
    const lowStock = accessories.filter(a => a.quantity > 0 && a.quantity <= 5).length;
    const outOfStock = accessories.filter(a => a.quantity === 0).length;
    return { total, inStock, lowStock, outOfStock };
  }, [accessories]);

  // Lấy danh sách danh mục
  const categories = useMemo(() => {
    return [...new Set(accessories.map(acc => acc.category))].filter(Boolean).sort();
  }, [accessories]);

  // Bộ lọc kết hợp: Từ khóa + Danh mục + Trạng thái + Sắp xếp
  const filteredAndSortedAccessories = useMemo(() => {
    // 1. Lọc dữ liệu
    let result = accessories.filter(acc => {
      const query = searchTerm.toLowerCase();
      const matchSearch = (acc.name || '').toLowerCase().includes(query) ||
        (acc.sku || '').toLowerCase().includes(query);

      const matchCategory = selectedCategory === '' || acc.category === selectedCategory;

      let matchStock = true;
      if (stockFilter === 'IN_STOCK') matchStock = acc.quantity > 5;
      else if (stockFilter === 'LOW_STOCK') matchStock = acc.quantity > 0 && acc.quantity <= 5;
      else if (stockFilter === 'OUT_OF_STOCK') matchStock = acc.quantity === 0;

      return matchSearch && matchCategory && matchStock;
    });

    // 2. Sắp xếp dữ liệu
    result.sort((a, b) => {
      if (sortBy === 'price_desc') return (b.price || 0) - (a.price || 0);
      if (sortBy === 'price_asc') return (a.price || 0) - (b.price || 0);
      if (sortBy === 'qty_desc') return (b.quantity || 0) - (a.quantity || 0);
      if (sortBy === 'qty_asc') return (a.quantity || 0) - (b.quantity || 0);
      if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '');
      return 0; // default
    });

    return result;
  }, [accessories, searchTerm, selectedCategory, stockFilter, sortBy]);

  // Phân trang
  const totalPages = Math.ceil(filteredAndSortedAccessories.length / itemsPerPage);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const currentAccessories = filteredAndSortedAccessories.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset trang về 1 khi đổi bộ lọc
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, stockFilter, sortBy]);

  // Hàm Reset toàn bộ lọc
  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setStockFilter('ALL');
    setSortBy('default');
  };

  const isFilterActive = searchTerm || selectedCategory !== '' || stockFilter !== 'ALL' || sortBy !== 'default';

  // Badge tồn kho
  const renderStockBadge = (quantity) => {
    if (quantity === 0) return <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-3 py-1 rounded-pill fw-medium">Hết hàng (0)</span>;
    if (quantity <= 5) return <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-3 py-1 rounded-pill fw-medium">Sắp hết ({quantity})</span>;
    return <span className="badge bg-success-subtle text-success border border-success-subtle px-3 py-1 rounded-pill fw-medium">Còn hàng ({quantity})</span>;
  };

  return (
    <div className="container-fluid py-4 bg-light min-vh-100">

      {/* Tiêu đề & Cập nhật */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h3 className="m-0 fw-bold text-dark d-flex align-items-center gap-2">
            <div className="bg-primary bg-opacity-10 p-2 rounded text-primary">
              <Package size={24} />
            </div>
            Tồn Kho Phụ Kiện
          </h3>
          <p className="text-secondary small mb-0 mt-1">Theo dõi mức tồn, định giá và tình trạng hàng hóa</p>
        </div>
        <button
          className="btn btn-outline-secondary btn-sm rounded-pill px-3 d-flex align-items-center gap-2 align-self-start align-self-md-auto bg-white shadow-sm"
          onClick={fetchAccessories}
          disabled={isLoading}
        >
          <RotateCcw size={14} className={isLoading ? 'spin-animation' : ''} />
          Đồng bộ dữ liệu
        </button>
      </div>
      {/* Bảng Dữ Liệu & Bộ lọc dạng Toolbar */}
      <div className="card shadow-sm border-0 rounded-4 overflow-hidden">

        {/* Toolbar Bộ lọc Dropdown Mới */}
        <div className="card-header bg-white border-bottom p-4">
          <div className="row g-3">

            {/* Search Input (Bên trái) */}
            <div className="col-12 col-xl-4">
              <div className="position-relative h-100 d-flex align-items-center">
                <Search size={18} className="position-absolute text-muted ms-3" />
                <input
                  type="text"
                  className="form-control ps-5 pe-4 py-2 rounded-3 shadow-none bg-light border-0 w-100"
                  placeholder="Tìm theo tên hoặc mã SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <X
                    size={16}
                    className="position-absolute end-0 text-muted me-3 cursor-pointer"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSearchTerm('')}
                  />
                )}
              </div>
            </div>

            {/* Các Select Bộ Lọc (Bên phải) */}
            <div className="col-12 col-xl-8 d-flex flex-wrap gap-2 justify-content-xl-end align-items-center">

              <div className="d-flex align-items-center gap-2 bg-light px-3 py-1 rounded-3 border">
                <SlidersHorizontal size={14} className="text-secondary" />
                <span className="small fw-medium text-secondary">Bộ lọc:</span>
              </div>

              <select
                className="form-select form-select-sm w-auto rounded-3 py-2 shadow-none border-secondary-subtle cursor-pointer"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="">Tất cả danh mục</option>
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>

              <select
                className="form-select form-select-sm w-auto rounded-3 py-2 shadow-none border-secondary-subtle cursor-pointer"
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
              >
                <option value="ALL">Mọi trạng thái tồn</option>
                <option value="IN_STOCK">Còn hàng (&gt;5)</option>
                <option value="LOW_STOCK">Sắp hết (1-5)</option>
                <option value="OUT_OF_STOCK">Hết hàng (0)</option>
              </select>

              <select
                className="form-select form-select-sm w-auto rounded-3 py-2 shadow-none border-secondary-subtle cursor-pointer"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="default">Sắp xếp mặc định</option>
                <option value="name_asc">Tên: A - Z</option>
                <option value="qty_desc">Tồn kho: Nhiều nhất</option>
                <option value="qty_asc">Tồn kho: Ít nhất</option>
                <option value="price_desc">Giá: Cao - Thấp</option>
                <option value="price_asc">Giá: Thấp - Cao</option>
              </select>

              {/* Nút Xóa lọc */}
              {isFilterActive && (
                <button
                  className="btn btn-sm btn-outline-danger rounded-3 py-2 px-3 d-flex align-items-center gap-1 transition-all"
                  onClick={handleResetFilters}
                  title="Xóa bộ lọc"
                >
                  <X size={14} /> Bỏ lọc
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table Body */}
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0 bg-white">
              <thead className="table-light text-secondary small text-uppercase fw-semibold">
                <tr>
                  <th className="text-center py-3" style={{ width: '5%' }}>STT</th>
                  <th className="py-3" style={{ width: '15%' }}>Mã SKU</th>
                  <th className="py-3" style={{ width: '30%' }}>Tên phụ kiện</th>
                  <th className="py-3" style={{ width: '15%' }}>Phân loại</th>
                  <th className="text-center py-3" style={{ width: '12%' }}>Tồn kho</th>
                  <th className="text-end py-3" style={{ width: '13%' }}>Đơn giá</th>
                  <th className="text-center py-3" style={{ width: '10%' }}>Cập nhật</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-5">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                      <div className="text-muted mt-2 small">Đang tải kho phụ kiện...</div>
                    </td>
                  </tr>
                ) : currentAccessories.length > 0 ? (
                  currentAccessories.map((acc, index) => (
                    <tr key={acc.sku}>
                      <td className="text-center text-muted">
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>
                      <td>
                        <span className="fw-medium text-dark bg-light px-2 py-1 rounded font-monospace small border">
                          {acc.sku}
                        </span>
                      </td>
                      <td>
                        <span className="fw-semibold text-dark">{acc.name}</span>
                      </td>
                      <td>
                        <span className="badge rounded-pill bg-light text-secondary border px-2 py-1">
                          {acc.category}
                        </span>
                      </td>
                      <td className="text-center">
                        {renderStockBadge(acc.quantity)}
                      </td>
                      <td className="text-end">
                        {acc.price ? (
                          <span className="fw-bold text-dark">{formatCurrency(acc.price)} đ</span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="text-center">
                        <span className="text-muted small">
                          {acc.updatedAt ? new Date(acc.updatedAt).toLocaleDateString('vi-VN') : '—'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center py-5">
                      <div className="text-muted d-flex flex-column align-items-center">
                        <div className="bg-light p-3 rounded-circle mb-3">
                          <PackageMinus size={36} className="text-secondary opacity-50" />
                        </div>
                        <h6 className="fw-bold text-dark mb-1">Không tìm thấy phụ kiện</h6>
                        <p className="mb-3 small">Không có dữ liệu khớp với điều kiện lọc hiện tại</p>
                        <button className="btn btn-outline-primary btn-sm rounded-pill px-4" onClick={handleResetFilters}>
                          Bỏ lọc để xem tất cả
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Phân trang */}
        {filteredAndSortedAccessories.length > 0 && (
          <div className="card-footer bg-white border-top p-3 d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">
            <div className="d-flex align-items-center gap-3 flex-wrap">
              <span className="small text-muted">
                Hiển thị <strong>{((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredAndSortedAccessories.length)}</strong> / <strong>{filteredAndSortedAccessories.length}</strong> sản phẩm
              </span>

              <div className="d-flex align-items-center gap-2">
                <span className="small text-muted">Dòng/trang:</span>
                <select
                  className="form-select form-select-sm w-auto rounded-3 shadow-none border-secondary-subtle"
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {totalPages > 1 && (
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                  <button className="page-link px-3 rounded-start-3" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}>
                    Trước
                  </button>
                </li>
                {[...Array(totalPages)].map((_, i) => {
                  if (totalPages > 5 && (i < currentPage - 2 || i > currentPage) && i !== 0 && i !== totalPages - 1) {
                    if (i === 1 || i === totalPages - 2) return <li key={i} className="page-item disabled"><span className="page-link border-0 text-muted">...</span></li>;
                    return null;
                  }
                  return (
                    <li key={i} className={`page-item ${currentPage === i + 1 ? 'active' : ''}`}>
                      <button className="page-link" onClick={() => setCurrentPage(i + 1)}>
                        {i + 1}
                      </button>
                    </li>
                  );
                })}
                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                  <button className="page-link px-3 rounded-end-3" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}>
                    Sau
                  </button>
                </li>
              </ul>
            )}
          </div>
        )}

      </div>
    </div>
  );
}