/**
 * Sidebar.jsx — Left panel with document management
 * 
 * Shows:
 * - App logo/title
 * - Document uploader with drag-and-drop
 * - List of uploaded documents with selection for scoped chat
 * - User info and logout button
 */

import { useState, useEffect, useRef } from 'react';
import { documentsAPI } from '../api/client';
import { addToast } from '../App';

// ── Themes ────────────────────────────────────────────────────────────────────
const THEMES = [
  { id: 'dark', emoji: '🌑', label: 'Dark', color1: '#4f8ef7', color2: '#7c4dff' },
  { id: 'ocean', emoji: '🌊', label: 'Ocean', color1: '#64ffda', color2: '#00b4d8' },
  { id: 'sunset', emoji: '🌅', label: 'Sunset', color1: '#ff6b6b', color2: '#ffa07a' },
  { id: 'forest', emoji: '🌿', label: 'Forest', color1: '#34d399', color2: '#6ee7b7' },
];

const FILE_ICONS = { pdf: '📄', docx: '📝', doc: '📝', csv: '📊' };

function getFileIcon(filename) {
  const ext = filename?.split('.').pop()?.toLowerCase();
  return FILE_ICONS[ext] || '📁';
}

function formatBytes(bytes) {
  if (!bytes) return '';
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Uploader Component ────────────────────────────────────────────────────────
function DocumentUploader({ onUploaded }) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadName, setUploadName] = useState('');
  const inputRef = useRef();

  const handleUpload = async (file) => {
    if (!file) return;
    const allowedExts = ['.pdf', '.docx', '.doc', '.csv'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowedExts.includes(ext)) {
      addToast(`❌ Unsupported file type "${ext}". Use PDF, DOCX, or CSV.`, 'error');
      return;
    }
    setUploading(true);
    setProgress(0);
    setUploadName(file.name);
    try {
      await documentsAPI.upload(file, setProgress);
      onUploaded();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setUploading(false);
      setProgress(0);
      setUploadName('');
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  const style = {
    border: `1px dashed ${dragOver ? 'var(--accent-primary)' : 'var(--border-color)'}`,
    borderRadius: 'var(--radius-md)',
    padding: '24px 16px',
    textAlign: 'center',
    cursor: uploading ? 'not-allowed' : 'pointer',
    transition: 'var(--transition)',
    background: dragOver ? 'rgba(0,113,227,0.05)' : 'var(--bg-tertiary)',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: dragOver ? 'var(--accent-glow)' : 'none',
  };

  return (
    <div
      style={style}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      onClick={() => !uploading && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.doc,.csv"
        style={{ display: 'none' }}
        onChange={(e) => handleUpload(e.target.files[0])}
      />
      {uploading ? (
        <div className="animate-fade-in">
          <div style={{ fontSize: 24, marginBottom: 10 }} className="animate-spin">⚙️</div>
          <p style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 8, fontWeight: 500 }}>
            Indexing <strong>{uploadName}</strong>
          </p>
          <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden', width: '80%', margin: '0 auto' }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              background: 'var(--accent-gradient)',
              borderRadius: 2,
              transition: 'width 0.3s ease',
            }} />
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>{progress}% completed</p>
        </div>
      ) : (
        <div className="animate-fade-in">
          <div style={{ fontSize: 32, marginBottom: 10, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' }}>📥</div>
          <p style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
            {dragOver ? 'Release to upload' : 'Click or drag to upload'}
          </p>
          <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6 }}>PDF, DOCX, or CSV up to 50MB</p>
        </div>
      )}
    </div>
  );
}

// ── Document List Item ────────────────────────────────────────────────────────
function DocItem({ doc, selected, onSelect, onDelete }) {
  const [deleting, setDeleting] = useState(false);
  const ext = doc.original_filename?.split('.').pop()?.toLowerCase();

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${doc.original_filename}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await documentsAPI.delete(doc.document_id);
      onDelete(doc.document_id);
      addToast(`"${doc.original_filename}" deleted.`, 'info');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      onClick={() => onSelect(doc.document_id)}
      className="animate-fade-in"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '12px',
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer',
        transition: 'var(--transition)',
        border: `1px solid ${selected ? 'var(--accent-primary)' : 'transparent'}`,
        background: selected ? 'rgba(0,113,227,0.1)' : 'transparent',
        marginBottom: 4,
      }}
    >
      <span style={{ fontSize: 20, lineHeight: 1, filter: selected ? 'none' : 'grayscale(0.5)' }}>
        {getFileIcon(doc.original_filename)}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 13,
          fontWeight: 500,
          color: selected ? 'var(--text-primary)' : 'var(--text-secondary)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          transition: 'color 0.2s ease',
        }}>{doc.original_filename}</p>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
          {doc.chunk_count} chunks · {formatDate(doc.uploaded_at)}
        </p>
      </div>
      <button
        onClick={handleDelete}
        disabled={deleting}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-muted)',
          fontSize: 14,
          padding: '4px',
          borderRadius: 6,
          transition: 'var(--transition)',
          flexShrink: 0,
        }}
        title="Delete"
      >
        {deleting ? '⏳' : '×'}
      </button>
    </div>
  );
}

