import React, { useState, useEffect } from 'react';
import SubtaskList from './SubtaskList';

const STATUSES = [
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'upcoming_soon', label: 'Upcoming Soon' },
  { key: 'urgent', label: 'Urgent' },
  { key: 'completed', label: 'Completed' },
];

const PRIORITIES = [
  { key: 'high', label: 'High' },
  { key: 'medium', label: 'Medium' },
  { key: 'low', label: 'Low' },
];

function TaskModal({ task, templates, onClose, onSave, onDelete, onApplyTemplate }) {
  const isEditing = !!task;

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    customer_name: '',
    customer_email: '',
    company: '',
    so_number: '',
    po_number: '',
    quote_number: '',
    priority: 'medium',
    status: 'scheduled',
    due_date: '',
    due_time: '',
  });

  const [subtasks, setSubtasks] = useState([]);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        customer_name: task.customer_name || '',
        customer_email: task.customer_email || '',
        company: task.company || '',
        so_number: task.so_number || '',
        po_number: task.po_number || '',
        quote_number: task.quote_number || '',
        priority: task.priority || 'medium',
        status: task.status || 'scheduled',
        due_date: task.due_date || '',
        due_time: task.due_time || '',
      });
      setSubtasks(task.subtasks || []);
    }
  }, [task]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await onSave(formData);
    } catch (err) {
      console.error('Failed to save task:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleApplyTemplate = async (templateId) => {
    if (onApplyTemplate) {
      await onApplyTemplate(templateId);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '720px' }}>
        <div className="modal-header">
          <h2 className="modal-title">{isEditing ? 'Edit Task' : 'Create New Task'}</h2>
          <button className="btn-icon" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {isEditing && (
          <div style={{
            display: 'flex',
            gap: '4px',
            padding: '0 24px',
            borderBottom: '1px solid var(--border-color)',
            background: 'var(--bg-tertiary)'
          }}>
            <button
              style={{
                padding: '12px 16px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'details' ? '2px solid var(--accent-color)' : '2px solid transparent',
                color: activeTab === 'details' ? 'var(--accent-color)' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}
              onClick={() => setActiveTab('details')}
            >
              Details
            </button>
            <button
              style={{
                padding: '12px 16px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'subtasks' ? '2px solid var(--accent-color)' : '2px solid transparent',
                color: activeTab === 'subtasks' ? 'var(--accent-color)' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}
              onClick={() => setActiveTab('subtasks')}
            >
              Subtasks ({subtasks.length})
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {(!isEditing || activeTab === 'details') && (
              <>
                <div className="form-group">
                  <label className="form-label">Title</label>
                  <input
                    type="text"
                    name="title"
                    className="form-input"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="Enter task title..."
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    name="description"
                    className="form-textarea"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Add details about this task..."
                  />
                </div>

                <div style={{
                  background: 'var(--bg-tertiary)',
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '20px',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Customer Information
                  </div>
                  <div className="form-row">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Name</label>
                      <input
                        type="text"
                        name="customer_name"
                        className="form-input"
                        value={formData.customer_name}
                        onChange={handleChange}
                        placeholder="Customer name"
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Email</label>
                      <input
                        type="email"
                        name="customer_email"
                        className="form-input"
                        value={formData.customer_email}
                        onChange={handleChange}
                        placeholder="customer@company.com"
                      />
                    </div>
                  </div>
                  <div className="form-group" style={{ marginTop: '16px', marginBottom: 0 }}>
                    <label className="form-label">Company</label>
                    <input
                      type="text"
                      name="company"
                      className="form-input"
                      value={formData.company}
                      onChange={handleChange}
                      placeholder="Company name"
                    />
                  </div>
                </div>

                <div style={{
                  background: 'var(--bg-tertiary)',
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '20px',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Reference Numbers
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Quote #</label>
                      <input
                        type="text"
                        name="quote_number"
                        className="form-input"
                        value={formData.quote_number}
                        onChange={handleChange}
                        placeholder="Q-0000"
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">PO #</label>
                      <input
                        type="text"
                        name="po_number"
                        className="form-input"
                        value={formData.po_number}
                        onChange={handleChange}
                        placeholder="PO-0000"
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">SO #</label>
                      <input
                        type="text"
                        name="so_number"
                        className="form-input"
                        value={formData.so_number}
                        onChange={handleChange}
                        placeholder="SO-0000"
                      />
                    </div>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Due Date</label>
                    <input
                      type="date"
                      name="due_date"
                      className="form-input"
                      value={formData.due_date}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Due Time</label>
                    <input
                      type="time"
                      name="due_time"
                      className="form-input"
                      value={formData.due_time}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select
                      name="priority"
                      className="form-select"
                      value={formData.priority}
                      onChange={handleChange}
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p.key} value={p.key}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select
                      name="status"
                      className="form-select"
                      value={formData.status}
                      onChange={handleChange}
                    >
                      {STATUSES.map((s) => (
                        <option key={s.key} value={s.key}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}

            {isEditing && activeTab === 'subtasks' && (
              <>
                {templates && templates.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <select
                      className="form-select"
                      style={{ width: '100%' }}
                      onChange={(e) => handleApplyTemplate(parseInt(e.target.value))}
                      defaultValue=""
                    >
                      <option value="" disabled>Apply a workflow template...</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <SubtaskList taskId={task.id} subtasks={subtasks} setSubtasks={setSubtasks} />
              </>
            )}
          </div>

          <div className="modal-footer">
            {isEditing && onDelete && (
              <button
                type="button"
                className="btn btn-danger"
                onClick={onDelete}
                style={{ marginRight: 'auto' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
                Delete
              </button>
            )}

            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TaskModal;
