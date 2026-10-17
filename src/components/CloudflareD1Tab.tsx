import React, { useState, useEffect } from 'react';
import {
  Database,
  Terminal,
  Sliders,
  Code,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  PlusCircle,
  Edit3,
  Trash2,
  Save,
  Play,
  Copy,
  ExternalLink,
  Search,
  Eye,
  EyeOff,
  Check,
  X,
  Layers,
  Sparkles,
  Award,
  Radio,
  Users,
  Music,
  FileText,
  UploadCloud,
  CheckCheck
} from 'lucide-react';

interface CloudflareD1TabProps {
  onDataChanged?: () => void;
}

type D1SubTab = 'records' | 'sql' | 'config' | 'guide';
type D1TableName = 'posts' | 'songs' | 'users' | 'webhooks' | 'ranks' | 'elements';

export const CloudflareD1Tab: React.FC<CloudflareD1TabProps> = ({ onDataChanged }) => {
  // Sub-tabs
  const [subTab, setSubTab] = useState<D1SubTab>('records');

  // Config State
  const [accountId, setAccountId] = useState('');
  const [databaseId, setDatabaseId] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [hasStoredToken, setHasStoredToken] = useState(false);
  const [showTokenText, setShowTokenText] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Testing & Init State
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initResult, setInitResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; counts?: Record<string, number>; message?: string } | null>(null);

  // Manual Record Manager State
  const [selectedTable, setSelectedTable] = useState<D1TableName>('posts');
  const [records, setRecords] = useState<any[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [recordSearch, setRecordSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [rawJsonMode, setRawJsonMode] = useState(false);
  const [rawJsonText, setRawJsonText] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSavingRecord, setIsSavingRecord] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeletingRecord, setIsDeletingRecord] = useState(false);

  // SQL Console State
  const [sqlQuery, setSqlQuery] = useState<string>('SELECT * FROM posts ORDER BY publishedAt DESC LIMIT 10;');
  const [isExecutingSql, setIsExecutingSql] = useState(false);
  const [sqlResult, setSqlResult] = useState<any>(null);
  const [sqlError, setSqlError] = useState<string | null>(null);

  // Copy Feedback
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Fetch D1 Config
  const loadD1Config = async () => {
    setIsLoadingConfig(true);
    try {
      const res = await fetch('[https://robeats-d1-api.anh6052018.workers.dev/api](https://robeats-d1-api.anh6052018.workers.dev/api)/admin/d1/config');
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setAccountId(data.config.accountId || '');
          setDatabaseId(data.config.databaseId || '');
          setHasStoredToken(Boolean(data.config.hasApiToken));
          setEnabled(Boolean(data.config.enabled));
          setIsReady(Boolean(data.config.isReady));
        }
      }
    } catch (err) {
      console.error('Failed to load D1 config', err);
    } finally {
      setIsLoadingConfig(false);
    }
  };

  // Fetch Records for Selected Table
  const loadRecords = async (table = selectedTable) => {
    setIsLoadingRecords(true);
    setFormError(null);
    try {
      const res = await fetch(`[https://robeats-d1-api.anh6052018.workers.dev/api/](https://robeats-d1-api.anh6052018.workers.dev/api/)admin/d1/records/${table}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(Array.isArray(data.records) ? data.records : []);
      } else {
        const errData = await res.json().catch(() => ({}));
        setFormError(errData.error || `Failed to fetch records from ${table}`);
      }
    } catch (err: any) {
      setFormError(err.message || `Failed to connect to ${table}`);
    } finally {
      setIsLoadingRecords(false);
    }
  };

  useEffect(() => {
    loadD1Config();
  }, []);

  useEffect(() => {
    if (subTab === 'records') {
      loadRecords(selectedTable);
    }
  }, [subTab, selectedTable]);

  // Save Configuration
  const handleSaveConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingConfig(true);
    setTestResult(null);
    try {
      const res = await fetch('[https://robeats-d1-api.anh6052018.workers.dev/api](https://robeats-d1-api.anh6052018.workers.dev/api)/admin/d1/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          databaseId,
          apiToken: apiToken ? apiToken : undefined,
          enabled,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setHasStoredToken(Boolean(data.config?.hasApiToken));
        setIsReady(Boolean(data.config?.isReady));
        setTestResult({ success: true, message: 'Cloudflare D1 credentials saved successfully!' });
        if (onDataChanged) onDataChanged();
      } else {
        setTestResult({ success: false, message: data.error || 'Failed to save configuration' });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Network error saving config' });
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Test Connection
  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('[https://robeats-d1-api.anh6052018.workers.dev/api](https://robeats-d1-api.anh6052018.workers.dev/api)/admin/d1/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: accountId || undefined,
          databaseId: databaseId || undefined,
          apiToken: apiToken || undefined,
        }),
      });
      const data = await res.json();
      setTestResult({
        success: Boolean(data.success),
        message: data.message || (data.success ? 'Connection verified!' : 'Connection failed'),
      });
      if (data.success) {
        setIsReady(true);
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Connection test failed' });
    } finally {
      setIsTesting(false);
    }
  };

  // Initialize Tables
  const handleInitTables = async () => {
    setIsInitializing(true);
    setInitResult(null);
    try {
      const res = await fetch('[https://robeats-d1-api.anh6052018.workers.dev/api](https://robeats-d1-api.anh6052018.workers.dev/api)/admin/d1/init', { method: 'POST' });
      const data = await res.json();
      setInitResult({
        success: Boolean(data.success),
        message: data.message || data.error || 'D1 tables initialized',
      });
    } catch (err: any) {
      setInitResult({ success: false, message: err.message || 'Failed to initialize tables' });
    } finally {
      setIsInitializing(false);
    }
  };

  // One-Click Sync All Local Data to D1
  const handleSyncAll = async () => {
    if (!confirm('This will copy all current local posts, songs, accounts, ranks, elements, and webhooks into your Cloudflare D1 database. Continue?')) {
      return;
    }
    setIsSyncingAll(true);
    setSyncResult(null);
    try {
      const res = await fetch('[https://robeats-d1-api.anh6052018.workers.dev/api](https://robeats-d1-api.anh6052018.workers.dev/api)/admin/d1/sync-all', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setSyncResult({
          success: true,
          counts: data.counts,
          message: `Successfully migrated: ${data.counts.posts} posts, ${data.counts.songs} songs, ${data.counts.users} accounts, ${data.counts.ranks} ranks, ${data.counts.elements} elements, ${data.counts.webhooks} webhooks to Cloudflare D1!`,
        });
        loadRecords();
        if (onDataChanged) onDataChanged();
      } else {
        setSyncResult({ success: false, message: data.error || 'Failed to sync data' });
      }
    } catch (err: any) {
      setSyncResult({ success: false, message: err.message || 'Sync failed' });
    } finally {
      setIsSyncingAll(false);
    }
  };

  // SQL Query Runner
  const handleRunSql = async () => {
    if (!sqlQuery.trim()) return;
    setIsExecutingSql(true);
    setSqlError(null);
    setSqlResult(null);
    try {
      const res = await fetch('[https://robeats-d1-api.anh6052018.workers.dev/api](https://robeats-d1-api.anh6052018.workers.dev/api)/admin/d1/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: sqlQuery.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSqlResult(data);
      } else {
        setSqlError(data.error || 'Failed to execute query');
      }
    } catch (err: any) {
      setSqlError(err.message || 'Network error executing SQL');
    } finally {
      setIsExecutingSql(false);
    }
  };

  // Open Form for Adding New Record
  const handleOpenAddForm = () => {
    setEditingRecordId(null);
    const now = new Date().toISOString();
    let initial: Record<string, any> = {};

    if (selectedTable === 'posts') {
      initial = {
        id: 'post_' + Date.now(),
        title: '',
        category: 'Updates',
        content: '',
        author: JSON.stringify({ name: 'Meelo', role: 'admin' }),
        coverImage: '',
        songs: '[]',
        tags: '[]',
        publishedAt: now,
      };
    } else if (selectedTable === 'songs') {
      initial = {
        id: 'song_' + Date.now(),
        title: '',
        artist: '',
        mapper: '',
        coverArt: '',
        coverArtEasy: '',
        coverArtNormal: '',
        coverArtHard: '',
        difficulty: JSON.stringify({ easy: '10', normal: '18', hard: '26' }),
        element: 'Standard',
        duration: '2:30',
        bpm: '120',
        dateAdded: new Date().toLocaleDateString('en-US'),
        isCustom: 1,
      };
    } else if (selectedTable === 'users') {
      initial = {
        id: 'usr_' + Date.now(),
        username: '',
        passwordHash: '',
        role: 'player',
        permissions: JSON.stringify({}),
        avatar: '',
        bio: '',
        createdAt: now,
      };
    } else if (selectedTable === 'webhooks') {
      initial = {
        category: 'Daily mission',
        url: '',
        template: JSON.stringify({ titleTemplate: '', bodyTemplate: '', footerTemplate: '' }),
      };
    } else if (selectedTable === 'ranks') {
      initial = {
        id: 'rank_' + Date.now(),
        name: '',
        iconUrl: '',
        color: '#06B6D4',
        description: '',
      };
    } else if (selectedTable === 'elements') {
      initial = {
        id: 'element_' + Date.now(),
        name: '',
        color: '#3B82F6',
        imageUrl: '',
      };
    }

    setFormData(initial);
    setRawJsonText(JSON.stringify(initial, null, 2));
    setFormError(null);
    setIsFormOpen(true);
  };

  // Open Form for Editing Existing Record
  const handleOpenEditForm = (record: any) => {
    const idKey = selectedTable === 'webhooks' ? record.category : record.id;
    setEditingRecordId(idKey);
    setFormData({ ...record });
    setRawJsonText(JSON.stringify(record, null, 2));
    setFormError(null);
    setIsFormOpen(true);
  };

  // Save Record (Insert or Update in D1)
  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingRecord(true);
    setFormError(null);

    let payload: Record<string, any>;
    if (rawJsonMode) {
      try {
        payload = JSON.parse(rawJsonText);
      } catch (err: any) {
        setFormError('Invalid JSON format: ' + err.message);
        setIsSavingRecord(false);
        return;
      }
    } else {
      payload = { ...formData };
    }

    try {
      let res: Response;
      if (editingRecordId) {
        res = await fetch(`[https://robeats-d1-api.anh6052018.workers.dev/api/](https://robeats-d1-api.anh6052018.workers.dev/api/)admin/d1/records/${selectedTable}/${encodeURIComponent(editingRecordId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`[https://robeats-d1-api.anh6052018.workers.dev/api/](https://robeats-d1-api.anh6052018.workers.dev/api/)admin/d1/records/${selectedTable}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (res.ok && data.success) {
        setIsFormOpen(false);
        setEditingRecordId(null);
        await loadRecords(selectedTable);
        if (onDataChanged) onDataChanged();
      } else {
        setFormError(data.error || 'Failed to save record to D1');
      }
    } catch (err: any) {
      setFormError(err.message || 'Network error saving record to D1');
    } finally {
      setIsSavingRecord(false);
    }
  };

  // Delete Record directly from D1
  const handleDeleteRecord = async (id: string) => {
    setIsDeletingRecord(true);
    try {
      const res = await fetch(`[https://robeats-d1-api.anh6052018.workers.dev/api/](https://robeats-d1-api.anh6052018.workers.dev/api/)admin/d1/records/${selectedTable}/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDeleteConfirmId(null);
        await loadRecords(selectedTable);
        if (onDataChanged) onDataChanged();
      } else {
        alert(data.error || 'Failed to delete record');
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting record');
    } finally {
      setIsDeletingRecord(false);
    }
  };

  // Filtered records
  const filteredRecords = records.filter(r => {
    if (!recordSearch.trim()) return true;
    const term = recordSearch.toLowerCase();
    return Object.values(r).some(val =>
      String(val).toLowerCase().includes(term)
    );
  });

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0A0D14] overflow-hidden text-xs">
      {/* Top Banner Ribbon */}
      <div className="px-6 py-3 bg-[#111724] border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-sm">Cloudflare D1 Database</h3>
              {isReady && enabled ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Active & Auto-Saving
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  Local Fallback Mode
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-400">
              Edge SQLite database binding for posts, difficulty cover arts, users, webhooks & ranks
            </p>
          </div>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex items-center gap-1 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800">
          <button
            onClick={() => setSubTab('records')}
            className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              subTab === 'records'
                ? 'bg-orange-500 text-zinc-950 font-bold shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Manual Records</span>
          </button>

          <button
            onClick={() => setSubTab('sql')}
            className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              subTab === 'sql'
                ? 'bg-orange-500 text-zinc-950 font-bold shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>SQL Console</span>
          </button>

          <button
            onClick={() => setSubTab('config')}
            className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              subTab === 'config'
                ? 'bg-orange-500 text-zinc-950 font-bold shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Connection & Bindings</span>
          </button>

          <button
            onClick={() => setSubTab('guide')}
            className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              subTab === 'guide'
                ? 'bg-orange-500 text-zinc-950 font-bold shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>Setup & Worker Code</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* ======================================================== */}
        {/* SUB-TAB 1: MANUAL RECORD MANAGER                         */}
        {/* ======================================================== */}
        {subTab === 'records' && (
          <div className="space-y-4">
            {/* Table Selection Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#111724] p-3 rounded-xl border border-zinc-800">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mr-1">
                  Table:
                </span>
                {(['posts', 'songs', 'users', 'webhooks', 'ranks', 'elements'] as D1TableName[]).map(t => (
                  <button
                    key={t}
                    onClick={() => {
                      setSelectedTable(t);
                      setIsFormOpen(false);
                      setEditingRecordId(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                      selectedTable === t
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-zinc-950 shadow-md'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800/80'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder={`Search ${selectedTable}...`}
                    value={recordSearch}
                    onChange={e => setRecordSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 w-44 sm:w-56"
                  />
                </div>

                <button
                  onClick={() => loadRecords(selectedTable)}
                  title="Reload Records"
                  className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white hover:border-zinc-700 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRecords ? 'animate-spin text-orange-400' : ''}`} />
                </button>

                <button
                  onClick={handleOpenAddForm}
                  className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-bold rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Add Record</span>
                </button>
              </div>
            </div>

            {/* Error Banner */}
            {formError && (
              <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Manual Form Drawer / Card */}
            {isFormOpen && (
              <div className="bg-[#121826] border border-orange-500/40 rounded-2xl p-5 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold">
                      {editingRecordId ? <Edit3 className="w-3.5 h-3.5" /> : <PlusCircle className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">
                        {editingRecordId ? `Edit ${selectedTable} Record: ${editingRecordId}` : `Create New ${selectedTable} Record`}
                      </h4>
                      <p className="text-[11px] text-zinc-400">
                        Will be inserted/updated directly in the Cloudflare D1 database table
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!rawJsonMode) {
                          setRawJsonText(JSON.stringify(formData, null, 2));
                        } else {
                          try {
                            const parsed = JSON.parse(rawJsonText);
                            setFormData(parsed);
                          } catch (err) {}
                        }
                        setRawJsonMode(!rawJsonMode);
                      }}
                      className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-300 hover:text-white text-[11px] font-mono cursor-pointer"
                    >
                      {rawJsonMode ? 'Form View' : 'Raw JSON View'}
                    </button>
                    <button
                      onClick={() => setIsFormOpen(false)}
                      className="p-1 text-zinc-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <form onSubmit={handleSaveRecord} className="space-y-4">
                  {rawJsonMode ? (
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                        Raw Record JSON
                      </label>
                      <textarea
                        rows={10}
                        value={rawJsonText}
                        onChange={e => setRawJsonText(e.target.value)}
                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-emerald-400 font-mono text-xs focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* DYNAMIC FORM FIELDS BY TABLE */}
                      {selectedTable === 'posts' && (
                        <>
                          <div>
                            <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Post ID</label>
                            <input
                              type="text"
                              required
                              disabled={Boolean(editingRecordId)}
                              value={formData.id || ''}
                              onChange={e => setFormData({ ...formData, id: e.target.value })}
                              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-orange-500 disabled:opacity-50"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Category</label>
                            <select
                              value={formData.category || 'Updates'}
                              onChange={e => setFormData({ ...formData, category: e.target.value })}
                              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-orange-500"
                            >
                              <option value="Daily mission">Daily mission</option>
                              <option value="Weekly mission">Weekly mission</option>
                              <option value="Weekly Leaderboard">Weekly Leaderboard</option>
                              <option value="New song">New song</option>
                              <option value="Updates">Updates</option>
                            </select>
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Title</label>
                            <input
                              type="text"
                              required
                              value={formData.title || ''}
                              onChange={e => setFormData({ ...formData, title: e.target.value })}
                              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-orange-500"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Cover Image URL</label>
                            <input
                              type="url"
                              value={formData.coverImage || ''}
                              onChange={e => setFormData({ ...formData, coverImage: e.target.value })}
                              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-orange-500"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Content / Body</label>
                            <textarea
                              rows={4}
                              value={formData.content || ''}
                              onChange={e => setFormData({ ...formData, content: e.target.value })}
                              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-orange-500"
                            />
                          </div>
                        </>
                      )}

                      {selectedTable === 'songs' && (
                        <>
                          <div>
                            <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Song ID</label>
                            <input
                              type="text"
                              required
                              disabled={Boolean(editingRecordId)}
                              value={formData.id || ''}
                              onChange={e => setFormData({ ...formData, id: e.target.value })}
                              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-orange-500 disabled:opacity-50"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Title</label>
                            <input
                              type="text"
                              required
                              value={formData.title || ''}
                              onChange={e => setFormData({ ...formData, title: e.target.value })}
                              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-orange-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Artist</label>
                            <input
                              type="text"
                              required
                              value={formData.artist || ''}
                              onChange={e => setFormData({ ...formData, artist: e.target.value })}
                              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-orange-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Element</label>
                            <input
                              type="text"
                              value={formData.element || 'Standard'}
                              onChange={e => setFormData({ ...formData, element: e.target.value })}
                              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-orange-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Duration</label>
                            <input
                              type="text"
                              value={formData.duration || '2:30'}
                              onChange={e => setFormData({ ...formData, duration: e.target.value })}
                              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-orange-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-zinc-300 mb-1">BPM</label>
                            <input
                              type="text"
                              value={formData.bpm || '120'}
                              onChange={e => setFormData({ ...formData, bpm: e.target.value })}
                              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-orange-500"
                            />
                          </div>

                          {/* Difficulty-Specific Cover Arts */}
                          <div className="sm:col-span-2 p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/80 space-y-3">
                            <h5 className="font-bold text-white text-xs flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                              <span>Cover Art Per Difficulty</span>
                            </h5>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[10px] font-semibold text-zinc-400 mb-1">Default Cover Art URL</label>
                                <input
                                  type="url"
                                  value={formData.coverArt || ''}
                                  onChange={e => setFormData({ ...formData, coverArt: e.target.value })}
                                  className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-xs"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-semibold text-emerald-400 mb-1">Easy Difficulty Cover Art</label>
                                <input
                                  type="url"
                                  value={formData.coverArtEasy || ''}
                                  onChange={e => setFormData({ ...formData, coverArtEasy: e.target.value })}
                                  placeholder="Defaults to general cover art"
                                  className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-xs"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-semibold text-sky-400 mb-1">Normal Difficulty Cover Art</label>
                                <input
                                  type="url"
                                  value={formData.coverArtNormal || ''}
                                  onChange={e => setFormData({ ...formData, coverArtNormal: e.target.value })}
                                  placeholder="Defaults to general cover art"
                                  className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-xs"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-semibold text-rose-400 mb-1">Hard Difficulty Cover Art</label>
                                <input
                                  type="url"
                                  value={formData.coverArtHard || ''}
                                  onChange={e => setFormData({ ...formData, coverArtHard: e.target.value })}
                                  placeholder="Defaults to general cover art"
                                  className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-xs"
                                />
                              </div>
                            </div>
                          </div>
                        </>
                      )}

                      {selectedTable === 'users' && (
                        <>
                          <div>
                            <label className="block text-[11px] font-semibold text-zinc-300 mb-1">User ID</label>
                            <input
                              type="text"
                              required
                              disabled={Boolean(editingRecordId)}
                              value={formData.id || ''}
                              onChange={e => setFormData({ ...formData, id: e.target.value })}
                              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-orange-500 disabled:opacity-50"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Username</label>
                            <input
                              type="text"
                              required
                              value={formData.username || ''}
                              onChange={e => setFormData({ ...formData, username: e.target.value })}
                              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-orange-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Role</label>
                            <select
                              value={formData.role || 'player'}
                              onChange={e => setFormData({ ...formData, role: e.target.value })}
                              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-orange-500"
                            >
                              <option value="player">Player</option>
                              <option value="robeatsdev">RoBeatsDev</option>
                              <option value="staff">Staff</option>
                              <option value="admin">Admin</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Avatar URL</label>
                            <input
                              type="url"
                              value={formData.avatar || ''}
                              onChange={e => setFormData({ ...formData, avatar: e.target.value })}
                              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-orange-500"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Bio</label>
                            <input
                              type="text"
                              value={formData.bio || ''}
                              onChange={e => setFormData({ ...formData, bio: e.target.value })}
                              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-orange-500"
                            />
                          </div>
                        </>
                      )}

                      {selectedTable === 'webhooks' && (
                        <>
                          <div>
                            <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Category (Primary Key)</label>
                            <input
                              type="text"
                              required
                              disabled={Boolean(editingRecordId)}
                              value={formData.category || ''}
                              onChange={e => setFormData({ ...formData, category: e.target.value })}
                              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-orange-500 disabled:opacity-50"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Discord Webhook URL</label>
                            <input
                              type="url"
                              value={formData.url || ''}
                              onChange={e => setFormData({ ...formData, url: e.target.value })}
                              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-orange-500"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Template JSON</label>
                            <textarea
                              rows={3}
                              value={typeof formData.template === 'object' ? JSON.stringify(formData.template) : formData.template || ''}
                              onChange={e => setFormData({ ...formData, template: e.target.value })}
                              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white font-mono focus:outline-none focus:border-orange-500"
                            />
                          </div>
                        </>
                      )}

                      {selectedTable === 'ranks' && (
                        <>
                          <div>
                            <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Rank ID</label>
                            <input
                              type="text"
                              required
                              disabled={Boolean(editingRecordId)}
                              value={formData.id || ''}
                              onChange={e => setFormData({ ...formData, id: e.target.value })}
                              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-orange-500 disabled:opacity-50"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Rank Name</label>
                            <input
                              type="text"
                              required
                              value={formData.name || ''}
                              onChange={e => setFormData({ ...formData, name: e.target.value })}
                              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-orange-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Icon URL (SVG / PNG)</label>
                            <input
                              type="url"
                              value={formData.iconUrl || ''}
                              onChange={e => setFormData({ ...formData, iconUrl: e.target.value })}
                              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-orange-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Accent Color</label>
                            <input
                              type="text"
                              value={formData.color || '#06B6D4'}
                              onChange={e => setFormData({ ...formData, color: e.target.value })}
                              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-orange-500"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Description</label>
                            <input
                              type="text"
                              value={formData.description || ''}
                              onChange={e => setFormData({ ...formData, description: e.target.value })}
                              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-orange-500"
                            />
                          </div>
                        </>
                      )}

                      {selectedTable === 'elements' && (
                        <>
                          <div>
                            <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Element ID</label>
                            <input
                              type="text"
                              required
                              disabled={Boolean(editingRecordId)}
                              value={formData.id || ''}
                              onChange={e => setFormData({ ...formData, id: e.target.value })}
                              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-orange-500 disabled:opacity-50"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Element Name</label>
                            <input
                              type="text"
                              required
                              value={formData.name || ''}
                              onChange={e => setFormData({ ...formData, name: e.target.value })}
                              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-orange-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Color</label>
                            <input
                              type="text"
                              value={formData.color || '#3B82F6'}
                              onChange={e => setFormData({ ...formData, color: e.target.value })}
                              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-orange-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Element Image URL</label>
                            <input
                              type="url"
                              value={formData.imageUrl || ''}
                              onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-orange-500"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setIsFormOpen(false)}
                      className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingRecord}
                      className="px-5 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-zinc-950 font-bold rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isSavingRecord ? 'Saving to D1...' : editingRecordId ? 'Update D1 Record' : 'Save Record to D1'}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Records Data Table */}
            <div className="bg-[#101420] border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="px-5 py-3 border-b border-zinc-800 bg-[#141A28] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white uppercase tracking-wider text-xs">
                    Table: {selectedTable}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-[10px] font-mono">
                    {filteredRecords.length} records
                  </span>
                </div>
                <span className="text-[11px] text-zinc-400">
                  Direct live view of SQLite table in Cloudflare D1
                </span>
              </div>

              {isLoadingRecords ? (
                <div className="p-12 text-center text-zinc-400 flex flex-col items-center gap-3">
                  <RefreshCw className="w-6 h-6 animate-spin text-orange-400" />
                  <span>Loading records from Cloudflare D1...</span>
                </div>
              ) : filteredRecords.length === 0 ? (
                <div className="p-12 text-center text-zinc-500 space-y-3">
                  <Database className="w-8 h-8 mx-auto opacity-30 text-orange-400" />
                  <p>No records found in table "{selectedTable}"</p>
                  <button
                    onClick={handleOpenAddForm}
                    className="px-4 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-orange-500/40 text-orange-300 rounded-xl cursor-pointer"
                  >
                    + Add First Record
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-800 bg-zinc-950/40 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                        <th className="py-2.5 px-4">Identifier</th>
                        {selectedTable === 'posts' && (
                          <>
                            <th className="py-2.5 px-4">Title</th>
                            <th className="py-2.5 px-4">Category</th>
                            <th className="py-2.5 px-4">Author</th>
                            <th className="py-2.5 px-4">Date</th>
                          </>
                        )}
                        {selectedTable === 'songs' && (
                          <>
                            <th className="py-2.5 px-4">Title / Artist</th>
                            <th className="py-2.5 px-4">Element</th>
                            <th className="py-2.5 px-4">Difficulties</th>
                            <th className="py-2.5 px-4">Custom Covers</th>
                          </>
                        )}
                        {selectedTable === 'users' && (
                          <>
                            <th className="py-2.5 px-4">Username</th>
                            <th className="py-2.5 px-4">Role</th>
                            <th className="py-2.5 px-4">Created</th>
                          </>
                        )}
                        {selectedTable === 'webhooks' && (
                          <>
                            <th className="py-2.5 px-4">Category</th>
                            <th className="py-2.5 px-4">Webhook URL</th>
                          </>
                        )}
                        {selectedTable === 'ranks' && (
                          <>
                            <th className="py-2.5 px-4">Name</th>
                            <th className="py-2.5 px-4">Color</th>
                            <th className="py-2.5 px-4">Icon</th>
                          </>
                        )}
                        {selectedTable === 'elements' && (
                          <>
                            <th className="py-2.5 px-4">Name</th>
                            <th className="py-2.5 px-4">Color</th>
                            <th className="py-2.5 px-4">Image</th>
                          </>
                        )}
                        <th className="py-2.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 font-mono text-xs">
                      {filteredRecords.map(r => {
                        const recId = selectedTable === 'webhooks' ? r.category : r.id;
                        return (
                          <tr key={recId} className="hover:bg-zinc-900/40 transition-colors">
                            <td className="py-3 px-4 text-orange-400 font-bold truncate max-w-[120px]">
                              {recId}
                            </td>

                            {selectedTable === 'posts' && (
                              <>
                                <td className="py-3 px-4 font-sans text-white font-medium max-w-[200px] truncate">
                                  {r.title}
                                </td>
                                <td className="py-3 px-4">
                                  <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px]">
                                    {r.category}
                                  </span>
                                </td>
                                <td className="py-3 px-4 font-sans text-zinc-400 truncate max-w-[100px]">
                                  {typeof r.author === 'string' ? r.author : r.author?.name || 'Admin'}
                                </td>
                                <td className="py-3 px-4 text-zinc-500 text-[11px]">
                                  {r.publishedAt ? new Date(r.publishedAt).toLocaleDateString() : '-'}
                                </td>
                              </>
                            )}

                            {selectedTable === 'songs' && (
                              <>
                                <td className="py-3 px-4 font-sans max-w-[200px] truncate">
                                  <div className="font-bold text-white">{r.title}</div>
                                  <div className="text-[10px] text-zinc-400">{r.artist}</div>
                                </td>
                                <td className="py-3 px-4 font-sans">
                                  <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 text-[10px]">
                                    {r.element || 'Standard'}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-[10px]">
                                  {typeof r.difficulty === 'string' ? r.difficulty : JSON.stringify(r.difficulty || {})}
                                </td>
                                <td className="py-3 px-4 text-[10px]">
                                  <span className="text-zinc-400">
                                    {[
                                      r.coverArtEasy ? 'E' : null,
                                      r.coverArtNormal ? 'N' : null,
                                      r.coverArtHard ? 'H' : null,
                                    ].filter(Boolean).join(', ') || 'Default'}
                                  </span>
                                </td>
                              </>
                            )}

                            {selectedTable === 'users' && (
                              <>
                                <td className="py-3 px-4 font-sans font-bold text-white">
                                  @{r.username}
                                </td>
                                <td className="py-3 px-4">
                                  <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                                    r.role === 'admin'
                                      ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                      : r.role === 'staff'
                                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                      : 'bg-zinc-800 text-zinc-300'
                                  }`}>
                                    {r.role}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-zinc-500 text-[11px]">
                                  {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '-'}
                                </td>
                              </>
                            )}

                            {selectedTable === 'webhooks' && (
                              <>
                                <td className="py-3 px-4 font-sans text-white font-bold">
                                  {r.category}
                                </td>
                                <td className="py-3 px-4 text-zinc-400 truncate max-w-[280px]">
                                  {r.url || <span className="text-zinc-600">Not configured</span>}
                                </td>
                              </>
                            )}

                            {selectedTable === 'ranks' && (
                              <>
                                <td className="py-3 px-4 font-sans font-bold text-white">
                                  {r.name}
                                </td>
                                <td className="py-3 px-4">
                                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px]" style={{ color: r.color, backgroundColor: `${r.color}15` }}>
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: r.color }}></span>
                                    {r.color}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  {r.iconUrl ? (
                                    <img src={r.iconUrl} alt={r.name} className="w-5 h-5 object-contain" />
                                  ) : '-'}
                                </td>
                              </>
                            )}

                            {selectedTable === 'elements' && (
                              <>
                                <td className="py-3 px-4 font-sans font-bold text-white">
                                  {r.name}
                                </td>
                                <td className="py-3 px-4">
                                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px]" style={{ color: r.color, backgroundColor: `${r.color}15` }}>
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: r.color }}></span>
                                    {r.color}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  {r.imageUrl ? (
                                    <img src={r.imageUrl} alt={r.name} className="w-5 h-5 object-contain rounded" />
                                  ) : '-'}
                                </td>
                              </>
                            )}

                            {/* Actions Column */}
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleOpenEditForm(r)}
                                  title="Edit Record"
                                  className="p-1.5 rounded-lg bg-zinc-900 hover:bg-orange-500/20 text-zinc-400 hover:text-orange-400 border border-zinc-800 cursor-pointer"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmId(recId)}
                                  title="Delete Record"
                                  className="p-1.5 rounded-lg bg-zinc-900 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 border border-zinc-800 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Delete Confirmation Modal */}
            {deleteConfirmId && (
              <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/80">
                <div className="w-full max-w-sm bg-[#121826] border border-red-500/40 rounded-2xl p-5 shadow-2xl space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center">
                      <Trash2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">Delete D1 Record?</h4>
                      <p className="text-xs text-zinc-400">
                        This will permanently delete <code className="text-red-300 font-mono">{deleteConfirmId}</code> from the Cloudflare D1 table.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                    <button
                      onClick={() => setDeleteConfirmId(null)}
                      className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleDeleteRecord(deleteConfirmId)}
                      disabled={isDeletingRecord}
                      className="px-4 py-1.5 bg-red-500 hover:bg-red-400 text-white font-bold rounded-xl shadow-md cursor-pointer disabled:opacity-50"
                    >
                      {isDeletingRecord ? 'Deleting...' : 'Confirm Delete'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* SUB-TAB 2: SQL QUERY CONSOLE                             */}
        {/* ======================================================== */}
        {subTab === 'sql' && (
          <div className="space-y-4">
            <div className="bg-[#121826] border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-orange-400" />
                  <h4 className="font-bold text-white text-sm">Cloudflare D1 SQL Query Runner</h4>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-zinc-400">Quick queries:</span>
                  <button
                    onClick={() => setSqlQuery('SELECT * FROM posts ORDER BY publishedAt DESC LIMIT 10;')}
                    className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded text-[10px] text-zinc-300 cursor-pointer"
                  >
                    Recent Posts
                  </button>
                  <button
                    onClick={() => setSqlQuery('SELECT id, title, artist, coverArtEasy, coverArtNormal, coverArtHard FROM songs LIMIT 10;')}
                    className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded text-[10px] text-zinc-300 cursor-pointer"
                  >
                    Songs Covers
                  </button>
                  <button
                    onClick={() => setSqlQuery('SELECT id, username, role, createdAt FROM users;')}
                    className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded text-[10px] text-zinc-300 cursor-pointer"
                  >
                    Accounts
                  </button>
                  <button
                    onClick={() => setSqlQuery('SELECT count(*) as total_posts FROM posts;')}
                    className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded text-[10px] text-zinc-300 cursor-pointer"
                  >
                    Count Posts
                  </button>
                </div>
              </div>

              <div>
                <textarea
                  rows={4}
                  value={sqlQuery}
                  onChange={e => setSqlQuery(e.target.value)}
                  placeholder="Enter raw SQL statement (e.g., SELECT * FROM songs WHERE bpm > 140;)"
                  className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-emerald-400 font-mono text-xs focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex items-center justify-between">
                <p className="text-[11px] text-zinc-500">
                  Executes queries through Cloudflare D1 REST API. Supports SELECT, INSERT, UPDATE, DELETE, PRAGMA.
                </p>
                <button
                  onClick={handleRunSql}
                  disabled={isExecutingSql || !sqlQuery.trim()}
                  className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-zinc-950 font-bold rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
                >
                  <Play className={`w-3.5 h-3.5 ${isExecutingSql ? 'animate-spin' : ''}`} />
                  <span>{isExecutingSql ? 'Running Query...' : 'Execute SQL'}</span>
                </button>
              </div>
            </div>

            {/* SQL Error */}
            {sqlError && (
              <div className="p-4 bg-red-500/15 border border-red-500/30 rounded-xl text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{sqlError}</span>
              </div>
            )}

            {/* SQL Results */}
            {sqlResult && (
              <div className="bg-[#101420] border border-zinc-800 rounded-2xl overflow-hidden shadow-xl space-y-3 p-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-white text-xs">Query Results</span>
                    {Array.isArray(sqlResult.results) && (
                      <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px] font-mono">
                        {sqlResult.results.length} rows returned
                      </span>
                    )}
                  </div>
                  {sqlResult.meta && (
                    <span className="text-[10px] text-zinc-500 font-mono">
                      changes: {sqlResult.meta.changes || 0} | time: {sqlResult.meta.duration || 0}ms
                    </span>
                  )}
                </div>

                {Array.isArray(sqlResult.results) && sqlResult.results.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-zinc-800 bg-zinc-950/60 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                          {Object.keys(sqlResult.results[0]).map(col => (
                            <th key={col} className="py-2 px-3">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/60 font-mono text-[11px]">
                        {sqlResult.results.map((row: any, i: number) => (
                          <tr key={i} className="hover:bg-zinc-900/40">
                            {Object.values(row).map((val: any, j: number) => (
                              <td key={j} className="py-2 px-3 truncate max-w-[200px] text-zinc-300">
                                {typeof val === 'object' ? JSON.stringify(val) : String(val ?? '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-zinc-400 text-xs py-2">
                    Statement executed successfully (no rows returned).
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* SUB-TAB 3: CONNECTION & BINDINGS CONFIG                  */}
        {/* ======================================================== */}
        {subTab === 'config' && (
          <div className="space-y-5">
            <form onSubmit={handleSaveConfig} className="bg-[#121826] border border-zinc-800 rounded-2xl p-6 space-y-5 shadow-xl">
              <div>
                <h4 className="font-bold text-white text-sm">Cloudflare D1 Connection Credentials</h4>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Connect your Cloudflare account to enable edge SQLite persistence and live auto-saving.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Cloudflare Account ID
                  </label>
                  <input
                    type="text"
                    value={accountId}
                    onChange={e => setAccountId(e.target.value)}
                    placeholder="e.g. 9a8b7c6d5e4f3a2b1c0d..."
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-orange-500"
                  />
                  <span className="text-[10px] text-zinc-500 mt-1 block">
                    Found on your Cloudflare dashboard overview in the right sidebar.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    D1 Database ID (UUID)
                  </label>
                  <input
                    type="text"
                    value={databaseId}
                    onChange={e => setDatabaseId(e.target.value)}
                    placeholder="e.g. 12345678-1234-1234-1234-123456789abc"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-orange-500"
                  />
                  <span className="text-[10px] text-zinc-500 mt-1 block">
                    Created via <code className="text-orange-300">wrangler d1 create robeats-d1</code>
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Cloudflare API Token
                  </label>
                  <div className="relative">
                    <input
                      type={showTokenText ? 'text' : 'password'}
                      value={apiToken}
                      onChange={e => setApiToken(e.target.value)}
                      placeholder={hasStoredToken ? '(Stored securely - enter new token to update)' : 'Enter Cloudflare API token with D1 permissions'}
                      className="w-full px-3 py-2 pr-10 bg-zinc-900 border border-zinc-800 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-orange-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowTokenText(!showTokenText)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 cursor-pointer"
                    >
                      {showTokenText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <span className="text-[10px] text-zinc-500 mt-1 block">
                    Created at <a href="https://dash.cloudflare.com/profile/api-tokens" target="_blank" rel="noreferrer" className="text-cyan-400 underline">dash.cloudflare.com/profile/api-tokens</a> with <strong>D1:Edit</strong> permission.
                  </span>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={e => setEnabled(e.target.checked)}
                      className="w-4 h-4 accent-orange-500 rounded"
                    />
                    <span className="text-xs font-semibold text-white">
                      Enable Cloudflare D1 Live Integration & Auto-Saving
                    </span>
                  </label>
                  <span className="text-[10px] text-zinc-500 block ml-6 mt-0.5">
                    When enabled, all posted posts, edits, songs, and accounts will be automatically synced and loaded from Cloudflare D1.
                  </span>
                </div>
              </div>

              {/* Status Message */}
              {testResult && (
                <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  testResult.success
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                    : 'bg-red-500/15 border-red-500/30 text-red-300'
                }`}>
                  {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{testResult.message}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="px-4 py-2 bg-zinc-900 border border-zinc-800 hover:border-orange-500/40 text-orange-400 font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                  <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
                </button>

                <button
                  type="submit"
                  disabled={isSavingConfig}
                  className="px-5 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-zinc-950 font-bold rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingConfig ? 'Saving...' : 'Save Configuration'}</span>
                </button>
              </div>
            </form>

            {/* Quick Actions & Migration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Initialize Tables */}
              <div className="bg-[#121826] border border-zinc-800 rounded-2xl p-5 space-y-3">
                <h5 className="font-bold text-white text-xs flex items-center gap-2">
                  <Database className="w-4 h-4 text-cyan-400" />
                  <span>1. Initialize D1 Tables</span>
                </h5>
                <p className="text-[11px] text-zinc-400">
                  Runs <code className="text-zinc-300">CREATE TABLE IF NOT EXISTS</code> for posts, songs, users, webhooks, ranks, and elements.
                </p>
                {initResult && (
                  <div className={`p-2 rounded-lg text-[11px] flex items-center gap-1.5 ${
                    initResult.success ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300'
                  }`}>
                    {initResult.success ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                    <span>{initResult.message}</span>
                  </div>
                )}
                <button
                  onClick={handleInitTables}
                  disabled={isInitializing}
                  className="w-full py-2 bg-zinc-900 border border-zinc-800 hover:border-cyan-500/40 text-cyan-300 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isInitializing ? 'animate-spin' : ''}`} />
                  <span>{isInitializing ? 'Initializing Tables...' : 'Initialize / Verify Tables'}</span>
                </button>
              </div>

              {/* Migrate Local Data to D1 */}
              <div className="bg-[#121826] border border-zinc-800 rounded-2xl p-5 space-y-3">
                <h5 className="font-bold text-white text-xs flex items-center gap-2">
                  <UploadCloud className="w-4 h-4 text-emerald-400" />
                  <span>2. One-Click Sync Local Data to D1</span>
                </h5>
                <p className="text-[11px] text-zinc-400">
                  Copies all existing articles, songs, accounts, ranks, elements, and webhooks into your Cloudflare D1 database.
                </p>
                {syncResult && (
                  <div className={`p-2 rounded-lg text-[11px] flex items-center gap-1.5 ${
                    syncResult.success ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300'
                  }`}>
                    {syncResult.success ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                    <span>{syncResult.message}</span>
                  </div>
                )}
                <button
                  onClick={handleSyncAll}
                  disabled={isSyncingAll}
                  className="w-full py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
                >
                  <UploadCloud className={`w-3.5 h-3.5 ${isSyncingAll ? 'animate-spin' : ''}`} />
                  <span>{isSyncingAll ? 'Migrating Data to D1...' : 'Migrate All Local Data to D1'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SUB-TAB 4: SETUP GUIDE & WORKER CODE                     */}
        {/* ======================================================== */}
        {subTab === 'guide' && (
          <div className="space-y-6">
            {/* Step 1: Wrangler Setup */}
            <div className="bg-[#121826] border border-zinc-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="font-bold text-white text-sm flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 text-xs flex items-center justify-center font-bold">1</span>
                  <span>Create Cloudflare D1 Database</span>
                </h5>
                <button
                  onClick={() => copyToClipboard('wrangler d1 create robeats-d1', 'cmd1')}
                  className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg text-zinc-300 hover:text-white text-xs flex items-center gap-1 cursor-pointer"
                >
                  {copiedKey === 'cmd1' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'cmd1' ? 'Copied' : 'Copy Command'}</span>
                </button>
              </div>
              <pre className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-emerald-400 font-mono text-xs overflow-x-auto">
{`# 1. Install Wrangler CLI
npm install -g wrangler

# 2. Login to your Cloudflare account
wrangler login

# 3. Create the D1 Database
wrangler d1 create robeats-d1`}
              </pre>
            </div>

            {/* Step 2: wrangler.toml */}
            <div className="bg-[#121826] border border-zinc-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="font-bold text-white text-sm flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 text-xs flex items-center justify-center font-bold">2</span>
                  <span>wrangler.toml Binding Configuration</span>
                </h5>
                <button
                  onClick={() => copyToClipboard(`name = "robeats-d1-api"
main = "cloudflare-worker.js"
compatibility_date = "2024-04-01"

[[d1_databases]]
binding = "DB"
database_name = "robeats-d1"
database_id = "${databaseId || 'YOUR_DATABASE_ID_HERE'}"`, 'toml')}
                  className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg text-zinc-300 hover:text-white text-xs flex items-center gap-1 cursor-pointer"
                >
                  {copiedKey === 'toml' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'toml' ? 'Copied' : 'Copy wrangler.toml'}</span>
                </button>
              </div>
              <pre className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-sky-400 font-mono text-xs overflow-x-auto">
{`name = "robeats-d1-api"
main = "cloudflare-worker.js"
compatibility_date = "2024-04-01"

[[d1_databases]]
binding = "DB"
database_name = "robeats-d1"
database_id = "${databaseId || 'YOUR_DATABASE_ID_HERE'}"`}
              </pre>
            </div>

            {/* Step 3: Execute Schema */}
            <div className="bg-[#121826] border border-zinc-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="font-bold text-white text-sm flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 text-xs flex items-center justify-center font-bold">3</span>
                    <span>Direct Wrangler CLI Command (--command)</span>
                  </h5>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Run directly in your terminal without requiring a separate schema file.
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(`wrangler d1 execute robeats-d1 --command="CREATE TABLE IF NOT EXISTS posts (id TEXT PRIMARY KEY, title TEXT NOT NULL, category TEXT NOT NULL, content TEXT, author TEXT NOT NULL, coverImage TEXT, songs TEXT, tags TEXT, publishedAt TEXT NOT NULL, updatedAt TEXT, comments TEXT, reactions TEXT); CREATE TABLE IF NOT EXISTS songs (id TEXT PRIMARY KEY, title TEXT NOT NULL, artist TEXT NOT NULL, mapper TEXT, coverArt TEXT, coverArtEasy TEXT, coverArtNormal TEXT, coverArtHard TEXT, difficulty TEXT, element TEXT, duration TEXT, bpm TEXT, dateAdded TEXT, isCustom INTEGER DEFAULT 0); CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, passwordHash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'player', permissions TEXT, avatar TEXT, bio TEXT, createdAt TEXT); CREATE TABLE IF NOT EXISTS webhooks (category TEXT PRIMARY KEY, url TEXT, template TEXT); CREATE TABLE IF NOT EXISTS ranks (id TEXT PRIMARY KEY, name TEXT NOT NULL, iconUrl TEXT, color TEXT, description TEXT); CREATE TABLE IF NOT EXISTS elements (id TEXT PRIMARY KEY, name TEXT NOT NULL, color TEXT, imageUrl TEXT);"`, 'cmdAll')}
                  className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg text-zinc-300 hover:text-white text-xs flex items-center gap-1 cursor-pointer"
                >
                  {copiedKey === 'cmdAll' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'cmdAll' ? 'Copied' : 'Copy All-in-One Command'}</span>
                </button>
              </div>
              <pre className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-emerald-400 font-mono text-xs overflow-x-auto whitespace-pre-wrap">
{`# All-in-one command (creates all 6 tables in Cloudflare D1):
wrangler d1 execute robeats-d1 --command="CREATE TABLE IF NOT EXISTS posts (id TEXT PRIMARY KEY, title TEXT NOT NULL, category TEXT NOT NULL, content TEXT, author TEXT NOT NULL, coverImage TEXT, songs TEXT, tags TEXT, publishedAt TEXT NOT NULL, updatedAt TEXT, comments TEXT, reactions TEXT); CREATE TABLE IF NOT EXISTS songs (id TEXT PRIMARY KEY, title TEXT NOT NULL, artist TEXT NOT NULL, mapper TEXT, coverArt TEXT, coverArtEasy TEXT, coverArtNormal TEXT, coverArtHard TEXT, difficulty TEXT, element TEXT, duration TEXT, bpm TEXT, dateAdded TEXT, isCustom INTEGER DEFAULT 0); CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, passwordHash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'player', permissions TEXT, avatar TEXT, bio TEXT, createdAt TEXT); CREATE TABLE IF NOT EXISTS webhooks (category TEXT PRIMARY KEY, url TEXT, template TEXT); CREATE TABLE IF NOT EXISTS ranks (id TEXT PRIMARY KEY, name TEXT NOT NULL, iconUrl TEXT, color TEXT, description TEXT); CREATE TABLE IF NOT EXISTS elements (id TEXT PRIMARY KEY, name TEXT NOT NULL, color TEXT, imageUrl TEXT);"`}
              </pre>
            </div>

            {/* Step 4: Worker Code Reference */}
            <div className="bg-[#121826] border border-zinc-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="font-bold text-white text-sm flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 text-xs flex items-center justify-center font-bold">4</span>
                    <span>Standalone Worker File (cloudflare-worker.js)</span>
                  </h5>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Ready to deploy to Cloudflare Workers with direct <code className="text-orange-300">env.DB</code> bindings.
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(`// cloudflare-worker.js is saved in your project root! Run: wrangler deploy`, 'wfile')}
                  className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg text-zinc-300 hover:text-white text-xs flex items-center gap-1 cursor-pointer"
                >
                  {copiedKey === 'wfile' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'wfile' ? 'Copied' : 'Worker File Ready'}</span>
                </button>
              </div>
              <p className="text-zinc-400 text-xs">
                The full worker code is available in your workspace root as <code className="text-cyan-400">cloudflare-worker.js</code>. It handles GET and POST requests for posts, difficulty cover arts, users, webhooks, and raw SQL queries!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
