import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Trash2,
  Eye,
  ScanLine,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ImageOff,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { MedicalDisclaimer } from '@/components/medical/MedicalDisclaimer';
import {
  DOCTOR_REVIEW_STATUS_META,
  TUMOR_LABEL_METADATA,
} from '@/constants/medicalLabels';
import { neuroscanAdapter } from '@/services/api/neuroscanAdapter';
import { formatDateTimeVN, formatPercent, normalizeSearchText } from '@/utils/formatters';
import type { MRIAnalysisRecord, TumorLabel } from '@/types/domain';

const PAGE_SIZE = 4;

export const AnalysisHistoryPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [analyses, setAnalyses] = useState<MRIAnalysisRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [labelFilter, setLabelFilter] = useState<TumorLabel | 'ALL'>('ALL');
  const [originFilter, setOriginFilter] = useState<'ALL' | 'DOCTOR' | 'USER' | 'REVIEWED'>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [recordToDelete, setRecordToDelete] = useState<MRIAnalysisRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const loadRequestRef = useRef(0);

  const loadHistory = useCallback(async () => {
    if (!user) return;
    const requestId = ++loadRequestRef.current;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const list = await neuroscanAdapter.getUserAnalyses(user.id);
      if (requestId !== loadRequestRef.current) return;
      setAnalyses(list);
    } catch (err) {
      if (requestId !== loadRequestRef.current) return;
      setErrorMsg(
        err instanceof Error ? err.message : 'Không thể tải lịch sử phân tích.',
      );
    } finally {
      if (requestId === loadRequestRef.current) setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadHistory();
    return () => {
      loadRequestRef.current += 1;
    };
  }, [loadHistory]);

  const dateRangeInvalid = Boolean(dateFrom && dateTo && dateFrom > dateTo);

  const filteredList = useMemo(() => {
    if (dateRangeInvalid) return [];
    return analyses.filter((item) => {
      if (originFilter === 'DOCTOR' && item.uploadedByRole !== 'DOCTOR') {
        return false;
      }
      if (originFilter === 'USER' && item.uploadedByRole === 'DOCTOR') {
        return false;
      }
      if (originFilter === 'REVIEWED' && !item.doctorReview) {
        return false;
      }
      if (labelFilter !== 'ALL' && item.predictedLabel !== labelFilter) {
        return false;
      }
      const q = normalizeSearchText(searchQuery);
      if (
        q &&
        !normalizeSearchText(item.sessionCode).includes(q) &&
        !normalizeSearchText(item.sanitizedFileName).includes(q) &&
        !normalizeSearchText(item.predictedLabel).includes(q)
      ) {
        return false;
      }
      if (dateFrom) {
        const fromTime = new Date(`${dateFrom}T00:00:00`).getTime();
        if (new Date(item.createdAt).getTime() < fromTime) return false;
      }
      if (dateTo) {
        const toTime = new Date(`${dateTo}T23:59:59`).getTime();
        if (new Date(item.createdAt).getTime() > toTime) return false;
      }
      return true;
    });
  }, [analyses, originFilter, labelFilter, searchQuery, dateFrom, dateTo, dateRangeInvalid]);

  const totalPages = Math.max(1, Math.ceil(filteredList.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedItems = filteredList.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const handleConfirmDelete = async () => {
    if (!recordToDelete || !user) return;
    setIsDeleting(true);
    try {
      await neuroscanAdapter.deleteAnalysis(recordToDelete.id, user.id);
      const nextAnalyses = analyses.filter((a) => a.id !== recordToDelete.id);
      setAnalyses(nextAnalyses);
      const nextTotalPages = Math.max(1, Math.ceil(nextAnalyses.length / PAGE_SIZE));
      setCurrentPage((page) => Math.min(page, nextTotalPages));
      showToast({
        variant: 'success',
        title: `Đã xóa phiên phân tích ${recordToDelete.sessionCode}`,
      });
      setRecordToDelete(null);
    } catch (err) {
      showToast({
        variant: 'error',
        title: 'Xóa phiên thất bại',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <LoadingState
        title="Đang tải lịch sử phiên phân tích..."
        description="Dữ liệu chỉ lưu trong bộ nhớ phiên làm việc hiện tại."
      />
    );
  }

  if (errorMsg) {
    return <ErrorState message={errorMsg} onRetry={loadHistory} />;
  }

  const allowThumbnail = user?.preferences.saveHistoryConsent !== false;

  return (
    <div className="space-y-6">
      <PageHeader
        badgeText="Lịch sử Phiên Phân tích • Bảo mật Phiên"
        title="Lịch sử phân tích ảnh MRI của bạn"
        description="Tra cứu, lọc theo 4 nhãn và khoảng thời gian, xem trạng thái phản hồi từ Bác sĩ hoặc xóa dữ liệu khỏi phiên làm việc."
        actions={
          <Link
            to="/mri-analysis"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-navy-800 hover:bg-navy-900 dark:bg-teal-600 dark:hover:bg-teal-500 text-white transition-colors"
          >
            <ScanLine className="w-4 h-4" />
            <span>Tạo phân tích mới</span>
          </Link>
        }
      />

      {/* Filter Bar */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-card grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5 items-end">
        <div className="lg:col-span-3 space-y-1">
          <label
            htmlFor="history-search"
            className="block text-xs font-semibold text-slate-600 dark:text-slate-400"
          >
            Tìm theo mã phiên hoặc tên file
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="history-search"
              type="search"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Ví dụ: NS-2026-1001..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        <div className="lg:col-span-3 space-y-1">
          <label
            htmlFor="history-origin-filter"
            className="block text-xs font-semibold text-slate-600 dark:text-slate-400"
          >
            Nguồn ảnh & Trạng thái Bác sĩ
          </label>
          <select
            id="history-origin-filter"
            value={originFilter}
            onChange={(e) => {
              setOriginFilter(e.target.value as 'ALL' | 'DOCTOR' | 'USER' | 'REVIEWED');
              setCurrentPage(1);
            }}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
          >
            <option value="ALL">Tất cả nguồn tải</option>
            <option value="DOCTOR">Ảnh do Bác sĩ tải lên (CV Lab)</option>
            <option value="USER">Ảnh do Tôi tự phân tích</option>
            <option value="REVIEWED">Đã có nhận xét của Bác sĩ</option>
          </select>
        </div>

        <div className="lg:col-span-2 space-y-1">
          <label
            htmlFor="history-label-filter"
            className="block text-xs font-semibold text-slate-600 dark:text-slate-400"
          >
            Lọc theo nhãn AI
          </label>
          <select
            id="history-label-filter"
            value={labelFilter}
            onChange={(e) => {
              setLabelFilter(e.target.value as TumorLabel | 'ALL');
              setCurrentPage(1);
            }}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="ALL">Tất cả 4 nhãn</option>
            <option value="Glioma">Glioma</option>
            <option value="Meningioma">Meningioma</option>
            <option value="Pituitary">Pituitary</option>
            <option value="No Tumor">No Tumor</option>
          </select>
        </div>

        <div className="lg:col-span-2 space-y-1">
          <label
            htmlFor="history-date-from"
            className="block text-xs font-semibold text-slate-600 dark:text-slate-400"
          >
            Từ ngày
          </label>
          <div className="relative">
            <input
              id="history-date-from"
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              aria-invalid={dateRangeInvalid}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        <div className="lg:col-span-1 space-y-1">
          <label
            htmlFor="history-date-to"
            className="block text-xs font-semibold text-slate-600 dark:text-slate-400"
          >
            Đến ngày
          </label>
          <input
            id="history-date-to"
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            aria-invalid={dateRangeInvalid}
            onChange={(e) => {
              setDateTo(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="lg:col-span-1">
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setLabelFilter('ALL');
              setOriginFilter('ALL');
              setDateFrom('');
              setDateTo('');
              setCurrentPage(1);
            }}
            className="w-full py-2 px-2.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Xóa lọc
          </button>
        </div>
      </div>

      {dateRangeInvalid && (
        <div
          role="alert"
          className="rounded-xl border border-rose-500/30 bg-rose-50 dark:bg-rose-950/30 px-4 py-3 text-xs text-rose-800 dark:text-rose-200"
        >
          Khoảng ngày không hợp lệ: “Từ ngày” phải sớm hơn hoặc bằng “Đến ngày”.
        </div>
      )}

      {/* Results Table / Cards */}
      {filteredList.length === 0 ? (
        <EmptyState
          icon={<Calendar className="w-6 h-6" />}
          title="Không có phiên phân tích nào khớp điều kiện"
          description="Hãy điều chỉnh bộ lọc hoặc tải lên một ảnh MRI mẫu mới để kiểm thử."
          action={
            <Link
              to="/mri-analysis"
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700"
            >
              Phân tích ảnh MRI mới
            </Link>
          }
        />
      ) : (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  <th className="py-3.5 px-4 font-semibold">Ảnh thu nhỏ</th>
                  <th className="py-3.5 px-4 font-semibold">Mã phiên & File ẩn danh</th>
                  <th className="py-3.5 px-4 font-semibold">Thời gian</th>
                  <th className="py-3.5 px-4 font-semibold">Nhãn dự đoán (AI)</th>
                  <th className="py-3.5 px-4 font-semibold">Confidence</th>
                  <th className="py-3.5 px-4 font-semibold">Trạng thái Bác sĩ</th>
                  <th className="py-3.5 px-4 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                {paginatedItems.map((item) => {
                  const labelMeta = TUMOR_LABEL_METADATA[item.predictedLabel];
                  const reviewMeta = DOCTOR_REVIEW_STATUS_META[item.reviewStatus];

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        {allowThumbnail ? (
                          <img
                            src={item.imageUrl}
                            alt={`Thumbnail ${item.sessionCode}`}
                            className="w-12 h-12 rounded-xl object-cover border border-slate-700 bg-slate-950"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                            <ImageOff className="w-4 h-4" />
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                          {item.sessionCode}
                        </div>
                        <div className="text-xs font-mono text-slate-500 truncate max-w-[180px]">
                          {item.sanitizedFileName}
                        </div>
                        {item.uploadedByRole === 'DOCTOR' && (
                          <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                            BS tải lên (CV Lab)
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                        {formatDateTimeVN(item.createdAt)}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold border ${labelMeta.badgeColorClass}`}
                        >
                          {item.predictedLabel}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-semibold">
                        {formatPercent(item.confidenceScore)}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${reviewMeta.badgeClass}`}
                        >
                          {reviewMeta.label}
                        </span>
                        {item.doctorReview && (
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            BS. {item.doctorReview.doctorName}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center justify-end gap-2">
                          <Link
                            to={`/mri-results/${item.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-teal-600 hover:text-white dark:bg-slate-800 dark:hover:bg-teal-600 text-slate-800 dark:text-slate-200 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Xem chi tiết</span>
                          </Link>

                          <button
                            type="button"
                            onClick={() => setRecordToDelete(item)}
                            aria-label={`Xóa phiên ${item.sessionCode}`}
                            className="p-1.5 rounded-xl border border-rose-500/25 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Bar */}
          <div className="px-4 py-3 bg-slate-50/70 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
            <span>
              Hiển thị {(safePage - 1) * PAGE_SIZE + 1}–
              {Math.min(safePage * PAGE_SIZE, filteredList.length)} trên tổng số{' '}
              <strong>{filteredList.length}</strong> phiên (DEMO)
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                aria-label="Trang trước"
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-semibold text-slate-900 dark:text-slate-100">
                Trang {safePage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Trang sau"
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(recordToDelete)}
        title="Xác nhận xóa bản ghi phân tích MRI"
        description={
          recordToDelete
            ? `Bạn có chắc chắn muốn xóa phiên phân tích "${recordToDelete.sessionCode}" (${recordToDelete.sanitizedFileName}) khỏi bộ nhớ phiên hiện tại không? Nếu có cuộc hội thoại AI đang gắn với phiên này, cuộc hội thoại đó cũng sẽ bị xóa. Hành động này không thể hoàn tác.`
            : ''
        }
        confirmLabel="Xóa vĩnh viễn"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setRecordToDelete(null)}
      />

      <MedicalDisclaimer compact />
    </div>
  );
};
