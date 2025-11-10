import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API methods
export const api = {
  // Auth
  login: (email: string, password: string) =>
    apiClient.post('/auth/login', { email, password }),
  register: (name: string, email: string, password: string) =>
    apiClient.post('/auth/register', { name, email, password }),
  logout: () => apiClient.post('/auth/logout'),
  getCurrentUser: () => apiClient.get('/auth/me'),

  // Projects
  getProjects: () => apiClient.get('/projects'),
  getProject: (id: string) => apiClient.get(`/projects/${id}`),
  createProject: (data: { title: string; description?: string }) =>
    apiClient.post('/projects', data),
  updateProject: (id: string, data: Partial<{ title: string; description: string }>) =>
    apiClient.put(`/projects/${id}`, data),
  deleteProject: (id: string) => apiClient.delete(`/projects/${id}`),
  duplicateProject: (id: string) => apiClient.post(`/projects/${id}/duplicate`),

  // Videos
  getVideos: (params?: { project_id?: string; status?: string }) =>
    apiClient.get('/videos', { params }),
  getVideo: (id: string) => apiClient.get(`/videos/${id}`),
  createVideo: (data: {
    project_id: string;
    title: string;
    script?: any;
    timeline?: any;
  }) => apiClient.post('/videos', data),
  updateVideo: (
    id: string,
    data: Partial<{ title: string; script: any; timeline: any }>
  ) => apiClient.put(`/videos/${id}`, data),
  deleteVideo: (id: string) => apiClient.delete(`/videos/${id}`),
  renderVideo: (id: string) => apiClient.post(`/videos/${id}/render`),
  getVideoStatus: (id: string) => apiClient.get(`/videos/${id}/status`),
  downloadVideo: (id: string) => apiClient.get(`/videos/${id}/download`),
  cancelRender: (id: string) => apiClient.post(`/videos/${id}/cancel`),

  // Characters
  getCharacters: () => apiClient.get('/characters'),
  getCharacter: (id: string) => apiClient.get(`/characters/${id}`),
  createCharacter: (data: { name: string; voice_id?: string; avatar_config?: any }) =>
    apiClient.post('/characters', data),
  updateCharacter: (
    id: string,
    data: Partial<{ name: string; voice_id: string; avatar_config: any }>
  ) => apiClient.put(`/characters/${id}`, data),
  deleteCharacter: (id: string) => apiClient.delete(`/characters/${id}`),
  uploadCharacterAsset: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post(`/characters/${id}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Assets
  getAssets: (params?: { type?: string; project_id?: string }) =>
    apiClient.get('/assets', { params }),
  getAsset: (id: string) => apiClient.get(`/assets/${id}`),
  uploadAsset: (file: File, type: string, project_id?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    if (project_id) formData.append('project_id', project_id);
    return apiClient.post('/assets/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deleteAsset: (id: string) => apiClient.delete(`/assets/${id}`),
  getAssetUrl: (id: string) => apiClient.get(`/assets/${id}/url`),
};
