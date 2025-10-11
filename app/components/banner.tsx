import React from "react";
import { Card } from "./card";
import { Button } from "./button";
import { X } from "lucide-react";

interface AdBannerProps {
  type?: "horizontal" | "vertical" | "square";
  className?: string;
  closable?: boolean;
  onClose?: () => void;
}

export function AdBanner({
  type = "horizontal",
  className = "",
  closable = false,
  onClose,
}: AdBannerProps) {
  const [isVisible, setIsVisible] = React.useState(true);

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  if (!isVisible) return null;

  const getAdContent = () => {
    switch (type) {
      case "horizontal":
        return {
          title: "바이낸스 거래소",
          subtitle: "세계 1위 암호화폐 거래소에서 거래하세요",
          cta: "가입하기",
          image: "crypto trading platform",
          height: "h-20",
          layout: "flex-row",
        };
      case "vertical":
        return {
          title: "바이낸스 거래소",
          subtitle: "수수료 20% 할인 혜택",
          cta: "가입하기",
          image: "cryptocurrency exchange",
          height: "h-32",
          layout: "flex-col",
        };
      case "square":
        return {
          title: "OKX 거래소",
          subtitle: "수수료 할인 혜택",
          cta: "바로가기",
          image: "cryptocurrency exchange",
          height: "h-28",
          layout: "flex-col",
        };
      default:
        return {
          title: "광고",
          subtitle: "여기에 광고가 표시됩니다",
          cta: "자세히",
          image: "advertisement",
          height: "h-20",
          layout: "flex-row",
        };
    }
  };

  const adContent = getAdContent();

  return (
    <Card
      className={`relative overflow-hidden border-2 border-dashed border-primary/20 bg-gradient-to-r from-primary/5 to-transparent ${className}`}
    >
      {closable && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 h-6 w-6 p-0 z-10"
          onClick={handleClose}
        >
          <X className="h-3 w-3" />
        </Button>
      )}

      <div
        className={`p-3 ${adContent.height} flex ${adContent.layout} ${adContent.layout === "flex-col" ? "justify-center text-center" : "items-center"} gap-3`}
      >
        {adContent.layout === "flex-col" ? (
          <>
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
                <span className="text-base">📊</span>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-xs mb-1">{adContent.title}</h3>
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                {adContent.subtitle}
              </p>
            </div>

            <Button size="sm" className="flex-shrink-0 text-xs h-7">
              {adContent.cta}
            </Button>
          </>
        ) : (
          <>
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <span className="text-lg">📊</span>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm truncate">
                {adContent.title}
              </h3>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {adContent.subtitle}
              </p>
            </div>

            <Button size="sm" className="flex-shrink-0">
              {adContent.cta}
            </Button>
          </>
        )}
      </div>

      <div className="absolute bottom-1 right-2 text-xs text-muted-foreground/50">
        AD
      </div>
    </Card>
  );
}
