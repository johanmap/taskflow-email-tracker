import React, { useState } from 'react';
import TaskCard from './TaskCard';

const STATUSES = [
  { key: 'overdue', label: 'Overdue', color: 'var(--status-overdue)', dbStatus: null },
  { key: 'urgent', label: 'Urgent', color: 'var(--status-urgent)', dbStatus: null },
  { key: 'upcoming_soon', label: 'Upcoming', color: 'var(--status-upcoming)', dbStatus: null },
  { key: 'in_progress', label: 'In Progress', color: 'var(--status-in-progress)', dbStatus: 'in_progress' },
  { key: 'scheduled', label: 'Scheduled', color: 'var(--status-scheduled)', dbStatus: 'scheduled' },
];

function TaskBoard({ tasks, onTaskClick, onStatusChange, onSubtaskToggle, selectionMode, selectedTaskIds, onToggleSelection }) {
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [completedCollapsed, setCompletedCollapsed] = useState(true);
  const [draggingTaskId, setDraggingTaskId] = useState(null);

  const getEffectiveStatus = (task) => {
    // Completed and in_progress are explicit statuses that take priority
    if (task.status === 'completed') return 'completed';
    if (task.status === 'in_progress') return 'in_progress';

    // For scheduled tasks, check due dates for visual grouping
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

    return task.status;
  };

  const groupedTasks = [...STATUSES, { key: 'completed' }].reduce((acc, status) => {
    acc[status.key] = tasks.filter((task) => getEffectiveStatus(task) === status.key);
    return acc;
  }, {});

  const completedCount = groupedTasks['completed']?.length || 0;

  const handleDragStart = (e, task) => {
    setDraggingTaskId(task.id);
    e.dataTransfer.setData('text/plain', task.id.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggingTaskId(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e, columnKey) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverColumn(columnKey);
  };

  const handleDragLeave = (e, columnKey) => {
    e.preventDefault();
    e.stopPropagation();
    // Only clear if we're actually leaving this column
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      if (dragOverColumn === columnKey) {
        setDragOverColumn(null);
      }
    }
  };

  const handleDrop = async (e, columnKey) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverColumn(null);

    const taskId = parseInt(e.dataTransfer.getData('text/plain'));
    if (!taskId) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Determine what status to set based on the target column
    let newStatus;
    if (columnKey === 'completed') {
      newStatus = 'completed';
    } else if (columnKey === 'in_progress') {
      newStatus = 'in_progress';
    } else if (columnKey === 'scheduled') {
      newStatus = 'scheduled';
    } else {
      // For overdue, urgent, upcoming_soon - keep as scheduled but they'll show in proper column based on due date
      newStatus = 'scheduled';
    }

    // Only update if status actually changes
    if (task.status !== newStatus) {
      try {
        await onStatusChange(taskId, { status: newStatus });
      } catch (err) {
        console.error('Failed to update task status:', err);
      }
    }
  };

  return (
    <div className="kanban-board">
      {STATUSES.map((status) => (
        <div
          key={status.key}
          className={`kanban-column ${dragOverColumn === status.key ? 'dragging-over' : ''}`}
          onDragOver={handleDragOver}
          onDragEnter={(e) => handleDragEnter(e, status.key)}
          onDragLeave={(e) => handleDragLeave(e, status.key)}
          onDrop={(e) => handleDrop(e, status.key)}
        >
          <div className="column-header">
            <div className="column-title">
              <span style={{ backgroundColor: status.color }} />
              {status.label}
            </div>
            <span className="column-count">{groupedTasks[status.key]?.length || 0}</span>
          </div>

          <div className="column-content">
            {groupedTasks[status.key]?.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px 8px' }}>
                <p style={{ fontSize: '0.75rem' }}>No tasks</p>
              </div>
            ) : (
              groupedTasks[status.key]?.map((task) => (
                <div
                  key={task.id}
                  draggable={!selectionMode}
                  onDragStart={(e) => !selectionMode && handleDragStart(e, task)}
                  onDragEnd={handleDragEnd}
                  style={{ opacity: draggingTaskId === task.id ? 0.5 : 1 }}
                >
                  <TaskCard
                    task={task}
                    onClick={() => selectionMode ? onToggleSelection(task.id) : onTaskClick(task)}
                    onSubtaskToggle={onSubtaskToggle}
                    selectionMode={selectionMode}
                    isSelected={selectedTaskIds?.has(task.id)}
                    onToggleSelection={() => onToggleSelection(task.id)}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      ))}

      {/* Completed Column - Collapsible */}
      <div
        className={`kanban-column completed-column ${completedCollapsed ? 'collapsed' : ''} ${dragOverColumn === 'completed' ? 'dragging-over' : ''}`}
        onClick={completedCollapsed ? () => setCompletedCollapsed(false) : undefined}
        onDragOver={handleDragOver}
        onDragEnter={(e) => handleDragEnter(e, 'completed')}
        onDragLeave={(e) => handleDragLeave(e, 'completed')}
        onDrop={(e) => handleDrop(e, 'completed')}
      >
        <div className="column-header">
          <div className="column-title">
            <span style={{ backgroundColor: 'var(--status-completed)' }} />
            {completedCollapsed ? 'Done' : 'Completed'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="column-count">{completedCount}</span>
            {!completedCollapsed && (
              <button
                className="collapse-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setCompletedCollapsed(true);
                }}
                title="Collapse"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {!completedCollapsed && (
          <div className="column-content">
            {completedCount === 0 ? (
              <div className="empty-state" style={{ padding: '24px 8px' }}>
                <p style={{ fontSize: '0.75rem' }}>No completed tasks</p>
              </div>
            ) : (
              groupedTasks['completed']?.map((task) => (
                <div
                  key={task.id}
                  draggable={!selectionMode}
                  onDragStart={(e) => !selectionMode && handleDragStart(e, task)}
                  onDragEnd={handleDragEnd}
                  style={{ opacity: draggingTaskId === task.id ? 0.5 : 1 }}
                >
                  <TaskCard
                    task={task}
                    onClick={() => selectionMode ? onToggleSelection(task.id) : onTaskClick(task)}
                    onSubtaskToggle={onSubtaskToggle}
                    selectionMode={selectionMode}
                    isSelected={selectedTaskIds?.has(task.id)}
                    onToggleSelection={() => onToggleSelection(task.id)}
                  />
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default TaskBoard;
