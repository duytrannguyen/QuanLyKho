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
  getMe: () => axiosClient.get('/auth/me'),
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
  createUser: (data) => axiosClient.post('/users', data),
  updateUser: (id, data) => axiosClient.put(`/users/${id}`, data),
};

export const syncApi = {
  run: (mode) => axiosClient.post('/sync/run', { mode }),
  getIssues: () => axiosClient.get('/sync/issues'),
  getRuns: () => axiosClient.get('/sync/runs'),
  recheckIssue: (id) => axiosClient.post(`/sync/issues/${id}/recheck`),
  resolveIssue: (id, note) => axiosClient.post(`/sync/issues/${id}/resolve`, { note }),
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
