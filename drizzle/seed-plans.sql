-- Insert default plans with detailed features and limitations
INSERT INTO plans (name, description, price, period, features, limitations, is_popular) VALUES
(
  'Free', 
  '무료로 시작하는 기본 서비스',
  0,
  '영구 무료',
  ARRAY[
    '실시간 환율 차트',
    '환율 테이블 조회',
    'XRP 기본 모니터링',
    '기본 알림'
  ],
  ARRAY[
    '자동매매 불가능',
    'API 연동 불가',
    '고급 차트 기능 제한'
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
    '거래소 API 연동',
    '자동매매 기본 전략',
    '시드 설정 (최대 5천만원)',
    '실시간 거래 모니터링',
    '기본 성과 리포트',
    '이메일 알림'
  ],
  ARRAY[
    'AI 전략 사용 불가',
    '백테스트 기능 제한',
    '다계정 운용 불가'
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
    'AI 기반 전략 추천',
    '무제한 시드 설정',
    '고급 백테스트',
    '포트폴리오 리밸런싱',
    '웹훅 & 텔레그램 알림',
    '다계정 전략 운용',
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
