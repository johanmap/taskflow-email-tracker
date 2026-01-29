import React, { useState } from 'react';
import api from '../services/api';

function SubtaskList({ taskId, subtasks, setSubtasks }) {
  const [newSubtask, setNewSubtask] = useState('');
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [adding, setAdding] = useState(false);

  const completedCount = subtasks.filter(s => s.status === 'completed').length;
  const progress = subtasks.length > 0 ? (completedCount / subtasks.length) * 100 : 0;

  const handleAddSubtask = async (e) => {
    e.preventDefault();
    if (!newSubtask.trim()) return;

    setAdding(true);
    try {
      const created = await api.createSubtask(taskId, { title: newSubtask.trim() });
      setSubtasks((prev) => [...prev, created]);
      setNewSubtask('');
    } catch (err) {
      console.error('Failed to add subtask:', err);
    } finally {
      setAdding(false);
    }
  };

  const handleAddBulk = async () => {
    if (!bulkText.trim()) return;

    const lines = bulkText.split('\n').filter(line => line.trim());
    if (lines.length === 0) return;

    setAdding(true);
    try {
      const newSubtasks = [];
      for (const line of lines) {
        const created = await api.createSubtask(taskId, { title: line.trim() });
        newSubtasks.push(created);
      }
      setSubtasks((prev) => [...prev, ...newSubtasks]);
      setBulkText('');
      setBulkMode(false);
    } catch (err) {
      console.error('Failed to add subtasks:', err);
    } finally {
      setAdding(false);
    }
  };

  const handleToggleSubtask = async (subtask) => {
    const newStatus = subtask.status === 'completed' ? 'pending' : 'completed';

    // Optimistic update
    setSubtasks((prev) => prev.map((s) =>
      s.id === subtask.id ? { ...s, status: newStatus } : s
    ));

    try {
      await api.updateSubtask(subtask.id, { status: newStatus });
    } catch (err) {
      console.error('Failed to update subtask:', err);
      // Revert on error
      setSubtasks((prev) => prev.map((s) =>
        s.id === subtask.id ? { ...s, status: subtask.status } : s
      ));
    }
  };

  const handleDeleteSubtask = async (subtaskId) => {
    // Optimistic update
    const previousSubtasks = [...subtasks];
    setSubtasks((prev) => prev.filter((s) => s.id !== subtaskId));

    try {
      await api.deleteSubtask(subtaskId);
    } catch (err) {
      console.error('Failed to delete subtask:', err);
      // Revert on error
      setSubtasks(previousSubtasks);
    }
  };

  return (
    <div className="subtask-list">
      {/* Progress bar */}
      {subtasks.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Progress
            </span>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {completedCount} of {subtasks.length} completed
            </span>
          </div>
          <div style={{
            height: '6px',
            background: 'var(--bg-primary)',
            borderRadius: 'var(--radius-full)',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              background: progress === 100 ? 'var(--status-completed)' : 'var(--accent-color)',
              borderRadius: 'var(--radius-full)',
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>
      )}

      {/* Subtask items */}
      {subtasks.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '24px',
          color: 'var(--text-muted)',
          background: 'var(--bg-tertiary)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '12px'
        }}>
          <p style={{ marginBottom: '4px' }}>No subtasks yet</p>
          <p style={{ fontSize: '0.8125rem' }}>Add subtasks to break down this task</p>
        </div>
      ) : (
        subtasks.map((subtask, index) => (
          <div
            key={subtask.id}
            className="subtask-item"
            style={{
              background: subtask.status === 'completed' ? 'var(--bg-primary)' : 'var(--bg-tertiary)',
              opacity: subtask.status === 'completed' ? 0.7 : 1,
            }}
          >
            <span style={{
              color: 'var(--text-muted)',
              fontSize: '0.75rem',
              width: '24px',
              flexShrink: 0
            }}>
              {index + 1}.
            </span>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              flex: 1,
              cursor: 'pointer',
              gap: '12px'
            }}>
              <input
                type="checkbox"
                checked={subtask.status === 'completed'}
                onChange={() => handleToggleSubtask(subtask)}
                style={{
                  width: '18px',
                  height: '18px',
                  cursor: 'pointer',
                  accentColor: 'var(--accent-color)',
                  flexShrink: 0
                }}
              />
              <span style={{
                textDecoration: subtask.status === 'completed' ? 'line-through' : 'none',
                color: subtask.status === 'completed' ? 'var(--text-muted)' : 'var(--text-primary)',
                flex: 1
              }}>
                {subtask.title}
              </span>
            </label>
            <button
              className="btn-icon subtask-delete"
              onClick={() => handleDeleteSubtask(subtask.id)}
              style={{ width: '28px', height: '28px', flexShrink: 0 }}
              title="Delete subtask"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ))
      )}

      {/* Add subtask form */}
      {!bulkMode ? (
        <div style={{ marginTop: '12px' }}>
          <form onSubmit={handleAddSubtask}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Add a subtask..."
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                style={{ flex: 1 }}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={adding || !newSubtask.trim()}
              >
                Add
              </button>
            </div>
          </form>
          <button
            type="button"
            onClick={() => setBulkMode(true)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent-color)',
              fontSize: '0.8125rem',
              cursor: 'pointer',
              marginTop: '8px',
              padding: '4px 0'
            }}
          >
            + Add multiple subtasks at once
          </button>
        </div>
      ) : (
        <div style={{ marginTop: '12px' }}>
          <textarea
            className="form-textarea"
            placeholder="Enter subtasks, one per line..."
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            rows={5}
            style={{ marginBottom: '8px' }}
          />
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setBulkMode(false);
                setBulkText('');
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleAddBulk}
              disabled={adding || !bulkText.trim()}
            >
              {adding ? 'Adding...' : `Add ${bulkText.split('\n').filter(l => l.trim()).length} Subtasks`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SubtaskList;
