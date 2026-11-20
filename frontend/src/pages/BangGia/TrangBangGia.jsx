import React, { useState, useMemo } from 'react';
import { Tag, Lock } from 'lucide-react';
import { useToast } from '../../contexts/notification/NguCanhThongBao';
import { useAuth } from '../../contexts/NguCanhXacThuc';
import { createEditableItem } from './components/bangGiaConstants';
import { StepIndicator } from './components/PriceCard';
import StepChonMay from './components/StepChonMay';
import StepChinhSua from './components/StepChinhSua';
import StepXemTruocVaIn from './components/StepXemTruocVaIn';

/**
 * Trang Bảng Giá: Quản lý & In thẻ bảng giá niêm yết (A4, A5)
 */
export default function TrangBangGia() {
  const { showToast } = useToast();
  const { hasPermission, requirePermission } = useAuth();
  const canManagePricing = hasPermission('PRICING_MANAGE');
  const [step, setStep] = useState(1);
  const [selectedConfigs, setSelectedConfigs] = useState(() => new Map());
  const [editItems, setEditItems] = useState([]);
  const [pageSize, setPageSize] = useState('A4');

  // Danh sách thẻ in (nhân bản theo số lượng in của từng máy)
  const printItems = useMemo(() => {
    const result = [];
    editItems.forEach(it => {
      const qty = parseInt(it.printQty) || 0;
      for (let i = 0; i < qty; i++) {
        result.push({ ...it, configId: `${it.configId}_${i}`, printKey: `${it.uniqueKey}__${i}` });
      }
    });
    return result;
  }, [editItems]);

  // Sang bước 2: giữ lại các chỉnh sửa trước đó của máy vẫn còn được chọn
  const goToEdit = () => {
    setEditItems(prev => {
      const prevMap = new Map(prev.map(it => [it.uniqueKey, it]));
      return Array.from(selectedConfigs.values()).map(cfg => prevMap.get(cfg.uniqueKey) || createEditableItem(cfg));
    });
    setStep(2);
  };

  const handleChangeItem = (key, field, value) => {
    if (field !== 'printQty' && !requirePermission('PRICING_MANAGE', showToast, 'Chỉnh sửa giá và cấu hình trên thẻ bảng giá')) {
      return;
    }
    setEditItems(prev => prev.map(it => (it.uniqueKey === key ? { ...it, [field]: value } : it)));
  };

  const handleBulkUpdate = (updater) => {
    if (!requirePermission('PRICING_MANAGE', showToast, 'Áp dụng chỉnh sửa hàng loạt trên bảng giá')) {
      return;
    }
    setEditItems(prev => prev.map(updater));
  };

  const handleRemoveItem = (key) => {
    setEditItems(prev => prev.filter(it => it.uniqueKey !== key));
    setSelectedConfigs(prev => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  };

  const canGoTo = (n) => {
    if (n === 1) return true;
    if (n === 2) return selectedConfigs.size > 0;
    if (n === 3) return step >= 2 && editItems.length > 0 && printItems.length > 0;
    return false;
  };

  const handleGoTo = (n) => {
    if (n === step) return;
    if (n === 2) goToEdit();
    else setStep(n);
  };

  return (
    <div className="container-fluid p-0">
      <div className="d-flex flex-wrap justify-content-between align-items-end gap-2 mb-3">
        <div>
          <h2 className="fw-bold d-flex align-items-center gap-2 mb-1">
            <Tag size={28} className="text-primary" /> Bảng giá
          </h2>
          <p className="text-secondary mb-0">Tạo và in thẻ giá theo cấu hình máy (A4 = 9 thẻ/trang, A5 = 4 thẻ/trang)</p>
        </div>
      </div>

      {!canManagePricing && (
        <div className="alert alert-warning border-warning d-flex align-items-center gap-2 py-2 px-3 mb-3 small">
          <Lock size={16} className="flex-shrink-0" />
          <span>
            Bạn đang xem với quyền <strong>Xem bảng giá niêm yết (PRICING_VIEW)</strong>. Bạn có thể chọn máy, xem trước và xuất bảng giá mặc định, nhưng không thể sửa giá hoặc thông số (Cần quyền <strong>PRICING_MANAGE</strong>).
          </span>
        </div>
      )}

      <StepIndicator step={step} canGoTo={canGoTo} onGoTo={handleGoTo} />

      {/* Giữ bước 1 luôn được mount để không mất trạng thái duyệt Hãng/Dòng máy khi quay lại */}
      <div className={step === 1 ? '' : 'd-none'}>
        <StepChonMay selectedConfigs={selectedConfigs} setSelectedConfigs={setSelectedConfigs} onNext={goToEdit} />
      </div>

      {step === 2 && (
        <StepChinhSua
          items={editItems}
          pageSize={pageSize}
          onChangeItem={handleChangeItem}
          onBulkUpdate={handleBulkUpdate}
          onRemove={handleRemoveItem}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      )}

      {step === 3 && (
        <StepXemTruocVaIn items={printItems} pageSize={pageSize} setPageSize={setPageSize} onBack={() => setStep(2)} />
      )}
    </div>
  );
}