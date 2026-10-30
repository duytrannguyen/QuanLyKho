import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Wrench, Plus, Search, CheckCircle, RotateCcw, User, Phone, 
  Laptop, Calendar, Trash2, Printer, ShieldCheck, Edit3, X, 
  History, Clock, AlertCircle, Eye, ChevronRight
} from 'lucide-react';
import { useToast } from '../../contexts/notification/NguCanhThongBao';
import { apiSuaChua } from '../../api';
import { formatCurrency, parseCurrency, formatDate, getTodayDateString } from '../../utils/dinh_dang';

export default function TrangSuaChua() {
  const { showToast, confirm } = useToast();
  const location = useLocation();

  // Danh sách đơn sửa chữa
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Editing State (null = tạo mới, có id = đang sửa hóa đơn cũ)
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [editingOrderCode, setEditingOrderCode] = useState('');

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deviceModel, setDeviceModel] = useState('');
  const [technicianName, setTechnicianName] = useState('');
  const [createdDate, setCreatedDate] = useState(() => getTodayDateString());
  const [note, setNote] = useState('');

  // Danh sách dịch vụ nhập tay
  const [services, setServices] = useState([
    { serviceName: '', price: '', quantity: 1, warrantyValue: 1, warrantyUnit: 'THANG', warrantyMonths: 1, warrantyPeriod: '1 Tháng', note: '' }
  ]);

  const [completedOrder, setCompletedOrder] = useState(null);

  // Modal xem chi tiết hóa đơn (khi click vào thẻ đơn hàng bên cột phải)
  const [selectedOrderDetail, setSelectedOrderDetail] = useState(null);

  useEffect(() => {
    fetchOrders();
    if (location.state?.editOrder) {
      handleEditOrder(location.state.editOrder);
    }
  }, [location.state]);

  const fetchOrders = async (keyword = '') => {
    setIsLoading(true);
    try {
      const res = await apiSuaChua.getOrders(keyword ? { keyword } : {});
      setOrders(res.data?.data || res.data || []);
    } catch (err) {
      console.error('Lỗi lấy danh sách đơn sửa chữa:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddServiceRow = () => {
    setServices([...services, { serviceName: '', price: '', quantity: 1, warrantyValue: 1, warrantyUnit: 'THANG', warrantyMonths: 1, warrantyPeriod: '1 Tháng', note: '' }]);
  };

  const handleRemoveServiceRow = (index) => {
    if (services.length <= 1) {
      setServices([{ serviceName: '', price: '', quantity: 1, warrantyValue: 1, warrantyUnit: 'THANG', warrantyMonths: 1, warrantyPeriod: '1 Tháng', note: '' }]);
      return;
    }
    setServices(services.filter((_, i) => i !== index));
  };

  const handleUpdateServiceField = (index, field, value) => {
    const updated = [...services];
    updated[index] = { ...updated[index], [field]: value };
    setServices(updated);
  };

  const resetForm = () => {
    setEditingOrderId(null);
    setEditingOrderCode('');
    setCustomerName('');
    setCustomerPhone('');
    setDeviceModel('');
    setTechnicianName('');
    setCreatedDate(getTodayDateString());
    setNote('');
    setServices([{ serviceName: '', price: '', quantity: 1, warrantyValue: 1, warrantyUnit: 'THANG', warrantyMonths: 1, warrantyPeriod: '1 Tháng', note: '' }]);
  };

  // Nạp dữ liệu hóa đơn cũ vào form để cập nhật lại
  const handleEditOrder = (order) => {
    setEditingOrderId(order.id);
    setEditingOrderCode(order.orderCode);
    setCustomerName(order.customerName || '');
    setCustomerPhone(order.customerPhone || '');
    setDeviceModel(order.deviceModel || '');
    setTechnicianName(order.technicianName || '');
    setNote(order.note || '');
    
    if (order.createdDate) {
      setCreatedDate(order.createdDate.slice(0, 10));
    }

    if (order.items && order.items.length > 0) {
      setServices(order.items.map(it => {
        let val = it.warrantyMonths !== undefined ? it.warrantyMonths : 0;
        let unit = 'THANG';
        let period = it.warrantyPeriod || (val > 0 ? `${val} Tháng` : 'Không BH');

        if (it.warrantyPeriod) {
          const cleanP = it.warrantyPeriod.toLowerCase();
          const matchNum = cleanP.match(/(\d+)/);
          if (matchNum) {
            val = parseInt(matchNum[1], 10);
            if (cleanP.includes('ngày') || cleanP.includes('ngay') || cleanP.includes('day')) {
              unit = 'NGAY';
            } else if (cleanP.includes('năm') || cleanP.includes('nam') || cleanP.includes('year')) {
              unit = 'NAM';
            } else {
              unit = 'THANG';
            }
          }
        }

        return {
          serviceName: it.serviceName || '',
          price: it.price || 0,
          quantity: it.quantity || 1,
          warrantyValue: val,
          warrantyUnit: unit,
          warrantyMonths: it.warrantyMonths || 0,
          warrantyPeriod: period,
          warrantyExpiry: it.warrantyExpiry ? String(it.warrantyExpiry).slice(0, 10) : '',
          note: it.note || ''
        };
      }));
    } else {
      setServices([{ serviceName: '', price: '', quantity: 1, warrantyValue: 1, warrantyUnit: 'THANG', warrantyMonths: 1, warrantyPeriod: '1 Tháng', note: '' }]);
    }


    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(`Đang chỉnh sửa hóa đơn ${order.orderCode}`, 'info');
  };

  // Xem chi tiết hóa đơn qua modal
  const handleViewDetailById = async (orderId) => {
    if (!orderId) return;
    try {
      const res = await apiSuaChua.getOrderById(orderId);
      setSelectedOrderDetail(res.data?.data || res.data);
    } catch (err) {
      showToast('Lỗi xem chi tiết hóa đơn', 'danger');
    }
  };

  const handleSaveOrder = async () => {
    if (!customerName.trim() || !customerPhone.trim()) {
      showToast('Vui lòng nhập Tên khách hàng và Số điện thoại', 'danger');
      return;
    }

    if (!deviceModel.trim()) {
      showToast('Vui lòng nhập Tên máy (Ví dụ: Dell XPS 9500, Asus TUF...)', 'danger');
      return;
    }

    const validServices = services.filter(s => s.serviceName.trim().length > 0);
    if (validServices.length === 0) {
      showToast('Vui lòng nhập ít nhất 1 dịch vụ hoặc linh kiện sửa chữa', 'danger');
      return;
    }

    const confirmActionText = editingOrderId ? `cập nhật hóa đơn ${editingOrderCode}` : `lưu đơn dịch vụ sửa chữa máy ${deviceModel}`;
    const isConfirmed = await confirm(`Xác nhận ${confirmActionText} cho khách ${customerName}?`);
    if (!isConfirmed) return;

    setIsLoading(true);
    try {
      const payload = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        deviceModel: deviceModel.trim(),
        technicianName: technicianName.trim(),
        createdDate,
        note: note.trim(),
        services: validServices.map(s => {
          const val = parseInt(s.warrantyValue !== undefined ? s.warrantyValue : s.warrantyMonths, 10) || 0;
          const unit = s.warrantyUnit || 'THANG';
          let calculatedMonths = val;
          let periodText = 'Không BH';
          if (val > 0) {
            if (unit === 'NAM') {
              calculatedMonths = val * 12;
              periodText = `${val} Năm`;
            } else if (unit === 'NGAY') {
              calculatedMonths = Math.ceil(val / 30);
              periodText = `${val} Ngày`;
            } else {
              calculatedMonths = val;
              periodText = `${val} Tháng`;
            }
          } else if (s.warrantyPeriod && s.warrantyPeriod !== 'Không BH') {
            periodText = s.warrantyPeriod;
          }

          return {
            serviceName: s.serviceName.trim(),
            price: parseFloat(s.price) || 0,
            quantity: parseInt(s.quantity) || 1,
            warrantyMonths: calculatedMonths,
            warrantyPeriod: periodText,
            note: s.note ? s.note.trim() : ''
          };
        })
      };


      let res;
      if (editingOrderId) {
        res = await apiSuaChua.updateOrder(editingOrderId, payload);
        showToast(`Cập nhật hóa đơn ${editingOrderCode} thành công!`, 'success');
      } else {
        res = await apiSuaChua.createOrder(payload);
        showToast('Đã lưu đơn dịch vụ sửa chữa thành công!', 'success');
      }

      const orderData = res.data?.data || res.data;
      setCompletedOrder(orderData);
      resetForm();
      fetchOrders();
    } catch (err) {
      showToast(err.userMessage || err.message || 'Lỗi khi lưu đơn dịch vụ sửa chữa', 'danger');
    } finally {
      setIsLoading(false);
    }
  };


  const getItemExpiryStatus = (expiryDate) => {
    if (!expiryDate) {
      return {
        text: 'Không bảo hành',
        badge: 'bg-secondary-subtle text-secondary',
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
        badge: 'bg-danger-subtle text-danger',
        icon: AlertCircle
      };
    }
    return {
      text: `Còn hạn (${diffDays} ngày)`,
      badge: 'bg-success-subtle text-success',
      icon: ShieldCheck
    };
  };

  const totalAmount = services.reduce((sum, s) => sum + (parseFloat(s.price) || 0) * (parseInt(s.quantity) || 1), 0);

  return (
    <div className="container-fluid py-4 bg-light min-vh-100">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h2 className="m-0 fw-bold text-dark d-flex align-items-center">
            <Wrench className="me-2 text-warning-emphasis" size={28}/> Dịch Vụ Sửa Chữa & Nâng Cấp
          </h2>
          <p className="text-secondary mb-0 small mt-1">
            Ghi nhận thông tin, cập nhật hóa đơn cũ, nhập tay các dịch vụ với giá và thời hạn bảo hành độc lập
          </p>
        </div>
      </div>

      {/* FORM TẠO MỚI / SỬA HÓA ĐƠN + DANH SÁCH RÚT GỌN BÊN PHẢI */}
      <div className="row g-4">
          {/* Cột trái: Form nhập/sửa đơn */}
          <div className="col-lg-8">
            <div className="card shadow-sm border-0 mb-4">
              <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
                <h5 className="card-title fw-bold m-0 d-flex align-items-center text-primary">
                  {editingOrderId ? (
                    <>
                      <Edit3 className="me-2 text-warning" size={20}/>
                      Đang Cập Nhật Hóa Đơn: <span className="text-danger ms-2">{editingOrderCode}</span>
                    </>
                  ) : (
                    <>
                      <Plus className="me-2" size={20}/>
                      Tạo Đơn Dịch Vụ Sửa Chữa Mới
                    </>
                  )}
                </h5>
                {editingOrderId && (
                  <button type="button" className="btn btn-sm btn-outline-secondary d-flex align-items-center" onClick={resetForm}>
                    <X size={14} className="me-1"/> Hủy sửa (Về tạo mới)
                  </button>
                )}
              </div>
              <div className="card-body p-4">
                {editingOrderId && (
                  <div className="alert alert-warning border-warning-subtle bg-warning-subtle text-warning-emphasis rounded-3 mb-4 py-2 small d-flex align-items-center justify-content-between">
                    <span>Bạn đang chỉnh sửa lại các thông tin của hóa đơn <strong>{editingOrderCode}</strong>. Mọi thay đổi sẽ được cập nhật đồng bộ.</span>
                    <button type="button" className="btn btn-xs btn-outline-dark ms-2" onClick={resetForm}>Tạo đơn mới</button>
                  </div>
                )}

                {/* Thông tin máy & khách */}
                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <label className="form-label text-muted fw-semibold small">Tên khách hàng <span className="text-danger">*</span></label>
                    <div className="input-group">
                      <span className="input-group-text bg-light text-muted border-end-0"><User size={16}/></span>
                      <input className="form-control border-start-0 ps-0" placeholder="Nguyễn Văn A..." value={customerName} onChange={e => setCustomerName(e.target.value)} />
                    </div>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label text-muted fw-semibold small">Số điện thoại <span className="text-danger">*</span></label>
                    <div className="input-group">
                      <span className="input-group-text bg-light text-muted border-end-0"><Phone size={16}/></span>
                      <input className="form-control border-start-0 ps-0" placeholder="0987654321..." value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
                    </div>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label text-muted fw-semibold small">Tên máy của khách <span className="text-danger">*</span></label>
                    <div className="input-group">
                      <span className="input-group-text bg-light text-muted border-end-0"><Laptop size={16}/></span>
                      <input className="form-control border-start-0 ps-0" placeholder="VD: Dell Latitude 7490, Macbook Air M1..." value={deviceModel} onChange={e => setDeviceModel(e.target.value)} />
                    </div>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label text-muted fw-semibold small">Kỹ thuật viên thực hiện</label>
                    <input className="form-control" placeholder="Tên thợ..." value={technicianName} onChange={e => setTechnicianName(e.target.value)} />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label text-muted fw-semibold small">Ngày thực hiện</label>
                    <input type="date" className="form-control" value={createdDate} onChange={e => setCreatedDate(e.target.value)} />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label text-muted fw-semibold small">Ghi chú chung</label>
                    <input className="form-control" placeholder="Tình trạng máy trước sửa, lưu ý..." value={note} onChange={e => setNote(e.target.value)} />
                  </div>
                </div>

                {/* Bảng nhập danh sách dịch vụ / linh kiện */}
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h6 className="fw-bold m-0 text-dark">Danh sách dịch vụ / linh kiện thực hiện:</h6>
                  <button type="button" className="btn btn-sm btn-outline-primary d-flex align-items-center" onClick={handleAddServiceRow}>
                    <Plus size={14} className="me-1"/> Thêm dòng
                  </button>
                </div>

                <div className="table-responsive border rounded bg-white mb-3">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light text-secondary small text-uppercase">
                      <tr>
                        <th className="ps-3 py-2" style={{minWidth: '200px'}}>Tên dịch vụ / Linh kiện</th>
                        <th className="py-2 text-center" style={{width: '70px'}}>SL</th>
                        <th className="py-2 text-end" style={{width: '130px'}}>Đơn giá</th>
                        <th className="py-2 text-center" style={{minWidth: '130px'}}>Bảo hành</th>
                        <th className="py-2" style={{minWidth: '120px'}}>Ghi chú</th>
                        <th className="pe-3 py-2 text-center" style={{width: '40px'}}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {services.map((row, idx) => (
                        <tr key={idx}>
                          <td className="ps-3">
                            <input 
                              type="text"
                              className="form-control form-control-sm"
                              placeholder="VD: Cài Win, Thay Pin, Vệ sinh..."
                              value={row.serviceName}
                              onChange={e => handleUpdateServiceField(idx, 'serviceName', e.target.value)}
                            />
                          </td>
                          <td className="text-center">
                            <input 
                              type="number"
                              min="1"
                              className="form-control form-control-sm text-center px-1"
                              value={row.quantity}
                              onChange={e => handleUpdateServiceField(idx, 'quantity', parseInt(e.target.value) || 1)}
                            />
                          </td>
                          <td className="text-end">
                            <input 
                              type="text"
                              inputMode="numeric"
                              className="form-control form-control-sm text-end fw-semibold text-danger"
                              placeholder="0"
                              value={formatCurrency(row.price)}
                              onChange={e => handleUpdateServiceField(idx, 'price', parseCurrency(e.target.value))}
                            />
                          </td>
                          <td className="text-center">
                            <div className="input-group input-group-sm mx-auto shadow-sm" style={{ maxWidth: '140px' }}>
                              <input 
                                type="number"
                                min="0"
                                className="form-control text-center fw-semibold px-2"
                                placeholder="0"
                                value={row.warrantyValue === 0 ? '0' : (row.warrantyValue ?? row.warrantyMonths ?? '')}
                                onChange={e => {
                                  const val = e.target.value;
                                  const num = val === '' ? '' : Math.max(0, parseInt(val, 10) || 0);
                                  const unit = row.warrantyUnit || 'THANG';
                                  let calcMonths = num === '' ? 0 : num;
                                  if (unit === 'NAM') calcMonths = num * 12;
                                  else if (unit === 'NGAY') calcMonths = Math.ceil(num / 30);

                                  const updated = [...services];
                                  updated[idx] = { ...updated[idx], warrantyValue: num, warrantyMonths: calcMonths };
                                  setServices(updated);
                                }}
                              />
                              <select 
                                className="form-select px-2 bg-light text-dark fw-medium border-start-0"
                                style={{ flex: 'none', width: '75px', cursor: 'pointer' }}
                                value={row.warrantyUnit || 'THANG'}
                                onChange={e => {
                                  const newUnit = e.target.value;
                                  const num = parseInt(row.warrantyValue !== undefined ? row.warrantyValue : row.warrantyMonths, 10) || 0;
                                  let calcMonths = num;
                                  if (newUnit === 'NAM') calcMonths = num * 12;
                                  else if (newUnit === 'NGAY') calcMonths = Math.ceil(num / 30);

                                  const updated = [...services];
                                  updated[idx] = { ...updated[idx], warrantyUnit: newUnit, warrantyMonths: calcMonths };
                                  setServices(updated);
                                }}
                              >
                                <option value="NGAY">Ngày</option>
                                <option value="THANG">Tháng</option>
                                <option value="NAM">Năm</option>
                              </select>
                            </div>
                          </td>

                          <td>
                            <input 
                              type="text"
                              className="form-control form-control-sm"
                              placeholder="Ghi chú tem..."
                              value={row.note}
                              onChange={e => handleUpdateServiceField(idx, 'note', e.target.value)}
                            />
                          </td>
                          <td className="pe-3 text-center">
                            <button 
                              type="button" 
                              className="btn btn-sm btn-outline-danger p-1"
                              onClick={() => handleRemoveServiceRow(idx)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="table-light">
                      <tr>
                        <td colSpan="2" className="text-end fw-bold py-2 text-secondary">Tổng thanh toán:</td>
                        <td className="text-end fw-bold text-danger fs-6 py-2">{formatCurrency(totalAmount)} đ</td>
                        <td colSpan="3"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="d-flex justify-content-between align-items-center">
                  <button type="button" className="btn btn-outline-secondary d-flex align-items-center" onClick={resetForm}>
                    <RotateCcw size={16} className="me-1"/> {editingOrderId ? 'Hủy bỏ' : 'Làm mới'}
                  </button>
                  <button 
                    type="button" 
                    className={`btn fw-bold px-4 d-flex align-items-center shadow-sm ${editingOrderId ? 'btn-warning text-dark' : 'btn-primary'}`}
                    onClick={handleSaveOrder}
                    disabled={isLoading}
                  >
                    <CheckCircle size={18} className="me-1"/> {editingOrderId ? 'Cập Nhật Hóa Đơn' : 'Lưu Đơn Dịch Vụ'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Cột phải: DANH SÁCH RÚT GỌN CÁC ĐƠN GẦN ĐÂY - CLICK ĐỂ XEM CHI TIẾT */}
          <div className="col-lg-4">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
                <div>
                  <h5 className="card-title fw-bold m-0 text-dark">Đơn Sửa Chữa Gần Đây</h5>
                  <small className="text-muted" style={{ fontSize: '0.78rem' }}>Click để xem chi tiết đầy đủ</small>
                </div>
                <div className="input-group" style={{maxWidth: '160px'}}>
                  <input 
                    type="text" 
                    className="form-control form-control-sm" 
                    placeholder="Tìm SĐT, tên..." 
                    value={searchTerm}
                    onChange={e => {
                      setSearchTerm(e.target.value);
                      fetchOrders(e.target.value);
                    }}
                  />
                </div>
              </div>
              <div className="card-body p-3" style={{maxHeight: '650px', overflowY: 'auto'}}>
                {orders.length === 0 ? (
                  <div className="text-center py-5 text-muted">
                    <Wrench size={36} className="opacity-25 mb-2" />
                    <p className="mb-0">Chưa có đơn dịch vụ sửa chữa nào</p>
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-2">
                    {orders.map(ord => (
                      <div 
                        key={ord.id} 
                        className={`p-3 border rounded-3 bg-white shadow-xs transition-all position-relative ${editingOrderId === ord.id ? 'border-warning shadow-sm bg-warning bg-opacity-10' : 'hover-shadow'}`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setSelectedOrderDetail(ord)}
                      >
                        {/* Header rút gọn */}
                        <div className="d-flex justify-content-between align-items-start mb-1">
                          <span className="badge bg-primary-subtle text-primary fw-bold">{ord.orderCode}</span>
                          <span className="text-danger fw-bold">{formatCurrency(ord.totalAmount)} đ</span>
                        </div>

                        {/* Thông tin cơ bản */}
                        <div className="fw-bold text-dark text-truncate mb-1" title={ord.deviceModel}>
                          {ord.deviceModel}
                        </div>

                        <div className="d-flex justify-content-between align-items-center small text-secondary">
                          <span>Khách: <strong>{ord.customerName}</strong></span>
                          <span>SĐT: <strong className="text-dark">{ord.customerPhone}</strong></span>
                        </div>

                        <div className="d-flex justify-content-between align-items-center mt-2 pt-2 border-top">
                          <span className="small text-muted">
                            {ord.items ? `${ord.items.length} dịch vụ` : ''} • {formatDate(ord.createdDate)}
                          </span>

                          <div className="d-flex gap-1" onClick={e => e.stopPropagation()}>
                            <button 
                              type="button" 
                              className="btn btn-xs btn-outline-primary py-0 px-2"
                              title="Chỉnh sửa hóa đơn"
                              onClick={() => handleEditOrder(ord)}
                            >
                              <Edit3 size={12} className="me-1"/> Sửa
                            </button>
                            <button 
                              type="button" 
                              className="btn btn-xs btn-light border py-0 px-2 text-dark"
                              title="Xem chi tiết"
                              onClick={() => setSelectedOrderDetail(ord)}
                            >
                              <Eye size={12} className="me-1"/> Chi tiết
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
        </div>
      </div>

      {/* MODAL XEM CHI TIẾT ĐẦY ĐỦ KHI CLICK VÀO HÓA ĐƠN HOẶC DÒNG DỊCH VỤ */}
      {selectedOrderDetail && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-dark text-white py-3">
                <h5 className="modal-title fw-bold d-flex align-items-center">
                  <Wrench className="me-2 text-warning" size={22} />
                  Chi Tiết Đơn Dịch Vụ: {selectedOrderDetail.orderCode}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setSelectedOrderDetail(null)}></button>
              </div>
              <div className="modal-body p-4">
                {/* Khối thông tin chung */}
                <div className="p-3 bg-light rounded-3 border mb-3">
                  <div className="row g-2 small">
                    <div className="col-sm-6"><strong>Mã hóa đơn:</strong> <span className="badge bg-primary">{selectedOrderDetail.orderCode}</span></div>
                    <div className="col-sm-6"><strong>Ngày thực hiện:</strong> {formatDate(selectedOrderDetail.createdDate)}</div>
                    <div className="col-sm-6"><strong>Khách hàng:</strong> {selectedOrderDetail.customerName}</div>
                    <div className="col-sm-6"><strong>Số điện thoại:</strong> <span className="text-dark fw-bold">{selectedOrderDetail.customerPhone}</span></div>
                    <div className="col-sm-6"><strong>Máy sửa chữa:</strong> <span className="text-primary fw-bold">{selectedOrderDetail.deviceModel}</span></div>
                    <div className="col-sm-6"><strong>Kỹ thuật viên:</strong> {selectedOrderDetail.technicianName || '—'}</div>
                    {selectedOrderDetail.note && (
                      <div className="col-12 mt-1"><strong>Ghi chú:</strong> <span className="text-muted">{selectedOrderDetail.note}</span></div>
                    )}
                    <div className="col-12 mt-2 pt-2 border-top d-flex justify-content-between align-items-center">
                      <strong className="fs-6">Tổng tiền thanh toán:</strong>
                      <span className="text-danger fw-bold fs-5">{formatCurrency(selectedOrderDetail.totalAmount)} đ</span>
                    </div>
                  </div>
                </div>

                {/* Danh sách các dịch vụ & thời hạn bảo hành */}
                <h6 className="fw-bold mb-2 text-dark">Danh sách dịch vụ & Linh kiện bảo hành:</h6>
                <div className="table-responsive border rounded">
                  <table className="table table-sm align-middle mb-0">
                    <thead className="table-light small">
                      <tr>
                        <th className="ps-3 py-2">Dịch vụ / Linh kiện</th>
                        <th className="py-2 text-center" style={{ width: '70px' }}>SL</th>
                        <th className="py-2 text-end" style={{ width: '130px' }}>Đơn giá</th>
                        <th className="py-2 text-center" style={{ width: '120px' }}>Bảo hành</th>
                        <th className="py-2 text-center" style={{ width: '130px' }}>Hạn bảo hành</th>
                        <th className="pe-3 py-2 text-end" style={{ width: '130px' }}>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrderDetail.items?.map((it, idx) => {
                        const itExp = getItemExpiryStatus(it.warrantyExpiry);
                        const ItExpIcon = itExp.icon;

                        return (
                          <tr key={idx}>
                            <td className="ps-3 py-2">
                              <strong>{it.serviceName}</strong>
                              {it.note && <div className="small text-muted">Tem/ghi chú: {it.note}</div>}
                            </td>
                            <td className="text-center">{it.quantity}</td>
                            <td className="text-end fw-medium">{formatCurrency(it.price)} đ</td>
                            <td className="text-center">
                              {it.warrantyPeriod ? (
                                <span className="badge bg-light text-dark border">{it.warrantyPeriod}</span>
                              ) : it.warrantyMonths > 0 ? (
                                <span className="badge bg-light text-dark border">{it.warrantyMonths} Tháng</span>
                              ) : (
                                <span className="badge bg-secondary-subtle text-secondary">Không BH</span>
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

              <div className="modal-footer bg-light d-flex justify-content-between">
                <div className="d-flex gap-2">
                  <button 
                    type="button" 
                    className="btn btn-warning fw-medium d-flex align-items-center"
                    onClick={() => {
                      const ord = selectedOrderDetail;
                      setSelectedOrderDetail(null);
                      handleEditOrder(ord);
                    }}
                  >
                    <Edit3 size={16} className="me-1" /> Chỉnh sửa hóa đơn này
                  </button>
                  <button type="button" className="btn btn-outline-secondary d-flex align-items-center" onClick={() => window.print()}>
                    <Printer size={16} className="me-1" /> In hóa đơn
                  </button>
                </div>
                <button type="button" className="btn btn-secondary px-4" onClick={() => setSelectedOrderDetail(null)}>
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal thông báo sau khi lưu hóa đơn */}
      {completedOrder && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-success text-white py-3">
                <h5 className="modal-title fw-bold d-flex align-items-center">
                  <CheckCircle className="me-2" size={22} />
                  Hóa Đơn Dịch Vụ - Mã: {completedOrder.orderCode}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setCompletedOrder(null)}></button>
              </div>
              <div className="modal-body p-4">
                <div className="alert alert-success border-success-subtle bg-success-subtle text-success-emphasis rounded-3 mb-3 small">
                  Hóa đơn dịch vụ sửa chữa đã được cập nhật đồng bộ lên hệ thống. Khách hàng có thể tra cứu bảo hành các dịch vụ bằng số điện thoại <strong>{completedOrder.customerPhone}</strong>.
                </div>

                <div className="p-3 bg-light rounded-3 border mb-3">
                  <div className="row g-2 small">
                    <div className="col-sm-6"><strong>Khách hàng:</strong> {completedOrder.customerName}</div>
                    <div className="col-sm-6"><strong>Số điện thoại:</strong> {completedOrder.customerPhone}</div>
                    <div className="col-sm-6"><strong>Máy sửa:</strong> {completedOrder.deviceModel}</div>
                    <div className="col-sm-6"><strong>Tổng tiền:</strong> <span className="text-danger fw-bold">{formatCurrency(completedOrder.totalAmount)} đ</span></div>
                  </div>
                </div>

                <h6 className="fw-bold mb-2">Hạng mục dịch vụ & Bảo hành:</h6>
                <div className="table-responsive border rounded">
                  <table className="table table-sm mb-0">
                    <thead className="table-light small">
                      <tr>
                        <th>Dịch vụ / Linh kiện</th>
                        <th className="text-center">Số lượng</th>
                        <th className="text-end">Đơn giá</th>
                        <th className="text-center">Bảo hành</th>
                        <th className="text-center">Hạn bảo hành</th>
                      </tr>
                    </thead>
                    <tbody>
                      {completedOrder.items?.map((it, idx) => (
                        <tr key={idx}>
                          <td><strong>{it.serviceName}</strong></td>
                          <td className="text-center">{it.quantity}</td>
                          <td className="text-end">{formatCurrency(it.price)} đ</td>
                          <td className="text-center">
                            {it.warrantyMonths > 0 ? (
                              <span className="badge bg-success-subtle text-success">{it.warrantyMonths} Tháng</span>
                            ) : (
                              <span className="badge bg-secondary-subtle text-secondary">Không BH</span>
                            )}
                          </td>
                          <td className="text-center text-primary fw-bold">{it.warrantyExpiry || '---'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-footer bg-light">
                <button type="button" className="btn btn-outline-secondary" onClick={() => window.print()}>
                  <Printer size={16} className="me-1" /> In phiếu biên nhận
                </button>
                <button type="button" className="btn btn-primary px-4" onClick={() => setCompletedOrder(null)}>
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
