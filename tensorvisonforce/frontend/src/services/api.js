// src/services/api.js
// ─────────────────────────────────────────────────────────────────────────────
// Centralised API service layer.
// All mock data is imported here. When the backend is ready, replace each
// mock implementation with a real fetch() call to the corresponding endpoint.
// ─────────────────────────────────────────────────────────────────────────────

import {
  MOCK_COMPLAINTS,
  MOCK_WORKERS,
  MOCK_ADMIN_STATS,
  MOCK_AI_RESULT,
  MOCK_CITIZEN_STATS,
} from '../data/mockData';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Simulate network delay for realistic mock UX
const delay = (ms = 600) => new Promise(r => setTimeout(r, ms));

// ── Auth API ─────────────────────────────────────────────────────────────────
export const authApi = {
  login: async (email, password) => {
    await delay();
    // TODO: replace with → POST ${BASE_URL}/auth/login
    const roles = {
      'citizen@demo.com':    'citizen',
      'admin@demo.com':      'admin',
      'worker@demo.com':     'field_worker',
    };
    const role = roles[email.toLowerCase()];
    if (!role) throw new Error('Invalid credentials. Use demo accounts.');
    return {
      user: {
        id: `u_${role}`,
        email,
        full_name: role === 'citizen' ? 'Demo Citizen'
                 : role === 'admin'   ? 'Demo Admin'
                 :                     'Demo Field Worker',
        role,
      },
      token: 'mock-jwt-token',
    };
  },

  register: async (data) => {
    await delay();
    // TODO: replace with → POST ${BASE_URL}/auth/register
    return {
      user: {
        id: 'u_new',
        email: data.email,
        full_name: data.full_name,
        role: data.role || 'citizen',
      },
      token: 'mock-jwt-token',
    };
  },

  logout: async () => {
    await delay(200);
    // TODO: replace with → POST ${BASE_URL}/auth/logout
    return { success: true };
  },
};