// ── Main Sidebar ──────────────────────────────────────────────────────────────
export default function Sidebar({ user, onLogout, selectedDocIds, onSelectionChange, onDocumentUploaded, refreshTrigger }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTheme, setActiveTheme] = useState(
    () => localStorage.getItem('documind_theme') || 'dark'
  );

  // Apply theme to <html> data-theme attribute whenever it changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', activeTheme);
    localStorage.setItem('documind_theme', activeTheme);
  }, [activeTheme]);

  const fetchDocs = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await documentsAPI.list();
      setDocs(res.data.documents || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDocs(); }, [refreshTrigger]);

  const handleDeleted = (docId) => {
    setDocs((prev) => prev.filter((d) => d.document_id !== docId));
    onSelectionChange(selectedDocIds.filter((id) => id !== docId));
  };

  const toggleSelect = (docId) => {
    onSelectionChange(
      selectedDocIds.includes(docId)
        ? selectedDocIds.filter((id) => id !== docId)
        : [...selectedDocIds, docId]
    );
  };

  const clearSelection = () => onSelectionChange([]);

  return (
    <aside style={{
      width: 'var(--sidebar-width)',
      borderRight: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: 'var(--bg-secondary)',
      flexShrink: 0,
    }}>
      {/* Header */}
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 2 }}>
          <div style={{
            width: 36, height: 36,
            background: 'var(--accent-gradient)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            boxShadow: 'var(--accent-glow)',
          }}>🧠</div>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.04em', color: '#ffffff' }}>DocuMind</h2>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>AI DOCUMENT INTEL</p>
          </div>
        </div>
      </div>

      {/* Uploader */}
      <div style={{ padding: '14px 14px 0' }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
          Upload Document
        </p>
        <DocumentUploader onUploaded={() => { fetchDocs(); onDocumentUploaded(); }} />
      </div>

      {/* Document List */}
      <div style={{ flex: 1, padding: '14px 14px 0', overflowY: 'auto', minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Documents {docs.length > 0 && `(${docs.length})`}
          </p>
          {selectedDocIds.length > 0 && (
            <button
              onClick={clearSelection}
              style={{ fontSize: 11, color: 'var(--accent-primary)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Clear filter
            </button>
          )}
        </div>

        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={{ height: 56 }} />
            ))}
          </div>
        )}

        {error && (
          <div style={{ padding: 12, background: 'rgba(248,113,113,0.1)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--error)' }}>
            {error}
          </div>
        )}

        {!loading && !error && docs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--text-muted)', fontSize: 13 }}>
            <p style={{ fontSize: 24, marginBottom: 8 }}>📭</p>
            <p>No documents yet.</p>
            <p style={{ fontSize: 12, marginTop: 4 }}>Upload a PDF, DOCX, or CSV to get started.</p>
          </div>
        )}

        {selectedDocIds.length > 0 && (
          <div style={{
            marginBottom: 8,
            padding: '6px 10px',
            background: 'rgba(79,142,247,0.1)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 11,
            color: 'var(--accent-primary)',
          }}>
            🔍 Searching {selectedDocIds.length} selected document{selectedDocIds.length > 1 ? 's' : ''}
          </div>
        )}

        {docs.map((doc) => (
          <DocItem
            key={doc.document_id}
            doc={doc}
            selected={selectedDocIds.includes(doc.document_id)}
            onSelect={toggleSelect}
            onDelete={handleDeleted}
          />
        ))}
      </div>

      {/* Footer */}
      <div style={{
        padding: '12px 14px',
        borderTop: '1px solid var(--border-color)',
      }}>
        {/* Theme Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', flexShrink: 0 }}>Theme</span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {THEMES.map((t) => {
              const isActive = activeTheme === t.id;
              return (
                <button
                  key={t.id}
                  title={t.label}
                  onClick={() => setActiveTheme(t.id)}
                  style={{
                    width: 14, height: 14,
                    borderRadius: '50%',
                    background: t.color1,
                    border: isActive ? `2px solid rgba(255,255,255,0.8)` : '2px solid transparent',
                    outline: isActive ? `1px solid ${t.color1}66` : 'none',
                    outlineOffset: 1,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    padding: 0,
                    flexShrink: 0,
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* User + Logout */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 500 }}>👤 {user}</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Logged in</p>
          </div>
          <button className="btn btn-ghost" onClick={onLogout} style={{ fontSize: 12, padding: '6px 12px' }}>
            Logout
          </button>
        </div>

        {/* Built by Tanishq */}
        <div style={{
          marginTop: 10,
          paddingTop: 10,
          borderTop: '1px solid var(--border-color)',
          textAlign: 'center',
        }}>
          <p style={{
            fontSize: 11,
            background: 'var(--accent-gradient)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontWeight: 600,
            letterSpacing: '0.04em',
          }}>
            ✦ Built by Tanishq Varshney
          </p>
        </div>
      </div>
    </aside>
  );
}
