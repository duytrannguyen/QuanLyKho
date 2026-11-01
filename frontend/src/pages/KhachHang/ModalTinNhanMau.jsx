import React, { useState } from 'react';
import { X, Copy, Check, MessageSquare, Send, Sparkles } from 'lucide-react';
import { formatDate } from '../../utils/dinh_dang';

export default function ModalTinNhanMau({ customer, orders = [], onClose }) {
  const [copiedIdx, setCopiedIdx] = useState(null);

  // Tìm hóa đơn máy gần nhất để lấy thông tin model máy và hạn bảo hành
  const latestMachine = orders.find(o => o.orderCategory === 'MACHINE') || orders[0];
  const customerName = customer?.fullName || 'Quý khách';
  const modelName = latestMachine?.productName || latestMachine?.modelName || 'Laptop';
  const warrantyDate = latestMachine?.warrantyExpiry ? formatDate(latestMachine.warrantyExpiry) : 'sắp tới';
  const cleanPhone = customer?.phone ? customer.phone.replace(/\D/g, '') : '';

  const templates = [
    {
      id: 'maintenance',
      title: '1. Nhắc lịch bảo dưỡng & vệ sinh định kỳ',
      badge: 'Bảo dưỡng máy',
      badgeClass: 'bg-warning text-dark',
      content: `Dạ chào anh/chị ${customerName}, QKShop xin phép gửi thông báo chăm sóc máy:\nChiếc ${modelName} của anh/chị hiện đã đến kỳ bảo dưỡng, vệ sinh quạt gió và thay keo tản nhiệt định kỳ.\nQKShop trân trọng mời anh/chị mang máy ghé cửa hàng để kỹ thuật hỗ trợ vệ sinh miễn phí và kiểm tra toàn diện giúp máy chạy êm ái, mát mẻ nhất nhé ạ!\nHotline/Zalo hỗ trợ: 0939.558.894 - QKShop hân hạnh phục vụ anh/chị.`,
    },
    {
      id: 'warranty_alert',
      title: '2. Thông báo sắp hết hạn bảo hành',
      badge: 'Cận hạn bảo hành',
      badgeClass: 'bg-danger text-white',
      content: `Dạ chào anh/chị ${customerName}, QKShop xin thông báo gói bảo hành cho chiếc ${modelName} của anh/chị sẽ hết hạn vào ngày ${warrantyDate}.\nAnh/chị vui lòng kiểm tra lại tổng thể máy hoạt động có vấn đề gì cần hỗ trợ không ạ? Nếu có hiện tượng bất thường, anh/chị mang máy qua trước ngày ${warrantyDate} để QKShop kiểm tra và xử lý bảo hành chu đáo nhất cho mình nhé!\nChúc anh/chị luôn có trải nghiệm tuyệt vời cùng QKShop!`,
    },
    {
      id: 'thanks',
      title: '3. Cảm ơn mua hàng & hỗ trợ kỹ thuật trọn đời',
      badge: 'Hậu mãi',
      badgeClass: 'bg-primary text-white',
      content: `Dạ QKShop xin chân thành cảm ơn anh/chị ${customerName} đã tin tưởng lựa chọn mua ${modelName} tại cửa hàng chúng em!\nTrong suốt quá trình sử dụng, nếu cần cài đặt phần mềm, vệ sinh máy hay hỗ trợ kỹ thuật, anh/chị cứ nhắn trực tiếp qua Zalo này để được đội ngũ kỹ thuật QKShop hỗ trợ nhanh nhất nhé ạ. Chúc anh/chị công việc thuận lợi và nhiều niềm vui!`,
    },
  ];

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2500);
  };

  const handleOpenZaloWithText = (text, idx) => {
    handleCopy(text, idx);
    if (cleanPhone) {
      window.open(`https://zalo.me/${cleanPhone}`, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      className="modal fade show d-block"
      tabIndex="-1"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(3px)' }}
    >
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
          
          {/* Header */}
          <div className="modal-header bg-primary text-white px-4 py-3 border-0">
            <div className="d-flex align-items-center gap-2">
              <div className="p-2 bg-white bg-opacity-20 rounded-circle text-white">
                <Sparkles size={20} />
              </div>
              <div>
                <h5 className="modal-title fw-bold mb-0">Bộ Mẫu Tin Nhắn Chăm Sóc Khách Hàng</h5>
                <small className="opacity-75">Tự động điền tên, model máy và thông tin bảo hành</small>
              </div>
            </div>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={onClose}
              aria-label="Close"
            />
          </div>

          {/* Body */}
          <div className="modal-body p-4 bg-light" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
            <div className="d-flex flex-column gap-3">
              {templates.map((tpl, idx) => {
                const isCopied = copiedIdx === idx;
                return (
                  <div key={tpl.id} className="card border-0 shadow-sm rounded-4 overflow-hidden">
                    <div className="card-header bg-white py-3 px-3 d-flex align-items-center justify-content-between border-bottom">
                      <div className="d-flex align-items-center gap-2">
                        <span className={`badge rounded-pill ${tpl.badgeClass} px-2 py-1 small fw-medium`}>
                          {tpl.badge}
                        </span>
                        <strong className="text-dark small">{tpl.title}</strong>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <button
                          type="button"
                          className={`btn btn-sm ${isCopied ? 'btn-success' : 'btn-outline-secondary'} rounded-pill d-inline-flex align-items-center gap-1 px-3`}
                          onClick={() => handleCopy(tpl.content, idx)}
                          title="Sao chép nội dung"
                        >
                          {isCopied ? <Check size={14} /> : <Copy size={14} />}
                          <span>{isCopied ? 'Đã chép' : 'Sao chép'}</span>
                        </button>
                        {cleanPhone && (
                          <button
                            type="button"
                            className="btn btn-sm btn-primary rounded-pill d-inline-flex align-items-center gap-1 px-3"
                            onClick={() => handleOpenZaloWithText(tpl.content, idx)}
                            title="Sao chép nội dung và mở Zalo chat với khách"
                          >
                            <MessageSquare size={14} />
                            <span>Mở Zalo</span>
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="card-body p-3 bg-white">
                      <pre
                        className="mb-0 text-secondary font-monospace small p-3 bg-light rounded-3 border"
                        style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'inherit' }}
                      >
                        {tpl.content}
                      </pre>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer bg-white border-top px-4 py-3 d-flex justify-content-between align-items-center">
            <span className="text-muted small">
              Mẹo: Khi bấm <strong>"Mở Zalo"</strong>, hệ thống tự động chép nội dung tin nhắn vào bộ nhớ đệm để bạn dán (Ctrl+V) gửi ngay cho khách.
            </span>
            <button type="button" className="btn btn-secondary rounded-pill px-4" onClick={onClose}>
              Đóng
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
