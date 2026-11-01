import { useState, useEffect, useRef } from 'react';
import { Search, RotateCcw, Monitor, FileText, CheckCircle, AlertTriangle, PackagePlus, User, Gift, Trash2, Plus, Minus, Info, Settings, RefreshCw, X, DollarSign, ShieldCheck, Cpu, HardDrive } from 'lucide-react';
import { useToast } from '../../contexts/notification/NguCanhThongBao';
import { apiBanHang, apiPhuKien, apiLinhKien, crmApi } from '../../api';
import { formatCurrency, parseCurrency, formatDate, getTodayDateString, tinhNgayHetHanBaoHanh } from '../../utils/dinh_dang';

// ==========================================
// THIẾT LẬP CSS TÙY CHỈNH
// ==========================================
const customStyles = `
  body { background-color: #f4f6f9; }
  .pos-input { background-color: #f8f9fa; transition: all 0.2s ease-in-out; border: 1px solid #dee2e6; border-radius: 0.5rem; }
  .pos-input:focus { background-color: #ffffff; border-color: #3b82f6; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1); }
  .section-card { background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 1rem; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
  .section-title { font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; color: #4b5563; margin-bottom: 1.25rem; display: flex; align-items: center; border-bottom: 2px solid #f3f4f6; padding-bottom: 0.75rem; }
  .sticky-panel { position: sticky; top: 1.5rem; }
  .hover-bg-light:hover { background-color: #f3f4f6; cursor: pointer; }
  .glass-footer { background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); border: 1px solid #e5e7eb; }
  .badge-soft-primary { background-color: rgba(59, 130, 246, 0.1); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.2); }
`;

// ==========================================
// 1. COMPONENT CON (SUB-COMPONENTS)
// ==========================================

