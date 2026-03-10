# 🧠 DocuMind — AI-Powered RAG Document Intelligence

<div align="center">

![DocuMind Banner](https://img.shields.io/badge/DocuMind-RAG%20System-4F8EF7?style=for-the-badge&logo=openai&logoColor=white)

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18+-61DAFB?style=flat&logo=react&logoColor=black)](https://reactjs.org)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-AI-4285F4?style=flat&logo=google&logoColor=white)](https://ai.google.dev)
[![FAISS](https://img.shields.io/badge/FAISS-Vector%20DB-FF6F00?style=flat&logo=meta&logoColor=white)](https://faiss.ai)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat&logo=docker&logoColor=white)](https://docker.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**An end-to-end, production-ready Retrieval-Augmented Generation (RAG) system. Upload any document and ask questions in plain English — powered by Google Gemini AI.**

[Live Demo](#) · [Report Bug](https://github.com/tanishqvarshney/RAG-Document_Intelligence/issues) · [Request Feature](https://github.com/tanishqvarshney/RAG-Document_Intelligence/issues)

</div>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 📄 **Multi-format Ingestion** | Upload PDFs, DOCX, and CSV files |
| 🔍 **Semantic Search** | FAISS vector DB retrieves contextually relevant chunks |
| 🤖 **AI-Powered Answers** | Google Gemini 2.5 Flash generates cited, accurate responses |
| 🔐 **JWT Authentication** | Secure login system with token-based API access |
| 🛡️ **Prompt Injection Guard** | System-level protection against adversarial LLM attacks |
| ♻️ **Duplicate Detection** | Blocks re-uploading of already indexed documents |
| 🎯 **Relevance Thresholding** | Distance-based cutoff rejects completely unrelated queries |
| 🗑️ **Ghost Doc Filtering** | Deleted documents are excluded from FAISS retrieval in real-time |
| ⚡ **Rate Limiting** | 60 req/min per IP to protect the Gemini API budget |
| 🐳 **Docker Ready** | One-command deployment with `docker compose up` |
| 🔄 **CI/CD Pipeline** | GitHub Actions workflow for automated testing |

---

## 🏗️ Architecture

```
User Query
    │
    ▼
┌─────────────────────────────────────┐
│          React Frontend             │  ← Vite + JSX
│    Upload · Chat · Source View      │
└─────────────┬───────────────────────┘
              │ HTTP / JWT
              ▼
┌─────────────────────────────────────┐
│        FastAPI Backend              │
│  Auth · Upload · Chat Routers       │
│  Rate Limiting · Global Error Handler│
└──────┬──────────────────────────────┘
       │
   ┌───┴────────────────────────────┐
   │         RAG Pipeline           │
   │                                │
   │  1. Chunk Document (LangChain) │
   │  2. Embed (gemini-embedding-001)│
   │  3. Store in FAISS Index        │
   │  4. Query → Top-K Retrieval     │
   │  5. Distance Threshold Filter   │
   │  6. Build Context + Metadata    │
   │  7. LLM → Answer (Gemini Flash) │
   └────────────────────────────────┘
```

---

## 🛠️ Tech Stack

**Backend**
- [FastAPI](https://fastapi.tiangolo.com/) — High-performance Python API framework
- [LangChain](https://langchain.com/) — Document loading, text splitting, and retrieval chains
- [FAISS](https://faiss.ai/) — Facebook AI Similarity Search (vector database)
- [Google Gemini AI](https://ai.google.dev/) — Embedding model (`gemini-embedding-001`) + Chat model (`gemini-2.5-flash`)
- [PyJWT](https://pyjwt.readthedocs.io/) — JSON Web Token authentication
- [PyPDF2 / python-docx](https://pypdf2.readthedocs.io/) — PDF & DOCX document parsing

**Frontend**
- [React 18](https://reactjs.org/) — Component-based UI framework
- [Vite](https://vitejs.dev/) — Lightning-fast development build tool
- [Axios](https://axios-http.com/) — HTTP client with interceptors for JWT handling

**Infrastructure**
- [Docker + Docker Compose](https://docker.com) — Containerized deployment
- [GitHub Actions](https://github.com/features/actions) — CI/CD pipeline

---

## 🚀 Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- A [Google AI Studio API Key](https://aistudio.google.com/app/apikey)

### 1. Clone the Repository

```bash
git clone https://github.com/tanishqvarshney/RAG-Document_Intelligence.git
cd RAG-Document_Intelligence
```

### 2. Backend Setup

```bash
cd backend

# Create and activate a virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
```

Open `.env` and set your Google API Key:

```env
GOOGLE_API_KEY=your_google_ai_studio_key_here
JWT_SECRET=your-strong-random-secret-key
```

```bash
# Start the backend server
python3 -m uvicorn main:app --reload --port 8000
```

Backend is running at: `http://localhost:8000`  
Interactive API docs at: `http://localhost:8000/docs`

### 3. Frontend Setup

```bash
cd frontend

# Install Node dependencies
npm install

# Start the development server
npm run dev
```

Frontend is running at: `http://localhost:5173`

---

## 🐳 Docker Deployment (Recommended)

Run the entire stack (backend + frontend) with a single command:

```bash
# From the project root
docker compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |

---

## 📖 API Reference

All endpoints (except `/api/auth/login` and `/api/health`) require a `Bearer` JWT token in the `Authorization` header.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/login` | Authenticate and receive a JWT token |
| `GET` | `/api/health` | Health check ping |
| `POST` | `/api/upload` | Upload and index a document |
| `GET` | `/api/documents/` | List all your indexed documents |
| `DELETE` | `/api/documents/{id}` | Delete a document |
| `POST` | `/api/chat` | Ask a question across your documents |

### Quick Auth Example

```bash
# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'

# Upload a document
curl -X POST http://localhost:8000/api/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@report.pdf"

# Ask a question
curl -X POST http://localhost:8000/api/chat \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"question": "What are the key findings in the report?"}'
```

---

## 🔒 Security Features

- **JWT Authentication** with 24-hour token expiry
- **Prompt Injection Protection** — LLM actively rejects system override attempts
- **File Type Validation** — Only `.pdf`, `.docx`, `.csv` accepted
- **File Size Limit** — Maximum 50MB per upload
- **Rate Limiting** — 60 requests/minute per IP address
- **Path Traversal Guard** — All files stored via UUID, not user-provided paths
- **Duplicate Detection** — `409 Conflict` on duplicate filename uploads

---

## 📁 Project Structure

```
RAG-Document_Intelligence/
├── backend/
│   ├── main.py                 # FastAPI app + middleware setup
│   ├── auth.py                 # JWT token generation & validation
│   ├── config.py               # Central configuration & environment vars
│   ├── requirements.txt        # Python dependencies
│   ├── Dockerfile              # Backend container definition
│   ├── .env.example            # Environment variables template
│   ├── routers/
│   │   ├── auth.py             # Login/logout endpoints
│   │   ├── upload.py           # Document upload with duplicate check
│   │   ├── chat.py             # RAG Q&A endpoint
│   │   └── documents.py        # Document listing & deletion
│   └── services/
│       ├── ingestion.py        # Document parsing, chunking, embedding
│       ├── retrieval.py        # FAISS search + LLM answer generation
│       └── storage.py          # Local file storage service
├── frontend/
│   ├── src/
│   │   ├── App.jsx             # Root component + auth state
│   │   ├── components/
│   │   │   ├── Sidebar.jsx     # Document upload & management panel
│   │   │   ├── ChatInterface.jsx # Chat UI with source citations
│   │   │   └── MessageBubble.jsx # Individual message display
│   │   └── api/
│   │       └── client.js       # Axios client with JWT interceptors
│   └── Dockerfile              # Frontend container definition
├── .github/
│   └── workflows/ci.yml        # GitHub Actions CI pipeline
├── docker-compose.yml          # Full stack container orchestration
└── README.md
```

---

## ⚙️ Configuration

All settings are managed via environment variables in `backend/.env`:

| Variable | Default | Description |
|----------|---------|-------------|
| `GOOGLE_API_KEY` | *(required)* | Your Google AI Studio API key |
| `JWT_SECRET` | `documind-dev-secret` | Secret key for JWT signing (**change in production!**) |
| `UPLOAD_DIR` | `backend/uploads/` | Directory for uploaded documents |
| `FAISS_INDEX_DIR` | `backend/faiss_store/` | Directory for FAISS vector index |

---

## 🧪 Testing

A complete 80+ test case QA plan was executed against this system including:

- ✅ Document ingestion (valid, empty, corrupted, duplicate files)
- ✅ Semantic retrieval (exact, synonym, partial, unrelated queries)
- ✅ LLM response validation (hallucination, multi-source, citations)
- ✅ API endpoint security (auth, rate limits, missing params)
- ✅ Prompt injection & file upload exploit attempts
- ✅ Edge cases (empty index, deleted documents, ghost chunks)

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.

---

## 👤 Author

**Tanishq Varshney**

[![GitHub](https://img.shields.io/badge/GitHub-tanishqvarshney-181717?style=flat&logo=github)](https://github.com/tanishqvarshney)

---

<div align="center">
Made with ❤️ and ☕ | If this helped you, give it a ⭐
</div>
