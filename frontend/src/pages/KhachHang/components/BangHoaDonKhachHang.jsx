import React from 'react';
import {
  ShoppingBag, ShieldCheck, Clock, XCircle, AlertCircle, Calendar,
  Copy, Check, Package, ShieldAlert, MessageSquare, Eye, Lock
} from 'lucide-react';
import { dinhDangTien, formatDate } from '../../../utils/dinh_dang';
import {
  CATEGORY_FILTERS,
  isCancelledOrReturned,
  CategoryBadge,
  OrderStatusBadge,
  OrderCareStatusBadge
} from '../crmCommon';

export default function BangHoaDonKhachHang({
  orders,
  displayedOrders,
  category,
  setCategory,
  warrantyFilter,
  setWarrantyFilter,
  warrantyCounts,
  error,
  loading,
  page,
  totalPages,
  loadOrders,
  selectedOrderForCare,
  handleCareForOrder,
  setSelectedOrder,
  copySerialText,
  copiedSerial,
  getWarrantyCountdown,
  canCare
}) {
  return (
    <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white">
      {/* Card Header: Tiêu đề + Bộ lọc Category & Hạn bảo hành */}
      <div className="card-header bg-white border-bottom p-2.5 px-3.5 d-flex flex-wrap align-items-center justify-content-between gap-2">
        <div className="d-flex align-items-center gap-2">
          <div className="bg-primary bg-opacity-10 p-1.5 rounded-circle text-primary">
            <ShoppingBag size={16} />
          </div>
          <div>
            <h6 className="fw-bold mb-0 text-dark fs-6">Lịch Sử Mua Hàng & Thiết Bị</h6>
            <small className="text-secondary" style={{ fontSize: '0.72rem' }}>
              Bấm nút <strong>"CSKH"</strong> trên bất kỳ đơn nào để chăm sóc theo đơn đó
            </small>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2 flex-wrap">
          {/* Bộ lọc Danh mục */}
          <div className="d-flex gap-1 flex-wrap">
            {CATEGORY_FILTERS.map((f) => (
              <button
                key={f.value || 'ALL'}
                type="button"
                className={`btn btn-sm rounded-pill px-2.5 py-0.5 fw-medium transition-all ${
                  category === f.value ? 'btn-primary shadow-2xs' : 'btn-light border text-secondary'
                }`}
                style={{ fontSize: '0.75rem' }}
                onClick={() => setCategory(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Ngăn cách */}
          {(warrantyCounts.active > 0 || warrantyCounts.expired > 0 || warrantyCounts.voided > 0) && (
            <div className="vr d-none d-sm-block text-secondary opacity-25" style={{ height: '16px' }} />
          )}

          {/* Bộ lọc Trạng thái Bảo hành */}
          {(warrantyCounts.active > 0 || warrantyCounts.expired > 0 || warrantyCounts.voided > 0) && (
            <div className="d-flex gap-1 flex-wrap">
              <button
                type="button"
                className={`btn btn-sm rounded-pill px-2 py-0.5 d-inline-flex align-items-center gap-1 transition-all ${
                  warrantyFilter === '' ? 'btn-dark text-white fw-bold shadow-2xs' : 'btn-white bg-white border text-secondary'
                }`}
                style={{ fontSize: '0.72rem' }}
                onClick={() => setWarrantyFilter('')}
                title="Tất cả trạng thái bảo hành"
              >
                <span>Tất cả BH</span>
              </button>

              {warrantyCounts.active > 0 && (
                <button
                  type="button"
                  className={`btn btn-sm rounded-pill px-2 py-0.5 d-inline-flex align-items-center gap-1 transition-all ${
                    warrantyFilter === 'ACTIVE' ? 'btn-success text-white fw-bold shadow-2xs' : 'btn-white bg-white border border-success-subtle text-success'
                  }`}
                  style={{ fontSize: '0.72rem' }}
                  onClick={() => setWarrantyFilter(prev => prev === 'ACTIVE' ? '' : 'ACTIVE')}
                  title="Lọc các hóa đơn máy còn hạn bảo hành"
                >
                  <ShieldCheck size={11} />
                  <span>Còn BH</span>
                  <span className="badge rounded-pill bg-success text-white ms-0.5" style={{ fontSize: '0.62rem' }}>{warrantyCounts.active}</span>
                </button>
              )}

              {warrantyCounts.expired > 0 && (
                <button
                  type="button"
                  className={`btn btn-sm rounded-pill px-2 py-0.5 d-inline-flex align-items-center gap-1 transition-all ${
                    warrantyFilter === 'EXPIRED' ? 'btn-danger text-white fw-bold shadow-2xs' : 'btn-white bg-white border border-danger-subtle text-danger'
                  }`}
                  style={{ fontSize: '0.72rem' }}
                  onClick={() => setWarrantyFilter(prev => prev === 'EXPIRED' ? '' : 'EXPIRED')}
                  title="Xem lại các hóa đơn máy ĐÃ HẾT HẠN bảo hành"
                >
                  <Clock size={11} />
                  <span>Đã hết hạn BH</span>
                  <span className="badge rounded-pill bg-danger text-white ms-0.5" style={{ fontSize: '0.62rem' }}>{warrantyCounts.expired}</span>
                </button>
              )}

              {warrantyCounts.voided > 0 && (
                <button
                  type="button"
                  className={`btn btn-sm rounded-pill px-2 py-0.5 d-inline-flex align-items-center gap-1 transition-all ${
                    warrantyFilter === 'VOIDED' ? 'btn-secondary text-white fw-bold shadow-2xs' : 'btn-white bg-white border text-secondary'
                  }`}
                  style={{ fontSize: '0.72rem' }}
                  onClick={() => setWarrantyFilter(prev => prev === 'VOIDED' ? '' : 'VOIDED')}
                  title="Lọc các hóa đơn máy đã bán lại cho shop (Vô hiệu hóa)"
                >
                  <XCircle size={11} />
                  <span>Đã thu lại</span>
                  <span className="badge rounded-pill bg-secondary text-white ms-0.5" style={{ fontSize: '0.62rem' }}>{warrantyCounts.voided}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="alert alert-danger m-3 d-flex align-items-center gap-2 py-2 px-3 border-0 shadow-xs rounded-3 small">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Table / List View */}
      <div className="table-responsive bg-white">
        <table className="table table-hover table-borderless align-middle mb-0">
          <thead className="table-light border-bottom">
            <tr>
              <th className="py-2.5 text-center text-secondary fw-semibold" style={{ width: '45px' }}>STT</th>
              <th className="py-2.5 text-secondary fw-semibold" style={{ width: '135px' }}>Mã đơn & Ngày</th>
              <th className="py-2.5 text-secondary fw-semibold">Thiết bị & Cấu hình</th>
              <th className="py-2.5 text-secondary fw-semibold text-center" style={{ width: '185px' }}>Bảo hành & CSKH</th>
              <th className="py-2.5 text-secondary fw-semibold text-center" style={{ width: '110px' }}>Trạng thái đơn</th>
              <th className="py-2.5 text-secondary fw-semibold text-end" style={{ width: '120px' }}>Thành tiền</th>
              <th className="py-2.5 text-secondary fw-semibold text-center" style={{ width: '115px' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody className="border-top-0">
            {displayedOrders.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-5 text-muted">
                  <Clock size={28} className="text-secondary opacity-50 mb-2" />
                  <div className="fw-semibold">Không có hóa đơn nào phù hợp với bộ lọc hiện tại.</div>
                  <small className="text-secondary">
                    {warrantyFilter ? 'Hãy thử chọn "Tất cả BH" để xem toàn bộ giao dịch.' : 'Khách hàng chưa có hóa đơn thuộc phân loại này.'}
                  </small>
                </td>
              </tr>
            ) : displayedOrders.map((o, index) => {
              const cancelled = isCancelledOrReturned(o.orderStatus);
              const countdown = getWarrantyCountdown(o.warrantyExpiry);
              const isTargetCare = selectedOrderForCare?.id === o.id;

              return (
                <tr
                  key={o.id}
                  role="button"
                  className={`border-bottom cursor-pointer hover-table-row transition-all ${
                    isTargetCare ? 'bg-primary bg-opacity-10 border-primary' : (cancelled ? 'bg-light opacity-75' : '')
                  }`}
                  onClick={() => setSelectedOrder(o)}
                  title="Nhấn để xem chi tiết hóa đơn & in phiếu bảo hành"
                >
                  {/* STT */}
                  <td className="text-center text-secondary fw-medium" style={{ fontSize: '0.8rem' }}>
                    {index + 1}
                  </td>

                  {/* Mã đơn & Ngày */}
                  <td className="text-nowrap">
                    <div className="d-flex align-items-center gap-1 font-monospace fw-bold text-primary mb-0.5">
                      <span>{o.transactionId}</span>
                      {isTargetCare && (
                        <span className="badge bg-primary text-white rounded-pill px-1" style={{ fontSize: '0.62rem' }}>
                          CSKH
                        </span>
                      )}
                    </div>
                    <div className="text-muted small d-flex align-items-center gap-1" style={{ fontSize: '0.72rem' }}>
                      <Calendar size={11} /> {formatDate(o.saleDate)}
                    </div>
                    <div className="mt-1">
                      <CategoryBadge category={o.orderCategory} />
                    </div>
                  </td>

                  {/* Sản phẩm / Cấu hình / Serial */}
                  <td>
                    <div className={`fw-bold ${cancelled ? 'text-secondary text-decoration-line-through' : 'text-dark'}`} style={{ fontSize: '0.82rem' }}>
                      {o.productName || <span className="text-muted fw-normal fst-italic">Không có tên sản phẩm</span>}
                    </div>

                    {/* Khối Serial */}
                    {o.serialKeys && (
                      <div className="d-flex align-items-center gap-1 mt-0.5">
                        <span className="badge bg-light text-dark border font-monospace py-0.5 px-1.5 d-inline-flex align-items-center gap-1" style={{ fontSize: '0.68rem' }}>
                          <span>Serial: {o.serialKeys}</span>
                          <button
                            type="button"
                            className="btn btn-sm p-0 border-0 text-secondary hover-primary"
                            onClick={(e) => copySerialText(e, o.serialKeys)}
                            title="Sao chép serial máy"
                          >
                            {copiedSerial === o.serialKeys ? <Check size={11} className="text-success" /> : <Copy size={11} />}
                          </button>
                        </span>
                      </div>
                    )}

                    {/* Cấu hình / Ghi chú */}
                    {o.configSummary && (
                      <div className="small text-secondary mt-0.5 text-truncate" style={{ maxWidth: '280px', fontSize: '0.73rem' }} title={o.configSummary}>
                        {o.configSummary}
                      </div>
                    )}

                    {/* Phụ kiện bán kèm */}
                    {o.accompanyingOrder && (
                      <div className="mt-1 p-1.5 bg-info bg-opacity-10 border-start border-info border-3 rounded-end small" style={{ fontSize: '0.72rem' }}>
                        <div className="d-flex align-items-center justify-content-between mb-0.5">
                          <span className="badge bg-info text-dark d-inline-flex align-items-center gap-1 py-0 px-1" style={{ fontSize: '0.65rem' }}>
                            <Package size={10} /> Kèm: {o.accompanyingOrder.transactionId}
                          </span>
                          <span className="fw-bold text-info-emphasis">
                            +{dinhDangTien(o.accompanyingOrder.netRevenue || 0)} đ
                          </span>
                        </div>
                        <div className="text-dark fw-medium text-truncate" style={{ maxWidth: '220px' }}>
                          {o.accompanyingOrder.productName}
                        </div>
                      </div>
                    )}
                  </td>

                  {/* Bảo hành & CSKH */}
                  <td className="text-center text-nowrap">
                    <div className="d-flex flex-column align-items-center gap-1">
                      {o.isWarrantyVoided || o.careStatus === 'DA_BAN_LAI' || o.careStatus === 'VOIDED' ? (
                        <span className="badge bg-dark bg-opacity-10 text-dark border border-dark border-opacity-25 py-0.5 px-2 d-inline-flex align-items-center gap-1" style={{ fontSize: '0.7rem' }}>
                          <XCircle size={11} className="text-secondary" />
                          <span>Đã thu lại (Vô hiệu)</span>
                        </span>
                      ) : (o.warrantyPeriod || o.warrantyExpiry ? (
                        <div className="d-flex flex-column align-items-center gap-0.5">
                          {countdown?.active ? (
                            <span className="badge bg-success bg-opacity-10 text-success border border-success-subtle py-0.5 px-2 d-inline-flex align-items-center gap-1" style={{ fontSize: '0.7rem' }}>
                              <ShieldCheck size={11} className="text-success" />
                              <span>Còn BH ({countdown.text})</span>
                            </span>
                          ) : (
                            <span className="badge bg-danger bg-opacity-10 text-danger border border-danger-subtle py-0.5 px-2 d-inline-flex align-items-center gap-1" style={{ fontSize: '0.7rem' }}>
                              <ShieldAlert size={11} className="text-danger" />
                              <span>Đã hết hạn BH</span>
                            </span>
                          )}
                          {o.warrantyExpiry && (
                            <small className={`fw-medium ${countdown?.active ? 'text-muted' : 'text-danger'}`} style={{ fontSize: '0.68rem' }}>
                              {countdown?.active ? 'Hạn:' : 'Đã hết:'} {formatDate(o.warrantyExpiry)} {!countdown?.active && `(${countdown.text})`}
                            </small>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted" style={{ fontSize: '0.7rem' }}>— Không BH —</span>
                      ))}

                      {/* Tiến trình CSKH */}
                      <OrderCareStatusBadge order={o} />
                    </div>
                  </td>

                  {/* Trạng thái */}
                  <td className="text-center text-nowrap">
                    <OrderStatusBadge status={o.orderStatus} />
                    {o.paymentStatus && (
                      <div className="text-secondary small mt-0.5" style={{ fontSize: '0.7rem' }}>
                        {o.paymentStatus}
                      </div>
                    )}
                  </td>

                  {/* Thành tiền */}
                  <td className="text-end text-nowrap">
                    <div className={`fw-bolder font-monospace fs-6 ${cancelled ? 'text-decoration-line-through text-muted' : 'text-success'}`}>
                      {dinhDangTien(o.combinedNetRevenue || o.netRevenue || 0)} đ
                    </div>
                    {Number(o.discount) > 0 && !cancelled && (
                      <div className="badge bg-danger bg-opacity-10 text-danger border border-danger-subtle mt-0.5" style={{ fontSize: '0.68rem' }}>
                        Giảm: -{dinhDangTien(o.discount)} đ
                      </div>
                    )}
                  </td>

                  {/* Thao tác */}
                  <td className="text-center text-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="d-flex align-items-center justify-content-center gap-1">
                      <button
                        type="button"
                        className={`btn btn-sm rounded-pill d-inline-flex align-items-center gap-1 py-1 px-2 shadow-2xs transition-all ${
                          isTargetCare
                            ? 'btn-primary text-white shadow-xs fw-bold'
                            : 'btn-outline-success hover-success'
                        }`}
                        style={{ fontSize: '0.75rem' }}
                        onClick={() => handleCareForOrder(o)}
                        title={canCare ? 'Ghi chú chăm sóc riêng cho hóa đơn này' : 'Yêu cầu quyền: Chăm sóc khách hàng (CSKH)'}
                      >
                        <MessageSquare size={11} />
                        <span>CSKH</span>
                        {!canCare && <Lock size={10} className="text-warning" />}
                      </button>

                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary rounded-pill d-inline-flex align-items-center gap-1 py-1 px-2 shadow-2xs hover-primary transition-all"
                        style={{ fontSize: '0.75rem' }}
                        onClick={() => setSelectedOrder(o)}
                        title="Xem chi tiết hóa đơn"
                      >
                        <Eye size={11} />
                        <span>Xem</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {/* Trạng thái trống */}
            {!loading && orders.length === 0 && !error && (
              <tr>
                <td colSpan={7} className="text-center py-5">
                  <div className="d-flex flex-column align-items-center text-muted">
                    <ShoppingBag size={44} className="mb-3 opacity-25" />
                    <h6 className="fw-medium text-dark mb-1">Không tìm thấy hóa đơn nào phù hợp.</h6>
                    <p className="small text-secondary mb-0">Khách hàng chưa có giao dịch nào theo bộ lọc danh mục đã chọn.</p>
                  </div>
                </td>
              </tr>
            )}

            {/* Trạng thái Loading */}
            {loading && (
              <tr>
                <td colSpan={7} className="text-center py-5">
                  <div className="spinner-border text-primary spinner-border-sm" role="status">
                    <span className="visually-hidden">Đang tải...</span>
                  </div>
                  <p className="text-muted small mt-2 mb-0">Đang tải lịch sử mua hàng của khách...</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Tải thêm */}
      {!loading && page + 1 < totalPages && (
        <div className="card-footer bg-white border-top text-center py-3">
          <button
            type="button"
            className="btn btn-sm btn-outline-primary rounded-pill px-4 py-2 fw-medium shadow-xs hover-primary transition-all"
            onClick={() => loadOrders(page + 1, true)}
          >
            Tải thêm hóa đơn cũ hơn
          </button>
        </div>
      )}
    </div>
  );
}

