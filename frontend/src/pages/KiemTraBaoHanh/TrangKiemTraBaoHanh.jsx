import React, { useState } from 'react';
import { Search, ShieldCheck, AlertCircle, FileText, XCircle, X, Laptop, ShoppingBag, Wrench, Info, CheckCircle2, Edit3 } from 'lucide-react';
import { apiBaoHanh } from '../../api';
import { useToast } from '../../contexts/notification/NguCanhThongBao';
import ModalChiTietDonHang from './ModalChiTietDonHang';
import ModalSuaDonMay from './ModalSuaDonMay';
import ModalSuaDonPhuKien from './ModalSuaDonPhuKien';
import ModalSuaDonSuaChua from './ModalSuaDonSuaChua';
import { getCleanWarrantyType, formatCurrency, formatDate } from '../../utils/dinh_dang';

export default function TrangKiemTraBaoHanh() {
  const { showToast } = useToast();
  const [keyword, setKeyword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Dữ liệu tra cứu hợp nhất
  const [machines, setMachines] = useState([]);
  const [accessories, setAccessories] = useState([]);
  const [repairs, setRepairs] = useState([]);

  // Phân loại tìm kiếm: 'MACHINES' | 'ACCESSORIES' | 'REPAIRS' (chỉ tìm trong danh mục đang chọn)
  const [searchCategory, setSearchCategory] = useState('MACHINES');

  // Active Tab hiển thị kết quả: 'MACHINES' | 'ACCESSORIES' | 'REPAIRS'
  const [activeTab, setActiveTab] = useState('MACHINES');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedRepairOrder, setSelectedRepairOrder] = useState(null);
  const [selectedAccessoryOrder, setSelectedAccessoryOrder] = useState(null);

  // Modal chỉnh sửa các hóa đơn
  const [editingMachineOrder, setEditingMachineOrder] = useState(null);
  const [editingAccessoryOrder, setEditingAccessoryOrder] = useState(null);
  const [editingRepairOrder, setEditingRepairOrder] = useState(null);

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!keyword.trim()) return;

    setIsLoading(true);
    setHasSearched(true);
    try {
      const res = await apiBaoHanh.checkWarranty(keyword.trim());
      const data = res.data?.data || res.data || {};
      
      if (Array.isArray(data)) {
        if (searchCategory === 'MACHINES') {
          setMachines(data);
        } else {
          setMachines([]);
        }
        setAccessories([]);
        setRepairs([]);
        setActiveTab(searchCategory);
      } else {
        const m = data.machines || [];
        const a = data.accessories || [];
        const r = data.repairs || [];

        // Chỉ lưu và hiển thị đúng danh mục người dùng đã chọn
        if (searchCategory === 'MACHINES') {
          setMachines(m);
          setAccessories([]);
          setRepairs([]);
          setActiveTab('MACHINES');
          if (selectedOrder) {
            const updated = m.find(item => item.cycleId === selectedOrder.cycleId);
            if (updated) setSelectedOrder(updated);
          }
        } else if (searchCategory === 'ACCESSORIES') {
          setMachines([]);
          setAccessories(a);
          setRepairs([]);
          setActiveTab('ACCESSORIES');
          if (selectedAccessoryOrder) {
            const updated = a.find(item => item.id === selectedAccessoryOrder.id);
            if (updated) setSelectedAccessoryOrder(updated);
          }
        } else if (searchCategory === 'REPAIRS') {
          setMachines([]);
          setAccessories([]);
          setRepairs(r);
          setActiveTab('REPAIRS');
          if (selectedRepairOrder) {
            const updated = r.find(item => item.id === selectedRepairOrder.id);
            if (updated) setSelectedRepairOrder(updated);
          }
        }
      }

    } catch (err) {
      showToast(err.userMessage || err.message || 'Lỗi khi tra cứu bảo hành', 'danger');
      setMachines([]);
      setAccessories([]);
      setRepairs([]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearSearch = () => {
    setKeyword('');
    setMachines([]);
    setAccessories([]);
    setRepairs([]);
    setHasSearched(false);
    setSelectedOrder(null);
  };

  const getWarrantyStatus = (saleDate, warrantyPeriod, isVoided, warrantyExpiry, isInStock) => {
    if (isInStock) {
      const now = new Date();
      let end = warrantyExpiry ? new Date(warrantyExpiry) : null;
      if (end) {
        end.setHours(23, 59, 59, 999);
        const diffTime = end.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (now > end) {
          return {
            status: 'IN_STOCK_EXPIRED',
            text: 'Tồn kho (Hết BH)',
            badge: 'bg-warning bg-opacity-25 text-dark border border-warning',
            icon: AlertCircle,
            endDate: end,
            diffDays: Math.abs(diffDays)
          };
        }
        return {
          status: 'IN_STOCK',
          text: 'Tồn kho (Còn BH)',
          badge: 'bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25',
          icon: ShieldCheck,
          endDate: end,
          diffDays
        };
      }
      return {
        status: 'IN_STOCK',
        text: 'Tồn kho (Chưa bán)',
        badge: 'bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25',
        icon: ShieldCheck,
        endDate: null
      };
    }

    if (!saleDate && !warrantyExpiry) {
      return {
        status: 'UNKNOWN',
        text: 'Không xác định',
        badge: 'bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25',
        icon: AlertCircle,
        endDate: null
      };
    }

    const now = new Date();
    let end;

    if (warrantyExpiry) {
      end = new Date(warrantyExpiry);
      end.setHours(23, 59, 59, 999);
    } else if (warrantyPeriod) {
      const dateMatch = warrantyPeriod.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
      if (dateMatch) {
        const day = parseInt(dateMatch[1]);
        const month = parseInt(dateMatch[2]) - 1;
        const year = parseInt(dateMatch[3]);
        end = new Date(year, month, day, 23, 59, 59, 999);
      } else if (warrantyPeriod.toLowerCase().includes('tháng')) {
        const monthMatch = warrantyPeriod.match(/(\d+)/);
        if (monthMatch) {
          const months = parseInt(monthMatch[1]);
          const sale = new Date(saleDate);
          end = new Date(sale.setMonth(sale.getMonth() + months));
          end.setHours(23, 59, 59, 999);
        }
      } else if (warrantyPeriod.toLowerCase().includes('năm')) {
        const yearMatch = warrantyPeriod.match(/(\d+)/);
        if (yearMatch) {
          const years = parseInt(yearMatch[1]);
          const sale = new Date(saleDate);
          end = new Date(sale.setFullYear(sale.getFullYear() + years));
          end.setHours(23, 59, 59, 999);
        }
      } else if (warrantyPeriod.toLowerCase().includes('ngày')) {
        const dayMatch = warrantyPeriod.match(/(\d+)/);
        if (dayMatch) {
          const days = parseInt(dayMatch[1]);
          const sale = new Date(saleDate);
          end = new Date(sale.setDate(sale.getDate() + days));
          end.setHours(23, 59, 59, 999);
        }
      }
    }

    if (isVoided) {
      return {
        status: 'VOIDED',
        text: 'Đã thu lại (Vô hiệu)',
        badge: 'bg-dark bg-opacity-10 text-dark border border-dark border-opacity-25',
        icon: XCircle,
        endDate: end
      };
    }

    if (end) {
      const diffTime = end.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (now > end) {
        return {
          status: 'EXPIRED',
          text: 'Hết hạn bảo hành',
          badge: 'bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25',
          icon: AlertCircle,
          endDate: end,
          diffDays: Math.abs(diffDays)
        };
      } else {
        return {
          status: 'VALID',
          text: 'Còn hạn bảo hành',
          badge: 'bg-success bg-opacity-10 text-success border border-success border-opacity-25',
          icon: ShieldCheck,
          endDate: end,
          diffDays
        };
      }
    }

    return {
      status: 'CUSTOM',
      text: 'Theo thỏa thuận',
      badge: 'bg-info bg-opacity-10 text-info border border-info border-opacity-25',
      icon: FileText,
      endDate: null
    };
  };

  const getItemExpiryStatus = (expiryDate) => {
    if (!expiryDate) {
      return {
        text: 'Không bảo hành',
        badge: 'bg-secondary bg-opacity-10 text-secondary',
        icon: AlertCircle
      };
    }
    const now = new Date();
    const end = new Date(expiryDate);
    end.setHours(23, 59, 59, 999);
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        text: `Hết hạn (${Math.abs(diffDays)} ngày trước)`,
        badge: 'bg-danger bg-opacity-10 text-danger',
        icon: AlertCircle
      };
    }
    return {
      text: `Còn hạn (${diffDays} ngày)`,
      badge: 'bg-success bg-opacity-10 text-success',
      icon: ShieldCheck
    };
  };

  const totalResults = machines.length + accessories.length + repairs.length;

  return (
    <div className="container-fluid py-4 bg-light min-vh-100 d-flex flex-column gap-4">
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center">
        <div>
          <h2 className="m-0 fw-bold text-dark d-flex align-items-center gap-3">
            <div className="bg-primary bg-opacity-10 text-primary p-2 rounded-3 d-flex align-items-center justify-content-center">
              <ShieldCheck size={28} />
            </div>
            <div>
              Tra Cứu Bảo Hành & Đơn Hàng
              <div className="text-secondary fw-normal fs-6 mt-1">Đồng bộ tra cứu Máy tính, Phụ kiện và Dịch vụ sửa chữa</div>
            </div>
          </h2>
        </div>
      </div>

      {/* SEARCH SECTION */}
      <div className="card shadow-sm border-0 rounded-4 overflow-hidden">
        <div className="card-body p-4 p-md-5 bg-white">
          <div className="row justify-content-center">
            <div className="col-12 col-xl-9 text-center">
              <h5 className="fw-bold text-dark mb-3">Lựa chọn danh mục và nhập thông tin tra cứu</h5>

              {/* Bộ chọn danh mục: Chỉ tìm theo 1 danh mục cụ thể */}
              <div className="d-flex flex-wrap justify-content-center gap-2 mb-4">
                <button
                  type="button"
                  className={`btn rounded-pill px-4 py-2 fw-semibold d-flex align-items-center gap-2 transition-all ${
                    searchCategory === 'MACHINES'
                      ? 'btn-primary shadow-sm'
                      : 'btn-light text-secondary border'
                  }`}
                  onClick={() => {
                    setSearchCategory('MACHINES');
                    setActiveTab('MACHINES');
                    setAccessories([]);
                    setRepairs([]);
                  }}
                >
                  <Laptop size={18} />
                  <span>Máy tính {hasSearched && searchCategory === 'MACHINES' ? `(${machines.length})` : '(Shop)'}</span>
                </button>
                <button
                  type="button"
                  className={`btn rounded-pill px-4 py-2 fw-semibold d-flex align-items-center gap-2 transition-all ${
                    searchCategory === 'ACCESSORIES'
                      ? 'btn-primary shadow-sm'
                      : 'btn-light text-secondary border'
                  }`}
                  onClick={() => {
                    setSearchCategory('ACCESSORIES');
                    setActiveTab('ACCESSORIES');
                    setMachines([]);
                    setRepairs([]);
                  }}
                >
                  <ShoppingBag size={18} />
                  <span>Phụ kiện {hasSearched && searchCategory === 'ACCESSORIES' ? `(${accessories.length})` : '(Lẻ)'}</span>
                </button>
                <button
                  type="button"
                  className={`btn rounded-pill px-4 py-2 fw-semibold d-flex align-items-center gap-2 transition-all ${
                    searchCategory === 'REPAIRS'
                      ? 'btn-primary shadow-sm'
                      : 'btn-light text-secondary border'
                  }`}
                  onClick={() => {
                    setSearchCategory('REPAIRS');
                    setActiveTab('REPAIRS');
                    setMachines([]);
                    setAccessories([]);
                  }}
                >
                  <Wrench size={18} />
                  <span>Sửa chữa {hasSearched && searchCategory === 'REPAIRS' ? `(${repairs.length})` : '(Dịch vụ)'}</span>
                </button>
              </div>

              {/* Ô input tìm kiếm */}
              <form onSubmit={handleSearch} className="row g-3 align-items-center justify-content-center">
                <div className="col-12 col-md-9 position-relative">
                  <Search className="position-absolute top-50 translate-middle-y text-muted ms-3" size={22} style={{ left: '15px' }} />
                  <input
                    type="text"
                    className="form-control form-control-lg rounded-pill ps-5 pe-5 shadow-sm border-2"
                    style={{ backgroundColor: '#fdfdfe', borderColor: '#e9ecef', height: '56px' }}
                    placeholder={
                      searchCategory === 'MACHINES'
                        ? 'Nhập Serial máy, SĐT khách hàng, Tên model laptop...'
                        : searchCategory === 'ACCESSORIES'
                        ? 'Nhập SĐT khách hàng, Tên phụ kiện, Mã đơn hàng...'
                        : searchCategory === 'REPAIRS'
                        ? 'Nhập SĐT khách hàng, Mã phiếu sửa chữa, Model máy...'
                        : 'Nhập SĐT khách hàng, Số Serial, Tên khách hoặc Mã đơn...'
                    }
                    value={keyword}
                    onChange={e => setKeyword(e.target.value)}
                    disabled={isLoading}
                    autoFocus
                  />
                  {keyword && (
                    <X
                      className="position-absolute top-50 translate-middle-y text-muted hover-dark"
                      size={20}
                      style={{ right: '25px', cursor: 'pointer' }}
                      onClick={clearSearch}
                    />
                  )}
                </div>

                <div className="col-12 col-md-3">
                  <button
                    type="submit"
                    className="btn btn-primary btn-lg rounded-pill w-100 d-flex align-items-center justify-content-center fw-bold shadow-sm"
                    style={{ height: '56px' }}
                    disabled={isLoading || !keyword.trim()}
                  >
                    {isLoading ? (
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    ) : (
                      <Search size={20} className="me-2" />
                    )}
                    Tra cứu ngay
                  </button>
                </div>
              </form>

            </div>
          </div>
        </div>
      </div>

      {/* RESULTS SECTION */}
      {hasSearched && (
        <div className="card shadow-sm border-0 rounded-4 overflow-hidden mb-4">
          <div className="card-header bg-white border-bottom py-3 px-4 d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div>
              <h5 className="card-title fw-bold m-0 text-dark">
                Kết quả tra cứu cho "{keyword}"
              </h5>
              <div className="text-secondary small mt-1 d-flex align-items-center gap-1">
                <Info size={14} className="text-primary" />
                <span>Tìm thấy tổng cộng <strong>{totalResults}</strong> bản ghi bảo hành khớp dữ liệu</span>
              </div>
            </div>

            {/* Category Indicator */}
            <div className="d-flex align-items-center">
              {searchCategory === 'MACHINES' && (
                <div className="badge bg-primary bg-opacity-10 text-primary fs-6 px-3 py-2 rounded-pill d-flex align-items-center gap-2">
                  <Laptop size={18} />
                  <span>Danh mục: Máy tính ({machines.length})</span>
                </div>
              )}
              {searchCategory === 'ACCESSORIES' && (
                <div className="badge bg-primary bg-opacity-10 text-primary fs-6 px-3 py-2 rounded-pill d-flex align-items-center gap-2">
                  <ShoppingBag size={18} />
                  <span>Danh mục: Phụ kiện ({accessories.length})</span>
                </div>
              )}
              {searchCategory === 'REPAIRS' && (
                <div className="badge bg-primary bg-opacity-10 text-primary fs-6 px-3 py-2 rounded-pill d-flex align-items-center gap-2">
                  <Wrench size={18} />
                  <span>Danh mục: Dịch vụ sửa chữa ({repairs.length})</span>
                </div>
              )}
            </div>
          </div>

          <div className="card-body p-0">
            {isLoading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary mb-3" role="status"></div>
                <h6 className="text-muted fw-semibold">Đang tổng hợp dữ liệu bảo hành từ hệ thống...</h6>
              </div>
            ) : totalResults === 0 ? (
              <div className="text-center py-5 my-3">
                <div className="bg-light rounded-circle d-inline-flex p-4 mb-3 shadow-sm">
                  <FileText size={48} className="text-secondary opacity-50" />
                </div>
                <h5 className="fw-bold text-dark">Không tìm thấy thông tin phù hợp</h5>
                <p className="text-muted mb-3">Không có máy tính, phụ kiện hay phiếu sửa chữa nào khớp với từ khóa <strong className="text-dark">"{keyword}"</strong></p>
                <button className="btn btn-outline-primary rounded-pill px-4 fw-semibold" onClick={clearSearch}>
                  Xóa tìm kiếm & Thử lại
                </button>
              </div>
            ) : (
              <>
                {/* TAB 1: MÁY MUA TẠI SHOP */}
                {activeTab === 'MACHINES' && (
                  machines.length > 0 ? (
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0 bg-white">
                        <thead className="table-light text-secondary small text-uppercase fw-semibold">
                          <tr>
                            <th className="px-4 py-3" style={{ width: '24%' }}>Máy & Cấu hình</th>
                            <th className="py-3" style={{ width: '13%' }}>Số Serial</th>
                            <th className="py-3" style={{ width: '14%' }}>Khách hàng</th>
                            <th className="py-3" style={{ width: '13%' }}>Giá & Ngày bán</th>
                            <th className="py-3 text-center" style={{ width: '11%' }}>Gói bảo hành</th>
                            <th className="py-3" style={{ width: '12%' }}>Ngày hết hạn</th>
                            <th className="py-3 text-center" style={{ width: '11%' }}>Trạng thái</th>
                            <th className="py-3 text-end px-4" style={{ width: '11%' }}>Thao tác</th>
                          </tr>
                        </thead>
                        <tbody>
                          {machines.map((item, index) => {
                            const statusInfo = getWarrantyStatus(item.saleDate, item.warrantyPeriod, item.isVoided, item.warrantyExpiry, item.isInStock);
                            const StatusIcon = statusInfo.icon;
                            return (
                              <tr key={item.cycleId || index} onClick={() => setSelectedOrder(item)} style={{ cursor: 'pointer' }} title="Bấm để xem chi tiết đơn hàng">
                                <td className="px-4 py-3">
                                  <div className="fw-bold text-dark">{item.sourceModelText || 'Không rõ dòng máy'}</div>
                                  {item.configInfo && (
                                    <div className="small text-muted mt-1 text-truncate" style={{ maxWidth: '280px' }}>{item.configInfo}</div>
                                  )}
                                </td>
                                <td className="py-3">
                                  <span className="font-monospace fw-semibold bg-light px-2 py-1 rounded border text-dark">{item.serialKey}</span>
                                </td>
                                <td className="py-3">
                                  <div className="fw-semibold text-dark">{item.customerName || 'Khách lẻ'}</div>
                                  <div className="small text-muted">{item.customerPhone}</div>
                                </td>
                                <td className="py-3">
                                  <div className="fw-semibold text-primary mb-1">{item.salePrice ? formatCurrency(item.salePrice) + ' đ' : '—'}</div>
                                  <div className="small text-secondary">{item.saleDate ? new Date(item.saleDate).toLocaleDateString('vi-VN') : '—'}</div>
                                </td>
                                <td className="py-3 text-center">
                                  <span className="badge bg-light text-dark border px-2 py-1 fw-semibold">{getCleanWarrantyType(item.warrantyPeriod)}</span>
                                </td>
                                <td className="py-3">
                                  {item.isInStock ? (
                                    statusInfo.endDate ? (
                                      <div>
                                        <div className="fw-medium text-dark">{statusInfo.endDate.toLocaleDateString('vi-VN')}</div>
                                        <div className="small text-muted">(Hạn hãng)</div>
                                      </div>
                                    ) : (
                                      <span className="badge bg-light text-secondary border font-monospace">Kích hoạt khi bán</span>
                                    )
                                  ) : statusInfo.endDate ? (
                                    <div>
                                      <div className="fw-medium text-dark">{statusInfo.endDate.toLocaleDateString('vi-VN')}</div>
                                      {statusInfo.diffDays !== undefined && (
                                        <div className={`small fw-medium ${statusInfo.status === 'EXPIRED' ? 'text-danger' : 'text-muted'}`}>
                                          {statusInfo.status === 'EXPIRED' ? `Hết hạn ${statusInfo.diffDays} ngày` : `Còn ${statusInfo.diffDays} ngày`}
                                        </div>
                                      )}
                                    </div>
                                  ) : '—'}
                                </td>
                                <td className="py-3 text-center">
                                  <span className={`badge rounded-pill px-2 py-1 small fw-semibold ${statusInfo.badge}`}>
                                    <StatusIcon size={14} className="me-1 mb-1 d-inline" />
                                    {statusInfo.text}
                                  </span>
                                </td>
                                <td className="py-3 text-end px-4" onClick={(e) => e.stopPropagation()}>
                                  {!item.isInStock ? (
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-primary py-1 px-2 fw-medium d-inline-flex align-items-center gap-1"
                                      onClick={() => setEditingMachineOrder(item)}
                                      title="Chỉnh sửa thông tin đơn máy này"
                                    >
                                      <Edit3 size={13} />
                                      <span>Sửa</span>
                                    </button>
                                  ) : (
                                    <span className="badge bg-light text-secondary border">Trong kho</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-5 text-center text-muted">Không có máy tính nào mua tại shop khớp với từ khóa tìm kiếm.</div>
                  )
                )}

                {/* TAB 2: PHỤ KIỆN ĐÃ MUA */}
                {activeTab === 'ACCESSORIES' && (
                  accessories.length > 0 ? (
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0 bg-white">
                        <thead className="table-light text-secondary small text-uppercase fw-semibold">
                          <tr>
                            <th className="px-4 py-3" style={{ width: '170px' }}>Mã đơn & Ngày bán</th>
                            <th className="py-3" style={{ width: '220px' }}>Khách hàng & SĐT</th>
                            <th className="py-3">Danh sách phụ kiện</th>
                            <th className="py-3 text-end" style={{ width: '140px' }}>Tổng thanh toán</th>
                            <th className="py-3 text-center" style={{ width: '150px' }}>Trạng thái BH</th>
                            <th className="py-3 text-end px-4" style={{ width: '110px' }}>Thao tác</th>
                          </tr>
                        </thead>
                        <tbody>
                          {accessories.map((ord, idx) => {
                            const saleDateText = formatDate(ord.saleDate);
                            const now = new Date();
                            const hasValidWarranty = ord.items?.some(it => {
                              if (!it.warrantyExpiry) return false;
                              const end = new Date(it.warrantyExpiry);
                              end.setHours(23, 59, 59, 999);
                              return end >= now;
                            });
                            const hasAnyWarranty = ord.items?.some(it => it.warrantyMonths > 0 || it.warrantyExpiry);

                            return (
                              <tr
                                key={ord.id || idx}
                                style={{ cursor: 'pointer' }}
                                onClick={() => setSelectedAccessoryOrder(ord)}
                                title="Nhấp để xem chi tiết đầy đủ đơn bán phụ kiện"
                              >
                                <td className="px-4 py-3">
                                  <span className="badge bg-primary-subtle text-primary border border-primary-subtle fw-bold px-2 py-1">
                                    {ord.orderCode || 'Lẻ'}
                                  </span>
                                  <div className="small text-muted mt-1">{saleDateText}</div>
                                </td>
                                <td className="py-3">
                                  <div className="fw-semibold text-dark">{ord.customerName || 'Khách vãng lai'}</div>
                                  <div className="small text-secondary">{ord.customerPhone || '—'}</div>
                                </td>
                                <td className="py-3">
                                  <div className="d-flex flex-wrap gap-1">
                                    {ord.items && ord.items.length > 0 ? (
                                      ord.items.map((it, iIdx) => (
                                        <span key={iIdx} className="badge bg-light text-dark border p-1 px-2 fw-normal">
                                          <strong className="text-primary">{it.accessoryName}</strong>
                                          {it.quantity > 1 && ` (x${it.quantity})`}
                                          {it.warrantyPeriod ? (
                                            <span className="ms-1 text-success fw-bold">[{it.warrantyPeriod}]</span>
                                          ) : it.warrantyMonths > 0 ? (
                                            <span className="ms-1 text-success fw-bold">[{it.warrantyMonths}T]</span>
                                          ) : (
                                            <span className="ms-1 text-muted">[0T]</span>
                                          )}
                                        </span>
                                      ))
                                    ) : (
                                      <span className="text-muted small">Không có sản phẩm</span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 text-end">
                                  <span className="fw-bold text-primary">
                                    {formatCurrency(ord.finalAmount ?? ord.totalAmount ?? 0)} đ
                                  </span>
                                </td>
                                <td className="py-3 text-center">
                                  {hasValidWarranty ? (
                                    <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 rounded-pill px-2 py-1">
                                      <ShieldCheck size={12} className="me-1 mb-1 d-inline" /> Còn hạn BH
                                    </span>
                                  ) : hasAnyWarranty ? (
                                    <span className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 rounded-pill px-2 py-1">
                                      <AlertCircle size={12} className="me-1 mb-1 d-inline" /> Hết hạn BH
                                    </span>
                                  ) : (
                                    <span className="badge bg-secondary bg-opacity-10 text-secondary rounded-pill px-2 py-1">
                                      Không bảo hành
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 text-end px-4" onClick={(e) => e.stopPropagation()}>
                                  <div className="d-flex justify-content-end gap-1">
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-primary py-1 px-2 fw-medium d-inline-flex align-items-center gap-1"
                                      onClick={() => setEditingAccessoryOrder(ord)}
                                      title="Chỉnh sửa hóa đơn phụ kiện này"
                                    >
                                      <Edit3 size={13} />
                                      <span>Sửa</span>
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-light border py-1 px-2 fw-medium"
                                      onClick={() => setSelectedAccessoryOrder(ord)}
                                    >
                                      Chi tiết
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-5 text-center text-muted">Không có phụ kiện nào khớp với từ khóa tìm kiếm.</div>
                  )
                )}


                {/* TAB 3: DỊCH VỤ SỬA CHỮA */}
                {activeTab === 'REPAIRS' && (
                  repairs.length > 0 ? (
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0 bg-white">
                        <thead className="table-light text-secondary small text-uppercase fw-semibold">
                          <tr>
                            <th className="px-4 py-3" style={{ width: '170px' }}>Mã phiếu & Ngày làm</th>
                            <th className="py-3" style={{ width: '220px' }}>Thiết bị & Khách hàng</th>
                            <th className="py-3">Các dịch vụ & Linh kiện</th>
                            <th className="py-3 text-end" style={{ width: '140px' }}>Tổng hóa đơn</th>
                            <th className="py-3 text-center" style={{ width: '150px' }}>Trạng thái BH</th>
                            <th className="py-3 text-end px-4" style={{ width: '110px' }}>Thao tác</th>
                          </tr>
                        </thead>
                        <tbody>
                          {repairs.map((ord, idx) => {
                            const createdDateText = formatDate(ord.createdDate);
                            const now = new Date();
                            const hasValidWarranty = ord.items?.some(it => {
                              if (!it.warrantyExpiry) return false;
                              const end = new Date(it.warrantyExpiry);
                              end.setHours(23, 59, 59, 999);
                              return end >= now;
                            });
                            const hasAnyWarranty = ord.items?.some(it => it.warrantyMonths > 0 || it.warrantyExpiry);

                            return (
                              <tr
                                key={ord.id || idx}
                                style={{ cursor: 'pointer' }}
                                onClick={() => setSelectedRepairOrder(ord)}
                                title="Nhấp để xem chi tiết đầy đủ của phiếu sửa chữa"
                              >
                                <td className="px-4 py-3">
                                  <span className="badge bg-warning bg-opacity-20 text-warning-emphasis fw-bold px-2 py-1">
                                    {ord.orderCode}
                                  </span>
                                  <div className="small text-muted mt-1">{createdDateText}</div>
                                </td>
                                <td className="py-3">
                                  <div className="fw-bold text-dark">{ord.deviceModel}</div>
                                  <div className="small text-secondary">
                                    {ord.customerName} {ord.customerPhone && `• ${ord.customerPhone}`}
                                  </div>
                                </td>
                                <td className="py-3">
                                  <div className="d-flex flex-wrap gap-1">
                                    {ord.items && ord.items.length > 0 ? (
                                      ord.items.map((it, iIdx) => (
                                        <span key={iIdx} className="badge bg-light text-dark border p-1 px-2 fw-normal">
                                          <strong className="text-primary">{it.serviceName}</strong>
                                          {it.quantity > 1 && ` (x${it.quantity})`}
                                          {it.warrantyPeriod ? (
                                            <span className="ms-1 text-success fw-bold">[{it.warrantyPeriod}]</span>
                                          ) : it.warrantyMonths > 0 ? (
                                            <span className="ms-1 text-success fw-bold">[{it.warrantyMonths}T]</span>
                                          ) : (
                                            <span className="ms-1 text-muted">[KBH]</span>
                                          )}

                                        </span>
                                      ))
                                    ) : (
                                      <span className="text-muted small">Không có dịch vụ</span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 text-end">
                                  <span className="fw-bold text-danger">
                                    {formatCurrency(ord.totalAmount)} đ
                                  </span>
                                </td>
                                <td className="py-3 text-center">
                                  {hasValidWarranty ? (
                                    <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 rounded-pill px-2 py-1">
                                      <ShieldCheck size={12} className="me-1 mb-1 d-inline" /> Còn hạn BH
                                    </span>
                                  ) : hasAnyWarranty ? (
                                    <span className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 rounded-pill px-2 py-1">
                                      <AlertCircle size={12} className="me-1 mb-1 d-inline" /> Hết hạn BH
                                    </span>
                                  ) : (
                                    <span className="badge bg-secondary bg-opacity-10 text-secondary rounded-pill px-2 py-1">
                                      Không bảo hành
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 text-end px-4" onClick={(e) => e.stopPropagation()}>
                                  <div className="d-flex justify-content-end gap-1">
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-primary py-1 px-2 fw-medium d-inline-flex align-items-center gap-1"
                                      onClick={() => setEditingRepairOrder(ord)}
                                      title="Chỉnh sửa phiếu dịch vụ này"
                                    >
                                      <Edit3 size={13} />
                                      <span>Sửa</span>
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-light border py-1 px-2 fw-medium"
                                      onClick={() => setSelectedRepairOrder(ord)}
                                    >
                                      Chi tiết
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-5 text-center text-muted">Không có dịch vụ sửa chữa nào khớp với từ khóa tìm kiếm.</div>
                  )
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal Chi Tiết Đơn Hàng Máy */}
      {selectedOrder && (
        <ModalChiTietDonHang
          order={selectedOrder}
          statusInfo={getWarrantyStatus(selectedOrder.saleDate, selectedOrder.warrantyPeriod, selectedOrder.isVoided, selectedOrder.warrantyExpiry)}
          onClose={() => setSelectedOrder(null)}
        />
      )}

      {/* Modal Chi Tiết Hóa Đơn Dịch Vụ Sửa Chữa */}
      {selectedRepairOrder && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }} tabIndex="-1">
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content shadow border-0 rounded-4">
              <div className="modal-header bg-primary text-white py-3">
                <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
                  <Wrench size={20} />
                  Chi Tiết Phiếu Dịch Vụ Sửa Chữa #{selectedRepairOrder.orderCode}
                </h5>
                <div className="d-flex align-items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-light text-primary fw-bold d-inline-flex align-items-center gap-1 rounded-pill px-3 shadow-sm"
                    onClick={() => setEditingRepairOrder(selectedRepairOrder)}
                  >
                    <Edit3 size={14} />
                    <span>Sửa phiếu</span>
                  </button>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setSelectedRepairOrder(null)}
                  />
                </div>
              </div>

              <div className="modal-body p-4">
                {/* Thông tin chung của phiếu */}
                <div className="p-3 bg-light rounded-3 border mb-3">
                  <div className="row g-2">
                    <div className="col-sm-6"><strong>Mã hóa đơn:</strong> <span className="badge bg-warning bg-opacity-20 text-warning-emphasis fw-bold ms-1">{selectedRepairOrder.orderCode}</span></div>
                    <div className="col-sm-6"><strong>Ngày thực hiện:</strong> {formatDate(selectedRepairOrder.createdDate)}</div>
                    <div className="col-sm-6"><strong>Khách hàng:</strong> <span className="fw-semibold text-dark">{selectedRepairOrder.customerName}</span></div>
                    <div className="col-sm-6"><strong>Số điện thoại:</strong> <span className="text-dark fw-bold">{selectedRepairOrder.customerPhone}</span></div>
                    <div className="col-sm-6"><strong>Thiết bị sửa chữa:</strong> <span className="text-primary fw-bold">{selectedRepairOrder.deviceModel}</span></div>
                    <div className="col-sm-6"><strong>Kỹ thuật viên:</strong> {selectedRepairOrder.technicianName || '—'}</div>
                    {selectedRepairOrder.note && (
                      <div className="col-12 mt-1"><strong>Ghi chú đơn:</strong> <span className="text-muted">{selectedRepairOrder.note}</span></div>
                    )}
                    <div className="col-12 mt-2 pt-2 border-top d-flex justify-content-between align-items-center">
                      <strong className="fs-6">Tổng tiền thanh toán:</strong>
                      <span className="text-danger fw-bold fs-5">{formatCurrency(selectedRepairOrder.totalAmount)} đ</span>
                    </div>
                  </div>
                </div>

                {/* Danh sách các dịch vụ & linh kiện */}
                <h6 className="fw-bold mb-2 text-dark">Danh sách dịch vụ & Linh kiện bảo hành:</h6>
                <div className="table-responsive border rounded">
                  <table className="table table-sm align-middle mb-0">
                    <thead className="table-light small">
                      <tr>
                        <th className="ps-3 py-2">Dịch vụ / Linh kiện</th>
                        <th className="py-2 text-center" style={{ width: '70px' }}>SL</th>
                        <th className="py-2 text-end" style={{ width: '130px' }}>Đơn giá</th>
                        <th className="py-2 text-center" style={{ width: '110px' }}>Bảo hành</th>
                        <th className="py-2 text-center" style={{ width: '120px' }}>Hạn BH</th>
                        <th className="pe-3 py-2 text-end" style={{ width: '140px' }}>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRepairOrder.items?.map((it, idx) => {
                        const itExp = getItemExpiryStatus(it.warrantyExpiry);
                        const ItExpIcon = itExp.icon;

                        return (
                          <tr key={idx}>
                            <td className="ps-3 py-2">
                              <strong>{it.serviceName}</strong>
                              {it.note && <div className="small text-muted">Ghi chú: {it.note}</div>}
                            </td>
                            <td className="text-center">{it.quantity}</td>
                            <td className="text-end fw-medium">{formatCurrency(it.price)} đ</td>
                            <td className="text-center">
                              {it.warrantyPeriod ? (
                                <span className="badge bg-light text-dark border">{it.warrantyPeriod}</span>
                              ) : it.warrantyMonths > 0 ? (
                                <span className="badge bg-light text-dark border">{it.warrantyMonths} Tháng</span>
                              ) : (
                                <span className="badge bg-secondary bg-opacity-10 text-secondary">Không BH</span>
                              )}
                            </td>
                            <td className="text-center fw-bold text-dark">{it.warrantyExpiry || '—'}</td>
                            <td className="pe-3 text-end">
                              <span className={`badge rounded-pill px-2 py-1 small ${itExp.badge}`}>
                                <ItExpIcon size={12} className="me-1 mb-1 d-inline" />
                                {itExp.text}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>

                  </table>
                </div>
              </div>

              <div className="modal-footer bg-light d-flex justify-content-end">
                <button type="button" className="btn btn-secondary px-4" onClick={() => setSelectedRepairOrder(null)}>
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Chi Tiết Hóa Đơn Bán Phụ Kiện */}
      {selectedAccessoryOrder && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }} tabIndex="-1">
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content shadow border-0 rounded-4">
              <div className="modal-header bg-primary text-white py-3">
                <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
                  <ShoppingBag size={20} />
                  Chi Tiết Hóa Đơn Phụ Kiện #{selectedAccessoryOrder.orderCode || 'Lẻ'}
                </h5>
                <div className="d-flex align-items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-light text-primary fw-bold d-inline-flex align-items-center gap-1 rounded-pill px-3 shadow-sm"
                    onClick={() => setEditingAccessoryOrder(selectedAccessoryOrder)}
                  >
                    <Edit3 size={14} />
                    <span>Sửa hóa đơn</span>
                  </button>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setSelectedAccessoryOrder(null)}
                  />
                </div>
              </div>


              <div className="modal-body p-4">
                {/* Thông tin đơn bán */}
                <div className="p-3 bg-light rounded-3 border mb-3">
                  <div className="row g-2">
                    <div className="col-sm-6">
                      <strong>Mã hóa đơn:</strong>{' '}
                      <span className="badge bg-primary text-white fw-bold ms-1 px-2 py-1">
                        {selectedAccessoryOrder.orderCode || 'Lẻ'}
                      </span>
                    </div>
                    <div className="col-sm-6"><strong>Ngày bán:</strong> {formatDate(selectedAccessoryOrder.saleDate)}</div>
                    <div className="col-sm-6"><strong>Khách hàng:</strong> <span className="fw-semibold text-dark">{selectedAccessoryOrder.customerName || 'Khách vãng lai'}</span></div>
                    <div className="col-sm-6"><strong>Số điện thoại:</strong> <span className="text-dark fw-bold">{selectedAccessoryOrder.customerPhone || '—'}</span></div>
                    <div className="col-sm-6"><strong>Nhân viên bán:</strong> {selectedAccessoryOrder.salesperson || '—'}</div>
                    {selectedAccessoryOrder.saleNote && (
                      <div className="col-12 mt-1"><strong>Ghi chú đơn:</strong> <span className="text-muted">{selectedAccessoryOrder.saleNote}</span></div>
                    )}
                    <div className="col-12 mt-2 pt-2 border-top d-flex justify-content-between align-items-center">
                      <div>
                        {selectedAccessoryOrder.discount > 0 && (
                          <span className="text-muted small me-2">
                            (Giảm giá: -{formatCurrency(selectedAccessoryOrder.discount)} đ)
                          </span>
                        )}
                        <strong className="fs-6">Tổng tiền thanh toán:</strong>
                      </div>
                      <span className="text-primary fw-bold fs-5">
                        {formatCurrency(selectedAccessoryOrder.finalAmount ?? selectedAccessoryOrder.totalAmount ?? 0)} đ
                      </span>
                    </div>
                  </div>
                </div>

                {/* Danh sách phụ kiện */}
                <h6 className="fw-bold mb-2 text-dark">Danh sách phụ kiện & Bảo hành:</h6>
                <div className="table-responsive border rounded">
                  <table className="table table-sm align-middle mb-0">
                    <thead className="table-light small">
                      <tr>
                        <th className="ps-3 py-2">Tên phụ kiện</th>
                        <th className="py-2 text-center" style={{ width: '70px' }}>SL</th>
                        <th className="py-2 text-end" style={{ width: '130px' }}>Đơn giá</th>
                        <th className="py-2 text-center" style={{ width: '110px' }}>Bảo hành</th>
                        <th className="py-2 text-center" style={{ width: '120px' }}>Hạn BH</th>
                        <th className="pe-3 py-2 text-end" style={{ width: '140px' }}>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedAccessoryOrder.items?.map((it, idx) => {
                        const itExp = getItemExpiryStatus(it.warrantyExpiry);
                        const ItExpIcon = itExp.icon;

                        return (
                          <tr key={idx}>
                            <td className="ps-3 py-2">
                              <strong>{it.accessoryName}</strong>
                              <div className="small text-muted">
                                {it.sku} {it.serialNumber && `• Tem/Serial: ${it.serialNumber}`}
                                {it.note && ` • Ghi chú: ${it.note}`}
                              </div>
                            </td>
                            <td className="text-center">{it.quantity}</td>
                            <td className="text-end fw-medium">{formatCurrency(it.price)} đ</td>
                            <td className="text-center">
                              {it.warrantyPeriod ? (
                                <span className="badge bg-light text-dark border">{it.warrantyPeriod}</span>
                              ) : it.warrantyMonths > 0 ? (
                                <span className="badge bg-light text-dark border">{it.warrantyMonths} Tháng</span>
                              ) : (
                                <span className="badge bg-secondary bg-opacity-10 text-secondary">0 Tháng</span>
                              )}
                            </td>
                            <td className="text-center fw-bold text-dark">{it.warrantyExpiry || '—'}</td>
                            <td className="pe-3 text-end">
                              <span className={`badge rounded-pill px-2 py-1 small ${itExp.badge}`}>
                                <ItExpIcon size={12} className="me-1 mb-1 d-inline" />
                                {itExp.text}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="modal-footer bg-light d-flex justify-content-end">
                <button type="button" className="btn btn-secondary px-4" onClick={() => setSelectedAccessoryOrder(null)}>
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Chỉnh Sửa Đơn Máy */}
      {editingMachineOrder && (
        <ModalSuaDonMay
          order={editingMachineOrder}
          onClose={() => setEditingMachineOrder(null)}
          onSuccess={() => handleSearch()}
        />
      )}

      {/* Modal Chỉnh Sửa Đơn Phụ Kiện */}
      {editingAccessoryOrder && (
        <ModalSuaDonPhuKien
          order={editingAccessoryOrder}
          onClose={() => setEditingAccessoryOrder(null)}
          onSuccess={() => handleSearch()}
        />
      )}

      {/* Modal Chỉnh Sửa Phiếu Sửa Chữa */}
      {editingRepairOrder && (
        <ModalSuaDonSuaChua
          order={editingRepairOrder}
          onClose={() => setEditingRepairOrder(null)}
          onSuccess={() => handleSearch()}
        />
      )}
    </div>
  );
}