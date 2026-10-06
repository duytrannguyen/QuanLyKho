import axiosClient from './axiosClient';

export const inspectionApi = {
  getActive: (status = '') => axiosClient.get(`/inspections${status ? `?status=${status}` : ''}`),
  updateProgress: (code, data) => axiosClient.put(`/inspections/${code}/progress`, data),
  start: (code) => axiosClient.post(`/inspections/${code}/start`),
  approve: (code, data) => axiosClient.post(`/inspections/${code}/approve`, data),
  reject: (code, data) => axiosClient.post(`/inspections/${code}/reject`, data),
};
