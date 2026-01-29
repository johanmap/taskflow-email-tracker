import React, { useState, useEffect } from 'react';
import api from '../services/api';

function SettingsModal({ onClose }) {
  const [settings, setSettings] = useState({
    imap_server: '',
    imap_port: '993',
    imap_email: '',
    imap_password: '',
    imap_use_ssl: 'true',
    telegram_bot_token: '',
    telegram_chat_id: '',
    scan_interval_minutes: '5',
    default_due_days: '3',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingImap, setTestingImap] = useState(false);
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [message, setMessage] = useState(null);
  const [activeTab, setActiveTab] = useState('email');

  // Trigger words state
  const [triggerWords, setTriggerWords] = useState({});
  const [marketingFilters, setMarketingFilters] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [newWord, setNewWord] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [newMarketingFilter, setNewMarketingFilter] = useState('');

  // Email logs state
  const [emailLogs, setEmailLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await api.getSettings();
        setSettings((prev) => ({ ...prev, ...data }));
      } catch (err) {
        console.error('Failed to fetch settings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  // Fetch trigger words when tab becomes active
  useEffect(() => {
    if (activeTab === 'triggers') {
      const fetchTriggerWords = async () => {
        try {
          const data = await api.getTriggerWords();
          setTriggerWords(data.trigger_words || {});
          setMarketingFilters(data.marketing_filters || []);
          if (Object.keys(data.trigger_words || {}).length > 0) {
            setSelectedCategory(Object.keys(data.trigger_words)[0]);
          }
        } catch (err) {
          console.error('Failed to fetch trigger words:', err);
        }
      };
      fetchTriggerWords();
    }
  }, [activeTab]);

  // Fetch email logs when tab becomes active
  useEffect(() => {
    if (activeTab === 'logs') {
      fetchEmailLogs();
    }
  }, [activeTab]);

  const fetchEmailLogs = async () => {
    setLogsLoading(true);
    try {
      const data = await api.getEmailLogs(50);
      setEmailLogs(data);
    } catch (err) {
      console.error('Failed to fetch email logs:', err);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleClearLogs = async () => {
    try {
      await api.clearEmailLogs();
      setEmailLogs([]);
      setMessage({ type: 'success', text: 'Logs cleared' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to clear logs' });
    }
  };

  const handleAddCategory = () => {
    if (newCategory.trim() && !triggerWords[newCategory.trim().toLowerCase()]) {
      setTriggerWords(prev => ({
        ...prev,
        [newCategory.trim().toLowerCase()]: []
      }));
      setSelectedCategory(newCategory.trim().toLowerCase());
      setNewCategory('');
    }
  };

  const handleAddWord = () => {
    if (newWord.trim() && selectedCategory) {
      setTriggerWords(prev => ({
        ...prev,
        [selectedCategory]: [...(prev[selectedCategory] || []), newWord.trim().toLowerCase()]
      }));
      setNewWord('');
    }
  };

  const handleRemoveWord = (category, word) => {
    setTriggerWords(prev => ({
      ...prev,
      [category]: prev[category].filter(w => w !== word)
    }));
  };

  const handleRemoveCategory = (category) => {
    setTriggerWords(prev => {
      const updated = { ...prev };
      delete updated[category];
      return updated;
    });
    if (selectedCategory === category) {
      setSelectedCategory(Object.keys(triggerWords).find(k => k !== category) || '');
    }
  };

  const handleAddMarketingFilter = () => {
    if (newMarketingFilter.trim() && !marketingFilters.includes(newMarketingFilter.trim().toLowerCase())) {
      setMarketingFilters(prev => [...prev, newMarketingFilter.trim().toLowerCase()]);
      setNewMarketingFilter('');
    }
  };

  const handleRemoveMarketingFilter = (filter) => {
    setMarketingFilters(prev => prev.filter(f => f !== filter));
  };

  const handleSaveTriggerWords = async () => {
    setSaving(true);
    try {
      await api.updateTriggerWords({
        trigger_words: triggerWords,
        marketing_filters: marketingFilters
      });
      setMessage({ type: 'success', text: 'Trigger words saved!' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save trigger words' });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await api.updateSettings(settings);
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestImap = async () => {
    setTestingImap(true);
    setMessage(null);
    try {
      await api.updateSettings(settings);
      const result = await api.testImap();
      setMessage({ type: result.success ? 'success' : 'error', text: result.message });
    } catch (err) {
      setMessage({ type: 'error', text: 'Connection test failed' });
    } finally {
      setTestingImap(false);
    }
  };

  const handleTestTelegram = async () => {
    setTestingTelegram(true);
    setMessage(null);
    try {
      await api.updateSettings(settings);
      const result = await api.testTelegram();
      setMessage({ type: result.success ? 'success' : 'error', text: result.message });
    } catch (err) {
      setMessage({ type: 'error', text: 'Telegram test failed' });
    } finally {
      setTestingTelegram(false);
    }
  };

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal">
          <div className="loading">
            <div className="spinner" />
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { key: 'email', label: 'Email' },
    { key: 'triggers', label: 'Triggers' },
    { key: 'logs', label: 'Email Log' },
    { key: 'telegram', label: 'Telegram' },
    { key: 'general', label: 'General' },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        <div className="modal-header">
          <h2 className="modal-title">Settings</h2>
          <button className="btn-icon" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div style={{
          display: 'flex',
          gap: '4px',
          padding: '0 24px',
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--bg-tertiary)'
        }}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              style={{
                padding: '12px 16px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab.key ? '2px solid var(--accent-color)' : '2px solid transparent',
                color: activeTab === tab.key ? 'var(--accent-color)' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all var(--transition-fast)',
              }}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="modal-body">
          {message && (
            <div style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              marginBottom: '20px',
              background: message.type === 'success' ? 'var(--status-completed-bg)' : 'var(--status-overdue-bg)',
              color: message.type === 'success' ? 'var(--status-completed)' : 'var(--status-overdue)',
              border: `1px solid ${message.type === 'success' ? 'var(--status-completed)' : 'var(--status-overdue)'}`,
              fontSize: '0.9375rem',
              fontWeight: 500,
            }}>
              {message.text}
            </div>
          )}

          {activeTab === 'email' && (
            <>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '0.9375rem', lineHeight: 1.6 }}>
                Connect your email inbox to automatically create tasks from incoming emails containing trigger words.
              </p>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">IMAP Server</label>
                  <input
                    type="text"
                    name="imap_server"
                    className="form-input"
                    value={settings.imap_server}
                    onChange={handleChange}
                    placeholder="mail.example.com"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Port</label>
                  <input
                    type="number"
                    name="imap_port"
                    className="form-input"
                    value={settings.imap_port}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    name="imap_email"
                    className="form-input"
                    value={settings.imap_email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    name="imap_password"
                    className="form-input"
                    value={settings.imap_password}
                    onChange={handleChange}
                    placeholder="Enter password"
                  />
                </div>
              </div>

              <button
                className="btn btn-secondary"
                onClick={handleTestImap}
                disabled={testingImap}
                style={{ width: '100%' }}
              >
                {testingImap ? (
                  <>
                    <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
                    Testing Connection...
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    Test IMAP Connection
                  </>
                )}
              </button>
            </>
          )}

          {activeTab === 'telegram' && (
            <>
              <div style={{
                background: 'var(--bg-tertiary)',
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                marginBottom: '20px',
                border: '1px solid var(--border-color)',
              }}>
                <div style={{ fontWeight: 600, marginBottom: '12px', color: 'var(--text-primary)' }}>
                  Setup Instructions
                </div>
                <ol style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.8, paddingLeft: '20px' }}>
                  <li>Open Telegram and search for <strong>@BotFather</strong></li>
                  <li>Send <code style={{ background: 'var(--bg-primary)', padding: '2px 6px', borderRadius: '4px' }}>/newbot</code> and follow the instructions</li>
                  <li>Copy the bot token and paste it below</li>
                  <li>Start a chat with your bot and send any message</li>
                  <li>Get your Chat ID from <strong>@userinfobot</strong></li>
                </ol>
              </div>

              <div className="form-group">
                <label className="form-label">Bot Token</label>
                <input
                  type="text"
                  name="telegram_bot_token"
                  className="form-input"
                  value={settings.telegram_bot_token}
                  onChange={handleChange}
                  placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Chat ID</label>
                <input
                  type="text"
                  name="telegram_chat_id"
                  className="form-input"
                  value={settings.telegram_chat_id}
                  onChange={handleChange}
                  placeholder="123456789"
                />
              </div>

              <button
                className="btn btn-secondary"
                onClick={handleTestTelegram}
                disabled={testingTelegram}
                style={{ width: '100%' }}
              >
                {testingTelegram ? (
                  <>
                    <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
                    Sending Test Message...
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 2L11 13" />
                      <path d="M22 2L15 22 11 13 2 9 22 2" />
                    </svg>
                    Send Test Message
                  </>
                )}
              </button>
            </>
          )}

          {activeTab === 'general' && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Scan Interval (minutes)</label>
                  <input
                    type="number"
                    name="scan_interval_minutes"
                    className="form-input"
                    value={settings.scan_interval_minutes}
                    onChange={handleChange}
                    min="1"
                  />
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                    How often to check for new emails
                  </p>
                </div>

                <div className="form-group">
                  <label className="form-label">Default Due Days</label>
                  <input
                    type="number"
                    name="default_due_days"
                    className="form-input"
                    value={settings.default_due_days}
                    onChange={handleChange}
                    min="1"
                  />
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                    Default due date for new tasks
                  </p>
                </div>
              </div>
            </>
          )}

          {activeTab === 'triggers' && (
            <>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '0.9375rem', lineHeight: 1.6 }}>
                Configure which words in emails trigger task creation, and which emails to filter out.
              </p>

              {/* Trigger Words Section */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px', color: 'var(--text-primary)' }}>
                  Trigger Words
                </h3>

                {/* Category Tabs */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                  {Object.keys(triggerWords).map(category => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-full)',
                        border: selectedCategory === category ? '1px solid var(--accent-color)' : '1px solid var(--border-color)',
                        background: selectedCategory === category ? 'var(--accent-subtle)' : 'var(--bg-tertiary)',
                        color: selectedCategory === category ? 'var(--accent-color)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontSize: '0.8125rem',
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      {category}
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        ({triggerWords[category]?.length || 0})
                      </span>
                    </button>
                  ))}
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <input
                      type="text"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      placeholder="New category"
                      style={{
                        padding: '6px 10px',
                        borderRadius: 'var(--radius-full)',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-tertiary)',
                        color: 'var(--text-primary)',
                        fontSize: '0.8125rem',
                        width: '120px'
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                    />
                    <button
                      onClick={handleAddCategory}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 'var(--radius-full)',
                        border: '1px solid var(--accent-color)',
                        background: 'var(--accent-subtle)',
                        color: 'var(--accent-color)',
                        cursor: 'pointer',
                        fontSize: '0.8125rem'
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Words in Selected Category */}
                {selectedCategory && (
                  <div style={{
                    background: 'var(--bg-tertiary)',
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>{selectedCategory}</span>
                      <button
                        onClick={() => handleRemoveCategory(selectedCategory)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--status-overdue)',
                          background: 'transparent',
                          color: 'var(--status-overdue)',
                          cursor: 'pointer',
                          fontSize: '0.75rem'
                        }}
                      >
                        Delete Category
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                      {triggerWords[selectedCategory]?.map(word => (
                        <span
                          key={word}
                          style={{
                            padding: '4px 10px',
                            borderRadius: 'var(--radius-full)',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            fontSize: '0.8125rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          {word}
                          <button
                            onClick={() => handleRemoveWord(selectedCategory, word)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: 'var(--text-muted)',
                              padding: 0,
                              lineHeight: 1
                            }}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        value={newWord}
                        onChange={(e) => setNewWord(e.target.value)}
                        placeholder="Add word..."
                        className="form-input"
                        style={{ flex: 1 }}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddWord()}
                      />
                      <button className="btn btn-secondary" onClick={handleAddWord}>
                        Add
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Marketing Filters Section */}
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px', color: 'var(--text-primary)' }}>
                  Marketing Filters
                </h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Emails containing these words will be skipped:
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                  {marketingFilters.map(filter => (
                    <span
                      key={filter}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-full)',
                        background: 'var(--status-overdue-bg)',
                        border: '1px solid var(--status-overdue)',
                        color: 'var(--status-overdue)',
                        fontSize: '0.8125rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      {filter}
                      <button
                        onClick={() => handleRemoveMarketingFilter(filter)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--status-overdue)',
                          padding: 0,
                          lineHeight: 1
                        }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={newMarketingFilter}
                    onChange={(e) => setNewMarketingFilter(e.target.value)}
                    placeholder="Add filter word..."
                    className="form-input"
                    style={{ flex: 1 }}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddMarketingFilter()}
                  />
                  <button className="btn btn-secondary" onClick={handleAddMarketingFilter}>
                    Add
                  </button>
                </div>
              </div>

              <button
                className="btn btn-primary"
                onClick={handleSaveTriggerWords}
                disabled={saving}
                style={{ width: '100%', marginTop: '20px' }}
              >
                {saving ? 'Saving...' : 'Save Trigger Words'}
              </button>
            </>
          )}

          {activeTab === 'logs' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
                  Recent email scan activity
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-secondary" onClick={fetchEmailLogs} disabled={logsLoading}>
                    Refresh
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={handleClearLogs}
                    style={{ color: 'var(--status-overdue)' }}
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {logsLoading ? (
                <div className="loading">
                  <div className="spinner" />
                </div>
              ) : emailLogs.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: 'var(--text-muted)'
                }}>
                  No email scan logs yet. Click "Scan Inbox" to start.
                </div>
              ) : (
                <div style={{
                  maxHeight: '400px',
                  overflowY: 'auto',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)'
                }}>
                  {emailLogs.map(log => (
                    <div
                      key={log.id}
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid var(--border-color)',
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'flex-start'
                      }}
                    >
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        marginTop: '6px',
                        flexShrink: 0,
                        background: log.result === 'created'
                          ? 'var(--status-completed)'
                          : log.result === 'skipped_marketing'
                          ? 'var(--status-overdue)'
                          : log.result === 'skipped_no_trigger'
                          ? 'var(--status-upcoming)'
                          : 'var(--text-muted)'
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          color: 'var(--text-primary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {log.subject || '(No subject)'}
                        </div>
                        <div style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-muted)',
                          marginTop: '2px'
                        }}>
                          From: {log.from_address || 'Unknown'}
                        </div>
                        <div style={{
                          fontSize: '0.75rem',
                          color: log.result === 'created' ? 'var(--status-completed)' : 'var(--text-secondary)',
                          marginTop: '4px'
                        }}>
                          {log.result === 'created' && '✓ Task created'}
                          {log.result === 'skipped_marketing' && '⊘ Filtered (marketing)'}
                          {log.result === 'skipped_no_trigger' && '○ Skipped (no trigger words)'}
                          {log.result === 'skipped_duplicate' && '↻ Already processed'}
                          {log.reason && ` — ${log.reason}`}
                        </div>
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        whiteSpace: 'nowrap'
                      }}>
                        {new Date(log.scan_time).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;
