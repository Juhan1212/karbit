# Stores Directory

이 디렉토리는 Zustand를 사용한 상태 관리 파일들을 포함합니다.

## 구조

```
app/stores/
├── index.ts          # 모든 stores의 exports를 통합
├── auth-store.ts     # 사용자 인증 상태 관리
└── README.md         # 이 파일
```

## 사용법

### 1. Auth Store 사용 예시

```tsx
import { useUser, useAuthActions, useIsAuthenticated } from "~/stores";

function MyComponent() {
  const user = useUser();
  const isAuthenticated = useIsAuthenticated();
  const { login, logout } = useAuthActions();

  // ...
}
```

### 2. 새로운 Store 추가 시

1. `app/stores/new-store.ts` 파일 생성
2. Zustand store 정의
3. `app/stores/index.ts`에 export 추가

```tsx
// new-store.ts
import { create } from "zustand";

interface NewState {
  // state 정의
}

export const useNewStore = create<NewState>()((set, get) => ({
  // store 구현
}));

// index.ts에 추가
export { useNewStore } from "./new-store";
```

## 현재 제공되는 Stores

### AuthStore

- 사용자 인증 상태 관리
- 로그인/로그아웃/회원가입 기능
- 세션 관리 및 자동 인증 체크
- SessionStorage를 통한 상태 지속성

## 장점

1. **성능 최적화**: 필요한 상태만 구독하여 불필요한 리렌더링 방지
2. **코드 간소화**: Provider 없이 직접 사용 가능
3. **타입 안전성**: TypeScript 완전 지원
4. **개발자 경험**: 간단한 API와 유지보수 용이성
5. **미들웨어 지원**: persist, devtools 등 다양한 미들웨어 사용 가능

## 추후 확장 계획

- `dashboard-store.ts`: 대시보드 상태 관리
- `exchange-store.ts`: 거래소 연동 상태 관리
- `trading-store.ts`: 자동매매 상태 관리
- `settings-store.ts`: 사용자 설정 상태 관리
