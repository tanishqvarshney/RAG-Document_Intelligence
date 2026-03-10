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
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      padding: '40px 24px',
      textAlign: 'center',
      animation: 'fadeIn 0.5s ease-out',
    }}>
      <div style={{
        width: 72,
        height: 72,
        background: 'var(--accent-gradient)',
        borderRadius: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 36,
        marginBottom: 24,
        boxShadow: 'var(--accent-glow)',
      }}>🧠</div>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Ask anything about your documents</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: 14, maxWidth: 400, lineHeight: 1.7 }}>
        Upload a PDF, DOCX, or CSV in the sidebar, then ask questions in plain English.
        DocuMind finds the relevant parts and generates an accurate, cited answer.
      </p>
      
      <div style={{ marginTop: 32, width: '100%', maxWidth: 480 }}>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Try asking
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => onSuggestion(s)}
              style={{
                padding: '12px 14px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-secondary)',
                fontSize: 13,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'var(--transition)',
                fontFamily: 'inherit',
                lineHeight: 1.4,
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-hover)';
                e.currentTarget.style.background = 'var(--bg-card-hover)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-color)';
                e.currentTarget.style.background = 'var(--bg-card)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              "{s}"
            </button>
          ))}
        </div>
      </div>

      <div style={{
        marginTop: 40,
        display: 'flex',
        gap: 20,
        fontSize: 12,
        color: 'var(--text-muted)',
      }}>
        <span>⚡ Sub-100ms retrieval</span>
        <span>📎 Source citations</span>
        <span>🔒 JWT secured</span>
        <span>🔍 FAISS search</span>
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
        padding: '16px 24px',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        background: 'rgba(7, 11, 20, 0.5)',
        backdropFilter: 'blur(8px)',
      }}>
        <div>
          <h1 style={{ fontSize: 16, fontWeight: 600 }}>
            Chat with Documents
            {selectedDocIds.length > 0 && (
              <span style={{
                marginLeft: 10,
                background: 'rgba(79,142,247,0.15)',
                color: 'var(--accent-primary)',
                borderRadius: 20,
                padding: '2px 10px',
                fontSize: 12,
              }}>
                {selectedDocIds.length} selected
              </span>
            )}
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
            Powered by GPT-4o + FAISS + LangChain
          </p>
        </div>
        {messages.length > 0 && (
          <button className="btn btn-ghost" onClick={clearChat} style={{ fontSize: 12 }}>
            🗑️ Clear chat
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
        padding: '16px 24px 24px',
        borderTop: '1px solid var(--border-color)',
        flexShrink: 0,
        background: 'rgba(7, 11, 20, 0.6)',
        backdropFilter: 'blur(8px)',
      }}>
        <div style={{
          display: 'flex',
          gap: 10,
          alignItems: 'flex-end',
          background: 'var(--bg-input)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '10px 12px',
          transition: 'var(--transition)',
          boxShadow: loading ? 'var(--accent-glow)' : 'none',
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
              ? 'Thinking...'
              : selectedDocIds.length > 0
                ? `Ask a question about the ${selectedDocIds.length} selected document(s)...`
                : 'Ask a question about your documents...'
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
              fontSize: 14,
              lineHeight: 1.6,
              resize: 'none',
              maxHeight: 120,
              overflowY: 'auto',
              padding: 0,
            }}
            onInput={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="btn btn-primary"
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              fontSize: 14,
              flexShrink: 0,
              alignSelf: 'flex-end',
            }}
          >
            {loading ? (
              <span className="animate-spin" style={{ display: 'inline-block' }}>⚙️</span>
            ) : (
              '→ Send'
            )}
          </button>
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>
          Press <kbd style={{ background: 'var(--bg-card)', padding: '1px 4px', borderRadius: 3, border: '1px solid var(--border-color)' }}>Enter</kbd> to send · 
          <kbd style={{ background: 'var(--bg-card)', padding: '1px 4px', borderRadius: 3, border: '1px solid var(--border-color)', margin: '0 4px' }}>Shift+Enter</kbd> for new line
        </p>
      </div>
    </main>
  );
}
