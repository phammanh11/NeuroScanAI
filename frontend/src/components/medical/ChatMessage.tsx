import React from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Database,
  ExternalLink,
  FileSearch,
  Info,
  ShieldAlert,
  User,
} from 'lucide-react';
import type { ChatMessageRecord } from '../../types/domain';
import { TumorClassBadge } from './TumorClassBadge';
import { useAuth } from '../../app/providers/AuthProvider';

interface ChatMessageProps {
  message: ChatMessageRecord;
}

/**
 * Bộ parser định dạng Markdown y khoa an toàn sang JSX (không dùng dangerouslySetInnerHTML):
 * Hỗ trợ: **in đậm**, *in nghiêng*, `code`, tiêu đề ###, và danh sách gạch đầu dòng (• / -).
 */
function renderFormattedInline(text: string): React.ReactNode[] {
  const tokens = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*\n]+\*)/g);
  return tokens.map((token, idx) => {
    if (token.startsWith('**') && token.endsWith('**') && token.length > 4) {
      return (
        <strong key={idx} className="font-semibold text-slate-900 dark:text-white">
          {token.slice(2, -2)}
        </strong>
      );
    }
    if (token.startsWith('`') && token.endsWith('`') && token.length > 2) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 rounded bg-teal-50 dark:bg-slate-800 font-mono text-[11px] font-semibold text-teal-700 dark:text-teal-300 border border-teal-200/60 dark:border-slate-700"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    if (token.startsWith('*') && token.endsWith('*') && token.length > 2) {
      return (
        <em key={idx} className="italic text-slate-700 dark:text-slate-300">
          {token.slice(1, -1)}
        </em>
      );
    }
    return <React.Fragment key={idx}>{token}</React.Fragment>;
  });
}

