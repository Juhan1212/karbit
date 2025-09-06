# 이메일 서비스 설정 가이드

## Gmail 앱 비밀번호 설정 (권장)

### 1. Gmail에서 2단계 인증 활성화

1. Gmail 계정으로 로그인
2. Google 계정 관리 페이지로 이동
3. "보안" 탭 선택
4. "2단계 인증" 활성화

### 2. 앱 비밀번호 생성

1. "앱 비밀번호" 섹션으로 이동
2. "앱 선택" > "메일" 선택
3. "기기 선택" > "기타" 선택 후 "Karbit"으로 이름 설정
4. 생성된 16자리 비밀번호를 복사

### 3. 환경변수 설정

`.env` 파일에 다음과 같이 설정:

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=앱비밀번호16자리
```

## 다른 이메일 서비스 설정

### Outlook/Hotmail

```env
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@outlook.com
EMAIL_PASS=your-password
```

### Yahoo Mail

```env
EMAIL_HOST=smtp.mail.yahoo.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@yahoo.com
EMAIL_PASS=your-app-password
```

### 네이버 메일

```env
EMAIL_HOST=smtp.naver.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@naver.com
EMAIL_PASS=your-password
```

## 개발 환경에서 테스트

### Mailtrap (개발/테스트용)

1. [Mailtrap](https://mailtrap.io/) 계정 생성
2. Inbox 생성 후 SMTP 설정 복사
3. 환경변수 설정:

```env
EMAIL_HOST=sandbox.smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_SECURE=false
EMAIL_USER=your-mailtrap-username
EMAIL_PASS=your-mailtrap-password
```

### Ethereal Email (무료 테스트)

```javascript
// 개발 환경에서만 사용
const testAccount = await nodemailer.createTestAccount();
```

## 보안 고려사항

1. **앱 비밀번호 사용**: 일반 비밀번호 대신 앱 전용 비밀번호 사용
2. **환경변수 보호**: `.env` 파일을 git에 커밋하지 않기
3. **HTTPS 사용**: 프로덕션에서는 반드시 HTTPS 사용
4. **비밀번호 저장**: 이메일 비밀번호를 안전하게 보관

## 문제 해결

### 인증 실패 시

- 앱 비밀번호가 올바른지 확인
- 2단계 인증이 활성화되어 있는지 확인
- "보안 수준이 낮은 앱 액세스" 설정 확인 (Gmail)

### 이메일 발송 실패 시

- SMTP 서버 주소와 포트 확인
- 방화벽 설정 확인
- 일일 발송 제한 확인

### 스팸 폴더 문제

- SPF, DKIM, DMARC 레코드 설정
- 신뢰할 수 있는 IP에서 발송
- 적절한 제목과 내용 작성
