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
    border: `2px dashed ${dragOver ? 'var(--accent-primary)' : 'var(--border-color)'}`,
    borderRadius: 'var(--radius-md)',
    padding: '20px 12px',
    textAlign: 'center',
    cursor: uploading ? 'not-allowed' : 'pointer',
    transition: 'var(--transition)',
    background: dragOver ? 'rgba(79,142,247,0.06)' : 'transparent',
    position: 'relative',
    overflow: 'hidden',
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
        <div>
          <div style={{ fontSize: 22, marginBottom: 8 }} className="animate-pulse">⚙️</div>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
            Indexing <strong>{uploadName}</strong>...
          </p>
          <div style={{ height: 4, background: 'var(--bg-card)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              background: 'var(--accent-gradient)',
              borderRadius: 2,
              transition: 'width 0.3s ease',
            }} />
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{progress}% uploaded</p>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📂</div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {dragOver ? 'Drop to upload' : 'Drop file or click to browse'}
          </p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>PDF · DOCX · CSV · max 50MB</p>
        </>
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
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '10px 12px',
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer',
        transition: 'var(--transition)',
        border: `1px solid ${selected ? 'rgba(79,142,247,0.4)' : 'transparent'}`,
        background: selected ? 'rgba(79,142,247,0.08)' : 'transparent',
        animation: 'fadeIn 0.3s ease-out',
      }}
    >
      <span style={{ fontSize: 20, lineHeight: 1 }}>{getFileIcon(doc.original_filename)}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--text-primary)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>{doc.original_filename}</p>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
          {doc.chunk_count} chunks · {doc.page_count} pages · {formatDate(doc.uploaded_at)}
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
          padding: '2px 4px',
          borderRadius: 4,
          transition: 'var(--transition)',
          flexShrink: 0,
        }}
        title="Delete document"
      >
        {deleting ? '⏳' : '🗑️'}
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
      <div style={{ padding: '20px 18px 16px', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 24 }}>🧠</span>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em' }}>DocuMind</h2>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>RAG Document Intelligence</p>
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
        <div style={{ marginBottom: 10 }}>
          <p style={{
            fontSize: 10, fontWeight: 600, color: 'var(--text-muted)',
            letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8
          }}>Theme</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {THEMES.map((t) => {
              const isActive = activeTheme === t.id;
              return (
                <button
                  key={t.id}
                  title={t.label}
                  onClick={() => setActiveTheme(t.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '7px 9px',
                    borderRadius: 10,
                    border: isActive
                      ? `1.5px solid ${t.color1}88`
                      : '1.5px solid var(--border-color)',
                    background: isActive
                      ? `linear-gradient(135deg, ${t.color1}22, ${t.color2}22)`
                      : 'var(--bg-card)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: isActive ? `0 0 12px ${t.color1}44` : 'none',
                    transform: isActive ? 'scale(1.03)' : 'scale(1)',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {/* Gradient Swatch */}
                  <div style={{
                    width: 20, height: 20,
                    borderRadius: 6,
                    background: `linear-gradient(135deg, ${t.color1}, ${t.color2})`,
                    flexShrink: 0,
                    boxShadow: isActive ? `0 0 6px ${t.color1}88` : 'none',
                  }} />
                  <span style={{
                    fontSize: 11,
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? t.color1 : 'var(--text-secondary)',
                    whiteSpace: 'nowrap',
                  }}>{t.label}</span>
                  {isActive && (
                    <span style={{
                      marginLeft: 'auto',
                      fontSize: 9,
                      color: t.color1,
                      fontWeight: 700,
                    }}>✓</span>
                  )}
                </button>
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
