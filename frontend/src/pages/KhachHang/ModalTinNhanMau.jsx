import React, { useState } from 'react';
import { X, Copy, Check, MessageSquare, Send, Sparkles, User, Laptop, Calendar, Gift, HeartHandshake } from 'lucide-react';
import { formatDate } from '../../utils/dinh_dang';

export default function ModalTinNhanMau({ customer, orders = [], onClose }) {
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [activeTab, setActiveTab] = useState('all');

  // Tìm hóa đơn máy gần nhất để lấy thông tin model máy và hạn bảo hành
  const latestMachine = orders.find(o => o.orderCategory === 'MACHINE') || orders[0];
  const customerName = customer?.fullName || 'Quý khách';
  const modelName = latestMachine?.productName || latestMachine?.modelName || 'Laptop';
  const warrantyDate = latestMachine?.warrantyExpiry ? formatDate(latestMachine.warrantyExpiry) : 'sắp tới';
  const cleanPhone = customer?.phone ? customer.phone.replace(/\D/g, '') : '';

  const templates = [
    {
      id: 'maintenance',
      category: 'CARE',
      title: '1. Nhắc lịch bảo dưỡng & vệ sinh định kỳ (6 - 12 tháng)',
      badge: 'Bảo dưỡng máy',
      badgeClass: 'bg-warning text-dark',
      icon: Sparkles,
      content: `Dạ chào anh/chị ${customerName}, QKShop xin phép gửi thông báo chăm sóc máy:\nChiếc ${modelName} của anh/chị hiện đã đến kỳ bảo dưỡng, vệ sinh quạt gió và thay keo tản nhiệt định kỳ.\nQKShop trân trọng mời anh/chị mang máy ghé cửa hàng để kỹ thuật hỗ trợ vệ sinh miễn phí và kiểm tra toàn diện giúp máy chạy êm ái, mát mẻ nhất nhé ạ!\nHotline/Zalo hỗ trợ: 0939.558.894 - QKShop hân hạnh phục vụ anh/chị.`,
    },
    {
      id: 'warranty_alert',
      category: 'WARRANTY',
      title: '2. Cảnh báo sắp hết hạn bảo hành (Trong 30 ngày tới)',
      badge: 'Cận hạn bảo hành',
      badgeClass: 'bg-danger text-white',
      icon: Calendar,
      content: `Dạ chào anh/chị ${customerName}, QKShop xin thông báo gói bảo hành cho chiếc ${modelName} của anh/chị sẽ hết hạn vào ngày ${warrantyDate}.\nAnh/chị vui lòng kiểm tra lại tổng thể máy hoạt động có vấn đề gì cần hỗ trợ không ạ? Nếu có hiện tượng bất thường, anh/chị mang máy qua trước ngày ${warrantyDate} để QKShop kiểm tra và xử lý bảo hành chu đáo nhất cho mình nhé!\nChúc anh/chị luôn có trải nghiệm tuyệt vời cùng QKShop!`,
    },
    {
      id: 'thanks',
      category: 'THANKS',
      title: '3. Cảm ơn mua hàng & hỗ trợ kỹ thuật trọn đời',
      badge: 'Hậu mãi',
      badgeClass: 'bg-primary text-white',
      icon: HeartHandshake,
      content: `Dạ QKShop xin chân thành cảm ơn anh/chị ${customerName} đã tin tưởng lựa chọn mua ${modelName} tại cửa hàng chúng em!\nTrong suốt quá trình sử dụng, nếu cần cài đặt phần mềm, vệ sinh máy hay hỗ trợ kỹ thuật, anh/chị cứ nhắn trực tiếp qua Zalo này để được đội ngũ kỹ thuật QKShop hỗ trợ nhanh nhất nhé ạ. Chúc anh/chị công việc thuận lợi và nhiều niềm vui!`,
    },
    {
      id: 'birthday',
      category: 'CARE',
      title: '4. Chúc mừng sinh nhật & Ưu đãi đặc quyền',
      badge: 'Sinh nhật',
      badgeClass: 'bg-info text-dark',
      icon: Gift,
      content: `Dạ QKShop chúc mừng sinh nhật anh/chị ${customerName}! 🎂\nNhân dịp sinh nhật, QKShop xin gửi tặng anh/chị Voucher giảm 10% khi nâng cấp linh kiện (RAM, SSD) hoặc mua phụ kiện, kèm dịch vụ vệ sinh máy miễn phí.\nChúc anh/chị tuổi mới nhiều sức khỏe, may mắn và gặt hái nhiều thành công rực rỡ!`,
    },
    {
      id: 'repair_followup',
      category: 'CARE',
      title: '5. Thăm hỏi sau dịch vụ sửa chữa / thay linh kiện',
      badge: 'Sau sửa chữa',
      badgeClass: 'bg-secondary text-white',
      icon: Laptop,
      content: `Dạ chào anh/chị ${customerName}, kỹ thuật QKShop nhắn hỏi thăm tình trạng hoạt động của chiếc ${modelName} sau khi bên em hoàn tất kiểm tra và xử lý ạ. Hiện tại máy dùng ổn định và mượt mà chưa anh/chị? Nếu có bất kỳ điều gì cần hỗ trợ thêm, anh/chị cứ nhắn lại cho QKShop ngay nhé ạ!`,
    },
  ];

  const filteredTemplates = activeTab === 'all' 
    ? templates 
    : templates.filter(t => t.category === activeTab);

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
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(3px)', zIndex: 1070 }}
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
                <h5 className="modal-title fw-bold mb-0">Bộ Mẫu Tin Nhắn Chăm Sóc Khách Hàng (CSKH)</h5>
                <small className="opacity-75">
                  Đang áp dụng cho: <strong>{customerName}</strong> ({customer?.phone}) • Thiết bị: <strong>{modelName}</strong>
                </small>
              </div>
            </div>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={onClose}
              aria-label="Đóng"
            />
          </div>

          {/* Filter Sub-Tabs */}
          <div className="bg-light border-bottom px-4 py-2 d-flex align-items-center gap-2 flex-wrap">
            <span className="text-secondary small fw-medium me-1">Chủ đề:</span>
            <button
              type="button"
              className={`btn btn-sm rounded-pill px-3 py-1 ${activeTab === 'all' ? 'btn-primary' : 'btn-white bg-white text-secondary border'}`}
              onClick={() => setActiveTab('all')}
            >
              Tất cả ({templates.length})
            </button>
            <button
              type="button"
              className={`btn btn-sm rounded-pill px-3 py-1 ${activeTab === 'CARE' ? 'btn-primary' : 'btn-white bg-white text-secondary border'}`}
              onClick={() => setActiveTab('CARE')}
            >
              Chăm sóc & Bảo dưỡng
            </button>
            <button
              type="button"
              className={`btn btn-sm rounded-pill px-3 py-1 ${activeTab === 'WARRANTY' ? 'btn-primary' : 'btn-white bg-white text-secondary border'}`}
              onClick={() => setActiveTab('WARRANTY')}
            >
              Bảo hành
            </button>
            <button
              type="button"
              className={`btn btn-sm rounded-pill px-3 py-1 ${activeTab === 'THANKS' ? 'btn-primary' : 'btn-white bg-white text-secondary border'}`}
              onClick={() => setActiveTab('THANKS')}
            >
              Cảm ơn & Hậu mãi
            </button>
          </div>

          {/* Body */}
          <div className="modal-body p-4 bg-light" style={{ maxHeight: '68vh', overflowY: 'auto' }}>
            <div className="d-flex flex-column gap-3">
              {filteredTemplates.map((tpl, idx) => {
                const isCopied = copiedIdx === idx;
                const Icon = tpl.icon;
                return (
                  <div key={tpl.id} className="card border-0 shadow-sm rounded-4 overflow-hidden">
                    <div className="card-header bg-white py-3 px-3 d-flex align-items-center justify-content-between border-bottom flex-wrap gap-2">
                      <div className="d-flex align-items-center gap-2">
                        <span className={`badge rounded-pill ${tpl.badgeClass} px-2 py-1 small fw-medium d-inline-flex align-items-center gap-1`}>
                          <Icon size={12} /> {tpl.badge}
                        </span>
                        <strong className="text-dark small">{tpl.title}</strong>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <button
                          type="button"
                          className={`btn btn-sm ${isCopied ? 'btn-success text-white' : 'btn-outline-secondary'} rounded-pill d-inline-flex align-items-center gap-1 px-3 shadow-xs`}
                          onClick={() => handleCopy(tpl.content, idx)}
                          title="Sao chép nội dung tin nhắn"
                        >
                          {isCopied ? <Check size={14} /> : <Copy size={14} />}
                          <span>{isCopied ? 'Đã sao chép' : 'Sao chép'}</span>
                        </button>
                        {cleanPhone && (
                          <button
                            type="button"
                            className="btn btn-sm btn-primary rounded-pill d-inline-flex align-items-center gap-1 px-3 shadow-xs"
                            onClick={() => handleOpenZaloWithText(tpl.content, idx)}
                            title="Sao chép nội dung và mở Zalo chat với khách ngay"
                          >
                            <MessageSquare size={14} />
                            <span>Mở Zalo</span>
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="card-body p-3 bg-white">
                      <pre
                        className="mb-0 text-dark font-sans small p-3 bg-light rounded-3 border"
                        style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'inherit', lineHeight: 1.6 }}
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
              💡 <strong>Tiện ích Zalo:</strong> Bấm <strong>"Mở Zalo"</strong> sẽ tự động sao chép tin nhắn và mở cửa sổ chat với khách hàng để bạn gửi ngay lập tức.
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
