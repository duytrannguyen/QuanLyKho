import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';

const axiosClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Quản lý trạng thái loading toàn cục
let activeRequests = 0;
const loadingListeners = new Set();

const notifyLoading = () => {
  loadingListeners.forEach((listener) => listener(activeRequests));
};

export const subscribeLoading = (listener) => {
  loadingListeners.add(listener);
  listener(activeRequests);
  return () => loadingListeners.delete(listener);
};

// Quản lý hàng đợi khi refresh token đồng thời
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor - gắn JWT Access Token
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (!config.silent && !config._loadingTracked) {
      config._loadingTracked = true;
      activeRequests++;
      notifyLoading();
    }
    return config;
  },
  (error) => {
    if (error?.config?._loadingTracked) {
      error.config._loadingTracked = false;
      activeRequests = Math.max(activeRequests - 1, 0);
      notifyLoading();
    }
    return Promise.reject(error);
  }
);

// Response interceptor - tự động làm mới JWT Token khi hết hạn (Seamless Token Refresh)
axiosClient.interceptors.response.use(
  (response) => {
    if (response.config?._loadingTracked) {
      response.config._loadingTracked = false;
      activeRequests = Math.max(activeRequests - 1, 0);
      notifyLoading();
    }
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;

    const releaseLoading = () => {
      if (originalRequest?._loadingTracked) {
        originalRequest._loadingTracked = false;
        activeRequests = Math.max(activeRequests - 1, 0);
        notifyLoading();
      }
    };

    // Nếu lỗi 401 Unauthorized
    if (error.response?.status === 401 && originalRequest) {
      const url = originalRequest.url || '';
      
      // Nếu chính endpoint login hoặc refresh bị 401 thì xóa session và về login
      if (url.includes('/auth/login') || url.includes('/auth/refresh')) {
        releaseLoading();
        return Promise.reject(error.response?.data || error);
      }

      // Nếu đã từng thử refresh cho request này rồi mà vẫn 401
      if (originalRequest._retry) {
        releaseLoading();
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(error.response?.data || error);
      }

      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        releaseLoading();
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(error.response?.data || error);
      }

      // Nếu đang trong quá trình refresh token, đưa request vào hàng đợi chờ
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosClient(originalRequest);
          })
          .catch((err) => {
            releaseLoading();
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Gọi thẳng axios thuần để tránh interceptor lặp vô hạn
        const refreshResponse = await axios.post(`${baseURL}/auth/refresh`, {
          refreshToken,
        }, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        });

        const resData = refreshResponse.data?.data || refreshResponse.data;
        const newToken = resData.token;
        const newRefreshToken = resData.refreshToken;

        if (newToken) {
          localStorage.setItem('token', newToken);
          if (newRefreshToken) {
            localStorage.setItem('refreshToken', newRefreshToken);
          }

          axiosClient.defaults.headers.common.Authorization = `Bearer ${newToken}`;
          originalRequest.headers.Authorization = `Bearer ${newToken}`;

          processQueue(null, newToken);
          return axiosClient(originalRequest);
        } else {
          throw new Error('Không nhận được token mới');
        }
      } catch (refreshErr) {
        releaseLoading();
        processQueue(refreshErr, null);
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    releaseLoading();
    if (error.response?.status === 403) {
      const data = error.response.data || {};
      const forbiddenMsg =
        data.userMessage ||
        data.message ||
        'Tài khoản của bạn không đủ quyền hạn để thực hiện chức năng hoặc thao tác này. Vui lòng liên hệ Quản trị viên.';
      return Promise.reject({
        ...data,
        status: 403,
        userMessage: forbiddenMsg,
        message: forbiddenMsg,
      });
    }
    return Promise.reject(error.response?.data || error);
  }
);

export default axiosClient;