function renderFormattedMedicalContent(content: string): React.ReactNode {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let listBuffer: string[] = [];

  const flushList = (keyPrefix: string) => {
    if (listBuffer.length === 0) return;
    elements.push(
      <ul key={`${keyPrefix}-ul`} className="space-y-1.5 my-2 pl-4 list-disc marker:text-teal-500">
        {listBuffer.map((item, idx) => (
          <li key={idx} className="leading-relaxed">
            {renderFormattedInline(item)}
          </li>
        ))}
      </ul>
    );
    listBuffer = [];
  };

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line) {
      flushList(`line-${index}`);
      return;
    }

    if (line.startsWith('### ')) {
      flushList(`line-${index}`);
      elements.push(
        <h4
          key={`h4-${index}`}
          className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 mt-3 mb-1"
        >
          {renderFormattedInline(line.replace(/^###\s+/, ''))}
        </h4>
      );
      return;
    }

    if (line.startsWith('- ') || line.startsWith('• ')) {
      listBuffer.push(line.slice(2).trim());
      return;
    }

    flushList(`line-${index}`);
    elements.push(
      <p key={`p-${index}`} className="leading-relaxed my-1.5 first:mt-0 last:mb-0">
        {renderFormattedInline(line)}
      </p>
    );
  });

  flushList('final');
  return elements;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const { user } = useAuth();
  const isDoctor =
    user?.role === 'DOCTOR' ||
    user?.role === 'doctor' ||
    user?.role === 'ADMIN' ||
    user?.role === 'admin';
  const isUser = message.sender === 'user';
  const isEmergency = message.urgency === 'emergency';

  if (isUser) {
    return (
      <div className="flex justify-end items-start gap-3">
        <div className="max-w-2xl rounded-2xl rounded-tr-sm px-4 py-3 bg-teal-600 text-white shadow-sm">
          <p className="text-sm whitespace-pre-line leading-relaxed">{message.content}</p>
          <span className="block text-[10px] text-teal-100/80 mt-1.5 text-right font-mono">
            {new Date(message.createdAt).toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
        <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0">
          <User className="w-4 h-4" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start items-start gap-3">
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
          isEmergency
            ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800'
            : 'bg-slate-900 dark:bg-teal-950 text-teal-400 border-slate-700 dark:border-teal-800'
        }`}
      >
        {isEmergency ? <ShieldAlert className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      <div
        className={`max-w-2xl w-full rounded-2xl rounded-tl-sm p-4 border shadow-xs ${
          isEmergency
            ? 'bg-rose-50/90 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800/80 text-rose-950 dark:text-rose-100'
            : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-slate-200'
        }`}
      >
        {/* Header Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-2.5 pb-2 border-b border-slate-200/70 dark:border-slate-800/80">
          <span className="text-xs font-bold text-slate-900 dark:text-white">
            Trợ lý AI Y tế NeuroScan
          </span>

          {isEmergency && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-600 text-white">
              <AlertTriangle className="w-3 h-3" />
              CẢNH BÁO CẤP CỨU Y KHOA (RED FLAGS)
            </span>
          )}

          {message.urgency === 'prompt_evaluation' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
              Cần thăm khám chuyên khoa sớm
            </span>
          )}

          {message.linkedAnalysisLabel && <TumorClassBadge label={message.linkedAnalysisLabel} size="sm" />}

          {message.isOutOfScope && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <Info className="w-3 h-3" />
              Giới hạn phạm vi an toàn y khoa
            </span>
          )}
        </div>

        {/* Body Content */}
        <div className="text-sm leading-relaxed">
          {renderFormattedMedicalContent(message.content)}
        </div>

        {/* Matched MRI Scan / Clinical Case Cards (Interactive Lookup Cards) */}
        {message.matchedScans && message.matchedScans.length > 0 && (
          <div className="mt-3.5 pt-3 border-t border-slate-200/70 dark:border-slate-800 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 flex items-center gap-1.5">
              <FileSearch className="w-3.5 h-3.5" />
              Hồ sơ Ca chụp MRI truy xuất từ Cloudflare D1 ({message.matchedScans.length})
            </p>
            <div className="grid grid-cols-1 gap-2">
              {message.matchedScans.map((scan) => {
                const detailLink = isDoctor
                  ? `/doctor/cases/${scan.id}`
                  : `/mri-results/${scan.id}`;
                return (
                  <div
                    key={scan.id}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 hover:border-teal-500/50 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={scan.imageUrl}
                        alt={scan.sessionCode}
                        className="w-12 h-12 rounded-lg object-cover bg-slate-950 border border-slate-700 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                            {scan.sessionCode}
                          </span>
                          {scan.patientCode && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                              {scan.patientCode}
                            </span>
                          )}
                          <TumorClassBadge label={scan.predictedLabel} size="sm" />
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 truncate mt-0.5">
                          BN: <strong className="font-semibold">{scan.patientName}</strong> • Độ tự tin:{' '}
                          <strong className="font-mono text-teal-700 dark:text-teal-300">
                            {(scan.confidence * 100).toFixed(1)}%
                          </strong>
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {scan.reviewStatus} ({scan.doctorName})
                        </p>
                      </div>
                    </div>
                    <Link
                      to={detailLink}
                      className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white transition-colors"
                    >
                      Mở ca chụp
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* RAG Vector DB Trace Badge (Collapsible like CoffeeChatbot) */}
        {message.ragTrace && message.ragTrace.topChunks && message.ragTrace.topChunks.length > 0 && (
          <details className="mt-3 pt-2.5 border-t border-slate-200/70 dark:border-slate-800 group text-[11px] text-slate-500 dark:text-slate-400">
            <summary className="cursor-pointer list-none inline-flex items-center gap-1.5 font-medium text-teal-700 dark:text-teal-400 hover:text-teal-600 dark:hover:text-teal-300 select-none">
              <Database className="w-3.5 h-3.5" />
              <span>
                RAG Vector ({message.ragTrace.topChunks.length}/{message.ragTrace.totalChunksIndexed} chunks •{' '}
                {message.ragTrace.llmModel.split('/').pop()})
              </span>
            </summary>
            <div className="mt-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500 dark:text-slate-400 pb-1 border-b border-slate-200/60 dark:border-slate-800">
                <span>Embedding: <strong className="font-mono">{message.ragTrace.embeddingModel}</strong></span>
                <span>Store: <strong className="font-mono">{message.ragTrace.vectorBackend}</strong></span>
              </div>
              {message.ragTrace.topChunks.map((chunk) => {
                const rawScore = chunk.score ?? chunk.similarity ?? 0.85;
                return (
                  <div key={String(chunk.id)} className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="truncate text-slate-700 dark:text-slate-300">• {chunk.title}</span>
                    <span className="shrink-0 font-mono text-[10px] px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-700 dark:text-teal-300 font-semibold border border-teal-500/20">
                      {Math.round(rawScore * 100)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </details>
        )}

        {/* Grounded Sources Citation */}
        {message.sources && message.sources.length > 0 && (
          <div className="mt-3 pt-2.5 border-t border-slate-200/70 dark:border-slate-800">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
              Nguồn tài liệu y khoa tham chiếu (Grounded Sources)
            </p>
            <div className="flex flex-wrap gap-2">
              {message.sources.map((src, idx) => (
                <a
                  key={idx}
                  href={src.url || 'https://radiopaedia.org'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 hover:bg-teal-50 dark:bg-slate-800 dark:hover:bg-teal-950/50 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="font-bold">{src.organization}:</span>
                  <span className="truncate max-w-xs">{src.title}</span>
                  <ExternalLink className="w-3 h-3 opacity-60 shrink-0" />
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500">
          <span>Chỉ phục vụ giáo dục sức khỏe & tham khảo — Không thay thế bác sĩ khám trực tiếp</span>
          <span className="font-mono">
            {new Date(message.createdAt).toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      </div>
    </div>
  );
};
