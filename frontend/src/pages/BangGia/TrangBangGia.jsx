import { useState, useEffect } from 'react';
import { Tag, Printer, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { apiCatalog, priceListApi } from '../../api';
import { formatCurrency } from '../../utils/dinh_dang';
import logoQK from '../../assets/qkshop_logo.jpg';

function getShortModelName(fullName) {
  if (!fullName) return '';
  const kw = [" CPU", " /", " Ram", " RAM", " - CPU", " SSD", " - "];
  let minIdx = fullName.length;
  for (let k of kw) {
    const idx = fullName.toUpperCase().indexOf(k.toUpperCase());
    if (idx !== -1 && idx < minIdx) {
      minIdx = idx;
    }
  }
  return fullName.substring(0, minIdx).trim();
}
/* ============================================================
   Preview card (Bước 3 — hiển thị trên màn hình)
   ============================================================ */
function PriceCard({ item }) {
  const priceDisplay = item.editPrice
    ? formatCurrency(item.editPrice) + 'đ'
    : (item.defaultSalePrice ? formatCurrency(item.defaultSalePrice) + 'đ' : 'Liên hệ');

  return (
    <div style={{
      border: '1.5px solid #111',
      padding: '10px 14px', 
      display: 'flex', 
      flexDirection: 'column',
      fontFamily: 'Arial, Helvetica, sans-serif', 
      background: '#fff',
      width: '100%', 
      height: '100%', 
      overflow: 'hidden', 
      margin: 0,
      boxSizing: 'border-box'
    }}>
      {/* Logo: Cho lớn hơn nhưng thu gọn margin để bù trừ không gian */}
      <div style={{ textAlign: 'center', marginBottom: '6px' }}>
        <img src={logoQK} alt="QK Shop" style={{ height: '70px', maxWidth: '100%', objectFit: 'contain' , marginTop:'-17px'}} />
      </div>

      {/* Tên máy: Nền đen, tự do xuống dòng, căn giữa, chữ rõ nét */}
      <div style={{ 
        background: '#000', color: '#fff', textAlign: 'center', 
        fontWeight: 900, fontSize: '15px', lineHeight: 1.3, 
        padding: '6px 8px', width: '100%', boxSizing: 'border-box',
        wordWrap: 'break-word', flexShrink: 0, marginTop:'-20px' 
      }}>
        {getShortModelName(item.platformCode || item.platformName || item.configId)}
      </div>

      {/* Giá bán: Rõ ràng, nổi bật */}
      <div style={{ textAlign: 'center', fontWeight: 900, fontSize: '20px', margin: '8px 0 4px', color: '#000', flexShrink: 0 }}>
        Giá: {priceDisplay}
      </div>

      {/* Đường gạch ngang */}
      <div style={{ borderBottom: '2px solid #000', margin: '0 8px 8px', flexShrink: 0 }} />

      {/* Thông số kỹ thuật: Tăng size lên một chút cho dễ đọc */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', overflow: 'hidden', fontSize: '12.5px', color: '#000', lineHeight: 1.25 }}>
        <div><b>CPU:</b> {item.cpuCode || ''}</div>
        <div><b>RAM:</b> {item.ramCode || ''}</div>
        <div><b>SSD:</b> {item.ssdCode || ''}</div>
        <div><b>Màn hình:</b> {item.screenSpec || ''}</div>
        <div><b>VGA:</b> {(item.gpuCode && item.gpuCode !== 'ONBOARD') ? item.gpuCode : ''}</div>
        <div><b>Trọng lượng:</b> {item.weightKg ? `${item.weightKg}` : ''}{item.weightKg ? <i style={{fontWeight: 'normal'}}>Kg</i> : ''}</div>
      </div>

      {/* Khối bảo hành (Nền xám đậm): Rút gọn margin */}
      <div style={{ background: '#333', color: '#fff', textAlign: 'center', fontWeight: 700, fontSize: '13px', padding: '8px 4px', margin: '8px 0', flexShrink: 0 }}>
        {item.warrantyText || 'Bảo hành phần cứng 06 tháng'}
      </div>

      {/* Chính sách: Kích thước dễ nhìn hơn, in nghiêng đậm. Thêm CSS bọc chữ để không bị tràn/ẩn */}
      <div style={{ 
        fontSize: '9px', fontStyle: 'italic', fontWeight: 700, 
        lineHeight: 1.35, color: '#000', flexShrink: 0,
        whiteSpace: 'normal', wordWrap: 'break-word'
      }}>
        <div>- Vệ sinh bảo dưỡng, cài đặt máy miễn phí.</div>
        <div>- 1 đổi 1 trong vòng 07 ngày đầu nếu lỗi do nhà sx.</div>
        <div>- QUÀ TẶNG: Balo, chuột không dây, miếng lót chuột và túi chống sốc.</div>
      </div>
    </div>
  );
}

/* ============================================================
   Bước 1: Chọn nhóm máy
   ============================================================ */
function StepChonNhom({ onNext }) {
  const [brands, setBrands] = useState([]);
  const [modelLines, setModelLines] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [selectedModelLine, setSelectedModelLine] = useState(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState(new Map());
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [loadingML, setLoadingML] = useState(false);
  const [loadingPF, setLoadingPF] = useState(false);

  const [brandSearch, setBrandSearch] = useState('');
  const [mlSearch, setMlSearch] = useState('');
  const [pfSearch, setPfSearch] = useState('');

  useEffect(() => {
    apiCatalog.getBrands()
      .then(res => setBrands(res.data || []))
      .catch(console.error)
      .finally(() => setLoadingBrands(false));
  }, []);

  const handleSelectBrand = (brand) => {
    setSelectedBrand(brand);
    setSelectedModelLine(null);
    setPlatforms([]);
    // Do not clear selectedPlatformIds to allow multi-brand selection
    setLoadingML(true);
    setMlSearch('');
    setPfSearch('');
    apiCatalog.getModelLines(brand.brandId)
      .then(res => setModelLines(res.data || []))
      .catch(console.error)
      .finally(() => setLoadingML(false));
  };

  const handleSelectModelLine = (ml) => {
    setSelectedModelLine(ml);
    // Do not clear selectedPlatformIds to allow multi-modelLine selection
    setLoadingPF(true);
    setPfSearch('');
    apiCatalog.getPlatforms(ml.modelLineId)
      .then(res => {
        const data = res.data || [];
        const grouped = new Map();
        data.forEach(p => {
          const name = getShortModelName(p.platformCode || p.displayName);
          if (!grouped.has(name)) {
            grouped.set(name, { ...p, platformIds: [p.platformId], shortName: name });
          } else {
            grouped.get(name).platformIds.push(p.platformId);
          }
        });
        setPlatforms(Array.from(grouped.values()));
      })
      .catch(console.error)
      .finally(() => setLoadingPF(false));
  };

  const togglePlatform = (pf) => {
    setSelectedPlatforms(prev => {
      const next = new Map(prev);
      if (next.has(pf.shortName)) next.delete(pf.shortName);
      else next.set(pf.shortName, pf);
      return next;
    });
  };

  const filteredBrands = brands.filter(b => (b.brandName || '').toLowerCase().includes((brandSearch || '').toLowerCase()));
  const filteredML = modelLines.filter(ml => (ml.modelLineName || '').toLowerCase().includes((mlSearch || '').toLowerCase()));
  const filteredPF = platforms.filter(pf => {
    const searchStr = (pf.shortName || '').toLowerCase();
    return searchStr.includes((pfSearch || '').toLowerCase());
  });

  return (
    <div className="card shadow-sm border-0 mb-4 p-4">
      <h4 className="fw-bold d-flex align-items-center gap-2 mb-4">
        <span className="badge bg-primary rounded-circle p-2 d-flex align-items-center justify-content-center" style={{width:'32px',height:'32px'}}>1</span>
        Chọn nhóm máy muốn in bảng giá
      </h4>
      <div className="row g-3">
        <div className="col-md-3">
          <div className="card border">
            <div className="card-header bg-light fw-bold text-uppercase small text-secondary">Hãng</div>
            <div className="p-2 border-bottom bg-white">
              <input type="text" className="form-control form-control-sm" placeholder="Tìm hãng..." value={brandSearch} onChange={e => setBrandSearch(e.target.value)} />
            </div>
            <div className="list-group list-group-flush" style={{maxHeight:'400px',overflowY:'auto'}}>
              {loadingBrands && <div className="text-center p-3 text-secondary small">Đang tải...</div>}
              {filteredBrands.map(b => (
                <button key={b.brandId} className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center ${selectedBrand?.brandId === b.brandId ? 'active fw-bold' : ''}`} onClick={() => handleSelectBrand(b)}>
                  {b.brandName}
                  {selectedBrand?.brandId === b.brandId && <ChevronRight size={14} />}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border">
            <div className="card-header bg-light fw-bold text-uppercase small text-secondary">Dòng máy</div>
            <div className="p-2 border-bottom bg-white">
              <input type="text" className="form-control form-control-sm" placeholder="Tìm dòng máy..." value={mlSearch} onChange={e => setMlSearch(e.target.value)} />
            </div>
            <div className="list-group list-group-flush" style={{maxHeight:'400px',overflowY:'auto'}}>
              {loadingML && <div className="text-center p-3 text-secondary small">Đang tải...</div>}
              {!selectedBrand && !loadingML && <div className="text-center p-3 text-secondary small">← Chọn hãng trước</div>}
              {filteredML.map(ml => (
                <button key={ml.modelLineId} className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center ${selectedModelLine?.modelLineId === ml.modelLineId ? 'active fw-bold' : ''}`} onClick={() => handleSelectModelLine(ml)}>
                  {ml.modelLineName}
                  {selectedModelLine?.modelLineId === ml.modelLineId && <ChevronRight size={14} />}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border">
            <div className="card-header bg-light fw-bold text-uppercase small text-secondary d-flex justify-content-between align-items-center">
              Model cụ thể
              {platforms.length > 0 && <button className="btn btn-sm btn-link text-decoration-none p-0" onClick={() => setSelectedPlatforms(prev => {
                const next = new Map(prev);
                filteredPF.forEach(p => next.set(p.shortName, p));
                return next;
              })}>Chọn tất cả</button>}
            </div>
            <div className="p-2 border-bottom bg-white">
              <input type="text" className="form-control form-control-sm" placeholder="Tìm model..." value={pfSearch} onChange={e => setPfSearch(e.target.value)} />
            </div>
            <div className="list-group list-group-flush" style={{maxHeight:'400px',overflowY:'auto'}}>
              {loadingPF && <div className="text-center p-3 text-secondary small">Đang tải...</div>}
              {!selectedModelLine && !loadingPF && <div className="text-center p-3 text-secondary small">← Chọn dòng máy trước</div>}
              {filteredPF.map(pf => (
                <label key={pf.shortName} className={`list-group-item list-group-item-action d-flex align-items-center gap-2 ${selectedPlatforms.has(pf.shortName) ? 'bg-primary bg-opacity-10 text-primary fw-bold' : ''}`}>
                  <input type="checkbox" className="form-check-input mt-0" checked={selectedPlatforms.has(pf.shortName)} onChange={() => togglePlatform(pf)} />
                  <div className="d-flex flex-column">
                    <span>{pf.shortName}</span>
                    <span className="text-secondary small" style={{fontSize: '11px'}}>{pf.displayName}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border border-primary h-100">
            <div className="card-header bg-primary text-white fw-bold text-uppercase small d-flex justify-content-between align-items-center">
              Đã chọn ({selectedPlatforms.size})
              {selectedPlatforms.size > 0 && <button className="btn btn-sm btn-link text-white p-0 text-decoration-none" onClick={() => setSelectedPlatforms(new Map())}>Xóa hết</button>}
            </div>
            <div className="list-group list-group-flush" style={{maxHeight:'434px',overflowY:'auto'}}>
              {selectedPlatforms.size === 0 && <div className="text-center p-3 text-secondary small">Chưa có máy nào</div>}
              {Array.from(selectedPlatforms.values()).map(pf => (
                <div key={pf.shortName} className="list-group-item d-flex justify-content-between align-items-center bg-light">
                  <div className="d-flex flex-column">
                    <span className="small fw-bold">{pf.shortName}</span>
                    <span className="text-secondary" style={{fontSize:'10px'}}>{pf.displayName}</span>
                  </div>
                  <button className="btn-close ms-2" style={{fontSize: '10px'}} onClick={() => togglePlatform(pf)}></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="d-flex align-items-center justify-content-between mt-4 pt-3 border-top">
        <span className="text-secondary small">Đã chọn: <b>{selectedPlatforms.size}</b> model</span>
        <button className="btn btn-primary d-flex align-items-center gap-2" disabled={selectedPlatforms.size === 0} onClick={() => {
          const allIds = [];
          Array.from(selectedPlatforms.values()).forEach(p => {
            if (p.platformIds) allIds.push(...p.platformIds);
            else allIds.push(p.platformId);
          });
          onNext(allIds);
        }}>
          Tiếp theo — Chỉnh sửa bảng giá <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   Bước 2: Chỉnh sửa thông tin
   ============================================================ */
function StepChinhSua({ platformIds, onBack, onNext }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    priceListApi.getConfigsByGroup(platformIds)
      .then(res => {
        const data = res.data || [];
        const uniqueItems = new Map();
        
        data.forEach(item => {
          const key = `${item.platformName}|${item.cpuCode}|${item.ramCode}|${item.ssdCode}|${item.screenSpec}|${item.gpuCode}`;
          if (!uniqueItems.has(key)) {
            uniqueItems.set(key, {
              ...item,
              editPrice: item.defaultSalePrice ? String(item.defaultSalePrice) : '',
              warrantyText: item.warrantyText || '',
              screenSpec: item.screenSpec || '',
              gpuCode: item.gpuCode || '',
              weightKg: item.weightKg || '',
              printQty: 1,
            });
          }
        });
        
        setItems(Array.from(uniqueItems.values()));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [platformIds]);

  const updateItem = (configId, field, value) => {
    setItems(prev => prev.map(it => it.configId === configId ? { ...it, [field]: value } : it));
  };

  const totalPrint = items.reduce((sum, item) => sum + (parseInt(item.printQty) || 0), 0);

  const handleNextStep2 = () => {
    const toPrint = [];
    items.forEach(it => {
      const qty = parseInt(it.printQty) || 0;
      for (let i = 0; i < qty; i++) {
        // create a new instance for each print to avoid key conflicts
        toPrint.push({...it, configId: `${it.configId}_${i}`});
      }
    });
    onNext(toPrint);
  };

  return (
    <div className="card shadow-sm border-0 mb-4 p-4">
      <h4 className="fw-bold d-flex align-items-center gap-2 mb-4">
        <span className="badge bg-primary rounded-circle p-2 d-flex align-items-center justify-content-center" style={{width:'32px',height:'32px'}}>2</span>
        Chỉnh sửa thông tin bảng giá
      </h4>

      {loading ? (
        <div className="text-center p-5 text-secondary">
          <div className="spinner-border text-primary" role="status" />
          <div className="mt-2">Đang tải cấu hình...</div>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center p-5 text-secondary">Không tìm thấy cấu hình cho các model đã chọn.</div>
      ) : (
        <div className="table-responsive border rounded">
          <table className="table table-hover mb-0 align-middle">
            <thead className="table-light">
              <tr>
                <th style={{width:60}} className="text-center">SL In</th>
                <th>Tên máy / Cấu hình</th>
                <th style={{width:160}}>Giá bán</th>
                <th style={{width:130}}>Màn hình</th>
                <th style={{width:130}}>VGA</th>
                <th style={{width:90}}>Nặng</th>
                <th style={{width:180}}>Bảo hành</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.configId} className={item.printQty === 0 ? 'opacity-50' : ''}>
                  <td className="text-center">
                    <input type="number" min="0" className="form-control form-control-sm text-center px-1" value={item.printQty} onChange={e => updateItem(item.configId, 'printQty', parseInt(e.target.value) || 0)} />
                  </td>
                  <td>
                    <div className="fw-bold">{getShortModelName(item.platformCode || item.platformName)}</div>
                    <div className="text-secondary small">{item.configName || item.platformName}</div>
                    <div className="text-muted" style={{fontSize:'10px'}}>{item.configId}</div>
                  </td>
                  <td>
                    <div className="input-group input-group-sm mb-1">
                      <input type="text" className="form-control" placeholder="Giá..." value={item.editPrice} onChange={e => updateItem(item.configId, 'editPrice', e.target.value.replace(/[^0-9]/g, ''))} />
                      {item.defaultSalePrice && item.editPrice !== String(item.defaultSalePrice) && (
                        <button className="btn btn-outline-secondary" title="Khôi phục giá" onClick={() => updateItem(item.configId, 'editPrice', String(item.defaultSalePrice))}>↺</button>
                      )}
                    </div>
                    {item.editPrice && <div className="text-success fw-bold small">{formatCurrency(item.editPrice)}đ</div>}
                    {!item.editPrice && <div className="text-danger small" style={{fontSize:'11px'}}>Chưa có giá</div>}
                  </td>
                  <td>
                    <input type="text" className="form-control form-control-sm" placeholder='VD: 15.6" FHD' value={item.screenSpec} onChange={e => updateItem(item.configId, 'screenSpec', e.target.value)} />
                  </td>
                  <td>
                    <input type="text" className="form-control form-control-sm" placeholder="VD: RTX 3050" value={item.gpuCode} onChange={e => updateItem(item.configId, 'gpuCode', e.target.value)} />
                  </td>
                  <td>
                    <input type="text" className="form-control form-control-sm" placeholder="VD: 1.95" value={item.weightKg} onChange={e => updateItem(item.configId, 'weightKg', e.target.value)} />
                  </td>
                  <td>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      list={`warranty-options-${item.configId}`}
                      placeholder="Chọn hoặc nhập..."
                      value={item.warrantyText}
                      onChange={e => updateItem(item.configId, 'warrantyText', e.target.value)}
                    />
                    <datalist id={`warranty-options-${item.configId}`}>
                      <option value="Bảo hành phần cứng 03 tháng" />
                      <option value="Bảo hành phần cứng 06 tháng" />
                      <option value="Bảo hành phần cứng 12 tháng" />
                    </datalist>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="d-flex align-items-center justify-content-between mt-4 pt-3 border-top">
        <button className="btn btn-outline-secondary d-flex align-items-center gap-2" onClick={onBack}><ChevronLeft size={16} /> Quay lại</button>
        <span className="text-secondary small">Tổng in: <b>{totalPrint}</b> thẻ (từ {items.length} máy)</span>
        <button className="btn btn-primary d-flex align-items-center gap-2" disabled={totalPrint === 0 || loading} onClick={handleNextStep2}>
          Xem trước & In <Printer size={16} />
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   Bước 3: Xem trước & In
   ============================================================ */
function StepXemTruoc({ items, onBack }) {
  const [pageSize, setPageSize] = useState('A4');
  const [loadingPdf, setLoadingPdf] = useState(false);

  const isA4  = pageSize === 'A4';
  const cols  = isA4 ? 3 : 2;
  const rows  = isA4 ? 3 : 2;
  const perPage = cols * rows;

  const pages = [];
  for (let i = 0; i < items.length; i += perPage) {
    pages.push(items.slice(i, i + perPage));
  }

  /* --- Hàm in: mở cửa sổ mới với HTML thuần --- */
  const handlePrint = () => {
    const logoSrc = logoQK;
    const pgW  = isA4 ? '210mm' : '148mm';
    const pgH  = isA4 ? '297mm' : '210mm';
    
    const pagesHtml = pages.map(pageItems => {
      const cardsHtml = pageItems.map(item => {
        const price = item.editPrice
          ? Number(item.editPrice).toLocaleString('vi-VN') + 'đ'
          : (item.defaultSalePrice ? Number(item.defaultSalePrice).toLocaleString('vi-VN') + 'đ' : 'Liên hệ');

        const specs = [
          `<div class="spec"><b>CPU:</b> ${item.cpuCode || ''}</div>`,
          `<div class="spec"><b>RAM:</b> ${item.ramCode || ''}</div>`,
          `<div class="spec"><b>SSD:</b> ${item.ssdCode || ''}</div>`,
          `<div class="spec"><b>Màn hình:</b> ${item.screenSpec || ''}</div>`,
          `<div class="spec"><b>VGA:</b> ${(item.gpuCode && item.gpuCode !== 'ONBOARD') ? item.gpuCode : ''}</div>`,
          `<div class="spec"><b>Trọng lượng:</b> ${item.weightKg ? `${item.weightKg}<i style="font-weight: normal;">Kg</i>` : ''}</div>`,
        ].join('');

        return `<div class="card">
          <div class="logo"><img src="${logoSrc}" alt="QK"/></div>
          <div class="model">${getShortModelName(item.platformCode || item.platformName || item.configId)}</div>
          <div class="price">Giá: ${price}</div>
          <div class="divider"></div>
          <div class="specs">${specs}</div>
          <div class="warranty">${item.warrantyText || 'Bảo hành phần cứng 06 tháng'}</div>
          <div class="policy">
            <div>- Vệ sinh bảo dưỡng, cài đặt máy miễn phí.</div>
            <div>- 1 đổi 1 trong vòng 07 ngày đầu nếu lỗi do nhà sx.</div>
            <div>- QUÀ TẶNG: Balo, chuột không dây, miếng lót chuột và túi chống sốc.</div>
          </div>
        </div>`;
      }).join('');

      return `<div class="page"><div class="grid">${cardsHtml}</div></div>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<title>Bảng giá - QK Shop</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Arial, Helvetica, sans-serif; }
@page { size: ${pgW} ${pgH}; margin: 0; }

.page {
  width: ${pgW};
  height: ${pgH};
  padding: 0;
  page-break-after: always;
  break-after: page;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}
.page:last-child { page-break-after: auto; break-after: auto; }

.grid {
  display: grid;
  grid-template-columns: repeat(${cols}, 1fr);
  grid-template-rows: repeat(${rows}, 1fr);
  gap: 5px;
  padding: 5px;
  width: 100%;
  height: 100%;
}

.card {
  border: 1.5px solid #111;
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  width: 100%;
  height: 100%;
  background: #fff;
}

.logo { text-align: center; margin-bottom: 6px; flex-shrink: 0; }
.logo img {
  height: 70px; max-width: 100%; object-fit: contain; margin-top: -17px;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}

.model {
  background: #000; color: #fff;
  text-align: center; font-weight: 900;
  font-size: 15px; line-height: 1.3;
  padding: 6px 8px; border-radius: 0; margin-top: -20px;
  word-wrap: break-word; flex-shrink: 0;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}

.price {
  text-align: center; font-weight: 900;
  font-size: 20px; margin: 8px 0 4px; color: #000;
  flex-shrink: 0;
}

.divider {
  border-bottom: 2px solid #000; height: 0;
  margin: 0 8px 8px; flex-shrink: 0;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}

.specs { flex: 1; overflow: hidden; display: flex; flex-direction: column; gap: 6px; color: #000;}
.spec { font-size: 12.5px; line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.warranty {
  background: #333; color: #fff;
  text-align: center; font-weight: 700;
  font-size: 13px; line-height: 1.4;
  padding: 8px 4px; border-radius: 0; margin: 8px 0;
  flex-shrink: 0;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}

.policy {
  font-size: 9px; font-style: italic; font-weight: 700; color: #000;
  line-height: 1.35; flex-shrink: 0;
}
/* ĐÃ CHỈNH SỬA TẠI ĐÂY */
.policy div { white-space: normal; word-wrap: break-word; }
</style>
</head>
<body>
${pagesHtml}
<script>
  window.onload = function() { setTimeout(function(){ window.print(); }, 500); };
</script>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=900,height=700');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  };

  /* --- Xuất PDF JasperReports (pixel-perfect) --- */
  const handleExportPdf = async () => {
    if (items.length === 0) return;
    setLoadingPdf(true);
    try {
      // Chuẩn bị payload: gửi kèm pageSize để backend chọn đúng template
      const payload = {
        pageSize: pageSize, // 'A4' hoặc 'A5'
        items: items.map(item => ({
          ...item,
          defaultSalePrice: item.editPrice !== undefined ? item.editPrice : item.defaultSalePrice,
          warrantyText: item.warrantyText || 'Bảo hành phần cứng 06 tháng'
        }))
      };

      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const res = await fetch(
        `http://localhost:8080/api/pricelist/export-pdf`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify(payload)
        }
      );
      if (!res.ok) throw new Error('Server trả về lỗi ' + res.status);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      alert('Lỗi khi tạo PDF: ' + err.message);
    } finally {
      setLoadingPdf(false);
    }
  };

  /* --- Preview trên màn hình --- */
  return (
    <div className="card shadow-sm border-0 p-4">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div className="d-flex align-items-center gap-3">
          <button className="btn btn-outline-secondary d-flex align-items-center gap-2" onClick={onBack}><ChevronLeft size={16} /> Quay lại</button>
          <h4 className="fw-bold m-0 d-flex align-items-center gap-2">
            <span className="badge bg-primary rounded-circle p-2 d-flex align-items-center justify-content-center" style={{width:'32px',height:'32px'}}>3</span>
            Xem trước & In
          </h4>
        </div>
        <div className="d-flex align-items-center gap-3">
          <div className="btn-group">
            <button className={`btn btn-sm ${isA4 ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setPageSize('A4')}>A4 (9 máy)</button>
            <button className={`btn btn-sm ${!isA4 ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setPageSize('A5')}>A5 (4 máy)</button>
          </div>
          <button
            className="btn btn-primary d-flex align-items-center gap-2"
            onClick={handleExportPdf}
            disabled={loadingPdf}>
            {loadingPdf
              ? <span className="spinner-border spinner-border-sm"/>
              : <Printer size={16} />}
            {loadingPdf ? ' Đang tạo PDF...' : ` In bảng giá PDF (${items.length} máy)`}
          </button>
        </div>
      </div>

      {/* Preview */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'flex-start' }}>
        {pages.map((pageItems, pageIdx) => (
          <div key={pageIdx} style={{
            background: '#fff', boxShadow: '0 2px 16px rgba(0,0,0,.15)',
            width: isA4 ? '210mm' : '148mm',
            minHeight: isA4 ? '297mm' : '210mm',
            padding: 0,
            display: 'flex', justifyContent: 'center', alignItems: 'flex-start'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${cols}, 1fr)`,
              gridTemplateRows: `repeat(${rows}, 1fr)`,
              gap: '5px',
              padding: '5px',
              width: '100%',
              height: '100%',
            }}>
              {pageItems.map(item => (
                <PriceCard key={item.configId} item={item} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   Trang chính
   ============================================================ */
export default function TrangBangGia() {
  const [step, setStep] = useState(1);
  const [selectedPlatformIds, setSelectedPlatformIds] = useState([]);
  const [printItems, setPrintItems] = useState([]);

  return (
    <>
      <div className="container-fluid p-0">
        <div className="mb-4">
          <h2 className="fw-bold d-flex align-items-center gap-2">
            <Tag size={28} /> Bảng giá
          </h2>
          <p className="text-secondary">Tạo và in bảng giá theo nhóm sản phẩm (A4 = 9 máy, A5 = 4 máy)</p>
        </div>

        {/* Progress steps */}
        <div className="d-flex align-items-center mb-4 gap-3">
          {[{n:1,label:'Chọn nhóm máy'},{n:2,label:'Chỉnh sửa'},{n:3,label:'In bảng giá'}].map(({n, label}) => (
            <div key={n} className="d-flex align-items-center gap-2" style={{opacity: step >= n ? 1 : 0.4}}>
              <div className={`rounded-circle d-flex align-items-center justify-content-center fw-bold ${step === n ? 'bg-primary text-white' : 'bg-secondary text-white'}`} style={{width:'28px',height:'28px'}}>
                {step > n ? <Check size={16} /> : n}
              </div>
              <span className={`fw-bold ${step === n ? 'text-primary' : ''}`}>{label}</span>
              {n < 3 && <div className="bg-secondary opacity-25 ms-2" style={{width:'40px',height:'2px'}} />}
            </div>
          ))}
        </div>

        {step === 1 && <StepChonNhom onNext={ids => { setSelectedPlatformIds(ids); setStep(2); }} />}
        {step === 2 && <StepChinhSua platformIds={selectedPlatformIds} onBack={() => setStep(1)} onNext={its => { setPrintItems(its); setStep(3); }} />}
        {step === 3 && <StepXemTruoc items={printItems} onBack={() => setStep(2)} />}
      </div>
    </>
  );
}