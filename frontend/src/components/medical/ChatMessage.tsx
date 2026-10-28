import React, { useState } from 'react';
import { Bot, User, Copy, Check, AlertTriangle } from 'lucide-react';
import { SourceCard } from '@/components/medical/SourceCard';
import { formatDateTimeVN } from '@/utils/formatters';
import type { ChatMessageRecord } from '@/types/domain';

interface ChatMessageProps {
  message: ChatMessageRecord;
}

/**
 * Safe Markdown renderer (không sử dụng dangerouslySetInnerHTML để ngăn ngừa XSS).
 * Hỗ trợ tiêu đề ###, danh sách gạch đầu dòng, in đậm **text** và inline code `code`.
 */
function renderSafeFormattedText(text: string): React.ReactNode {
  const lines = text.split('\n');

  const formatInline = (line: string): React.ReactNode[] => {
    const tokens = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    return tokens.map((token, idx) => {
      if (token.startsWith('**') && token.endsWith('**')) {
        return (
          <strong key={idx} className="font-semibold text-slate-900 dark:text-slate-100">
            {token.slice(2, -2)}
          </strong>
        );
      }
      if (token.startsWith('`') && token.endsWith('`')) {
        return (
          <code
            key={idx}
            className="px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 font-mono text-xs text-teal-700 dark:text-teal-300"
          >
            {token.slice(1, -1)}
          </code>
        );
      }
      return token;
    });
  };

  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {lines.map((rawLine, index) => {
        const line = rawLine.trim();
        if (!line) return <div key={index} className="h-1" />;

        if (line.startsWith('### ')) {
          return (
            <h4
              key={index}
              className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 pt-1"
            >
              {line.replace('### ', '')}
            </h4>
          );
        }

        if (line.startsWith('- ')) {
          return (
            <div key={index} className="flex items-start gap-2 pl-1">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-2 shrink-0" />
              <span>{formatInline(line.slice(2))}</span>
            </div>
          );
        }

        if (/^\d+\.\s/.test(line)) {
          return (
            <div key={index} className="pl-1 font-medium">
              {formatInline(line)}
            </div>
          );
        }

        return <p key={index}>{formatInline(line)}</p>;
      })}
    </div>
  );
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const [copied, setCopied] = useState(false);
  const isUser = message.sender === 'user';
  const isEmergency = message.urgency === 'emergency';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard failure in restricted contexts
    }
  };

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div
        className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${
          isUser
            ? 'bg-navy-800 text-white dark:bg-teal-600'
            : isEmergency
              ? 'bg-rose-600 text-white'
              : 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30'
        }`}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-5 h-5" />}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-4 space-y-3 ${
          isUser
            ? 'bg-navy-800 text-white dark:bg-teal-700 rounded-tr-xs'
            : isEmergency
              ? 'bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-500/50 text-rose-950 dark:text-rose-100 rounded-tl-xs'
              : 'bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-slate-700 dark:text-slate-200 rounded-tl-xs shadow-soft'
        }`}
      >
        {!isUser && isEmergency && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-600 text-white">
            <AlertTriangle className="w-3.5 h-3.5" />
            HƯỚNG DẪN KHẨN CẤP Y TẾ — ƯU TIÊN GỌI 115
          </div>
        )}

        {!isUser && message.isDemoIllustration && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
            Phản hồi minh họa giới hạn phạm vi Demo FAQ
          </div>
        )}

        {isUser ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        ) : (
          renderSafeFormattedText(message.content)
        )}

        {/* Sources */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="pt-2 space-y-2 border-t border-slate-200/70 dark:border-slate-800">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Nguồn tài liệu tham khảo đã xác minh:
            </p>
            {message.sources.map((src, idx) => (
              <SourceCard key={idx} source={src} compact />
            ))}
          </div>
        )}

        {/* Footer with timestamp & copy action */}
        <div
          className={`flex items-center justify-between gap-3 pt-1 text-[11px] ${
            isUser ? 'text-slate-300' : 'text-slate-400 dark:text-slate-500'
          }`}
        >
          <span>{formatDateTimeVN(message.createdAt)}</span>
          {!isUser && (
            <button
              type="button"
              onClick={handleCopy}
              aria-label="Sao chép câu trả lời"
              className="inline-flex items-center gap-1 text-slate-500 hover:text-teal-600 dark:text-slate-400 dark:hover:text-teal-300 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Đã chép</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Sao chép</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
