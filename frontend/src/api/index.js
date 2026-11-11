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
  refreshToken: (refreshToken) => axiosClient.post('/auth/refresh', { refreshToken }, { silent: true }),
  getMe: () => axiosClient.get('/auth/me', { silent: true }),
};

export const userApi = {
  getProfile: () => axiosClient.get('/users/me', { silent: true }),
  updateProfile: (data) => axiosClient.put('/users/me', data),
  changePassword: (data) => axiosClient.put('/users/me/change-password', data),
  getPermissions: () => axiosClient.get('/users/permissions', { silent: true }),
};

export const dashboardApi = {
  getSummary: () => axiosClient.get('/dashboard/summary', { silent: true }),
  getPriorities: () => axiosClient.get('/dashboard/priorities', { silent: true }),
  getRecentActivity: () => axiosClient.get('/dashboard/recent-activity', { silent: true }),
};

export const apiMayMoc = {
  importSingle: (data) => axiosClient.post('/machines', data),
  importBulk: (data) => axiosClient.post('/machines/bulk', data),
  importBulkExcel: (formData) => axiosClient.post('/machines/bulk/excel', formData),
  previewBulkExcel: (formData) => axiosClient.post('/machines/bulk/preview-excel', formData),
  getBySerial: (serial) => axiosClient.get(`/machines/${serial}`, { silent: true }),
  update: (serial, data) => axiosClient.put(`/machines/${serial}`, data),
  bulkUpdatePrice: (serials, price) => axiosClient.put('/machines/bulk-price', { serials, price }),
  delete: (serial) => axiosClient.delete(`/machines/${serial}`),
  searchHistory: (params) => axiosClient.get('/machines/searchHistory', { params, silent: true }),
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
    axiosClient.get('/inspections', { params: status && status !== 'ALL' ? { status } : {}, silent: true }),
  getById: (id) => axiosClient.get(`/inspections/${id}`, { silent: true }),
  create: (data) => axiosClient.post('/inspections', data),
  updateProgress: (id, data) => axiosClient.put(`/inspections/${id}/progress`, data),
  start: (id) => axiosClient.post(`/inspections/${id}/start`),
  approve: (id, data) => axiosClient.post(`/inspections/${id}/approve`, data),
  reject: (id, data) => axiosClient.post(`/inspections/${id}/reject`, data),
  recheck: (id) => axiosClient.post(`/inspections/${id}/recheck`),
};

export const apiTonKho = {
  search: (params) => axiosClient.get('/inventory/search', { params, silent: true }),
  getFilters: () => axiosClient.get('/inventory/filters', { silent: true }),
};

export const analyticsApi = {
  getSummary: (params) => axiosClient.get('/analytics/summary', { params, silent: true }),
  getTrend: (params) => axiosClient.get('/analytics/trend', { params, silent: true }),
  getValueStructure: (params) => axiosClient.get('/analytics/value-structure', { params, silent: true }),
  getInventoryAge: (params) => axiosClient.get('/analytics/inventory-age', { params, silent: true }),
  getTurnoverRate: (params) => axiosClient.get('/analytics/turnover-rate', { params, silent: true }),
  getHighlights: (params) => axiosClient.get('/analytics/highlights', { params, silent: true }),
  getInsights: (params) => axiosClient.get('/analytics/insights', { params, silent: true }),
};

export const logApi = {
  getList: (params) => axiosClient.get('/logs', { params, silent: true }),
};

export const systemApi = {
  getConfig: () => axiosClient.get('/system/config', { silent: true }),
  updateConfig: (key, value) => axiosClient.put(`/system/config/${key}`, { value }),
  getUsers: () => axiosClient.get('/users', { silent: true }),
  getPermissions: () => axiosClient.get('/users/permissions', { silent: true }),
  createUser: (data) => axiosClient.post('/users', data),
  updateUser: (id, data) => axiosClient.put(`/users/${id}`, data),
  changePassword: (id, newPassword) => axiosClient.put(`/users/${id}/change-password`, { newPassword }),
  toggleUserStatus: (id) => axiosClient.patch(`/users/${id}/toggle-status`),
  deleteUser: (id) => axiosClient.delete(`/users/${id}`),
};

