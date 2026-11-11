import React, { useState, useEffect, useMemo } from 'react';
import { Clock, History, Package, Search, X } from 'lucide-react';
import { useToast } from '../../contexts/notification/NguCanhThongBao';
import { apiPhuKien } from '../../api';
import { formatDate, formatMoney } from '../../utils/dinh_dang';
import PhanTrang from '../../components/common/PhanTrang';
import BangLoading from '../../components/common/BangLoading';

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
      const res = await apiPhuKien.getHistory();
      if (res.success) {
        setHistory(res.data || []);
      } else {
        showToast('Lỗi tải dữ liệu lịch sử', 'danger');
      }
    } catch (error) {
      console.error(error);
      showToast('Lỗi kết nối máy chủ', 'danger');
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
                  <BangLoading colSpan={colSpanCount} message="Đang tải dữ liệu lịch sử..." />
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
                      <td className="text-end text-muted small">{formatMoney(item.price)}</td>
                      <td className="text-end fw-bold text-primary">
                        {formatMoney(item.price * item.quantity)}
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
          <div className="card-footer bg-white border-top p-3">
            <PhanTrang
              page={currentPage}
              totalPages={totalPages}
              totalItems={filteredHistory.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onPageSizeChange={(newSize) => {
                setItemsPerPage(newSize);
                setCurrentPage(1);
              }}
              itemName="kết quả"
            />
          </div>
        )}
      </div>
    </div>
  );
}