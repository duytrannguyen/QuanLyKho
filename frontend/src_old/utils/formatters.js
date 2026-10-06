export const formatCurrency = (value) => {
  if (value === null || value === undefined || value === '') return '';
  const strVal = value.toString().replace(/\D/g, '');
  if (!strVal) return '';
  return parseInt(strVal, 10).toLocaleString('vi-VN');
};

export const parseCurrency = (formattedValue) => {
  if (formattedValue === null || formattedValue === undefined || formattedValue === '') return '';
  return formattedValue.toString().replace(/\D/g, '');
};
