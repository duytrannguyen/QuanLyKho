import { useState, useEffect } from 'react';
import { Search, RotateCcw, Monitor, FileText, CheckCircle, AlertTriangle, PackagePlus, User, Gift, Tag, Trash2, Plus, Minus, Info } from 'lucide-react';
import { useToast } from '../../contexts/notification/NguCanhThongBao';
import axiosClient from '../../api/axiosClient';
import { formatCurrency, parseCurrency, formatDate, getTodayDateString, tinhNgayHetHanBaoHanh } from '../../utils/dinh_dang';

// ==========================================
// 1. SUB-COMPONENTS
// ==========================================

// --- Component: Khu vực Tìm kiếm Serial ---
const SearchSection = ({ serial, setSerial, onSearch, isLoading, hasMachine }) => (
  <div className="card shadow-sm mb-4 border-0">
    <div className="card-body p-4">
      <div className="mb-3">
        <h5 className="card-title fw-bold text-primary mb-1">1. Quét hoặc nhập Serial</h5>
        <small className="text-muted">Hệ thống chỉ cho phép tạo giao dịch với các máy đang ở trạng thái <span className="fw-bold text-success">SẴN SÀNG BÁN</span>.</small>
      </div>
      <form onSubmit={onSearch} className="d-flex gap-3 align-items-center">
        <div className="flex-grow-1 position-relative">
          <Search className="position-absolute top-50 translate-middle-y text-muted ms-3" size={20} />
          <input 
            type="text" 
            className="form-control form-control-lg ps-5" 
            placeholder="Ví dụ: LENOVO-T480-12345..." 
            value={serial}
            onChange={e => setSerial(e.target.value)}
            disabled={isLoading || hasMachine}
            autoFocus
          />
        </div>
        <button type="submit" className="btn btn-primary btn-lg px-4 d-flex align-items-center" disabled={isLoading || hasMachine || !serial}>
          {isLoading ? <span className="spinner-border spinner-border-sm me-2" /> : <Search size={20} className="me-2" />}
          Tra cứu
        </button>
      </form>
    </div>
  </div>
);

// --- Component: Thông tin máy đã quét (Panel Trái) ---
const MachineInfoPanel = ({ machine }) => {
  const isReady = machine?.state === 'READY';
  const waitDays = machine?.intakeAt ? Math.floor((new Date() - new Date(machine.intakeAt)) / (1000 * 60 * 60 * 24)) : 0;

  return (
    <div className="card shadow-sm border-0 h-100">
      <div className="card-header bg-white border-bottom py-3">
        <h5 className="card-title fw-bold m-0 d-flex align-items-center">
          <Monitor className="me-2 text-primary" size={20}/>
          Máy đã nhận diện
        </h5>
      </div>
      <div className="card-body p-4">
        <div className="mb-4">
          <h5 className="fw-bold text-dark mb-2">{machine.sourceModelText || 'Không rõ dòng máy'}</h5>
          <span className={`badge rounded-pill px-3 py-2 ${isReady ? 'bg-success' : 'bg-warning text-dark'}`}>
            {isReady ? <><CheckCircle size={14} className="me-1"/> SẴN SÀNG BÁN</> : <><AlertTriangle size={14} className="me-1"/> CẦN KIỂM TRA</>}
          </span>
        </div>
        
        <div className="alert alert-secondary py-2 px-3 mb-4 rounded-3 border-0">
          <strong>Cấu hình:</strong> {machine.configId || 'Chưa cấu hình'}
        </div>

        <div className="table-responsive">
          <table className="table table-borderless table-sm">
            <tbody>
              <tr className="border-bottom">
                <td className="text-muted py-2">Serial</td>
                <td className="fw-bold py-2 text-end">{machine.serialKey}</td>
              </tr>
              <tr className="border-bottom">
                <td className="text-muted py-2">Vòng tồn đang mở</td>
                <td className="fw-bold py-2 text-end">{machine.cycleId}</td>
              </tr>
              <tr className="border-bottom">
                <td className="text-muted py-2">Giá niêm yết</td>
                <td className="fw-bold text-primary py-2 text-end">{machine.salePrice ? formatCurrency(machine.salePrice) : 'Chưa có giá'}</td>
              </tr>
              <tr className="border-bottom">
                <td className="text-muted py-2">Ngày nhập</td>
                <td className="fw-bold py-2 text-end">{formatDate(machine.intakeAt)}</td>
              </tr>
              <tr className="border-bottom">
                <td className="text-muted py-2">Gói bảo hành gán cho máy</td>
                <td className="fw-bold text-primary py-2 text-end">
                  {machine.warrantyPeriod || 'Chưa gán gói'}
                  {machine.warrantyExpiry ? (
                    <div className="small text-success fw-semibold" style={{ fontSize: '11px' }}>
                      Hạn hãng: {formatDate(machine.warrantyExpiry)}
                    </div>
                  ) : (
                    <div className="small text-muted fw-normal" style={{ fontSize: '11px' }}>
                      * Bắt đầu tính từ ngày bán
                    </div>
                  )}
                </td>
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
  );
};