// ── Complaint API ─────────────────────────────────────────────────────────────
export const complaintApi = {
  list: async (filters = {}) => {
    await delay();
    // TODO: replace with → GET ${BASE_URL}/complaints?...filters
    let data = [...MOCK_COMPLAINTS];
    if (filters.citizen_id) data = data.filter(c => c.citizen_id === filters.citizen_id);
    if (filters.status)     data = data.filter(c => c.status === filters.status);
    if (filters.category)   data = data.filter(c => c.category === filters.category);
    if (filters.priority)   data = data.filter(c => c.priority === filters.priority);
    return data;
  },

  getById: async (id) => {
    await delay();
    // TODO: replace with → GET ${BASE_URL}/complaints/${id}
    const c = MOCK_COMPLAINTS.find(c => c.id === id || c.complaint_number === id);
    if (!c) throw new Error('Complaint not found');
    return c;
  },

  create: async (formData) => {
    await delay(1200);
    // TODO: replace with → POST ${BASE_URL}/complaints (multipart/form-data)
    const newComplaint = {
      ...formData,
      id: `c${Date.now()}`,
      complaint_number: `CMP-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 90000) + 10000)}`,
      status: 'submitted',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    MOCK_COMPLAINTS.unshift(newComplaint);
    return newComplaint;
  },

  updateStatus: async (id, status, note = '') => {
    await delay();
    // TODO: replace with → PATCH ${BASE_URL}/complaints/${id}/status
    const c = MOCK_COMPLAINTS.find(c => c.id === id);
    if (c) { c.status = status; c.updated_at = new Date().toISOString(); }
    return c;
  },

  assign: async (id, { worker_id, worker_name, department }) => {
    await delay();
    // TODO: replace with → PATCH ${BASE_URL}/complaints/${id}/assign
    const c = MOCK_COMPLAINTS.find(c => c.id === id);
    if (c) {
      c.assigned_worker = worker_name;
      c.status = 'assigned';
      c.department = department;
      c.updated_at = new Date().toISOString();
    }
    return c;
  },

  uploadProof: async (id, files) => {
    await delay(1500);
    // TODO: replace with → POST ${BASE_URL}/complaints/${id}/proof (multipart)
    const c = MOCK_COMPLAINTS.find(c => c.id === id);
    if (c) {
      c.status = 'resolved';
      c.updated_at = new Date().toISOString();
      c.resolved_at = new Date().toISOString();
    }
    return c;
  },

  citizenStats: async (citizen_id) => {
    await delay();
    // TODO: replace with → GET ${BASE_URL}/complaints/stats?citizen_id=${citizen_id}
    return MOCK_CITIZEN_STATS;
  },
};

// ── AI API ─────────────────────────────────────────────────────────────────
export const aiApi = {
  analyse: async (imageFile, description, location) => {
    await delay(2000);
    // TODO: replace with → POST ${BASE_URL}/ai/analyse (multipart)
    // This returns a deterministic mock result based on description keywords
    const desc = description?.toLowerCase() || '';
    let category = 'other';
    let priority = 'medium';
    if (desc.includes('pothole') || desc.includes('road') || desc.includes('crack')) category = 'road_damage';
    else if (desc.includes('garbage') || desc.includes('waste') || desc.includes('bin')) category = 'garbage';
    else if (desc.includes('light') || desc.includes('street')) category = 'streetlight';
    else if (desc.includes('drain') || desc.includes('water') && desc.includes('log')) category = 'drainage';
    else if (desc.includes('water') || desc.includes('supply')) category = 'water_supply';
    if (desc.includes('urgent') || desc.includes('emergency') || desc.includes('accident')) priority = 'high';
    else if (desc.includes('minor') || desc.includes('small')) priority = 'low';

    return { ...MOCK_AI_RESULT, category: { ...MOCK_AI_RESULT.category, predicted: category }, priority: { ...MOCK_AI_RESULT.priority, suggested: priority } };
  },

  checkImageQuality: async (imageFile) => {
    await delay(800);
    // TODO: replace with → POST ${BASE_URL}/ai/image-quality
    // Mock: Randomly pass/fail for demo purposes
    const passed = Math.random() > 0.25;
    return {
      score: passed ? Math.floor(Math.random() * 30) + 70 : Math.floor(Math.random() * 40) + 20,
      passed,
      label: passed ? 'Good' : 'Poor',
      issues: passed ? [] : ['Image may be slightly blurry', 'Low brightness detected'],
      resolution: '1920x1080',
      blur_score: passed ? 95 : 35,
      brightness: passed ? 'Good' : 'Low',
    };
  },
};

// ── Admin API ─────────────────────────────────────────────────────────────────
export const adminApi = {
  stats: async () => {
    await delay();
    // TODO: replace with → GET ${BASE_URL}/admin/stats
    return MOCK_ADMIN_STATS;
  },

  listWorkers: async () => {
    await delay();
    // TODO: replace with → GET ${BASE_URL}/admin/field-workers
    return MOCK_WORKERS;
  },

  createWorker: async (data) => {
    await delay();
    // TODO: replace with → POST ${BASE_URL}/admin/field-workers
    const worker = { id: `w${Date.now()}`, ...data, active_tasks: 0 };
    MOCK_WORKERS.push(worker);
    return worker;
  },

  deleteWorker: async (id) => {
    await delay();
    // TODO: replace with → DELETE ${BASE_URL}/admin/field-workers/${id}
    const idx = MOCK_WORKERS.findIndex(w => w.id === id);
    if (idx > -1) MOCK_WORKERS.splice(idx, 1);
    return { success: true };
  },

  verifyComplaint: async (id) => {
    await delay();
    // TODO: replace with → POST ${BASE_URL}/admin/complaints/${id}/verify
    return complaintApi.updateStatus(id, 'verified');
  },

  approveResolution: async (id) => {
    await delay();
    // TODO: replace with → POST ${BASE_URL}/admin/complaints/${id}/approve
    return complaintApi.updateStatus(id, 'resolved');
  },

  requestRework: async (id, note) => {
    await delay();
    // TODO: replace with → POST ${BASE_URL}/admin/complaints/${id}/rework
    return complaintApi.updateStatus(id, 'rework_required');
  },
};

// ── Worker API ─────────────────────────────────────────────────────────────────
export const workerApi = {
  myComplaints: async (worker_id) => {
    await delay();
    // TODO: replace with → GET ${BASE_URL}/worker/complaints?worker_id=${worker_id}
    return MOCK_COMPLAINTS.filter(c => ['assigned', 'in_progress', 'resolved', 'rework_required'].includes(c.status));
  },

  startWork: async (id) => {
    await delay();
    // TODO: replace with → POST ${BASE_URL}/worker/complaints/${id}/start
    return complaintApi.updateStatus(id, 'in_progress');
  },

  submitResolution: async (id, data) => {
    await delay(1500);
    // TODO: replace with → POST ${BASE_URL}/worker/complaints/${id}/resolve (multipart)
    return complaintApi.uploadProof(id, data);
  },
};

// ── Feedback API ─────────────────────────────────────────────────────────────
export const feedbackApi = {
  submit: async (complaint_id, { resolved, rating, comment }) => {
    await delay();
    // TODO: replace with → POST ${BASE_URL}/complaints/${complaint_id}/feedback
    return {
      id: `fb_${Date.now()}`,
      complaint_id,
      resolved,
      rating,
      comment,
      created_at: new Date().toISOString(),
    };
  },
};
