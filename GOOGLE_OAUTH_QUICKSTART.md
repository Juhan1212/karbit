# Google OAuth 빠른 시작 가이드

## 🚀 5분 안에 Google 로그인 설정하기

### 1단계: Google Cloud Console 설정

1. **[Google Cloud Console](https://console.cloud.google.com/) 접속**

2. **새 프로젝트 생성** (또는 기존 프로젝트 선택)
   - 프로젝트 이름: `Karbit` (또는 원하는 이름)

3. **OAuth 동의 화면 구성**
   - 왼쪽 메뉴: `API 및 서비스` → `OAuth 동의 화면`
   - 사용자 유형: **외부** 선택
   - 앱 이름: `Karbit`
   - 사용자 지원 이메일: 귀하의 이메일
   - 개발자 연락처: 귀하의 이메일
   - **저장 후 계속** 클릭

4. **범위 설정**
   - `범위 추가 또는 삭제` 클릭
   - 다음 범위 선택:
     - `.../auth/userinfo.email`
     - `.../auth/userinfo.profile`
   - **업데이트** 클릭
   - **저장 후 계속** 클릭

5. **테스트 사용자 추가** (선택사항, 테스트 모드일 경우)
   - `+ ADD USERS` 클릭
   - 테스트할 Google 계정 이메일 입력
   - **저장 후 계속** 클릭

6. **OAuth 클라이언트 ID 생성**
   - 왼쪽 메뉴: `API 및 서비스` → `사용자 인증 정보`
   - `+ 사용자 인증 정보 만들기` → `OAuth 클라이언트 ID` 선택
   - 애플리케이션 유형: **웹 애플리케이션**
   - 이름: `Karbit Web Client`

   **승인된 자바스크립트 원본:**

   ```
   http://localhost:3000
   ```

   **승인된 리디렉션 URI:**

   ```
   http://localhost:3000/api/auth/google/callback
   ```

   - **만들기** 클릭

7. **클라이언트 ID와 시크릿 복사**
   - 팝업에 표시되는 **클라이언트 ID**와 **클라이언트 보안 비밀** 복사
   - 또는 사용자 인증 정보 목록에서 다운로드 아이콘 클릭하여 JSON 파일 다운로드

### 2단계: 환경 변수 설정

`.env` 파일에 다음 내용을 추가하세요:

```bash
# Google OAuth
GOOGLE_CLIENT_ID=여기에_클라이언트_ID_붙여넣기
GOOGLE_CLIENT_SECRET=여기에_클라이언트_시크릿_붙여넣기
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
```

**예시:**

```bash
GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-aBcDeFgHiJkLmNoPqRsTuVwXyZ
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
```

### 3단계: 서버 재시작

```bash
npm run dev
```

서버 로그에서 다음 메시지 확인:

```
✅ Passport Google OAuth initialized
```

만약 경고 메시지가 나타나면:

```
⚠️ Google OAuth credentials not found. Google login will be disabled.
```

→ `.env` 파일의 `GOOGLE_CLIENT_ID`와 `GOOGLE_CLIENT_SECRET` 확인

### 4단계: 테스트

1. 브라우저에서 `http://localhost:3000/auth` 접속

2. **"Google로 계속하기"** 버튼 클릭

3. Google 계정 선택 화면이 나타나야 함

4. 계정 선택 후 로그인

5. **동의 화면**에서 `계속` 클릭

6. 자동으로 `/dashboard`로 리다이렉트 확인

## ✅ 성공 확인 사항

- [ ] Google 로그인 버튼 클릭 시 Google 로그인 페이지로 이동
- [ ] Google 계정으로 로그인 가능
- [ ] 로그인 후 대시보드로 리다이렉트
- [ ] 브라우저 개발자 도구에서 `auth_token` 쿠키 확인
- [ ] 새로고침 해도 로그인 상태 유지

## 🔍 문제 해결

### "redirect_uri_mismatch" 오류

**원인:** 리디렉션 URI 불일치

**해결:**

1. Google Cloud Console에서 설정한 리디렉션 URI 확인
2. `.env` 파일의 `GOOGLE_CALLBACK_URL` 확인
3. **정확히 일치해야 함** (슬래시, 프로토콜 포함)

```bash
# ✅ 올바른 예시
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

# ❌ 잘못된 예시
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback/  # 끝에 슬래시
GOOGLE_CALLBACK_URL=https://localhost:3000/api/auth/google/callback  # https (개발 환경)
```

### "invalid_client" 오류

**원인:** 클라이언트 ID 또는 시크릿 오류

**해결:**

1. Google Cloud Console에서 클라이언트 ID와 시크릿 재확인
2. `.env` 파일에 올바르게 복사했는지 확인
3. 공백이나 따옴표가 없는지 확인

### "access_denied" 오류

**원인:** 테스트 사용자 미등록 (외부 유형 선택 시)

**해결:**

1. Google Cloud Console → OAuth 동의 화면 → 테스트 사용자
2. `+ ADD USERS` 클릭
3. 테스트할 Google 계정 이메일 추가

### Google 로그인 버튼이 비활성화됨

**원인:** 환경 변수 미설정

**해결:**

1. `.env` 파일 확인
2. `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` 설정 확인
3. 서버 재시작

### "DatabaseContext not set" 오류

**원인:** 데이터베이스 컨텍스트 오류

**해결:**

1. 데이터베이스가 실행 중인지 확인
2. `DATABASE_URL` 환경 변수 확인
3. 데이터베이스 마이그레이션 실행: `npm run db:migrate`

## 📱 프로덕션 배포

프로덕션 환경에서는 다음을 업데이트하세요:

### 1. Google Cloud Console

승인된 자바스크립트 원본:

```
https://yourdomain.com
```

승인된 리디렉션 URI:

```
https://yourdomain.com/api/auth/google/callback
```

### 2. 환경 변수

```bash
GOOGLE_CLIENT_ID=프로덕션_클라이언트_ID
GOOGLE_CLIENT_SECRET=프로덕션_클라이언트_시크릿
GOOGLE_CALLBACK_URL=https://yourdomain.com/api/auth/google/callback
BASE_URL=https://yourdomain.com
NODE_ENV=production
```

### 3. OAuth 동의 화면 게시

1. Google Cloud Console → OAuth 동의 화면
2. `앱 게시` 클릭
3. 확인 프로세스 완료 (Google 검토 필요)

## 🎉 완료!

이제 사용자들이 Google 계정으로 간편하게 로그인할 수 있습니다!

---

**더 자세한 정보는 [`GOOGLE_OAUTH_SETUP.md`](./GOOGLE_OAUTH_SETUP.md) 참고**
