import { useState, useEffect, useRef } from 'react';
import { useToast } from '../../../contexts/notification/NguCanhThongBao';
import { apiBanHang, apiPhuKien, apiLinhKien, crmApi } from '../../../api';
import {
  formatCurrency,
  parseCurrency,
  getTodayDateString,
  tinhNgayHetHanBaoHanh
} from '../../../utils/dinh_dang';

export function useLogicBanHang() {
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
    isShipping: false,
    isDelivered: false,
    deliveryDate: '',
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
  const totalPaidAccAmount = paidAccessories.reduce(
    (sum, item) => sum + ((Number(item.price) || 0) * (Number(item.quantity) || 1)),
    0
  );

  const upgradeRamPriceNum = isUpgraded ? (Number(parseCurrency(upgradeRamPrice)) || 0) : 0;
  const upgradeSsdPriceNum = isUpgraded ? (Number(parseCurrency(upgradeSsdPrice)) || 0) : 0;
  const totalUpgradeAmount = upgradeRamPriceNum + upgradeSsdPriceNum;

  const machinePriceNum = Number(parseCurrency(formData.finalPrice)) || 0;
  const discountNum = Number(parseCurrency(formData.discount)) || 0;
  const grandTotal =
    Math.max(0, machinePriceNum - discountNum - (Number(defaultGiftDeduction) || 0)) +
    totalPaidAccAmount +
    totalUpgradeAmount;

  // Effects: Lấy danh sách phụ kiện, quà tặng, linh kiện
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
        console.error('Lỗi lấy dữ liệu phụ kiện / bộ quà / linh kiện:', err);
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
      let prefillWarrantyExpiry = scannedMachine.warrantyExpiry
        ? scannedMachine.warrantyExpiry.substring(0, 10)
        : '';

      if (
        scannedMachine.warrantyExpiry ||
        (scannedMachine.warrantyPeriod && scannedMachine.warrantyPeriod.toLowerCase().includes('hãng'))
      ) {
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
      setSelectedAccessories(
        selectedAccessories.map(sa =>
          sa.sku === acc.sku && !sa.isFromDefaultBundle ? { ...sa, quantity: sa.quantity + 1 } : sa
        )
      );
    } else {
      setSelectedAccessories([
        ...selectedAccessories,
        {
          sku: acc.sku,
          name: acc.name,
          quantity: 1,
          price: acc.price || 0,
          isGift: false,
          isFromDefaultBundle: false
        }
      ]);
    }
    setAccSearchTerm('');
    setShowAccDropdown(false);
  };

  const handleUpdateAccessory = (sku, key, value) => {
    setSelectedAccessories(prev =>
      prev
        .map(item => {
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
        })
        .filter(Boolean)
    );
  };

  const handleRemoveDefaultGift = (sku) => {
    const itemToRemove = selectedAccessories.find(item => item.sku === sku && item.isFromDefaultBundle);
    if (itemToRemove) {
      const refund = (Number(itemToRemove.price) || 0) * (Number(itemToRemove.quantity) || 1);
      if (refund > 0) {
        setDefaultGiftDeduction(prev => prev + refund);
        showToast(
          `Đã bớt quà "${itemToRemove.name}": Trừ ${formatCurrency(refund)}đ vào tiền máy`,
          'info'
        );
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
    if (existing) {
      setTempGiftBundle(tempGiftBundle.map(g => (g.sku === acc.sku ? { ...g, quantity: g.quantity + 1 } : g)));
    } else {
      setTempGiftBundle([...tempGiftBundle, { sku: acc.sku, name: acc.name, quantity: 1, price: acc.price || 0 }]);
    }
    setModalSearchTerm('');
  };

  const handleUpdateTempGift = (sku, field, value) => {
    setTempGiftBundle(prev =>
      prev
        .map(item => {
          if (item.sku === sku) {
            if (field === 'qty') return (Number(value) || 1) > 0 ? { ...item, quantity: Number(value) || 1 } : null;
            if (field === 'price') return { ...item, price: parseCurrency(value) || 0 };
          }
          return item;
        })
        .filter(Boolean)
    );
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
    } catch {
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

      if (candidates.length === 0) {
        showToast(`Không tìm thấy máy với từ khóa "${query}"`, 'warning');
      } else if (candidates.length === 1) {
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
      firstSource: 'TikTok',
      customFirstSource: '',
      lastSource: 'Trực tiếp / Vãng lai',
      customLastSource: '',
      customerType: 'Khách mua lần đầu',
      isStudent: 'Không',
      isShipping: false,
      isDelivered: false,
      deliveryDate: '',
    });
  };

  const handleSale = async () => {
    if (!isReady || !formData.customer.trim() || !formData.customerPhone.trim()) {
      showToast('Vui lòng nhập đầy đủ thông tin Khách hàng và Số điện thoại', 'danger');
      return;
    }

    const confirmMsg =
      `Xác nhận bán máy ${scannedMachine.serialKey}?\n` +
      `=> Tổng thanh toán: ${formatCurrency(grandTotal)}đ`;

    if (!(await confirm(confirmMsg))) return;

    setIsLoading(true);
    try {
      const requestId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();

      const finalAccessories = selectedAccessories.map(sa => ({
        sku: sa.sku,
        name: sa.name,
        quantity: sa.quantity,
        isGift: sa.isGift !== false,
        price: sa.isGift ? 0 : (Number(sa.price) || 0)
      }));

      const upgradeNoteParts = [];
      const machineWarrantyStr =
        formData.warrantyOption === 'Bảo hành hãng'
          ? 'Bảo hành hãng'
          : formData.warrantyOption === 'Khác'
            ? formData.customWarranty
            : formData.warrantyOption;

      if (isUpgraded && upgradeRamSku) {
        const ramPart =
          availableParts.find(p => p.sku === upgradeRamSku) ||
          availableAccessories.find(a => a.sku === upgradeRamSku);
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

      if (isUpgraded && upgradeSsdSku) {
        const ssdPart =
          availableParts.find(p => p.sku === upgradeSsdSku) ||
          availableAccessories.find(a => a.sku === upgradeSsdSku);
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

      const generatedUpgradeNote =
        upgradeNoteParts.length > 0
          ? upgradeNoteParts.join(' | ') + (machineWarrantyStr ? ` [BH theo máy: ${machineWarrantyStr}]` : '')
          : null;

      const effectiveWarrantyPeriod =
        formData.warrantyOption === 'Bảo hành hãng'
          ? 'Bảo hành hãng'
          : formData.warrantyOption === 'Khác'
            ? formData.customWarranty
            : formData.warrantyOption;

      let calculatedWarrantyExpiry = null;
      if (formData.warrantyOption === 'Bảo hành hãng') {
        calculatedWarrantyExpiry = formData.warrantyExpiry || null;
      } else if (formData.isShipping && !formData.isDelivered) {
        calculatedWarrantyExpiry = null;
      } else {
        const baseDate =
          formData.isShipping && formData.isDelivered
            ? formData.deliveryDate || formData.saleDate
            : formData.saleDate;
        calculatedWarrantyExpiry = tinhNgayHetHanBaoHanh(baseDate, effectiveWarrantyPeriod) || null;
      }

      const res = await apiBanHang.submitSale(
        {
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
          isShipping: formData.isShipping,
          isDelivered: formData.isShipping ? formData.isDelivered : true,
          deliveryDate: formData.isShipping
            ? formData.isDelivered
              ? formData.deliveryDate || getTodayDateString()
              : null
            : formData.saleDate?.slice(0, 10) || null,
          warrantyPeriod: effectiveWarrantyPeriod,
          warrantyExpiry: calculatedWarrantyExpiry,
          saleNote: formData.saleNote,
          firstSource:
            formData.firstSource === 'Khác' && formData.customFirstSource.trim()
              ? formData.customFirstSource.trim()
              : formData.firstSource,
          lastSource:
            formData.lastSource === 'Khác' && formData.customLastSource.trim()
              ? formData.customLastSource.trim()
              : formData.lastSource,
          customerType: formData.customerType,
          isStudent: formData.isStudent,
          accessories: finalAccessories
        },
        requestId
      );

      const invoiceCode = res?.data?.sourceReference || res?.data?.orderCode || '';
      const successMsg =
        formData.isShipping && !formData.isDelivered
          ? invoiceCode
            ? `Tạo đơn ship thành công! Mã đơn: ${invoiceCode} (Trạng thái: Chờ giao hàng)`
            : 'Tạo đơn ship thành công (Chờ giao hàng)!'
          : invoiceCode
            ? `Giao dịch bán thành công! Mã hóa đơn: ${invoiceCode}`
            : 'Giao dịch bán thành công!';
      showToast(successMsg, 'success');
      resetForm();
    } catch (err) {
      showToast(err.userMessage || err.message || 'Lỗi xử lý giao dịch', 'danger');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    // States
    searchTerm,
    setSearchTerm,
    scannedMachine,
    matchedMachines,
     setMatchedMachines,
    isLoading,
    hasSearched,
    formData,
    isUpgraded,
    setIsUpgraded,
    defaultSpecs,
    availableAccessories,
    selectedAccessories,
    accSearchTerm,
    setAccSearchTerm,
    showAccDropdown,
    setShowAccDropdown,
    showGiftModal,
    setShowGiftModal,
    tempGiftBundle,
    modalSearchTerm,
    setModalSearchTerm,
    isSavingGift,
    availableParts,
    upgradeRamSku,
    setUpgradeRamSku,
    upgradeRamPrice,
    setUpgradeRamPrice,
    upgradeSsdSku,
    setUpgradeSsdSku,
    upgradeSsdPrice,
    setUpgradeSsdPrice,
    matchedCrmCustomer,

    // Computed
    isReady,
    giftAccessories,
    paidAccessories,
    grandTotal,

    // Handlers
    handleFormChange,
    applyDefaultGiftBundle,
    handleSelectAccessory,
    handleUpdateAccessory,
    handleRemoveDefaultGift,
    handleRemoveAccessory,
    handleOpenGiftModal,
    handleAddTempGift,
    handleUpdateTempGift,
    handleRemoveTempGift,
    handleSaveGiftBundle,
    handleLookup,
    handleSelectCandidate,
    resetForm,
    handleSale
  };
}

