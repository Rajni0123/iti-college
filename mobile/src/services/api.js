import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Use local server for development, production for release
const DEV_API = 'http://192.168.31.252:5000/api';
const PROD_API = 'https://manerpvtiti.space/api';

// Set to true for local development, false for production
const USE_LOCAL = true;
const API_BASE = USE_LOCAL ? DEV_API : PROD_API;

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('adminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let logoutCallback = null;
export const setLogoutCallback = (cb) => { logoutCallback = cb; };

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('adminToken');
      if (logoutCallback) logoutCallback();
    }
    return Promise.reject(error);
  }
);

// Auth
export const adminLogin = (credentials) => api.post('/admin/login', credentials);

// Dashboard
export const getDashboardStats = () => api.get('/admin/stats');

// Admissions
export const getAdmissions = (page = 1, filters = {}) => api.get('/admin/admissions', { params: { page, ...filters } });
export const createManualAdmission = (data, isMultipart = false) => {
  if (isMultipart) {
    return api.post('/admin/admissions/manual', data, { headers: { 'Content-Type': 'multipart/form-data' } });
  }
  return api.post('/admin/admissions/manual', data);
};
export const updateAdmissionStatus = (id, status) => api.put(`/admin/admissions/${id}/status`, { status });
export const updateAdmission = (id, data) => api.put(`/admin/admissions/${id}`, data);

// Fees
export const getFees = (filters) => api.get('/fees', { params: filters });
export const getFeeById = (id) => api.get(`/fees/${id}`);
export const getFeeSummary = (filters) => api.get('/fees/summary', { params: filters });
export const getRecentPayments = () => api.get('/fees/recent-payments');
export const searchStudents = (q) => api.get('/fees/search-students', { params: { q } });
export const getStudentBalance = (admissionId) => api.get(`/fees/student-balance/${admissionId}`);
export const createFee = (data) => api.post('/fees', data);
export const updateFee = (id, data) => api.put(`/fees/${id}`, data);
export const deleteFee = (id) => api.delete(`/fees/${id}`);
export const payFee = (id, data) => api.post(`/fees/${id}/pay`, data);
export const getInstallments = (id) => api.get(`/fees/${id}/installments`);
export const payInstallment = (feeId, installmentId, data) => api.post(`/fees/${feeId}/installments/${installmentId}/pay`, data);

// Students
export const getAllStudents = (params) => api.get('/students', { params });
export const getStudentById = (id) => api.get(`/students/${id}`);
export const createStudent = (data) => api.post('/students', data);
export const updateStudent = (id, data) => api.put(`/students/${id}`, data);
export const deleteStudent = (id) => api.delete(`/students/${id}`);
export const getStudentsWithHighDues = () => api.get('/students/high-dues');
export const getStudentFeeHistory = (admissionId) => api.get(`/fees/student-balance/${admissionId}`);

// Staff
export const getAllStaff = () => api.get('/staff');
export const getStaffById = (id) => api.get(`/staff/${id}`);
export const createStaff = (data) => api.post('/staff', data);
export const updateStaff = (id, data) => api.put(`/staff/${id}`, data);
export const deleteStaff = (id) => api.delete(`/staff/${id}`);

// Staff Salary / Payslip
export const getStaffSalaries = (params) => api.get('/staff/salaries', { params });
export const getStaffSalaryById = (id) => api.get(`/staff/salaries/${id}`);
export const createStaffSalary = (data) => api.post('/staff/salaries', data);
export const updateStaffSalary = (id, data) => api.put(`/staff/salaries/${id}`, data);
export const deleteStaffSalary = (id) => api.delete(`/staff/salaries/${id}`);
export const getStaffPayslips = (staffId, params) => api.get(`/staff/${staffId}/payslips`, { params });

