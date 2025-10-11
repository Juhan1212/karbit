-- Insert default plans with detailed features and limitations
INSERT INTO plans (name, description, price, period, features, limitations, is_popular) VALUES
(
  'Free', 
  '무료로 시작하는 기본 서비스',
  0,
  '영구 무료',
  ARRAY[
    '호가창 반영 실시간 환율 테이블',
    '코인별 실시간 환율 차트',
    '수동매매 일일 1회 가능'
  ],
  ARRAY[
    '자동매매 불가능',
    'API 연동 불가',
    '수동매매 일일 1회 가능'
  ],
  false
),
(
  'Starter', 
  '자동매매를 시작하는 분들을 위한 최적의 플랜',
  29000,
  '월',
  ARRAY[
    'Free 플랜 모든 기능',
    '수동매매 횟수 무제한',
    '자동매매 포지션 진입',
    '실시간 거래 차트 모니터링',
    '대시보드 기본 성과 리포트',
    '텔레그램 알림'
  ],
  ARRAY[
    'AI 전략 사용 불가',
    '자동매매 포지션 진입 일일 10회 가능',
    '텔레그램 알림 횟수 일일 30회 가능'
  ],
  true
),
(
  'Premium', 
  '모든 기능을 자유롭게 이용할 수 있는 프리미엄 플랜',
  99000,
  '월',
  ARRAY[
    'Starter 플랜 모든 기능',
    'AI 기반 자동매매 전략 사용가능',
    '자동매매 포지션 진입 무제한',
    '텔레그램 알림 횟수 무제한',
    '실시간 AI 시세 예측',
    '우선 고객 지원'
  ],
  ARRAY[]::text[],
  false
)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  period = EXCLUDED.period,
  features = EXCLUDED.features,
  limitations = EXCLUDED.limitations,
  is_popular = EXCLUDED.is_popular;
