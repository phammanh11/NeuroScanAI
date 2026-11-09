import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search,
  BookOpen,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Tag,
  ShieldCheck,
  Plus,
  Trash2,
  Database,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/app/providers/ToastProvider';
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
  const { showToast } = useToast();
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'ARTICLES' | 'FAQ_MANAGEMENT'>('ARTICLES');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<KnowledgeCategoryKey | 'ALL'>('ALL');
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);

  // Quản trị viên quản lý bộ câu hỏi đáp FAQ (FR08)
  const [faqDocs, setFaqDocs] = useState<any[]>([]);
  const [isLoadingFaq, setIsLoadingFaq] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newSource, setNewSource] = useState('WHO CNS5 (2021) Guidelines');
  const [newCategory, setNewCategory] = useState('tumor_types');
  const [isSubmittingFaq, setIsSubmittingFaq] = useState(false);

  const loadArticles = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
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

  const loadFaqDocs = useCallback(async () => {
    setIsLoadingFaq(true);
    try {
      const docs = await neuroscanAdapter.getFaqDocuments();
      setFaqDocs(docs);
    } catch {
      setFaqDocs([]);
    } finally {
      setIsLoadingFaq(false);
    }
  }, []);

  useEffect(() => {
    void loadArticles();
    void loadFaqDocs();
  }, [loadArticles, loadFaqDocs]);

  const handleAddFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) {
      showToast({
        variant: 'warning',
        title: 'Thiếu thông tin',
        description: 'Vui lòng điền đầy đủ tiêu đề và nội dung tài liệu FAQ.',
      });
      return;
    }

    setIsSubmittingFaq(true);
    try {
      await neuroscanAdapter.createFaqDocument({
        title: newTitle.trim(),
        content: newContent.trim(),
        source: newSource.trim(),
        category: newCategory,
      });

      showToast({
        variant: 'success',
        title: 'Đã thêm tài liệu FAQ vào D1 Database',
        description: 'Dữ liệu mới đã sẵn sàng phục vụ Chatbot RAG.',
      });

      setNewTitle('');
      setNewContent('');
      setShowAddModal(false);
      await loadFaqDocs();
    } catch (err) {
      showToast({
        variant: 'error',
        title: 'Thêm tài liệu thất bại',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsSubmittingFaq(false);
    }
  };

  const handleDeleteFaq = async (id: number) => {
    try {
      await neuroscanAdapter.deleteFaqDocument(id);
      showToast({
        variant: 'info',
        title: 'Đã xóa tài liệu FAQ',
      });
      await loadFaqDocs();
    } catch (err) {
      showToast({
        variant: 'error',
        title: 'Xóa thất bại',
      });
    }
  };

  const filteredArticles = useMemo(() => {
    return articles.filter((art) => {
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
        description="Đang đồng bộ cơ sở dữ liệu tri thức y khoa đã được xác minh nguồn."
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
          className="inline-flex items-center gap-2 h-9 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:text-teal-600 dark:hover:text-teal-400 transition-all duration-150 active:scale-98 group"
        >
          <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:text-teal-600 dark:group-hover:text-teal-400 group-hover:-translate-x-0.5 transition-all" />
          <span>Quay lại Thư viện</span>
        </button>

        <article className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-card space-y-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {categoryMeta && (
                <span className="px-3 py-1 rounded-full font-semibold bg-teal-500/10 text-teal-800 dark:text-teal-300 border border-teal-500/30">
                  Nhóm {categoryMeta.number}: {categoryMeta.label}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <Clock className="w-3.5 h-3.5" />
                Thời gian đọc: ~{activeArticle.readingTimeMinutes} phút
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white leading-tight">
              {activeArticle.title}
            </h1>

            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              {activeArticle.summary}
            </p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-teal-50/70 dark:bg-teal-950/25 border border-teal-500/30 space-y-1.5">
            <div className="text-xs font-bold uppercase tracking-wider text-teal-900 dark:text-teal-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>Điểm cốt lõi cho người bệnh & người nhà (Clinical Takeaway)</span>
            </div>
            <p className="text-xs sm:text-sm text-teal-950 dark:text-teal-100 leading-relaxed">
              {activeArticle.clinicalTakeaway}
            </p>
          </div>

          <div className="space-y-6 pt-2">
            {activeArticle.sections.map((sec, idx) => (
              <div key={idx} className="space-y-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span className="text-teal-600 dark:text-teal-400">§{idx + 1}.</span>
                  <span>{sec.heading}</span>
                </h2>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {sec.body}
                </p>
                {sec.bulletPoints && sec.bulletPoints.length > 0 && (
                  <ul className="space-y-1.5 pl-5 list-disc text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                    {sec.bulletPoints.map((bp, bIdx) => (
                      <li key={bIdx}>{bp}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-2">
            {activeArticle.keywords.map((kw, kwIdx) => (
              <span
                key={kwIdx}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                <Tag className="w-3 h-3 text-slate-400" />
                <span>{kw}</span>
              </span>
            ))}
          </div>

          <SourceCard source={activeArticle.source} />

          {relatedList.length > 0 && (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Bài viết liên quan trong cùng chủ đề
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {relatedList.map((rel) => (
                  <button
                    key={rel.id}
                    type="button"
                    onClick={() => setSelectedArticleId(rel.id)}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-left hover:border-teal-500 transition-colors"
                  >
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 line-clamp-1">
                      {rel.title}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                      {rel.summary}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </article>
      </div>
    );
  }

  // LIST VIEW
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          badgeText="Tri thức Y khoa & RAG Dataset • Chuẩn WHO CNS5 2021"
          title="Kho Kiến thức Y tế & Quản lý Bộ FAQ RAG"
          description="Tra cứu tài liệu chuẩn hóa về chẩn đoán MRI não, phân loại 4 lớp u nội sọ và quản trị cơ sở tri thức phục vụ Chatbot."
        />

        {/* Tab Switcher: Thư viện vs Quản trị FAQ (FR08) */}
        <div className="inline-flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0 self-start sm:self-center">
          <button
            type="button"
            onClick={() => setActiveTab('ARTICLES')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'ARTICLES'
                ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Thư viện Y khoa
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('FAQ_MANAGEMENT')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'FAQ_MANAGEMENT'
                ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Quản lý FAQ (FR08)</span>
          </button>
        </div>
      </div>

      {activeTab === 'FAQ_MANAGEMENT' ? (
        /* TAB 2: QUẢN LÝ BỘ CÂU HỎI ĐÁP Y TẾ (FR08 - QUẢN TRỊ VIÊN) */
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-sky-500/30 bg-sky-50/50 dark:bg-sky-950/20">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-sky-950 dark:text-sky-200 flex items-center gap-2">
                <Database className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <span>Bộ dữ liệu câu hỏi đáp Y tế (D1 Database: faq_documents)</span>
              </h2>
              <p className="text-xs text-sky-800 dark:text-sky-300">
                Toàn bộ dữ liệu tại đây được tự động lập chỉ mục Vectorize (@cf/baai/bge-m3) làm nguồn căn cứ tin cậy cho Trợ lý AI.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white transition-all shadow-sm shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm tài liệu FAQ mới</span>
            </button>
          </div>

          {/* Form Modal Thêm mới FAQ */}
          {showAddModal && (
            <form
              onSubmit={handleAddFaq}
              className="p-5 rounded-2xl border-2 border-teal-500/40 bg-white dark:bg-slate-900 shadow-card space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-teal-600" />
                  <span>Thêm tài liệu tri thức FAQ mới (FR08)</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  Đóng
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Tiêu đề tài liệu FAQ
                  </label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="VD: Triệu chứng u tuyến yên chèn ép giao thoa thị giác..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs sm:text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Nguồn tài liệu y khoa đã xác minh
                  </label>
                  <input
                    type="text"
                    value={newSource}
                    onChange={(e) => setNewSource(e.target.value)}
                    placeholder="VD: WHO CNS5 (2021) / NCI Guidelines"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs sm:text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Phân nhóm chủ đề
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs sm:text-sm font-semibold"
                >
                  <option value="tumor_types">Phân loại u não (Glioma, Meningioma, Pituitary, No Tumor)</option>
                  <option value="mri_sequences">Chuỗi xung MRI (T1, T2, FLAIR, T1-Gd)</option>
                  <option value="emergency">Dấu hiệu cờ đỏ cấp cứu thần kinh 115</option>
                  <option value="guidelines">Quy định an toàn & Hướng dẫn y tế</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nội dung chi tiết (Dữ liệu huấn luyện RAG)
                </label>
                <textarea
                  rows={4}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Nhập nội dung kiến thức y khoa chi tiết để mô hình AI trích dẫn căn cứ khi trả lời..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs sm:text-sm leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingFaq}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-50"
                >
                  {isSubmittingFaq ? 'Đang lưu vào D1...' : 'Lưu tài liệu FAQ'}
                </button>
              </div>
            </form>
          )}

          {/* Danh sách FAQ Documents */}
          {isLoadingFaq ? (
            <div className="p-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
              <span>Đang tải danh mục tài liệu FAQ từ D1 Database...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {faqDocs.map((doc: any) => (
                <div
                  key={doc.id}
                  className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card flex flex-col justify-between gap-3 hover:border-sky-500/50 transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="px-2.5 py-0.5 rounded-full font-bold bg-sky-500/10 text-sky-800 dark:text-sky-300 border border-sky-500/25">
                        #{doc.id} • {doc.category}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteFaq(doc.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                        title="Xóa tài liệu FAQ"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                      {doc.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
                      {doc.content}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
                    <span>Nguồn: <strong>{doc.source}</strong></span>
                    <span className="text-teal-600 font-semibold">Đã đồng bộ RAG</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* TAB 1: THƯ VIỆN BÀI VIẾT Y KHOA NGUYÊN BẢN */
        <div className="space-y-6">
          {/* Search & Filter Bar */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-card space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm theo tên bệnh, chuỗi xung MRI, triệu chứng thần kinh, WHO CNS5..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Category Pills */}
            <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedCategory('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  selectedCategory === 'ALL'
                    ? 'bg-teal-600 text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Tất cả nhóm chủ đề
              </button>
              {KNOWLEDGE_CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    selectedCategory === cat.key
                      ? 'bg-teal-600 text-white shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {cat.number}. {cat.shortLabel}
                </button>
              ))}
            </div>
          </div>

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
      )}
    </div>
  );
};
