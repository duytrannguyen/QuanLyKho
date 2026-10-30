import axiosClient from './axiosClient';

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const authApi = {
  login: (credentials) => axiosClient.post('/auth/login', credentials),
  refreshToken: (refreshToken) => axiosClient.post('/auth/refresh', { refreshToken }),
  getMe: () => axiosClient.get('/auth/me'),
};

export const userApi = {
  getProfile: () => axiosClient.get('/users/me'),
  updateProfile: (data) => axiosClient.put('/users/me', data),
  changePassword: (data) => axiosClient.put('/users/me/change-password', data),
  getPermissions: () => axiosClient.get('/users/permissions'),
};



export const dashboardApi = {
  getSummary: () => axiosClient.get('/dashboard/summary'),
  getPriorities: () => axiosClient.get('/dashboard/priorities'),
  getRecentActivity: () => axiosClient.get('/dashboard/recent-activity'),
};

export const apiMayMoc = {
  importSingle: (data) => axiosClient.post('/machines', data),
  importBulk: (data) => axiosClient.post('/machines/bulk', data),
  importBulkExcel: (formData) => axiosClient.post('/machines/bulk/excel', formData),
  previewBulkExcel: (formData) => axiosClient.post('/machines/bulk/preview-excel', formData),
  getBySerial: (serial) => axiosClient.get(`/machines/${serial}`),
  update: (serial, data) => axiosClient.put(`/machines/${serial}`, data),
  delete: (serial) => axiosClient.delete(`/machines/${serial}`),
  searchHistory: (params) => axiosClient.get('/machines/searchHistory', { params }),
  downloadExcelTemplate: (data) => axiosClient.post('/machines/bulk/excel-template', data, { responseType: 'blob' }),
};

export const apiNhapKho = {
  submitSingle: (data) => {
    const requestId = generateUUID();
    return axiosClient.post('/intake/single/submit', data, {
      headers: { 'X-Request-Id': requestId }
    });
  },
  submitBatch: (data) => {
    const requestId = generateUUID();
    return axiosClient.post('/intake/batch/submit', data, {
      headers: { 'X-Request-Id': requestId }
    });
  },
  submitPhuKien: (data) => {
    const requestId = generateUUID();
    return axiosClient.post('/accessory/submit', data, {
      headers: { 'X-Request-Id': requestId }
    });
  }
};

export const apiKiemDinh = {
  getActive: (status = '') =>
    axiosClient.get('/inspections', { params: status && status !== 'ALL' ? { status } : {} }),
  getById: (id) => axiosClient.get(`/inspections/${id}`),
  create: (data) => axiosClient.post('/inspections', data),
  updateProgress: (id, data) => axiosClient.put(`/inspections/${id}/progress`, data),
  start: (id) => axiosClient.post(`/inspections/${id}/start`),
  approve: (id, data) => axiosClient.post(`/inspections/${id}/approve`, data),
  reject: (id, data) => axiosClient.post(`/inspections/${id}/reject`, data),
  recheck: (id) => axiosClient.post(`/inspections/${id}/recheck`),
};

export const apiTonKho = {
  search: (params) => axiosClient.get('/inventory/search', { params }),
  getFilters: () => axiosClient.get('/inventory/filters'),
};

export const analyticsApi = {
  getSummary: (params) => axiosClient.get('/analytics/summary', { params }),
  getTrend: (params) => axiosClient.get('/analytics/trend', { params }),
  getValueStructure: (params) => axiosClient.get('/analytics/value-structure', { params }),
  getInventoryAge: (params) => axiosClient.get('/analytics/inventory-age', { params }),
  getTurnoverRate: (params) => axiosClient.get('/analytics/turnover-rate', { params }),
  getHighlights: (params) => axiosClient.get('/analytics/highlights', { params }),
  getInsights: (params) => axiosClient.get('/analytics/insights', { params }),
};

export const logApi = {
  getList: (params) => axiosClient.get('/logs', { params }),
};

