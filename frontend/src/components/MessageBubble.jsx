/**
 * MessageBubble.jsx — Individual chat message component
 * 
 * Renders user messages and AI responses differently.
 * AI messages include source citation chips and latency info.
 * Error messages show in red with the full error detail.
 */

function SourceChip({ source, index }) {
  const [expanded, setExpanded] = useState(false);
  const { useState } = require('react');

  return (
    <div
      onClick={() => setExpanded((e) => !e)}
      style={{
        cursor: 'pointer',
        background: 'rgba(79,142,247,0.08)',
        border: '1px solid rgba(79,142,247,0.2)',
        borderRadius: 'var(--radius-sm)',
        padding: expanded ? '10px 12px' : '4px 10px',
        fontSize: 12,
        transition: 'var(--transition)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color: 'var(--accent-primary)', fontWeight: 600, fontSize: 11 }}>
          [{index + 1}]
        </span>
        <span style={{ color: 'var(--text-secondary)' }}>
          {source.filename}
          {source.page > 0 && <span style={{ color: 'var(--text-muted)' }}> · p.{source.page + 1}</span>}
        </span>
        <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>{expanded ? '▲' : '▼'}</span>
      </div>
      {expanded && (
        <p style={{
          marginTop: 8,
          color: 'var(--text-secondary)',
          fontSize: 12,
          lineHeight: 1.6,
          fontStyle: 'italic',
          borderTop: '1px solid var(--border-color)',
          paddingTop: 8,
        }}>
          {source.excerpt}
        </p>
      )}
    </div>
  );
}

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  const isError = message.role === 'error';
  const isLoading = message.role === 'loading';

  // ── Loading state (typing animation) ────────────────────────────────────
  if (isLoading) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <div style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          background: 'var(--accent-gradient)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
          flexShrink: 0,
          boxShadow: 'var(--accent-glow)',
        }}>🧠</div>
        <div style={{
          padding: '16px 20px',
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-color)',
          borderRadius: '4px 20px 20px 20px',
          display: 'flex',
          gap: 6,
          alignItems: 'center',
        }}>
          {[0, 0.2, 0.4].map((delay, i) => (
            <span key={i} style={{
              width: 6,
              height: 6,
              background: 'var(--accent-primary)',
              borderRadius: '50%',
              display: 'inline-block',
              animation: `pulse 1.2s ease-in-out ${delay}s infinite`,
            }} />
          ))}
        </div>
      </div>
    );
  }

  // ── Error message ────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div style={{
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        animation: 'fadeIn 0.3s ease-out',
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'rgba(248,113,113,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, flexShrink: 0, border: '1px solid rgba(248,113,113,0.3)',
        }}>⚠️</div>
        <div style={{
          padding: '12px 16px',
          background: 'rgba(248,113,113,0.08)',
          border: '1px solid rgba(248,113,113,0.25)',
          borderRadius: '4px 16px 16px 16px',
          flex: 1,
        }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--error)', marginBottom: 4 }}>Error</p>
          <p style={{ fontSize: 13, color: '#fca5a5', lineHeight: 1.6 }}>{message.content}</p>
        </div>
      </div>
    );
  }

  // ── User message ─────────────────────────────────────────────────────────
  if (isUser) {
    return (
      <div className="animate-fade-in" style={{
        display: 'flex',
        justifyContent: 'flex-end',
      }}>
        <div style={{
          maxWidth: '80%',
          padding: '14px 20px',
          background: 'var(--accent-primary)',
          borderRadius: '24px 24px 4px 24px',
          boxShadow: 'var(--shadow-md)',
        }}>
          <p style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.5, color: '#ffffff' }}>{message.content}</p>
        </div>
      </div>
    );
  }

  // ── AI message ────────────────────────────────────────────────────────────
  const sources = message.sources || [];
  const latency = message.latency_ms;

  return (
    <div className="animate-fade-in" style={{
      display: 'flex',
      gap: 14,
      alignItems: 'flex-start',
    }}>
      {/* AI Avatar */}
      <div style={{
        width: 34, height: 34, borderRadius: 10,
        background: 'var(--accent-gradient)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, flexShrink: 0, boxShadow: 'var(--accent-glow)',
      }}>🧠</div>

      {/* Message body */}
      <div style={{ flex: 1 }}>
        <div style={{
          padding: '16px 22px',
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-color)',
          borderRadius: '4px 20px 20px 20px',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
            {message.content}
          </p>
        </div>

        {/* Sources */}
        {sources.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              📎 Sources ({sources.length})
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {sources.map((src, i) => (
                <SimpleSourceChip key={i} source={src} index={i} />
              ))}
            </div>
          </div>
        )}

        {/* Metadata */}
        {latency && (
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
            ⚡ Generated in {latency < 1000 ? `${latency}ms` : `${(latency/1000).toFixed(1)}s`}
          </p>
        )}
      </div>
    </div>
  );
}

function SimpleSourceChip({ source, index }) {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <div
      onClick={() => setExpanded((e) => !e)}
      className="animate-fade-in"
      style={{
        cursor: 'pointer',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)',
        padding: expanded ? '14px' : '10px 14px',
        fontSize: 13,
        transition: 'var(--transition)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 20, height: 20,
          background: 'rgba(255,255,255,0.1)',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontWeight: 700,
          color: 'var(--text-primary)',
        }}>{index + 1}</div>
        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
          {source.filename}
        </span>
        {source.page >= 0 && (
          <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>Page {source.page + 1}</span>
        )}
        <span style={{ color: 'var(--text-muted)', marginLeft: 'auto', fontSize: 10 }}>{expanded ? '▲' : '▼'}</span>
      </div>
      {expanded && (
        <p style={{
          marginTop: 12,
          color: 'var(--text-secondary)',
          fontSize: 13,
          lineHeight: 1.6,
          borderTop: '1px solid var(--border-color)',
          paddingTop: 12,
        }}>
          "{source.excerpt}"
        </p>
      )}
    </div>
  );
}

// Need React in scope for SimpleSourceChip
import React from 'react';
