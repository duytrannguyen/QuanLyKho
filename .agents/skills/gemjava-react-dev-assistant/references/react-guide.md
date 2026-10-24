# React 19 & Vite Guide - QKShop

Tài liệu hướng dẫn phát triển Frontend cho dự án Quản Lý Kho QKShop.

## 1. Phiên bản & Công nghệ
- **React**: Version 19.x
- **Bundler**: Vite 6.x
- **Router**: React Router 7.x
- **CSS Framework**: Bootstrap 5.3.x
- **Icons**: Lucide React
- **Biểu đồ**: Recharts
- **HTTP Client**: Axios (qua wrapper `axiosClient.js`)

## 2. Chuẩn mực Khai báo API Client
Trong `frontend/src/api/index.js`:
```javascript
export const apiFeature = {
  list: (params) => axiosClient.get('/feature', { params }),
  getById: (id) => axiosClient.get(`/feature/${id}`),
  create: (data) => axiosClient.post('/feature', data),
  update: (id, data) => axiosClient.put(`/feature/${id}`, data),
  remove: (id) => axiosClient.delete(`/feature/${id}`),
};
```

## 3. Cấu trúc Trang & Thành phần (Page / Component Pattern)
- Tách biệt rõ ràng logic gọi API, state hiển thị (loading, data, error) và giao diện JSX.
- Sử dụng hàm định dạng tiền tệ từ `src/utils/dinh_dang.js`:
  ```javascript
  import { dinhDangTien } from '../../utils/dinh_dang';
  // Hiển thị: dinhDangTien(item.salePrice)
  ```
- Xử lý lỗi API thân thiện:
  ```javascript
  try {
    setLoading(true);
    const res = await apiFeature.create(formData);
    toast.success(res.data?.message || 'Thao tác thành công');
  } catch (err) {
    const errorMsg = err.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại';
    toast.error(errorMsg);
  } finally {
    setLoading(false);
  }
  ```
