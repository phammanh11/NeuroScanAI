import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Bot,
  Database,
  ExternalLink,
  FileSearch,
  Loader2,
  Maximize2,
  RotateCcw,
  Send,
  Sparkles,
  User as UserIcon,
  X,
} from 'lucide-react';
import { useAuth } from '../../app/providers/AuthProvider';
import { neuroscanAdapter } from '../../services/api/neuroscanAdapter';
import { TumorClassBadge } from './TumorClassBadge';
import type { ChatMessageRecord } from '../../types/domain';

const INITIAL_SUGGESTIONS = [
  'Phân biệt Glioma, Meningioma và Pituitary trên MRI',
  'Chuỗi xung T1W, T2W, FLAIR và T1-Gd khác nhau thế nào?',
  'Kiểm tra kết quả chụp MRI trong hệ thống',
  'Dấu hiệu cờ đỏ thần kinh nào cần đi cấp cứu ngay?',
];

export const FloatingMedicalChatbot: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const isDoctor =
    user?.role === 'DOCTOR' ||
    user?.role === 'doctor' ||
    user?.role === 'ADMIN' ||
    user?.role === 'admin';

  const fullChatPath = isDoctor ? '/doctor/ai-assistant' : '/ai-assistant';

  // Ẩn widget nổi khi đang ở trang Chatbot toàn màn hình hoặc trang Đăng nhập/Đăng ký
  const isOnFullChatPage =
    location.pathname.startsWith('/ai-assistant') ||
    location.pathname.startsWith('/doctor/ai-assistant') ||
    location.pathname.startsWith('/login') ||
    location.pathname.startsWith('/register') ||
    location.pathname.startsWith('/forgot-password');

  const welcomeMessage: ChatMessageRecord = {
    id: 'floating-welcome',
    sessionId: '1',
    sender: 'assistant',
    createdAt: new Date().toISOString(),
    urgency: 'informational',
    content:
      `Xin chào ${user?.fullName ? `**${user.fullName}**` : 'bạn'}! Mình là **Trợ lý AI Y tế NeuroScan** (vận hành bằng **RAG Vector DB**).\n\n` +
      `Mình có thể hỗ trợ bạn:\n` +
      `• Giải thích 4 nhãn phân loại MRI (*Glioma, Meningioma, Pituitary, No Tumor*).\n` +
      `• Giải thích chuỗi xung *T1W, T2W, FLAIR, T1-Gd* & bản đồ nhiệt *Grad-CAM*.\n` +
      `• Tra cứu nhanh kết quả chụp MRI (ví dụ: \`NS-2026-0001\`, \`BN-2026-002\`).`,
  };

  const [messages, setMessages] = useState<ChatMessageRecord[]>([welcomeMessage]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>(INITIAL_SUGGESTIONS);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [messages, isOpen]);

  if (isOnFullChatPage) {
    return null;
  }

  const handleSendMessage = async (textToSend?: string) => {
    const cleanText = (textToSend ?? input).trim();
    if (!cleanText || loading) return;

    setInput('');
    const optimisticUser: ChatMessageRecord = {
      id: `fl-u-${Date.now()}`,
      sessionId: '1',
      sender: 'user',
      content: cleanText,
      createdAt: new Date().toISOString(),
    };

    const currentHistory = [...messages, optimisticUser];
    setMessages(currentHistory);
    setLoading(true);

    try {
      const { assistantMessage } = await neuroscanAdapter.sendChatMessage(
        '1',
        cleanText,
        messages
      );

      setMessages((prev) => [...prev, assistantMessage]);
      if (assistantMessage.suggestions && assistantMessage.suggestions.length > 0) {
        setSuggestions(assistantMessage.suggestions);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `fl-err-${Date.now()}`,
          sessionId: '1',
          sender: 'assistant',
          createdAt: new Date().toISOString(),
          content:
            'Hệ thống đang bận trong giây lát. Bạn vui lòng thử lại hoặc mở trang Trợ lý AI đầy đủ nhé!',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([welcomeMessage]);
    setSuggestions(INITIAL_SUGGESTIONS);
  };

  const renderFormattedText = (text: string) => {
    return text.split('\n').map((line, lineIdx) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={lineIdx} className="h-1.5" />;
      const cleanLine = trimmed.replace(/^###\s+/, '');
      const parts = cleanLine.split(/(\*\*.*?\*\*|\*[^*]+\*|`[^`]+`)/g);
      return (
        <div
          key={lineIdx}
          className={
            trimmed.startsWith('•') || trimmed.startsWith('-')
              ? 'pl-2 py-0.5'
              : trimmed.startsWith('### ')
                ? 'font-bold text-teal-700 dark:text-teal-300 mt-1.5'
                : 'py-0.5'
          }
        >
          {parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={i} className="font-bold text-slate-900 dark:text-white">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            if (part.startsWith('`') && part.endsWith('`')) {
              return (
                <code
                  key={i}
                  className="px-1 py-0.5 rounded bg-teal-500/15 text-teal-700 dark:text-teal-300 font-mono text-[11px]"
                >
                  {part.slice(1, -1)}
                </code>
              );
            }
            if (part.startsWith('*') && part.endsWith('*')) {
              return (
                <em key={i} className="italic opacity-90">
                  {part.slice(1, -1)}
                </em>
              );
            }
            return <span key={i}>{part}</span>;
          })}
        </div>
      );
    });
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 font-sans">
      {/* Nút mở Chatbot nổi thu gọn cân đối, không che khuất nội dung trang */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Mở Trợ lý AI Y tế NeuroScan"
          title="Mở Trợ lý AI Y tế (Giải thích MRI & Tra cứu Ca bệnh)"
          className="group relative flex items-center gap-2 bg-gradient-to-r from-teal-700 to-teal-600 hover:from-teal-600 hover:to-teal-500 text-white pl-2.5 pr-3.5 py-2 rounded-full shadow-lg shadow-teal-950/30 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer border border-teal-400/30"
        >
          <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm">
            <Bot className="w-4 h-4 text-white" />
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-teal-800" />
            </span>
          </span>
          <span className="font-semibold text-xs tracking-tight whitespace-nowrap">
            Trợ lý AI
          </span>
        </button>
      )}

      {/* Cửa sổ Chatbot nổi kích thước cân đối */}
      {isOpen && (
        <div className="w-[325px] sm:w-[356px] h-[450px] max-h-[72vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white px-3.5 py-2.5 flex items-center justify-between shrink-0 border-b border-teal-500/20">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-teal-300" />
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full ring-2 ring-slate-900" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-xs leading-tight truncate">
                    NeuroScan Clinical AI
                  </h3>
                  <Sparkles className="w-3 h-3 text-teal-300 shrink-0" />
                </div>
                <p className="text-[10px] text-teal-200/80 flex items-center gap-1 truncate">
                  <Database className="w-2.5 h-2.5 text-teal-400 shrink-0" />
                  <span>RAG Vector DB • Llama 3.3 70B</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-0.5">
              <Link
                to={fullChatPath}
                onClick={() => setIsOpen(false)}
                title="Mở toàn màn hình"
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </Link>
              <button
                type="button"
                onClick={handleResetChat}
                title="Làm mới cuộc trò chuyện"
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Đóng cửa sổ chat"
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Danh sách tin nhắn */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50/70 dark:bg-slate-950/50">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      isUser
                        ? 'bg-teal-600 text-white'
                        : 'bg-slate-900 dark:bg-teal-950 text-teal-300 border border-teal-500/30'
                    }`}
                  >
                    {isUser ? <UserIcon className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                  </div>

                  <div className={`max-w-[83%] space-y-2 ${isUser ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed shadow-xs ${
                        isUser
                          ? 'bg-teal-600 text-white rounded-tr-xs'
                          : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-800 rounded-tl-xs'
                      }`}
                    >
                      {renderFormattedText(msg.content)}

                      {/* RAG Vector DB Trace */}
                      {!isUser && msg.ragTrace && msg.ragTrace.topChunks && msg.ragTrace.topChunks.length > 0 && (
                        <details className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400">
                          <summary className="cursor-pointer flex items-center gap-1 font-medium text-teal-700 dark:text-teal-400 hover:text-teal-600 select-none">
                            <Database className="w-3 h-3" />
                            <span>
                              RAG Vector ({msg.ragTrace.topChunks.length}/{msg.ragTrace.totalChunksIndexed} chunks •{' '}
                              {msg.ragTrace.llmModel.split('/').pop()})
                            </span>
                          </summary>
                          <div className="mt-1.5 space-y-1 pl-1">
                            {msg.ragTrace.topChunks.map((chunk) => {
                              const rawScore = chunk.score ?? chunk.similarity ?? 0.85;
                              return (
                                <div
                                  key={String(chunk.id)}
                                  className="flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/80 px-2 py-1 rounded-lg"
                                >
                                  <span className="truncate font-medium text-slate-700 dark:text-slate-300">
                                    • {chunk.title}
                                  </span>
                                  <span className="shrink-0 font-mono text-[9px] bg-teal-500/15 text-teal-700 dark:text-teal-300 px-1.5 py-0.5 rounded font-semibold">
                                    {Math.round(rawScore * 100)}%
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </details>
                      )}
                    </div>

                    {/* Thẻ ca chụp MRI tra cứu được */}
                    {!isUser && msg.matchedScans && msg.matchedScans.length > 0 && (
                      <div className="space-y-1.5 pt-0.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 px-1 flex items-center gap-1">
                          <FileSearch className="w-3 h-3" />
                          Ca chụp MRI từ hệ thống D1:
                        </p>
                        {msg.matchedScans.map((scan) => {
                          const targetUrl = isDoctor
                            ? `/doctor/cases/${scan.id}`
                            : `/mri-results/${scan.id}`;
                          return (
                            <div
                              key={scan.id}
                              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 shadow-xs flex items-center justify-between gap-2"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <img
                                  src={scan.imageUrl}
                                  alt={scan.sessionCode}
                                  className="w-10 h-10 rounded-lg object-cover bg-slate-950 shrink-0"
                                />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] font-mono font-bold text-slate-900 dark:text-white">
                                      {scan.sessionCode}
                                    </span>
                                    <TumorClassBadge label={scan.predictedLabel} size="sm" />
                                  </div>
                                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                    {scan.patientName} • {(scan.confidence * 100).toFixed(1)}%
                                  </p>
                                </div>
                              </div>
                              <Link
                                to={targetUrl}
                                onClick={() => setIsOpen(false)}
                                className="shrink-0 p-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white transition-colors"
                                title="Xem chi tiết ca chụp"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </Link>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-slate-900 dark:bg-teal-950 text-teal-300 flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 rounded-2xl rounded-tl-xs shadow-xs flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600" />
                  <span>Đang truy xuất Vector DB & phân tích...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Gợi ý câu hỏi nhanh */}
          {suggestions.length > 0 && !loading && (
            <div className="px-3.5 py-2 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-1.5 shrink-0">
              {suggestions.slice(0, 2).map((sug, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(sug)}
                  className="text-[11px] bg-slate-100 hover:bg-teal-50 dark:bg-slate-800 dark:hover:bg-teal-950/60 text-slate-700 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-300 border border-slate-200/80 dark:border-slate-700 px-2.5 py-1 rounded-full transition-colors cursor-pointer truncate max-w-full"
                >
                  {sug}
                </button>
              ))}
            </div>
          )}

          {/* Ô nhập tin nhắn */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 shrink-0"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Hỏi về Glioma, chuỗi xung MRI, mã ca..."
              disabled={loading}
              className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs px-3.5 py-2.5 rounded-xl border border-transparent focus:border-teal-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              aria-label="Gửi tin nhắn"
              className="p-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white transition-colors cursor-pointer shrink-0 shadow-xs"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
