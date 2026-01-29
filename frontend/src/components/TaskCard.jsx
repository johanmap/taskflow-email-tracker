import React from 'react';
import api from '../services/api';

function TaskCard({ task, onClick, onSubtaskToggle, selectionMode, isSelected, onToggleSelection }) {
  const getDueStatus = () => {
    if (!task.due_date) return '';

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(task.due_date);
    dueDate.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'overdue';
    if (diffDays <= 2) return 'soon';
    return '';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleSubtaskClick = async (e, subtask) => {
    e.stopPropagation(); // Don't open the modal

    const newStatus = subtask.status === 'completed' ? 'pending' : 'completed';

    try {
      await api.updateSubtask(subtask.id, { status: newStatus });
      if (onSubtaskToggle) {
        onSubtaskToggle(task.id, subtask.id, newStatus);
      }
    } catch (err) {
      console.error('Failed to update subtask:', err);
    }
  };

  const dueStatus = getDueStatus();
  const priorityClass = task.priority === 'high' ? 'high-priority' : task.priority === 'low' ? 'low-priority' : '';
  const subtasks = task.subtasks || [];
  const completedCount = subtasks.filter(s => s.status === 'completed').length;

  return (
    <div className={`task-card ${priorityClass} ${isSelected ? 'selected' : ''}`} onClick={onClick}>
      {/* Selection checkbox */}
      {selectionMode && (
        <div
          className={`task-selection-checkbox ${isSelected ? 'checked' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelection();
          }}
        >
          {isSelected && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>
      )}

      {/* Header with title and priority */}
      <div className="task-card-header">
        <div className="task-title">{task.title}</div>
        <div className={`task-priority ${task.priority}`} title={`${task.priority} priority`} />
      </div>

      {task.company && (
        <div className="task-company">{task.company}</div>
      )}

      {/* Subtasks displayed inline */}
      {subtasks.length > 0 && (
        <div className="task-subtasks-list">
          {subtasks.slice(0, 5).map((subtask) => (
            <div
              key={subtask.id}
              className={`task-subtask-item ${subtask.status === 'completed' ? 'completed' : ''}`}
              onClick={(e) => handleSubtaskClick(e, subtask)}
            >
              <div className={`subtask-checkbox ${subtask.status === 'completed' ? 'checked' : ''}`}>
                {subtask.status === 'completed' && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              <span className="subtask-text">{subtask.title}</span>
            </div>
          ))}
          {subtasks.length > 5 && (
            <div className="task-subtask-more">
              +{subtasks.length - 5} more
            </div>
          )}
        </div>
      )}

      {/* Footer with meta info */}
      <div className="task-meta">
        <div className="task-customer">
          {task.customer_name && (
            <>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>{task.customer_name}</span>
            </>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {subtasks.length > 0 && (
            <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>
              {completedCount}/{subtasks.length}
            </span>
          )}
          {task.due_date && (
            <div className={`task-due ${dueStatus}`}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>{formatDate(task.due_date)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TaskCard;
