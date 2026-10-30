import React, { useState, useEffect } from 'react';
import { ShoppingBag, PackagePlus, CheckCircle, RotateCcw, User, Phone, Tag, Trash2, ShieldCheck, Printer, Search, Calendar, FileText, Minus, Plus, CreditCard, Info } from 'lucide-react';
import { useToast } from '../../contexts/notification/NguCanhThongBao';
import { apiPhuKien } from '../../api';
import { formatCurrency, parseCurrency, formatDate, getTodayDateString } from '../../utils/dinh_dang';

export default function TrangBanPhuKien() {
  const { showToast, confirm } = useToast();
  
  // Form State
  const [saleDate, setSaleDate] = useState(() => getTodayDateString());
  const [salesperson, setSalesperson] = useState('');
  const [customer, setCustomer] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [saleNote, setSaleNote] = useState('');
  const [discount, setDiscount] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);

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
      const res = await apiPhuKien.getAvailable();
      setAvailableAccessories(res.data?.data || res.data || []);
    } catch (err) {
      console.error("Lỗi lấy danh sách phụ kiện:", err);
    }
  };

  const totalValue = selectedAccessories.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
  const discountNum = parseInt(parseCurrency(discount), 10) || 0;
  const finalValue = Math.max(0, totalValue - discountNum);

  const handleSale = async () => {
    if (selectedAccessories.length === 0) {
      showToast('Vui lòng chọn ít nhất 1 phụ kiện để bán', 'danger');
      return;
    }
    
    if (!customer.trim() || !customerPhone.trim()) {
      showToast('Vui lòng nhập Thông tin khách hàng và Số điện thoại', 'danger');
      return;
    }
    
    const isConfirmed = await confirm(`Xác nhận xuất bán ${selectedAccessories.length} mã phụ kiện?`);
    if (!isConfirmed) return;

    setIsLoading(true);
    try {
      const res = await apiPhuKien.sellStandalone({
        salesperson,
        saleDate,
        customerName: customer,
        customerPhone,
        saleNote,
        discount: discountNum,
        totalAmount: totalValue,
        finalAmount: finalValue,
        accessories: selectedAccessories.map(item => {
          const val = parseInt(item.warrantyValue !== undefined ? item.warrantyValue : item.warrantyMonths) || 0;
          const unit = item.warrantyUnit || 'THANG';
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
          }
          
          return {
            sku: item.sku,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            warrantyMonths: calculatedMonths,
            warrantyValue: val,
            warrantyUnit: unit,
            warrantyPeriod: periodText,
            serialNumber: '', // Đã bỏ nhập liệu nên mặc định truyền chuỗi rỗng
            note: ''
          };
        })
      });
      
      const orderData = res.data?.data || res.data;
      setCompletedOrder(orderData);
      showToast('Xuất bán phụ kiện thành công!', 'success');
      resetForm();
      fetchAccessories();
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
    setDiscount('');
    setSelectedAccessories([]);
    setAccSearchTerm('');
    setShowAccDropdown(false);
  };

  const updateItemField = (sku, field, value) => {
    setSelectedAccessories(selectedAccessories.map(item => 
      item.sku === sku ? { ...item, [field]: value } : item
    ));
  };

  return (
    <div className="container-fluid py-4 bg-light min-vh-100 d-flex flex-column gap-4">
      {/* HEADER */}
      <div>
        <h2 className="m-0 fw-bold text-dark d-flex align-items-center">
          <div className="bg-primary bg-opacity-10 text-primary p-2 rounded-3 me-3 d-flex align-items-center justify-content-center">
            <ShoppingBag size={28}/>
          </div>
          <div>
            Bán Phụ Kiện Lẻ
            <div className="text-secondary fw-normal fs-6 mt-1">Hệ thống tạo đơn bán hàng nhanh</div>
          </div>
        </h2>
      </div>

      {/* ================= TẦNG 1: TÌM KIẾM & BẢNG SẢN PHẨM ================= */}
      <div className="card shadow-sm border-0">
        <div className="card-header bg-white border-bottom py-3 d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center">
            <PackagePlus className="me-2 text-primary" size={20}/>
            <h5 className="card-title fw-bold m-0">Giỏ hàng & Sản phẩm</h5>
          </div>
          <span className="badge bg-primary bg-opacity-10 text-primary px-3 py-2 fs-6">
            Số lượng: {selectedAccessories.reduce((acc, curr) => acc + curr.quantity, 0)}
          </span>
        </div>
        
        <div className="card-body p-4">
          
          <div className="alert alert-info border-info-subtle bg-info-subtle text-info-emphasis rounded-3 p-3 mb-4 d-flex align-items-center shadow-sm">
            <Info size={22} className="me-3 flex-shrink-0 text-info" />
            <span className="small fw-medium">
              Mỗi phụ kiện có thể thiết lập mức giá và thời hạn bảo hành riêng biệt. Dữ liệu sẽ tự động đồng bộ vào cổng tra cứu bảo hành cho khách hàng.
            </span>
          </div>

          {/* Ô Tìm Kiếm */}
          <div className="position-relative mb-4 mx-auto" style={{ maxWidth: '800px' }}>
            <div className="input-group input-group-lg shadow-sm rounded-3">
              <span className="input-group-text bg-white border-end-0 text-muted px-3">
                <Search size={22} />
              </span>
              <input
                type="text"
                className="form-control border-start-0 ps-0 fs-6 bg-white"
                placeholder="Quét mã vạch hoặc nhập tên phụ kiện (VD: Chuột không dây, Cáp sạc...)"
                value={accSearchTerm}
                onChange={e => {
                  setAccSearchTerm(e.target.value);
                  setShowAccDropdown(true);
                }}
                onFocus={() => setShowAccDropdown(true)}
                onBlur={() => setTimeout(() => setShowAccDropdown(false), 200)}
              />
            </div>

            {/* Dropdown tìm kiếm */}
            {showAccDropdown && accSearchTerm && (
              <ul className="dropdown-menu show w-100 position-absolute shadow-lg border-0 mt-2 rounded-3 p-2" style={{ top: '100%', left: 0, maxHeight: '350px', overflowY: 'auto', zIndex: 1050 }}>
                {availableAccessories.filter(a => a.name.toLowerCase().includes(accSearchTerm.toLowerCase()) || a.sku.toLowerCase().includes(accSearchTerm.toLowerCase())).length > 0 ? (
                  availableAccessories.filter(a => a.name.toLowerCase().includes(accSearchTerm.toLowerCase()) || a.sku.toLowerCase().includes(accSearchTerm.toLowerCase())).map(acc => (
                    <li key={acc.sku} className="mb-1">
                      <button
                        type="button"
                        className="dropdown-item rounded-2 d-flex justify-content-between align-items-center p-3"
                        disabled={acc.quantity <= 0}
                        style={{ whiteSpace: 'normal' }}
                        onClick={() => {
                          if (acc.quantity <= 0) return;
                          const existing = selectedAccessories.find(sa => sa.sku === acc.sku);
                          if (existing) {
                            if (existing.quantity + 1 > acc.quantity) {
                              showToast(`Số lượng không được vượt quá tồn kho (${acc.quantity})`, 'warning');
                              return;
                            }
                            updateItemField(acc.sku, 'quantity', existing.quantity + 1);
                          } else {
                            setSelectedAccessories([...selectedAccessories, {
                              sku: acc.sku,
                              name: acc.name,
                              quantity: 1,
                              price: acc.price || 0,
                              warrantyMonths: acc.defaultWarrantyMonths || 0,
                              warrantyValue: acc.defaultWarrantyMonths || 0,
                              warrantyUnit: 'THANG',
                              serialNumber: '',
                              note: ''
                            }]);
                          }
                          setAccSearchTerm('');
                          setShowAccDropdown(false);
                        }}
                      >
                        <div className="d-flex flex-column text-start pe-3">
                          <span className={`fw-bold ${acc.quantity <= 0 ? 'text-muted' : 'text-dark'}`}>{acc.name}</span>
                          <div className="text-secondary small mt-1 d-flex flex-wrap gap-2">
                            <span>Mã: <strong className="text-dark">{acc.sku}</strong></span>
                            <span>• Tồn: <span className={acc.quantity > 0 ? 'text-success fw-bold' : 'text-danger fw-bold'}>{acc.quantity}</span></span>
                          </div>
                        </div>
                        <div className="text-end ms-auto flex-shrink-0">
                          {acc.price ? <div className="text-primary fw-bold fs-6">{formatCurrency(acc.price)}đ</div> : null}
                          {acc.quantity <= 0 && <span className="badge bg-danger mt-1">Hết hàng</span>}
                        </div>
                      </button>
                    </li>
                  ))
                ) : (
                  <li><div className="p-4 text-center text-muted">Không tìm thấy phụ kiện nào phù hợp.</div></li>
                )}
              </ul>
            )}
          </div>

          {/* BẢNG SẢN PHẨM */}
          {selectedAccessories.length > 0 ? (
            <div className="border rounded-3 shadow-sm bg-white overflow-hidden">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light text-secondary small text-uppercase fw-semibold">
                  <tr>
                    <th className="ps-4 py-3" style={{ width: '38%' }}>Sản phẩm</th>
                    <th className="py-3 text-center" style={{ width: '12%' }}>Số lượng</th>
                    <th className="py-3 text-end" style={{ width: '16%' }}>Đơn giá (đ)</th>
                    <th className="py-3 text-center" style={{ width: '18%' }}>Bảo hành</th>
                    <th className="py-3 text-end pe-4" style={{ width: '13%' }}>Thành tiền</th>
                    <th className="py-3 text-center" style={{ width: '3%' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {selectedAccessories.map((sa) => (
                    <tr key={sa.sku}>
                      <td className="ps-4">
                        <div className="fw-bold text-dark lh-base text-wrap">{sa.name}</div>
                        <small className="text-muted">{sa.sku}</small>
                      </td>
                      
                      <td className="text-center">
                        <div className="input-group input-group-sm mx-auto shadow-sm" style={{ maxWidth: '90px' }}>
                          <button className="btn btn-light border px-2 text-secondary hover-primary" onClick={() => sa.quantity > 1 ? updateItemField(sa.sku, 'quantity', sa.quantity - 1) : setSelectedAccessories(selectedAccessories.filter(item => item.sku !== sa.sku))}><Minus size={14}/></button>
                          <input type="text" className="form-control text-center fw-bold px-0 bg-white" value={sa.quantity} readOnly />
                          <button className="btn btn-light border px-2 text-secondary hover-primary" onClick={() => updateItemField(sa.sku, 'quantity', sa.quantity + 1)}><Plus size={14}/></button>
                        </div>
                      </td>

                      <td className="text-end">
                        <div className="mx-auto" style={{ maxWidth: '140px', marginLeft: 'auto' }}>
                          <input 
                            type="text"
                            inputMode="numeric"
                            className="form-control text-end fw-medium shadow-sm"
                            value={formatCurrency(sa.price)}
                            onChange={e => {
                              const rawValue = e.target.value.replace(/\D/g, '');
                              updateItemField(sa.sku, 'price', rawValue ? parseInt(rawValue, 10) : 0);
                            }}
                          />
                        </div>
                      </td>

                      <td className="text-center">
                        <div className="input-group mx-auto shadow-sm" style={{ maxWidth: '140px' }}>
                          <input 
                            type="number" min="0"
                            className="form-control text-center fw-semibold px-2" placeholder="0"
                            value={sa.warrantyValue === 0 ? '0' : (sa.warrantyValue ?? sa.warrantyMonths ?? '')}
                            onChange={e => {
                              const val = e.target.value;
                              const num = val === '' ? '' : Math.max(0, parseInt(val, 10) || 0);
                              const unit = sa.warrantyUnit || 'THANG';
                              let calcMonths = num === '' ? 0 : num;
                              if (unit === 'NAM') calcMonths = num * 12;
                              else if (unit === 'NGAY') calcMonths = Math.ceil(num / 30);
                              
                              setSelectedAccessories(selectedAccessories.map(item => 
                                item.sku === sa.sku ? { ...item, warrantyValue: num, warrantyMonths: calcMonths } : item
                              ));
                            }}
                          />
                          <select 
                            className="form-select px-2 bg-light text-dark fw-medium border-start-0"
                            style={{ flex: 'none', width: '75px', cursor: 'pointer' }}
                            value={sa.warrantyUnit || 'THANG'}
                            onChange={e => {
                              const newUnit = e.target.value;
                              const num = parseInt(sa.warrantyValue !== undefined ? sa.warrantyValue : sa.warrantyMonths, 10) || 0;
                              let calcMonths = num;
                              if (newUnit === 'NAM') calcMonths = num * 12;
                              else if (newUnit === 'NGAY') calcMonths = Math.ceil(num / 30);

                              setSelectedAccessories(selectedAccessories.map(item => 
                                item.sku === sa.sku ? { ...item, warrantyUnit: newUnit, warrantyMonths: calcMonths } : item
                              ));
                            }}
                          >
                            <option value="NGAY">Ngày</option>
                            <option value="THANG">Tháng</option>
                            <option value="NAM">Năm</option>
                          </select>
                        </div>
                      </td>

                      <td className="text-end pe-4 fw-bold text-primary fs-6">
                        {formatCurrency(sa.price * sa.quantity)} đ
                      </td>

                      <td className="text-center">
                        <button 
                          className="btn btn-sm btn-link text-danger p-2 opacity-75 hover-opacity-100 rounded-circle bg-danger bg-opacity-10"
                          title="Xóa sản phẩm"
                          onClick={() => setSelectedAccessories(selectedAccessories.filter(item => item.sku !== sa.sku))}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-5 border rounded-3 bg-light border-dashed mx-auto">
              <div className="bg-white rounded-circle d-inline-flex p-4 shadow-sm mb-3">
                <ShoppingBag size={40} className="text-secondary opacity-50" />
              </div>
              <h5 className="text-muted fw-bold">Giỏ hàng trống</h5>
              <p className="text-muted small mb-0">Hãy tìm kiếm phụ kiện phía trên để thêm vào đơn hàng</p>
            </div>
          )}
        </div>
      </div>

      {/* ================= TẦNG 2: KHÁCH HÀNG & THANH TOÁN ================= */}
      <div className="row g-4 mb-4">
        
        {/* BÊN TRÁI: THÔNG TIN KHÁCH HÀNG & GIAO DỊCH */}
        <div className="col-xl-7">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
              <h5 className="card-title fw-bold m-0 d-flex align-items-center text-dark">
                <User className="me-2 text-primary" size={20}/> Thông tin Khách hàng
              </h5>
              <button 
                type="button" 
                className="btn btn-sm btn-outline-primary py-1 px-3 rounded-pill fw-semibold"
                onClick={() => {
                  const timestamp = Date.now().toString().slice(-6);
                  setCustomer(`Khách lẻ`);
                  setCustomerPhone(`09${timestamp}`);
                }}
              >
                + Điền Khách vãng lai
              </button>
            </div>
            
            <div className="card-body p-4">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label text-dark fw-bold small mb-1">Tên khách hàng <span className="text-danger">*</span></label>
                  <div className="input-group shadow-sm">
                    <span className="input-group-text bg-white text-muted border-end-0"><User size={16}/></span>
                    <input className="form-control border-start-0 ps-0 fw-medium" value={customer} onChange={e => setCustomer(e.target.value)} placeholder="Nhập tên..." />
                  </div>
                </div>
                <div className="col-md-6">
                  <label className="form-label text-dark fw-bold small mb-1">Số điện thoại <span className="text-danger">*</span></label>
                  <div className="input-group shadow-sm">
                    <span className="input-group-text bg-white text-muted border-end-0"><Phone size={16}/></span>
                    <input className="form-control border-start-0 ps-0 fw-medium" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="SĐT tra cứu bảo hành..." />
                  </div>
                </div>

                <div className="col-md-6">
                  <label className="form-label text-muted fw-semibold small mb-1">Ngày bán <span className="text-danger">*</span></label>
                  <div className="input-group">
                    <span className="input-group-text bg-light text-muted border-end-0"><Calendar size={16}/></span>
                    <input type="date" className="form-control border-start-0 ps-0 bg-light" value={saleDate} onChange={e => setSaleDate(e.target.value)} />
                  </div>
                </div>
                <div className="col-md-6">
                  <label className="form-label text-muted fw-semibold small mb-1">Nhân viên bán hàng</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light text-muted border-end-0"><Tag size={16}/></span>
                    <input className="form-control border-start-0 ps-0 bg-light" value={salesperson} onChange={e => setSalesperson(e.target.value)} placeholder="Tên nhân viên..." />
                  </div>
                </div>

                <div className="col-12">
                  <label className="form-label text-dark fw-bold small mb-1">Ghi chú tổng cho đơn hàng</label>
                  <textarea className="form-control shadow-sm" rows="2" value={saleNote} onChange={e => setSaleNote(e.target.value)} placeholder="VD: Khách quen, Giao hàng tận nơi, Xuất VAT..."></textarea>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BÊN PHẢI: THANH TOÁN & CHỐT ĐƠN */}
        <div className="col-xl-5">
          <div className="card shadow-sm border-0 h-100 bg-primary bg-opacity-10 border border-primary border-opacity-25">
            <div className="card-header bg-transparent border-bottom border-primary border-opacity-25 py-3">
              <h5 className="card-title fw-bold m-0 d-flex align-items-center text-primary">
                <CreditCard className="me-2" size={20}/> Tổng kết Thanh toán
              </h5>
            </div>
            
            <div className="card-body p-4 d-flex flex-column">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span className="text-secondary fw-semibold">Tổng số tiền hàng:</span>
                <span className="fw-bold text-dark fs-5">{formatCurrency(totalValue)} đ</span>
              </div>
              
              <div className="mb-4">
                <label className="form-label text-dark fw-bold small mb-1 d-flex justify-content-between">
                  <span>Trừ khuyến mãi / Giảm giá:</span>
                </label>
                <div className="input-group shadow-sm">
                  <span className="input-group-text bg-white text-success fw-bold border-end-0">đ</span>
                  <input 
                    type="text"
                    inputMode="numeric"
                    className="form-control border-start-0 ps-0 text-end text-success fw-bold fs-5 bg-white" 
                    value={formatCurrency(discount)} 
                    onChange={e => {
                      const rawValue = e.target.value.replace(/\D/g, '');
                      setDiscount(rawValue);
                    }} 
                    placeholder="0" 
                  />
                </div>
              </div>
              
              <hr className="border-primary border-opacity-50 my-0 mb-4" />
              
              <div className="d-flex justify-content-between align-items-center mb-4">
                <span className="text-primary fw-bold fs-5">KHÁCH CẦN TRẢ:</span>
                <span className="fw-bolder text-danger" style={{ fontSize: '2rem' }}>{formatCurrency(finalValue)} đ</span>
              </div>

              {/* Nút Action */}
              <div className="mt-auto d-flex gap-2">
                <button type="button" className="btn btn-outline-secondary bg-white fw-bold px-4 shadow-sm" onClick={resetForm} title="Làm mới">
                  <RotateCcw size={20} />
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary btn-lg flex-grow-1 shadow fw-bold d-flex justify-content-center align-items-center text-uppercase" 
                  onClick={handleSale}
                  disabled={isLoading || selectedAccessories.length === 0}
                >
                  {isLoading ? (
                    <><span className="spinner-border spinner-border-sm me-2"></span> ĐANG XỬ LÝ...</>
                  ) : (
                    <><CheckCircle size={22} className="me-2"/> HOÀN TẤT ĐƠN HÀNG</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
        
      </div>

      {/* MODAL HOÀN TẤT */}
      {completedOrder && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-success text-white py-3">
                <h5 className="modal-title fw-bold d-flex align-items-center">
                  <CheckCircle className="me-2" size={24} />
                  Xuất Bán Thành Công
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setCompletedOrder(null)}></button>
              </div>
              <div className="modal-body p-4">
                <div className="alert alert-success border-success-subtle bg-success-subtle text-success-emphasis rounded-3 mb-4 d-flex align-items-center">
                  <ShieldCheck size={20} className="me-2 flex-shrink-0"/>
                  <span>Mã đơn <strong>#{completedOrder.orderCode}</strong> đã được lưu. Khách có thể tra cứu bảo hành bằng SĐT <strong>{completedOrder.customerPhone}</strong>.</span>
                </div>

                <div className="p-3 bg-light rounded-3 border mb-4">
                  <div className="row g-3 small">
                    <div className="col-sm-6">
                      <div className="text-muted mb-1">Khách hàng</div>
                      <div className="fw-bold fs-6">{completedOrder.customerName}</div>
                    </div>
                    <div className="col-sm-6">
                      <div className="text-muted mb-1">Số điện thoại</div>
                      <div className="fw-bold fs-6">{completedOrder.customerPhone}</div>
                    </div>
                    <div className="col-sm-6">
                      <div className="text-muted mb-1">Ngày bán</div>
                      <div className="fw-medium">{formatDate(completedOrder.saleDate)}</div>
                    </div>
                    <div className="col-sm-6">
                      <div className="text-muted mb-1">Tổng thanh toán</div>
                      <div className="text-danger fw-bold fs-5">
                        {formatCurrency(completedOrder.finalAmount != null ? completedOrder.finalAmount : completedOrder.totalAmount)} đ
                        {completedOrder.discount > 0 && (
                          <span className="text-success fs-6 ms-2 fw-medium">(Đã giảm: {formatCurrency(completedOrder.discount)} đ)</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <h6 className="fw-bold text-dark mb-3">Chi tiết phụ kiện & Bảo hành:</h6>
                <div className="table-responsive border rounded-3 shadow-sm">
                  <table className="table table-hover mb-0">
                    <thead className="table-light small text-secondary fw-semibold">
                      <tr>
                        <th className="ps-3 py-3">Phụ kiện</th>
                        <th className="text-center py-3">SL</th>
                        <th className="text-center py-3">Bảo hành</th>
                        <th className="text-center py-3">Hạn bảo hành</th>
                      </tr>
                    </thead>
                    <tbody className="align-middle">
                      {completedOrder.items?.map((it, idx) => (
                        <tr key={idx}>
                          <td className="ps-3 py-3">
                            <strong className="text-dark">{it.accessoryName}</strong> 
                            <br/><small className="text-muted">{it.sku}</small>
                          </td>
                          <td className="text-center fw-medium">{it.quantity}</td>
                          <td className="text-center">
                            {it.warrantyPeriod ? (
                              <span className="badge bg-success-subtle text-success border border-success border-opacity-25 px-2 py-1">
                                {it.warrantyPeriod}
                              </span>
                            ) : it.warrantyMonths > 0 ? (
                              <span className="badge bg-success-subtle text-success border border-success border-opacity-25 px-2 py-1">
                                {it.warrantyMonths} Tháng
                              </span>
                            ) : (
                              <span className="badge bg-secondary-subtle text-secondary px-2 py-1">Không BH</span>
                            )}
                          </td>
                          <td className="text-center text-primary fw-bold">
                            {it.warrantyExpiry || '---'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-footer bg-light border-top">
                <button type="button" className="btn btn-outline-secondary fw-medium d-flex align-items-center" onClick={() => window.print()}>
                  <Printer size={18} className="me-2" /> In phiếu
                </button>
                <button type="button" className="btn btn-primary px-4 fw-bold" onClick={() => setCompletedOrder(null)}>
                  Hoàn tất & Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}