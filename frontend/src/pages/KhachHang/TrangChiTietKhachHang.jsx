import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle, RefreshCw, User } from 'lucide-react';
import { crmApi } from '../../api';
import HoaDonKhachHang from './HoaDonKhachHang';

export default function TrangChiTietKhachHang() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadCustomer = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError('');
      const res = await crmApi.getCustomer(id);
      if (res.success && res.data) {
        setCustomer(res.data);
        if (res.data.fullName) {
          document.title = `${res.data.fullName} | CRM QKShop`;
        }
      } else {
        setError(res.userMessage || 'Không tìm thấy hồ sơ khách hàng.');
      }
    } catch (err) {
      setError(err?.userMessage || 'Lỗi khi tải thông tin khách hàng từ máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomer();
  }, [id]);

  if (loading) {
    return (
      <div className="container-fluid py-5 min-vh-100 bg-light d-flex flex-column align-items-center justify-content-center">
        <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
          <span className="visually-hidden">Đang tải...</span>
        </div>
        <h5 className="text-dark fw-bold mt-3 mb-1">Đang mở hồ sơ khách hàng...</h5>
        <p className="text-secondary small">Vui lòng chờ trong giây lát</p>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="container py-5 min-vh-100 bg-light">
        <div className="card border-0 shadow-sm rounded-4 p-5 text-center mx-auto" style={{ maxWidth: '540px' }}>
          <div className="text-danger mb-3">
            <AlertCircle size={48} className="mx-auto" />
          </div>
          <h4 className="fw-bold text-dark mb-2">Không thể mở hồ sơ khách hàng</h4>
          <p className="text-secondary mb-4">{error || 'Không tìm thấy thông tin khách hàng với mã này.'}</p>
          <div className="d-flex justify-content-center gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary rounded-pill px-4"
              onClick={() => navigate('/khach-hang')}
            >
              <ArrowLeft size={16} className="me-1" /> Về danh sách khách hàng
            </button>
            <button
              type="button"
              className="btn btn-primary rounded-pill px-4"
              onClick={loadCustomer}
            >
              <RefreshCw size={16} className="me-1" /> Thử lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4 bg-light min-vh-100">
      <HoaDonKhachHang 
        customer={customer} 
        onBack={() => navigate('/khach-hang')} 
        onCustomerUpdated={(updated) => setCustomer(updated)}
      />
    </div>
  );
}