const MachineCandidatesTable = ({ candidates, onSelectCandidate, onClear }) => (
  <div className="card shadow-sm mb-4 border-0 rounded-4 overflow-hidden">
    <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
      <div>
        <h5 className="card-title fw-bold m-0 text-primary d-flex align-items-center">
          <Monitor className="me-2" size={20} />
          Tìm thấy {candidates.length} máy trong kho
        </h5>
        <small className="text-muted">Vui lòng chọn 1 máy cụ thể bên dưới để xuất bán.</small>
      </div>
      {onClear && (
        <button type="button" className="btn btn-sm btn-light text-secondary rounded-circle p-2 hover-bg-light" onClick={onClear} title="Đóng">
          <X size={18} />
        </button>
      )}
    </div>
    <div className="table-responsive">
      <table className="table table-hover align-middle mb-0">
        <thead className="table-light">
          <tr>
            <th className="ps-4 text-secondary text-uppercase" style={{fontSize: '0.8rem'}}>Tên dòng máy</th>
            <th className="text-secondary text-uppercase" style={{fontSize: '0.8rem'}}>Số Serial</th>
            <th className="text-secondary text-uppercase" style={{fontSize: '0.8rem'}}>Cấu hình</th>
            <th className="text-secondary text-end text-uppercase" style={{fontSize: '0.8rem'}}>Giá niêm yết</th>
            <th className="text-center text-secondary text-uppercase" style={{fontSize: '0.8rem'}}>Trạng thái</th>
            <th className="text-end pe-4 text-secondary text-uppercase" style={{fontSize: '0.8rem'}}>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {candidates.map((m) => {
            const isReady = m.state === 'READY';
            return (
              <tr key={m.id || m.serialKey} style={{ cursor: 'pointer' }} onClick={() => onSelectCandidate(m)}>
                <td className="ps-4">
                  <div className="fw-bold text-dark">{m.sourceModelText || 'Không rõ dòng máy'}</div>
                  <small className="text-muted">Mã chu kỳ: <span className="fw-medium">{m.cycleId || '—'}</span></small>
                </td>
                <td>
                  <span className="badge bg-light text-dark font-monospace border px-2 py-1 fs-6">{m.serialKey}</span>
                </td>
                <td>
                  <div className="d-flex flex-wrap gap-1">
                    {m.cpuCode && <span className="badge badge-soft-primary">{m.cpuCode}</span>}
                    {m.ram && <span className="badge bg-info bg-opacity-10 text-info border border-info-subtle">RAM {m.ram}</span>}
                    {m.ssd && <span className="badge bg-secondary bg-opacity-10 text-secondary border border-secondary-subtle">SSD {m.ssd}</span>}
                  </div>
                </td>
                <td className="text-end">
                  <div className="fw-bold text-primary fs-6">{m.salePrice ? formatCurrency(m.salePrice) + 'đ' : '—'}</div>
                </td>
                <td className="text-center">
                  <span className={`badge rounded-pill px-3 py-1 fw-medium ${isReady ? 'bg-success bg-opacity-10 text-success border border-success-subtle' : 'bg-warning bg-opacity-10 text-warning border border-warning-subtle'}`}>
                    {isReady ? 'SẴN SÀNG BÁN' : m.state || 'CẦN KIỂM TRA'}
                  </span>
                </td>
                <td className="text-end pe-4">
                  <button type="button" className="btn btn-primary btn-sm px-3 rounded-pill fw-medium shadow-sm" onClick={(e) => { e.stopPropagation(); onSelectCandidate(m); }}>
                    Chọn máy này
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);

const SearchSection = ({ searchTerm, setSearchTerm, onSearch, isLoading, hasMachine, onResetSearch }) => (
  <div className="card shadow-sm mb-4 border-0 rounded-4 overflow-hidden">
    <div className="card-body p-4 bg-white">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h5 className="fw-bold text-dark mb-1">1. Tìm kiếm máy xuất bán</h5>
          <small className="text-muted">Quét mã Serial hoặc nhập tên máy (vd: Latitude 5440, ThinkPad T14...)</small>
        </div>
        {hasMachine && (
          <button type="button" className="btn btn-outline-primary btn-sm fw-medium rounded-pill px-3 shadow-sm d-flex align-items-center" onClick={onResetSearch}>
            <RotateCcw size={14} className="me-2" /> Chọn máy khác
          </button>
        )}
      </div>
      <form onSubmit={onSearch}>
        <div className="input-group input-group-lg border rounded-4 overflow-hidden shadow-sm" style={{ backgroundColor: '#f8f9fa' }}>
          <span className="input-group-text bg-transparent border-0 text-primary ps-4"><Search size={22} /></span>
          <input 
            type="text" 
            className="form-control border-0 bg-transparent px-2 shadow-none fw-medium" 
            placeholder="Quét mã vạch Serial tại đây..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            disabled={isLoading || hasMachine}
            autoFocus
          />
          <button type="submit" className="btn btn-primary px-5 fw-bold text-uppercase rounded-end-4" disabled={isLoading || hasMachine || !searchTerm.trim()}>
            {isLoading ? <span className="spinner-border spinner-border-sm" /> : 'Tìm kiếm'}
          </button>
        </div>
      </form>
    </div>
  </div>
);

const MachineInfoPanel = ({ machine }) => {
  const isReady = machine?.state === 'READY';
  const waitDays = machine?.intakeAt ? Math.floor((new Date() - new Date(machine.intakeAt)) / (1000 * 60 * 60 * 24)) : 0;

  return (
    <div className="card shadow-sm border-0 rounded-4 sticky-panel">
      <div className="card-header bg-white border-bottom py-3 rounded-top-4 d-flex justify-content-between align-items-center">
        <h5 className="card-title fw-bold m-0 d-flex align-items-center text-dark">
          <Monitor className="me-2 text-primary" size={20}/>
          Thông tin máy
        </h5>
        <span className={`badge rounded-pill px-3 py-1 ${isReady ? 'bg-success text-white shadow-sm' : 'bg-warning text-dark'}`}>
          {isReady ? <><CheckCircle size={13} className="me-1 mb-1"/> SẴN SÀNG</> : <><AlertTriangle size={13} className="me-1 mb-1"/> KIỂM TRA</>}
        </span>
      </div>
      
      <div className="card-body p-0">
        {/* Tên & Dòng máy */}
        <div className="p-4 bg-light border-bottom">
          <h5 className="fw-bold text-dark mb-2 lh-base">
            {machine.sourceModelText || machine.platformDisplayName || 'Không rõ dòng máy'}
          </h5>
          <div className="d-flex flex-wrap gap-2 align-items-center">
            {machine.brandName && (
              <span className="badge bg-white text-secondary border">
                {machine.brandName} {machine.modelLineName ? `• ${machine.modelLineName}` : ''}
              </span>
            )}
            {machine.configId && (
              <span className="badge bg-white text-muted border font-monospace">
                Mã CH: {machine.configId}
              </span>
            )}
          </div>
        </div>

        {/* Thông số kỹ thuật */}
        <div className="p-4 border-bottom bg-white">
          <div className="text-secondary small fw-bold text-uppercase mb-3 d-flex align-items-center">
            <Cpu size={14} className="me-2 text-primary" /> Thông số kỹ thuật
          </div>
          <div className="row g-2">
            <div className="col-12">
              <div className="p-2 bg-light rounded-3 border">
                <small className="text-muted d-block mb-1" style={{ fontSize: '11px' }}>Vi xử lý (CPU)</small>
                <span className="fw-bold text-dark small">{machine.cpuCode || 'Theo máy'}</span>
              </div>
            </div>
            <div className="col-12">
              <div className="p-2 bg-light rounded-3 border">
                <small className="text-muted d-block mb-1" style={{ fontSize: '11px' }}>Đồ họa (GPU)</small>
                <span className="fw-bold text-dark small">{machine.gpuCode || 'Onboard / Mặc định'}</span>
              </div>
            </div>
            <div className="col-6">
              <div className="p-2 bg-light rounded-3 border h-100">
                <small className="text-muted d-block mb-1" style={{ fontSize: '11px' }}>Bộ nhớ (RAM)</small>
                <span className="fw-bold text-info small">{machine.ram || 'Chưa rõ'}</span>
              </div>
            </div>
            <div className="col-6">
              <div className="p-2 bg-light rounded-3 border h-100">
                <small className="text-muted d-block mb-1" style={{ fontSize: '11px' }}>Ổ cứng (SSD)</small>
                <span className="fw-bold text-success small">{machine.ssd || 'Chưa rõ'}</span>
              </div>
            </div>
            <div className="col-12">
              <div className="p-2 bg-light rounded-3 border d-flex justify-content-between align-items-center">
                <small className="text-muted" style={{ fontSize: '11px' }}>Màn hình</small>
                <span className="fw-bold text-dark small">
                  {machine.screenSize ? `${machine.screenSize} inch` : 'Tiêu chuẩn'}
                  {machine.touchFlag === 'YES' && <span className="ms-2 badge bg-info-subtle text-info border py-0 px-2 rounded-pill">Cảm ứng</span>}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Thông tin kho */}
        <ul className="list-group list-group-flush small">
          <li className="list-group-item d-flex justify-content-between align-items-center py-3 px-4">
            <span className="text-secondary">Serial Key</span>
            <span className="fw-bold font-monospace bg-light px-2 py-1 rounded border text-primary">{machine.serialKey}</span>
          </li>
          <li className="list-group-item d-flex justify-content-between align-items-center py-3 px-4">
            <span className="text-secondary">Mã chu kỳ</span>
            <span className="fw-medium text-dark">{machine.cycleId}</span>
          </li>
          <li className="list-group-item d-flex justify-content-between align-items-center py-3 px-4">
            <span className="text-secondary">Ngày nhập (Lưu kho)</span>
            <div className="text-end">
              <span className="fw-medium d-block">{formatDate(machine.intakeAt)}</span>
              <span className={`fw-bold ${waitDays > 30 ? 'text-danger' : 'text-success'}`}>{waitDays} ngày</span>
            </div>
          </li>
          <li className="list-group-item py-3 px-4">
            <div className="d-flex justify-content-between mb-1">
              <span className="text-secondary">Bảo hành gán sẵn</span>
              <span className="fw-bold text-primary">{machine.warrantyPeriod || 'Chưa gán gói'}</span>
            </div>
            {machine.warrantyExpiry ? (
              <div className="text-end text-success mt-1">Hạn hãng: {formatDate(machine.warrantyExpiry)}</div>
            ) : (
              <div className="text-end text-muted mt-1 fst-italic" style={{ fontSize: '11px' }}>* Bắt đầu tính từ ngày xuất bán</div>
            )}
          </li>
          <li className="list-group-item d-flex justify-content-between align-items-center py-3 px-4 bg-primary bg-opacity-10 border-top">
            <div>
              <span className="text-primary fw-bold d-block text-uppercase" style={{fontSize: '0.8rem'}}>Giá niêm yết</span>
            </div>
            <span className="fw-bold text-primary fs-5">{machine.salePrice ? formatCurrency(machine.salePrice) : '0'}đ</span>
          </li>
        </ul>

        {!isReady && (
          <div className="p-3">
            <div className="alert alert-danger m-0 d-flex align-items-start border-0 rounded-3 small">
              <AlertTriangle size={18} className="me-2 flex-shrink-0 mt-1"/>
              <div>Máy đang không ở trạng thái "Sẵn sàng bán". Vui lòng kiểm tra lại trước khi tạo giao dịch.</div>
            </div>
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
  const [searchTerm, setSearchTerm] = useState('');
  const [scannedMachine, setScannedMachine] = useState(null);
  const [matchedMachines, setMatchedMachines] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
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
    firstSource: 'TikTok',
    customFirstSource: '',
    lastSource: 'Trực tiếp / Vãng lai',
    customLastSource: '',
    saleNote: '',
    customerType: 'Khách mua lần đầu',
    isStudent: 'Không',
  });

  const [isUpgraded, setIsUpgraded] = useState(false);
  const [defaultSpecs, setDefaultSpecs] = useState({ ram: '', ssd: '' });

  // State: Phụ kiện & Bộ quà tặng mặc định
  const [availableAccessories, setAvailableAccessories] = useState([]);
  const [selectedAccessories, setSelectedAccessories] = useState([]);
  const [accSearchTerm, setAccSearchTerm] = useState('');
  const [showAccDropdown, setShowAccDropdown] = useState(false);
  const [defaultGiftBundle, setDefaultGiftBundle] = useState([]);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [tempGiftBundle, setTempGiftBundle] = useState([]);
  const [modalSearchTerm, setModalSearchTerm] = useState('');
  const [isSavingGift, setIsSavingGift] = useState(false);
  const [defaultGiftDeduction, setDefaultGiftDeduction] = useState(0); 
  const defaultGiftBundleRef = useRef([]);

  // State: Nâng cấp linh kiện từ kho (RAM, SSD)
  const [availableParts, setAvailableParts] = useState([]);
  const [upgradeRamSku, setUpgradeRamSku] = useState('');
  const [upgradeRamPrice, setUpgradeRamPrice] = useState('');
  const [upgradeSsdSku, setUpgradeSsdSku] = useState('');
  const [upgradeSsdPrice, setUpgradeSsdPrice] = useState('');

  // State: Khách hàng nhận diện từ CRM
  const [matchedCrmCustomer, setMatchedCrmCustomer] = useState(null);

  // Tự động nhận diện khách hàng cũ khi nhập SĐT tại quầy
  useEffect(() => {
    const rawPhone = (formData.customerPhone || '').replace(/\D/g, '');
    if (rawPhone.length >= 10) {
      const timer = setTimeout(() => {
        crmApi.searchCustomers({ keyword: rawPhone, size: 1 })
          .then(res => {
            if (res?.success && res?.data?.items?.length > 0) {
              const found = res.data.items[0];
              setMatchedCrmCustomer(found);
              setFormData(prev => {
                const updates = {};
                if (!prev.customer.trim() && found.fullName) {
                  updates.customer = found.fullName;
                }
                if (prev.customerType === 'Khách mua lần đầu') {
                  updates.customerType = 'Khách cũ quay lại';
                }
                return Object.keys(updates).length > 0 ? { ...prev, ...updates } : prev;
              });
            } else {
              setMatchedCrmCustomer(null);
            }
          })
          .catch(() => setMatchedCrmCustomer(null));
      }, 350);
      return () => clearTimeout(timer);
    } else {
      setMatchedCrmCustomer(null);
    }
  }, [formData.customerPhone]);

  // Computed Values (Tính toán)
  const isReady = scannedMachine?.state === 'READY';
  const giftAccessories = selectedAccessories.filter(a => a.isGift);
  const paidAccessories = selectedAccessories.filter(a => !a.isGift);
  const totalPaidAccAmount = paidAccessories.reduce((sum, item) => sum + ((Number(item.price) || 0) * (Number(item.quantity) || 1)), 0);
  
  const upgradeRamPriceNum = isUpgraded ? (Number(parseCurrency(upgradeRamPrice)) || 0) : 0;
  const upgradeSsdPriceNum = isUpgraded ? (Number(parseCurrency(upgradeSsdPrice)) || 0) : 0;
  const totalUpgradeAmount = upgradeRamPriceNum + upgradeSsdPriceNum;

  const machinePriceNum = Number(parseCurrency(formData.finalPrice)) || 0;
  const discountNum = Number(parseCurrency(formData.discount)) || 0;
  const grandTotal = Math.max(0, machinePriceNum - discountNum - (Number(defaultGiftDeduction) || 0)) + totalPaidAccAmount + totalUpgradeAmount;

  // Effects
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [accRes, giftRes, partsRes] = await Promise.all([
          apiPhuKien.getAvailable(),
          apiPhuKien.getDefaultGifts().catch(() => ({ data: { data: '[]' } })),
          apiLinhKien.getAvailable().catch(() => ({ data: { data: [] } }))
        ]);
        setAvailableAccessories(accRes.data || []);
        setAvailableParts(partsRes.data?.data || partsRes.data || []);
        
        let bundle = [];
        try {
          const raw = giftRes?.data?.data || giftRes?.data;
          bundle = typeof raw === 'string' ? JSON.parse(raw) : (Array.isArray(raw) ? raw : []);
        } catch {
          bundle = [];
        }
        setDefaultGiftBundle(bundle);
        defaultGiftBundleRef.current = bundle;
      } catch (err) {
        console.error("Lỗi lấy dữ liệu phụ kiện / bộ quà / linh kiện:", err);
      }
    };
    fetchData();
  }, []);

  const applyDefaultGiftBundle = (bundleToApply = defaultGiftBundle) => {
    if (!bundleToApply || bundleToApply.length === 0) return;
    const currentCustom = selectedAccessories.filter(a => !a.isFromDefaultBundle);
    const newGifts = bundleToApply.map(item => ({
      sku: item.sku,
      name: item.name,
      quantity: Number(item.quantity) || 1,
      price: Number(item.price) || 0,
      isGift: true,
      isFromDefaultBundle: true 
    }));
    setSelectedAccessories([...newGifts, ...currentCustom]);
    setDefaultGiftDeduction(0);
  };

  useEffect(() => {
    if (scannedMachine) {
      const parsedRam = scannedMachine.ram || '';
      const parsedSsd = scannedMachine.ssd || '';
      
      setDefaultSpecs({ ram: parsedRam, ssd: parsedSsd });
      
      const validPresets = ['BH phần cứng 3 tháng', 'BH phần cứng 6 tháng', 'BH phần cứng 9 tháng', 'BH phần cứng 12 tháng', 'Bảo hành hãng', 'Không BH'];
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
      setDefaultGiftDeduction(0);

      if (defaultGiftBundleRef.current && defaultGiftBundleRef.current.length > 0) {
        applyDefaultGiftBundle(defaultGiftBundleRef.current);
      }
    }
  }, [scannedMachine]);

  // Handlers
  const handleFormChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleSelectAccessory = (acc) => {
    if (acc.quantity <= 0) return;
    const existing = selectedAccessories.find(sa => sa.sku === acc.sku && !sa.isFromDefaultBundle);
    if (existing) {
      if (existing.quantity + 1 > acc.quantity) {
        return showToast(`Số lượng không được vượt quá tồn kho (${acc.quantity})`, 'warning');
      }
      setSelectedAccessories(selectedAccessories.map(sa => (sa.sku === acc.sku && !sa.isFromDefaultBundle) ? { ...sa, quantity: sa.quantity + 1 } : sa));
    } else {
      setSelectedAccessories([...selectedAccessories, { 
        sku: acc.sku, name: acc.name, quantity: 1, price: acc.price || 0, isGift: false, isFromDefaultBundle: false
      }]);
    }
    setAccSearchTerm('');
    setShowAccDropdown(false);
  };

  const handleUpdateAccessory = (sku, key, value) => {
    setSelectedAccessories(prev => prev.map(item => {
      if (item.sku === sku && !item.isFromDefaultBundle) {
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

  const handleRemoveDefaultGift = (sku) => {
    const itemToRemove = selectedAccessories.find(item => item.sku === sku && item.isFromDefaultBundle);
    if (itemToRemove) {
      const refund = (Number(itemToRemove.price) || 0) * (Number(itemToRemove.quantity) || 1);
      if (refund > 0) {
        setDefaultGiftDeduction(prev => prev + refund);
        showToast(`Đã bớt quà "${itemToRemove.name}": Trừ ${formatCurrency(refund)}đ vào tiền máy`, 'info');
      }
    }
    setSelectedAccessories(prev => prev.filter(item => !(item.sku === sku && item.isFromDefaultBundle)));
  };

  const handleRemoveAccessory = (sku) => {
    setSelectedAccessories(prev => prev.filter(item => !(item.sku === sku && !item.isFromDefaultBundle)));
  };

  // Gift Modal logic
  const handleOpenGiftModal = () => {
    setTempGiftBundle(defaultGiftBundle.map(item => ({ ...item })));
    setModalSearchTerm('');
    setShowGiftModal(true);
  };
  const handleAddTempGift = (acc) => {
    const existing = tempGiftBundle.find(g => g.sku === acc.sku);
    if (existing) setTempGiftBundle(tempGiftBundle.map(g => g.sku === acc.sku ? { ...g, quantity: g.quantity + 1 } : g));
    else setTempGiftBundle([...tempGiftBundle, { sku: acc.sku, name: acc.name, quantity: 1, price: acc.price || 0 }]);
    setModalSearchTerm('');
  };
  const handleUpdateTempGift = (sku, field, value) => {
    setTempGiftBundle(prev => prev.map(item => {
      if (item.sku === sku) {
        if (field === 'qty') return (Number(value) || 1) > 0 ? { ...item, quantity: Number(value) || 1 } : null;
        if (field === 'price') return { ...item, price: parseCurrency(value) || 0 };
      }
      return item;
    }).filter(Boolean));
  };
  const handleRemoveTempGift = (sku) => setTempGiftBundle(prev => prev.filter(g => g.sku !== sku));
  const handleSaveGiftBundle = async () => {
    setIsSavingGift(true);
    try {
      await apiPhuKien.saveDefaultGifts(JSON.stringify(tempGiftBundle));
      setDefaultGiftBundle(tempGiftBundle);
      defaultGiftBundleRef.current = tempGiftBundle;
      showToast('Đã lưu cấu hình bộ quà tặng', 'success');
      setShowGiftModal(false);
      if (scannedMachine) {
        applyDefaultGiftBundle(tempGiftBundle);
        showToast('Đã cập nhật lại bộ quà cho đơn hiện tại', 'info');
      }
    } catch (err) {
      showToast('Lỗi khi lưu bộ quà tặng', 'danger');
    } finally {
      setIsSavingGift(false);
    }
  };

  const handleLookup = async (e) => {
    if (e) e.preventDefault();
    const query = searchTerm.trim();
    if (!query) return;

    setIsLoading(true);
    setScannedMachine(null);
    setMatchedMachines([]);
    setHasSearched(true);

    try {
      const searchRes = await apiBanHang.searchCandidates(query);
      const candidates = searchRes.data || [];

      if (candidates.length === 0) showToast(`Không tìm thấy máy với từ khóa "${query}"`, 'warning');
      else if (candidates.length === 1) {
        setScannedMachine(candidates[0]);
        setSearchTerm(candidates[0].serialKey);
      } else {
        setMatchedMachines(candidates);
      }
    } catch (err) {
      showToast(err.userMessage || err.message || 'Lỗi tra cứu máy', 'danger');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectCandidate = (machine) => {
    setScannedMachine(machine);
    setSearchTerm(machine.serialKey);
    setMatchedMachines([]);
  };

  const resetForm = () => {
    setScannedMachine(null);
    setMatchedMachines([]);
    setHasSearched(false);
    setSearchTerm('');
    setIsUpgraded(false);
    setUpgradeRamSku('');
    setUpgradeRamPrice('');
    setUpgradeSsdSku('');
    setUpgradeSsdPrice('');
    setSelectedAccessories([]);
    setDefaultGiftDeduction(0);
    setMatchedCrmCustomer(null);
    setFormData({
      saleDate: getTodayDateString(), salesperson: '', discount: '', finalPrice: '', saleRam: '', saleSsd: '',
      customer: '', customerPhone: '', warrantyOption: 'BH phần cứng 6 tháng', warrantyExpiry: '', customWarranty: '', saleNote: '',
      firstSource: 'TikTok', customFirstSource: '', lastSource: 'Trực tiếp / Vãng lai', customLastSource: '', customerType: 'Khách mua lần đầu', isStudent: 'Không',
    });
  };

  const handleSale = async () => {
    if (!isReady || !formData.customer.trim() || !formData.customerPhone.trim()) {
      showToast('Vui lòng nhập đầy đủ thông tin Khách hàng và Số điện thoại', 'danger');
      return;
    }

    let confirmMsg = `Xác nhận bán máy ${scannedMachine.serialKey}?\n` +
      `=> Tổng thanh toán: ${formatCurrency(grandTotal)}đ`;

    if (!(await confirm(confirmMsg))) return;

    setIsLoading(true);
    try {
      const requestId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(); 

      // Chuẩn bị danh sách phụ kiện + linh kiện nâng cấp xuất kho
      const finalAccessories = selectedAccessories.map(sa => ({
        sku: sa.sku,
        name: sa.name,
        quantity: sa.quantity,
        isGift: sa.isGift !== false,
        price: sa.isGift ? 0 : (Number(sa.price) || 0)
      }));

      const upgradeNoteParts = [];
      const machineWarrantyStr = formData.warrantyOption === 'Bảo hành hãng' 
        ? 'Bảo hành hãng' 
        : (formData.warrantyOption === 'Khác' ? formData.customWarranty : formData.warrantyOption);

      // Nếu có chọn RAM từ kho linh kiện (áp dụng bảo hành theo máy)
      if (isUpgraded && upgradeRamSku) {
        const ramPart = availableParts.find(p => p.sku === upgradeRamSku) || availableAccessories.find(a => a.sku === upgradeRamSku);
        if (ramPart) {
          finalAccessories.push({
            sku: ramPart.sku,
            name: `Nâng cấp RAM: ${ramPart.name}`,
            quantity: 1,
            isGift: false,
            isUpgrade: true,
            price: upgradeRamPriceNum,
            warrantyPeriod: machineWarrantyStr,
            warrantyNote: 'Bảo hành theo máy'
          });
        }
      }
      if (isUpgraded && formData.saleRam) {
        let ramStr = `RAM: ${formData.saleRam}`;
        if (upgradeRamPriceNum > 0) ramStr += ` (+${formatCurrency(upgradeRamPriceNum)}đ)`;
        upgradeNoteParts.push(ramStr);
      }

      // Nếu có chọn SSD từ kho linh kiện (áp dụng bảo hành theo máy)
      if (isUpgraded && upgradeSsdSku) {
        const ssdPart = availableParts.find(p => p.sku === upgradeSsdSku) || availableAccessories.find(a => a.sku === upgradeSsdSku);
        if (ssdPart) {
          finalAccessories.push({
            sku: ssdPart.sku,
            name: `Nâng cấp SSD: ${ssdPart.name}`,
            quantity: 1,
            isGift: false,
            isUpgrade: true,
            price: upgradeSsdPriceNum,
            warrantyPeriod: machineWarrantyStr,
            warrantyNote: 'Bảo hành theo máy'
          });
        }
      }
      if (isUpgraded && formData.saleSsd) {
        let ssdStr = `SSD: ${formData.saleSsd}`;
        if (upgradeSsdPriceNum > 0) ssdStr += ` (+${formatCurrency(upgradeSsdPriceNum)}đ)`;
        upgradeNoteParts.push(ssdStr);
      }

      const generatedUpgradeNote = upgradeNoteParts.length > 0 
        ? (upgradeNoteParts.join(' | ') + (machineWarrantyStr ? ` [BH theo máy: ${machineWarrantyStr}]` : '')) 
        : null;

      await apiBanHang.submitSale({
        serial: scannedMachine.serialKey,
        grossRevenue: scannedMachine.salePrice || parseCurrency(formData.finalPrice),
        finalPrice: grandTotal,
        salesperson: formData.salesperson,
        saleDate: formData.saleDate,
        discount: (Number(discountNum) || 0) + (Number(defaultGiftDeduction) || 0),
        saleRam: formData.saleRam,
        saleSsd: formData.saleSsd,
        upgradeNote: generatedUpgradeNote,
        customerName: formData.customer,
        customerPhone: formData.customerPhone,
        warrantyPeriod: formData.warrantyOption === 'Bảo hành hãng' ? 'Bảo hành hãng' : formData.warrantyOption === 'Khác' ? formData.customWarranty : formData.warrantyOption,
        warrantyExpiry: formData.warrantyOption === 'Bảo hành hãng' ? (formData.warrantyExpiry || null) : (tinhNgayHetHanBaoHanh(formData.saleDate, formData.warrantyOption === 'Khác' ? formData.customWarranty : formData.warrantyOption) || null),
        saleNote: formData.saleNote,
        firstSource: formData.firstSource === 'Khác' && formData.customFirstSource.trim() ? formData.customFirstSource.trim() : formData.firstSource,
        lastSource: formData.lastSource === 'Khác' && formData.customLastSource.trim() ? formData.customLastSource.trim() : formData.lastSource,
        customerType: formData.customerType,
        isStudent: formData.isStudent,
        accessories: finalAccessories
      }, requestId);
      
      const invoiceCode = res?.data?.sourceReference || res?.data?.orderCode || '';
      showToast(invoiceCode ? `Giao dịch bán thành công! Mã hóa đơn: ${invoiceCode}` : 'Giao dịch bán thành công!', 'success');
      resetForm();
    } catch (err) {
      showToast(err.userMessage || err.message || 'Lỗi xử lý giao dịch', 'danger');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style>{customStyles}</style>
      <div className="container-fluid py-4 min-vh-100 d-flex flex-column position-relative" style={{ paddingBottom: '120px' }}>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="m-0 fw-bold text-dark d-flex align-items-center">
            <FileText className="me-3 text-primary" size={28}/> 
            Tạo Đơn Bán Hàng
          </h2>
        </div>

        <SearchSection searchTerm={searchTerm} setSearchTerm={setSearchTerm} onSearch={handleLookup} isLoading={isLoading} hasMachine={!!scannedMachine} onResetSearch={resetForm} />

        {!scannedMachine && matchedMachines.length > 0 && (
          <MachineCandidatesTable candidates={matchedMachines} onSelectCandidate={handleSelectCandidate} onClear={() => setMatchedMachines([])} />
        )}

        {scannedMachine ? (
          <div className="row g-4 flex-grow-1">
            {/* Panel Trái: Thông tin máy */}
            <div className="col-xl-4 col-lg-4">
              <MachineInfoPanel machine={scannedMachine} />
            </div>

            {/* Panel Phải: Form Điền thông tin */}
            <div className="col-xl-8 col-lg-8">
              
              {/* --- CỤM 1: KHÁCH HÀNG --- */}
              <div className="section-card">
                <div className="section-title d-flex justify-content-between align-items-center w-100">
                  <span><User size={18} className="me-2 text-primary"/> 1. Thông tin khách hàng</span>
                  <button type="button" className="btn btn-sm btn-light text-primary py-1 px-3 rounded-pill fw-medium" onClick={() => {
                    const timestamp = Date.now().toString().slice(-6);
                    handleFormChange('customer', `Khách vãng lai ${timestamp}`);
                    handleFormChange('customerPhone', `0999${timestamp}`);
                  }}>
                    + Điền nhanh khách vãng lai
                  </button>
                </div>
                <div className="row g-4">
                  <div className="col-md-6">
                    <label className="form-label text-secondary fw-semibold small mb-1">Tên Khách hàng <span className="text-danger">*</span></label>
                    <input className="form-control form-control-lg pos-input fs-6" value={formData.customer} onChange={e => handleFormChange('customer', e.target.value)} placeholder="Nhập tên khách..." />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label text-secondary fw-semibold small mb-1">Số điện thoại <span className="text-danger">*</span></label>
                    <input className="form-control form-control-lg pos-input fs-6" value={formData.customerPhone} onChange={e => handleFormChange('customerPhone', e.target.value)} placeholder="Nhập SĐT..." />
                    {matchedCrmCustomer && (
                      <div className="mt-2 p-2 px-3 bg-success bg-opacity-10 rounded-3 border border-success-subtle small text-success d-flex align-items-center justify-content-between">
                        <span>
                          <strong>Khách cũ:</strong> {matchedCrmCustomer.fullName} ({matchedCrmCustomer.totalOrders} đơn cũ)
                        </span>
                        <button
                          type="button"
                          className="btn btn-sm btn-link p-0 text-success fw-bold text-decoration-none"
                          onClick={() => {
                            handleFormChange('customer', matchedCrmCustomer.fullName);
                            handleFormChange('customerType', 'Khách cũ quay lại');
                          }}
                        >
                          Áp dụng thông tin
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {/* Dòng 2: Nguồn & Loại khách */}
                  <div className={formData.firstSource === 'Khác' ? "col-md-3" : "col-md-3"}>
                    <label className="form-label text-secondary fw-semibold small mb-1">Nơi biết Shop</label>
                    <select className="form-select pos-input" value={formData.firstSource} onChange={e => handleFormChange('firstSource', e.target.value)}>
                      <option value="TikTok">TikTok</option>
                      <option value="Facebook">Facebook</option>
                      <option value="Zalo">Zalo</option>
                      <option value="Google">Google / Website</option>
                      <option value="Người quen giới thiệu">Người quen giới thiệu</option>
                      <option value="Trực tiếp / Vãng lai">Khách vãng lai</option>
                      <option value="Khác">Khác (Tự nhập)</option>
                    </select>
                  </div>
                  {formData.firstSource === 'Khác' && (
                    <div className="col-md-3">
                      <label className="form-label text-secondary fw-semibold small mb-1">Nhập nơi biết <span className="text-danger">*</span></label>
                      <input className="form-control pos-input border-warning" value={formData.customFirstSource} onChange={e => handleFormChange('customFirstSource', e.target.value)} placeholder="VD: YouTube..." autoFocus />
                    </div>
                  )}

                  <div className={formData.lastSource === 'Khác' ? "col-md-3" : "col-md-3"}>
                    <label className="form-label text-secondary fw-semibold small mb-1">Kênh chốt đơn <span className="text-danger">*</span></label>
                    <select className="form-select pos-input border-primary border-opacity-50 fw-medium" value={formData.lastSource} onChange={e => handleFormChange('lastSource', e.target.value)}>
                      <option value="Trực tiếp / Vãng lai">Tại Cửa hàng</option>
                      <option value="Facebook">Facebook (Inbox)</option>
                      <option value="TikTok">TikTok (Inbox)</option>
                      <option value="Zalo">Zalo</option>
                      <option value="Google">Hotline / Website</option>
                      <option value="Người quen giới thiệu">Khách giới thiệu</option>
                      <option value="Khác">Khác (Tự nhập)</option>
                    </select>
                  </div>
                  {formData.lastSource === 'Khác' && (
                    <div className="col-md-3">
                      <label className="form-label text-secondary fw-semibold small mb-1">Nhập kênh chốt <span className="text-danger">*</span></label>
                      <input className="form-control pos-input border-warning" value={formData.customLastSource} onChange={e => handleFormChange('customLastSource', e.target.value)} placeholder="VD: Shopee..." autoFocus />
                    </div>
                  )}

                  <div className="col-md-3">
                    <label className="form-label text-secondary fw-semibold small mb-1">Phân loại</label>
                    <select className="form-select pos-input" value={formData.customerType} onChange={e => handleFormChange('customerType', e.target.value)}>
                      <option>Khách mua lần đầu</option><option>Khách cũ quay lại</option><option>Khách sỉ / Đối tác</option>
                    </select>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label text-secondary fw-semibold small mb-1">HS / Sinh viên?</label>
                    <select className="form-select pos-input" value={formData.isStudent} onChange={e => handleFormChange('isStudent', e.target.value)}>
                      <option>Không</option><option>Có</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* --- CỤM 2: BẢO HÀNH & CẤU HÌNH --- */}
              <div className="section-card">
                <div className="section-title"><ShieldCheck size={18} className="me-2 text-primary"/> 2. Bảo hành & Nâng cấp</div>
                <div className="row g-4">
                  <div className="col-md-6">
                    <label className="form-label text-secondary fw-semibold small mb-1">Gói bảo hành <span className="text-danger">*</span></label>
                    <select className="form-select pos-input fw-medium" value={formData.warrantyOption} onChange={e => handleFormChange('warrantyOption', e.target.value)}>
                      <option value="BH phần cứng 3 tháng">BH phần cứng 3 tháng</option>
                      <option value="BH phần cứng 6 tháng">BH phần cứng 6 tháng</option>
                      <option value="BH phần cứng 9 tháng">BH phần cứng 9 tháng</option>
                      <option value="BH phần cứng 12 tháng">BH phần cứng 12 tháng</option>
                      <option value="Bảo hành hãng">Bảo hành hãng</option>
                      <option value="Không BH">Không BH</option>
                      <option value="Khác">Khác (Tự nhập)</option>
                    </select>
                    {formData.warrantyOption !== 'Bảo hành hãng' && tinhNgayHetHanBaoHanh(formData.saleDate, formData.warrantyOption === 'Khác' ? formData.customWarranty : formData.warrantyOption) && (
                      <div className="mt-2 small text-success fw-medium d-flex align-items-center">
                        <CheckCircle size={14} className="me-1"/> Đến hết ngày: {formatDate(tinhNgayHetHanBaoHanh(formData.saleDate, formData.warrantyOption === 'Khác' ? formData.customWarranty : formData.warrantyOption))}
                      </div>
                    )}
                  </div>
                  
                  <div className="col-md-6">
                    {formData.warrantyOption === 'Bảo hành hãng' ? (
                      <>
                        <label className="form-label text-primary fw-bold small mb-1">Hạn BH Hãng <span className="text-danger">*</span></label>
                        <input type="date" className="form-control border-primary bg-primary bg-opacity-10" value={formData.warrantyExpiry || ''} onChange={e => handleFormChange('warrantyExpiry', e.target.value)} />
                      </>
                    ) : formData.warrantyOption === 'Khác' ? (
                      <>
                        <label className="form-label text-secondary fw-semibold small mb-1">Nhập thời gian cụ thể <span className="text-danger">*</span></label>
                        <input className="form-control pos-input" value={formData.customWarranty} onChange={e => handleFormChange('customWarranty', e.target.value)} placeholder="VD: 1 đổi 1 trong 30 ngày..." />
                      </>
                    ) : null}
                  </div>

                  <div className="col-12 mt-4 pt-3 border-top">
                    <div className="form-check form-switch mb-3 d-flex align-items-center">
                      <input className="form-check-input fs-4 mt-0 me-3" type="checkbox" role="switch" id="upgradeSwitch" checked={isUpgraded} onChange={e => {
                        setIsUpgraded(e.target.checked);
                        if (!e.target.checked) {
                          handleFormChange('saleRam', defaultSpecs.ram);
                          handleFormChange('saleSsd', defaultSpecs.ssd);
                          setUpgradeRamSku('');
                          setUpgradeRamPrice('');
                          setUpgradeSsdSku('');
                          setUpgradeSsdPrice('');
                        }
                      }} style={{ cursor: 'pointer' }} />
                      <div>
                        <label className="form-check-label fw-bold text-dark" htmlFor="upgradeSwitch" style={{ cursor: 'pointer' }}>
                          Khách yêu cầu nâng cấp / thay đổi cấu hình
                        </label>
                        <div className="text-muted small">Cho phép chọn linh kiện từ kho (RAM, SSD), trừ tồn tự động và tính thêm giá vào hóa đơn</div>
                      </div>
                    </div>
                    {isUpgraded && (
                      <div className="p-4 bg-light rounded-4 border">
                        {/* Banner thông báo chính sách bảo hành đồng bộ theo máy */}
                        <div className="alert alert-info py-2 px-3 small d-flex align-items-center mb-3 rounded-3 border-info-subtle">
                          <ShieldCheck size={18} className="me-2 text-info flex-shrink-0" />
                          <div>
                            <strong>Chính sách bảo hành nâng cấp:</strong> Linh kiện nâng cấp theo máy sẽ được bảo hành đồng bộ theo thời hạn bảo hành của máy 
                            <span className="badge bg-primary ms-1">{formData.warrantyOption || 'Theo máy'}</span> (không lấy theo thời hạn bảo hành gốc của linh kiện kho).
                          </div>
                        </div>

                        <div className="row g-4">
                          {/* NÂNG CẤP RAM */}
                          <div className="col-md-6 border-end-md">
                            <div className="d-flex align-items-center justify-content-between mb-2">
                              <label className="form-label text-dark fw-bold small m-0 d-flex align-items-center gap-1">
                                <Cpu size={15} className="text-primary" /> Nâng cấp RAM
                              </label>
                              {upgradeRamSku && (
                                <button type="button" className="btn btn-link btn-sm text-danger p-0 text-decoration-none" onClick={() => {
                                  setUpgradeRamSku('');
                                  setUpgradeRamPrice('');
                                }}>
                                  Hủy chọn kho
                                </button>
                              )}
                            </div>
                            
                            {/* Chọn từ kho linh kiện */}
                            <div className="mb-2">
                              <select 
                                className="form-select form-select-sm border-primary"
                                value={upgradeRamSku} 
                                onChange={e => {
                                  const sku = e.target.value;
                                  setUpgradeRamSku(sku);
                                  if (sku) {
                                    const part = availableParts.find(p => p.sku === sku) || availableAccessories.find(a => a.sku === sku);
                                    if (part) {
                                      handleFormChange('saleRam', part.name);
                                      // Ưu tiên Giá nâng cấp theo máy, nếu không có mới lấy Giá bán lẻ
                                      const pPrice = (part.upgradePrice !== undefined && part.upgradePrice !== null && Number(part.upgradePrice) > 0)
                                        ? part.upgradePrice
                                        : (part.retailPrice !== undefined ? part.retailPrice : part.price);
                                      if (pPrice !== undefined && (!upgradeRamPrice || upgradeRamPrice === '0')) {
                                        setUpgradeRamPrice(formatCurrency(pPrice));
                                      }
                                    }
                                  }
                                }}
                              >
                                <option value="">-- Chọn linh kiện RAM từ kho linh kiện --</option>
                                {availableParts
                                  .filter(p => {
                                    const cat = (p.category || '').toUpperCase();
                                    const name = (p.name || '').toUpperCase();
                                    return cat.includes('RAM') || name.includes('RAM');
                                  })
                                  .map(p => {
                                    const ugPrice = (p.upgradePrice && Number(p.upgradePrice) > 0) ? p.upgradePrice : p.retailPrice;
                                    return (
                                      <option key={p.sku} value={p.sku} disabled={p.quantity <= 0}>
                                        {p.name} (Tồn: {p.quantity}) {ugPrice ? `[Giá nâng cấp: +${formatCurrency(ugPrice)}đ]` : ''} {p.quantity <= 0 ? ' - [HẾT HÀNG]' : ''}
                                      </option>
                                    );
                                  })}
                                {availableParts.filter(p => (p.category || '').toUpperCase().includes('RAM')).length === 0 && availableAccessories
                                  .filter(a => (a.category || '').toUpperCase().includes('RAM') || (a.name || '').toUpperCase().includes('RAM'))
                                  .map(a => (
                                    <option key={a.sku} value={a.sku} disabled={a.quantity <= 0}>
                                      {a.name} (Tồn: {a.quantity}) {a.price ? `[+${formatCurrency(a.price)}đ]` : ''}
                                    </option>
                                  ))}
                              </select>
                            </div>

                            <div className="row g-2">
                              <div className="col-7">
                                <label className="form-label text-secondary small mb-1" style={{ fontSize: '11px' }}>Tên / Cấu hình RAM giao khách</label>
                                <input className="form-control form-control-sm pos-input border-warning" value={formData.saleRam} onChange={e => handleFormChange('saleRam', e.target.value)} placeholder="VD: 16GB..." />
                              </div>
                              <div className="col-5">
                                <label className="form-label text-secondary small mb-1" style={{ fontSize: '11px' }}>Giá nâng cấp RAM (đ)</label>
                                <input className="form-control form-control-sm text-end text-primary fw-bold pos-input" value={formatCurrency(upgradeRamPrice)} onChange={e => setUpgradeRamPrice(parseCurrency(e.target.value))} placeholder="0 đ" />
                              </div>
                            </div>
                          </div>

                          {/* NÂNG CẤP SSD */}
                          <div className="col-md-6">
                            <div className="d-flex align-items-center justify-content-between mb-2">
                              <label className="form-label text-dark fw-bold small m-0 d-flex align-items-center gap-1">
                                <HardDrive size={15} className="text-success" /> Nâng cấp SSD / Ổ cứng
                              </label>
                              {upgradeSsdSku && (
                                <button type="button" className="btn btn-link btn-sm text-danger p-0 text-decoration-none" onClick={() => {
                                  setUpgradeSsdSku('');
                                  setUpgradeSsdPrice('');
                                }}>
                                  Hủy chọn kho
                                </button>
                              )}
                            </div>

                            {/* Chọn từ kho linh kiện */}
                            <div className="mb-2">
                              <select 
                                className="form-select form-select-sm border-success"
                                value={upgradeSsdSku} 
                                onChange={e => {
                                  const sku = e.target.value;
                                  setUpgradeSsdSku(sku);
                                  if (sku) {
                                    const part = availableParts.find(p => p.sku === sku) || availableAccessories.find(a => a.sku === sku);
                                    if (part) {
                                      handleFormChange('saleSsd', part.name);
                                      // Ưu tiên Giá nâng cấp theo máy, nếu không có mới lấy Giá bán lẻ
                                      const pPrice = (part.upgradePrice !== undefined && part.upgradePrice !== null && Number(part.upgradePrice) > 0)
                                        ? part.upgradePrice
                                        : (part.retailPrice !== undefined ? part.retailPrice : part.price);
                                      if (pPrice !== undefined && (!upgradeSsdPrice || upgradeSsdPrice === '0')) {
                                        setUpgradeSsdPrice(formatCurrency(pPrice));
                                      }
                                    }
                                  }
                                }}
                              >
                                <option value="">-- Chọn linh kiện SSD từ kho linh kiện --</option>
                                {availableParts
                                  .filter(p => {
                                    const cat = (p.category || '').toUpperCase();
                                    const name = (p.name || '').toUpperCase();
                                    return cat.includes('SSD') || cat.includes('HDD') || name.includes('SSD') || name.includes('NVME') || name.includes('Ổ CỨNG');
                                  })
                                  .map(p => {
                                    const ugPrice = (p.upgradePrice && Number(p.upgradePrice) > 0) ? p.upgradePrice : p.retailPrice;
                                    return (
                                      <option key={p.sku} value={p.sku} disabled={p.quantity <= 0}>
                                        {p.name} (Tồn: {p.quantity}) {ugPrice ? `[Giá nâng cấp: +${formatCurrency(ugPrice)}đ]` : ''} {p.quantity <= 0 ? ' - [HẾT HÀNG]' : ''}
                                      </option>
                                    );
                                  })}
                                {availableParts.filter(p => (p.category || '').toUpperCase().includes('SSD')).length === 0 && availableAccessories
                                  .filter(a => (a.category || '').toUpperCase().includes('SSD') || (a.name || '').toUpperCase().includes('SSD'))
                                  .map(a => (
                                    <option key={a.sku} value={a.sku} disabled={a.quantity <= 0}>
                                      {a.name} (Tồn: {a.quantity}) {a.price ? `[+${formatCurrency(a.price)}đ]` : ''}
                                    </option>
                                  ))}
                              </select>
                            </div>

                            <div className="row g-2">
                              <div className="col-7">
                                <label className="form-label text-secondary small mb-1" style={{ fontSize: '11px' }}>Tên / Cấu hình SSD giao khách</label>
                                <input className="form-control form-control-sm pos-input border-warning" value={formData.saleSsd} onChange={e => handleFormChange('saleSsd', e.target.value)} placeholder="VD: 512GB NVMe..." />
                              </div>
                              <div className="col-5">
                                <label className="form-label text-secondary small mb-1" style={{ fontSize: '11px' }}>Giá nâng cấp SSD (đ)</label>
                                <input className="form-control form-control-sm text-end text-success fw-bold pos-input" value={formatCurrency(upgradeSsdPrice)} onChange={e => setUpgradeSsdPrice(parseCurrency(e.target.value))} placeholder="0 đ" />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Tổng chi phí nâng cấp */}
                        {totalUpgradeAmount > 0 && (
                          <div className="mt-3 pt-3 border-top d-flex justify-content-between align-items-center">
                            <span className="small text-muted fw-semibold">
                              * Phí nâng cấp linh kiện sẽ tự động cộng vào Tổng thanh toán đơn hàng.
                            </span>
                            <div className="d-flex align-items-center gap-2">
                              <span className="small text-dark fw-bold">Tổng tiền nâng cấp:</span>
                              <span className="badge bg-warning text-dark fs-6 px-3 py-2 rounded-pill shadow-sm">
                                +{formatCurrency(totalUpgradeAmount)}đ
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* --- CỤM 3: PHỤ KIỆN KÈM THEO --- */}
              <div className="section-card border-primary border-opacity-25">
                <div className="section-title d-flex justify-content-between align-items-center w-100 mb-4">
                  <span className="text-primary"><PackagePlus size={18} className="me-2"/> 3. Phụ Kiện & Quà Tặng</span>
                  <div className="d-flex gap-2">
                    <button type="button" className="btn btn-sm btn-outline-primary bg-white shadow-sm rounded-pill px-3" onClick={() => applyDefaultGiftBundle()} title="Tải lại toàn bộ các món trong bộ quà">
                      <RefreshCw size={14} className="me-1"/> Nạp lại bộ quà
                    </button>
                    <button type="button" className="btn btn-sm btn-primary shadow-sm rounded-pill px-3" onClick={handleOpenGiftModal} title="Cài đặt mặc định">
                      <Settings size={14} className="me-1"/> Cài đặt
                    </button>
                  </div>
                </div>

                {/* BỘ QUÀ TẶNG MẶC ĐỊNH */}
                <div className="p-3 mb-4 rounded-4 border bg-success bg-opacity-10 border-success-subtle">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <span className="fw-bold text-success d-flex align-items-center gap-2 small text-uppercase">
                      <Gift size={16}/> Bộ quà tặng mặc định
                    </span>
                    {selectedAccessories.filter(a => a.isGift && a.isFromDefaultBundle).length < defaultGiftBundle.length && (
                      <span className="badge bg-white text-warning border border-warning shadow-sm">
                        Đã bớt quà (được trừ tiền vào máy)
                      </span>
                    )}
                  </div>
                  
                  {selectedAccessories.filter(a => a.isGift && a.isFromDefaultBundle).length === 0 ? (
                    <div className="text-muted small py-2 fst-italic">Chưa có món quà nào (hoặc đã bớt hết). Nhấn "Nạp lại bộ quà" để khôi phục.</div>
                  ) : (
                    <div className="d-flex flex-wrap gap-2">
                      {selectedAccessories.filter(a => a.isGift && a.isFromDefaultBundle).map((item) => (
                        <div key={item.sku} className="d-inline-flex align-items-center bg-white border border-success-subtle rounded-pill px-3 py-1 shadow-sm">
                          <span className="fw-semibold text-dark me-2 fs-6">{item.name}</span>
                          <span className="badge bg-success-subtle text-success rounded-pill px-2 me-2">x{item.quantity}</span>
                          {Number(item.price) > 0 && <span className="text-muted small me-2">(-{formatCurrency(item.price)}đ)</span>}
                          <button type="button" className="btn btn-sm text-danger p-0 ms-1" onClick={() => handleRemoveDefaultGift(item.sku)} title={`Bớt "${item.name}"`}><X size={16} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* TÌM VÀ THÊM PHỤ KIỆN */}
                <div className="position-relative mb-4">
                  <div className="input-group input-group-lg shadow-sm rounded-4 overflow-hidden border">
                    <span className="input-group-text bg-white border-0 text-muted"><Search size={20} /></span>
                    <input type="text" className="form-control border-0 px-2 shadow-none" placeholder="Tìm thêm phụ kiện (chuột, sạc, phím...)" value={accSearchTerm} 
                      onChange={e => { setAccSearchTerm(e.target.value); setShowAccDropdown(true); }}
                      onFocus={() => setShowAccDropdown(true)} onBlur={() => setTimeout(() => setShowAccDropdown(false), 250)} />
                  </div>
                  {showAccDropdown && (
                    <ul className="dropdown-menu show w-100 position-absolute shadow-lg border-0 rounded-4 mt-2 p-2" style={{ top: '100%', left: 0, maxHeight: '300px', overflowY: 'auto', zIndex: 1050 }}>
                      {availableAccessories.filter(a => a.name.toLowerCase().includes(accSearchTerm.toLowerCase()) || a.sku.toLowerCase().includes(accSearchTerm.toLowerCase())).map(acc => (
                        <li key={acc.sku}>
                          <button type="button" className="dropdown-item d-flex justify-content-between align-items-center py-2 px-3 rounded-3 mb-1" disabled={acc.quantity <= 0} onClick={() => handleSelectAccessory(acc)}>
                            <div><div className="fw-semibold text-dark">{acc.name}</div><small className="text-muted">Kho: {acc.quantity}</small></div>
                            <span className="badge bg-light text-primary border px-2 py-1">{acc.price ? `${formatCurrency(acc.price)}đ` : 'Chưa có giá'}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* BẢNG PHỤ KIỆN BÁN THÊM */}
                {selectedAccessories.filter(sa => !(sa.isGift && sa.isFromDefaultBundle)).length > 0 && (
                  <div className="table-responsive border rounded-4 overflow-hidden mb-4 shadow-sm">
                    <table className="table table-hover align-middle mb-0 bg-white">
                      <thead className="table-light text-secondary small text-uppercase">
                        <tr>
                          <th className="ps-4 py-3">Phụ kiện mua thêm</th>
                          <th className="text-center py-3">Phân loại</th>
                          <th className="text-end py-3">Đơn giá</th>
                          <th className="text-center py-3" style={{width: '130px'}}>SL</th>
                          <th className="text-end py-3">Thành tiền</th>
                          <th className="pe-4 py-3"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedAccessories.filter(sa => !(sa.isGift && sa.isFromDefaultBundle)).map((sa) => (
                          <tr key={sa.sku} className={sa.isGift ? 'bg-success bg-opacity-10' : ''}>
                            <td className="ps-4">
                              <div className="fw-bold text-dark">{sa.name}</div>
                              <small className="text-muted font-monospace">{sa.sku}</small>
                            </td>
                            <td className="text-center">
                              <div className="btn-group btn-group-sm rounded-pill shadow-sm" role="group">
                                <button type="button" className={`btn py-1 px-3 ${sa.isGift ? 'btn-success fw-bold' : 'btn-light text-secondary'}`} onClick={() => !sa.isGift && handleUpdateAccessory(sa.sku, 'toggleType')}>Quà</button>
                                <button type="button" className={`btn py-1 px-3 ${!sa.isGift ? 'btn-primary fw-bold' : 'btn-light text-secondary'}`} onClick={() => sa.isGift && handleUpdateAccessory(sa.sku, 'toggleType')}>Bán</button>
                              </div>
                            </td>
                            <td className="text-end">
                              {sa.isGift ? <span className="text-success fw-medium">0đ</span> : <input type="text" className="form-control form-control-sm text-end text-primary fw-bold ms-auto pos-input" value={formatCurrency(sa.price)} onChange={e => handleUpdateAccessory(sa.sku, 'price', e.target.value)} style={{maxWidth:'110px'}}/>}
                            </td>
                            <td>
                              <div className="input-group input-group-sm">
                                <button className="btn btn-outline-secondary bg-white" type="button" onClick={() => handleUpdateAccessory(sa.sku, 'qty', -1)}><Minus size={14}/></button>
                                <input type="text" className="form-control text-center fw-bold bg-light" value={sa.quantity} readOnly />
                                <button className="btn btn-outline-secondary bg-white" type="button" onClick={() => handleUpdateAccessory(sa.sku, 'qty', 1)}><Plus size={14}/></button>
                              </div>
                            </td>
                            <td className="text-end fw-bold">
                              {sa.isGift ? <span className="text-success">0đ</span> : <span className="text-primary">{formatCurrency(sa.price * sa.quantity)}đ</span>}
                            </td>
                            <td className="text-end pe-4">
                              <button type="button" className="btn btn-sm btn-light text-danger rounded-circle p-2 shadow-sm hover-bg-light" onClick={() => handleRemoveAccessory(sa.sku)}><Trash2 size={16} /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                
                <div className="p-3 bg-light rounded-4 d-flex flex-wrap justify-content-between align-items-center gap-3 border">
                  <div className="d-flex flex-wrap gap-2 align-items-center">
                    {totalUpgradeAmount > 0 && <span className="badge bg-warning text-dark shadow-sm fs-6 px-3 py-2 rounded-pill">⚡ Nâng cấp: +{formatCurrency(totalUpgradeAmount)}đ</span>}
                    {giftAccessories.length > 0 && <span className="badge bg-success shadow-sm fs-6 px-3 py-2 rounded-pill">🎁 {giftAccessories.reduce((s, a) => s + a.quantity, 0)} Quà tặng</span>}
                    {paidAccessories.length > 0 && <span className="badge bg-primary shadow-sm fs-6 px-3 py-2 rounded-pill">🏷️ Bán thêm: +{formatCurrency(totalPaidAccAmount)}đ</span>}
                    {defaultGiftDeduction > 0 && (
                      <span className="badge bg-white text-dark border border-warning shadow-sm fs-6 px-3 py-2 rounded-pill d-flex align-items-center">
                        <AlertTriangle size={14} className="text-warning me-1"/> Trừ bớt quà: -{formatCurrency(defaultGiftDeduction)}đ
                      </span>
                    )}
                  </div>
                  <div className="text-muted small d-none d-md-block fst-italic"><Info size={14} className="me-1"/> Bớt quà mặc định sẽ tự động trừ vào tiền máy.</div>
                </div>
              </div>

              {/* --- CỤM 4: TÀI CHÍNH & GHI CHÚ --- */}
              <div className="section-card bg-primary bg-opacity-10 border-primary border-opacity-25 mb-4">
                <div className="section-title text-primary"><DollarSign size={18} className="me-2"/> 4. Tổng kết & Ghi chú đơn hàng</div>
                <div className="row g-4">
                  <div className="col-md-6">
                    <label className="form-label text-primary fw-bold small mb-1">Giá chốt bán (VNĐ) <span className="text-danger">*</span></label>
                    <input className="form-control form-control-lg text-primary fw-bold fs-4 border-primary shadow-sm" style={{backgroundColor: '#fff'}} value={formatCurrency(formData.finalPrice)} onChange={e => handleFormChange('finalPrice', parseCurrency(e.target.value))} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label text-success fw-bold small mb-1">Giảm giá thêm (VNĐ)</label>
                    <input className="form-control form-control-lg text-success fw-bold border-success shadow-sm" style={{backgroundColor: '#fff'}} value={formatCurrency(formData.discount)} onChange={e => handleFormChange('discount', parseCurrency(e.target.value))} placeholder="0 đ"/>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label text-secondary fw-semibold small mb-1">Ngày bán <span className="text-danger">*</span></label>
                    <input type="date" className="form-control pos-input bg-white" value={formData.saleDate} onChange={e => handleFormChange('saleDate', e.target.value)} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label text-secondary fw-semibold small mb-1">Nhân viên chốt</label>
                    <input className="form-control pos-input bg-white" value={formData.salesperson} onChange={e => handleFormChange('salesperson', e.target.value)} placeholder="Tên nhân viên..." />
                  </div>
                  <div className="col-12">
                    <label className="form-label text-secondary fw-semibold small mb-1">Ghi chú đơn hàng (Nội bộ)</label>
                    <textarea className="form-control pos-input bg-white rounded-4" rows="2" value={formData.saleNote} onChange={e => handleFormChange('saleNote', e.target.value)} placeholder="Nhập ghi chú thêm về khách hàng hoặc thỏa thuận riêng..."></textarea>
                  </div>
                </div>
              </div>

            </div>
          </div>
        ) : (
          !isLoading && matchedMachines.length === 0 && (
            <div className="card shadow-sm border-0 rounded-4 mt-4 flex-grow-1 d-flex align-items-center justify-content-center">
              <div className="card-body text-center py-5 my-5">
                <RotateCcw size={48} className="text-secondary opacity-25 mb-3" />
                <h4 className="fw-bold text-dark">Chưa có máy nào được chọn</h4>
                <p className="text-muted">Vui lòng sử dụng thanh tìm kiếm ở trên để bắt đầu giao dịch</p>
              </div>
            </div>
          )
        )}

        {/* --- FOOTER: CHỐT ĐƠN (Floating Sticky Bottom) --- */}
        {scannedMachine && (
          <div className="sticky-bottom glass-footer p-3 p-md-4 d-flex flex-column flex-md-row justify-content-between align-items-center shadow-lg rounded-4 border mt-4 mb-3" style={{ bottom: '1rem', zIndex: 1040, backgroundColor: 'rgba(255, 255, 255, 0.95)' }}>
            <div className="mb-3 mb-md-0 text-center text-md-start px-md-2">
              <div className="text-muted fw-semibold text-uppercase small mb-1" style={{letterSpacing: '1px'}}>Khách Cần Thanh Toán</div>
              <div className="text-primary fw-bold" style={{fontSize: '2.2rem', lineHeight: '1'}}>
                {formatCurrency(grandTotal)}<span className="fs-4 ms-1">đ</span>
              </div>
            </div>
            <div className="d-flex gap-3 px-md-2 w-100 w-md-auto">
              <button type="button" className="btn btn-light btn-lg text-secondary fw-bold rounded-pill px-4 px-md-5 border shadow-sm" onClick={resetForm}>
                Hủy bỏ
              </button>
              <button type="button" className="btn btn-primary btn-lg fw-bold rounded-pill px-4 px-md-5 shadow flex-grow-1 flex-md-grow-0 d-flex align-items-center justify-content-center" onClick={handleSale} disabled={!isReady || isLoading}>
                {isLoading ? <span className="spinner-border spinner-border-sm me-2"></span> : <CheckCircle size={22} className="me-2"/>}
                XÁC NHẬN BÁN
              </button>
            </div>
          </div>
        )}
      </div>

      {/* --- MODAL: CÀI ĐẶT BỘ QUÀ TẶNG MẶC ĐỊNH --- */}
      {showGiftModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: 1060, backdropFilter: 'blur(3px)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content shadow-lg border-0 rounded-4 overflow-hidden">
              <div className="modal-header bg-primary text-white py-3 border-0">
                <h5 className="modal-title fw-bold d-flex align-items-center">
                  <Gift className="me-2" size={22} /> Cài Đặt Bộ Quà Tặng Mặc Định
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowGiftModal(false)}></button>
              </div>
              <div className="modal-body p-4 bg-light">
                <p className="text-muted small mb-4">
                  Cấu hình các món quà mặc định được tự động gắn kèm mỗi khi bán máy. Khi nhân viên bán máy bớt quà, hệ thống sẽ lấy <strong>Đơn giá quy đổi</strong> của món đó để trừ trực tiếp vào tiền máy.
                </p>

                <div className="mb-4">
                  <label className="form-label fw-bold text-dark">Thêm món vào bộ quà:</label>
                  <div className="input-group input-group-lg shadow-sm rounded-4 overflow-hidden">
                    <span className="input-group-text bg-white border-0 text-muted"><Search size={18} /></span>
                    <input type="text" className="form-control border-0 ps-0 shadow-none fs-6" placeholder="Tìm phụ kiện theo tên hoặc SKU..." value={modalSearchTerm} onChange={e => setModalSearchTerm(e.target.value)} />
                  </div>
                  {modalSearchTerm.trim() && (
                    <div className="border rounded-4 mt-2 bg-white shadow-sm overflow-hidden" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                      {availableAccessories.filter(a => a.name.toLowerCase().includes(modalSearchTerm.toLowerCase()) || a.sku.toLowerCase().includes(modalSearchTerm.toLowerCase())).map(acc => (
                        <div key={acc.sku} className="d-flex justify-content-between align-items-center px-4 py-3 border-bottom hover-bg-light">
                          <div>
                            <div className="fw-bold text-dark">{acc.name}</div>
                            <small className="text-muted">SKU: {acc.sku} | Tồn: {acc.quantity}</small>
                          </div>
                          <button type="button" className="btn btn-sm btn-outline-primary rounded-pill px-3 fw-medium" onClick={() => handleAddTempGift(acc)}>
                            <Plus size={14} className="me-1"/> Thêm quà
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <h6 className="fw-bold text-dark mb-3">Danh sách các món quà trong bộ ({tempGiftBundle.length}):</h6>
                {tempGiftBundle.length === 0 ? (
                  <div className="alert alert-secondary text-center py-4 rounded-4 border-0 shadow-sm">
                    Chưa có món quà nào trong bộ mặc định. Hãy tìm và thêm phụ kiện ở trên!
                  </div>
                ) : (
                  <div className="table-responsive bg-white rounded-4 shadow-sm border overflow-hidden">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light small text-secondary text-uppercase">
                        <tr>
                          <th className="ps-4 py-3">Tên món quà</th>
                          <th style={{ width: '120px' }} className="text-center py-3">Số lượng</th>
                          <th style={{ width: '180px' }} className="text-end py-3">Giá trị trừ máy</th>
                          <th style={{ width: '70px' }} className="text-center pe-4 py-3">Xóa</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tempGiftBundle.map((item) => (
                          <tr key={item.sku}>
                            <td className="ps-4">
                              <div className="fw-bold text-dark">{item.name}</div>
                              <small className="text-muted font-monospace">{item.sku}</small>
                            </td>
                            <td>
                              <input type="number" min="1" className="form-control text-center fw-bold bg-light pos-input" value={item.quantity} onChange={e => handleUpdateTempGift(item.sku, 'qty', e.target.value)} />
                            </td>
                            <td>
                              <input type="text" className="form-control text-end text-primary fw-bold pos-input" value={formatCurrency(item.price)} onChange={e => handleUpdateTempGift(item.sku, 'price', e.target.value)} placeholder="0" />
                            </td>
                            <td className="text-center pe-4">
                              <button type="button" className="btn btn-sm btn-light text-danger rounded-circle p-2 shadow-sm hover-bg-light" onClick={() => handleRemoveTempGift(item.sku)} title="Bỏ khỏi bộ quà"><Trash2 size={16} /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="modal-footer bg-white border-top py-3 px-4 d-flex justify-content-end gap-2">
                <button type="button" className="btn btn-light rounded-pill px-4 fw-bold border shadow-sm" onClick={() => setShowGiftModal(false)}>Đóng</button>
                <button type="button" className="btn btn-primary rounded-pill fw-bold px-5 shadow-sm" onClick={handleSaveGiftBundle} disabled={isSavingGift}>
                  {isSavingGift ? <><span className="spinner-border spinner-border-sm me-2"></span> Đang lưu...</> : 'Lưu cài đặt'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}