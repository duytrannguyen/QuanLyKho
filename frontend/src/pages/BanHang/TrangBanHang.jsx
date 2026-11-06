import React from 'react';
import { FileText, RotateCcw, CheckCircle } from 'lucide-react';
import { formatCurrency } from '../../utils/dinh_dang';
import { useLogicBanHang } from './hooks/useLogicBanHang';
import { SearchSection, MachineCandidatesTable } from './components/ThanhTimKiemMay';
import BangThongTinMayChon from './components/BangThongTinMayChon';
import KhuVucKhachHang from './components/KhuVucKhachHang';
import KhuVucBaoHanhNangCap from './components/KhuVucBaoHanhNangCap';
import KhuVucPhuKienQuaTang from './components/KhuVucPhuKienQuaTang';
import KhuVucTaiChinhGhiChu from './components/KhuVucTaiChinhGhiChu';
import ModalCaiDatQuaTang from './components/ModalCaiDatQuaTang';
import './BanHang.css';

export default function TrangBanHang() {
  const {
    searchTerm,
    setSearchTerm,
    scannedMachine,
    matchedMachines,
    setMatchedMachines,
    isLoading,
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
    swapRamSku,
    setSwapRamSku,
    swapSsdSku,
    setSwapSsdSku,
    matchedCrmCustomer,
    isReady,
    grandTotal,
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
  } = useLogicBanHang();

  return (
    <>
      <div
        className="container-fluid py-3 min-vh-100 d-flex flex-column position-relative"
        style={{ paddingBottom: scannedMachine ? '75px' : '20px' }}
      >
        {/* Header trang tinh gọn */}
        <div className="d-flex justify-content-between align-items-center mb-2.5">
          <h5 className="m-0 fw-bold text-dark d-flex align-items-center" style={{ fontSize: '1.05rem' }}>
            <FileText className="me-2 text-primary" size={20} />
            Tạo Đơn Bán Hàng (POS)
          </h5>
        </div>

        {/* Thanh tìm kiếm / dải máy đã chọn */}
        <SearchSection
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onSearch={handleLookup}
          isLoading={isLoading}
          hasMachine={!!scannedMachine}
          scannedMachine={scannedMachine}
          onResetSearch={resetForm}
        />

        {/* Bảng danh sách kết quả tìm kiếm máy */}
        {!scannedMachine && matchedMachines.length > 0 && (
          <MachineCandidatesTable
            candidates={matchedMachines}
            onSelectCandidate={handleSelectCandidate}
            onClear={() => setMatchedMachines([])}
          />
        )}

        {/* BỐ CỤC CHÍNH KHI ĐÃ CÓ MÁY */}
        {scannedMachine ? (
          <div className="row g-2.5">
            {/* CỘT TRÁI (col-xl-7 col-lg-7): CÁC BƯỚC ĐIỀN THÔNG TIN */}
            <div className="col-xl-7 col-lg-7">
              {/* 1. THÔNG TIN KHÁCH HÀNG */}
              <KhuVucKhachHang
                formData={formData}
                handleFormChange={handleFormChange}
                matchedCrmCustomer={matchedCrmCustomer}
              />

              {/* 2. BẢO HÀNH & NÂNG CẤP */}
              <KhuVucBaoHanhNangCap
                formData={formData}
                handleFormChange={handleFormChange}
                isUpgraded={isUpgraded}
                setIsUpgraded={setIsUpgraded}
                defaultSpecs={defaultSpecs}
                availableParts={availableParts}
                availableAccessories={availableAccessories}
                upgradeRamSku={upgradeRamSku}
                setUpgradeRamSku={setUpgradeRamSku}
                upgradeRamPrice={upgradeRamPrice}
                setUpgradeRamPrice={setUpgradeRamPrice}
                upgradeSsdSku={upgradeSsdSku}
                setUpgradeSsdSku={setUpgradeSsdSku}
                upgradeSsdPrice={upgradeSsdPrice}
                setUpgradeSsdPrice={setUpgradeSsdPrice}
                swapRamSku={swapRamSku}
                setSwapRamSku={setSwapRamSku}
                swapSsdSku={swapSsdSku}
                setSwapSsdSku={setSwapSsdSku}
              />

              {/* 3. PHỤ KIỆN & QUÀ TẶNG */}
              <KhuVucPhuKienQuaTang
                availableAccessories={availableAccessories}
                selectedAccessories={selectedAccessories}
                accSearchTerm={accSearchTerm}
                setAccSearchTerm={setAccSearchTerm}
                showAccDropdown={showAccDropdown}
                setShowAccDropdown={setShowAccDropdown}
                applyDefaultGiftBundle={applyDefaultGiftBundle}
                handleOpenGiftModal={handleOpenGiftModal}
                handleSelectAccessory={handleSelectAccessory}
                handleUpdateAccessory={handleUpdateAccessory}
                handleRemoveDefaultGift={handleRemoveDefaultGift}
                handleRemoveAccessory={handleRemoveAccessory}
              />
            </div>

            {/* CỘT PHẢI (col-xl-5 col-lg-5): THÔNG TIN MÁY & THANH TOÁN (STICKY) */}
            <div className="col-xl-5 col-lg-5">
              <div className="sticky-panel">
                {/* THÔNG TIN MÁY ĐANG CHỌN */}
                <BangThongTinMayChon machine={scannedMachine} />

                {/* 4. TÀI CHÍNH, GHI CHÚ & XÁC NHẬN BÁN */}
                <KhuVucTaiChinhGhiChu
                  formData={formData}
                  handleFormChange={handleFormChange}
                  grandTotal={grandTotal}
                  onSale={handleSale}
                  onReset={resetForm}
                  isReady={isReady}
                  isLoading={isLoading}
                />
              </div>
            </div>
          </div>
        ) : (
          !isLoading &&
          matchedMachines.length === 0 && (
            <div className="card shadow-sm border-0 rounded-3 mt-2 flex-grow-1 d-flex align-items-center justify-content-center">
              <div className="card-body text-center py-5 my-3">
                <RotateCcw size={36} className="text-secondary opacity-25 mb-2" />
                <h6 className="fw-bold text-dark fs-6 mb-1">Chưa có máy nào được chọn</h6>
                <p className="text-muted small m-0" style={{ fontSize: '0.8rem' }}>
                  Quét mã vạch Serial hoặc nhập tên máy vào ô tìm kiếm ở trên để bắt đầu tạo đơn
                </p>
              </div>
            </div>
          )
        )}

        {/* FOOTER: THANH HÀNH ĐỘNG DÀNH CHO MÀN HÌNH NHỎ (MOBILE / TABLET) */}
        {scannedMachine && (
          <div
            className="d-lg-none fixed-bottom glass-footer py-2 px-3 d-flex justify-content-between align-items-center shadow-lg border-top"
            style={{ zIndex: 1040 }}
          >
            <div>
              <small className="text-muted d-block" style={{ fontSize: '10px' }}>Tổng thanh toán</small>
              <strong className="text-primary fs-6">{formatCurrency(grandTotal)}đ</strong>
            </div>
            <div className="d-flex gap-1.5">
              <button
                type="button"
                className="btn btn-light text-secondary fw-semibold rounded-pill px-3 py-1 border shadow-none"
                onClick={resetForm}
                style={{ fontSize: '0.8rem' }}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn btn-primary fw-bold rounded-pill px-3 py-1 shadow-sm d-flex align-items-center"
                onClick={handleSale}
                disabled={!isReady || isLoading}
                style={{ fontSize: '0.8rem' }}
              >
                {isLoading ? (
                  <span className="spinner-border spinner-border-sm me-1"></span>
                ) : (
                  <CheckCircle size={15} className="me-1" />
                )}
                BÁN
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: CÀI ĐẶT BỘ QUÀ TẶNG MẶC ĐỊNH */}
      <ModalCaiDatQuaTang
        show={showGiftModal}
        onClose={() => setShowGiftModal(false)}
        availableAccessories={availableAccessories}
        tempGiftBundle={tempGiftBundle}
        modalSearchTerm={modalSearchTerm}
        setModalSearchTerm={setModalSearchTerm}
        isSavingGift={isSavingGift}
        onAddTempGift={handleAddTempGift}
        onUpdateTempGift={handleUpdateTempGift}
        onRemoveTempGift={handleRemoveTempGift}
        onSaveGiftBundle={handleSaveGiftBundle}
      />
    </>
  );
}
