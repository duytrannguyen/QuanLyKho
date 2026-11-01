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
    const totalQty = accessories.reduce((sum, a) => sum + (a.quantity || 0), 0);
    
    return { total, inStock, lowStock, outOfStock, totalQty };
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
    if (quantity === 0) return <span className="badge bg-danger-subtle text-danger px-3 py-2 rounded-pill fw-bold">Hết hàng (0)</span>;
    if (quantity <= 5) return <span className="badge bg-warning-subtle text-warning-emphasis px-3 py-2 rounded-pill fw-bold">Sắp hết ({quantity})</span>;
    return <span className="badge bg-success-subtle text-success px-3 py-2 rounded-pill fw-bold">Còn hàng ({quantity})</span>;
  };

  return (
    <div className="container-fluid py-4 bg-light min-vh-100">

      {/* Tiêu đề & Cập nhật */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="m-0 fw-bold text-dark d-flex align-items-center">
            <Package className="me-2 text-primary" size={28} />
            Tồn Kho Phụ Kiện
          </h2>
          <p className="text-secondary mb-0 mt-1">
            Theo dõi mức tồn, định giá và tình trạng hàng hóa
          </p>
        </div>
        <button
          className="btn btn-white border shadow-sm rounded-pill px-3 d-flex align-items-center gap-2 transition-all"
          onClick={fetchAccessories}
          disabled={isLoading}
        >
          <RotateCcw size={16} className={`text-secondary ${isLoading ? 'spin-animation' : ''}`} />
          <span className="fw-medium">Đồng bộ dữ liệu</span>
        </button>
      </div>

      {/* KPI STATS CARDS (Khu vực thống kê mới thêm) */}
      <div className="row g-3 mb-4">
        {[
          { title: "Tổng mã phụ kiện", value: kpiStats.total, sub: `Tổng SL: ${kpiStats.totalQty} món`, icon: <Package size={24} />, color: "primary" },
          { title: "Đang còn hàng", value: kpiStats.inStock, sub: "Tồn kho an toàn (> 5 cái)", icon: <CheckCircle2 size={24} />, color: "success" },
          { title: "Sắp hết hàng", value: kpiStats.lowStock, sub: "Cần dự trù nhập (1 - 5 cái)", icon: <AlertTriangle size={24} />, color: "warning" },
          { title: "Đã hết hàng", value: kpiStats.outOfStock, sub: "Hết sạch trong kho (0 cái)", icon: <XCircle size={24} />, color: "danger" }
        ].map((kpi, idx) => (
          <div key={idx} className="col-sm-6 col-xl-3">
            <div className="card shadow-sm border-0 rounded-4 p-3 bg-white h-100 transition-all hover-shadow">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-secondary fw-semibold">{kpi.title}</span>
                <div className={`p-2 bg-${kpi.color}-subtle text-${kpi.color} rounded-3`}>
                  {kpi.icon}
                </div>
              </div>
              <h3 className={`fw-bold text-dark m-0`}>{kpi.value}</h3>
              <small className="text-muted mt-2 d-block border-top pt-2">{kpi.sub}</small>
            </div>
          </div>
        ))}
      </div>

      {/* Bảng Dữ Liệu & Bộ lọc dạng Toolbar */}
      <div className="card shadow-sm border-0 rounded-4 overflow-hidden">

        {/* Toolbar Bộ lọc Dropdown */}
        <div className="card-header bg-white border-bottom p-3">
          <div className="row g-2 align-items-center">

            {/* Search Input (Bên trái) */}
            <div className="col-12 col-xl-4">
              <div className="position-relative">
                <Search size={18} className="position-absolute text-muted ms-3 top-50 translate-middle-y" />
                <input
                  type="text"
                  className="form-control ps-5 py-2 bg-light border-0 shadow-none rounded-pill"
                  placeholder="Tìm theo tên hoặc mã SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <X
                    size={16}
                    className="position-absolute text-muted me-3 top-50 end-0 translate-middle-y cursor-pointer"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSearchTerm('')}
                  />
                )}
              </div>
            </div>

            {/* Các Select Bộ Lọc (Bên phải) */}
            <div className="col-12 col-xl-8 d-flex flex-wrap flex-md-nowrap gap-2 justify-content-xl-end">
              <div className="input-group input-group-sm w-auto flex-grow-1 flex-md-grow-0 bg-light rounded-pill p-1">
                <span className="input-group-text border-0 bg-transparent text-secondary pe-1">
                  <Package size={16} />
                </span>
                <select
                  className="form-select border-0 bg-transparent shadow-none fw-medium text-dark cursor-pointer"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="">Tất cả danh mục</option>
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>

              <div className="input-group input-group-sm w-auto flex-grow-1 flex-md-grow-0 bg-light rounded-pill p-1">
                <span className="input-group-text border-0 bg-transparent text-secondary pe-1">
                  <SlidersHorizontal size={16} />
                </span>
                <select
                  className="form-select border-0 bg-transparent shadow-none fw-medium text-dark cursor-pointer"
                  value={stockFilter}
                  onChange={(e) => setStockFilter(e.target.value)}
                >
                  <option value="ALL">Mọi trạng thái tồn</option>
                  <option value="IN_STOCK">Còn hàng (&gt;5)</option>
                  <option value="LOW_STOCK">Sắp hết (1-5)</option>
                  <option value="OUT_OF_STOCK">Hết hàng (0)</option>
                </select>
              </div>

              <div className="input-group input-group-sm w-auto flex-grow-1 flex-md-grow-0 bg-light rounded-pill p-1">
                <span className="input-group-text border-0 bg-transparent text-secondary pe-1">
                  <SlidersHorizontal size={16} />
                </span>
                <select
                  className="form-select border-0 bg-transparent shadow-none fw-medium text-dark cursor-pointer"
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
              </div>

              {/* Nút Xóa lọc */}
              {isFilterActive && (
                <button
                  className="btn btn-sm btn-outline-danger rounded-pill py-1 px-3 d-flex align-items-center gap-1 transition-all"
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
                  <th className="text-center py-3" style={{ width: '15%' }}>Phân loại</th>
                  <th className="text-center py-3" style={{ width: '12%' }}>Tồn kho</th>
                  <th className="text-end py-3" style={{ width: '13%' }}>Đơn giá</th>
                  <th className="text-center py-3 pe-4" style={{ width: '10%' }}>Cập nhật</th>
                </tr>
              </thead>
              <tbody className="border-top-0">
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
                    <tr key={acc.sku} className="transition-all hover-bg-light">
                      <td className="text-center text-muted">
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>
                      <td>
                        <span className="fw-medium text-dark bg-light px-2 py-1 rounded-3 font-monospace small border">
                          {acc.sku}
                        </span>
                      </td>
                      <td>
                        <span className="fw-bold text-dark">{acc.name}</span>
                      </td>
                      <td className="text-center">
                        <span className="badge rounded-pill bg-light text-secondary border px-3 py-1">
                          {acc.category}
                        </span>
                      </td>
                      <td className="text-center">
                        {renderStockBadge(acc.quantity)}
                      </td>
                      <td className="text-end">
                        {acc.price ? (
                          <span className="fw-bold text-danger">{formatCurrency(acc.price)} đ</span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="text-center pe-4">
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
                  className="form-select form-select-sm w-auto rounded-3 shadow-none border-secondary-subtle cursor-pointer fw-medium"
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
              <ul className="pagination pagination-sm mb-0 gap-1">
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                  <button className="page-link px-3 rounded-3 border-0 text-dark fw-medium" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}>
                    Trước
                  </button>
                </li>
                {[...Array(totalPages)].map((_, i) => {
                  if (totalPages > 5 && (i < currentPage - 2 || i > currentPage) && i !== 0 && i !== totalPages - 1) {
                    if (i === 1 || i === totalPages - 2) return <li key={i} className="page-item disabled"><span className="page-link border-0 text-muted bg-transparent">...</span></li>;
                    return null;
                  }
                  return (
                    <li key={i} className="page-item">
                      <button 
                        className={`page-link rounded-3 border-0 fw-bold ${currentPage === i + 1 ? 'bg-primary text-white shadow-sm' : 'text-dark hover-bg-light'}`}
                        onClick={() => setCurrentPage(i + 1)}
                      >
                        {i + 1}
                      </button>
                    </li>
                  );
                })}
                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                  <button className="page-link px-3 rounded-3 border-0 text-dark fw-medium" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}>
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