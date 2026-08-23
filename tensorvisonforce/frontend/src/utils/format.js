// src/utils/format.js
import { format, formatDistanceToNow, parseISO } from 'date-fns';

export const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try { return format(parseISO(dateStr), 'MMM d, yyyy'); }
  catch { return dateStr; }
};

export const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  try { return format(parseISO(dateStr), 'MMM d, yyyy · h:mm a'); }
  catch { return dateStr; }
};

export const fromNow = (dateStr) => {
  if (!dateStr) return '—';
  try { return formatDistanceToNow(parseISO(dateStr), { addSuffix: true }); }
  catch { return dateStr; }
};

export const generateComplaintNumber = () => {
  const year = new Date().getFullYear();
  const rand = String(Math.floor(Math.random() * 90000) + 10000);
  return `CMP-${year}-${rand}`;
};

export const categoryLabel = (key) => ({
  road_damage:   'Road Damage',
  garbage:       'Garbage',
  streetlight:   'Streetlight',
  drainage:      'Drainage',
  water_supply:  'Water Supply',
  other:         'Other',
}[key] || key);

export const statusLabel = (key) => ({
  submitted:        'Submitted',
  verified:         'Verified',
  assigned:         'Assigned',
  in_progress:      'In Progress',
  resolved:         'Resolved',
  rework_required:  'Rework Required',
}[key] || key);

export const departmentLabel = (cat) => ({
  road_damage:   'Roads & Infrastructure',
  garbage:       'Sanitation',
  streetlight:   'Electrical',
  drainage:      'Drainage & Sewage',
  water_supply:  'Water Board',
  other:         'General Services',
}[cat] || 'General Services');

export const truncate = (str, len = 80) =>
  str && str.length > len ? str.slice(0, len) + '…' : str;
