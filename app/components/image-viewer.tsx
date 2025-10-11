import { useState, useRef, useEffect } from "react";
import { X, ZoomIn, ZoomOut, RotateCw } from "lucide-react";

interface ImageViewerProps {
  src: string;
  alt: string;
  className?: string;
}

export function ImageViewer({ src, alt, className = "" }: ImageViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const imageRef = useRef<HTMLDivElement>(null);

  // 모달 열기
  const openModal = () => {
    setIsOpen(true);
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
  };

  // 모달 닫기
  const closeModal = () => {
    setIsOpen(false);
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
  };

  // 확대
  const zoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 5));
  };

  // 축소
  const zoomOut = () => {
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  };

  // 회전
  const rotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // 드래그 시작
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    }
  };

  // 드래그 중
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  // 드래그 종료
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 터치 시작
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && scale > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      });
    }
  };

  // 터치 이동
  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && e.touches.length === 1 && scale > 1) {
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    }
  };

  // 터치 종료
  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // 휠로 확대/축소
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      zoomIn();
    } else {
      zoomOut();
    }
  };

  // ESC 키로 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        closeModal();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  return (
    <>
      {/* 썸네일 이미지 */}
      <div className="cursor-pointer" onClick={openModal}>
        <img
          src={src}
          alt={alt}
          className={`rounded-lg hover:opacity-90 transition-opacity ${className}`}
        />
        <div className="text-xs text-muted-foreground mt-1 text-center">
          클릭하여 확대
        </div>
      </div>

      {/* 이미지 뷰어 모달 */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
          {/* 컨트롤 버튼 */}
          <div className="absolute top-4 right-4 flex gap-2 z-10">
            <button
              onClick={zoomOut}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              title="축소"
            >
              <ZoomOut className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={zoomIn}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              title="확대"
            >
              <ZoomIn className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={rotate}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              title="회전"
            >
              <RotateCw className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={closeModal}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              title="닫기"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* 확대/축소 정보 */}
          <div className="absolute top-4 left-4 px-3 py-1 bg-white/10 rounded-lg text-white text-sm z-10">
            {Math.round(scale * 100)}%
          </div>

          {/* 이미지 */}
          <div
            ref={imageRef}
            className="w-full h-full flex items-center justify-center overflow-hidden"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
            style={{
              cursor:
                scale > 1 ? (isDragging ? "grabbing" : "grab") : "default",
            }}
          >
            <img
              src={src}
              alt={alt}
              className="max-w-none max-h-none select-none"
              style={{
                transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px) rotate(${rotation}deg)`,
                transition: isDragging ? "none" : "transform 0.2s ease-out",
              }}
              draggable={false}
            />
          </div>

          {/* 사용법 안내 */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm z-10">
            휠 또는 버튼으로 확대/축소 • 드래그로 이동 • ESC로 닫기
          </div>
        </div>
      )}
    </>
  );
}
