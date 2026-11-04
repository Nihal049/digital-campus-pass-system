import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Bot, 
  Send, 
  BookOpen, 
  Database, 
  Upload, 
  HelpCircle, 
  ChevronRight,
  Sparkles
} from 'lucide-react';

export default function AIAssistantPage() {
  const { user, token } = useAuth();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! I am your AI Campus Assistant. I can answer questions about campus gate timings, pass approval policies, visitor rules, hostel curfews, and academic regulations based strictly on authorized university documents.',
      sources: []
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('CHAT'); // CHAT or DOCUMENTS
  const [documents, setDocuments] = useState([]);
  const [stats, setStats] = useState(null);

  // Ingestion form state (Admin)
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('GATE_POLICY');
  const [uploadText, setUploadText] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');

  const chatEndRef = useRef(null);

  useEffect(() => {
    fetchDocsAndStats();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const fetchDocsAndStats = async () => {
    try {
      const [docsRes, statsRes] = await Promise.all([
        fetch('/api/rag/documents'),
        fetch('/api/rag/stats')
      ]);
      if (docsRes.ok) {
        const d = await docsRes.json();
        setDocuments(d.documents || []);
      }
      if (statsRes.ok) {
        const s = await statsRes.json();
        setStats(s);
      }
    } catch (err) {
      console.error('Failed to load RAG metadata:', err);
    }
  };

  const handleSend = async (queryToSend) => {
    const text = (queryToSend || inputQuery).trim();
    if (!text || loading) return;

    const userMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setInputQuery('');
    setLoading(true);

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/rag/query', {
        method: 'POST',
        headers,
        body: JSON.stringify({ question: text })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to get answer');

      const botMessage = {
        role: 'assistant',
        content: data.answer,
        sources: data.sources || [],
        confidence: data.confidence,
        responseTimeMs: data.responseTimeMs
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (err) {
      setMessages(prev => [
        ...prev, 
        { 
          role: 'assistant', 
          content: 'Sorry, I encountered an error while searching the campus policy knowledge base. Please check back shortly.', 
          sources: [] 
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleIngest = async (e) => {
    e.preventDefault();
    if (!uploadTitle.trim()) return;

    setUploading(true);
    setUploadStatus('');

    try {
      const formData = new FormData();
      formData.append('title', uploadTitle.trim());
      formData.append('category', uploadCategory);

      if (uploadFile) {
        formData.append('document', uploadFile);
      } else if (uploadText.trim()) {
        formData.append('raw_text', uploadText.trim());
      } else {
        throw new Error('Please enter text content or select a file to upload.');
      }

      const res = await fetch('/api/rag/ingest', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to ingest document');

      setUploadStatus(`Document "${uploadTitle}" successfully ingested! Created ${data.document.chunkCount} semantic chunks with vector embeddings.`);
      setUploadTitle('');
      setUploadText('');
      setUploadFile(null);
      fetchDocsAndStats();
    } catch (err) {
      setUploadStatus(`Error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const samplePrompts = [
    "What is the curfew time for hostel students on weekends?",
    "Can visitors enter the campus after 6:30 PM?",
    "What is the procedure for an Emergency Medical Pass?",
    "Are visitors permitted to stay overnight in student hostels?",
    "What are the gate timings for Main Gate and North Gate?",
    "What is the penalty for sharing or tampering with a QR pass?"
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* RAG Assistant Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
            <Sparkles className="w-3.5 h-3.5 text-slate-600" />
            Retrieval-Augmented Generation (RAG) System
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            AI Campus Assistant
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5 max-w-2xl">
            Policy-grounded Q&A trained on official student handbooks, gate regulations, and security protocols.
          </p>
        </div>

        {/* Knowledge Base Pill Stats */}
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-xs shrink-0">
          <div className="text-center px-3 border-r border-slate-200">
            <div className="text-slate-500 font-medium">Documents</div>
            <div className="text-base font-bold text-slate-900 mt-0.5">{stats?.documents || 0}</div>
          </div>
          <div className="text-center px-3 border-r border-slate-200">
            <div className="text-slate-500 font-medium">Vector Chunks</div>
            <div className="text-base font-bold text-slate-900 mt-0.5">{stats?.chunks || 0}</div>
          </div>
          <div className="text-center px-2">
            <div className="text-slate-500 font-medium">Engine</div>
            <div className="text-xs font-semibold text-emerald-700 mt-0.5">PostgreSQL / pgvector</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs w-fit">
        <button
          onClick={() => setActiveTab('CHAT')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition cursor-pointer ${
            activeTab === 'CHAT'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          Campus Q&A Chat
        </button>

        <button
          onClick={() => setActiveTab('DOCUMENTS')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition cursor-pointer ${
            activeTab === 'DOCUMENTS'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          Knowledge Base Documents ({documents.length})
        </button>
      </div>

      {/* Tab 1: Chat Interface */}
      {activeTab === 'CHAT' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Chat Window */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col h-[650px] overflow-hidden">
            
            {/* Messages Scroll Area */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4">
              {messages.map((m, idx) => {
                const isUser = m.role === 'user';

                return (
                  <div key={idx} className={`flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                    
                    {!isUser && (
                      <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0 text-xs">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}

                    <div className={`max-w-xl rounded-xl p-4 text-xs sm:text-sm leading-relaxed ${
                      isUser 
                        ? 'bg-slate-900 text-white rounded-tr-none shadow-xs' 
                        : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-tl-none'
                    }`}>
                      
                      {/* Message Content */}
                      <div className="whitespace-pre-wrap font-sans">
                        {m.content}
                      </div>

                      {/* Source Citations */}
                      {!isUser && m.sources && m.sources.length > 0 && (
                        <div className="pt-3 mt-3 border-t border-slate-200 space-y-1.5">
                          <div className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                            <BookOpen className="w-3.5 h-3.5 text-slate-600" />
                            Retrieved Sources ({m.sources.length}):
                          </div>

                          <div className="grid grid-cols-1 gap-1.5">
                            {m.sources.map((src, sIdx) => (
                              <div
                                key={sIdx}
                                className="bg-white border border-slate-200 p-2 rounded-md text-[11px] text-slate-700 flex items-center justify-between"
                              >
                                <div className="truncate pr-2">
                                  <span className="font-semibold text-slate-900">[{sIdx + 1}] {src.docTitle}</span>
                                  {src.sectionTitle && <span className="text-slate-500 block text-[10px]">{src.sectionTitle}</span>}
                                </div>
                                <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">
                                  sim: {src.score}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>

                    {isUser && (
                      <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 text-xs font-bold">
                        {user?.name?.[0] || 'U'}
                      </div>
                    )}

                  </div>
                );
              })}

              {loading && (
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-xs text-slate-500 flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-slate-800 border-t-transparent rounded-full animate-spin"></div>
                    Searching vector knowledge base and formulating answer...
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-3.5 bg-slate-50 border-t border-slate-200">
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder="Ask a campus policy or gate rules question..."
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                />
                <button
                  type="submit"
                  disabled={loading || !inputQuery.trim()}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  Ask
                </button>
              </form>
            </div>

          </div>

          {/* Right Column: Suggested Questions & RAG Info */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Prompt Chips */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-slate-500" />
                Frequently Asked Inquiries
              </h3>
              <p className="text-[11px] text-slate-500">
                Click any question to query the campus policy vector store:
              </p>

              <div className="space-y-1.5">
                {samplePrompts.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(prompt)}
                    className="w-full text-left p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs text-slate-700 hover:text-slate-900 transition flex items-start gap-2 cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>{prompt}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Architecture Separation Notice */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-2 text-xs">
              <h3 className="font-bold text-slate-900 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-slate-700" />
                Architectural Decoupling
              </h3>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                The RAG pipeline operates on isolated PostgreSQL vector embeddings tables.
                Gate validation and transactional passes remain decoupled, ensuring zero performance interference.
              </p>
            </div>

          </div>

        </div>
      )}

      {/* Tab 2: Document Knowledge Base & Ingestion */}
      {activeTab === 'DOCUMENTS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Ingested Documents List */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-slate-700" />
                Indexed Campus Documents
              </h2>
              <span className="text-xs text-slate-500">{documents.length} verified policies</span>
            </div>

            <div className="space-y-2.5">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 flex items-start justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{doc.title}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold uppercase">
                        {doc.category}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 font-mono">
                      File: {doc.source_file} • Chunks: {doc.chunk_count}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Indexed on {new Date(doc.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold shrink-0">
                    VECTORIZED
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Admin Ingestion Form */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Upload className="w-4 h-4 text-slate-700" />
                Ingest New Campus Document
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload official handbooks or paste policy text to automatically chunk and embed into the vector database.
              </p>
            </div>

            {uploadStatus && (
              <div className={`p-3 rounded-lg border text-xs ${
                uploadStatus.startsWith('Error') 
                  ? 'bg-rose-50 border-rose-200 text-rose-700' 
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}>
                {uploadStatus}
              </div>
            )}

            <form onSubmit={handleIngest} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Document Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sports Facility & Gym Access Timings"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Policy Category</label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 cursor-pointer"
                >
                  <option value="GATE_POLICY">Gate & Curfew Policies</option>
                  <option value="PASS_POLICY">Pass & Leave Regulations</option>
                  <option value="VISITOR_RULES">Visitor Guidelines</option>
                  <option value="HOSTEL_RULES">Hostel Conduct</option>
                  <option value="LAB_LIBRARY_POLICY">Academic & Facility Access</option>
                  <option value="EMERGENCY">Emergency & Healthcare</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Upload Document File (.pdf / .txt / .md)</label>
                <input
                  type="file"
                  accept=".pdf,.txt,.md,.json"
                  onChange={(e) => setUploadFile(e.target.files[0])}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1 file:px-2.5 file:rounded-md file:border file:border-slate-300 file:text-xs file:font-semibold file:bg-slate-50 file:text-slate-700 hover:file:bg-slate-100 cursor-pointer"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Or Paste Text Directly</label>
                <textarea
                  rows={4}
                  placeholder="Paste document rules, sections, or policy guidelines..."
                  value={uploadText}
                  onChange={(e) => setUploadText(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={uploading}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                {uploading ? 'Processing & Vectorizing...' : 'Chunk & Index into Vector Store'}
              </button>
            </form>
          </div>

        </div>
      )}

    </div>
  );
}