export const systemApi = {
  getConfig: () => axiosClient.get('/system/config'),
  updateConfig: (key, value) => axiosClient.put(`/system/config/${key}`, { value }),
  getUsers: () => axiosClient.get('/users'),
  getPermissions: () => axiosClient.get('/users/permissions'),
  createUser: (data) => axiosClient.post('/users', data),
  updateUser: (id, data) => axiosClient.put(`/users/${id}`, data),
  changePassword: (id, newPassword) => axiosClient.put(`/users/${id}/change-password`, { newPassword }),
  toggleUserStatus: (id) => axiosClient.patch(`/users/${id}/toggle-status`),
  deleteUser: (id) => axiosClient.delete(`/users/${id}`),
};


export const syncApi = {
  run: (mode) => axiosClient.post('/sync/run', { mode }),
  getIssues: () => axiosClient.get('/sync/issues'),
  getRuns: () => axiosClient.get('/sync/runs'),
  getLatestStatus: () => axiosClient.get('/sync/latest-status', { silent: true }),
  recheckIssue: (id) => axiosClient.post(`/sync/issues/${id}/recheck`),
  resolveIssue: (id, note) => axiosClient.post(`/sync/issues/${id}/resolve`, { note }),
  resolveAllIssues: (issueType, note) => axiosClient.post('/sync/issues/resolve-all', { issueType, note }),
  approveReturn: (id, note) => axiosClient.post(`/sync/issues/${id}/approve-return`, { note }),
  getSyncSettings: () => axiosClient.get('/sync/settings'),
  updateSyncSettings: (settings) => axiosClient.post('/sync/settings', settings),
};

export const notificationApi = {
  getAll: (params) => axiosClient.get('/notifications', { params }),
  getUnreadCount: () => axiosClient.get('/notifications/unread-count', { silent: true }),
  markAsRead: (id) => axiosClient.put(`/notifications/${id}/read`),
  markAllAsRead: () => axiosClient.put('/notifications/read-all'),
  delete: (id) => axiosClient.delete(`/notifications/${id}`),
  deleteAllRead: () => axiosClient.delete('/notifications/read'),
  createTest: (data) => axiosClient.post('/notifications/test', data),
};

export const apiCatalog = {
  getBrands: () => axiosClient.get('/catalog/brands'),
  getModelLines: (brandId) => axiosClient.get('/catalog/model-lines', { params: brandId ? { brandId } : {} }),
  getPlatforms: (modelLineId) => axiosClient.get('/catalog/platforms', { params: modelLineId ? { modelLineId } : {} }),
  getConfigs: (variantId) => axiosClient.get('/catalog/configs', { params: variantId ? { variantId } : {} }),
};

export const priceListApi = {
  getConfigsByGroup: (platformIds) =>
    axiosClient.get('/pricelist/configs-by-group', { params: { platformIds: platformIds.join(',') } }),
};

export const apiPhuKien = {
  getAvailable: () => axiosClient.get('/accessory/available'),
  getAll: () => axiosClient.get('/accessory/all'),
  getHistory: () => axiosClient.get('/accessory/history'),
  sellStandalone: (payload) => axiosClient.post('/accessory/sell-standalone', payload),
  getOrders: () => axiosClient.get('/accessory/orders'),
  getOrderById: (id) => axiosClient.get(`/accessory/order/${id}`),
};

export const apiSuaChua = {
  getOrders: (params) => axiosClient.get('/repair', { params }),
  getOrderById: (id) => axiosClient.get(`/repair/${id}`),
  createOrder: (payload) => axiosClient.post('/repair', payload),
  updateOrder: (id, payload) => axiosClient.put(`/repair/${id}`, payload),
  searchServices: (params) => axiosClient.get('/repair/services', { params }),
};

export const apiBaoHanh = {
  checkWarranty: (keyword) => axiosClient.get(`/sale/warranty`, { params: { keyword } }),
  updateMachineOrder: (cycleId, payload) => axiosClient.put(`/sale/order/${cycleId}`, payload),
  updateAccessoryOrder: (orderId, payload) => axiosClient.put(`/sale/accessory-order/${orderId}`, payload),
  updateRepairOrder: (orderId, payload) => axiosClient.put(`/sale/repair-order/${orderId}`, payload),
};

export const salesReportApi = {
  getDashboard: (params) => axiosClient.get('/sales-report/dashboard', { params }),
  rebuild: () => axiosClient.post('/sales-report/rebuild'),
};

