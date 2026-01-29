import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import api from '../services/api';

function Header({
  view, setView, searchQuery, setSearchQuery, onNewTask, onScanEmails,
  selectionMode, setSelectionMode, selectedCount, totalCount,
  onSelectAll, onBulkDelete, onDeleteAll, onCancelSelection
}) {
  const { theme, setTheme, themes } = useTheme();
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (scanResult) {
      const timer = setTimeout(() => setScanResult(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [scanResult]);

  const handleScan = async (options = {}) => {
    setShowDropdown(false);
    setScanning(true);
    setScanResult(null);
    try {
      const result = await api.scanEmails(options);
      setScanResult(result);
      if (result.tasks_created > 0) {
        onScanEmails(); // Refresh task list
      }
    } catch (err) {
      setScanResult({ success: false, message: 'Scan failed: ' + err.message });
    } finally {
      setScanning(false);
    }
  };

  // Selection mode header
  if (selectionMode) {
    return (
      <header className="header selection-mode">
        <div className="header-left">
          <button className="btn btn-secondary" onClick={onCancelSelection}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            Cancel
          </button>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
            {selectedCount} of {totalCount} selected
          </span>
        </div>
        <div className="header-right">
          <button className="btn btn-secondary" onClick={onSelectAll}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <polyline points="9 11 12 14 22 4" />
            </svg>
            {selectedCount === totalCount ? 'Deselect All' : 'Select All'}
          </button>
          <button
            className="btn btn-danger"
            onClick={onBulkDelete}
            disabled={selectedCount === 0}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
            Delete Selected
          </button>
        </div>
      </header>
    );
  }

  return (
    <header className="header">
      <div className="header-left">
        <div className="search-bar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            className="search-input"
            placeholder="Search tasks, customers, orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="view-toggle">
          <button
            className={`view-btn ${view === 'board' ? 'active' : ''}`}
            onClick={() => setView('board')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6 }}>
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            Board
          </button>
          <button
            className={`view-btn ${view === 'list' ? 'active' : ''}`}
            onClick={() => setView('list')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6 }}>
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
            List
          </button>
        </div>
      </div>

      <div className="header-right">
        {/* Scan Result Toast */}
        {scanResult && (
          <div
            className={`scan-toast ${scanResult.success ? 'success' : 'error'}`}
            onClick={() => setScanResult(null)}
          >
            {scanResult.success ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span>
                  {scanResult.tasks_created > 0
                    ? `Created ${scanResult.tasks_created} task${scanResult.tasks_created > 1 ? 's' : ''}`
                    : 'No new tasks'
                  }
                  {scanResult.emails_scanned > 0 && ` (${scanResult.emails_scanned} emails scanned)`}
                </span>
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                <span>{scanResult.message}</span>
              </>
            )}
          </div>
        )}

        {/* Scan Button with Dropdown */}
        <div className="scan-dropdown" ref={dropdownRef}>
          <button
            className="btn btn-secondary"
            onClick={() => setShowDropdown(!showDropdown)}
            disabled={scanning}
          >
            {scanning ? (
              <>
                <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                Scanning...
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                Scan Inbox
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: 4 }}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </>
            )}
          </button>

          {showDropdown && (
            <div className="scan-dropdown-menu">
              <button onClick={() => handleScan({})}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                Scan Unread Only
                <span className="scan-dropdown-hint">Recommended</span>
              </button>
              <button onClick={() => handleScan({ days: 7 })}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                Past 7 Days
                <span className="scan-dropdown-hint">Recent emails</span>
              </button>
              <button onClick={() => handleScan({ days: 30 })}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                Past 30 Days
                <span className="scan-dropdown-hint">Last month</span>
              </button>
              <button onClick={() => handleScan({ scanAll: true })}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <line x1="3" y1="9" x2="21" y2="9" />
                  <line x1="9" y1="21" x2="9" y2="9" />
                </svg>
                Scan All Emails
                <span className="scan-dropdown-hint">Full import</span>
              </button>
            </div>
          )}
        </div>

        <button className="btn btn-primary" onClick={onNewTask}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Task
        </button>

        <button
          className="btn btn-secondary"
          onClick={() => setSelectionMode(true)}
          title="Select multiple tasks"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <polyline points="9 11 12 14 22 4" />
          </svg>
        </button>

        <button
          className="btn btn-secondary"
          onClick={onDeleteAll}
          title="Delete all tasks"
          style={{ color: 'var(--status-overdue)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        </button>

        <div className="theme-switcher">
          {Object.keys(themes).map((key) => (
            <button
              key={key}
              className={`theme-btn ${key} ${theme === key ? 'active' : ''}`}
              onClick={() => setTheme(key)}
              title={themes[key].name}
            />
          ))}
        </div>
      </div>
    </header>
  );
}

export default Header;
