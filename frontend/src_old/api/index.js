import axiosClient from './axiosClient';

export const authApi = {
  login: (credentials) => axiosClient.post('/auth/login', credentials),
  getMe: () => axiosClient.get('/auth/me'),
};

export const dashboardApi = {
  getSummary: () => axiosClient.get('/dashboard/summary'),
  getPriorities: () => axiosClient.get('/dashboard/priorities'),
  getRecentActivity: () => axiosClient.get('/dashboard/recent-activity'),
};

export const machineApi = {
  importOne: (data) => axiosClient.post('/machines', data),
  importBulk: (formData) => axiosClient.post('/machines/bulk', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  recognize: (data) => axiosClient.post('/machines/recognize', data),
  getBySerial: (serial) => axiosClient.get(`/machines/${serial}`),
  update: (serial, data) => axiosClient.put(`/machines/${serial}`, data),
  delete: (serial) => axiosClient.delete(`/machines/${serial}`),
};

export const inspectionApi = {
  getList: (status, page = 0, size = 20) =>
    axiosClient.get('/inspections', { params: { status, page, size } }),
  getById: (id) => axiosClient.get(`/inspections/${id}`),
  create: (data) => axiosClient.post('/inspections', data),
  saveProgress: (id, data) => axiosClient.put(`/inspections/${id}/progress`, data),
  approve: (id) => axiosClient.put(`/inspections/${id}/approve`),
  reject: (id) => axiosClient.put(`/inspections/${id}/reject`),
};

export const inventoryApi = {
  search: (params) => axiosClient.get('/inventory/search', { params }),
  getFilters: () => axiosClient.get('/inventory/filters'),
};

export const analyticsApi = {
  getSummary: (params) => axiosClient.get('/analytics/summary', { params }),
  getTrend: (params) => axiosClient.get('/analytics/trend', { params }),
  getValueStructure: (params) => axiosClient.get('/analytics/value-structure', { params }),
  getInventoryAge: () => axiosClient.get('/analytics/inventory-age'),
  getTurnoverRate: (params) => axiosClient.get('/analytics/turnover-rate', { params }),
  getHighlights: (params) => axiosClient.get('/analytics/highlights', { params }),
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

