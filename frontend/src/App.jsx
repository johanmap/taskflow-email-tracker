import React, { useState } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import StatsPanel from './components/StatsPanel';
import TaskBoard from './components/TaskBoard';
import TaskList from './components/TaskList';
import TaskModal from './components/TaskModal';
import SettingsModal from './components/SettingsModal';
import { useTasks, useStats, useTemplates } from './hooks/useTasks';

function App() {
  const [view, setView] = useState('board');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState(new Set());

  const { tasks, loading, fetchTasks, createTask, updateTask, deleteTask, applyTemplate, setTasks } = useTasks();
  const { stats, refresh: refreshStats } = useStats();
  const { templates } = useTemplates();

  const filteredTasks = tasks.filter((task) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      task.title?.toLowerCase().includes(query) ||
      task.customer_name?.toLowerCase().includes(query) ||
      task.company?.toLowerCase().includes(query) ||
      task.po_number?.toLowerCase().includes(query) ||
      task.so_number?.toLowerCase().includes(query)
    );
  });

  const handleCreateTask = async (data) => {
    // Extract templateId if present
    const { templateId, ...taskData } = data;
    const newTask = await createTask(taskData);

    // Apply template if one was selected
    if (templateId && newTask && newTask.id) {
      await applyTemplate(newTask.id, parseInt(templateId));
    }

    refreshStats();
    setShowTaskModal(false);
  };

  const handleUpdateTask = async (id, data) => {
    const updated = await updateTask(id, data);
    refreshStats();
    setSelectedTask(null);
    return updated;
  };

  const handleDeleteTask = async (id) => {
    await deleteTask(id);
    refreshStats();
    setSelectedTask(null);
  };

  const handleApplyTemplate = async (taskId, templateId) => {
    const updated = await applyTemplate(taskId, templateId);
    setSelectedTask(updated);
  };

  const handleTaskClick = async (task) => {
    // Fetch fresh task data to get latest subtasks
    try {
      const { default: api } = await import('./services/api');
      const freshTask = await api.getTask(task.id);
      setSelectedTask(freshTask);
    } catch (err) {
      setSelectedTask(task);
    }
  };

  const handleStatusChange = async (id, data) => {
    await updateTask(id, data);
    refreshStats();
  };

  const handleSubtaskToggle = (taskId, subtaskId, newStatus) => {
    // Update local state immediately for responsive UI
    setTasks(prevTasks => prevTasks.map(task => {
      if (task.id === taskId) {
        return {
          ...task,
          subtasks: task.subtasks.map(st =>
            st.id === subtaskId ? { ...st, status: newStatus } : st
          )
        };
      }
      return task;
    }));
  };

  const handleScanComplete = () => {
    // Called when email scan completes to refresh the task list
    fetchTasks();
    refreshStats();
  };

  const handleToggleSelection = (taskId) => {
    setSelectedTaskIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedTaskIds.size === filteredTasks.length) {
      setSelectedTaskIds(new Set());
    } else {
      setSelectedTaskIds(new Set(filteredTasks.map(t => t.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTaskIds.size === 0) return;

    const confirmMsg = `Delete ${selectedTaskIds.size} selected task${selectedTaskIds.size > 1 ? 's' : ''}?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const { default: api } = await import('./services/api');
      await api.bulkDeleteTasks([...selectedTaskIds]);
      setSelectedTaskIds(new Set());
      setSelectionMode(false);
      fetchTasks();
      refreshStats();
    } catch (err) {
      console.error('Bulk delete failed:', err);
    }
  };

  const handleDeleteAll = async () => {
    const confirmMsg = `DELETE ALL ${tasks.length} TASKS?\n\nThis will also clear processed email history so you can rescan.\n\nThis cannot be undone!`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const { default: api } = await import('./services/api');
      await api.deleteAllTasks();
      setSelectedTaskIds(new Set());
      setSelectionMode(false);
      fetchTasks();
      refreshStats();
    } catch (err) {
      console.error('Delete all failed:', err);
    }
  };

  const handleCancelSelection = () => {
    setSelectionMode(false);
    setSelectedTaskIds(new Set());
  };

  return (
    <div className="app-container">
      <Sidebar onSettingsClick={() => setShowSettings(true)} />

      <div className="main-content">
        <Header
          view={view}
          setView={setView}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onNewTask={() => setShowTaskModal(true)}
          onScanEmails={handleScanComplete}
          selectionMode={selectionMode}
          setSelectionMode={setSelectionMode}
          selectedCount={selectedTaskIds.size}
          totalCount={filteredTasks.length}
          onSelectAll={handleSelectAll}
          onBulkDelete={handleBulkDelete}
          onDeleteAll={handleDeleteAll}
          onCancelSelection={handleCancelSelection}
        />

        <div className="content-area">
          <StatsPanel stats={stats} />

          {loading ? (
            <div className="loading">
              <div className="spinner" />
            </div>
          ) : view === 'board' ? (
            <TaskBoard
              tasks={filteredTasks}
              onTaskClick={handleTaskClick}
              onStatusChange={handleStatusChange}
              onSubtaskToggle={handleSubtaskToggle}
              selectionMode={selectionMode}
              selectedTaskIds={selectedTaskIds}
              onToggleSelection={handleToggleSelection}
            />
          ) : (
            <TaskList
              tasks={filteredTasks}
              onTaskClick={handleTaskClick}
              selectionMode={selectionMode}
              selectedTaskIds={selectedTaskIds}
              onToggleSelection={handleToggleSelection}
            />
          )}
        </div>
      </div>

      {showTaskModal && (
        <TaskModal
          templates={templates}
          onClose={() => setShowTaskModal(false)}
          onSave={handleCreateTask}
        />
      )}

      {selectedTask && (
        <TaskModal
          task={selectedTask}
          templates={templates}
          onClose={() => setSelectedTask(null)}
          onSave={(data) => handleUpdateTask(selectedTask.id, data)}
          onDelete={() => handleDeleteTask(selectedTask.id)}
          onApplyTemplate={(templateId) => handleApplyTemplate(selectedTask.id, templateId)}
        />
      )}

      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}

export default App;
