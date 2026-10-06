import axiosClient from './axiosClient';

export const machineApi = {
  importSingle: (data) => axiosClient.post('/machines', data),
  importBulk: (data) => axiosClient.post('/machines/bulk', data),
  importBulkExcel: (formData) => axiosClient.post('/machines/bulk/excel', formData),
  getBySerial: (serial) => axiosClient.get(`/machines/${serial}`),
  update: (serial, data) => axiosClient.put(`/machines/${serial}`, data),
};
