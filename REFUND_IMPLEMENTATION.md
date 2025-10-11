# 환불 기능 구현 문서

## 개요

사용자가 유료 플랜을 구독한 후 7일 이내에 환불을 요청할 수 있는 기능입니다. 환불 금액은 일할 계산되며, 환불 승인 시 자동으로 Free 플랜으로 다운그레이드됩니다.

## 데이터베이스 스키마

### refunds 테이블

```sql
- id: 환불 요청 ID (자동 증가)
- user_id: 사용자 ID (FK -> users)
- plan_id: 플랜 ID (FK -> plans)
- payment_id: 원본 결제 ID (FK -> payments, nullable)
- refund_amount: 환불 금액 (일할 계산)
- original_amount: 원래 결제 금액
- remaining_days: 환불 시점 남은 일수
- refund_reason: 환불 사유 (필수)
- refund_comment: 추가 의견 (선택)
- status: 환불 상태 (pending, approved, completed, rejected)
- processed_by: 처리한 관리자 ID (FK -> users, nullable)
- processed_at: 처리 완료 시간
- refund_method: 환불 수단 (card, bank_transfer 등)
- refund_transaction_id: 환불 거래 ID
- rejection_reason: 거절 사유 (거절된 경우)
- metadata: JSON 형태의 추가 정보
- created_at: 생성 시간
- updated_at: 수정 시간
```

### 인덱스

- idx_refunds_user: user_id
- idx_refunds_status: status
- idx_refunds_created: created_at

## API 엔드포인트

### POST /api/refund

환불 요청을 생성합니다.

**요청 본문:**

```json
{
  "refundReason": "서비스가 기대에 미치지 못함",
  "refundComment": "추가 의견 (선택)"
}
```

**응답:**

```json
{
  "success": true,
  "message": "환불 요청이 접수되었습니다. 영업일 기준 3-5일 내에 처리됩니다.",
  "data": {
    "id": 1,
    "userId": 123,
    "planId": 2,
    "refundAmount": "19333",
    "originalAmount": "29000",
    "remainingDays": 20,
    "status": "pending",
    ...
  }
}
```

**에러 응답:**

```json
{
  "error": "환불 가능 기간(결제 후 7일)이 지났습니다."
}
```

## 데이터베이스 함수

### `/app/database/refund.ts`

#### 1. `createRefundRequest(refundData)`

환불 요청을 생성합니다.

**파라미터:**

```typescript
{
  userId: number;
  planId: number;
  paymentId?: number;
  refundAmount: number;
  originalAmount: number;
  remainingDays: number;
  refundReason: string;
  refundComment?: string;
}
```

#### 2. `canUserRequestRefund(userId)`

사용자가 환불 가능한지 확인합니다.

**반환값:**

```typescript
{
  canRefund: boolean;
  reason?: string; // 불가능한 경우
  planHistory?: object;
  plan?: object;
  remainingDays?: number;
  refundAmount?: number;
  originalAmount?: number;
}
```

**환불 불가 조건:**

- 활성 플랜이 없는 경우
- Free 플랜인 경우
- 결제 후 7일이 지난 경우
- 이미 처리 중인 환불 요청이 있는 경우

#### 3. `getUserRefunds(userId, limit)`

사용자의 환불 요청 목록을 조회합니다.

#### 4. `getRefundById(refundId)`

특정 환불 요청을 조회합니다.

#### 5. `approveRefund(refundId, processedBy?, refundMethod?, refundTransactionId?)`

환불 요청을 승인하고 처리합니다.

- refunds 테이블의 status를 'completed'로 변경
- `cancelUserPlan()` 호출하여 Free 플랜으로 다운그레이드

#### 6. `rejectRefund(refundId, rejectionReason, processedBy?)`

환불 요청을 거절합니다.

#### 7. `getPendingRefunds(limit)`

대기 중인 환불 요청 목록을 조회합니다 (관리자용).

#### 8. `getRefundStatistics(startDate?, endDate?)`

환불 통계를 조회합니다.

## 프론트엔드 구현

### `/app/routes/plans.tsx`

#### handleRefundRequest 함수

