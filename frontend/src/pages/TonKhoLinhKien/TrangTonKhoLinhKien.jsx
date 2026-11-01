import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Cpu, Search, Plus, RotateCcw, Edit3, Trash2, History,
  CheckCircle2, AlertTriangle, XCircle, SlidersHorizontal, 
  ShieldCheck, ArrowUpDown, X, Tag, Package, Filter, MoreHorizontal
} from 'lucide-react';
import { useToast } from '../../contexts/notification/NguCanhThongBao';
import { apiLinhKien } from '../../api';
import { formatCurrency, parseCurrency, formatDate } from '../../utils/dinh_dang';

export default function TrangTonKhoLinhKien() {
  const navigate = useNavigate();
  const { showToast, confirm } = useToast();

  const [parts, setParts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Bộ lọc
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [stockFilter, setStockFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('default');

  // Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modal Sửa nhanh linh kiện
  const [editingPart, setEditingPart] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    category: '',
    retailPrice: '',
    upgradePrice: '',
    importPrice: '',
    warrantyPeriod: '',
    warrantyMonths: 1,
    quantity: 0,
    note: ''
  });
  const [isUpdating, setIsUpdating] = useState(false);

  // Modal Lịch sử biến động
  const [historyPart, setHistoryPart] = useState(null);
  const [histories, setHistories] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    fetchParts();
    fetchCategories();
  }, []);

  const fetchParts = async () => {
    setIsLoading(true);
    try {
      const res = await apiLinhKien.getAll();
      setParts(res.data?.data || res.data || []);
    } catch (err) {
      console.error('Lỗi lấy danh sách linh kiện:', err);
      showToast('Không thể tải danh sách linh kiện', 'danger');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await apiLinhKien.getCategories();
      setCategories(res.data?.data || res.data || []);
    } catch (err) {
      console.error('Lỗi tải danh mục:', err);
    }
  };

  // KPI Thống kê
  const kpiStats = useMemo(() => {
    const total = parts.length;
    const inStock = parts.filter(p => p.quantity > 5).length;
    const lowStock = parts.filter(p => p.quantity > 0 && p.quantity <= 5).length;
    const outOfStock = parts.filter(p => p.quantity <= 0).length;
    const totalQty = parts.reduce((sum, p) => sum + (p.quantity || 0), 0);
    return { total, inStock, lowStock, outOfStock, totalQty };
  }, [parts]);

  // Bộ lọc kết hợp
  const filteredAndSortedParts = useMemo(() => {
    let result = parts.filter(p => {
      const q = searchTerm.toLowerCase();
      const matchSearch = !searchTerm.trim() ||
        (p.name || '').toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q) ||
        (p.note || '').toLowerCase().includes(q);

      const matchCategory = !selectedCategory || p.category === selectedCategory;

      let matchStock = true;
      if (stockFilter === 'IN_STOCK') matchStock = p.quantity > 5;
      else if (stockFilter === 'LOW_STOCK') matchStock = p.quantity > 0 && p.quantity <= 5;
      else if (stockFilter === 'OUT_OF_STOCK') matchStock = p.quantity <= 0;

      return matchSearch && matchCategory && matchStock;
    });

    result.sort((a, b) => {
      if (sortBy === 'qty_desc') return (b.quantity || 0) - (a.quantity || 0);
      if (sortBy === 'qty_asc') return (a.quantity || 0) - (b.quantity || 0);
      if (sortBy === 'price_desc') return (Number(b.retailPrice) || 0) - (Number(a.retailPrice) || 0);
      if (sortBy === 'price_asc') return (Number(a.retailPrice) || 0) - (Number(b.retailPrice) || 0);
      if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '');
      return (b.id || 0) - (a.id || 0); // default mới nhất
    });

    return result;
  }, [parts, searchTerm, selectedCategory, stockFilter, sortBy]);

  // Phân trang
  const totalPages = Math.ceil(filteredAndSortedParts.length / itemsPerPage);
  const currentParts = filteredAndSortedParts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, stockFilter, sortBy, itemsPerPage]);

  const handleOpenEdit = (part) => {
    setEditingPart(part);
    setEditFormData({
      name: part.name || '',
      category: part.category || '',
      retailPrice: part.retailPrice ? formatCurrency(part.retailPrice) : '',
      upgradePrice: part.upgradePrice ? formatCurrency(part.upgradePrice) : '',
      importPrice: part.importPrice ? formatCurrency(part.importPrice) : '',
      warrantyPeriod: part.warrantyPeriod || '1 Tháng',
      warrantyMonths: part.warrantyMonths || 1,
      quantity: part.quantity || 0,
      note: part.note || ''
    });
  };

  const handleSaveEdit = async () => {
    if (!editingPart) return;
    setIsUpdating(true);
    try {
      const payload = {
        name: editFormData.name.trim(),
        category: editFormData.category,
        retailPrice: parseCurrency(editFormData.retailPrice) || 0,
        upgradePrice: parseCurrency(editFormData.upgradePrice) || 0,
        importPrice: parseCurrency(editFormData.importPrice) || 0,
        warrantyPeriod: editFormData.warrantyPeriod,
        warrantyMonths: parseInt(editFormData.warrantyMonths, 10) || 1,
        quantity: parseInt(editFormData.quantity, 10) || 0,
        note: editFormData.note ? editFormData.note.trim() : ''
      };

      await apiLinhKien.updatePart(editingPart.id, payload);
      showToast('Cập nhật thông tin linh kiện thành công!', 'success');
      setEditingPart(null);
      fetchParts();
    } catch (err) {
      showToast(err.userMessage || err.message || 'Lỗi khi cập nhật linh kiện', 'danger');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeletePart = async (part) => {
    const isConfirmed = await confirm(`Bạn có chắc chắn muốn xóa linh kiện ${part.name} (${part.sku}) khỏi kho?`);
    if (!isConfirmed) return;

    try {
      await apiLinhKien.deletePart(part.id);
      showToast(`Đã xóa linh kiện ${part.sku} thành công`, 'success');
      fetchParts();
    } catch (err) {
      showToast(err.userMessage || err.message || 'Lỗi khi xóa linh kiện', 'danger');
    }
  };

  const handleOpenHistory = async (part) => {
    setHistoryPart(part);
    setIsLoadingHistory(true);
    try {
      const res = await apiLinhKien.getHistory(part.sku ? { sku: part.sku } : {});
      setHistories(res.data?.data || res.data || []);
    } catch (err) {
      console.error('Lỗi lấy lịch sử linh kiện:', err);
      showToast('Không thể tải lịch sử biến động', 'danger');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const renderStockBadge = (qty) => {
    if (qty <= 0) return <span className="badge bg-danger-subtle text-danger px-3 py-2 rounded-pill fw-bold">Hết hàng (0)</span>;
    if (qty <= 5) return <span className="badge bg-warning-subtle text-warning-emphasis px-3 py-2 rounded-pill fw-bold">Sắp hết ({qty})</span>;
    return <span className="badge bg-success-subtle text-success px-3 py-2 rounded-pill fw-bold">Còn hàng ({qty})</span>;
  };

  const renderActionBadge = (action) => {
    switch (action) {
      case 'IMPORT':
        return <span className="badge bg-success-subtle text-success border border-success-subtle">Nhập kho</span>;
      case 'REPAIR_USE':
        return <span className="badge bg-primary-subtle text-primary border border-primary-subtle">Thay sửa chữa</span>;
      case 'UPGRADE_USE':
        return <span className="badge bg-info-subtle text-info border border-info-subtle">Nâng cấp máy</span>;
      case 'MANUAL_ADJUST':
        return <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle">Điều chỉnh tồn</span>;
      default:
        return <span className="badge bg-secondary-subtle text-secondary">{action}</span>;
    }
  };

  return (
    <div className="container-fluid py-4 bg-light min-vh-100">
      
      {/* HEADER PAGE */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="m-0 fw-bold text-dark d-flex align-items-center">
            <Cpu className="me-2 text-primary" size={28} /> Tồn Kho Linh Kiện
          </h2>
          <p className="text-secondary mb-0 mt-1">
            Quản lý tồn kho, định giá bán lẻ, thời hạn bảo hành của linh kiện sửa chữa & nâng cấp
          </p>
        </div>

        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="btn btn-white border shadow-sm rounded-pill px-3 d-flex align-items-center gap-2 transition-all hover-bg-light"
            onClick={fetchParts}
            disabled={isLoading}
          >
            <RotateCcw size={16} className={`text-secondary ${isLoading ? 'spin-animation' : ''}`} />
            <span className="fw-medium">Đồng bộ</span>
          </button>
          <button
            type="button"
            className="btn btn-primary rounded-pill px-4 shadow-sm d-flex align-items-center gap-2 transition-all"
            onClick={() => navigate('/nhap-linh-kien')}
          >
            <Plus size={18} />
            <span className="fw-bold">Nhập linh kiện</span>
          </button>
        </div>
      </div>

      {/* KPI STATS CARDS */}
      <div className="row g-3 mb-4">
        {[
          { title: "Tổng phân loại", value: kpiStats.total, sub: `Tổng SL: ${kpiStats.totalQty} món`, icon: <Package size={24} />, color: "primary" },
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

      {/* MAIN DATA TABLE COMPONENT */}
      <div className="card shadow-sm border-0 rounded-4 overflow-hidden mb-4">
        
        {/* Bộ lọc Toolbar */}
        <div className="card-header bg-white border-bottom p-3">
          <div className="row g-2 align-items-center">
            
            {/* Search */}
            <div className="col-12 col-lg-4">
              <div className="position-relative">
                <Search size={18} className="position-absolute text-muted ms-3 top-50 translate-middle-y" />
                <input
                  type="text"
                  className="form-control ps-5 py-2 bg-light border-0 shadow-none rounded-pill"
                  placeholder="Tìm tên, mã SKU, ghi chú..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Filters Area */}
            <div className="col-12 col-lg-8 d-flex flex-wrap flex-md-nowrap gap-2 justify-content-lg-end">
              <div className="input-group input-group-sm w-auto flex-grow-1 flex-md-grow-0 bg-light rounded-pill p-1">
                <span className="input-group-text border-0 bg-transparent text-secondary pe-1"><Filter size={16}/></span>
                <select 
                  className="form-select border-0 bg-transparent shadow-none fw-medium text-dark" 
                  value={selectedCategory} 
                  onChange={e => setSelectedCategory(e.target.value)}
                >
                  <option value="">Tất cả danh mục</option>
                  {categories.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                </select>
              </div>

              <div className="input-group input-group-sm w-auto flex-grow-1 flex-md-grow-0 bg-light rounded-pill p-1">
                <span className="input-group-text border-0 bg-transparent text-secondary pe-1"><Package size={16}/></span>
                <select 
                  className="form-select border-0 bg-transparent shadow-none fw-medium text-dark" 
                  value={stockFilter} 
                  onChange={e => setStockFilter(e.target.value)}
                >
                  <option value="ALL">Mọi trạng thái</option>
                  <option value="IN_STOCK">Còn hàng (&gt; 5)</option>
                  <option value="LOW_STOCK">Sắp hết (1 - 5)</option>
                  <option value="OUT_OF_STOCK">Hết hàng (0)</option>
                </select>
              </div>

              <div className="input-group input-group-sm w-auto flex-grow-1 flex-md-grow-0 bg-light rounded-pill p-1">
                <span className="input-group-text border-0 bg-transparent text-secondary pe-1"><ArrowUpDown size={16}/></span>
                <select 
                  className="form-select border-0 bg-transparent shadow-none fw-medium text-dark" 
                  value={sortBy} 
                  onChange={e => setSortBy(e.target.value)}
                >
                  <option value="default">Mới nhất</option>
                  <option value="qty_desc">Tồn kho giảm dần</option>
                  <option value="qty_asc">Tồn kho tăng dần</option>
                  <option value="price_desc">Giá bán giảm dần</option>
                  <option value="price_asc">Giá bán tăng dần</option>
                  <option value="name_asc">Tên (A-Z)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Bảng Dữ Liệu */}
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light text-secondary small text-uppercase">
              <tr>
                <th className="text-center py-3 fw-semibold" style={{ width: '5%' }}>STT</th>
                <th className="py-3 fw-semibold">Linh kiện / Mã SKU</th>
                <th className="py-3 fw-semibold text-center">Phân loại</th>
                <th className="py-3 fw-semibold text-center">Kho</th>
                <th className="py-3 fw-semibold text-end">Giá bán lẻ</th>
                <th className="py-3 fw-semibold text-end">Nâng cấp máy</th>
                <th className="py-3 fw-semibold text-center">Bảo hành</th>
                <th className="pe-4 py-3 fw-semibold text-end">Thao tác</th>
              </tr>
            </thead>
            <tbody className="border-top-0">
              {isLoading ? (
                <tr>
                  <td colSpan="8" className="text-center py-5">
                    <div className="spinner-border text-primary spinner-border-sm me-2" role="status"></div>
                    <span className="text-muted">Đang tải dữ liệu kho...</span>
                  </td>
                </tr>
              ) : currentParts.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-5">
                    <div className="bg-light rounded-circle d-inline-flex p-3 mb-3">
                      <Search size={32} className="text-secondary opacity-50" />
                    </div>
                    <h6 className="text-dark fw-bold">Không tìm thấy linh kiện</h6>
                    <p className="text-muted small">Hãy thử thay đổi từ khóa hoặc bộ lọc của bạn.</p>
                  </td>
                </tr>
              ) : (
                currentParts.map((part, index) => (
                  <tr key={part.id} className="transition-all hover-bg-light">
                    <td className="text-center text-muted">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td className="py-3">
                      <div className="d-flex flex-column">
                        <span className="fw-bold text-dark text-wrap" style={{ maxWidth: '300px' }}>{part.name}</span>
                        <div className="d-flex align-items-center gap-2 mt-1">
                          <span className="badge bg-secondary-subtle text-secondary font-monospace">{part.sku}</span>
                          {part.note && (
                            <span className="text-muted small text-truncate" style={{ maxWidth: '200px' }} title={part.note}>
                              • {part.note}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="text-center">
                      <span className="badge bg-light text-dark border px-2 py-1">{part.category}</span>
                    </td>
                    <td className="text-center">
                      {renderStockBadge(part.quantity)}
                    </td>
                    <td className="text-end">
                      <div className="fw-bold text-danger">{part.retailPrice ? formatCurrency(part.retailPrice) + 'đ' : '0đ'}</div>
                    </td>
                    <td className="text-end">
                      <div className="fw-bold text-primary">{part.upgradePrice ? formatCurrency(part.upgradePrice) + 'đ' : '0đ'}</div>
                    </td>
                    <td className="text-center">
                      <span className="d-inline-flex align-items-center text-secondary small fw-medium">
                        <ShieldCheck size={14} className="me-1 text-success" />
                        {part.warrantyPeriod || (part.warrantyMonths ? `${part.warrantyMonths} Tháng` : 'Không BH')}
                      </span>
                    </td>
                    <td className="pe-4 text-end">
                      <div className="d-flex justify-content-end gap-2">
                        <button
                          type="button"
                          className="btn btn-sm btn-light border text-primary px-2 py-1 rounded-3 hover-primary"
                          title="Chỉnh sửa thông tin"
                          onClick={() => handleOpenEdit(part)}
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-light border text-info px-2 py-1 rounded-3 hover-info"
                          title="Lịch sử biến động"
                          onClick={() => handleOpenHistory(part)}
                        >
                          <History size={16} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-light border text-danger px-2 py-1 rounded-3 hover-danger"
                          title="Xóa"
                          onClick={() => handleDeletePart(part)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Phân Trang (Pagination) */}
        {!isLoading && filteredAndSortedParts.length > 0 && (
          <div className="card-footer bg-white border-top p-3 d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">
            
            {/* Rows per page selector */}
            <div className="d-flex align-items-center gap-2 small text-muted">
              <span>Hiển thị</span>
              <select 
                className="form-select form-select-sm w-auto fw-medium shadow-none cursor-pointer"
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1); // Reset về trang 1 khi đổi số lượng hiển thị
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>trên tổng {filteredAndSortedParts.length} mục</span>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <nav aria-label="Page navigation">
                <ul className="pagination pagination-sm m-0 gap-1">
                  <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                    <button className="page-link border-0 rounded-3 text-dark fw-medium" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}>
                      Trước
                    </button>
                  </li>
                  
                  {[...Array(totalPages)].map((_, i) => (
                    <li key={i + 1} className="page-item">
                      <button
                        className={`page-link border-0 rounded-3 fw-bold ${currentPage === i + 1 ? 'bg-primary text-white shadow-sm' : 'text-dark hover-bg-light'}`}
                        onClick={() => setCurrentPage(i + 1)}
                      >
                        {i + 1}
                      </button>
                    </li>
                  ))}

                  <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                    <button className="page-link border-0 rounded-3 text-dark fw-medium" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}>
                      Sau
                    </button>
                  </li>
                </ul>
              </nav>
            )}
          </div>
        )}
      </div>

      {/* =========================================
          MODAL SỬA NHANH THÔNG TIN LINH KIỆN
      ========================================= */}
      {editingPart && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              
              <div className="modal-header bg-light border-bottom py-3 px-4">
                <div>
                  <h5 className="modal-title fw-bold text-dark d-flex align-items-center">
                    <Edit3 size={18} className="me-2 text-primary" /> Cập Nhật Thông Tin
                  </h5>
                  <small className="text-muted">SKU: <span className="text-primary font-monospace fw-bold">{editingPart.sku}</span></small>
                </div>
                <button type="button" className="btn-close shadow-none" onClick={() => setEditingPart(null)}></button>
              </div>
              
              <div className="modal-body p-4">
                
                {/* Basic Info */}
                <div className="mb-4">
                  <h6 className="fw-bold text-secondary mb-3 fs-6 border-bottom pb-2">Thông tin cơ bản</h6>
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label text-dark fw-semibold small">Tên linh kiện <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className="form-control rounded-3"
                        value={editFormData.name}
                        onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label text-dark fw-semibold small">Phân loại <span className="text-danger">*</span></label>
                      <select
                        className="form-select rounded-3"
                        value={editFormData.category}
                        onChange={e => setEditFormData({ ...editFormData, category: e.target.value })}
                      >
                        {categories.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label text-dark fw-semibold small">Số lượng kho <span className="text-danger">*</span></label>
                      <input
                        type="number"
                        min="0"
                        className="form-control rounded-3 fw-bold text-success"
                        value={editFormData.quantity}
                        onChange={e => setEditFormData({ ...editFormData, quantity: parseInt(e.target.value, 10) || 0 })}
                      />
                    </div>
                  </div>
                </div>

                {/* Pricing Info */}
                <div className="mb-4">
                  <h6 className="fw-bold text-secondary mb-3 fs-6 border-bottom pb-2">Định giá & Bảo hành</h6>
                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="form-label text-dark fw-semibold small">Giá bán lẻ (Sửa chữa)</label>
                      <div className="input-group">
                        <input
                          type="text"
                          className="form-control text-end text-danger fw-bold rounded-start-3"
                          value={editFormData.retailPrice}
                          onChange={e => {
                            const raw = parseCurrency(e.target.value);
                            setEditFormData({ ...editFormData, retailPrice: raw ? formatCurrency(raw) : '' });
                          }}
                        />
                        <span className="input-group-text bg-light rounded-end-3">đ</span>
                      </div>
                    </div>
                    
                    <div className="col-md-4">
                      <label className="form-label text-dark fw-semibold small">Giá nâng cấp (Kèm máy)</label>
                      <div className="input-group">
                        <input
                          type="text"
                          className="form-control text-end text-primary fw-bold rounded-start-3"
                          value={editFormData.upgradePrice}
                          onChange={e => {
                            const raw = parseCurrency(e.target.value);
                            setEditFormData({ ...editFormData, upgradePrice: raw ? formatCurrency(raw) : '' });
                          }}
                        />
                        <span className="input-group-text bg-light rounded-end-3">đ</span>
                      </div>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label text-dark fw-semibold small">Giá nhập vốn</label>
                      <div className="input-group">
                        <input
                          type="text"
                          className="form-control text-end text-muted rounded-start-3"
                          value={editFormData.importPrice}
                          onChange={e => {
                            const raw = parseCurrency(e.target.value);
                            setEditFormData({ ...editFormData, importPrice: raw ? formatCurrency(raw) : '' });
                          }}
                        />
                        <span className="input-group-text bg-light rounded-end-3">đ</span>
                      </div>
                    </div>

                    <div className="col-md-12">
                      <label className="form-label text-dark fw-semibold small">Chuỗi hiển thị bảo hành</label>
                      <input
                        type="text"
                        className="form-control rounded-3"
                        placeholder="VD: 1 Tháng, 6 Tháng..."
                        value={editFormData.warrantyPeriod}
                        onChange={e => setEditFormData({ ...editFormData, warrantyPeriod: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="form-label text-dark fw-semibold small">Ghi chú / Thông số kỹ thuật</label>
                  <textarea
                    rows="2"
                    className="form-control rounded-3"
                    value={editFormData.note}
                    onChange={e => setEditFormData({ ...editFormData, note: e.target.value })}
                  />
                </div>

              </div>
              
              <div className="modal-footer bg-light border-top py-3 px-4">
                <button type="button" className="btn btn-white border rounded-pill px-4 fw-medium" onClick={() => setEditingPart(null)}>
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  className="btn btn-primary rounded-pill px-4 fw-bold shadow-sm d-flex align-items-center"
                  disabled={isUpdating}
                  onClick={handleSaveEdit}
                >
                  {isUpdating ? (
                    <><span className="spinner-border spinner-border-sm me-2"></span> Đang lưu...</>
                  ) : (
                    <><CheckCircle2 size={18} className="me-2" /> Lưu thông tin</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
          MODAL XEM LỊCH SỬ BIẾN ĐỘNG LINH KIỆN
      ========================================= */}
      {historyPart && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered modal-xl">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              
              <div className="modal-header bg-white border-bottom py-3 px-4">
                <div>
                  <h5 className="modal-title fw-bold text-dark d-flex align-items-center">
                    <History size={20} className="me-2 text-info" /> Nhật Ký Biến Động
                  </h5>
                  <div className="text-secondary mt-1">
                    <span className="fw-medium text-dark">{historyPart.name}</span> 
                    <span className="mx-2">|</span> 
                    SKU: <span className="font-monospace text-primary fw-bold">{historyPart.sku}</span>
                  </div>
                </div>
                <button type="button" className="btn-close shadow-none" onClick={() => setHistoryPart(null)}></button>
              </div>

              <div className="modal-body p-0 overflow-y-auto bg-light" style={{ maxHeight: '60vh' }}>
                {isLoadingHistory ? (
                  <div className="text-center py-5 text-muted d-flex flex-column align-items-center">
                    <div className="spinner-border text-primary mb-3" role="status"></div>
                    <span>Đang trích xuất dữ liệu lịch sử...</span>
                  </div>
                ) : histories.length === 0 ? (
                  <div className="text-center py-5 text-muted">
                    <History size={48} className="opacity-25 mb-3" />
                    <h6>Chưa có dữ liệu</h6>
                    <p className="small">Linh kiện này chưa có lịch sử xuất/nhập kho.</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0 bg-white">
                      <thead className="table-light small text-uppercase sticky-top shadow-sm">
                        <tr>
                          <th className="ps-4 py-3 fw-semibold">Thời gian</th>
                          <th className="py-3 fw-semibold">Thao tác</th>
                          <th className="py-3 fw-semibold text-center">SL</th>
                          <th className="py-3 fw-semibold text-end">Giá trị</th>
                          <th className="py-3 fw-semibold">Chứng từ / Đối tượng</th>
                          <th className="pe-4 py-3 fw-semibold">Ghi chú</th>
                        </tr>
                      </thead>
                      <tbody className="small border-top-0">
                        {histories.map(h => (
                          <tr key={h.id}>
                            <td className="ps-4 py-3 text-secondary">{formatDate(h.createdAt)}</td>
                            <td>{renderActionBadge(h.action)}</td>
                            <td className="text-center">
                              {h.quantity > 0 
                                ? <span className="badge bg-success-subtle text-success fs-6 px-2">+{h.quantity}</span> 
                                : <span className="badge bg-danger-subtle text-danger fs-6 px-2">{h.quantity}</span>
                              }
                            </td>
                            <td className="text-end text-dark fw-bold">
                              {h.price ? formatCurrency(h.price) + 'đ' : '—'}
                            </td>
                            <td>
                              {h.orderCode ? (
                                <div><span className="badge bg-light text-primary border border-primary-subtle font-monospace p-1 mb-1">{h.orderCode}</span></div>
                              ) : null}
                              {h.customerName ? (
                                <div className="text-dark fw-medium">{h.customerName} {h.customerPhone && <span className="text-muted fw-normal">({h.customerPhone})</span>}</div>
                              ) : <span className="text-muted">—</span>}
                            </td>
                            <td className="pe-4 text-muted fst-italic">{h.note || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              
              <div className="modal-footer bg-white border-top py-3 px-4">
                <button type="button" className="btn btn-secondary rounded-pill px-5 fw-medium" onClick={() => setHistoryPart(null)}>
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}