import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('crm_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401/403 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('crm_token');
      localStorage.removeItem('crm_user');
      // Dùng event thay vì window.location để tránh reload toàn trang
      window.dispatchEvent(new Event('auth:logout'));
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authApi = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  getUsers: () => api.get('/auth/users'),
  toggleUser: (id) => api.patch(`/auth/users/${id}/toggle`),
  getSaleUsers: () => api.get('/auth/users/sales'),
  updateUser: (id, data) => api.put(`/auth/users/${id}`, data),
  deleteUser: (id) => api.delete(`/auth/users/${id}`),
  changePassword: (currentPassword, newPassword) => api.patch('/auth/change-password', { currentPassword, newPassword }),
};

// Dashboard APIs
export const dashboardApi = {
  getStats: (params) => api.get('/dashboard/stats', { params }),
  getRevenueMonthly: () => api.get('/dashboard/revenue-monthly'),
  getOrdersDaily: () => api.get('/dashboard/orders-daily'),
  getOrderStatus: () => api.get('/dashboard/order-status'),
  getRecentOrders: () => api.get('/dashboard/recent-orders'),
  getAnalytics: (params) => api.get('/dashboard/analytics', { params }),
  getSaleDashboard: (params) => api.get('/dashboard/sale-dashboard', { params }),
  getSalesMessOverview: (params) => api.get('/dashboard/sales-mess-overview', { params }),
  exportDoanhSo: (params) => api.get('/dashboard/export-doanhso', { 
    params,
    responseType: 'blob'
  }),
};

// Don Hang (Orders) APIs
export const donHangApi = {
  getAll: (params) => api.get('/don-hang', { params }),
  getById: (id) => api.get(`/don-hang/${id}`),
  create: (data) => api.post('/don-hang', data),
  update: (id, data) => api.put(`/don-hang/${id}`, data),
  updateStatus: (id, tinhTrang) => api.patch(`/don-hang/${id}/status`, { tinhTrang }),
  delete: (id) => api.delete(`/don-hang/${id}`),
  getSales: () => api.get('/don-hang/sales'),
  getPages: () => api.get('/don-hang/pages'),
  export: (params) => api.get('/don-hang/export', { params, responseType: 'blob' }),
  updateGhiChuDoanhSo: (id, ghiChuDoanhSo) => api.patch(`/don-hang/${id}/ghi-chu-doanh-so`, { ghiChuDoanhSo }),
  updateHoaHong: (id, hoaHong) => api.patch(`/don-hang/${id}/hoa-hong`, { hoaHong }),
  dayDoanhSo: (id, ngayTinhDoanhSo) => api.patch(`/don-hang/${id}/day-doanh-so`, { ngayTinhDoanhSo: ngayTinhDoanhSo || '' }),
};

// Khach Hang (Customers) APIs
export const khachHangApi = {
  getAll: (params) => api.get('/khach-hang', { params }),
  getById: (id) => api.get(`/khach-hang/${id}`),
  create: (data) => api.post('/khach-hang', data),
  update: (id, data) => api.put(`/khach-hang/${id}`, data),
  updateStatus: (id, status) => api.patch(`/khach-hang/${id}/status`, { status }),
  delete: (id) => api.delete(`/khach-hang/${id}`),
  search: (keyword) => api.get('/khach-hang/search', { params: { keyword } }),
  getPages: () => api.get('/khach-hang/pages'),
  getSales: () => api.get('/khach-hang/sales'),
  transferSale: (id, sale) => api.patch(`/khach-hang/${id}/transfer`, { sale }),
  bulkTransferSale: (ids, sale) => api.patch('/khach-hang/bulk-transfer', { ids, sale }),
  updateNotes: (id, notes) => api.patch(`/khach-hang/${id}/notes`, { notes }),
  updateLoaiMess: (id, loaiMess) => api.patch(`/khach-hang/${id}/loai-mess`, { loaiMess }),
  getAssignedCount: () => api.get('/khach-hang/assigned-count'),
  getKhoSoNoi: () => api.get('/khach-hang/kho-so-noi'),
  getMyClaimCount: () => api.get('/khach-hang/kho-so-noi/my-count'),
  claimKhoSoNoi: (id) => api.post(`/khach-hang/${id}/nhan-kho-noi`),
  getKhoNoiClaimStats: () => api.get('/khach-hang/kho-so-noi/claim-stats'),
};

