import React, { useMemo } from 'react';
import { PackagePlus, RefreshCw, Settings, Gift, X, Search, Minus, Plus, Trash2, Lock, Zap } from 'lucide-react';
import { formatCurrency } from '../../../utils/dinh_dang';
import { useAuth } from '../../../contexts/NguCanhXacThuc';
import { useToast } from '../../../contexts/notification/NguCanhThongBao';

const normalizeText = (str) =>
  String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();

const isChargerAccessory = (acc) => {
  const cat = normalizeText(acc?.category);
  const sku = normalizeText(acc?.sku);
  const name = normalizeText(acc?.name);
  return (
    cat.includes('sac') ||
    cat.includes('adapter') ||
    sku.startsWith('pk-sac') ||
    name.includes('sac') ||
    name.includes('adapter') ||
    name.includes('charger')
  );
};

export default function KhuVucPhuKienQuaTang({
  scannedMachine,
  availableAccessories,
  allAccessories = [],
  selectedAccessories,
  selectedCharger,
  chargerSearchTerm,
  setChargerSearchTerm,
  showChargerDropdown,
  setShowChargerDropdown,
  handleSelectCharger,
  handleSelectCustomCharger,
  handleClearCharger,
  accSearchTerm,
  setAccSearchTerm,
  showAccDropdown,
  setShowAccDropdown,
  applyDefaultGiftBundle,
  handleOpenGiftModal,
  handleSelectAccessory,
  handleUpdateAccessory,
  handleRemoveDefaultGift,
  handleRemoveAccessory
}) {
  const { hasPermission, requirePermission } = useAuth();
  const { showToast } = useToast();
  const canManageGift = hasPermission('ACCESSORY_MANAGE');
  const defaultGiftItems = selectedAccessories.filter((a) => a.isGift && a.isFromDefaultBundle);
  const additionalItems = selectedAccessories.filter((sa) => !(sa.isGift && sa.isFromDefaultBundle));

  const chargerSourceList = useMemo(
    () => (allAccessories.length > 0 ? allAccessories : availableAccessories),
    [allAccessories, availableAccessories]
  );

  const machineBrandHint = useMemo(() => {
    const rawBrand = normalizeText(scannedMachine?.brandName);
    if (rawBrand) return rawBrand;
    const model = normalizeText(scannedMachine?.sourceModelText || scannedMachine?.platformDisplayName);
    const knownBrands = ['dell', 'thinkpad', 'lenovo', 'hp', 'asus', 'acer', 'apple', 'macbook', 'surface', 'msi'];
    return knownBrands.find((b) => model.includes(b)) || '';
  }, [scannedMachine]);

  const chargerCandidates = useMemo(() => {
    const q = normalizeText(chargerSearchTerm);
    const matchesQuery = (acc) => {
      if (!q) return isChargerAccessory(acc);
      return (
        normalizeText(acc.name).includes(q) ||
        normalizeText(acc.sku).includes(q) ||
        normalizeText(acc.category).includes(q)
      );
    };

    const scoreItem = (acc) => {
      let score = 0;
      if ((acc.quantity || 0) > 0) score += 100;
      if (isChargerAccessory(acc)) score += 20;
      if (machineBrandHint && normalizeText(acc.name).includes(machineBrandHint)) score += 10;
      return score;
    };

    return chargerSourceList
      .filter(matchesQuery)
      .sort((a, b) => scoreItem(b) - scoreItem(a));
  }, [chargerSourceList, chargerSearchTerm, machineBrandHint]);

  const inStockChargerMatches = useMemo(
    () => chargerCandidates.filter((c) => (c.quantity || 0) > 0),
    [chargerCandidates]
  );

  const exactMatchExists = useMemo(() => {
    const q = normalizeText(chargerSearchTerm);
    if (!q) return false;
    return chargerCandidates.some((c) => normalizeText(c.name) === q);
  }, [chargerCandidates, chargerSearchTerm]);

  return (
    <div className="section-card border-primary border-opacity-25">
      <div className="section-title d-flex justify-content-between align-items-center w-100">
        <span className="text-primary">
          <PackagePlus size={15} className="me-1.5" /> 3. Phụ Kiện & Quà Tặng
        </span>
        <div className="d-flex gap-1.5">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary bg-white shadow-none rounded-pill px-2 py-0 border"
            style={{ fontSize: '0.72rem', height: '24px' }}
            onClick={() => applyDefaultGiftBundle()}
          >
            <RefreshCw size={11} className="me-1" /> Nạp quà
          </button>
          <button
            type="button"
            className={`btn btn-sm shadow-none rounded-pill px-2 py-0 ${canManageGift ? 'btn-primary' : 'btn-outline-secondary opacity-75'}`}
            style={{ fontSize: '0.72rem', height: '24px' }}
            title={canManageGift ? 'Cài đặt bộ quà tặng mặc định' : 'Cần quyền: Sửa / Xóa phụ kiện & Cấu hình quà tặng (ACCESSORY_MANAGE)'}
            onClick={() => {
              if (!requirePermission('ACCESSORY_MANAGE', showToast, 'Cài đặt bộ quà tặng mặc định khi bán máy')) return;
              handleOpenGiftModal();
            }}
          >
            {canManageGift ? <Settings size={11} className="me-1" /> : <Lock size={11} className="me-1" />} Cài đặt
          </button>
        </div>
      </div>

      {/* Sạc kèm theo máy (0đ - Trừ tồn kho nếu chọn từ kho - BH theo máy) */}
      <div className="p-2 mb-2 rounded-2 border bg-primary bg-opacity-10 border-primary-subtle">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-1 mb-1">
          <span
            className="fw-bold text-primary d-flex align-items-center gap-1 small text-uppercase"
            style={{ fontSize: '0.72rem' }}
          >
            <Zap size={13} /> Sạc kèm theo máy
          </span>
          <div className="d-flex align-items-center gap-1">
            <span className="badge bg-white text-primary border border-primary-subtle rounded-pill px-2" style={{ fontSize: '10px' }}>
              0đ • BH theo máy
            </span>
            <span className="text-muted" style={{ fontSize: '10.5px' }}>
              (Không bắt buộc)
            </span>
          </div>
        </div>

        {selectedCharger ? (
          <div className="d-flex justify-content-between align-items-center gap-2 bg-white border border-primary-subtle rounded-2 px-2.5 py-1.5">
            <div className="min-w-0">
              <div className="fw-bold text-dark text-truncate" style={{ fontSize: '0.82rem' }}>
                {selectedCharger.name}
              </div>
              <div className="d-flex flex-wrap align-items-center gap-1.5 mt-0.5" style={{ fontSize: '11px' }}>
                {selectedCharger.isCustom ? (
                  <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle">
                    Ngoài kho • Không trừ tồn
                  </span>
                ) : (
                  <>
                    <span className="badge bg-light text-dark border font-monospace">
                      {selectedCharger.sku}
                    </span>
                    <span className="badge bg-success-subtle text-success border border-success-subtle">
                      Trừ 1 tồn kho (Còn: {selectedCharger.quantity})
                    </span>
                  </>
                )}
                <span className="text-success fw-semibold">0đ (Kèm máy)</span>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-outline-danger rounded-pill px-2 py-0.5 flex-shrink-0 d-inline-flex align-items-center gap-1"
              style={{ fontSize: '0.72rem' }}
              onClick={handleClearCharger}
              title="Đổi hoặc bỏ chọn sạc kèm theo máy"
            >
              <X size={12} /> Bỏ chọn
            </button>
          </div>
        ) : (
          <div className="position-relative">
            <div className="input-group input-group-sm rounded-2 overflow-hidden border bg-white">
              <span className="input-group-text bg-white border-0 text-primary ps-2 py-1">
                <Search size={14} />
              </span>
              <input
                type="text"
                className="form-control border-0 px-2 py-1 shadow-none"
                placeholder="Tìm loại sạc phù hợp (VD: Dell 65W, Type-C, Lenovo...) hoặc tự gõ tên sạc"
                value={chargerSearchTerm}
                onChange={(e) => {
                  setChargerSearchTerm(e.target.value);
                  setShowChargerDropdown(true);
                }}
                onFocus={() => setShowChargerDropdown(true)}
                onBlur={() => setTimeout(() => setShowChargerDropdown(false), 200)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (chargerSearchTerm.trim()) {
                      if (inStockChargerMatches.length === 1 && normalizeText(inStockChargerMatches[0].name) === normalizeText(chargerSearchTerm)) {
                        handleSelectCharger(inStockChargerMatches[0]);
                      } else if (inStockChargerMatches.length === 0) {
                        handleSelectCustomCharger(chargerSearchTerm);
                      }
                    }
                  } else if (e.key === 'Escape') {
                    setShowChargerDropdown(false);
                  }
                }}
                style={{ fontSize: '0.82rem' }}
              />
              {chargerSearchTerm && (
                <button
                  type="button"
                  className="btn btn-sm bg-white border-0 text-muted px-2 shadow-none"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setChargerSearchTerm('')}
                  title="Xóa từ khóa tìm sạc"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {showChargerDropdown && (
              <ul
                className="dropdown-menu show w-100 position-absolute shadow-lg border-0 rounded-3 mt-1 p-1"
                style={{
                  top: '100%',
                  left: 0,
                  maxHeight: '230px',
                  overflowY: 'auto',
                  zIndex: 1055,
                  fontSize: '0.82rem'
                }}
              >
                {chargerCandidates.length === 0 && !chargerSearchTerm.trim() && (
                  <li className="px-2.5 py-2 text-muted small fst-italic">
                    Chưa có mã sạc (nhóm SAC) trong Kho Phụ Kiện. Bạn có thể gõ tên sạc để tự nhập ngoài kho.
                  </li>
                )}

                {chargerCandidates.map((acc) => {
                  const isSuggested = machineBrandHint && normalizeText(acc.name).includes(machineBrandHint);
                  const outOfStock = (acc.quantity || 0) <= 0;
                  return (
                    <li key={acc.sku}>
                      <button
                        type="button"
                        className="dropdown-item d-flex justify-content-between align-items-center py-1.5 px-2 rounded-2 mb-0.5 text-start"
                        style={{ whiteSpace: 'normal' }}
                        disabled={outOfStock}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleSelectCharger(acc)}
                      >
                        <div className="min-w-0 pe-2">
                          <div className="fw-semibold text-dark d-flex align-items-center gap-1.5 flex-wrap">
                            <span>{acc.name}</span>
                            {isSuggested && !outOfStock && (
                              <span className="badge bg-primary-subtle text-primary border border-primary-subtle" style={{ fontSize: '10px' }}>
                                Gợi ý theo máy
                              </span>
                            )}
                          </div>
                          <small className="text-muted font-monospace" style={{ fontSize: '11px' }}>
                            {acc.sku} •{' '}
                            <span className={outOfStock ? 'text-danger fw-bold' : 'text-success fw-semibold'}>
                              {outOfStock ? 'Hết hàng (0)' : `Kho: ${acc.quantity}`}
                            </span>
                          </small>
                        </div>
                        <span
                          className={`badge border px-1.5 py-0.5 flex-shrink-0 ${
                            outOfStock ? 'bg-danger-subtle text-danger border-danger-subtle' : 'bg-success-subtle text-success border-success-subtle'
                          }`}
                          style={{ fontSize: '11px' }}
                        >
                          {outOfStock ? 'Hết hàng' : '0đ (Kèm máy)'}
                        </span>
                      </button>
                    </li>
                  );
                })}

                {chargerSearchTerm.trim() && !exactMatchExists && (
                  <li className={chargerCandidates.length > 0 ? 'border-top mt-1 pt-1' : ''}>
                    <button
                      type="button"
                      className="dropdown-item d-flex justify-content-between align-items-center py-1.5 px-2 rounded-2 bg-warning bg-opacity-10 text-dark text-start"
                      style={{ whiteSpace: 'normal' }}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSelectCustomCharger(chargerSearchTerm)}
                    >
                      <div className="min-w-0 pe-2">
                        <div className="fw-semibold text-primary">
                          + Dùng sạc ngoài kho: "{chargerSearchTerm.trim()}"
                        </div>
                        <small className="text-muted" style={{ fontSize: '11px' }}>
                          Chỉ lưu tên sạc vào hóa đơn &amp; bảo hành, không trừ tồn kho phụ kiện
                        </small>
                      </div>
                      <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-1.5 py-0.5 flex-shrink-0" style={{ fontSize: '10.5px' }}>
                        Ngoài kho
                      </span>
                    </button>
                  </li>
                )}

                {chargerSearchTerm.trim() && exactMatchExists && (
                  <li className="border-top mt-1 pt-1">
                    <button
                      type="button"
                      className="dropdown-item d-flex justify-content-between align-items-center py-1 px-2 rounded-2 text-secondary"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSelectCustomCharger(chargerSearchTerm)}
                    >
                      <span className="small">
                        + Nhập sạc ngoài kho với tên "{chargerSearchTerm.trim()}" (Không trừ kho)
                      </span>
                    </button>
                  </li>
                )}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Bộ quà mặc định */}
      <div className="p-2 mb-2 rounded-2 border bg-success bg-opacity-10 border-success-subtle">
        <div className="d-flex justify-content-between align-items-center mb-1">
          <span
            className="fw-bold text-success d-flex align-items-center gap-1 small text-uppercase"
            style={{ fontSize: '0.72rem' }}
          >
            <Gift size={13} /> Bộ quà tặng mặc định
          </span>
        </div>
        {defaultGiftItems.length === 0 ? (
          <div className="text-muted small fst-italic" style={{ fontSize: '0.72rem' }}>
            Chưa có món quà nào (hoặc đã bớt hết). Nhấn "Nạp quà" để khôi phục.
          </div>
        ) : (
          <div className="d-flex flex-wrap gap-1">
            {defaultGiftItems.map((item) => (
              <div
                key={item.sku}
                className="d-inline-flex align-items-center bg-white border border-success-subtle rounded-pill px-2 py-0.5 shadow-none"
                style={{ fontSize: '0.75rem' }}
              >
                <span className="fw-semibold text-dark me-1">{item.name}</span>
                <span
                  className="badge bg-success-subtle text-success rounded-pill px-1.5 me-1"
                  style={{ fontSize: '10px' }}
                >
                  x{item.quantity}
                </span>
                {Number(item.price) > 0 && (
                  <span className="text-muted me-1" style={{ fontSize: '11px' }}>
                    (-{formatCurrency(item.price)}đ)
                  </span>
                )}
                <button
                  type="button"
                  className="btn btn-sm text-danger p-0 ms-0.5"
                  onClick={() => handleRemoveDefaultGift(item.sku)}
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tìm phụ kiện bán thêm */}
      <div className="position-relative mb-2">
        <div className="input-group input-group-sm rounded-2 overflow-hidden border bg-light">
          <span className="input-group-text bg-white border-0 text-muted ps-2 py-1">
            <Search size={14} />
          </span>
          <input
            type="text"
            className="form-control border-0 px-2 py-1 shadow-none"
            placeholder="Tìm thêm phụ kiện (chuột, sạc, balo...)"
            value={accSearchTerm}
            onChange={(e) => {
              setAccSearchTerm(e.target.value);
              setShowAccDropdown(true);
            }}
            onFocus={() => setShowAccDropdown(true)}
            onBlur={() => setTimeout(() => setShowAccDropdown(false), 250)}
            style={{ fontSize: '0.82rem' }}
          />
        </div>
        {showAccDropdown && (
          <ul
            className="dropdown-menu show w-100 position-absolute shadow-lg border-0 rounded-3 mt-1 p-1"
            style={{
              top: '100%',
              left: 0,
              maxHeight: '200px',
              overflowY: 'auto',
              zIndex: 1050,
              fontSize: '0.82rem'
            }}
          >
            {availableAccessories
              .filter(
                (a) =>
                  a.name.toLowerCase().includes(accSearchTerm.toLowerCase()) ||
                  a.sku.toLowerCase().includes(accSearchTerm.toLowerCase())
              )
              .map((acc) => (
                <li key={acc.sku}>
                  <button
                    type="button"
                    className="dropdown-item d-flex justify-content-between align-items-center py-1 px-2 rounded-2 mb-0.5"
                    disabled={acc.quantity <= 0}
                    onClick={() => handleSelectAccessory(acc)}
                  >
                    <div>
                      <div className="fw-semibold text-dark">{acc.name}</div>
                      <small className="text-muted" style={{ fontSize: '11px' }}>
                        Kho: {acc.quantity}
                      </small>
                    </div>
                    <span className="badge bg-light text-primary border px-1.5 py-0.5" style={{ fontSize: '11px' }}>
                      {acc.price ? `${formatCurrency(acc.price)}đ` : '0đ'}
                    </span>
                  </button>
                </li>
              ))}
          </ul>
        )}
      </div>

      {/* Bảng phụ kiện mua thêm */}
      {additionalItems.length > 0 && (
        <div
          className="table-responsive border rounded-2 overflow-hidden mb-1 shadow-none"
          style={{ fontSize: '0.8rem' }}
        >
          <table className="table table-sm table-hover align-middle mb-0 bg-white">
            <thead className="table-light text-secondary small text-uppercase" style={{ fontSize: '0.68rem' }}>
              <tr>
                <th className="ps-2.5 py-1.5">Phụ kiện mua thêm</th>
                <th className="text-center py-1.5">Loại</th>
                <th className="text-end py-1.5">Đơn giá</th>
                <th className="text-center py-1.5" style={{ width: '108px', minWidth: '104px' }}>
                  SL
                </th>
                <th className="text-end py-1.5">Thành tiền</th>
                <th className="pe-2.5 py-1.5"></th>
              </tr>
            </thead>
            <tbody>
              {additionalItems.map((sa) => (
                <tr key={sa.sku} className={sa.isGift ? 'bg-success bg-opacity-10' : ''}>
                  <td className="ps-2.5 py-1">
                    <div className="fw-bold text-dark">{sa.name}</div>
                    <small className="text-muted font-monospace" style={{ fontSize: '10px' }}>
                      {sa.sku}
                    </small>
                  </td>
                  <td className="text-center py-1">
                    <div className="btn-group btn-group-xs rounded-pill border overflow-hidden" role="group">
                      <button
                        type="button"
                        className={`btn btn-xs py-0 px-1.5 ${
                          sa.isGift ? 'btn-success fw-bold' : 'btn-light text-secondary'
                        }`}
                        style={{ fontSize: '10px', height: '20px' }}
                        onClick={() => !sa.isGift && handleUpdateAccessory(sa.sku, 'toggleType')}
                      >
                        Quà
                      </button>
                      <button
                        type="button"
                        className={`btn btn-xs py-0 px-1.5 ${
                          !sa.isGift ? 'btn-primary fw-bold' : 'btn-light text-secondary'
                        }`}
                        style={{ fontSize: '10px', height: '20px' }}
                        onClick={() => sa.isGift && handleUpdateAccessory(sa.sku, 'toggleType')}
                      >
                        Bán
                      </button>
                    </div>
                  </td>
                  <td className="text-end py-1">
                    {sa.isGift ? (
                      <span className="text-success fw-medium">0đ</span>
                    ) : (
                      <input
                        type="text"
                        className="form-control form-control-xs text-end text-primary fw-bold ms-auto pos-input py-0 px-1"
                        value={formatCurrency(sa.price)}
                        onChange={(e) => handleUpdateAccessory(sa.sku, 'price', e.target.value)}
                        style={{ maxWidth: '85px', fontSize: '11px', height: '22px' }}
                      />
                    )}
                  </td>
                  <td className="py-1">
                    <div className="input-group input-group-xs" style={{ height: '22px' }}>
                      <button
                        className="btn btn-outline-secondary bg-white py-0 px-1"
                        type="button"
                        onClick={() => handleUpdateAccessory(sa.sku, 'qty', -1)}
                      >
                        <Minus size={10} />
                      </button>
                      <input
                        type="text"
                        className="form-control text-center fw-bold bg-light py-0 px-0.5"
                        value={sa.quantity}
                        readOnly
                        style={{ fontSize: '11px' }}
                      />
                      <button
                        className="btn btn-outline-secondary bg-white py-0 px-1"
                        type="button"
                        onClick={() => handleUpdateAccessory(sa.sku, 'qty', 1)}
                      >
                        <Plus size={10} />
                      </button>
                    </div>
                  </td>
                  <td className="text-end fw-bold py-1">
                    {sa.isGift ? (
                      <span className="text-success">0đ</span>
                    ) : (
                      <span className="text-primary">{formatCurrency(sa.price * sa.quantity)}đ</span>
                    )}
                  </td>
                  <td className="text-end pe-2.5 py-1">
                    <button
                      type="button"
                      className="btn btn-sm btn-light text-danger rounded-circle p-0.5 shadow-none"
                      onClick={() => handleRemoveAccessory(sa.sku)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
