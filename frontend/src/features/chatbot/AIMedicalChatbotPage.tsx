import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  MessageSquarePlus,
  Trash2,
  Send,
  Bot,
  Sparkles,
  ShieldAlert,
  RotateCcw,
  ScanLine,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { ChatMessage } from '@/components/medical/ChatMessage';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { TUMOR_LABEL_METADATA } from '@/constants/medicalLabels';
import { neuroscanAdapter } from '@/services/api/neuroscanAdapter';
import { formatDateVN, formatPercent } from '@/utils/formatters';
import type { ChatSessionRecord, MRIAnalysisRecord } from '@/types/domain';

const QUICK_SUGGESTED_QUESTIONS = [
  'U não Glioma là gì?',
  'MRI não được sử dụng để làm gì?',
  'Meningioma khác gì Glioma?',
  'Những triệu chứng nào cần đi khám?',
  'Cần chuẩn bị gì trước khi khám chuyên khoa?',
];

const DOCTOR_SUGGESTED_QUESTIONS = [
  'Tiêu chuẩn phân loại WHO CNS5 cho Glioma?',
  'Dấu hiệu Dural Tail Sign trong chẩn đoán Meningioma?',
  'Phân biệt Adenoma tuyến yên và Craniopharyngioma?',
  'Bản đồ chú ý nơ-ron Grad-CAM trong phân loại u não?',
  'Quy trình tiền xử lý ảnh MRI: Otsu Bounding Box & CLAHE?',
];
const MAX_RENDERED_MESSAGES = 100;