// Kenh Tiep Thi (Marketing Channels) APIs
export const kenhTiepThiApi = {
  getAll: () => api.get('/kenh-tiep-thi'),
  getActive: () => api.get('/kenh-tiep-thi/active'),
  getGrouped: () => api.get('/kenh-tiep-thi/grouped'),
  getFlat: () => api.get('/kenh-tiep-thi/flat'),
  create: (data) => api.post('/kenh-tiep-thi', data),
  update: (id, data) => api.put(`/kenh-tiep-thi/${id}`, data),
  delete: (id) => api.delete(`/kenh-tiep-thi/${id}`),
};

// Zalo Contact history APIs
export const zaloContactApi = {
  getByIds: (ids) => api.get('/zalo-contacts', { params: { ids: ids.join(',') } }),
  syncBatch: (data) => api.post('/zalo-contacts/sync', data),
};

// Transfer History APIs
export const transferHistoryApi = {
  getByKhachHang: (khachHangId) => api.get('/transfer-history', { params: { khachHangId } }),
  getByKhachHangIds: (ids) => api.get('/transfer-history/batch', { params: { ids: ids.join(',') } }),
};

// Call Recording APIs
export const callRecordingApi = {
  getByKhachHang: (khachHangId) => api.get('/call-recordings', { params: { khachHangId } }),
  getCounts: (ids) => {
    const qs = ids.map(id => `ids=${id}`).join('&');
    return api.get(`/call-recordings/counts?${qs}`);
  },
  upload: (formData, config = {}) => api.post('/call-recordings/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' }, ...config }),
  delete: (id) => api.delete(`/call-recordings/${id}`),
};

// Audio Management APIs (admin - mobile recordings)
export const audioApi = {
  getFolders: () => api.get('/audio/folders'),
  getRecordings: (employeeId) => api.get('/audio/recordings', { params: { employeeId } }),
  getByCustomer: (khachHangId) => api.get('/audio/by-customer', { params: { khachHangId } }),
  syncToCustomer: (khachHangId) => api.post(`/audio/sync/${khachHangId}`),
  deleteEmployee: (employeeId) => api.delete(`/audio/employee/${encodeURIComponent(employeeId)}`),
  deleteRecording: (id) => api.delete(`/audio/recording/${id}`),
  search: (params) => api.get('/audio/search', { params }),
  getUnlinked: () => api.get('/audio/unlinked'),
  linkToCustomer: (recordingId, khachHangId) => api.post('/audio/link', { recordingId, khachHangId }),
  syncBulk: (ids) => api.post('/audio/sync-bulk', { ids }),
  getAppStatus: () => api.get('/audio/app-status'),
  pingDevice: (employeeId) => api.post(`/audio/ping/${encodeURIComponent(employeeId)}`),
  getConnectionHistory: (employeeId) => api.get('/audio/connection-history', { params: { employeeId } }),
};

// Location Tracking APIs (admin)
export const locationApi = {
  getLatest: () => api.get('/locations/latest'),
  getHistory: (employeeId, fromDate, toDate) => api.get('/locations/history', { params: { employeeId, fromDate, toDate } }),
  deleteEmployee: (employeeId) => api.delete(`/locations/${employeeId}`),
};

// Nhân Viên APIs
export const nhanVienApi = {
  getAll: () => api.get('/nhan-vien'),
  getActive: () => api.get('/nhan-vien/active'),
  create: (data) => api.post('/nhan-vien', data),
  update: (id, data) => api.put(`/nhan-vien/${id}`, data),
  delete: (id) => api.delete(`/nhan-vien/${id}`),
  updateLuongCoBan: (id, luongCoBan) => api.patch(`/nhan-vien/${id}/luong-co-ban`, { luongCoBan }),
  updateBaoHiem: (id, baoHiem) => api.patch(`/nhan-vien/${id}/bao-hiem`, { baoHiem }),
  toggleAnTrongBang: (id) => api.patch(`/nhan-vien/${id}/an-trong-bang`),
  updateMaHikvision: (id, maHikvision) => api.patch(`/nhan-vien/${id}/ma-hikvision`, { maHikvision }),
};

