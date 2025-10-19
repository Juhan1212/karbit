# Google OAuth 로그인 설정 가이드

## 1. Google Cloud Console 설정

### 1.1 프로젝트 생성

1. [Google Cloud Console](https://console.cloud.google.com/)에 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택

### 1.2 OAuth 2.0 클라이언트 ID 생성

1. 왼쪽 메뉴에서 **API 및 서비스** → **사용자 인증 정보** 선택
2. **+ 사용자 인증 정보 만들기** 클릭
3. **OAuth 클라이언트 ID** 선택
4. 애플리케이션 유형: **웹 애플리케이션** 선택
5. 다음 정보 입력:
   - **이름**: Karbit (또는 원하는 이름)
   - **승인된 자바스크립트 원본**:
     - `http://localhost:3000` (개발 환경)
     - `https://yourdomain.com` (프로덕션 환경)
   - **승인된 리디렉션 URI**:
     - `http://localhost:3000/api/auth/google/callback` (개발 환경)
     - `https://yourdomain.com/api/auth/google/callback` (프로덕션 환경)
6. **만들기** 클릭
7. 생성된 **클라이언트 ID**와 **클라이언트 보안 비밀번호**를 복사

### 1.3 OAuth 동의 화면 구성

1. **OAuth 동의 화면** 메뉴 선택
2. 사용자 유형: **외부** 선택 (테스트용) 또는 **내부** (조직 내부용)
3. 앱 정보 입력:
   - **앱 이름**: Karbit
   - **사용자 지원 이메일**: 귀하의 이메일
   - **개발자 연락처 정보**: 귀하의 이메일
4. **범위 추가 또는 삭제**:
   - `profile` (기본 프로필 정보)
   - `email` (이메일 주소)
5. 저장 후 계속

## 2. 환경 변수 설정

`.env` 파일에 다음 내용을 추가하세요:

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
```

**주의**: `.env` 파일은 절대 Git에 커밋하지 마세요!

## 3. 프로덕션 배포 시 설정

### 3.1 환경 변수 업데이트

프로덕션 환경에서는 다음과 같이 설정하세요:

```bash
GOOGLE_CLIENT_ID=your-production-client-id
GOOGLE_CLIENT_SECRET=your-production-client-secret
GOOGLE_CALLBACK_URL=https://yourdomain.com/api/auth/google/callback
BASE_URL=https://yourdomain.com
NODE_ENV=production
```

### 3.2 Google Cloud Console에서 승인된 URI 추가

1. Google Cloud Console에서 OAuth 클라이언트 ID 편집
2. 프로덕션 도메인을 승인된 자바스크립트 원본과 리디렉션 URI에 추가

## 4. 테스트

### 4.1 개발 환경에서 테스트

1. 데이터베이스 마이그레이션 실행:

   ```bash
   npm run db:migrate
   ```

2. 개발 서버 시작:

   ```bash
   npm run dev
   ```

3. 브라우저에서 `http://localhost:3000/auth` 접속

4. "Google로 계속하기" 버튼 클릭

5. Google 계정으로 로그인

6. 로그인 성공 시 대시보드로 리다이렉트 확인

### 4.2 문제 해결

#### 오류: "redirect_uri_mismatch"

- Google Cloud Console에서 설정한 리디렉션 URI와 환경 변수의 `GOOGLE_CALLBACK_URL`이 정확히 일치하는지 확인
- 끝에 슬래시(`/`)가 없어야 함
- http vs https 프로토콜 확인

#### 오류: "invalid_client"

- `GOOGLE_CLIENT_ID`와 `GOOGLE_CLIENT_SECRET`이 올바른지 확인
- 환경 변수가 제대로 로드되었는지 확인

#### 오류: "access_denied"

- OAuth 동의 화면 설정 확인
- 테스트 사용자 추가 (외부 유형 선택 시)

## 5. 기능 설명

### 5.1 신규 사용자

- Google로 처음 로그인 시 자동으로 계정 생성
- 기본 Free 플랜 자동 할당
- Google 프로필 이미지 자동 저장

### 5.2 기존 사용자

- 이메일이 이미 등록된 경우 Google ID 연결
- 기존 계정 정보 유지

### 5.3 보안

- JWT 기반 세션 관리
- HttpOnly 쿠키로 토큰 저장
- 30일 자동 로그인 유지

## 6. 데이터베이스 스키마

Google OAuth 로그인을 위해 `users` 테이블에 다음 필드가 추가되었습니다:

```sql
-- Google OAuth 필드
google_id VARCHAR(255),          -- Google 사용자 고유 ID
google_avatar VARCHAR(500)       -- Google 프로필 이미지 URL
```

## 7. 참고 자료

- [Google OAuth 2.0 문서](https://developers.google.com/identity/protocols/oauth2)
- [Passport.js Google Strategy](http://www.passportjs.org/packages/passport-google-oauth20/)
- [React Router 인증 가이드](https://reactrouter.com/en/main/guides/authentication)

## 8. 보안 주의사항

✅ **해야 할 것**:

- `.env` 파일을 `.gitignore`에 추가
- 프로덕션 환경에서 HTTPS 사용
- `JWT_SECRET`을 강력한 랜덤 문자열로 설정

❌ **하지 말아야 할 것**:

- Google Client Secret을 프론트엔드 코드에 노출
- HTTP로 프로덕션 배포
- 환경 변수를 Git에 커밋
