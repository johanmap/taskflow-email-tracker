import React from 'react';

function StatsPanel({ stats }) {
  const cards = [
    { key: 'overdue', value: stats.overdue, label: 'Overdue', className: 'overdue' },
    { key: 'high_priority', value: stats.high_priority, label: 'High Priority', className: 'urgent' },
    { key: 'due_today', value: stats.due_today, label: 'Due Today', className: '' },
    { key: 'in_progress', value: stats.in_progress, label: 'In Progress', className: 'in-progress' },
    { key: 'pending', value: stats.pending, label: 'Pending', className: '' },
    { key: 'completed', value: stats.completed, label: 'Completed', className: '' },
  ];

  return (
    <div className="stats-panel">
      {cards.map((card) => (
        <div key={card.key} className={`stat-card ${card.className}`}>
          <div className="stat-value">{card.value}</div>
          <div className="stat-label">{card.label}</div>
        </div>
      ))}
    </div>
  );
}

export default StatsPanel;