// Chấm Công APIs
export const chamCongApi = {
  getByMonth: (thang, nam) => api.get('/cham-cong', { params: { thang, nam } }),
  getMyData: (thang, nam) => api.get('/cham-cong/my', { params: { thang, nam } }),
  saveOne: (data) => api.post('/cham-cong/save', data),
  saveGhiChuNv: (id, ghiChuNv) => api.patch(`/cham-cong/${id}/ghi-chu-nv`, { ghiChuNv }),
  saveBulk: (records) => api.post('/cham-cong/bulk', records),
  duyet: (thang, nam) => api.post('/cham-cong/duyet', null, { params: { thang, nam } }),
  duyetRecord: (id, duyetKhongPhat, duyetNote, duyetCong, huyTangCa) =>
    api.post(`/cham-cong/${id}/duyet`, null, { params: { duyetKhongPhat, duyetNote: duyetNote || '', ...(duyetCong != null ? { duyetCong } : {}), huyTangCa: huyTangCa || false } }),
  importExcel: (file, thang, nam) => {
    const form = new FormData(); form.append('file', file);
    return api.post('/cham-cong/import', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      params: { thang, nam },
    });
  },
  downloadTemplate: (thang, nam) =>
    api.get('/cham-cong/template', { params: { thang, nam }, responseType: 'blob' }),
  recalculate: (thang, nam) =>
    api.post('/cham-cong/recalculate', null, { params: { thang, nam } }),
};

// Bảng Lương APIs
export const bangLuongApi = {
  getByMonth: (thang, nam) => api.get('/bang-luong', { params: { thang, nam } }),
  getMyData: (thang, nam) => api.get('/bang-luong/my', { params: { thang, nam } }),
  upsertAdjust: (data) => api.post('/bang-luong/adjust', data),
  xacNhan: (nhanVienId, thang, nam) => api.post('/bang-luong/xac-nhan', { nhanVienId, thang, nam }),
};

// Cơ cấu lương Sale (editable tiers)
export const luongCoCauSaleApi = {
  getAll: () => api.get('/luong-co-cau-sale'),
  update: (id, data) => api.put(`/luong-co-cau-sale/${id}`, data),
};

// Cơ cấu lương Văn Phòng / Lái Xe
export const luongCoCauApi = {
  getAll: () => api.get('/luong-co-cau'),
  update: (chucVu, luongCoBan) => api.put(`/luong-co-cau/${chucVu}`, { luongCoBan }),
};

// Mess Config APIs
export const messConfigApi = {
  getConfig: () => api.get('/mess-config'),
  updateCostPerMess: (costPerMess) => api.put('/mess-config/cost-per-mess', { costPerMess }),
  updateTiers: (tiers) => api.put('/mess-config/tiers', { tiers }),
};

// HIKVISION APIs
export const hikvisionApi = {
  getDevices: () => api.get('/hikvision/device'),
  saveDevice: (data) => api.post('/hikvision/device', data),
  deleteDevice: (id) => api.delete(`/hikvision/device/${id}`),
  testConnection: (data) => api.post('/hikvision/test', data),
  sync: (date) => api.post('/hikvision/sync', null, { params: { date } }),
  getLogs: (page = 0, size = 20) => api.get('/hikvision/logs', { params: { page, size } }),
};

// Zalo Service API — gọi thẳng VPS, không qua backend, không cần JWT
const ZALO_SERVICE_BASE = import.meta.env.VITE_ZALO_SERVICE || 'http://localhost:3001';
const zaloService = axios.create({ baseURL: ZALO_SERVICE_BASE });

export const zaloServiceApi = {
  startSession:  (sessionId) => zaloService.post(`/start?session=${encodeURIComponent(sessionId)}`),
  stopSession:   (sessionId) => zaloService.post(`/stop?session=${encodeURIComponent(sessionId)}`),
  logoutSession: (sessionId) => zaloService.post(`/logout?session=${encodeURIComponent(sessionId)}`),
  syncProfile:   (sessionId, cookies, storage) =>
    zaloService.post(`/sessions/${encodeURIComponent(sessionId)}/cookies`, {
      cookies,
      localStorage: storage,
      userAgent: navigator.userAgent,
    }),
};

export default api;