export const syncApi = {
  run: (mode) => axiosClient.post('/sync/run', { mode }),
  getIssues: () => axiosClient.get('/sync/issues', { silent: true }),
  getRuns: () => axiosClient.get('/sync/runs', { silent: true }),
  getLatestStatus: () => axiosClient.get('/sync/latest-status', { silent: true }),
  recheckIssue: (id) => axiosClient.post(`/sync/issues/${id}/recheck`),
  resolveIssue: (id, note) => axiosClient.post(`/sync/issues/${id}/resolve`, { note }),
  resolveAllIssues: (issueType, note) => axiosClient.post('/sync/issues/resolve-all', { issueType, note }),
  approveReturn: (id, note) => axiosClient.post(`/sync/issues/${id}/approve-return`, { note }),
  getSyncSettings: () => axiosClient.get('/sync/settings', { silent: true }),
  updateSyncSettings: (settings) => axiosClient.post('/sync/settings', settings),
};

export const notificationApi = {
  getAll: (params) => axiosClient.get('/notifications', { params, silent: true }),
  getUnreadCount: () => axiosClient.get('/notifications/unread-count', { silent: true }),
  markAsRead: (id) => axiosClient.put(`/notifications/${id}/read`),
  markAllAsRead: () => axiosClient.put('/notifications/read-all'),
  delete: (id) => axiosClient.delete(`/notifications/${id}`),
  deleteAllRead: () => axiosClient.delete('/notifications/read'),
  createTest: (data) => axiosClient.post('/notifications/test', data),
};

export const apiCatalog = {
  getBrands: () => axiosClient.get('/catalog/brands', { silent: true }),
  getModelLines: (brandId) => axiosClient.get('/catalog/model-lines', { params: brandId ? { brandId } : {}, silent: true }),
  getPlatforms: (modelLineId) => axiosClient.get('/catalog/platforms', { params: modelLineId ? { modelLineId } : {}, silent: true }),
  getConfigs: (variantId) => axiosClient.get('/catalog/configs', { params: variantId ? { variantId } : {}, silent: true }),
};

export const priceListApi = {
  getPlatformsByModelLine: (modelLineId) =>
    axiosClient.get('/pricelist/platforms', { params: modelLineId ? { modelLineId } : {}, silent: true }),
  getConfigsByGroup: (platformIds) =>
    axiosClient.get('/pricelist/configs-by-group', { params: { platformIds: platformIds.join(',') }, silent: true }),
  exportPdf: (payload) =>
    axiosClient.post('/pricelist/export-pdf', payload, { responseType: 'blob' }),
};

export const apiPhuKien = {
  getAvailable: () => axiosClient.get('/accessory/available', { silent: true }),
  getAll: (params) => axiosClient.get('/accessory/all', { params, silent: true }),
  getHistory: (params) => axiosClient.get('/accessory/history', { params, silent: true }),
  getNextSku: (category) => axiosClient.get('/accessory/next-sku', { params: { category }, silent: true }),
  importAccessory: (payload) => axiosClient.post('/accessory/submit', payload),
  updateAccessory: (id, payload) => axiosClient.put(`/accessory/${id}`, payload),
  deleteAccessory: (id) => axiosClient.delete(`/accessory/${id}`),
  sellStandalone: (payload) => axiosClient.post('/accessory/sell-standalone', payload),
  getOrders: () => axiosClient.get('/accessory/orders', { silent: true }),
  getOrderById: (id) => axiosClient.get(`/accessory/order/${id}`, { silent: true }),
  getDefaultGifts: () => axiosClient.get('/accessory/default-gifts', { silent: true }),
  saveDefaultGifts: (bundleJson) => axiosClient.post('/accessory/default-gifts/save', { bundleJson }),
};

export const apiSuaChua = {
  getOrders: (params) => axiosClient.get('/repair', { params, silent: true }),
  getOrderById: (id) => axiosClient.get(`/repair/${id}`, { silent: true }),
  getOrdersBySerial: (serial) => axiosClient.get('/repair/by-serial', { params: { serial }, silent: true }),
  createOrder: (payload) => axiosClient.post('/repair', payload),
  updateOrder: (id, payload) => axiosClient.put(`/repair/${id}`, payload),
  updateOrderStatus: (id, status) => axiosClient.put(`/repair/${id}/status`, { status }),
  searchServices: (params) => axiosClient.get('/repair/services', { params, silent: true }),
};