export const AIMedicalChatbotPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [sessions, setSessions] = useState<ChatSessionRecord[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [linkedAnalysis, setLinkedAnalysis] = useState<MRIAnalysisRecord | null>(null);

  const [inputValue, setInputValue] = useState('');
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [initialLoadError, setInitialLoadError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isDeletingSession, setIsDeletingSession] = useState(false);
  const [lastFailedQuestion, setLastFailedQuestion] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const lastLoadedKeyRef = useRef<string | null>(null);
  const loadRequestRef = useRef(0);
  const createInFlightRef = useRef(false);
  const deleteInFlightRef = useRef(false);
  const sendInFlightRef = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChatbotState = useCallback(async () => {
    if (!user) return;
    const loadKey = `${user.id}|${searchParams.toString()}`;
    const requestId = ++loadRequestRef.current;
    const paramsSnapshot = new URLSearchParams(searchParams);
    const isCurrentLoad = () =>
      requestId === loadRequestRef.current && lastLoadedKeyRef.current === loadKey;
    setIsInitialLoading(true);
    setInitialLoadError(null);
    try {
      const analysisIdParam = paramsSnapshot.get('analysisId');
      const promptParam = paramsSnapshot.get('prompt');

      let contextAnalysis: MRIAnalysisRecord | null = null;
      setLinkedAnalysis(null);
      if (analysisIdParam) {
        try {
          contextAnalysis = await neuroscanAdapter.getAnalysisById(analysisIdParam);
          if (!isCurrentLoad()) return;
          setLinkedAnalysis(contextAnalysis);
        } catch {
          contextAnalysis = null;
        }
      }

      const existingSessions = await neuroscanAdapter.getChatSessions(user.id);
      if (!isCurrentLoad()) return;

      if (contextAnalysis) {
        // Kiểm tra hoặc tạo phiên gắn với MRI result
        const foundLinked = existingSessions.find(
          (s) => s.linkedAnalysisId === contextAnalysis?.id,
        );
        if (foundLinked) {
          setSessions(existingSessions);
          setActiveSessionId(foundLinked.id);
        } else {
          const created = await neuroscanAdapter.createChatSession(user.id, contextAnalysis);
          const refreshed = await neuroscanAdapter.getChatSessions(user.id);
          if (!isCurrentLoad()) return;
          setSessions(refreshed);
          setActiveSessionId(created.id);
        }
      } else if (existingSessions.length > 0) {
        setSessions(existingSessions);
        setActiveSessionId(existingSessions[0].id);
      } else {
        const created = await neuroscanAdapter.createChatSession(user.id, null);
        if (!isCurrentLoad()) return;
        setSessions([created]);
        setActiveSessionId(created.id);
      }

      if (promptParam) {
        if (!isCurrentLoad()) return;
        setInputValue(promptParam);
        // Xóa query param prompt sau khi đã điền vào ô nhập
        const nextSearchParams = new URLSearchParams(paramsSnapshot);
        nextSearchParams.delete('prompt');
        setSearchParams(nextSearchParams, { replace: true });
      }
    } catch (err) {
      if (!isCurrentLoad()) return;
      setInitialLoadError(
        err instanceof Error
          ? err.message
          : 'Không thể khởi tạo Trợ lý AI. Vui lòng thử lại.',
      );
    } finally {
      if (isCurrentLoad()) setIsInitialLoading(false);
    }
  }, [user, searchParams, setSearchParams]);

  useEffect(() => {
    const loadKey = `${user?.id ?? 'anonymous'}|${searchParams.toString()}`;
    if (lastLoadedKeyRef.current === loadKey) return;
    lastLoadedKeyRef.current = loadKey;
    void loadChatbotState();
  }, [loadChatbotState, searchParams, user?.id]);

  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? sessions[0] ?? null;
  const isChatBusy = isTyping || isCreatingSession || isDeletingSession;

  useEffect(() => {
    scrollToBottom();
  }, [activeSession?.messages.length, isTyping]);

  const handleCreateNewSession = async () => {
    if (!user || createInFlightRef.current || sendInFlightRef.current || deleteInFlightRef.current) return;
    createInFlightRef.current = true;
    setIsCreatingSession(true);
    try {
      const activeLinkedAnalysis =
        activeSession?.linkedAnalysisId === linkedAnalysis?.id ? linkedAnalysis : null;
      const created = await neuroscanAdapter.createChatSession(user.id, activeLinkedAnalysis);
      const updated = await neuroscanAdapter.getChatSessions(user.id);
      setSessions(updated);
      setActiveSessionId(created.id);
      setSendError(null);
      showToast({
        variant: 'info',
        title: 'Đã tạo cuộc hội thoại mới',
      });
    } catch (err) {
      showToast({
        variant: 'error',
        title: 'Không thể tạo hội thoại mới',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      createInFlightRef.current = false;
      setIsCreatingSession(false);
    }
  };

  const handleConfirmDeleteSession = async () => {
    if (
      !sessionToDelete ||
      !user ||
      deleteInFlightRef.current ||
      sendInFlightRef.current ||
      createInFlightRef.current
    ) return;
    deleteInFlightRef.current = true;
    setIsDeletingSession(true);
    try {
      await neuroscanAdapter.deleteChatSession(sessionToDelete);
      const remaining = await neuroscanAdapter.getChatSessions(user.id);
      if (remaining.length === 0) {
        const fresh = await neuroscanAdapter.createChatSession(user.id, null);
        setSessions([fresh]);
        setActiveSessionId(fresh.id);
      } else {
        setSessions(remaining);
        if (activeSessionId === sessionToDelete) {
          setActiveSessionId(remaining[0].id);
        }
      }
      setSessionToDelete(null);
      showToast({
        variant: 'info',
        title: 'Đã xóa cuộc hội thoại',
      });
    } catch (err) {
      showToast({
        variant: 'error',
        title: 'Lỗi khi xóa hội thoại',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      deleteInFlightRef.current = false;
      setIsDeletingSession(false);
    }
  };

  const handleSendQuestion = async (questionText: string) => {
    const trimmed = questionText.trim();
    if (
      !trimmed ||
      !activeSession ||
      !user ||
      sendInFlightRef.current ||
      createInFlightRef.current ||
      deleteInFlightRef.current
    ) return;

    const targetSessionId = activeSession.id;
    const targetUserId = user.id;
    sendInFlightRef.current = true;

    setInputValue('');
    setSendError(null);
    setLastFailedQuestion(null);
    setIsTyping(true);

    try {
      await neuroscanAdapter.sendChatMessage(targetSessionId, trimmed);
      const updatedList = await neuroscanAdapter.getChatSessions(targetUserId);
      setSessions(updatedList);
    } catch (err) {
      setLastFailedQuestion(trimmed);
      setSendError(
        err instanceof Error
          ? err.message
          : 'Không thể nhận phản hồi từ dịch vụ Trợ lý AI.',
      );
    } finally {
      sendInFlightRef.current = false;
      setIsTyping(false);
    }
  };

  // Phân nhóm hội thoại theo ngày
  const groupedSessions = sessions.reduce<Record<string, ChatSessionRecord[]>>((acc, sess) => {
    const dateGroup = `Ngày ${formatDateVN(sess.updatedAt)}`;
    if (!acc[dateGroup]) acc[dateGroup] = [];
    acc[dateGroup].push(sess);
    return acc;
  }, {});

  if (isInitialLoading) {
    return (
      <LoadingState
        title="Đang khởi tạo Trợ lý AI Y tế..."
        description="Đang tải kho câu hỏi FAQ đã kiểm duyệt và lịch sử hội thoại."
      />
    );
  }

  if (initialLoadError) {
    return <ErrorState message={initialLoadError} onRetry={() => void loadChatbotState()} />;
  }

  return (
    <div className="space-y-4">
      {/* Permanent Top Disclaimer Banner */}
      <div
        role="note"
        className="rounded-2xl border border-amber-500/35 bg-amber-50/90 dark:bg-amber-950/30 px-4 py-3 flex items-center justify-between gap-3 text-xs sm:text-sm text-amber-950 dark:text-amber-200"
      >
        <div className="flex items-center gap-2.5">
          <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="font-semibold">
            Trợ lý AI chỉ cung cấp thông tin tham khảo và không thay thế tư vấn, chẩn đoán hoặc
            điều trị từ bác sĩ.
          </span>
        </div>
        <span className="hidden md:inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/20 border border-amber-500/30 shrink-0">
          FAQ / RAG Có Kiểm duyệt
        </span>
      </div>

      {/* Main Chat Layout: Left Session List Sidebar + Right Chat Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Sidebar danh sách hội thoại (4 cols on lg) */}
        <div className="lg:col-span-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-card flex flex-col justify-between gap-4 max-h-[680px]">
          <div className="space-y-4 overflow-y-auto pr-1">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Danh sách hội thoại
              </h2>
              <button
                type="button"
                disabled={isChatBusy}
                onClick={handleCreateNewSession}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-navy-800 hover:bg-navy-900 dark:bg-teal-600 dark:hover:bg-teal-500 text-white transition-colors"
              >
                <MessageSquarePlus className="w-3.5 h-3.5" />
                <span>Tạo mới</span>
              </button>
            </div>

            {Object.entries(groupedSessions).map(([dateLabel, groupItems]) => (
              <div key={dateLabel} className="space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 px-2">
                  {dateLabel}
                </div>
                {groupItems.map((sess) => {
                  const isCurrent = sess.id === activeSession?.id;
                  return (
                    <div
                      key={sess.id}
                      className={`group flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-xs transition-colors ${
                        isCurrent
                          ? 'bg-teal-500/15 text-teal-900 dark:text-teal-200 border border-teal-500/30 font-semibold'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <button
                        type="button"
                        disabled={isChatBusy}
                        onClick={() => setActiveSessionId(sess.id)}
                        aria-current={isCurrent ? 'true' : undefined}
                        className="min-w-0 flex-1 text-left disabled:cursor-not-allowed"
                      >
                        <p className="truncate">{sess.title}</p>
                        {sess.linkedAnalysisSessionCode && (
                          <span className="inline-block mt-0.5 text-[10px] font-mono text-teal-600 dark:text-teal-400">
                            Ngữ cảnh: {sess.linkedAnalysisSessionCode} ({sess.linkedAnalysisLabel})
                          </span>
                        )}
                      </button>
                      <button
                        type="button"
                        disabled={isChatBusy}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSessionToDelete(sess.id);
                        }}
                        aria-label="Xóa hội thoại"
                        className="opacity-70 group-hover:opacity-100 p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-500/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Emergency Rule Test Card */}
          <div className="p-3.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/25 border border-rose-500/30 space-y-2 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-rose-800 dark:text-rose-300">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Quy tắc An toàn Cấp cứu Y tế</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Nếu phát hiện triệu chứng cấp cứu (co giật, bất tỉnh, liệt nửa người đột ngột),
              chatbot sẽ ngừng tư vấn thông thường và ưu tiên hướng dẫn gọi cấp cứu 115.
            </p>
            <button
              type="button"
              onClick={() =>
                void handleSendQuestion(
                  'Người nhà bị co giật và đau đầu dữ dội đột ngột thì phải làm sao?',
                )
              }
              disabled={isChatBusy}
              className="w-full py-1.5 px-2.5 rounded-lg font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors"
            >
              Thử tình huống cảnh báo cấp cứu
            </button>
          </div>
        </div>

        {/* Main Chat Area (8 cols on lg) */}
        <div className="lg:col-span-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card flex flex-col h-[680px] overflow-hidden">
          {/* Chat Header */}
          <div className="px-5 py-3.5 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-slate-50/70 dark:bg-slate-900">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-teal-500/15 text-teal-700 dark:text-teal-300 flex items-center justify-center border border-teal-500/30">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                  {user?.role === 'DOCTOR'
                    ? 'Trợ lý AI Y tế Lâm sàng (Hỗ trợ Bác sĩ)'
                    : 'Trợ lý AI Y tế'}
                </h1>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {user?.role === 'DOCTOR'
                    ? 'Tham vấn lâm sàng, tiêu chuẩn WHO CNS5 & quy trình Computer Vision'
                    : 'Trả lời từ bộ FAQ JSON đã kiểm duyệt • Có dẫn nguồn tổ chức y tế'}
                </p>
              </div>
            </div>

            {activeSession && (
              <button
                type="button"
                disabled={isChatBusy}
                onClick={() => setSessionToDelete(activeSession.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-rose-500/25"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa hội thoại</span>
              </button>
            )}
          </div>

          {/* Optional MRI Result Context Card */}
          {linkedAnalysis && activeSession?.linkedAnalysisId === linkedAnalysis.id && (
            <div className="mx-4 mt-3 p-3.5 rounded-2xl bg-teal-50/80 dark:bg-teal-950/30 border border-teal-500/30 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <ScanLine className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                <div>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    Đang gắn ngữ cảnh phiên MRI: {linkedAnalysis.sessionCode}
                  </span>
                  <span className="ml-2 px-2 py-0.5 rounded font-bold bg-white dark:bg-slate-800 border border-teal-500/30 text-teal-700 dark:text-teal-300">
                    Nhãn: {linkedAnalysis.predictedLabel} (
                    {formatPercent(linkedAnalysis.confidenceScore)})
                  </span>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                    {TUMOR_LABEL_METADATA[linkedAnalysis.predictedLabel].vietnameseTitle} • Chatbot
                    không tự suy luận vượt quá dữ liệu mô hình.
                  </p>
                </div>
              </div>
              <Link
                to={`/mri-results/${linkedAnalysis.id}`}
                className="font-semibold text-teal-700 dark:text-teal-300 underline shrink-0"
              >
                Xem lại ảnh MRI
              </Link>
            </div>
          )}

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {activeSession?.messages.slice(-MAX_RENDERED_MESSAGES).map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}

            {isTyping && (
              <div className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400 pl-2">
                <div className="w-8 h-8 rounded-xl bg-teal-500/15 text-teal-600 flex items-center justify-center">
                  <Bot className="w-4 h-4 animate-pulse" />
                </div>
                <span>Trợ lý AI đang tra cứu bản ghi FAQ đã kiểm duyệt...</span>
              </div>
            )}

            {sendError && (
              <div
                role="alert"
                className="p-4 rounded-2xl border border-rose-500/30 bg-rose-50/90 dark:bg-rose-950/30 text-xs text-rose-900 dark:text-rose-200 flex items-center justify-between gap-3"
              >
                <span>{sendError}</span>
                {lastFailedQuestion && (
                  <button
                    type="button"
                    onClick={() => void handleSendQuestion(lastFailedQuestion)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl font-semibold bg-rose-600 text-white hover:bg-rose-700 shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Thử lại</span>
                  </button>
                )}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggested Questions Bar */}
          <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-teal-500" />
              <span>Câu hỏi gợi ý đã kiểm duyệt nguồn (Nhấn để gửi ngay):</span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {(user?.role === 'DOCTOR' ? DOCTOR_SUGGESTED_QUESTIONS : QUICK_SUGGESTED_QUESTIONS).map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={isChatBusy}
                  onClick={() => void handleSendQuestion(q)}
                  className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium bg-white dark:bg-slate-800 hover:bg-teal-500/15 hover:text-teal-700 dark:hover:text-teal-300 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Fixed Bottom Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSendQuestion(inputValue);
            }}
            className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2.5"
          >
            <input
              type="text"
              value={inputValue}
              maxLength={2000}
              disabled={isChatBusy}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Nhập câu hỏi về u não, thuật ngữ MRI hoặc hướng dẫn chuẩn bị khám..."
              aria-label="Nhập câu hỏi cho Trợ lý AI Y tế"
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isChatBusy}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-navy-800 hover:bg-navy-900 dark:bg-teal-600 dark:hover:bg-teal-500 text-white disabled:opacity-40 transition-colors shrink-0"
            >
              <Send className="w-4 h-4" />
              <span>Gửi</span>
            </button>
          </form>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(sessionToDelete)}
        title="Xác nhận xóa cuộc hội thoại"
        description="Bạn có chắc chắn muốn xóa cuộc hội thoại này khỏi phiên làm việc hiện tại không?"
        confirmLabel="Xóa hội thoại"
        isLoading={isDeletingSession}
        onConfirm={handleConfirmDeleteSession}
        onCancel={() => {
          if (!isDeletingSession) setSessionToDelete(null);
        }}
      />
    </div>
  );
};
