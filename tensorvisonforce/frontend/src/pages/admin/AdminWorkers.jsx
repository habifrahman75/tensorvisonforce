// src/pages/admin/AdminWorkers.jsx
import { useState, useEffect } from 'react';
import { Plus, Trash2, User2, Building2, Briefcase } from 'lucide-react';
import { adminApi } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States';
import toast from 'react-hot-toast';

const DEPARTMENTS = [
  'Roads & Infrastructure', 'Sanitation', 'Electrical',
  'Drainage & Sewage', 'Water Board', 'General Services',
];

export default function AdminWorkers() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', department: DEPARTMENTS[0] });
  const [saving, setSaving] = useState(false);

  const load = () => {
    adminApi.listWorkers().then(setWorkers).catch(e => setError(e.message)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const createWorker = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) { toast.error('Name and email are required.'); return; }
    setSaving(true);
    try {
      const w = await adminApi.createWorker(form);
      setWorkers(prev => [...prev, w]);
      setShowModal(false);
      setForm({ name: '', email: '', department: DEPARTMENTS[0] });
      toast.success('Field worker added!');
    } catch {
      toast.error('Failed to create worker.');
    } finally {
      setSaving(false);
    }
  };

  const deleteWorker = async (id) => {
    if (!confirm('Remove this field worker?')) return;
    try {
      await adminApi.deleteWorker(id);
      setWorkers(prev => prev.filter(w => w.id !== id));
      toast.success('Worker removed.');
    } catch {
      toast.error('Failed to remove worker.');
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Field Workers</h1>
          <p className="text-ink-muted text-sm mt-1">{workers.length} registered workers</p>
        </div>
        <Button variant="primary" size="md" onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4" /> Add Worker
        </Button>
      </div>

      {workers.length === 0 ? (
        <EmptyState title="No field workers yet" description="Add field workers so you can assign them to complaints." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {workers.map(w => (
            <div key={w.id} className="card p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center">
                    <User2 className="w-5 h-5 text-brand-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-ink text-sm">{w.name}</p>
                    <p className="text-xs text-ink-muted">{w.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => deleteWorker(w.id)}
                  className="p-1.5 text-ink-subtle hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  aria-label="Remove worker"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-2 text-xs text-ink-muted">
                <Building2 className="w-3.5 h-3.5" /> {w.department}
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Briefcase className="w-3.5 h-3.5 text-ink-subtle" />
                <span className={w.active_tasks > 0 ? 'text-amber-600 font-medium' : 'text-green-600 font-medium'}>
                  {w.active_tasks} active task{w.active_tasks !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Worker Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Field Worker" size="sm">
        <form onSubmit={createWorker} className="space-y-4">
          <Input label="Full Name" required value={form.name} onChange={set('name')} placeholder="Rajan Kumar" />
          <Input label="Email" type="email" required value={form.email} onChange={set('email')} placeholder="rajan@dept.gov.in" />
          <Select label="Department" value={form.department} onChange={set('department')}>
            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
          </Select>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" size="md" className="flex-1" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" size="md" className="flex-1" loading={saving}>Add Worker</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