// ==========================================
// 2. COMPONENT CHÍNH
// ==========================================
export default function TrangBanHang() {
  const { showToast, confirm } = useToast();
  
  // State: Tìm kiếm máy
  const [serial, setSerial] = useState('');
  const [scannedMachine, setScannedMachine] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // State: Form Thông tin bán hàng
  const [formData, setFormData] = useState({
    saleDate: getTodayDateString(),
    salesperson: '',
    discount: '',
    finalPrice: '',
    saleRam: '',
    saleSsd: '',
    customer: '',
    customerPhone: '',
    warrantyOption: 'BH phần cứng 6 tháng',
    warrantyExpiry: '',
    customWarranty: '',
    saleNote: '',
    lastSource: 'Khách vãng lai / Trực tiếp',
    customerType: 'Khách mua lần đầu',
    isStudent: 'Không',
  });

  const [isUpgraded, setIsUpgraded] = useState(false);
  const [defaultSpecs, setDefaultSpecs] = useState({ ram: '', ssd: '' });

  // State: Phụ kiện
  const [availableAccessories, setAvailableAccessories] = useState([]);
  const [selectedAccessories, setSelectedAccessories] = useState([]);
  const [accSearchTerm, setAccSearchTerm] = useState('');
  const [showAccDropdown, setShowAccDropdown] = useState(false);

  // Computed Values (Tính toán)
  const isReady = scannedMachine?.state === 'READY';
  const giftAccessories = selectedAccessories.filter(a => a.isGift);
  const paidAccessories = selectedAccessories.filter(a => !a.isGift);
  const totalPaidAccAmount = paidAccessories.reduce((sum, item) => sum + ((Number(item.price) || 0) * (Number(item.quantity) || 1)), 0);
  
  const machinePriceNum = parseCurrency(formData.finalPrice) || 0;
  const discountNum = parseCurrency(formData.discount) || 0;
  const grandTotal = Math.max(0, machinePriceNum - discountNum) + totalPaidAccAmount;

  // Effects
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

  useEffect(() => {
    if (scannedMachine) {
      const parsedRam = scannedMachine.ram || '';
      const parsedSsd = scannedMachine.ssd || '';
      
      setDefaultSpecs({ ram: parsedRam, ssd: parsedSsd });
      
      const validPresets = [
        'BH phần cứng 3 tháng',
        'BH phần cứng 6 tháng',
        'BH phần cứng 9 tháng',
        'BH phần cứng 12 tháng',
        'Bảo hành hãng',
        'Không BH'
      ];
      let prefillWarrantyOpt = 'BH phần cứng 6 tháng';
      let prefillCustomWarranty = '';
      let prefillWarrantyExpiry = scannedMachine.warrantyExpiry ? scannedMachine.warrantyExpiry.substring(0, 10) : '';

      if (scannedMachine.warrantyExpiry || (scannedMachine.warrantyPeriod && scannedMachine.warrantyPeriod.toLowerCase().includes('hãng'))) {
        prefillWarrantyOpt = 'Bảo hành hãng';
      } else if (scannedMachine.warrantyPeriod) {
        const wp = scannedMachine.warrantyPeriod.trim();
        const matched = validPresets.find(p => p.toLowerCase() === wp.toLowerCase());
        if (matched) {
          prefillWarrantyOpt = matched;
        } else {
          prefillWarrantyOpt = 'Khác';
          prefillCustomWarranty = wp;
        }
      }

      setFormData(prev => ({
        ...prev,
        finalPrice: scannedMachine.salePrice || '',
        saleDate: getTodayDateString(),
        discount: '0',
        saleRam: parsedRam,
        saleSsd: parsedSsd,
        warrantyOption: prefillWarrantyOpt,
        warrantyExpiry: prefillWarrantyExpiry,
        customWarranty: prefillCustomWarranty,
      }));
      setIsUpgraded(false);
    }
  }, [scannedMachine]);

  // Handlers: Form Changes
  const handleFormChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  // Handlers: Phụ kiện
  const handleSelectAccessory = (acc) => {
    if (acc.quantity <= 0) return;
    
    const existing = selectedAccessories.find(sa => sa.sku === acc.sku);
    if (existing) {
      if (existing.quantity + 1 > acc.quantity) {
        return showToast(`Số lượng không được vượt quá tồn kho (${acc.quantity})`, 'warning');
      }
      setSelectedAccessories(selectedAccessories.map(sa => sa.sku === acc.sku ? { ...sa, quantity: sa.quantity + 1 } : sa));
    } else {
      setSelectedAccessories([...selectedAccessories, { 
        sku: acc.sku, name: acc.name, quantity: 1, price: acc.price || 0, isGift: true 
      }]);
    }
    setAccSearchTerm('');
    setShowAccDropdown(false);
  };

  const handleUpdateAccessory = (sku, key, value) => {
    setSelectedAccessories(prev => prev.map(item => {
      if (item.sku === sku) {
        if (key === 'toggleType') return { ...item, isGift: !item.isGift };
        if (key === 'qty') {
          const maxQty = availableAccessories.find(a => a.sku === sku)?.quantity || 999;
          const newQty = item.quantity + value;
          if (newQty > maxQty) {
            showToast(`Số lượng không được vượt quá tồn kho (${maxQty})`, 'warning');
            return item;
          }
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        if (key === 'price') return { ...item, price: parseCurrency(value) || 0 };
      }
      return item;
    }).filter(Boolean));
  };

  const handleRemoveAccessory = (sku) => setSelectedAccessories(prev => prev.filter(item => item.sku !== sku));

  // Handlers: Actions
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

  const resetForm = () => {
    setScannedMachine(null);
    setSerial('');
    setIsUpgraded(false);
    setSelectedAccessories([]);
    setFormData({
      saleDate: getTodayDateString(), salesperson: '', discount: '', finalPrice: '', saleRam: '', saleSsd: '',
      customer: '', customerPhone: '', warrantyOption: 'BH phần cứng 6 tháng', warrantyExpiry: '', customWarranty: '', saleNote: '',
      lastSource: 'Khách vãng lai / Trực tiếp', customerType: 'Khách mua lần đầu', isStudent: 'Không',
    });
  };

  const handleSale = async () => {
    if (!isReady || !formData.customer.trim() || !formData.customerPhone.trim()) {
      showToast('Vui lòng nhập đầy đủ thông tin Khách hàng và Số điện thoại', 'danger');
      return;
    }

    const giftCount = giftAccessories.reduce((sum, a) => sum + a.quantity, 0);
    const paidCount = paidAccessories.reduce((sum, a) => sum + a.quantity, 0);

    let confirmMsg = `Xác nhận bán máy ${scannedMachine.serialKey}?\n` +
      `• Giá máy: ${formatCurrency(formData.finalPrice)}đ\n` +
      `• Giảm giá máy: ${formatCurrency(formData.discount || 0)}đ\n`;
    if (giftCount > 0) confirmMsg += `• Quà tặng mặc định: ${giftCount} món (0đ)\n`;
    if (paidCount > 0) confirmMsg += `• Phụ kiện bán thêm: ${paidCount} món (+${formatCurrency(totalPaidAccAmount)}đ)\n`;
    confirmMsg += `=> Tổng thanh toán: ${formatCurrency(grandTotal)}đ`;

    if (!(await confirm(confirmMsg))) return;

    setIsLoading(true);
    try {
      const requestId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(); // Thay the ham uuid phuc tap
      await axiosClient.post('/sale/submit', {
        serial: scannedMachine.serialKey,
        finalPrice: parseCurrency(formData.finalPrice),
        salesperson: formData.salesperson,
        saleDate: formData.saleDate,
        discount: parseCurrency(formData.discount) || 0,
        saleRam: formData.saleRam,
        saleSsd: formData.saleSsd,
        customerName: formData.customer,
        customerPhone: formData.customerPhone,
        warrantyPeriod: formData.warrantyOption === 'Bảo hành hãng'
          ? 'Bảo hành hãng'
          : formData.warrantyOption === 'Khác' 
            ? formData.customWarranty 
            : formData.warrantyOption,
        warrantyExpiry: formData.warrantyOption === 'Bảo hành hãng'
          ? (formData.warrantyExpiry || null)
          : (tinhNgayHetHanBaoHanh(formData.saleDate, formData.warrantyOption === 'Khác' ? formData.customWarranty : formData.warrantyOption) || null),
        saleNote: formData.saleNote,
        lastSource: formData.lastSource,
        customerType: formData.customerType,
        isStudent: formData.isStudent,
        accessories: selectedAccessories.map(sa => ({
          sku: sa.sku, name: sa.name, quantity: sa.quantity, isGift: sa.isGift !== false, price: sa.isGift ? 0 : (Number(sa.price) || 0)
        }))
      }, { headers: { 'X-Request-Id': requestId } });
      
      showToast('Giao dịch bán thành công!', 'success');
      resetForm();
    } catch (err) {
      showToast(err.userMessage || err.message || 'Lỗi xử lý giao dịch bán', 'danger');
    } finally {
      setIsLoading(false);
    }
  };

  // Render
  return (
    <div className="container-fluid py-4 bg-light min-vh-100">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="m-0 fw-bold text-dark"><Monitor className="me-2" size={28}/> Bán Hàng</h2>
      </div>

      <SearchSection serial={serial} setSerial={setSerial} onSearch={handleLookup} isLoading={isLoading} hasMachine={!!scannedMachine} />

      {scannedMachine ? (
        <div className="row g-4">
          <div className="col-xl-4 col-lg-5 col-md-12 mb-4 mb-lg-0">
            <MachineInfoPanel machine={scannedMachine} />
          </div>

          <div className="col-xl-8 col-lg-7 col-md-12">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-header bg-white border-bottom py-3">
                <h5 className="card-title fw-bold m-0 d-flex align-items-center"><FileText className="me-2 text-primary" size={20}/>2. Thông tin giao dịch</h5>
              </div>
              
              <div className="card-body p-4">
                <div className="row g-3">
                  {/* --- Block: Giá & Ngày bán --- */}
                  <div className="col-md-6">
                    <label className="form-label text-muted fw-semibold">Ngày bán <span className="text-danger">*</span></label>
                    <input type="date" className="form-control" value={formData.saleDate} onChange={e => handleFormChange('saleDate', e.target.value)} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label text-muted fw-semibold">Nhân viên bán</label>
                    <input className="form-control" value={formData.salesperson} onChange={e => handleFormChange('salesperson', e.target.value)} placeholder="Tên nhân viên..." />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label text-muted fw-semibold">Giảm giá</label>
                    <input className="form-control text-success fw-bold" value={formatCurrency(formData.discount)} onChange={e => handleFormChange('discount', e.target.value)} placeholder="0 đ"/>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label text-muted fw-semibold">Giá chốt cuối cùng <span className="text-danger">*</span></label>
                    <input className="form-control text-primary fw-bold form-control-lg" value={formatCurrency(formData.finalPrice)} onChange={e => handleFormChange('finalPrice', e.target.value)} />
                  </div>

                  {/* --- Block: Nâng cấp cấu hình --- */}
                  <div className="col-12 mt-4">
                    <div className="card border border-primary-subtle bg-light">
                      <div className="card-body py-3">
                        <div className="form-check form-switch mb-3">
                          <input className="form-check-input" type="checkbox" role="switch" id="upgradeSwitch" checked={isUpgraded} onChange={e => {
                            setIsUpgraded(e.target.checked);
                            if (!e.target.checked) handleFormChange('saleRam', defaultSpecs.ram); handleFormChange('saleSsd', defaultSpecs.ssd);
                          }} style={{ cursor: 'pointer' }} />
                          <label className="form-check-label fw-bold text-primary ms-2" htmlFor="upgradeSwitch" style={{ cursor: 'pointer' }}>Khách có yêu cầu nâng cấp / thay đổi cấu hình</label>
                        </div>
                        <div className="row g-3">
                          <div className="col-md-6">
                            <label className="form-label text-muted fw-semibold small">RAM giao cho khách</label>
                            <input className="form-control" value={formData.saleRam} onChange={e => handleFormChange('saleRam', e.target.value)} disabled={!isUpgraded} />
                          </div>
                          <div className="col-md-6">
                            <label className="form-label text-muted fw-semibold small">SSD giao cho khách</label>
                            <input className="form-control" value={formData.saleSsd} onChange={e => handleFormChange('saleSsd', e.target.value)} disabled={!isUpgraded} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* --- Block: Thông tin Khách hàng --- */}
                  <div className="col-md-6 mt-4">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <label className="form-label text-muted fw-semibold mb-0">Khách hàng <span className="text-danger">*</span></label>
                      <button type="button" className="btn btn-sm btn-outline-primary py-0 px-2" style={{ fontSize: '0.75rem' }} onClick={() => {
                        const timestamp = Date.now().toString().slice(-6);
                        handleFormChange('customer', `Khách vãng lai ${timestamp}`);
                        handleFormChange('customerPhone', `0999${timestamp}`);
                      }}>
                        <User size={12} className="me-1"/> Khách vãng lai
                      </button>
                    </div>
                    <input className="form-control" value={formData.customer} onChange={e => handleFormChange('customer', e.target.value)} placeholder="Tên khách hàng..." />
                  </div>
                  <div className="col-md-6 mt-4">
                    <label className="form-label text-muted fw-semibold">Số điện thoại <span className="text-danger">*</span></label>
                    <input className="form-control" value={formData.customerPhone} onChange={e => handleFormChange('customerPhone', e.target.value)} placeholder="Số điện thoại..." />
                  </div>

                  {/* --- Block: Bảo hành & Phân loại --- */}
                  <div className="col-md-6 mt-4">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <label className="form-label text-muted fw-semibold mb-0">Thời gian bảo hành bán <span className="text-danger">*</span></label>
                      {formData.warrantyOption !== 'Bảo hành hãng' && tinhNgayHetHanBaoHanh(formData.saleDate, formData.warrantyOption === 'Khác' ? formData.customWarranty : formData.warrantyOption) && (
                        <span className="badge bg-success-subtle text-success border border-success-subtle" style={{ fontSize: '0.72rem' }}>
                          Đến {formatDate(tinhNgayHetHanBaoHanh(formData.saleDate, formData.warrantyOption === 'Khác' ? formData.customWarranty : formData.warrantyOption))}
                        </span>
                      )}
                    </div>
                    <select className="form-select" value={formData.warrantyOption} onChange={e => handleFormChange('warrantyOption', e.target.value)}>
                      <option value="BH phần cứng 3 tháng">BH phần cứng 3 tháng</option>
                      <option value="BH phần cứng 6 tháng">BH phần cứng 6 tháng</option>
                      <option value="BH phần cứng 9 tháng">BH phần cứng 9 tháng</option>
                      <option value="BH phần cứng 12 tháng">BH phần cứng 12 tháng</option>
                      <option value="Bảo hành hãng">Bảo hành hãng</option>
                      <option value="Không BH">Không BH</option>
                      <option value="Khác">Khác (Tự nhập)</option>
                    </select>
                    {scannedMachine?.warrantyPeriod && (
                      <small className="text-primary d-block mt-1" style={{ fontSize: '0.78rem' }}>
                        * Gói cửa hàng gán sẵn cho máy: <strong>{scannedMachine.warrantyPeriod}</strong>
                        {scannedMachine.warrantyExpiry && ` (Hạn hãng: ${formatDate(scannedMachine.warrantyExpiry)})`}
                      </small>
                    )}
                  </div>
                  <div className="col-md-6 mt-4">
                    {formData.warrantyOption === 'Bảo hành hãng' && (
                      <div className="p-3 bg-primary bg-opacity-10 rounded-3 border border-primary border-opacity-25">
                        <label className="form-label fw-bold text-primary mb-1">
                          Ngày kết thúc bảo hành hãng <span className="text-danger">*</span>
                        </label>
                        <input 
                          type="date" 
                          className="form-control border-primary" 
                          value={formData.warrantyExpiry || ''} 
                          onChange={e => handleFormChange('warrantyExpiry', e.target.value)} 
                        />
                        <div className="text-muted mt-1 small">
                          * Theo tra cứu bảo hành chính hãng (Dell, HP, Lenovo...)
                        </div>
                      </div>
                    )}
                    {formData.warrantyOption === 'Khác' && (
                      <><label className="form-label text-muted fw-semibold">Nhập thời gian bảo hành <span className="text-danger">*</span></label>
                      <input className="form-control" value={formData.customWarranty} onChange={e => handleFormChange('customWarranty', e.target.value)} placeholder="VD: Bảo hành 1 đổi 1 trong 30 ngày..." /></>
                    )}
                  </div>

                  <div className="col-md-4 mt-3">
                    <label className="form-label text-muted fw-semibold small">Nguồn tiếp cận</label>
                    <select className="form-select form-select-sm" value={formData.lastSource} onChange={e => handleFormChange('lastSource', e.target.value)}>
                      <option>Khách vãng lai / Trực tiếp</option><option>TikTok</option><option>Facebook</option><option>Zalo</option><option>Khác</option>
                    </select>
                  </div>
                  <div className="col-md-4 mt-3">
                    <label className="form-label text-muted fw-semibold small">Loại khách hàng</label>
                    <select className="form-select form-select-sm" value={formData.customerType} onChange={e => handleFormChange('customerType', e.target.value)}>
                      <option>Khách mua lần đầu</option><option>Khách cũ quay lại</option><option>Khách sỉ / Đối tác</option>
                    </select>
                  </div>
                  <div className="col-md-4 mt-3">
                    <label className="form-label text-muted fw-semibold small">Học sinh / Sinh viên?</label>
                    <select className="form-select form-select-sm" value={formData.isStudent} onChange={e => handleFormChange('isStudent', e.target.value)}>
                      <option>Không</option><option>Có</option>
                    </select>
                  </div>

                  <div className="col-12 mt-3">
                    <label className="form-label text-muted fw-semibold">Ghi chú</label>
                    <textarea className="form-control" rows="2" value={formData.saleNote} onChange={e => handleFormChange('saleNote', e.target.value)} placeholder="Ghi chú thêm (Không bắt buộc)"></textarea>
                  </div>

                  {/* --- Block: Phụ kiện (Render inline nhưng được refactor gọn) --- */}
                  <div className="col-12 mt-4">
                    <div className="card border border-primary-subtle shadow-xs bg-white rounded-3">
                      <div className="card-header bg-light border-bottom py-3 d-flex justify-content-between align-items-center">
                        <div className="d-flex align-items-center gap-2"><PackagePlus size={20} className="text-primary" /> <span className="fw-bold">Phụ Kiện Kèm Theo Máy</span></div>
                        <div className="d-flex gap-2">
                          {giftAccessories.length > 0 && <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">🎁 Quà: {giftAccessories.reduce((s, a) => s + a.quantity, 0)} (0đ)</span>}
                          {paidAccessories.length > 0 && <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1">🏷️ Bán thêm: +{formatCurrency(totalPaidAccAmount)}đ</span>}
                        </div>
                      </div>

                      <div className="card-body p-3">
                        <div className="position-relative mb-3">
                          <div className="input-group">
                            <span className="input-group-text bg-white border-end-0 text-muted"><Search size={16} /></span>
                            <input type="text" className="form-control border-start-0 ps-0" placeholder="Gõ tên hoặc mã SKU..." value={accSearchTerm} 
                              onChange={e => { setAccSearchTerm(e.target.value); setShowAccDropdown(true); }}
                              onFocus={() => setShowAccDropdown(true)} onBlur={() => setTimeout(() => setShowAccDropdown(false), 250)} />
                          </div>
                          {showAccDropdown && (
                            <ul className="dropdown-menu show w-100 position-absolute shadow-lg border-0 rounded-3 mt-1" style={{ top: '100%', left: 0, maxHeight: '250px', overflowY: 'auto', zIndex: 1050 }}>
                              {availableAccessories.filter(a => a.name.toLowerCase().includes(accSearchTerm.toLowerCase()) || a.sku.toLowerCase().includes(accSearchTerm.toLowerCase())).map(acc => (
                                <li key={acc.sku}>
                                  <button type="button" className="dropdown-item d-flex justify-content-between align-items-center py-2 px-3 border-bottom border-light" disabled={acc.quantity <= 0} onClick={() => handleSelectAccessory(acc)}>
                                    <div><div className="fw-semibold">{acc.name}</div><small className="text-muted">Tồn kho: {acc.quantity}</small></div>
                                    <span className="badge bg-light text-primary border">{acc.price ? `${formatCurrency(acc.price)}đ` : 'Chưa có giá'}</span>
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        {selectedAccessories.length > 0 && (
                          <div className="table-responsive">
                            <table className="table table-sm table-hover align-middle mb-0">
                              <thead className="table-light text-muted small"><tr><th>Phụ kiện</th><th>Phân loại</th><th className="text-end">Đơn giá</th><th className="text-center">SL</th><th className="text-end">Thành tiền</th><th></th></tr></thead>
                              <tbody>
                                {selectedAccessories.map((sa) => (
                                  <tr key={sa.sku} className={sa.isGift ? 'bg-success-subtle bg-opacity-25' : ''}>
                                    <td><div className="fw-semibold text-dark">{sa.name}</div><small className="text-muted">{sa.sku}</small></td>
                                    <td>
                                      <div className="btn-group btn-group-sm w-100">
                                        <button type="button" className={`btn btn-sm py-1 ${sa.isGift ? 'btn-success text-white' : 'btn-outline-secondary'}`} onClick={() => !sa.isGift && handleUpdateAccessory(sa.sku, 'toggleType')}><Gift size={13} className="me-1" /> Quà</button>
                                        <button type="button" className={`btn btn-sm py-1 ${!sa.isGift ? 'btn-primary text-white' : 'btn-outline-secondary'}`} onClick={() => sa.isGift && handleUpdateAccessory(sa.sku, 'toggleType')}><Tag size={13} className="me-1" /> Bán</button>
                                      </div>
                                    </td>
                                    <td className="text-end">{sa.isGift ? <span className="text-success">0đ</span> : <input type="text" className="form-control form-control-sm text-end text-primary" value={formatCurrency(sa.price)} onChange={e => handleUpdateAccessory(sa.sku, 'price', e.target.value)} style={{maxWidth:'100px', marginLeft:'auto'}}/>}</td>
                                    <td className="text-center">
                                      <div className="d-inline-flex gap-1 border rounded px-1"><button type="button" className="btn btn-sm p-0" onClick={() => handleUpdateAccessory(sa.sku, 'qty', -1)}><Minus size={12} /></button><span className="fw-bold px-1">{sa.quantity}</span><button type="button" className="btn btn-sm p-0" onClick={() => handleUpdateAccessory(sa.sku, 'qty', 1)}><Plus size={12} /></button></div>
                                    </td>
                                    <td className="text-end fw-bold">{sa.isGift ? <span className="text-success small">0đ</span> : <span className="text-primary">{formatCurrency(sa.price * sa.quantity)}đ</span>}</td>
                                    <td className="text-center"><button type="button" className="btn btn-sm text-danger p-0" onClick={() => handleRemoveAccessory(sa.sku)}><Trash2 size={15} /></button></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        <div className="mt-3 pt-3 border-top d-flex justify-content-between align-items-center">
                          <small className="text-muted"><Info size={14} className="me-1 text-primary"/> Quà tặng không tính doanh thu</small>
                          <div className="text-end">
                            <div className="text-muted small">Phụ kiện bán thêm: <strong className="text-primary">{formatCurrency(totalPaidAccAmount)}đ</strong></div>
                            <div className="fw-bold fs-5 text-dark">Tổng thu: <span className="text-success">{formatCurrency(grandTotal)}đ</span></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="card-footer bg-white border-top p-4 d-flex justify-content-between align-items-center">
                <button type="button" className="btn btn-outline-secondary d-flex align-items-center px-4" onClick={resetForm}><RotateCcw size={18} className="me-2" /> Chọn máy khác</button>
                <button type="button" className="btn btn-primary btn-lg px-5 shadow-sm fw-bold" onClick={handleSale} disabled={!isReady || isLoading}>
                  {isLoading ? <><span className="spinner-border spinner-border-sm me-2"></span> Đang xử lý...</> : 'Xác nhận bán máy'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        !isLoading && (
          <div className="card shadow-sm border-0"><div className="card-body text-center py-5"><RotateCcw size={48} className="text-secondary opacity-50 mb-3" /><h4 className="fw-bold text-dark">Chưa chọn máy</h4><p className="text-muted">Vui lòng quét hoặc nhập Serial để bắt đầu</p></div></div>
        )
      )}
    </div>
  );
}