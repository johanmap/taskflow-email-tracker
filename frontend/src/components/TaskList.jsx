import React from 'react';

function TaskList({ tasks, onTaskClick, selectionMode, selectedTaskIds, onToggleSelection }) {
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusClass = (task) => {
    if (task.status === 'completed') return 'completed';

    if (task.due_date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDate = new Date(task.due_date);
      dueDate.setHours(0, 0, 0, 0);

      const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

      if (diffDays < 0) return 'overdue';
      if (diffDays === 0 && task.priority === 'high') return 'urgent';
      if (diffDays <= 2) return 'upcoming_soon';
    }

    return task.status.replace('-', '_');
  };

  const getStatusLabel = (status) => {
    const labels = {
      overdue: 'Overdue',
      urgent: 'Urgent',
      upcoming_soon: 'Upcoming',
      in_progress: 'In Progress',
      scheduled: 'Scheduled',
      completed: 'Completed',
    };
    return labels[status] || status;
  };

  if (tasks.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.3 }}>
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
            <rect x="9" y="3" width="6" height="4" rx="1" />
            <path d="M9 12h6" />
            <path d="M9 16h6" />
          </svg>
        </div>
        <p style={{ fontSize: '1rem', marginBottom: '8px' }}>No tasks found</p>
        <p style={{ fontSize: '0.875rem' }}>Create a new task or scan your inbox</p>
      </div>
    );
  }

  return (
    <div className="task-list">
      <div className="task-list-header" style={selectionMode ? { gridTemplateColumns: '40px 2fr 1fr 1fr 100px 120px' } : {}}>
        {selectionMode && <div></div>}
        <div>Task</div>
        <div>Customer</div>
        <div>Due Date</div>
        <div>Priority</div>
        <div>Status</div>
      </div>

      {tasks.map((task) => {
        const statusClass = getStatusClass(task);
        const isSelected = selectedTaskIds?.has(task.id);
        return (
          <div
            key={task.id}
            className={`task-list-item ${isSelected ? 'selected' : ''}`}
            style={selectionMode ? { gridTemplateColumns: '40px 2fr 1fr 1fr 100px 120px' } : {}}
            onClick={() => selectionMode ? onToggleSelection(task.id) : onTaskClick(task)}
          >
            {selectionMode && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div
                  className={`task-selection-checkbox ${isSelected ? 'checked' : ''}`}
                  style={{ position: 'static' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSelection(task.id);
                  }}
                >
                  {isSelected && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
              </div>
            )}
            <div>
              <div style={{ fontWeight: 600, marginBottom: '2px' }}>{task.title}</div>
              {task.company && (
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{task.company}</div>
              )}
            </div>

            <div style={{ color: 'var(--text-secondary)' }}>{task.customer_name || '-'}</div>

            <div style={{ color: 'var(--text-secondary)' }}>{formatDate(task.due_date)}</div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: `var(--priority-${task.priority})`,
                }}
              />
              <span style={{ textTransform: 'capitalize', color: 'var(--text-secondary)' }}>
                {task.priority}
              </span>
            </div>

            <div>
              <span className={`status-badge ${statusClass}`}>
                {getStatusLabel(statusClass)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default TaskList;
