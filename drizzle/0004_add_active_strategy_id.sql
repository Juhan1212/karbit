-- 1:1 관계 설정을 위한 스키마 변경
-- users 테이블에 activeStrategyId 추가
ALTER TABLE "users" ADD COLUMN "activeStrategyId" integer;

-- strategies 테이블에서 userId 제거
ALTER TABLE "strategies" DROP COLUMN "userId";

-- 기존 레거시 필드 제거
ALTER TABLE "strategies" DROP COLUMN IF EXISTS "seed";
ALTER TABLE "strategies" DROP COLUMN IF EXISTS "entryPremium";
ALTER TABLE "strategies" DROP COLUMN IF EXISTS "exitPremium";

-- 외래키 제약 조건 추가
ALTER TABLE "users" ADD CONSTRAINT "users_activeStrategyId_strategies_id_fk" FOREIGN KEY ("activeStrategyId") REFERENCES "strategies"("id") ON DELETE set null ON UPDATE no action;