// Notices
export const getNotices = () => api.get('/notices');
export const createNotice = (formData) => api.post('/admin/notices', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const updateNotice = (id, formData) => api.put(`/admin/notices/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const deleteNotice = (id) => api.delete(`/admin/notices/${id}`);

// Results
export const getResults = () => api.get('/results');
export const createResult = (formData) => api.post('/admin/results', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const deleteResult = (id) => api.delete(`/admin/results/${id}`);

// Gallery
export const getGallery = () => api.get('/gallery');
export const uploadGalleryImage = (formData) => api.post('/admin/gallery', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const deleteGalleryImage = (id) => api.delete(`/admin/gallery/${id}`);

// Sessions
export const getSessions = () => api.get('/sessions');
export const getActiveSessions = () => api.get('/sessions/active');
export const createSession = (data) => api.post('/sessions', data);
export const updateSession = (id, data) => api.put(`/sessions/${id}`, data);
export const deleteSession = (id) => api.delete(`/sessions/${id}`);

// Trades
export const getTrades = () => api.get('/trades');
export const getAllTrades = () => api.get('/trades/admin/all');
export const createTrade = (formData) => api.post('/trades', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const updateTrade = (id, formData) => api.put(`/trades/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const deleteTrade = (id) => api.delete(`/trades/${id}`);

// Faculty
export const getAllFacultyAdmin = () => api.get('/faculty/admin/all');
export const createFaculty = (data) => api.post('/faculty', data);
export const updateFaculty = (id, data) => api.put(`/faculty/${id}`, data);
export const deleteFaculty = (id) => api.delete(`/faculty/${id}`);

// Settings
export const getSettings = () => api.get('/admin/settings');
export const updateSettings = (data) => api.put('/admin/settings', data);

// Profile
export const getProfile = () => api.get('/profile');
export const updateProfile = (data) => api.put('/profile', data);
export const changePassword = (data) => api.put('/profile/password', data);

// ========== LIBRARY APIs ==========

// Library Dashboard
export const getLibraryDashboard = () => api.get('/library/dashboard');

// Library Students
export const getLibraryStudents = (params) => api.get('/library/students', { params });
export const searchLibraryStudents = (q) => api.get('/library/students/search', { params: { q } });
export const getLibraryStudentById = (id) => api.get(`/library/students/${id}`);
export const createLibraryStudent = (data) => api.post('/library/students', data);
export const updateLibraryStudent = (id, data) => api.put(`/library/students/${id}`, data);
export const deleteLibraryStudent = (id) => api.delete(`/library/students/${id}`);

// Library Seats
export const getLibrarySeats = () => api.get('/library/seats');
export const assignLibrarySeat = (id, studentId) => api.put(`/library/seats/${id}/assign`, { student_id: studentId });
export const releaseLibrarySeat = (id) => api.put(`/library/seats/${id}/release`);

// Library Lockers
export const getLibraryLockers = () => api.get('/library/lockers');
export const assignLibraryLocker = (id, studentId) => api.put(`/library/lockers/${id}/assign`, { student_id: studentId });
export const releaseLibraryLocker = (id) => api.put(`/library/lockers/${id}/release`);

// Library Fees
export const getLibraryFees = (params) => api.get('/library/fees', { params });
export const collectLibraryFee = (data) => api.post('/library/fees/collect', data);
export const getLibraryFeeReceipt = (id) => api.get(`/library/fees/receipt/${id}`);

// Library Expenses
export const getLibraryExpenses = (params) => api.get('/library/expenses', { params });
export const createLibraryExpense = (data) => api.post('/library/expenses', data);
export const updateLibraryExpense = (id, data) => api.put(`/library/expenses/${id}`, data);
export const deleteLibraryExpense = (id) => api.delete(`/library/expenses/${id}`);

// Library Reports
export const getLibraryDailyReport = (params) => api.get('/library/reports/daily', { params });
export const getLibraryMonthlyReport = (params) => api.get('/library/reports/monthly', { params });
export const getLibraryStudentReport = (params) => api.get('/library/reports/students', { params });
export const getLibrarySeatReport = () => api.get('/library/reports/seats');
export const getLibraryExpenseReport = (params) => api.get('/library/reports/expenses', { params });

// Library Settings
export const getLibrarySettings = () => api.get('/library/settings');
export const updateLibrarySettings = (data) => api.put('/library/settings', data);

export default api;
