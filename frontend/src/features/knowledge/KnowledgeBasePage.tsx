import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search,
  BookOpen,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Tag,
  ShieldCheck,
  FileJson,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { SourceCard } from '@/components/medical/SourceCard';
import { MedicalDisclaimer } from '@/components/medical/MedicalDisclaimer';
import { KNOWLEDGE_CATEGORIES } from '@/constants/medicalLabels';
import { neuroscanAdapter } from '@/services/api/neuroscanAdapter';
import { formatDateVN, normalizeSearchText } from '@/utils/formatters';
import type { KnowledgeArticle, KnowledgeCategoryKey } from '@/types/domain';

export const KnowledgeBasePage: React.FC = () => {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<KnowledgeCategoryKey | 'ALL'>('ALL');
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);

  const loadArticles = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      // Chỉ lấy bài viết đã duyệt (verified) theo đúng quy định "Các bài viết chưa duyệt không được hiển thị như đã xuất bản"
      const published = await neuroscanAdapter.getKnowledgeArticles(false);
      setArticles(published);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Không thể tải danh sách bài viết y khoa.',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadArticles();
  }, [loadArticles]);

  const filteredArticles = useMemo(() => {
    return articles.filter((art) => {
      // Bảo vệ kép: Không bao giờ hiển thị bài chưa duyệt như bài đã xuất bản
      if (art.reviewStatus !== 'verified') return false;
      const matchesCat =
        selectedCategory === 'ALL' || art.category === selectedCategory;
      const q = normalizeSearchText(searchQuery);
      if (!q) return matchesCat;
      const matchesText =
        normalizeSearchText(art.title).includes(q) ||
        normalizeSearchText(art.summary).includes(q) ||
        art.keywords.some((kw) => normalizeSearchText(kw).includes(q));
      return matchesCat && matchesText;
    });
  }, [articles, selectedCategory, searchQuery]);

  const activeArticle = useMemo(
    () => articles.find((a) => a.id === selectedArticleId) ?? null,
    [articles, selectedArticleId],
  );

  if (isLoading) {
    return (
      <LoadingState
        title="Đang tải Thư viện Kiến thức Y khoa..."
        description="Đang đồng bộ 7 nhóm chủ đề đã được xác minh nguồn."
      />
    );
  }

  if (errorMsg) {
    return <ErrorState message={errorMsg} onRetry={loadArticles} />;
  }

  // DETAIL VIEW
  if (activeArticle) {
    const categoryMeta = KNOWLEDGE_CATEGORIES.find((c) => c.key === activeArticle.category);
    const relatedList = articles.filter((a) =>
      activeArticle.relatedArticleIds.includes(a.id),
    );

    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => setSelectedArticleId(null)}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-teal-600 dark:text-teal-400 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại danh sách 7 nhóm kiến thức</span>
        </button>

        <article className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-card space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-4">
            <div className="flex flex-wrap items-center gap-2">
              {categoryMeta && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/15 text-teal-800 dark:text-teal-300 border border-teal-500/30">
                  Nhóm {categoryMeta.number}: {categoryMeta.label}
                </span>
              )}
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Trạng thái: Đã kiểm duyệt (Verified)
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {activeArticle.readingTimeMinutes} phút đọc
              </span>
              <span>•</span>
              <span>Xác minh ngày: {formatDateVN(activeArticle.source.lastVerified)}</span>
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white leading-tight">
              {activeArticle.title}
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              {activeArticle.summary}
            </p>
          </div>

          <div className="space-y-6 pt-2">
            {activeArticle.sections.map((sec, idx) => (
              <section key={idx} className="space-y-2.5">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  {sec.heading}
                </h2>
                <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
                  {sec.body}
                </p>
                {sec.bulletPoints && (
                  <ul className="space-y-2 pl-2 pt-1">
                    {sec.bulletPoints.map((pt, bIdx) => (
                      <li
                        key={bIdx}
                        className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-300"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-2 shrink-0" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>

          {/* Clinical Takeaway */}
          <div className="p-4 rounded-2xl bg-teal-50/80 dark:bg-teal-950/30 border border-teal-500/30 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-teal-950 dark:text-teal-200">
              <strong>Điểm cốt lõi cần nhớ:</strong> {activeArticle.clinicalTakeaway}
            </div>
          </div>

          {/* Keywords */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="text-xs font-semibold text-slate-500 inline-flex items-center gap-1">
              <Tag className="w-3.5 h-3.5" /> Từ khóa:
            </span>
            {activeArticle.keywords.map((kw) => (
              <span
                key={kw}
                className="px-2.5 py-0.5 rounded-lg text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              >
                {kw}
              </span>
            ))}
          </div>

          {/* Source Metadata Card */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Metadata Nguồn Tài Liệu Tham Khảo
            </h3>
            <SourceCard source={activeArticle.source} />
          </div>
        </article>

        {/* Related Articles */}
        {relatedList.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Bài viết liên quan cùng chủ đề
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {relatedList.map((rel) => (
                <button
                  key={rel.id}
                  type="button"
                  onClick={() => setSelectedArticleId(rel.id)}
                  className="text-left rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:border-teal-500/60 transition-all space-y-1.5"
                >
                  <div className="text-xs font-semibold text-teal-600 dark:text-teal-400">
                    {rel.source.organization} • Xác minh {formatDateVN(rel.source.lastVerified)}
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {rel.title}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                    {rel.summary}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        <MedicalDisclaimer />
      </div>
    );
  }

  // LIST VIEW
  return (
    <div className="space-y-6">
      <PageHeader
        badgeText="Thư viện Kiến thức Y khoa • 7 Nhóm Dữ liệu Chuẩn hóa"
        title="Kho kiến thức y khoa & Giải thích kết quả AI"
        description="Tổ chức theo 7 nhóm chủ đề trong tài liệu thiết kế dữ liệu. Chỉ hiển thị các bài viết đã qua kiểm duyệt (review_status = verified) và có nguồn xác minh rõ ràng."
      />

      {/* Search & Governance Banner */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-card space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo từ khóa: Glioma, Meningioma, đau đầu, CLAHE, confidence score, chuẩn bị khám..."
              aria-label="Tìm kiếm bài viết kiến thức y khoa"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 shrink-0">
            <FileJson className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>
              Đang hiển thị <strong>{filteredArticles.length}</strong> bài viết đã kiểm duyệt (1 bản
              thảo <code>pending</code> đã được ẩn tự động)
            </span>
          </div>
        </div>

        {/* 7 Category Filter Tabs */}
        <div
          role="tablist"
          aria-label="Lọc theo 7 nhóm kiến thức y khoa"
          className="flex flex-wrap items-center gap-2 pt-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={selectedCategory === 'ALL'}
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              selectedCategory === 'ALL'
                ? 'bg-navy-800 text-white dark:bg-teal-600'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Tất cả (7 nhóm)
          </button>

          {KNOWLEDGE_CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              type="button"
              role="tab"
              aria-selected={selectedCategory === cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                selectedCategory === cat.key
                  ? 'bg-navy-800 text-white dark:bg-teal-600'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {cat.number}. {cat.shortLabel}
            </button>
          ))}
        </div>
      </div>

      {/* Category Overview Cards when ALL selected and no search query */}
      {selectedCategory === 'ALL' && !searchQuery.trim() && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {KNOWLEDGE_CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setSelectedCategory(cat.key)}
              className="text-left rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:border-teal-500/60 transition-all space-y-1.5"
            >
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-mono font-bold text-teal-600 dark:text-teal-400">
                  Nhóm {cat.number}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {cat.priority}
                </span>
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                {cat.label}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                {cat.description}
              </p>
            </button>
          ))}
        </div>
      )}

      {/* Articles Grid */}
      {filteredArticles.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="w-6 h-6" />}
          title="Không tìm thấy bài viết phù hợp"
          description="Thử từ khóa khác hoặc chọn lại bộ lọc nhóm chủ đề."
          action={
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('ALL');
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700"
            >
              Xóa bộ lọc tìm kiếm
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredArticles.map((art) => {
            const catMeta = KNOWLEDGE_CATEGORIES.find((c) => c.key === art.category);
            return (
              <div
                key={art.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-card flex flex-col justify-between gap-4 hover:border-teal-500/50 transition-all"
              >
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    {catMeta && (
                      <span className="px-2.5 py-0.5 rounded-lg font-semibold bg-teal-500/10 text-teal-800 dark:text-teal-300 border border-teal-500/25">
                        {catMeta.number}. {catMeta.shortLabel}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Đã xác minh ({formatDateVN(art.source.lastVerified)})
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug">
                    {art.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {art.summary}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-500 dark:text-slate-400 truncate">
                    Nguồn: <strong>{art.source.organization}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedArticleId(art.id)}
                    className="px-3.5 py-1.5 rounded-xl font-semibold bg-slate-100 hover:bg-teal-600 hover:text-white dark:bg-slate-800 dark:hover:bg-teal-600 text-slate-800 dark:text-slate-200 transition-colors shrink-0"
                  >
                    Đọc chi tiết
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <MedicalDisclaimer />
    </div>
  );
};
