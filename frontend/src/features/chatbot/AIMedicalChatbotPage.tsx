import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  BookOpen,
  Bot,
  Database,
  FileSearch,
  MessageSquarePlus,
  PhoneCall,
  RotateCcw,
  Send,
  ShieldAlert,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../../app/providers/AuthProvider';
import { useToast } from '../../app/providers/ToastProvider';
import { PageHeader } from '../../components/common/PageHeader';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { MedicalDisclaimer } from '../../components/medical/MedicalDisclaimer';
import { TumorClassBadge } from '../../components/medical/TumorClassBadge';
import { ChatMessage } from '../../components/medical/ChatMessage';
import { neuroscanAdapter } from '../../services/api/neuroscanAdapter';
import type { ChatSessionRecord, MRIAnalysisRecord } from '../../types/domain';

const DEFAULT_SUGGESTED_QUESTIONS = [
  'Phân biệt Glioma, Meningioma và Pituitary trên ảnh MRI',
  'Chuỗi xung T1W, T2W, FLAIR và T1-Gd khác nhau thế nào?',
  'Kiểm tra kết quả chụp MRI trong hệ thống',
  'Bản đồ nhiệt Grad-CAM và tiền xử lý CLAHE hoạt động ra sao?',
  'Dấu hiệu cờ đỏ thần kinh nào cần đi cấp cứu ngay?',
  'Cần chuẩn bị gì trước khi chụp Cộng hưởng từ (MRI) sọ não?',
];

const QUICK_LOOKUP_SHORTCUTS = [
  {
    badge: 'D1 Lookup',
    label: 'Tra cứu các ca chụp MRI mới nhất',
    prompt: 'Kiểm tra kết quả chụp MRI mới nhất trong hệ thống',
  },
  {
    badge: 'WHO CNS5',
    label: 'So sánh 4 nhãn u não (Glioma / Meningioma / Pituitary)',
    prompt: 'Phân biệt đặc điểm hình ảnh của Glioma, Meningioma và Pituitary trên MRI sọ não',
  },
  {
    badge: 'MRI Physics',
    label: 'Giải thích chuỗi xung T1W, T2W, FLAIR & T1-Gd',
    prompt: 'Giải thích ý nghĩa các chuỗi xung T1W, T2W, FLAIR và tiêm đối quang từ T1-Gd',
  },
  {
    badge: 'Explainable AI',
    label: 'Bản đồ vùng chú ý Grad-CAM & Điểm tự tin',
    prompt: 'Bản đồ nhiệt Grad-CAM, tiền xử lý Otsu/CLAHE và điểm tự tin Confidence Score có ý nghĩa gì?',
  },
];

