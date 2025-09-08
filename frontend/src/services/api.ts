import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('auth_token')
      window.location.href = '/auth/login'
    }
    return Promise.reject(error)
  }
)

// API endpoints
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (email: string, password: string, full_name: string) =>
    api.post('/auth/register', { email, password, full_name }),
  me: () => api.get('/auth/me'),
  gmailAuth: () => api.post('/auth/gmail/authorize'),
  gmailCallback: (code: string, state: string) =>
    api.post('/auth/gmail/callback', { code, state }),
  office365Auth: () => api.post('/auth/office365/authorize'),
  office365Callback: (code: string, state: string) =>
    api.post('/auth/office365/callback', { code, state }),
}

export const emailAPI = {
  getAccounts: () => api.get('/email/accounts'),
  syncEmails: (accountId: string, maxResults: number = 100) =>
    api.post('/email/sync', { account_id: accountId, max_results: maxResults }),
  getMessages: (accountId: string, limit: number = 50) =>
    api.get(`/email/messages?account_id=${accountId}&limit=${limit}`),
  getFlightConfirmations: (accountId: string) =>
    api.get(`/email/flight-confirmations?account_id=${accountId}`),
  disconnectAccount: (accountId: string) =>
    api.delete(`/email/accounts/${accountId}`),
}

export const ocrAPI = {
  uploadImage: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/ocr/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  processImage: (imageId: string) =>
    api.post(`/ocr/process/${imageId}`),
  getImages: () => api.get('/ocr/images'),
  getImageStamps: (imageId: string) =>
    api.get(`/ocr/images/${imageId}/stamps`),
  deleteImage: (imageId: string) =>
    api.delete(`/ocr/images/${imageId}`),
}

export const travelAPI = {
  createEntry: (entryData: any) =>
    api.post('/travel/entries', entryData),
  getEntries: (params?: any) =>
    api.get('/travel/entries', { params }),
  getEntry: (entryId: string) =>
    api.get(`/travel/entries/${entryId}`),
  updateEntry: (entryId: string, entryData: any) =>
    api.put(`/travel/entries/${entryId}`, entryData),
  deleteEntry: (entryId: string) =>
    api.delete(`/travel/entries/${entryId}`),
  getHistory: (params?: any) =>
    api.get('/travel/history', { params }),
  getSummary: () => api.get('/travel/summary'),
  validateEntry: (entryId: string, isValid: boolean, notes?: string) =>
    api.post('/travel/validate', { entry_id: entryId, is_valid: isValid, notes }),
  autoGenerate: () => api.post('/travel/auto-generate'),
}

export const reportAPI = {
  generate: (reportData: any) =>
    api.post('/reports/generate', reportData),
  getReports: () => api.get('/reports/'),
  getReport: (reportId: string) =>
    api.get(`/reports/${reportId}`),
  downloadReport: (reportId: string, format: string = 'pdf') =>
    api.get(`/reports/${reportId}/download?format=${format}`, {
      responseType: 'blob',
    }),
  deleteReport: (reportId: string) =>
    api.delete(`/reports/${reportId}`),
  getUSCISTemplate: () => api.get('/reports/templates/uscis'),
  regenerateReport: (reportId: string) =>
    api.post(`/reports/${reportId}/regenerate`),
}
