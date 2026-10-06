import React, { useState, useEffect } from 'react';
import { ShoppingBag, PackagePlus, CheckCircle, RotateCcw, User, Phone, Tag, Trash2, X } from 'lucide-react';
import { useToast } from '../../contexts/notification/NguCanhThongBao';
import axiosClient from '../../api/axiosClient';
import { formatCurrency, parseCurrency } from '../../utils/dinh_dang';

export default function TrangBanPhuKien() {
  const { showToast, confirm } = useToast();
  
  // Form State
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [salesperson, setSalesperson] = useState('');
  const [customer, setCustomer] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [saleNote, setSaleNote] = useState('');

  const [isLoading, setIsLoading] = useState(false);

  // Phụ kiện
  const [availableAccessories, setAvailableAccessories] = useState([]);
  const [selectedAccessories, setSelectedAccessories] = useState([]);
  const [accSearchTerm, setAccSearchTerm] = useState('');
  const [showAccDropdown, setShowAccDropdown] = useState(false);

  useEffect(() => {
    fetchAccessories();
  }, []);

  const fetchAccessories = async () => {
    try {
      const res = await axiosClient.get('/accessory/available');
      setAvailableAccessories(res.data);
    } catch (err) {
      console.error("Lỗi lấy danh sách phụ kiện:", err);
    }
  };

  const handleSale = async () => {
    if (selectedAccessories.length === 0) {
      showToast('Vui lòng chọn ít nhất 1 phụ kiện để bán', 'danger');
      return;
    }
    
    if (!customer.trim() || !customerPhone.trim()) {
      showToast('Vui lòng nhập Thông tin khách hàng và Số điện thoại', 'danger');
      return;
    }
    
    const isConfirmed = await confirm(`Xác nhận bán ${selectedAccessories.length} mã phụ kiện?`);
    if (!isConfirmed) return;

    setIsLoading(true);
    try {
      await axiosClient.post('/accessory/sell-standalone', {
        salesperson,
        saleDate,
        customerName: customer,
        customerPhone,
        saleNote,
        accessories: selectedAccessories
      });
      showToast('Xuất bán phụ kiện thành công!', 'success');
      resetForm();
      fetchAccessories(); // Reload available stock
    } catch (err) {
      showToast(err.userMessage || err.message || 'Lỗi xử lý giao dịch bán phụ kiện', 'danger');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setSalesperson('');
    setCustomer('');
    setCustomerPhone('');
    setSaleNote('');
    setSelectedAccessories([]);
    setAccSearchTerm('');
    setShowAccDropdown(false);
  };

  const totalValue = selectedAccessories.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);

  return (
    <div className="container-fluid py-4 bg-light min-vh-100">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="m-0 fw-bold text-dark d-flex align-items-center">
          <ShoppingBag className="me-2 text-primary" size={28}/> Bán Phụ Kiện Lẻ
        </h2>
      </div>

      <div className="row g-4">
        {/* Cột trái: Chọn phụ kiện */}
        <div className="col-lg-7">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-white border-bottom py-3">
              <h5 className="card-title fw-bold m-0 d-flex align-items-center text-primary">
                <PackagePlus className="me-2" size={20}/>
                Danh sách xuất bán
              </h5>
            </div>
            <div className="card-body p-4">
              <div className="alert alert-info border-info-subtle bg-info-subtle text-info-emphasis rounded-3 mb-4 py-2 small">
                Tìm và chọn phụ kiện để xuất bán riêng lẻ (không kèm máy). Kho sẽ tự động trừ số lượng.
              </div>

              <div className="position-relative mb-4">
                <label className="form-label text-muted fw-semibold small">Nhập để tìm phụ kiện <span className="text-danger">*</span></label>
                <div className="border bg-white rounded p-1 d-flex">
                  <input
                    type="text"
                    className="form-control border-0 shadow-none bg-transparent"
                    placeholder="VD: chuột logitech, balo..."
                    value={accSearchTerm}
                    onChange={e => {
                      setAccSearchTerm(e.target.value);
                      setShowAccDropdown(true);
                    }}
                    onFocus={() => setShowAccDropdown(true)}
                    onBlur={() => setTimeout(() => setShowAccDropdown(false), 200)}
                  />
                </div>
                {showAccDropdown && (
                  <ul className="dropdown-menu show w-100 position-absolute shadow" style={{ top: '100%', left: 0, maxHeight: '300px', overflowY: 'auto', zIndex: 1000 }}>
                    {availableAccessories.filter(a => a.name.toLowerCase().includes(accSearchTerm.toLowerCase()) || a.sku.toLowerCase().includes(accSearchTerm.toLowerCase())).map(acc => (
                      <li key={acc.sku}>
                        <button
                          type="button"
                          className="dropdown-item d-flex justify-content-between align-items-center py-2 border-bottom"
                          disabled={acc.quantity <= 0}
                          onClick={() => {
                            if (acc.quantity <= 0) return;
                            
                            const existing = selectedAccessories.find(sa => sa.sku === acc.sku);
                            if (existing) {
                              if (existing.quantity + 1 > acc.quantity) {
                                showToast(`Số lượng không được vượt quá tồn kho (${acc.quantity})`, 'warning');
                                return;
                              }
                              setSelectedAccessories(selectedAccessories.map(sa => 
                                sa.sku === acc.sku ? { ...sa, quantity: sa.quantity + 1 } : sa
                              ));
                            } else {
                              setSelectedAccessories([...selectedAccessories, { sku: acc.sku, name: acc.name, quantity: 1, price: acc.price }]);
                            }
                            
                            setAccSearchTerm('');
                            setShowAccDropdown(false);
                          }}
                        >
                          <div className="d-flex flex-column">
                            <span className="fw-medium text-dark">{acc.name}</span>
                            <small className="text-secondary">{acc.sku} • Kho: <span className="fw-bold text-primary">{acc.quantity}</span></small>
                          </div>
                          {acc.price && <span className="text-success fw-bold">{formatCurrency(acc.price)}đ</span>}
                        </button>
                      </li>
                    ))}
                    {availableAccessories.filter(a => a.name.toLowerCase().includes(accSearchTerm.toLowerCase()) || a.sku.toLowerCase().includes(accSearchTerm.toLowerCase())).length === 0 && (
                      <li><span className="dropdown-item text-muted text-center py-3">Không tìm thấy phụ kiện phù hợp trong kho</span></li>
                    )}
                  </ul>
                )}
              </div>

              {selectedAccessories.length > 0 ? (
                <div className="table-responsive border rounded bg-white">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light text-secondary small text-uppercase">
                      <tr>
                        <th className="ps-3 py-3">Phụ kiện</th>
                        <th className="py-3 text-center" style={{width: '120px'}}>Số lượng</th>
                        <th className="py-3 text-end">Đơn giá</th>
                        <th className="py-3 text-end">Thành tiền</th>
                        <th className="pe-3 py-3 text-center" style={{width: '60px'}}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedAccessories.map((sa) => (
                        <tr key={sa.sku}>
                          <td className="ps-3">
                            <div className="fw-medium text-dark">{sa.name}</div>
                            <small className="text-muted">{sa.sku}</small>
                          </td>
                          <td className="text-center">
                            <div className="d-flex align-items-center justify-content-center gap-2">
                              <button 
                                className="btn btn-sm btn-light border p-1 d-flex align-items-center"
                                onClick={() => {
                                  if (sa.quantity > 1) {
                                    setSelectedAccessories(selectedAccessories.map(item => item.sku === sa.sku ? { ...item, quantity: item.quantity - 1 } : item));
                                  } else {
                                    setSelectedAccessories(selectedAccessories.filter(item => item.sku !== sa.sku));
                                  }
                                }}
                              >
                                <X size={14} />
                              </button>
                              <span className="fw-bold fs-6">{sa.quantity}</span>
                            </div>
                          </td>
                          <td className="text-end text-secondary">{sa.price ? formatCurrency(sa.price) : '---'}</td>
                          <td className="text-end fw-bold text-primary">{sa.price ? formatCurrency(sa.price * sa.quantity) : '---'}</td>
                          <td className="pe-3 text-center">
                            <button 
                              className="btn btn-sm btn-outline-danger p-1"
                              onClick={() => setSelectedAccessories(selectedAccessories.filter(item => item.sku !== sa.sku))}
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="table-light">
                      <tr>
                        <td colSpan="3" className="text-end fw-bold py-3 text-secondary">Tổng cộng:</td>
                        <td className="text-end fw-bold text-danger fs-5 py-3">{formatCurrency(totalValue)} đ</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="text-center py-5 border rounded bg-light border-dashed">
                  <ShoppingBag size={48} className="text-secondary opacity-25 mb-3" />
                  <p className="text-muted mb-0">Chưa chọn phụ kiện nào để bán</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cột phải: Thông tin giao dịch */}
        <div className="col-lg-5">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-white border-bottom py-3">
              <h5 className="card-title fw-bold m-0 d-flex align-items-center text-primary">
                <User className="me-2" size={20}/>
                Thông tin giao dịch
              </h5>
            </div>
            <div className="card-body p-4 d-flex flex-column gap-3">
              
              <div>
                <label className="form-label text-muted fw-semibold small">Ngày bán <span className="text-danger">*</span></label>
                <input type="datetime-local" className="form-control" value={saleDate} onChange={e => setSaleDate(e.target.value)} />
              </div>

              <div>
                <label className="form-label text-muted fw-semibold small">Nhân viên bán</label>
                <input className="form-control" value={salesperson} onChange={e => setSalesperson(e.target.value)} placeholder="Tên nhân viên..." />
              </div>

              <hr className="text-secondary opacity-25 my-1" />

              <div className="d-flex justify-content-between align-items-center mb-1">
                <label className="form-label text-muted fw-semibold small mb-0">Khách hàng <span className="text-danger">*</span></label>
                <button 
                  type="button" 
                  className="btn btn-sm btn-outline-primary py-0 px-2" 
                  style={{ fontSize: '0.75rem' }}
                  onClick={() => {
                    const timestamp = Date.now().toString().slice(-6);
                    setCustomer(`Khách vãng lai ${timestamp}`);
                    setCustomerPhone(`0999${timestamp}`);
                  }}
                >
                  <User size={12} className="me-1"/> Khách vãng lai
                </button>
              </div>
              <div className="mb-3">
                <div className="input-group">
                  <span className="input-group-text bg-light text-muted border-end-0"><User size={16}/></span>
                  <input className="form-control border-start-0 ps-0" value={customer} onChange={e => setCustomer(e.target.value)} placeholder="Tên khách hàng..." />
                </div>
              </div>

              <div>
                <label className="form-label text-muted fw-semibold small">Số điện thoại <span className="text-danger">*</span></label>
                <div className="input-group">
                  <span className="input-group-text bg-light text-muted border-end-0"><Phone size={16}/></span>
                  <input className="form-control border-start-0 ps-0" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="Số điện thoại khách hàng..." />
                </div>
              </div>

              <div>
                <label className="form-label text-muted fw-semibold small">Ghi chú thêm</label>
                <textarea className="form-control" rows="3" value={saleNote} onChange={e => setSaleNote(e.target.value)} placeholder="VD: Giao hàng tận nơi, khách quen..."></textarea>
              </div>

            </div>
            
            <div className="card-footer bg-white border-top p-4 d-flex justify-content-between align-items-center gap-3">
              <button type="button" className="btn btn-outline-secondary d-flex align-items-center px-4" onClick={resetForm}>
                <RotateCcw size={18} className="me-2" /> Làm mới
              </button>
              
              <button 
                type="button" 
                className="btn btn-primary btn-lg flex-grow-1 shadow-sm fw-bold d-flex justify-content-center align-items-center" 
                onClick={handleSale}
                disabled={isLoading || selectedAccessories.length === 0}
              >
                {isLoading ? (
                  <><span className="spinner-border spinner-border-sm me-2"></span> Đang xử lý...</>
                ) : (
                  <><CheckCircle size={20} className="me-2"/> Hoàn tất xuất bán</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