export const apiBaoHanh = {
  checkWarranty: (keyword) => axiosClient.get(`/sale/warranty`, { params: { keyword }, silent: true }),
  getShippingOrders: (params) => axiosClient.get(`/sale/shipping-orders`, { params, silent: true }),
  updateMachineOrder: (cycleId, payload) => axiosClient.put(`/sale/order/${cycleId}`, payload),
  confirmDelivery: (cycleId, payload) => axiosClient.put(`/sale/order/${cycleId}/confirm-delivery`, payload),
  returnOrder: (cycleId, payload) => axiosClient.post(`/sale/order/${cycleId}/return-order`, payload),
  returnShippingOrder: (cycleId, payload) => axiosClient.post(`/sale/order/${cycleId}/return-shipping`, payload),
  updateAccessoryOrder: (orderId, payload) => axiosClient.put(`/sale/accessory-order/${orderId}`, payload),
  updateRepairOrder: (orderId, payload) => axiosClient.put(`/sale/repair-order/${orderId}`, payload),
};

export const apiDonShip = {
  getShippingOrders: (params) => axiosClient.get(`/sale/shipping-orders`, { params, silent: true }),
  confirmDelivery: (cycleId, payload) => axiosClient.put(`/sale/order/${cycleId}/confirm-delivery`, payload),
  returnOrder: (cycleId, payload) => axiosClient.post(`/sale/order/${cycleId}/return-shipping`, payload),
  updateOrder: (cycleId, payload) => axiosClient.put(`/sale/order/${cycleId}`, payload),
};

export const salesReportApi = {
  getDashboard: (params) => axiosClient.get('/sales-report/dashboard', { params, silent: true }),
  rebuild: () => axiosClient.post('/sales-report/rebuild'),
};

export const crmApi = {
  getSummary: () => axiosClient.get('/crm/summary', { silent: true }),
  searchCustomers: (params) => axiosClient.get('/crm/customers', { params, silent: true }),
  getCustomer: (id) => axiosClient.get(`/crm/customers/${id}`, { silent: true }),
  updateCustomer: (id, payload) => axiosClient.put(`/crm/customers/${id}`, payload),
  getCareNotes: (id, params) => axiosClient.get(`/crm/customers/${id}/care-notes`, { params, silent: true }),
  addCareNote: (id, payload) => axiosClient.post(`/crm/customers/${id}/care-notes`, payload),
  exportExcel: (params) => axiosClient.get('/crm/customers/export-excel', { params, responseType: 'blob' }),
  getCustomerOrders: (id, params) => axiosClient.get(`/crm/customers/${id}/orders`, { params, silent: true }),
  getOrder: (id) => axiosClient.get(`/crm/orders/${id}`, { silent: true }),
  getUnlinkedOrders: (params) => axiosClient.get('/crm/unlinked-orders', { params, silent: true }),
  assignOrder: (payload) => axiosClient.post('/crm/orders/assign', payload),
  rebuild: () => axiosClient.post('/crm/rebuild', null, { timeout: 300000 }),
  getExpiredWarrantySummary: () => axiosClient.get('/crm/expired-warranty/summary', { silent: true }),
  getExpiredWarrantyBrands: () => axiosClient.get('/crm/expired-warranty/brands', { silent: true }),
  getExpiredWarrantyOrders: (params) => axiosClient.get('/crm/expired-warranty/orders', { params, silent: true }),
  exportExpiredWarrantyExcel: (params) => axiosClient.get('/crm/expired-warranty/export-excel', { params, responseType: 'blob' }),
};

export const apiBanHang = {
  lookup: (keyword) => axiosClient.post('/sale/lookup', { keyword, serial: keyword }, { silent: true }),
  searchCandidates: (query) => axiosClient.get('/sale/search-candidates', { params: { query }, silent: true }),
  submitSale: (payload, requestId) => axiosClient.post('/sale/submit', payload, {
    headers: requestId ? { 'X-Request-Id': requestId } : {}
  }),
};

export const apiLinhKien = {
  getAll: (params) => axiosClient.get('/part/all', { params, silent: true }),
  getAvailable: (params) => axiosClient.get('/part/available', { params, silent: true }),
  getById: (id) => axiosClient.get(`/part/${id}`, { silent: true }),
  getNextSku: (category) => axiosClient.get('/part/next-sku', { params: { category }, silent: true }),
  getCategories: () => axiosClient.get('/part/categories', { silent: true }),
  importPart: (payload) => axiosClient.post('/part/import', payload),
  updatePart: (id, payload) => axiosClient.put(`/part/${id}`, payload),
  deletePart: (id) => axiosClient.delete(`/part/${id}`),
  getHistory: (params) => axiosClient.get('/part/history', { params, silent: true }),
};
