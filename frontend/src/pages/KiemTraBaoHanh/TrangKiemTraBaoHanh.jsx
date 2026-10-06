import React, { useState } from 'react';
import { Search, ShieldCheck, AlertCircle, FileText, XCircle, X } from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import { useToast } from '../../contexts/notification/NguCanhThongBao';

export default function TrangKiemTraBaoHanh() {
  const { showToast } = useToast();
  const [keyword, setKeyword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!keyword.trim()) return;

    setIsLoading(true);
    setHasSearched(true);
    try {
      const res = await axiosClient.get(`/sale/warranty?keyword=${encodeURIComponent(keyword.trim())}`);
      setResults(res.data || []);
    } catch (err) {
      showToast(err.userMessage || err.message || 'Lỗi khi tra cứu bảo hành', 'error');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearSearch = () => {
    setKeyword('');
    setResults([]);
    setHasSearched(false);
  };

  const getWarrantyStatus = (saleDate, warrantyPeriod, isVoided) => {
    if (!saleDate || !warrantyPeriod) {
      return { status: 'UNKNOWN', text: 'Không xác định', badge: 'bg-secondary-subtle text-secondary border border-secondary-subtle', icon: AlertCircle };
    }
    
    const now = new Date();
    let end;

    const dateMatch = warrantyPeriod.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (dateMatch) {
      const day = parseInt(dateMatch[1]);
      const month = parseInt(dateMatch[2]) - 1; 
      const year = parseInt(dateMatch[3]);
      end = new Date(year, month, day);
    } 
    else if (warrantyPeriod.toLowerCase().includes('tháng')) {
      const monthMatch = warrantyPeriod.match(/(\d+)/);
      if (monthMatch) {
        const months = parseInt(monthMatch[1]);
        const sale = new Date(saleDate);
        end = new Date(sale.setMonth(sale.getMonth() + months));
      }
    }

    if (isVoided) {
      return { status: 'VOIDED', text: 'Đã thu lại (Vô hiệu)', badge: 'bg-dark-subtle text-dark border border-dark-subtle', icon: XCircle };
    }

    if (end) {
      if (now > end) {
        return { status: 'EXPIRED', text: 'Hết hạn bảo hành', badge: 'bg-danger-subtle text-danger border border-danger-subtle', icon: AlertCircle };
      } else {
        return { status: 'VALID', text: 'Còn hạn bảo hành', badge: 'bg-success-subtle text-success border border-success-subtle', icon: ShieldCheck };
      }
    }

    return { status: 'CUSTOM', text: 'Theo thỏa thuận', badge: 'bg-info-subtle text-info border border-info-subtle', icon: FileText };
  };

  return (
    <div className="container-fluid py-4 bg-light min-vh-100">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="m-0 fw-bold text-dark d-flex align-items-center gap-2">
            <div className="bg-primary bg-opacity-10 p-2 rounded">
              <ShieldCheck className="text-primary" size={24}/> 
            </div>
            Tra Cứu Bảo Hành
          </h3>
          <p className="text-secondary mb-0 mt-1 small">Kiểm tra thời hạn bảo hành qua Số điện thoại hoặc Serial máy</p>
        </div>
      </div>

      {/* Search Section */}
      <div className="card shadow-sm mb-4 border-0 rounded-4">
        <div className="card-body p-4 p-md-5">
          <div className="row justify-content-center">
            <div className="col-12 col-lg-8 text-center">
              <h5 className="fw-bold text-dark mb-4">Nhập thông tin cần tra cứu</h5>
              
              {/* Đã sửa cấu trúc form ở đây để ô nhập liệu rộng ra và fix lỗi đè icon */}
              <form onSubmit={handleSearch} className="row g-3 align-items-center justify-content-center">
                
                {/* Input Column - Chiếm 8/12 cột (hoặc 100% trên mobile) */}
                <div className="col-12 col-md-8 position-relative">
                  {/* Điều chỉnh khoảng cách icon để không bị đè */}
                  <Search className="position-absolute top-50 translate-middle-y text-muted ms-3" size={20} style={{ left: '15px' }} />
                  <input 
                    type="text" 
                    // Tăng padding-left (ps-5) để chữ không đè lên icon kính lúp
                    className="form-control form-control-lg rounded-pill px-5 shadow-none border-secondary-subtle" 
                    style={{ backgroundColor: '#f8f9fa' }}
                    placeholder="Nhập SĐT khách hàng hoặc Số Serial..." 
                    value={keyword}
                    onChange={e => setKeyword(e.target.value)}
                    disabled={isLoading}
                    autoFocus
                  />
                  {keyword && (
                    <X 
                      className="position-absolute top-50 translate-middle-y text-muted" 
                      size={20} 
                      style={{ right: '25px', cursor: 'pointer' }}
                      onClick={clearSearch}
                    />
                  )}
                </div>

                {/* Button Column - Chiếm 4/12 cột */}
                <div className="col-12 col-md-4">
                  <button 
                    type="submit" 
                    className="btn btn-primary btn-lg rounded-pill w-100 d-flex align-items-center justify-content-center fw-medium shadow-sm" 
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

      {/* Results Section */}
      {hasSearched && (
        <div className="card shadow-sm border-0 rounded-4 overflow-hidden">
          <div className="card-header bg-white border-bottom py-3 px-4 d-flex justify-content-between align-items-center">
            <h5 className="card-title fw-bold m-0 text-dark">
              Kết quả tra cứu
            </h5>
            <span className="badge bg-primary bg-opacity-10 text-primary border border-primary-subtle px-3 py-2 rounded-pill">
              Tìm thấy {results.length} giao dịch
            </span>
          </div>
          
          <div className="card-body p-0">
            {isLoading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary mb-3" role="status"></div>
                <h6 className="text-muted">Đang tra cứu hệ thống...</h6>
              </div>
            ) : results.length > 0 ? (
              <div className="table-responsive custom-scrollbar">
                <table className="table table-hover align-middle mb-0 bg-white">
                  <thead className="table-light text-secondary small text-uppercase fw-semibold">
                    <tr>
                      <th className="px-4 py-3" style={{ width: '25%' }}>Máy & Cấu hình</th>
                      <th className="py-3" style={{ width: '15%' }}>Serial</th>
                      <th className="py-3" style={{ width: '15%' }}>Khách hàng</th>
                      <th className="py-3" style={{ width: '15%' }}>Giá & Ngày bán</th>
                      <th className="py-3" style={{ width: '10%' }}>Thời gian BH</th>
                      <th className="py-3 text-end px-4" style={{ width: '20%' }}>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((item, index) => {
                      const statusInfo = getWarrantyStatus(item.saleDate, item.warrantyPeriod, item.isVoided);
                      const StatusIcon = statusInfo.icon;
                      
                      return (
                        <tr key={index}>
                          <td className="px-4 py-3">
                            <div className="fw-bold text-dark">{item.sourceModelText || 'Không rõ dòng máy'}</div>
                            {item.configInfo && item.configInfo !== item.sourceModelText && !item.configInfo.includes(item.sourceModelText) && (
                              <div className="small text-muted mt-1 text-truncate" style={{ maxWidth: '280px' }} title={item.configInfo}>
                                {item.configInfo}
                              </div>
                            )}
                          </td>
                          <td className="py-3">
                            <span className="font-monospace fw-medium bg-light px-2 py-1 rounded border text-dark">
                              {item.serialKey}
                            </span>
                          </td>
                          <td className="py-3">
                            <div className="fw-semibold text-dark">{item.customerName || 'Khách vãng lai'}</div>
                            <div className="small text-muted">{item.customerPhone || 'Không có SĐT'}</div>
                          </td>
                          <td className="py-3">
                            <div className="fw-medium text-primary mb-1">
                              {item.salePrice ? item.salePrice.toLocaleString('vi-VN') + ' đ' : '—'}
                            </div>
                            <div className="small text-secondary d-flex align-items-center gap-1">
                              <span>Ngày:</span> 
                              <span className="fw-medium text-dark">{item.saleDate ? new Date(item.saleDate).toLocaleDateString('vi-VN') : '—'}</span>
                            </div>
                          </td>
                          <td className="py-3">
                            <span className="fw-medium text-dark">{item.warrantyPeriod || 'Không có'}</span>
                          </td>
                          <td className="py-3 text-end px-4">
                            <span className={`badge rounded-pill px-3 py-2 ${statusInfo.badge}`}>
                              <StatusIcon size={14} className="me-1 mb-1 d-inline" />
                              {statusInfo.text}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-5">
                <div className="bg-light rounded-circle d-inline-flex p-4 mb-3">
                  <FileText size={48} className="text-secondary opacity-50" />
                </div>
                <h5 className="fw-bold text-dark">Không tìm thấy thông tin</h5>
                <p className="text-muted mb-0">Không có giao dịch nào khớp với từ khóa <strong className="text-dark">"{keyword}"</strong></p>
                <button className="btn btn-outline-secondary mt-3 rounded-pill px-4" onClick={clearSearch}>
                  Thử lại
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}