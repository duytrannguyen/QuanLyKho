import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, Search, PackageMinus, X, Plus, Edit3, Trash2, History,
  AlertTriangle, CheckCircle2, XCircle, RotateCcw, SlidersHorizontal, Save
} from 'lucide-react';
import { apiPhuKien } from '../../api';
import { useToast } from '../../contexts/notification/NguCanhThongBao';
import { formatCurrency, parseCurrency } from '../../utils/dinh_dang';

export default function TrangTonKhoPhuKien() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [accessories, setAccessories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // State Bộ Lọc & Tìm kiếm
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [stockFilter, setStockFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('default');

  // State Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // State Modals (Sửa, Xóa, Lịch sử)
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    category: '',
    price: '',
    quantity: 0,
    defaultWarrantyMonths: 0
  });
  const [isSaving, setIsSaving] = useState(false);

  const [deletingItem, setDeletingItem] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [historyItem, setHistoryItem] = useState(null);
  const [historyList, setHistoryList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    fetchAccessories();
  }, []);

  const fetchAccessories = async () => {
    setIsLoading(true);
    try {
      const res = await apiPhuKien.getAll();
      setAccessories(res.data || []);
    } catch (err) {
      console.error('Lỗi lấy danh sách phụ kiện:', err);
      showToast('Không thể tải danh sách phụ kiện', 'danger');
    } finally {
      setIsLoading(false);
    }
  };

  // Mở modal sửa
  const handleOpenEdit = (acc) => {
    setEditingItem(acc);
    setEditForm({
      name: acc.name || '',
      category: acc.category || '',
      price: acc.price ? formatCurrency(acc.price) : '',
      quantity: acc.quantity ?? 0,
      defaultWarrantyMonths: acc.defaultWarrantyMonths ?? 0
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingItem) return;
    if (!editForm.name.trim()) {
      showToast('Vui lòng nhập tên phụ kiện', 'warning');
      return;
    }
    setIsSaving(true);
    try {
      await apiPhuKien.updateAccessory(editingItem.id, {
        name: editForm.name.trim(),
        category: editForm.category.trim(),
        price: parseCurrency(editForm.price) || 0,
        quantity: Number(editForm.quantity) || 0,
        defaultWarrantyMonths: Number(editForm.defaultWarrantyMonths) || 0
      });
      showToast('Cập nhật phụ kiện thành công!', 'success');
      setEditingItem(null);
      fetchAccessories();
    } catch (err) {
      showToast(err.userMessage || err.message || 'Lỗi cập nhật phụ kiện', 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  // Xóa phụ kiện
  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    setIsDeleting(true);
    try {
      await apiPhuKien.deleteAccessory(deletingItem.id);
      showToast(`Đã xóa phụ kiện ${deletingItem.name}`, 'success');
      setDeletingItem(null);
      fetchAccessories();
    } catch (err) {
      showToast(err.userMessage || err.message || 'Không thể xóa phụ kiện này', 'danger');
    } finally {
      setIsDeleting(false);
    }
  };

  // Xem lịch sử nhập/xuất của 1 SKU hoặc toàn bộ
  const handleOpenHistory = async (acc = null) => {
    setHistoryItem(acc || { sku: 'ALL', name: 'Toàn bộ kho phụ kiện' });
    setLoadingHistory(true);
    try {
      const res = await apiPhuKien.getHistory(acc?.sku ? { sku: acc.sku } : {});
      const list = res.data || [];
      setHistoryList(acc?.sku ? list.filter(h => h.sku === acc.sku) : list);
    } catch (err) {
      showToast('Lỗi tải lịch sử biến động phụ kiện', 'danger');
    } finally {
      setLoadingHistory(false);
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

  // Bộ lọc kết hợp
  const filteredAndSortedAccessories = useMemo(() => {
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

    result.sort((a, b) => {
      if (sortBy === 'price_desc') return (b.price || 0) - (a.price || 0);
      if (sortBy === 'price_asc') return (a.price || 0) - (b.price || 0);
      if (sortBy === 'qty_desc') return (b.quantity || 0) - (a.quantity || 0);
      if (sortBy === 'qty_asc') return (a.quantity || 0) - (b.quantity || 0);
      if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '');
      return 0;
    });

    return result;
  }, [accessories, searchTerm, selectedCategory, stockFilter, sortBy]);

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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, stockFilter, sortBy]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setStockFilter('ALL');
    setSortBy('default');
  };

  const isFilterActive = searchTerm || selectedCategory !== '' || stockFilter !== 'ALL' || sortBy !== 'default';

  const renderStockBadge = (quantity) => {
    if (quantity === 0) return <span className="badge bg-danger-subtle text-danger px-3 py-2 rounded-pill fw-bold">Hết hàng (0)</span>;
    if (quantity <= 5) return <span className="badge bg-warning-subtle text-warning-emphasis px-3 py-2 rounded-pill fw-bold">Sắp hết ({quantity})</span>;
    return <span className="badge bg-success-subtle text-success px-3 py-2 rounded-pill fw-bold">Còn hàng ({quantity})</span>;
  };

  return (
    <div className="container-fluid py-4 bg-light min-vh-100">
      {/* Tiêu đề & Nút hành động */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="m-0 fw-bold text-dark d-flex align-items-center">
            <Package className="me-2 text-primary" size={28} />
            Tồn Kho Phụ Kiện
          </h2>
          <p className="text-secondary mb-0 mt-1">
            Quản lý tồn kho, cập nhật giá bán, thời hạn bảo hành và lịch sử xuất/nhập phụ kiện
          </p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <button
            className="btn btn-white border shadow-sm rounded-pill px-3 d-flex align-items-center gap-2"
            onClick={() => handleOpenHistory(null)}
          >
            <History size={16} className="text-primary" />
            <span className="fw-medium">Lịch sử xuất/nhập</span>
          </button>
          <button
            className="btn btn-white border shadow-sm rounded-pill px-3 d-flex align-items-center gap-2"
            onClick={fetchAccessories}
            disabled={isLoading}
          >
            <RotateCcw size={16} className={`text-secondary ${isLoading ? 'spin-animation' : ''}`} />
            <span className="fw-medium">Làm mới</span>
          </button>
          <button
            className="btn btn-primary shadow-sm rounded-pill px-4 d-flex align-items-center gap-2 fw-semibold"
            onClick={() => navigate('/nhap-phu-kien')}
          >
            <Plus size={18} />
            <span>Nhập phụ kiện</span>
          </button>
        </div>
      </div>

      {/* KPI STATS CARDS */}
      <div className="row g-3 mb-4">
        {[
          { title: 'Tổng mã phụ kiện', value: kpiStats.total, sub: `Tổng SL: ${kpiStats.totalQty} món`, icon: <Package size={24} />, color: 'primary' },
          { title: 'Đang còn hàng', value: kpiStats.inStock, sub: 'Tồn kho an toàn (> 5 cái)', icon: <CheckCircle2 size={24} />, color: 'success' },
          { title: 'Sắp hết hàng', value: kpiStats.lowStock, sub: 'Cần dự trù nhập (1 - 5 cái)', icon: <AlertTriangle size={24} />, color: 'warning' },
          { title: 'Đã hết hàng', value: kpiStats.outOfStock, sub: 'Hết sạch trong kho (0 cái)', icon: <XCircle size={24} />, color: 'danger' }
        ].map((kpi, idx) => (
          <div key={idx} className="col-sm-6 col-xl-3">
            <div className="card shadow-sm border-0 rounded-4 p-3 bg-white h-100">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-secondary fw-semibold">{kpi.title}</span>
                <div className={`p-2 bg-${kpi.color}-subtle text-${kpi.color} rounded-3`}>
                  {kpi.icon}
                </div>
              </div>
              <h3 className="fw-bold text-dark m-0">{kpi.value}</h3>
              <small className="text-muted mt-2 d-block border-top pt-2">{kpi.sub}</small>
            </div>
          </div>
        ))}
      </div>

      {/* Bảng Dữ Liệu & Bộ lọc */}
      <div className="card shadow-sm border-0 rounded-4 overflow-hidden">
        <div className="card-header bg-white border-bottom p-3">
          <div className="row g-2 align-items-center">
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
                    className="position-absolute text-muted me-3 top-50 end-0 translate-middle-y"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSearchTerm('')}
                  />
                )}
              </div>
            </div>

            <div className="col-12 col-xl-8 d-flex flex-wrap flex-md-nowrap gap-2 justify-content-xl-end">
              <div className="input-group input-group-sm w-auto flex-grow-1 flex-md-grow-0 bg-light rounded-pill p-1">
                <span className="input-group-text border-0 bg-transparent text-secondary pe-1">
                  <Package size={16} />
                </span>
                <select
                  className="form-select border-0 bg-transparent shadow-none fw-medium text-dark"
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
                  className="form-select border-0 bg-transparent shadow-none fw-medium text-dark"
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
                  className="form-select border-0 bg-transparent shadow-none fw-medium text-dark"
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

              {isFilterActive && (
                <button
                  className="btn btn-sm btn-outline-danger rounded-pill py-1 px-3 d-flex align-items-center gap-1"
                  onClick={handleResetFilters}
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
                  <th className="py-3" style={{ width: '14%' }}>Mã SKU</th>
                  <th className="py-3" style={{ width: '26%' }}>Tên phụ kiện</th>
                  <th className="text-center py-3" style={{ width: '12%' }}>Phân loại</th>
                  <th className="text-center py-3" style={{ width: '12%' }}>Tồn kho</th>
                  <th className="text-end py-3" style={{ width: '12%' }}>Đơn giá</th>
                  <th className="text-center py-3" style={{ width: '9%' }}>Bảo hành</th>
                  <th className="text-center py-3 pe-4" style={{ width: '10%' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody className="border-top-0">
                {isLoading ? (
                  <tr>
                    <td colSpan="8" className="text-center py-5">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                      <div className="text-muted mt-2 small">Đang tải kho phụ kiện...</div>
                    </td>
                  </tr>
                ) : currentAccessories.length > 0 ? (
                  currentAccessories.map((acc, index) => (
                    <tr key={acc.id || acc.sku}>
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
                          {acc.category || 'Khác'}
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
                      <td className="text-center">
                        <span className="small text-secondary">
                          {acc.defaultWarrantyMonths ? `${acc.defaultWarrantyMonths} tháng` : 'Không BH'}
                        </span>
                      </td>
                      <td className="text-center pe-4">
                        <div className="d-flex justify-content-center gap-1">
                          <button
                            className="btn btn-sm btn-light border text-secondary"
                            title="Lịch sử nhập/xuất"
                            onClick={() => handleOpenHistory(acc)}
                          >
                            <History size={15} />
                          </button>
                          <button
                            className="btn btn-sm btn-light border text-primary"
                            title="Chỉnh sửa thông tin / Giá / Tồn kho"
                            onClick={() => handleOpenEdit(acc)}
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            className="btn btn-sm btn-light border text-danger"
                            title="Xóa phụ kiện"
                            onClick={() => setDeletingItem(acc)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="text-center py-5">
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
                  className="form-select form-select-sm w-auto rounded-3 shadow-none border-secondary-subtle fw-medium"
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
                        className={`page-link rounded-3 border-0 fw-bold ${currentPage === i + 1 ? 'bg-primary text-white shadow-sm' : 'text-dark'}`}
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

      {/* MODAL CHỈNH SỬA PHỤ KIỆN */}
      {editingItem && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.55)', zIndex: 1055 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header border-bottom px-4 py-3">
                <div>
                  <h5 className="modal-title fw-bold text-dark m-0">Cập nhật phụ kiện</h5>
                  <small className="text-secondary font-monospace">{editingItem.sku}</small>
                </div>
                <button type="button" className="btn-close" onClick={() => setEditingItem(null)} disabled={isSaving}></button>
              </div>
              <form onSubmit={handleSaveEdit}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label fw-semibold small text-secondary">Tên phụ kiện <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      value={editForm.name}
                      onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold small text-secondary">Phân loại</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editForm.category}
                        onChange={e => setEditForm(prev => ({ ...prev, category: e.target.value }))}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold small text-secondary">Số lượng tồn kho</label>
                      <input
                        type="number"
                        min="0"
                        className="form-control"
                        value={editForm.quantity}
                        onChange={e => setEditForm(prev => ({ ...prev, quantity: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold small text-secondary">Đơn giá bán (VNĐ)</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editForm.price}
                        onChange={e => setEditForm(prev => ({ ...prev, price: formatCurrency(parseCurrency(e.target.value)) }))}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold small text-secondary">Bảo hành mặc định (Tháng)</label>
                      <select
                        className="form-select"
                        value={editForm.defaultWarrantyMonths}
                        onChange={e => setEditForm(prev => ({ ...prev, defaultWarrantyMonths: Number(e.target.value) }))}
                      >
                        <option value={0}>Không bảo hành (0T)</option>
                        <option value={1}>1 Tháng</option>
                        <option value={3}>3 Tháng</option>
                        <option value={6}>6 Tháng</option>
                        <option value={12}>12 Tháng</option>
                        <option value={24}>24 Tháng</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-top px-4 py-3">
                  <button type="button" className="btn btn-light border" onClick={() => setEditingItem(null)} disabled={isSaving}>Hủy</button>
                  <button type="submit" className="btn btn-primary d-flex align-items-center gap-2 px-4" disabled={isSaving}>
                    <Save size={16} /> {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN XÓA */}
      {deletingItem && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.55)', zIndex: 1055 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header border-bottom px-4 py-3">
                <h5 className="modal-title fw-bold text-danger m-0">Xác nhận xóa phụ kiện</h5>
                <button type="button" className="btn-close" onClick={() => setDeletingItem(null)} disabled={isDeleting}></button>
              </div>
              <div className="modal-body p-4">
                <p className="mb-2">Bạn có chắc chắn muốn xóa phụ kiện:</p>
                <div className="p-3 bg-light rounded-3 border mb-2">
                  <div className="fw-bold text-dark">{deletingItem.name}</div>
                  <div className="small text-secondary">Mã SKU: {deletingItem.sku} | Tồn hiện tại: {deletingItem.quantity}</div>
                </div>
                <small className="text-muted">Hành động này sẽ xóa mã phụ kiện khỏi danh sách tồn kho hiện hành.</small>
              </div>
              <div className="modal-footer border-top px-4 py-3">
                <button type="button" className="btn btn-light border" onClick={() => setDeletingItem(null)} disabled={isDeleting}>Hủy</button>
                <button type="button" className="btn btn-danger px-4" onClick={handleConfirmDelete} disabled={isDeleting}>
                  {isDeleting ? 'Đang xóa...' : 'Xác nhận xóa'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL LỊCH SỬ BIẾN ĐỘNG PHỤ KIỆN */}
      {historyItem && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.55)', zIndex: 1055 }}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header border-bottom px-4 py-3">
                <div>
                  <h5 className="modal-title fw-bold text-dark m-0">Lịch sử xuất / nhập phụ kiện</h5>
                  <small className="text-secondary">{historyItem.name} ({historyItem.sku})</small>
                </div>
                <button type="button" className="btn-close" onClick={() => setHistoryItem(null)}></button>
              </div>
              <div className="modal-body p-0">
                {loadingHistory ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status"></div>
                  </div>
                ) : historyList.length === 0 ? (
                  <div className="text-center py-5 text-secondary">Chưa có lịch sử biến động nào.</div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light small text-secondary text-uppercase">
                        <tr>
                          <th className="ps-4">Thời gian</th>
                          <th>Mã SKU</th>
                          <th>Tên phụ kiện</th>
                          <th className="text-center">Loại</th>
                          <th className="text-center">SL</th>
                          <th className="text-end">Đơn giá</th>
                          <th className="pe-4">Ghi chú / Khách hàng</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historyList.slice(0, 100).map((h, i) => (
                          <tr key={h.id || i}>
                            <td className="ps-4 small text-secondary">
                              {h.createdAt ? new Date(h.createdAt).toLocaleString('vi-VN') : '—'}
                            </td>
                            <td className="font-monospace small">{h.sku}</td>
                            <td className="fw-medium">{h.name}</td>
                            <td className="text-center">
                              <span className={`badge rounded-pill ${
                                h.action === 'IMPORT' || h.action === 'RETURN'
                                  ? 'bg-success-subtle text-success'
                                  : h.action === 'SELL'
                                  ? 'bg-danger-subtle text-danger'
                                  : 'bg-secondary-subtle text-secondary'
                              }`}>
                                {h.action === 'IMPORT' ? 'Nhập kho' : h.action === 'SELL' ? 'Xuất bán' : h.action === 'RETURN' ? 'Hoàn kho' : h.action}
                              </span>
                            </td>
                            <td className="text-center fw-bold">
                              {h.action === 'SELL' ? `-${h.quantity}` : `+${h.quantity}`}
                            </td>
                            <td className="text-end small">
                              {h.price ? `${formatCurrency(h.price)} đ` : '—'}
                            </td>
                            <td className="pe-4 small text-secondary">
                              {h.customerName ? `${h.customerName} (${h.customerPhone || ''}) - ` : ''}{h.note || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="modal-footer border-top px-4 py-2">
                <button type="button" className="btn btn-secondary btn-sm px-3" onClick={() => setHistoryItem(null)}>Đóng</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