export const AIMedicalChatbotPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const analysisIdParam = searchParams.get('analysisId');

  const [sessions, setSessions] = useState<ChatSessionRecord[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [linkedAnalysis, setLinkedAnalysis] = useState<MRIAnalysisRecord | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>(DEFAULT_SUGGESTED_QUESTIONS);
  const [sessionToDelete, setSessionToDelete] = useState<ChatSessionRecord | null>(null);

  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    const container = messagesContainerRef.current;
    if (!container) return;
    container.scrollTo({
      top: container.scrollHeight,
      behavior,
    });
  };

  useEffect(() => {
    if (!user) return;
    let mounted = true;

    const initChat = async () => {
      try {
        const existingSessions = await neuroscanAdapter.getChatSessions(user.id);
        if (!mounted) return;

        if (analysisIdParam) {
          const analysis = await neuroscanAdapter.getAnalysisById(analysisIdParam);
          if (!mounted) return;
          if (analysis) {
            setLinkedAnalysis(analysis);
            const matched = existingSessions.find((s) => s.linkedAnalysisId === analysis.id);
            if (matched) {
              setSessions(existingSessions);
              setActiveSessionId(matched.id);
              return;
            }
            const created = await neuroscanAdapter.createChatSession(user.id, analysis);
            if (!mounted) return;
            setSessions([created, ...existingSessions]);
            setActiveSessionId(created.id);
            return;
          }
        }

        if (existingSessions.length === 0) {
          const created = await neuroscanAdapter.createChatSession(user.id, null);
          if (!mounted) return;
          setSessions([created]);
          setActiveSessionId(created.id);
        } else {
          setSessions(existingSessions);
          setActiveSessionId(existingSessions[0].id);
        }
      } catch (err) {
        if (!mounted) return;
        showToast({
          title: 'Không thể khởi tạo phiên hội thoại',
          description: err instanceof Error ? err.message : 'Vui lòng thử lại.',
          variant: 'error',
        });
      }
    };

    initChat();
    return () => {
      mounted = false;
    };
  }, [user, analysisIdParam, showToast]);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];

  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      scrollToBottom('smooth');
    });
    return () => window.cancelAnimationFrame(id);
  }, [activeSession?.messages.length, sending]);

  const handleCreateNewSession = async () => {
    if (!user) return;
    const created = await neuroscanAdapter.createChatSession(user.id, null);
    setLinkedAnalysis(null);
    setSearchParams({});
    setSessions((prev) => [created, ...prev]);
    setActiveSessionId(created.id);
    setSuggestions(DEFAULT_SUGGESTED_QUESTIONS);
    showToast({
      title: 'Đã tạo phiên hội thoại mới',
      variant: 'info',
    });
  };

  const handleConfirmDeleteSession = async () => {
    if (!sessionToDelete || !user) return;
    const deletedId = sessionToDelete.id;
    await neuroscanAdapter.deleteChatSession(deletedId);

    const remaining = sessions.filter((s) => s.id !== deletedId);
    setSessionToDelete(null);

    if (remaining.length === 0) {
      const fresh = await neuroscanAdapter.createChatSession(user.id, null);
      setSessions([fresh]);
      setActiveSessionId(fresh.id);
    } else {
      setSessions(remaining);
      if (activeSessionId === deletedId) {
        setActiveSessionId(remaining[0].id);
      }
    }

    showToast({
      title: 'Đã xóa cuộc hội thoại',
      variant: 'info',
    });
  };

  const handleSendMessage = async (textOverride?: string) => {
    const rawText = textOverride ?? inputValue;
    const trimmed = rawText.trim();
    if (!trimmed || !user || sending) return;

    let targetSession = activeSession;
    if (!targetSession) {
      const created = await neuroscanAdapter.createChatSession(user.id, linkedAnalysis);
      setSessions((prev) => [created, ...prev]);
      setActiveSessionId(created.id);
      targetSession = created;
    }

    const targetSessionId = targetSession.id;
    const currentHistory = targetSession.messages || [];

    setInputValue('');
    setSending(true);

    try {
      const { userMessage, assistantMessage } = await neuroscanAdapter.sendChatMessage(
        targetSessionId,
        trimmed,
        currentHistory
      );

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== targetSessionId) return s;
          const updatedTitle =
            s.title === 'Hội thoại Y tế Mới' || s.title === 'Hội thoại Y tế' || s.title.startsWith('Phiên tư vấn')
              ? trimmed.length > 42
                ? `${trimmed.slice(0, 42)}...`
                : trimmed
              : s.title;
          return {
            ...s,
            title: updatedTitle,
            updatedAt: assistantMessage.createdAt,
            messages: [...s.messages, userMessage, assistantMessage],
          };
        })
      );

      if (assistantMessage.suggestions && assistantMessage.suggestions.length > 0) {
        setSuggestions(assistantMessage.suggestions);
      }
    } catch (err) {
      showToast({
        title: 'Lỗi gửi tin nhắn',
        description: err instanceof Error ? err.message : 'Vui lòng thử lại.',
        variant: 'error',
      });
    } finally {
      setSending(false);
    }
  };

  const knowledgePath =
    user?.role === 'DOCTOR' || user?.role === 'doctor'
      ? '/knowledge'
      : '/medical-knowledge';

  return (
    <div className="space-y-5">
      <PageHeader
        badgeText="RAG VECTOR DB • CLOUDFLARE WORKERS AI (LLAMA 3.3 70B & BGE-M3)"
        title="Trợ lý AI Y tế & Giải thích Hình ảnh MRI"
        description="Hệ thống Hỏi - Đáp Y khoa Thần kinh tích hợp Vector Database (RAG) và tra cứu trực tiếp hồ sơ ca chụp MRI trên Cloudflare D1."
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to={knowledgePath}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <BookOpen className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              Thư viện Tri thức Y khoa
            </Link>
            <button
              type="button"
              onClick={handleCreateNewSession}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white shadow-xs transition-colors"
            >
              <MessageSquarePlus className="w-4 h-4" />
              Tạo hội thoại mới
            </button>
          </div>
        }
      />

      <MedicalDisclaimer compact />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left Sidebar: Sessions + RAG Knowledge Quick Lookup + Red Flags */}
        <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Danh sách hội thoại ({sessions.length})
            </h2>
            <button
              type="button"
              onClick={handleCreateNewSession}
              title="Khởi tạo cuộc trò chuyện mới"
              className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Làm mới
            </button>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {sessions.map((item) => {
              const isSelected = item.id === activeSession?.id;
              return (
                <div
                  key={item.id}
                  className={`group flex items-start justify-between gap-2 p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-teal-600 bg-teal-50/70 dark:bg-teal-950/30'
                      : 'border-slate-200/70 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                  onClick={() => setActiveSessionId(item.id)}
                >
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-xs font-bold truncate ${
                        isSelected
                          ? 'text-teal-950 dark:text-teal-200'
                          : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {item.title}
                    </p>
                    {item.linkedAnalysisLabel && (
                      <div className="mt-1.5">
                        <TumorClassBadge label={item.linkedAnalysisLabel} size="sm" />
                      </div>
                    )}
                    <p className="text-[10px] text-slate-400 mt-1 font-mono">
                      {item.messages.length} tin nhắn •{' '}
                      {new Date(item.updatedAt).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSessionToDelete(item);
                    }}
                    aria-label="Xóa hội thoại"
                    className="opacity-70 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* RAG Vector Quick Topics Panel */}
          <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 space-y-2.5 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                Chủ đề Vector RAG & Tra cứu
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-700 dark:text-teal-300 font-semibold">
                1024-dim
              </span>
            </div>
            <div className="space-y-1.5">
              {QUICK_LOOKUP_SHORTCUTS.map((sc, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={sending}
                  onClick={() => handleSendMessage(sc.prompt)}
                  className="w-full text-left p-2.5 rounded-xl bg-slate-50 hover:bg-teal-50/70 dark:bg-slate-800/60 dark:hover:bg-teal-950/30 border border-slate-200/70 dark:border-slate-800 hover:border-teal-500/40 transition-all group"
                >
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-teal-500/15 text-teal-700 dark:text-teal-300">
                      {sc.badge}
                    </span>
                    <FileSearch className="w-3 h-3 text-slate-400 group-hover:text-teal-600 transition-colors" />
                  </div>
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-200 group-hover:text-teal-900 dark:group-hover:text-teal-200 leading-snug">
                    {sc.label}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Emergency Red Flags Box */}
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 space-y-1.5">
            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-bold text-xs">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              Dấu hiệu Cờ đỏ Cấp cứu (115)
            </div>
            <p className="text-[11px] text-rose-900/90 dark:text-rose-200/90 leading-relaxed">
              Nếu xuất hiện <strong>co giật mới khởi phát, đau đầu dữ dội kèm nôn vọt, yếu liệt nửa người, méo miệng hoặc lú lẫn cấp tính</strong>, cần gọi ngay <strong>115</strong>.
            </p>
            <div className="pt-1 flex items-center gap-1.5 text-[11px] font-bold text-rose-700 dark:text-rose-300">
              <PhoneCall className="w-3.5 h-3.5" />
              Đường dây Cấp cứu Y tế: 115
            </div>
          </div>
        </div>

        {/* Right Main Chat Area */}
        <div className="lg:col-span-8 xl:col-span-9 flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden min-h-[640px] max-h-[780px]">
          {/* Active Session Header Bar */}
          <div className="px-5 py-3.5 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <Bot className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {activeSession?.title || 'Trợ lý AI Y tế NeuroScan'}
                  </h3>
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    RAG Vector Ready
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                   Đối chiếu nguồn WHO CNS5, ACR Appropriateness Criteria & Cơ sở dữ liệu D1
                </p>
              </div>
            </div>

            {linkedAnalysis && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/50 border border-teal-500/30 text-xs">
                <span className="text-slate-600 dark:text-slate-300 font-medium">
                  Đang gắn với ca: <strong className="font-mono">{linkedAnalysis.sessionCode}</strong>
                </span>
                <TumorClassBadge label={linkedAnalysis.predictedLabel} size="sm" />
                <Link
                  to={`/mri-results/${linkedAnalysis.id}`}
                  className="text-teal-600 dark:text-teal-400 font-semibold hover:underline ml-1"
                >
                  Xem ca
                </Link>
              </div>
            )}
          </div>

          {/* Messages Scroll Area */}
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50/30 dark:bg-slate-950/20"
          >
            {activeSession?.messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}

            {sending && (
              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 p-3 rounded-xl bg-slate-100/70 dark:bg-slate-800/50 w-fit">
                <span className="w-2 h-2 rounded-full bg-teal-500 animate-ping" />
                Đang truy xuất Vector Embeddings (@cf/baai/bge-m3) & tổng hợp câu trả lời y khoa...
              </div>
            )}
          </div>

          {/* Suggested Prompts + Input Form */}
          <div className="p-4 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-teal-500" />
                Câu hỏi gợi ý theo ngữ cảnh (nhấn để hỏi nhanh):
              </p>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.slice(0, 4).map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={sending}
                    onClick={() => handleSendMessage(q)}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 hover:bg-teal-50 hover:text-teal-700 dark:bg-slate-800 dark:hover:bg-teal-950/50 dark:hover:text-teal-300 text-slate-700 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700/80 transition-colors text-left"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2.5"
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={sending}
                placeholder="Nhập câu hỏi y khoa, chuỗi xung MRI, hoặc mã ca chụp (VD: NS-2026-0001, BN-2026-002)..."
                className="flex-1 px-4 py-3 rounded-xl text-sm bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button
                type="submit"
                disabled={sending || !inputValue.trim()}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white shadow-sm transition-all cursor-pointer shrink-0"
              >
                <Send className="w-4 h-4" />
                Gửi
              </button>
            </form>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(sessionToDelete)}
        title="Xác nhận xóa cuộc hội thoại?"
        description={`Bạn sắp xóa cuộc hội thoại "${sessionToDelete?.title || ''}". Lịch sử tin nhắn trong phiên này sẽ bị xóa khỏi danh sách.`}
        confirmLabel="Xóa hội thoại"
        variant="danger"
        onCancel={() => setSessionToDelete(null)}
        onConfirm={handleConfirmDeleteSession}
      />
    </div>
  );
};
