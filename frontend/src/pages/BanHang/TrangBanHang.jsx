import { useState, useEffect } from 'react';
import { Search, RotateCcw, Monitor, FileText, CheckCircle, AlertTriangle, PackagePlus, X, User } from 'lucide-react';
import { useToast } from '../../contexts/notification/NguCanhThongBao';
import axiosClient from '../../api/axiosClient';
import { formatCurrency, parseCurrency } from '../../utils/dinh_dang';

// Bỏ import file CSS module cũ
// import styles from './TrangBanHang.module.css'; 

export default function TrangBanHang() {
  const { showToast, confirm } = useToast();
  const [serial, setSerial] = useState('');
  const [scannedMachine, setScannedMachine] = useState(null);
  
  // Form State
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [salesperson, setSalesperson] = useState('');
  const [discount, setDiscount] = useState('');
  const [finalPrice, setFinalPrice] = useState('');
  const [saleRam, setSaleRam] = useState('');
  const [saleSsd, setSaleSsd] = useState('');
  const [customer, setCustomer] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [warrantyOption, setWarrantyOption] = useState('6 tháng');
  const [customWarranty, setCustomWarranty] = useState('');
  const [saleNote, setSaleNote] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [isUpgraded, setIsUpgraded] = useState(false);
  const [defaultRam, setDefaultRam] = useState('');
  const [defaultSsd, setDefaultSsd] = useState('');

  // Phụ kiện
  const [availableAccessories, setAvailableAccessories] = useState([]);
  const [selectedAccessories, setSelectedAccessories] = useState([]);
  const [currentAccQty, setCurrentAccQty] = useState(1);
  const [accSearchTerm, setAccSearchTerm] = useState('');
  const [showAccDropdown, setShowAccDropdown] = useState(false);

  // Fetch accessories
  useEffect(() => {
    const fetchAccessories = async () => {
      try {
        const res = await axiosClient.get('/accessory/available');
        setAvailableAccessories(res.data);
      } catch (err) {
        console.error("Lỗi lấy danh sách phụ kiện:", err);
      }
    };
    fetchAccessories();
  }, []);

  // Lấy RAM/SSD trực tiếp từ dữ liệu Backend trả về (đã flatten qua SalesConfig)
  useEffect(() => {
    if (scannedMachine) {
      setFinalPrice(scannedMachine.salePrice || '');
      setSaleDate(new Date().toISOString().slice(0, 16));
      setDiscount('0');
      
      const parsedRam = scannedMachine.ram || '';
      const parsedSsd = scannedMachine.ssd || '';

      setDefaultRam(parsedRam);
      setDefaultSsd(parsedSsd);
      setSaleRam(parsedRam);
      setSaleSsd(parsedSsd);
      setIsUpgraded(false);
    }
  }, [scannedMachine]);

  const handleLookup = async (e) => {
    e.preventDefault();
    if (!serial.trim()) return;

    setIsLoading(true);
    setScannedMachine(null);
    try {
      const res = await axiosClient.post('/sale/lookup', { serial });
      setScannedMachine(res.data);
    } catch (err) {
      showToast(err.userMessage || err.message || 'Lỗi tra cứu serial', 'danger');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSale = async () => {
    if (!scannedMachine) return;
    if (scannedMachine.state !== 'READY') return;

    if (!customer.trim() || !customerPhone.trim()) {
      showToast('Vui lòng nhập đầy đủ thông tin Khách hàng và Số điện thoại', 'danger');
      return;
    }

    const isConfirmed = await confirm(`Xác nhận bán máy ${scannedMachine.serialKey}?`);
    if (!isConfirmed) return;

    setIsLoading(true);
    try {
      const generateUUID = () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
          return crypto.randomUUID();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };
      const requestId = generateUUID();

      await axiosClient.post('/sale/submit', {
        serial: scannedMachine.serialKey,
        finalPrice: parseCurrency(finalPrice),
        salesperson,
        saleDate,
        discount: parseCurrency(discount) || 0,
        saleRam,
        saleSsd,
        customerName: customer,
        customerPhone,
        warrantyPeriod: warrantyOption === 'Khác' ? customWarranty : warrantyOption,
        saleNote,
        accessories: selectedAccessories
      }, {
        headers: {
          'X-Request-Id': requestId
        }
      });
      showToast('Giao dịch bán thành công!', 'success');
      
      // Reset everything
      resetForm();
    } catch (err) {
      showToast(err.userMessage || err.message || 'Lỗi xử lý giao dịch bán', 'danger');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setScannedMachine(null);
    setSerial('');
    setFinalPrice('');
    setSalesperson('');
    setDiscount('');
    setCustomer('');
    setCustomerPhone('');
    setWarrantyOption('6 tháng');
    setCustomWarranty('');
    setSaleNote('');
    setSaleRam('');
    setSaleSsd('');
    setIsUpgraded(false);
    setDefaultRam('');
    setDefaultSsd('');
    setSelectedAccessories([]);
    setAccSearchTerm('');
    setShowAccDropdown(false);
    setCurrentAccQty(1);
  };

  const isReady = scannedMachine?.state === 'READY';
  const waitDays = scannedMachine?.intakeAt ? Math.floor((new Date() - new Date(scannedMachine.intakeAt)) / (1000 * 60 * 60 * 24)) : 0;

  return (
    <div className="container-fluid py-4 bg-light min-vh-100">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="m-0 fw-bold text-dark"><Monitor className="me-2" size={28}/> Bán Hàng</h2>
      </div>

      {/* 1. Search Section */}
      <div className="card shadow-sm mb-4 border-0">
        <div className="card-body p-4">
          <div className="mb-3">
            <h5 className="card-title fw-bold text-primary mb-1">1. Quét hoặc nhập Serial</h5>
            <small className="text-muted">Hệ thống chỉ cho phép tạo giao dịch với các máy đang ở trạng thái <span className="fw-bold text-success">SẴN SÀNG BÁN</span>.</small>
          </div>
          <form onSubmit={handleLookup} className="d-flex gap-3 align-items-center">
            <div className="flex-grow-1 position-relative">
              <Search className="position-absolute top-50 translate-middle-y text-muted ms-3" size={20} />
              <input 
                type="text" 
                className="form-control form-control-lg ps-5" 
                placeholder="Ví dụ: LENOVO-T480-12345..." 
                value={serial}
                onChange={e => setSerial(e.target.value)}
                disabled={isLoading || scannedMachine}
                autoFocus
              />
            </div>
            <button type="submit" className="btn btn-primary btn-lg px-4 d-flex align-items-center" disabled={isLoading || scannedMachine || !serial}>
              {isLoading ? (
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              ) : (
                <Search size={20} className="me-2" />
              )}
              Tra cứu
            </button>
          </form>
        </div>
      </div>

      {scannedMachine ? (
        <div className="row g-4">
          {/* Left Panel: Thông tin máy */}
          <div className="col-xl-4 col-lg-5 col-md-12 mb-4 mb-lg-0">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-header bg-white border-bottom py-3">
                <h5 className="card-title fw-bold m-0 d-flex align-items-center">
                  <Monitor className="me-2 text-primary" size={20}/>
                  Máy đã nhận diện
                </h5>
              </div>
              <div className="card-body p-4">
                <div className="mb-4">
                  <h5 className="fw-bold text-dark mb-2">{scannedMachine.sourceModelText || 'Không rõ dòng máy'}</h5>
                  <span className={`badge rounded-pill px-3 py-2 ${isReady ? 'bg-success' : 'bg-warning text-dark'}`}>
                    {isReady ? <><CheckCircle size={14} className="me-1"/> SẴN SÀNG BÁN</> : <><AlertTriangle size={14} className="me-1"/> CẦN KIỂM TRA</>}
                  </span>
                </div>
                
                <div className="alert alert-secondary py-2 px-3 mb-4 rounded-3 border-0">
                  <strong>Cấu hình:</strong> {scannedMachine.configId || 'Chưa cấu hình'}
                </div>

                <div className="table-responsive">
                  <table className="table table-borderless table-sm">
                    <tbody>
                      <tr className="border-bottom">
                        <td className="text-muted py-2">Serial</td>
                        <td className="fw-bold py-2 text-end">{scannedMachine.serialKey}</td>
                      </tr>
                      <tr className="border-bottom">
                        <td className="text-muted py-2">Vòng tồn đang mở</td>
                        <td className="fw-bold py-2 text-end">{scannedMachine.cycleId}</td>
                      </tr>
                      <tr className="border-bottom">
                        <td className="text-muted py-2">Giá niêm yết</td>
                        <td className="fw-bold text-primary py-2 text-end">
                          {scannedMachine.salePrice ? formatCurrency(scannedMachine.salePrice) : 'Chưa có giá'}
                        </td>
                      </tr>
                      <tr className="border-bottom">
                        <td className="text-muted py-2">Ngày nhập</td>
                        <td className="fw-bold py-2 text-end">{new Date(scannedMachine.intakeAt).toLocaleString('vi-VN')}</td>
                      </tr>
                      <tr>
                        <td className="text-muted py-2">Số ngày tồn</td>
                        <td className="fw-bold text-danger py-2 text-end">{waitDays} ngày</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {!isReady && (
                  <div className="alert alert-danger mt-3 d-flex align-items-center border-0">
                    <AlertTriangle size={20} className="me-2"/>
                    Máy không ở trạng thái "Sẵn sàng bán", không thể tạo giao dịch.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel: Form bán hàng */}
          <div className="col-xl-8 col-lg-7 col-md-12">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-header bg-white border-bottom py-3">
                <h5 className="card-title fw-bold m-0 d-flex align-items-center">
                  <FileText className="me-2 text-primary" size={20}/>
                  2. Thông tin giao dịch
                </h5>
              </div>
              <div className="card-body p-4">
                <div className="alert alert-info border-0 rounded-3 mb-4 py-2">
                  <small>Cấu hình tại thời điểm bán được lưu riêng, không làm thay đổi thông số gốc của máy.</small>
                </div>

                <div className="row g-3">
                  {/* Dòng 1 */}
                  <div className="col-md-6">
                    <label className="form-label text-muted fw-semibold">Serial <span className="text-danger">*</span></label>
                    <input className="form-control bg-light" value={scannedMachine.serialKey} disabled />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label text-muted fw-semibold">Ngày bán <span className="text-danger">*</span></label>
                    <input type="datetime-local" className="form-control" value={saleDate} onChange={e => setSaleDate(e.target.value)} />
                  </div>

                  {/* Dòng 2 */}
                  <div className="col-md-6">
                    <label className="form-label text-muted fw-semibold">Nhân viên bán</label>
                    <input className="form-control" value={salesperson} onChange={e => setSalesperson(e.target.value)} placeholder="Tên nhân viên..." />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label text-muted fw-semibold">Giá niêm yết</label>
                    <input className="form-control bg-light" value={scannedMachine.salePrice ? formatCurrency(scannedMachine.salePrice) : 'Chưa có giá'} disabled />
                  </div>

                  {/* Dòng 3 */}
                  <div className="col-md-6">
                    <label className="form-label text-muted fw-semibold">Giảm giá</label>
                    <input className="form-control text-success fw-bold" value={formatCurrency(discount)} onChange={e => setDiscount(e.target.value)} placeholder="0 đ"/>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label text-muted fw-semibold">Giá chốt cuối cùng <span className="text-danger">*</span></label>
                    <input className="form-control text-primary fw-bold form-control-lg" value={formatCurrency(finalPrice)} onChange={e => setFinalPrice(e.target.value)} />
                  </div>

                  {/* Phần nâng cấp cấu hình */}
                  <div className="col-12 mt-4">
                    <div className="card border border-primary-subtle bg-light">
                      <div className="card-body py-3">
                        <div className="form-check form-switch mb-3">
                          <input 
                            className="form-check-input" 
                            type="checkbox" 
                            role="switch" 
                            id="upgradeSwitch" 
                            checked={isUpgraded} 
                            onChange={e => {
                              const checked = e.target.checked;
                              setIsUpgraded(checked);
                              if (!checked) {
                                setSaleRam(defaultRam);
                                setSaleSsd(defaultSsd);
                              }
                            }} 
                            style={{ cursor: 'pointer' }}
                          />
                          <label className="form-check-label fw-bold text-primary ms-2" htmlFor="upgradeSwitch" style={{ cursor: 'pointer' }}>
                            Khách có yêu cầu nâng cấp / thay đổi cấu hình
                          </label>
                        </div>
                        <div className="row g-3">
                          <div className="col-md-6">
                            <label className="form-label text-muted fw-semibold small">RAM giao cho khách</label>
                            <input className="form-control" value={saleRam} onChange={e => setSaleRam(e.target.value)} placeholder="VD: 16GB" disabled={!isUpgraded} />
                          </div>
                          <div className="col-md-6">
                            <label className="form-label text-muted fw-semibold small">SSD giao cho khách</label>
                            <input className="form-control" value={saleSsd} onChange={e => setSaleSsd(e.target.value)} placeholder="VD: 512GB" disabled={!isUpgraded} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dòng Thông tin khách hàng */}
                  <div className="col-md-6 mt-4">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <label className="form-label text-muted fw-semibold mb-0">Khách hàng <span className="text-danger">*</span></label>
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
                    <input className="form-control" value={customer} onChange={e => setCustomer(e.target.value)} placeholder="Tên khách hàng..." />
                  </div>
                  <div className="col-md-6 mt-4">
                    <label className="form-label text-muted fw-semibold">Số điện thoại <span className="text-danger">*</span></label>
                    <input className="form-control" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="Số điện thoại..." />
                  </div>

                  {/* Bảo hành */}
                  <div className="col-md-6 mt-4">
                    <label className="form-label text-muted fw-semibold">Thời gian bảo hành <span className="text-danger">*</span></label>
                    <select className="form-select" value={warrantyOption} onChange={e => setWarrantyOption(e.target.value)}>
                      <option value="3 tháng">3 tháng</option>
                      <option value="6 tháng">6 tháng</option>
                      <option value="12 tháng">12 tháng</option>
                      <option value="Khác">Khác (Tự nhập)</option>
                    </select>
                  </div>
                  <div className="col-md-6 mt-4">
                    {warrantyOption === 'Khác' && (
                      <>
                        <label className="form-label text-muted fw-semibold">Nhập thời gian bảo hành <span className="text-danger">*</span></label>
                        <input className="form-control" value={customWarranty} onChange={e => setCustomWarranty(e.target.value)} placeholder="VD: Bảo hành hãng 24 tháng..." />
                      </>
                    )}
                  </div>

                  {/* Ghi chú */}
                  <div className="col-12 mt-2">
                    <label className="form-label text-muted fw-semibold">Ghi chú</label>
                    <textarea className="form-control" rows="2" value={saleNote} onChange={e => setSaleNote(e.target.value)} placeholder="Ghi chú thêm về quà tặng, bảo hành... (Không bắt buộc)"></textarea>
                  </div>

                  {/* Phụ kiện bán kèm */}
                  <div className="col-12 mt-4">
                    <div className="card border border-info-subtle bg-light">
                      <div className="card-body py-3">
                        <label className="form-label fw-bold text-info-emphasis d-flex align-items-center mb-3">
                          <PackagePlus size={18} className="me-2" /> Phụ kiện bán kèm
                        </label>
                        <div className="border bg-white rounded p-2 d-flex flex-wrap gap-2 align-items-center" style={{ minHeight: '42px' }}>
                          {selectedAccessories.map((sa) => (
                            <span key={sa.sku} className="badge bg-white text-dark border border-secondary-subtle d-flex align-items-center px-2 py-1 shadow-sm" style={{ fontSize: '14px', fontWeight: 'normal' }}>
                              <button 
                                type="button" 
                                className="btn btn-link p-0 text-muted me-1 d-flex align-items-center text-decoration-none" 
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
                              {sa.name} {sa.quantity > 1 ? <span className="ms-1 text-primary fw-bold">(x{sa.quantity})</span> : ''}
                            </span>
                          ))}
                          <div className="position-relative flex-grow-1" style={{ minWidth: '200px' }}>
                            <input
                              type="text"
                              className="form-control border-0 shadow-none bg-transparent p-0 px-2"
                              placeholder="Nhập tên phụ kiện để tìm..."
                              value={accSearchTerm}
                              onChange={e => {
                                setAccSearchTerm(e.target.value);
                                setShowAccDropdown(true);
                              }}
                              onFocus={() => setShowAccDropdown(true)}
                              onBlur={() => setTimeout(() => setShowAccDropdown(false), 200)}
                            />
                            {showAccDropdown && (
                              <ul className="dropdown-menu show w-100 position-absolute shadow-sm" style={{ top: '100%', left: 0, maxHeight: '250px', overflowY: 'auto', zIndex: 1000 }}>
                                {availableAccessories.filter(a => a.name.toLowerCase().includes(accSearchTerm.toLowerCase()) || a.sku.toLowerCase().includes(accSearchTerm.toLowerCase())).map(acc => (
                                  <li key={acc.sku}>
                                    <button
                                      type="button"
                                      className="dropdown-item d-flex justify-content-between align-items-center py-2"
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
                                          setSelectedAccessories([...selectedAccessories, { sku: acc.sku, name: acc.name, quantity: 1 }]);
                                        }
                                        
                                        setAccSearchTerm('');
                                        setShowAccDropdown(false);
                                      }}
                                    >
                                      <span>{acc.name}</span>
                                      <small className="text-muted ms-2">
                                        Tồn: {acc.quantity} {acc.price ? `- ${formatCurrency(acc.price)}đ` : ''}
                                      </small>
                                    </button>
                                  </li>
                                ))}
                                {availableAccessories.filter(a => a.name.toLowerCase().includes(accSearchTerm.toLowerCase()) || a.sku.toLowerCase().includes(accSearchTerm.toLowerCase())).length === 0 && (
                                  <li><span className="dropdown-item text-muted text-center py-2">Không tìm thấy phụ kiện phù hợp</span></li>
                                )}
                              </ul>
                            )}
                          </div>
                        </div>
                        <div className="form-text mt-2 text-muted">
                          <small>* Hướng dẫn: Chọn phụ kiện từ danh sách để thêm. Chọn nhiều lần cùng một món để tăng số lượng. Bấm <b>X</b> để giảm hoặc xóa phụ kiện.</small>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Footer Buttons */}
              <div className="card-footer bg-white border-top p-4 d-flex justify-content-between align-items-center">
                <button type="button" className="btn btn-outline-secondary d-flex align-items-center px-4" onClick={resetForm}>
                  <RotateCcw size={18} className="me-2" /> Chọn máy khác
                </button>
                
                <div className="text-end">
                  <small className="text-muted d-block mb-2">Transaction ID sẽ được tạo tự động</small>
                  <button 
                    type="button" 
                    className="btn btn-primary btn-lg px-5 shadow-sm fw-bold" 
                    onClick={handleSale}
                    disabled={!isReady || isLoading}
                  >
                    {isLoading ? (
                      <><span className="spinner-border spinner-border-sm me-2"></span> Đang xử lý...</>
                    ) : (
                      'Xác nhận bán máy'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        !isLoading && (
          <div className="card shadow-sm border-0">
            <div className="card-body text-center py-5">
              <div className="bg-light rounded-circle d-inline-flex p-4 mb-3">
                <RotateCcw size={48} className="text-secondary opacity-50" />
              </div>
              <h4 className="fw-bold text-dark">Chưa chọn máy</h4>
              <p className="text-muted mb-0">Vui lòng quét hoặc nhập Serial máy ở khung bên trên để bắt đầu giao dịch</p>
            </div>
          </div>
        )
      )}
    </div>
  );
}