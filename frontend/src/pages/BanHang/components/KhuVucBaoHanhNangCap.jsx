import React from 'react';
import { ShieldCheck, Truck, Cpu, HardDrive } from 'lucide-react';
import {
  formatCurrency,
  parseCurrency,
  formatDate,
  getTodayDateString,
  tinhNgayHetHanBaoHanh
} from '../../../utils/dinh_dang';

export default function KhuVucBaoHanhNangCap({
  formData,
  handleFormChange,
  isUpgraded,
  setIsUpgraded,
  defaultSpecs,
  availableParts,
  availableAccessories,
  upgradeRamSku,
  setUpgradeRamSku,
  upgradeRamPrice,
  setUpgradeRamPrice,
  upgradeSsdSku,
  setUpgradeSsdSku,
  upgradeSsdPrice,
  setUpgradeSsdPrice,
  swapRamSku,
  setSwapRamSku,
  swapSsdSku,
  setSwapSsdSku
}) {
  const baseDate =
    formData.isShipping && formData.isDelivered
      ? formData.deliveryDate || getTodayDateString()
      : formData.saleDate;
  const warrantyStr =
    formData.warrantyOption === 'Khác' ? formData.customWarranty : formData.warrantyOption;
  const expiryDate = tinhNgayHetHanBaoHanh(baseDate, warrantyStr);

  const isSpecialWarranty =
    formData.warrantyOption === 'Bảo hành hãng' || formData.warrantyOption === 'Khác';

  return (
    <div className="section-card">
      <div className="section-title">
        <ShieldCheck size={15} className="me-1.5 text-primary" /> 2. Bảo hành & Nâng cấp
      </div>

      <div className="row g-2">
        {/* Gói bảo hành */}
        <div className={isSpecialWarranty ? 'col-md-6 col-12' : 'col-12'}>
          <div className="d-flex justify-content-between align-items-center mb-0.5">
            <label className="form-label text-secondary fw-semibold mb-0" style={{ fontSize: '0.75rem' }}>
              Gói bảo hành <span className="text-danger">*</span>
            </label>
            {formData.warrantyOption !== 'Bảo hành hãng' && (
              formData.isShipping && !formData.isDelivered ? (
                <span className="text-warning fw-medium" style={{ fontSize: '0.72rem' }}>
                  ⏳ Kích hoạt khi khách nhận hàng
                </span>
              ) : (
                expiryDate && (
                  <span className="text-success fw-medium" style={{ fontSize: '0.72rem' }}>
                    ✅ Đến hết ngày: {formatDate(expiryDate)}
                  </span>
                )
              )
            )}
          </div>
          <select
            className="form-select pos-input fw-medium"
            value={formData.warrantyOption}
            onChange={(e) => handleFormChange('warrantyOption', e.target.value)}
          >
            <option value="BH phần cứng 3 tháng">BH phần cứng 3 tháng</option>
            <option value="BH phần cứng 6 tháng">BH phần cứng 6 tháng</option>
            <option value="BH phần cứng 9 tháng">BH phần cứng 9 tháng</option>
            <option value="BH phần cứng 12 tháng">BH phần cứng 12 tháng</option>
            <option value="Bảo hành hãng">Bảo hành hãng</option>
            <option value="Không BH">Không BH</option>
            <option value="Khác">Khác (Tự nhập)</option>
          </select>
        </div>

        {/* Trường phụ thuộc của gói bảo hành */}
        {formData.warrantyOption === 'Bảo hành hãng' && (
          <div className="col-md-6 col-12">
            <label className="form-label text-primary fw-bold mb-0.5" style={{ fontSize: '0.75rem' }}>
              Hạn BH Hãng <span className="text-danger">*</span>
            </label>
            <input
              type="date"
              className="form-control pos-input border-primary"
              value={formData.warrantyExpiry || ''}
              onChange={(e) => handleFormChange('warrantyExpiry', e.target.value)}
            />
          </div>
        )}

        {formData.warrantyOption === 'Khác' && (
          <div className="col-md-6 col-12">
            <label className="form-label text-secondary fw-semibold mb-0.5" style={{ fontSize: '0.75rem' }}>
              Nhập thời gian cụ thể <span className="text-danger">*</span>
            </label>
            <input
              className="form-control pos-input"
              value={formData.customWarranty}
              onChange={(e) => handleFormChange('customWarranty', e.target.value)}
              placeholder="VD: 1 đổi 1 trong 30 ngày..."
            />
          </div>
        )}

        {/* Tùy chọn ship xa */}
        <div className="col-12 mt-1.5 pt-1.5 border-top">
          <div className="p-2 bg-light rounded-2 border">
            <div className="form-check form-switch d-flex align-items-center mb-0">
              <input
                className="form-check-input mt-0 me-2"
                type="checkbox"
                role="switch"
                id="shippingSwitch"
                checked={formData.isShipping}
                onChange={(e) => {
                  const checked = e.target.checked;
                  handleFormChange('isShipping', checked);
                  if (!checked) {
                    handleFormChange('isDelivered', false);
                    handleFormChange('deliveryDate', '');
                  }
                }}
              />
              <label
                className="form-check-label fw-bold text-dark mb-0 d-flex align-items-center gap-1"
                htmlFor="shippingSwitch"
                style={{ cursor: 'pointer', fontSize: '0.78rem' }}
              >
                <Truck size={14} className="text-primary" /> Đơn ship xa / Giao hàng (Bảo hành tính từ ngày nhận hàng)
              </label>
            </div>

            {formData.isShipping && (
              <div className="mt-2 pt-2 border-top border-secondary border-opacity-10">
                <div className="row g-2 mb-2">
                  <div className="col-md-4 col-12">
                    <label className="form-label text-secondary fw-semibold mb-0.5" style={{ fontSize: '0.73rem' }}>
                      Đơn vị vận chuyển
                    </label>
                    <select
                      className="form-select pos-input"
                      value={formData.shippingCarrier || ''}
                      onChange={(e) => handleFormChange('shippingCarrier', e.target.value)}
                    >
                      <option value="">-- Chọn đơn vị --</option>
                      <option value="Giao Hàng Tiết Kiệm (GHTK)">Giao Hàng Tiết Kiệm (GHTK)</option>
                      <option value="Viettel Post">Viettel Post</option>
                      <option value="Giao Hàng Nhanh (GHN)">Giao Hàng Nhanh (GHN)</option>
                      <option value="J&T Express">J&T Express</option>
                      <option value="Ahamove">Ahamove</option>
                      <option value="GrabExpress">GrabExpress</option>
                      <option value="Khác / Tự giao">Khác / Tự giao</option>
                    </select>
                  </div>
                  <div className="col-md-4 col-12">
                    <label className="form-label text-secondary fw-semibold mb-0.5" style={{ fontSize: '0.73rem' }}>
                      Mã vận đơn
                    </label>
                    <input
                      type="text"
                      className="form-control pos-input"
                      placeholder="VD: S123456789VN"
                      value={formData.trackingCode || ''}
                      onChange={(e) => handleFormChange('trackingCode', e.target.value)}
                    />
                  </div>
                  <div className="col-md-4 col-12">
                    <label className="form-label text-secondary fw-semibold mb-0.5" style={{ fontSize: '0.73rem' }}>
                      Tiền cọc trước (VNĐ)
                    </label>
                    <input
                      type="text"
                      className="form-control pos-input"
                      placeholder="0"
                      value={formData.depositAmount ? formatCurrency(formData.depositAmount) : ''}
                      onChange={(e) => handleFormChange('depositAmount', parseCurrency(e.target.value))}
                    />
                  </div>
                  <div className="col-md-8 col-12">
                    <label className="form-label text-secondary fw-semibold mb-0.5" style={{ fontSize: '0.73rem' }}>
                      Địa chỉ nhận hàng
                    </label>
                    <input
                      type="text"
                      className="form-control pos-input"
                      placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/TP"
                      value={formData.shippingAddress || ''}
                      onChange={(e) => handleFormChange('shippingAddress', e.target.value)}
                    />
                  </div>
                  <div className="col-md-4 col-12">
                    <label className="form-label text-secondary fw-semibold mb-0.5" style={{ fontSize: '0.73rem' }}>
                      Thu hộ COD (VNĐ)
                    </label>
                    <input
                      type="text"
                      className="form-control pos-input"
                      placeholder="Tự tính nếu để trống"
                      value={formData.codAmount ? formatCurrency(formData.codAmount) : ''}
                      onChange={(e) => handleFormChange('codAmount', parseCurrency(e.target.value))}
                    />
                  </div>
                </div>

                <div className="row g-2 align-items-center pt-1 border-top border-secondary border-opacity-10">
                  <div className="col-md-6 col-12">
                    <div className="form-check form-switch d-flex align-items-center">
                      <input
                        className="form-check-input mt-0 me-2"
                        type="checkbox"
                        role="switch"
                        id="deliveredSwitch"
                        checked={formData.isDelivered}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          handleFormChange('isDelivered', checked);
                          if (checked && !formData.deliveryDate) {
                            handleFormChange('deliveryDate', getTodayDateString());
                          }
                        }}
                      />
                      <label
                        className="form-check-label fw-bold text-dark mb-0"
                        htmlFor="deliveredSwitch"
                        style={{ cursor: 'pointer', fontSize: '0.75rem' }}
                      >
                        Xác nhận khách đã nhận hàng
                      </label>
                    </div>
                  </div>
                  <div className="col-md-6 col-12">
                    {formData.isDelivered ? (
                      <input
                        type="date"
                        className="form-control pos-input border-success fw-medium"
                        value={formData.deliveryDate || getTodayDateString()}
                        onChange={(e) => handleFormChange('deliveryDate', e.target.value)}
                      />
                    ) : (
                      <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                        ⏳ Đơn đang chờ giao, bảo hành tính từ ngày giao thành công.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Nâng cấp phần cứng */}
        <div className="col-12 mt-1.5 pt-1.5 border-top">
          <div className="form-check form-switch mb-1.5 d-flex align-items-center">
            <input
              className="form-check-input mt-0 me-2"
              type="checkbox"
              role="switch"
              id="upgradeSwitch"
              checked={isUpgraded}
              onChange={(e) => {
                setIsUpgraded(e.target.checked);
                if (!e.target.checked) {
                  handleFormChange('saleRam', defaultSpecs.ram);
                  handleFormChange('saleSsd', defaultSpecs.ssd);
                  setUpgradeRamSku('');
                  setUpgradeRamPrice('');
                  setUpgradeSsdSku('');
                  setUpgradeSsdPrice('');
                }
              }}
              style={{ cursor: 'pointer' }}
            />
            <label
              className="form-check-label fw-bold text-dark"
              htmlFor="upgradeSwitch"
              style={{ cursor: 'pointer', fontSize: '0.78rem' }}
            >
              Khách yêu cầu nâng cấp / thay đổi cấu hình (RAM, SSD)
            </label>
          </div>

          {isUpgraded && (
            <div className="p-2.5 bg-light rounded-2 border">
              <div
                className="alert alert-info py-1 px-2 small d-flex align-items-center mb-2 rounded-2 border-info-subtle"
                style={{ fontSize: '0.72rem' }}
              >
                <ShieldCheck size={13} className="me-1.5 text-info flex-shrink-0" />
                <span>
                  Linh kiện nâng cấp sẽ bảo hành đồng bộ theo máy (
                  <span className="badge bg-primary px-1.5">{formData.warrantyOption || 'Theo máy'}</span>).
                </span>
              </div>

              <div className="row g-2">
                {/* Cột RAM */}
                <div className="col-md-6 col-12">
                  <div className="d-flex align-items-center justify-content-between mb-1">
                    <label className="form-label text-dark fw-bold m-0" style={{ fontSize: '0.75rem' }}>
                      <Cpu size={13} className="text-primary me-1" /> RAM
                    </label>
                    {upgradeRamSku && (
                      <button
                        type="button"
                        className="btn btn-link btn-sm text-danger p-0 text-decoration-none"
                        style={{ fontSize: '0.72rem' }}
                        onClick={() => {
                          setUpgradeRamSku('');
                          setUpgradeRamPrice('');
                        }}
                      >
                        Hủy
                      </button>
                    )}
                  </div>
                  <select
                    className="form-select pos-input mb-1"
                    value={upgradeRamSku}
                    onChange={(e) => {
                      const sku = e.target.value;
                      setUpgradeRamSku(sku);
                      if (sku) {
                        const part =
                          availableParts.find((p) => p.sku === sku) ||
                          availableAccessories.find((a) => a.sku === sku);
                        if (part) {
                          handleFormChange('saleRam', part.name);
                          const pPrice =
                            part.upgradePrice && Number(part.upgradePrice) > 0
                              ? part.upgradePrice
                              : part.retailPrice || part.price;
                          if (pPrice && (!upgradeRamPrice || upgradeRamPrice === '0')) {
                            setUpgradeRamPrice(formatCurrency(pPrice));
                          }
                        }
                      }
                    }}
                  >
                    <option value="">-- Chọn linh kiện RAM --</option>
                    {availableParts
                      .filter(
                        (p) =>
                          (p.category || '').toUpperCase().includes('RAM') ||
                          (p.name || '').toUpperCase().includes('RAM')
                      )
                      .map((p) => (
                        <option key={p.sku} value={p.sku} disabled={p.quantity <= 0}>
                          {p.name} (Tồn: {p.quantity})
                        </option>
                      ))}
                  </select>
                  <div className="row g-1">
                    <div className="col-7">
                      <input
                        className="form-control pos-input"
                        value={formData.saleRam}
                        onChange={(e) => handleFormChange('saleRam', e.target.value)}
                        placeholder="Tên RAM..."
                        style={{ fontSize: '0.75rem' }}
                      />
                    </div>
                    <div className="col-5">
                      <input
                        className="form-control text-end text-primary fw-bold pos-input"
                        value={formatCurrency(upgradeRamPrice)}
                        onChange={(e) => setUpgradeRamPrice(parseCurrency(e.target.value))}
                        placeholder="Giá đ"
                        style={{ fontSize: '0.75rem' }}
                      />
                    </div>
                  </div>

                  <div className="mt-1.5 pt-1 border-top border-secondary border-opacity-10">
                    <label className="form-label text-muted mb-0.5" style={{ fontSize: '0.7rem' }}>
                      Thu hồi thanh RAM tháo máy (nhập lại kho):
                    </label>
                    <select
                      className="form-select pos-input py-0.5"
                      style={{ fontSize: '0.73rem' }}
                      value={swapRamSku || ''}
                      onChange={(e) => setSwapRamSku(e.target.value)}
                    >
                      <option value="">-- Không thu hồi / Trả khách --</option>
                      {availableParts
                        .filter(
                          (p) =>
                            (p.category || '').toUpperCase().includes('RAM') ||
                            (p.name || '').toUpperCase().includes('RAM')
                        )
                        .map((p) => (
                          <option key={p.sku} value={p.sku}>
                            Nhập vào SKU: {p.sku} - {p.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Cột SSD */}
                <div className="col-md-6 col-12">
                  <div className="d-flex align-items-center justify-content-between mb-1">
                    <label className="form-label text-dark fw-bold m-0" style={{ fontSize: '0.75rem' }}>
                      <HardDrive size={13} className="text-success me-1" /> SSD
                    </label>
                    {upgradeSsdSku && (
                      <button
                        type="button"
                        className="btn btn-link btn-sm text-danger p-0 text-decoration-none"
                        style={{ fontSize: '0.72rem' }}
                        onClick={() => {
                          setUpgradeSsdSku('');
                          setUpgradeSsdPrice('');
                        }}
                      >
                        Hủy
                      </button>
                    )}
                  </div>
                  <select
                    className="form-select pos-input mb-1"
                    value={upgradeSsdSku}
                    onChange={(e) => {
                      const sku = e.target.value;
                      setUpgradeSsdSku(sku);
                      if (sku) {
                        const part =
                          availableParts.find((p) => p.sku === sku) ||
                          availableAccessories.find((a) => a.sku === sku);
                        if (part) {
                          handleFormChange('saleSsd', part.name);
                          const pPrice =
                            part.upgradePrice && Number(part.upgradePrice) > 0
                              ? part.upgradePrice
                              : part.retailPrice || part.price;
                          if (pPrice && (!upgradeSsdPrice || upgradeSsdPrice === '0')) {
                            setUpgradeSsdPrice(formatCurrency(pPrice));
                          }
                        }
                      }
                    }}
                  >
                    <option value="">-- Chọn linh kiện SSD --</option>
                    {availableParts
                      .filter((p) => {
                        const cat = (p.category || '').toUpperCase();
                        const name = (p.name || '').toUpperCase();
                        return (
                          cat.includes('SSD') ||
                          cat.includes('HDD') ||
                          name.includes('SSD') ||
                          name.includes('NVME')
                        );
                      })
                      .map((p) => (
                        <option key={p.sku} value={p.sku} disabled={p.quantity <= 0}>
                          {p.name} (Tồn: {p.quantity})
                        </option>
                      ))}
                  </select>
                  <div className="row g-1">
                    <div className="col-7">
                      <input
                        className="form-control pos-input"
                        value={formData.saleSsd}
                        onChange={(e) => handleFormChange('saleSsd', e.target.value)}
                        placeholder="Tên SSD..."
                        style={{ fontSize: '0.75rem' }}
                      />
                    </div>
                    <div className="col-5">
                      <input
                        className="form-control text-end text-success fw-bold pos-input"
                        value={formatCurrency(upgradeSsdPrice)}
                        onChange={(e) => setUpgradeSsdPrice(parseCurrency(e.target.value))}
                        placeholder="Giá đ"
                        style={{ fontSize: '0.75rem' }}
                      />
                    </div>
                  </div>

                  <div className="mt-1.5 pt-1 border-top border-secondary border-opacity-10">
                    <label className="form-label text-muted mb-0.5" style={{ fontSize: '0.7rem' }}>
                      Thu hồi ổ SSD tháo máy (nhập lại kho):
                    </label>
                    <select
                      className="form-select pos-input py-0.5"
                      style={{ fontSize: '0.73rem' }}
                      value={swapSsdSku || ''}
                      onChange={(e) => setSwapSsdSku(e.target.value)}
                    >
                      <option value="">-- Không thu hồi / Trả khách --</option>
                      {availableParts
                        .filter((p) => {
                          const cat = (p.category || '').toUpperCase();
                          const name = (p.name || '').toUpperCase();
                          return (
                            cat.includes('SSD') ||
                            cat.includes('HDD') ||
                            name.includes('SSD') ||
                            name.includes('NVME')
                          );
                        })
                        .map((p) => (
                          <option key={p.sku} value={p.sku}>
                            Nhập vào SKU: {p.sku} - {p.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
