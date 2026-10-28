import React, { useEffect, useRef, useState } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  SlidersHorizontal,
  Sparkles,
  Image as ImageIcon,
  Info,
} from 'lucide-react';

interface MRIViewerProps {
  imageUrl: string;
  preprocessedImageUrl: string | null;
  gradcamUrl: string | null;
  sessionCode: string;
  sanitizedFileName: string;
  dimensions?: { width: number; height: number };
  isDemoFixture?: boolean;
}

type ViewTab = 'original' | 'preprocessed' | 'gradcam';
const VIEW_TABS: ViewTab[] = ['original', 'preprocessed', 'gradcam'];

export const MRIViewer: React.FC<MRIViewerProps> = ({
  imageUrl,
  preprocessedImageUrl,
  gradcamUrl,
  sessionCode,
  sanitizedFileName,
  dimensions,
  isDemoFixture = true,
}) => {
  const [activeTab, setActiveTab] = useState<ViewTab>('original');
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [imageErrors, setImageErrors] = useState({ original: false, preprocessed: false, gradcam: false });
  const tabRefs = useRef<Record<ViewTab, HTMLButtonElement | null>>({
    original: null,
    preprocessed: null,
    gradcam: null,
  });

  useEffect(() => {
    setImageErrors({ original: false, preprocessed: false, gradcam: false });
  }, [imageUrl, preprocessedImageUrl, gradcamUrl]);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => {
    setZoom((z) => {
      const next = Math.max(z - 0.25, 0.75);
      if (next <= 1) setPan({ x: 0, y: 0 });
      return next;
    });
  };
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };
  const handleFitScreen = () => {
    setZoom(1.05);
    setPan({ x: 0, y: 0 });
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (zoom <= 1) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setIsDragging(false);
  };
  const canTransformImage = activeTab === 'original';

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, tab: ViewTab) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const currentIndex = VIEW_TABS.indexOf(tab);
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? VIEW_TABS.length - 1
          : (currentIndex + (event.key === 'ArrowRight' ? 1 : -1) + VIEW_TABS.length) %
            VIEW_TABS.length;
    const nextTab = VIEW_TABS[nextIndex];
    setActiveTab(nextTab);
    tabRefs.current[nextTab]?.focus();
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-950 text-slate-100 overflow-hidden shadow-card">
      {/* Top Viewer Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-slate-900/90 border-b border-slate-800">
        <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Chế độ xem ảnh MRI">
          <button
            ref={(element) => {
              tabRefs.current.original = element;
            }}
            type="button"
            role="tab"
            id="mri-tab-original"
            aria-controls="mri-panel-original"
            aria-selected={activeTab === 'original'}
            tabIndex={activeTab === 'original' ? 0 : -1}
            onKeyDown={(event) => handleTabKeyDown(event, 'original')}
            onClick={() => setActiveTab('original')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              activeTab === 'original'
                ? 'bg-teal-600 text-white'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            Ảnh gốc (Original)
          </button>

          <button
            ref={(element) => {
              tabRefs.current.preprocessed = element;
            }}
            type="button"
            role="tab"
            id="mri-tab-preprocessed"
            aria-controls="mri-panel-preprocessed"
            aria-selected={activeTab === 'preprocessed'}
            tabIndex={activeTab === 'preprocessed' ? 0 : -1}
            onKeyDown={(event) => handleTabKeyDown(event, 'preprocessed')}
            onClick={() => setActiveTab('preprocessed')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              activeTab === 'preprocessed'
                ? 'bg-teal-600 text-white'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            So sánh Tiền xử lý
            {preprocessedImageUrl ? (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300">
                Có sẵn
              </span>
            ) : (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-700 text-slate-400">
                Chưa có
              </span>
            )}
          </button>

          <button
            ref={(element) => {
              tabRefs.current.gradcam = element;
            }}
            type="button"
            role="tab"
            id="mri-tab-gradcam"
            aria-controls="mri-panel-gradcam"
            aria-selected={activeTab === 'gradcam'}
            tabIndex={activeTab === 'gradcam' ? 0 : -1}
            onKeyDown={(event) => handleTabKeyDown(event, 'gradcam')}
            onClick={() => setActiveTab('gradcam')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              activeTab === 'gradcam'
                ? 'bg-teal-600 text-white'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Grad-CAM Heatmap
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-xl border border-slate-700/70">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={!canTransformImage}
            aria-label="Thu nhỏ ảnh MRI"
            title="Thu nhỏ"
            className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="px-2 text-xs font-mono text-slate-200 min-w-[3.2rem] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={!canTransformImage}
            aria-label="Phóng to ảnh MRI"
            title="Phóng to"
            className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleFitScreen}
            disabled={!canTransformImage}
            aria-label="Vừa khung nhìn"
            title="Vừa khung nhìn"
            className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={!canTransformImage}
            aria-label="Đặt lại tỷ lệ phóng"
            title="Đặt lại (Reset)"
            className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Viewport */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={(event) => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
            setIsDragging(false);
          }
        }}
        style={{ touchAction: zoom > 1 ? 'none' : 'auto' }}
        className={`relative min-h-[340px] sm:min-h-[420px] flex items-center justify-center bg-[#060911] overflow-hidden select-none ${
          zoom > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
        }`}
      >
        {/* Corner HUD overlays */}
        <div className="absolute top-3 left-3 z-10 pointer-events-none space-y-1 font-mono text-[11px] text-slate-300 bg-slate-900/75 px-2.5 py-1.5 rounded-lg border border-slate-800">
          <div>PHIÊN: {sessionCode}</div>
          <div>FILE: {sanitizedFileName}</div>
          {dimensions && (
            <div>
              KÍCH THƯỚC: {dimensions.width} × {dimensions.height} px
            </div>
          )}
        </div>

        {isDemoFixture && (
          <div className="absolute top-3 right-3 z-10 pointer-events-none">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              ẢNH & KẾT QUẢ MINH HỌA (DEMO)
            </span>
          </div>
        )}

        {activeTab === 'original' && (
          <div id="mri-panel-original" role="tabpanel" aria-labelledby="mri-tab-original">
          {imageErrors.original ? (
            <div className="max-w-md p-6 text-center text-sm text-rose-300">
              Không thể hiển thị ảnh gốc của phiên này.
            </div>
          ) : (
          <img
            src={imageUrl}
            alt={`Ảnh MRI phiên ${sessionCode}`}
            onError={() => setImageErrors((errors) => ({ ...errors, original: true }))}
            draggable={false}
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transition: isDragging ? 'none' : 'transform 150ms ease-out',
            }}
            className="max-h-[380px] sm:max-h-[440px] w-auto object-contain rounded-lg"
          />
          )}
          </div>
        )}

        {activeTab === 'preprocessed' && (
          <div id="mri-panel-preprocessed" role="tabpanel" aria-labelledby="mri-tab-preprocessed">
          <>
            {preprocessedImageUrl ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 w-full max-w-3xl items-center">
                <div className="flex flex-col items-center bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  <span className="text-xs font-medium text-slate-300 mb-2">
                    1. Ảnh trước tiền xử lý (Original)
                  </span>
                  {imageErrors.original ? (
                    <span className="text-xs text-rose-300 py-8">Không thể hiển thị ảnh gốc.</span>
                  ) : (
                    <img
                      src={imageUrl}
                      alt="Ảnh MRI trước tiền xử lý"
                      onError={() => setImageErrors((errors) => ({ ...errors, original: true }))}
                      className="max-h-[260px] w-auto object-contain rounded-lg"
                    />
                  )}
                </div>
                <div className="flex flex-col items-center bg-slate-900/60 p-3 rounded-xl border border-teal-500/30">
                  <span className="text-xs font-medium text-teal-300 mb-2">
                    2. ROI Cropping + CLAHE + Z-score (Minh họa)
                  </span>
                  {imageErrors.preprocessed ? (
                    <span className="text-xs text-rose-300 py-8">
                      Không thể hiển thị ảnh tiền xử lý.
                    </span>
                  ) : (
                    <img
                      src={preprocessedImageUrl}
                      alt="Ảnh MRI sau tiền xử lý cắt hộp sọ ROI và CLAHE"
                      onError={() => setImageErrors((errors) => ({ ...errors, preprocessed: true }))}
                      className="max-h-[260px] w-auto object-contain rounded-lg"
                    />
                  )}
                </div>
              </div>
            ) : (
              <div className="max-w-md mx-auto p-6 text-center space-y-2">
                <div className="w-11 h-11 rounded-2xl bg-slate-800 text-slate-300 flex items-center justify-center mx-auto">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-semibold text-slate-100">
                  Chưa có ảnh tiền xử lý từ dịch vụ AI cho phiên này
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Tính năng so sánh Original / Preprocessed (Brain Contour ROI Cropping & CLAHE) chỉ
                  hiển thị khi Backend AI Service thực sự trả về ảnh đã qua pipeline xử lý.
                </p>
              </div>
            )}
          </>
          </div>
        )}

        {activeTab === 'gradcam' && (
          <div id="mri-panel-gradcam" role="tabpanel" aria-labelledby="mri-tab-gradcam">
          <>
            {gradcamUrl ? (
              imageErrors.gradcam ? (
                <div className="max-w-md p-6 text-center text-sm text-rose-300">
                  Không thể hiển thị bản đồ Grad-CAM của phiên này.
                </div>
              ) : (
              <img
                src={gradcamUrl}
                alt="Bản đồ nhiệt Grad-CAM"
                onError={() => setImageErrors((errors) => ({ ...errors, gradcam: true }))}
                className="max-h-[380px] sm:max-h-[440px] w-auto object-contain rounded-lg"
              />
              )
            ) : (
              <div className="max-w-lg mx-auto p-6 text-center space-y-3 bg-slate-900/80 rounded-2xl border border-slate-800 m-4">
                <div className="w-12 h-12 rounded-2xl bg-teal-500/15 text-teal-300 flex items-center justify-center mx-auto">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Tính năng đang phát triển — Chờ AI Service xuất Grad-CAM thực
                </div>
                <h4 className="text-base font-semibold text-white">
                  Chưa có dữ liệu bản đồ nhiệt Giải thích AI (Explainable AI - Grad-CAM)
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Theo quy tắc an toàn y tế của <strong>NeuroScan AI</strong>, hệ thống{' '}
                  <strong>tuyệt đối không tự vẽ bản đồ nhiệt giả lập</strong> trên trình duyệt để
                  tránh gây hiểu lầm về vùng tổn thương. Bản đồ nhiệt sẽ tự động hiển thị tại đây
                  khi Backend PyTorch cung cấp trường <code>gradcamUrl</code> từ tầng tích chập cuối.
                </p>
              </div>
            )}
          </>
          </div>
        )}
      </div>

      {/* Bottom Viewer Hint Bar */}
      <div className="px-4 py-2.5 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-teal-400 shrink-0" />
          <span>
            Mẹo: Nhấn nút phóng to (&gt;100%) và giữ chuột kéo để di chuyển (pan) vùng quan sát.
          </span>
        </div>
        <span>Tỷ lệ khung hình gốc được bảo toàn (1:1)</span>
      </div>
    </div>
  );
};
