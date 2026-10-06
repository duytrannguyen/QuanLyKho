import React, { useState, useEffect, useMemo } from 'react';
import { Clock, History, Package, Search, X } from 'lucide-react';
import { useToast } from '../../contexts/notification/NguCanhThongBao';
import axiosClient from '../../api/axiosClient';

export default function TrangLichSuBanPhuKien() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('SELL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // State phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const { showToast } = useToast();

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get('/accessory/history');
      if (res.success) {
        setHistory(res.data || []);
      } else {
        showToast('Lỗi tải dữ liệu lịch sử', 'error');
      }
    } catch (error) {
      console.error(error);
      showToast('Lỗi kết nối máy chủ', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Tối ưu hóa bộ lọc với useMemo
  const filteredHistory = useMemo(() => {
    return history
      .filter(item => item.action === filterAction)
      .filter(item => {
        const query = searchQuery.toLowerCase();
        return (
          (item.name || '').toLowerCase().includes(query) ||
          (item.sku || '').toLowerCase().includes(query) ||
          (item.customerName || '').toLowerCase().includes(query) ||
          (item.customerPhone || '').toLowerCase().includes(query)
        );
      });
  }, [history, filterAction, searchQuery]);

  // Logic Phân trang
  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const currentItems = filteredHistory.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Tự động quay về trang 1 khi thay đổi bộ lọc hoặc số dòng/trang
  useEffect(() => {
    setCurrentPage(1);
  }, [filterAction, searchQuery, itemsPerPage]);

  const formatPrice = (price) => {
    if (!price) return '0 đ';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('vi-VN', {
      hour: '2-digit', minute: '2-digit',
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };

  // Số lượng cột để hiển thị dòng Loading/Trống cho chuẩn
  const colSpanCount = filterAction === 'SELL' ? 9 : 8;

  return (
    <div className="container-fluid py-4 bg-light min-vh-100">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="fw-bold mb-1 d-flex align-items-center text-dark gap-2">
            <div className="bg-primary bg-opacity-10 p-2 rounded">
              <History size={24} className="text-primary" />
            </div>
            Lịch sử giao dịch phụ kiện
          </h4>
          <p className="text-secondary mb-0 small mt-1">Quản lý và tra cứu các lần xuất/nhập kho phụ kiện</p>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
        <div className="card-header bg-white border-bottom p-4">
          <div className="row g-3 align-items-center">
            
            {/* Nút lọc Bán / Nhập */}
            <div className="col-12 col-md-6">
              <div className="d-flex bg-light p-1 rounded-pill d-inline-flex border">
                <button
                  className={`btn rounded-pill border-0 px-4 py-2 flex-grow-1 ${filterAction === 'SELL' ? 'btn-primary shadow-sm fw-medium' : 'text-secondary hover-bg-light'}`}
                  onClick={() => setFilterAction('SELL')}
                >
                  <Package size={18} className="me-2 mb-1" />
                  Xuất kho (Bán)
                </button>
                <button
                  className={`btn rounded-pill border-0 px-4 py-2 flex-grow-1 ${filterAction === 'IMPORT' ? 'btn-success shadow-sm fw-medium' : 'text-secondary hover-bg-light'}`}
                  onClick={() => setFilterAction('IMPORT')}
                >
                  <Clock size={18} className="me-2 mb-1" />
                  Nhập kho
                </button>
              </div>
            </div>

            {/* Thanh tìm kiếm */}
            <div className="col-12 col-md-6">
              <div className="position-relative">
                <Search size={18} className="position-absolute top-50 translate-middle-y text-muted ms-3" />
                <input
                  type="text"
                  className="form-control ps-5 pe-5 py-2 rounded-pill"
                  placeholder="Tìm tên/mã phụ kiện, hoặc tên/sđt khách hàng..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <X 
                    className="position-absolute top-50 end-0 translate-middle-y text-muted me-3" 
                    size={18} 
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSearchQuery('')}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0 bg-white">
              <thead className="table-light text-secondary small text-uppercase fw-semibold">
                <tr>
                  <th className="text-center py-3" style={{ width: '5%' }}>STT</th>
                  <th className="py-3" style={{ width: '12%' }}>Thời gian</th>
                  <th className="py-3" style={{ width: '20%' }}>Tên phụ kiện</th>
                  {filterAction === 'SELL' && <th className="py-3" style={{ width: '15%' }}>Khách hàng</th>}
                  <th className="text-center py-3" style={{ width: '8%' }}>SL</th>
                  <th className="text-end py-3" style={{ width: '10%' }}>Đơn giá</th>
                  <th className="text-end py-3" style={{ width: '10%' }}>Thành tiền</th>
                  <th className="py-3" style={{ width: '10%' }}>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={colSpanCount} className="text-center py-5">
                      <div className="spinner-border text-primary" role="status"></div>
                      <div className="mt-2 text-secondary small">Đang tải dữ liệu...</div>
                    </td>
                  </tr>
                ) : currentItems.length === 0 ? (
                  <tr>
                    <td colSpan={colSpanCount} className="text-center py-5">
                      <div className="text-muted d-flex flex-column align-items-center">
                        <History size={40} className="mb-3 opacity-50" />
                        <h6 className="fw-bold mb-1">Không có dữ liệu phù hợp</h6>
                        <p className="mb-0 small">Thử thay đổi từ khóa tìm kiếm hoặc chọn bộ lọc khác</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  currentItems.map((item, idx) => (
                    <tr key={item.id || idx}>
                      <td className="text-center text-muted">
                        {(currentPage - 1) * itemsPerPage + idx + 1}
                      </td>
                      <td>
                        <span className="text-secondary" style={{fontSize: '13px'}}>
                          {formatDate(item.createdAt)}
                        </span>
                      </td>
                      <td><span className="fw-medium text-dark">{item.name}</span></td>
                      
                      {filterAction === 'SELL' && (
                        <td>
                          {item.customerName ? (
                            <>
                              <div className="fw-medium text-dark">{item.customerName}</div>
                              {item.customerPhone && <div className="small text-muted">{item.customerPhone}</div>}
                            </>
                          ) : (
                            <span className="text-muted fst-italic small">Khách vãng lai</span>
                          )}
                        </td>
                      )}
                      
                      <td className="text-center">
                        <span className={`badge rounded-pill px-2 py-1 ${item.action === 'SELL' ? 'bg-danger-subtle text-danger' : 'bg-success-subtle text-success'}`}>
                          {item.action === 'SELL' ? '-' : '+'}{item.quantity}
                        </span>
                      </td>
                      <td className="text-end text-muted small">{formatPrice(item.price)}</td>
                      <td className="text-end fw-bold text-primary">
                        {formatPrice(item.price * item.quantity)}
                      </td>
                      <td className="text-secondary small fst-italic">
                        {item.note || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Phân trang */}
        {filteredHistory.length > 0 && (
          <div className="card-footer bg-white border-top p-3 d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">
            
            {/* Bộ chọn số dòng */}
            <div className="d-flex align-items-center gap-3 flex-wrap">
              <span className="small text-muted">
                Hiển thị <strong>{((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredHistory.length)}</strong> / <strong>{filteredHistory.length}</strong> kết quả
              </span>
              <div className="d-flex align-items-center gap-2">
                <span className="small text-muted">Số dòng:</span>
                <select 
                  className="form-select form-select-sm w-auto rounded-3" 
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

            {/* Các nút chuyển trang */}
            {totalPages > 1 && (
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                  <button className="page-link px-3" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}>
                    Trước
                  </button>
                </li>
                {[...Array(totalPages)].map((_, i) => {
                  // Rút gọn trang nếu quá nhiều
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
                  )
                })}
                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                  <button className="page-link px-3" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}>
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