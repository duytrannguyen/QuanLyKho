import axiosClient from './axiosClient';

export const intakeApi = {
  /**
   * Submit single intake with idempotency
   */
  submitSingle: (data) => {
    const requestId = crypto.randomUUID();
    return axiosClient.post('/intake/single/submit', data, {
      headers: {
        'X-Request-Id': requestId
      }
    });
  },

  /**
   * Submit bulk intake with idempotency
   */
  submitBatch: (data) => {
    const requestId = crypto.randomUUID();
    return axiosClient.post('/intake/batch/submit', data, {
      headers: {
        'X-Request-Id': requestId
      }
    });
  }
};
