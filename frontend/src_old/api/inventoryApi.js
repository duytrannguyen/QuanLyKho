import axiosClient from './axiosClient';

export const inventoryApi = {
  search: (params) => axiosClient.get('/inventory/search', { params }),
  getFilters: () => axiosClient.get('/inventory/filters'),
};
