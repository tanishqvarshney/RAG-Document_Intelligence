/**
 * ChatInterface.jsx — Main chat area
 * 
 * The heart of the app: conversation history, question input, send button.
 * Shows a welcome screen when there are no messages.
 * Auto-scrolls to latest message.
 */

import { useState, useRef, useEffect } from 'react';
import { chatAPI } from '../api/client';
import MessageBubble from './MessageBubble';

// ── Welcome Screen ────────────────────────────────────────────────────────────
function WelcomeScreen({ onSuggestion }) {
  const suggestions = [
    "Summarize the main points of this document",
    "What are the key findings?",
    "List all dates and deadlines mentioned",
    "What conclusions does the author make?",
  ];

  return (
    <div className="animate-fade-in" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      padding: '40px 24px',
      textAlign: 'center',
    }}>
      <div style={{
        width: 80,
        height: 80,
        background: 'var(--accent-gradient)',
        borderRadius: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 40,
        marginBottom: 28,
        boxShadow: 'var(--accent-glow)',
      }}>🧠</div>
      <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12, letterSpacing: '-0.04em' }}>Welcome to DocuMind</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: 16, maxWidth: 480, lineHeight: 1.6, fontWeight: 400 }}>
        An intelligent workspace for your documents. Upload files to get started with instant retrieval and AI analysis.
      </p>
      
      <div style={{ marginTop: 40, width: '100%', maxWidth: 520 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Suggested Queries
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => onSuggestion(s)}
              style={{
                padding: '16px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'var(--transition)',
                lineHeight: 1.4,
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent-primary)';
                e.currentTarget.style.background = 'rgba(0,113,227,0.05)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-color)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
              }}
            >
              "{s}"
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Chat Interface ───────────────────────────────────────────────────────
export default function ChatInterface({ selectedDocIds }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (question = input.trim()) => {
    if (!question || loading) return;

    const userMsg = { role: 'user', content: question, id: Date.now() };
    const loadingMsg = { role: 'loading', id: Date.now() + 1 };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await chatAPI.ask(
        question,
        selectedDocIds.length > 0 ? selectedDocIds : null
      );
      const { answer, sources, latency_ms } = res.data;

      setMessages((prev) => [
        ...prev.filter((m) => m.role !== 'loading'),
        {
          role: 'assistant',
          content: answer,
          sources,
          latency_ms,
          id: Date.now(),
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev.filter((m) => m.role !== 'loading'),
        {
          role: 'error',
          content: err.message,
          id: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => setMessages([]);

  return (
    <main style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      minWidth: 0,
    }}>
      {/* Header */}
      <div style={{
        padding: '18px 28px',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(20px)',
      }}>
        <div>
          <h1 style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em' }}>
            Document Workspace
            {selectedDocIds.length > 0 && (
              <span style={{
                marginLeft: 12,
                background: 'rgba(0,113,227,0.15)',
                color: 'var(--accent-primary)',
                borderRadius: 8,
                padding: '3px 10px',
                fontSize: 11,
                fontWeight: 600,
              }}>
                {selectedDocIds.length} FILES
              </span>
            )}
          </h1>
          <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2, fontWeight: 500 }}>
            Powered by Gemini 2.0 Flash + FAISS
          </p>
        </div>
        {messages.length > 0 && (
          <button className="btn btn-ghost" onClick={clearChat} style={{ fontSize: 11, fontWeight: 600, padding: '6px 14px' }}>
            ⟲ Reset session
          </button>
        )}
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}>
        {messages.length === 0 ? (
          <WelcomeScreen onSuggestion={(s) => { setInput(s); inputRef.current?.focus(); }} />
        ) : (
          messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{
        padding: '24px 32px 32px',
        borderTop: '1px solid var(--border-color)',
        flexShrink: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
      }}>
        <div style={{
          display: 'flex',
          gap: 12,
          alignItems: 'flex-end',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid var(--border-color)',
          borderRadius: '20px',
          padding: '12px 16px',
          transition: 'var(--transition)',
          boxShadow: loading ? 'var(--accent-glow)' : 'var(--shadow-md)',
          maxWidth: 900,
          margin: '0 auto',
        }}
        onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
        onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={loading
              ? 'Analyzing context...'
              : selectedDocIds.length > 0
                ? `Message selected context (${selectedDocIds.length} files)...`
                : 'Message your document library...'
            }
            disabled={loading}
            rows={1}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              font: 'inherit',
              fontSize: 15,
              lineHeight: 1.6,
              resize: 'none',
              maxHeight: 160,
              overflowY: 'auto',
              padding: '2px 0',
            }}
            onInput={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
            }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="btn btn-primary"
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              alignSelf: 'flex-end',
              fontSize: 18,
            }}
          >
            {loading ? (
              <span className="animate-spin">⚙️</span>
            ) : (
              '↑'
            )}
          </button>
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 12, textAlign: 'center', fontWeight: 500 }}>
          <span style={{ opacity: 0.6 }}>Gemini may provide inaccurate info. Verify important facts.</span>
        </p>
      </div>
    </main>
  );
}
