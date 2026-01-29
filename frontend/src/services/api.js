const API_BASE = process.env.REACT_APP_API_URL || '/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;

  const config = {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(url, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// Tasks
export const api = {
  // Tasks
  getTasks: (filters = {}) => {
    const params = new URLSearchParams(filters);
    return request(`/tasks?${params}`);
  },

  getTask: (id) => request(`/tasks/${id}`),

  createTask: (data) => request('/tasks', { method: 'POST', body: data }),

  updateTask: (id, data) => request(`/tasks/${id}`, { method: 'PUT', body: data }),

  deleteTask: (id) => request(`/tasks/${id}`, { method: 'DELETE' }),

  bulkDeleteTasks: (taskIds) => request('/tasks/bulk-delete', {
    method: 'POST',
    body: { task_ids: taskIds }
  }),

  deleteAllTasks: () => request('/tasks/delete-all', { method: 'POST' }),

  applyTemplate: (taskId, templateId) =>
    request(`/tasks/${taskId}/apply-template`, {
      method: 'POST',
      body: { template_id: templateId },
    }),

  // Subtasks
  createSubtask: (taskId, data) =>
    request(`/tasks/${taskId}/subtasks`, { method: 'POST', body: data }),

  updateSubtask: (id, data) =>
    request(`/subtasks/${id}`, { method: 'PUT', body: data }),

  deleteSubtask: (id) => request(`/subtasks/${id}`, { method: 'DELETE' }),

  reorderSubtasks: (taskId, order) =>
    request(`/tasks/${taskId}/subtasks/reorder`, { method: 'PUT', body: { order } }),

  // Templates
  getTemplates: () => request('/templates'),

  createTemplate: (data) => request('/templates', { method: 'POST', body: data }),

  deleteTemplate: (id) => request(`/templates/${id}`, { method: 'DELETE' }),

  // Email
  scanEmails: (options = {}) => request('/email/scan-now', {
    method: 'POST',
    body: {
      scan_all: options.scanAll || false,
      days: options.days || null
    }
  }),

  getEmailStatus: () => request('/email/status'),

  getEmailLogs: (limit = 100) => request(`/email/logs?limit=${limit}`),

  clearEmailLogs: () => request('/email/logs', { method: 'DELETE' }),

  getTriggerWords: () => request('/email/trigger-words'),

  updateTriggerWords: (data) => request('/email/trigger-words', { method: 'PUT', body: data }),

  // Settings
  getSettings: () => request('/settings'),

  updateSettings: (data) => request('/settings', { method: 'PUT', body: data }),

  testImap: () => request('/settings/test-imap', { method: 'POST' }),

  testTelegram: () => request('/settings/test-telegram', { method: 'POST' }),

  // Stats
  getStats: () => request('/stats'),
};

export default api;