```typescript
const handleRefundRequest = async () => {
  // 1. 유효성 검사
  if (!refundReason) {
    toast.error("환불 사유를 선택해주세요");
    return;
  }
  if (!agreeToPolicy) {
    toast.error("환불 정책에 동의해주세요");
    return;
  }

  // 2. API 호출
  const response = await fetch("/api/refund", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refundReason, refundComment }),
  });

  // 3. 결과 처리
  if (response.ok && result.success) {
    toast.success("환불 요청이 접수되었습니다");
    window.location.reload(); // 플랜 상태 업데이트
  }
};
```

#### 환불 다이얼로그

- 환불 가능 금액 표시 (일할 계산)
- 환불 사유 선택 (6가지 옵션)
- 추가 의견 입력란
- 환불 정책 안내
- 정책 동의 체크박스

## 환불 금액 계산 로직

```typescript
const remainingDays = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
const refundAmount = Math.round((price * remainingDays) / 30);
```

**예시:**

- 월 29,000원 플랜
- 20일 남음
- 환불 금액: 29,000 × 20 / 30 = 19,333원

## 환불 프로세스

### 1. 사용자 환불 요청

1. Plans 페이지에서 "환불하기" 버튼 클릭
2. 환불 다이얼로그에서 사유 선택 및 정책 동의
3. "환불 요청" 버튼 클릭
4. API 호출 → refunds 테이블에 레코드 생성 (status: pending)
5. 성공 메시지 표시

### 2. 관리자 환불 처리 (추후 구현 예정)

1. 관리자 대시보드에서 대기 중인 환불 요청 확인
2. 승인 또는 거절 선택
3. 승인 시:
   - refunds 테이블 status 'completed'로 변경
   - `cancelUserPlan()` 호출 → Free 플랜으로 다운그레이드
   - 실제 환불 처리 (PG사 API 연동)
4. 거절 시:
   - refunds 테이블 status 'rejected'로 변경
   - 거절 사유 기록

### 3. 자동 플랜 다운그레이드

`approveRefund()` 함수에서 `cancelUserPlan()`을 호출하여:

- user_plan_history 테이블의 현재 활성 플랜을 비활성화
- Free 플랜 이력 추가
- users 테이블의 planId를 Free 플랜 ID로 변경

## 보안 및 검증

### 환불 가능 조건

1. 활성 유료 플랜 보유
2. 결제 후 7일 이내 (남은 일수 > 23일)
3. 처리 중인 환불 요청 없음

### 인증

- JWT 토큰 기반 인증
- 본인의 환불 요청만 생성 가능

## 마이그레이션

```bash
# 마이그레이션 파일 생성
npm run db:generate

# 마이그레이션 실행
npm run db:migrate
```

**생성된 파일:** `drizzle/0041_ambitious_northstar.sql`

## 향후 개선 사항

1. **관리자 대시보드 구현**
   - 대기 중인 환불 요청 목록
   - 승인/거절 기능
   - 환불 통계 대시보드

2. **이메일 알림**
   - 환불 요청 접수 확인 메일
   - 환불 처리 완료 메일
   - 환불 거절 메일

3. **실제 PG사 환불 API 연동**
   - Toss Payments 환불 API
   - 환불 거래 ID 저장

4. **환불 히스토리 UI**
   - 사용자가 본인의 환불 요청 내역 확인
   - 환불 상태 추적

5. **자동 환불 승인**
   - 특정 금액 이하 자동 승인
   - 특정 사유에 대한 자동 승인

## 테스트 시나리오

### 정상 케이스

1. 유료 플랜 구독 후 3일 경과
2. "환불하기" 버튼 클릭
3. 환불 사유 선택 및 정책 동의
4. 환불 요청 성공
5. refunds 테이블에 레코드 생성 확인
6. status가 'pending'인지 확인

### 에러 케이스

1. 환불 사유 미선택 → 에러 메시지
2. 정책 미동의 → 에러 메시지
3. 결제 후 8일 경과 → "환불 가능 기간이 지났습니다"
4. Free 플랜 사용자 → "무료 플랜은 환불할 수 없습니다"
5. 이미 환불 요청 중 → "이미 처리 중인 환불 요청이 있습니다"

## 관련 파일

- `/app/database/schema.ts` - refunds 테이블 정의
- `/app/database/refund.ts` - 환불 관련 DB 함수
- `/app/database/plan.ts` - cancelUserPlan 함수
- `/app/routes/api.refund.tsx` - 환불 API 엔드포인트
- `/app/routes/plans.tsx` - handleRefundRequest 함수
- `/drizzle/0041_ambitious_northstar.sql` - 마이그레이션 파일
