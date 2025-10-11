# EC2에서 Puppeteer 실행 설정 가이드

## 문제 해결

EC2 인스턴스에서 Puppeteer를 실행할 때 Chrome을 찾을 수 없는 문제와 Upbit의 403 에러를 해결하기 위한 가이드입니다.

## ⚡ 빠른 해결 방법

### 옵션 1: 시스템 Chrome 설치 (권장)

```bash
# Amazon Linux 2
sudo yum update -y
wget https://dl.google.com/linux/direct/google-chrome-stable_current_x86_64.rpm
sudo yum install -y ./google-chrome-stable_current_x86_64.rpm
google-chrome-stable --version

# 코드가 자동으로 /usr/bin/google-chrome-stable을 찾습니다
```

### 옵션 2: Puppeteer Chrome만 설치

```bash
cd /path/to/karbit
npx puppeteer browsers install chrome

# 설치된 경로 확인
ls -la ~/.cache/puppeteer/chrome/

# 환경변수 설정 (선택)
export PUPPETEER_EXECUTABLE_PATH=~/.cache/puppeteer/chrome/linux-*/chrome-linux64/chrome
```

## 1. Chrome 설치 (상세 가이드)

### Amazon Linux 2 / CentOS

```bash
# Chrome stable 설치
sudo yum update -y
sudo yum install -y wget unzip fontconfig freetype freetype-devel fontconfig-devel libstdc++

# Chrome RPM 다운로드 및 설치
wget https://dl.google.com/linux/direct/google-chrome-stable_current_x86_64.rpm
sudo yum install -y ./google-chrome-stable_current_x86_64.rpm

# 확인
google-chrome-stable --version
which google-chrome-stable
```

### Ubuntu / Debian

```bash
# Chrome stable 설치
sudo apt-get update
sudo apt-get install -y wget gnupg
wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
sudo sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list'
sudo apt-get update
sudo apt-get install -y google-chrome-stable

# 필요한 라이브러리 설치
sudo apt-get install -y \
  ca-certificates \
  fonts-liberation \
  libappindicator3-1 \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcups2 \
  libdbus-1-3 \
  libgdk-pixbuf2.0-0 \
  libnspr4 \
  libnss3 \
  libx11-xcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  xdg-utils

# 확인
google-chrome-stable --version
```

## 2. 프로젝트 재배포

```bash
cd /path/to/karbit

# 최신 코드 가져오기
git pull

# 의존성 설치 (필요시)
npm install

# PM2로 재시작
pm2 restart news-crawler

# 로그 확인
pm2 logs news-crawler --lines 50
```

## 3. 환경 변수 설정 (선택사항)

코드가 자동으로 Chrome을 찾지만, 특정 경로를 지정하고 싶다면:

```bash
# .env 파일에 추가
echo "PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable" >> .env

# PM2 재시작
pm2 restart news-crawler --update-env
```

## 4. 테스트

```bash
# Chrome 설치 확인
which google-chrome-stable
google-chrome-stable --version

# Chrome 실행 테스트 (헤드리스 모드)
google-chrome-stable --headless --disable-gpu --no-sandbox --dump-dom https://www.google.com

# PM2 로그로 크롤러 동작 확인
pm2 logs news-crawler --lines 100

# 다음 크롤링 주기까지 기다리거나 수동으로 재시작
pm2 restart news-crawler
```

## 5. 문제 해결

### 여전히 Chrome을 찾지 못하는 경우

```bash
# 1. Chrome이 제대로 설치되었는지 확인
ls -la /usr/bin/google-chrome-stable

# 2. 실행 권한 확인 및 추가
sudo chmod +x /usr/bin/google-chrome-stable

# 3. Chrome 경로를 환경변수로 직접 지정
export PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# 4. PM2 재시작
pm2 restart news-crawler --update-env

# 5. 로그에서 "[Puppeteer] Found" 메시지 확인
pm2 logs news-crawler | grep Puppeteer
```

### Upbit 403 에러가 계속되는 경우

코드에 재시도 로직이 추가되어 있지만, 계속 문제가 발생한다면:

```bash
# 1. 크롤링 주기 늘리기 (news-crawler-service.ts에서 10분 → 30분)
# setInterval의 10 * 60 * 1000을 30 * 60 * 1000으로 변경

# 2. EC2 IP가 차단되었을 수 있음 - AWS 지원팀 문의 또는
#    Upbit 크롤러를 임시로 비활성화

# 3. Upbit 크롤러만 비활성화하려면 news-crawler-service.ts에서:
# new UpbitCrawler(), 줄을 주석 처리
```

### 메모리 부족 에러

```bash
# swap 파일 생성 (메모리 부족 시)
sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# /etc/fstab에 추가하여 영구적으로 사용
echo '/swapfile swap swap defaults 0 0' | sudo tee -a /etc/fstab
```

## 6. 모니터링

```bash
# PM2 모니터링
pm2 monit

# 로그 실시간 확인
pm2 logs news-crawler --lines 100

# 메모리/CPU 사용량 확인
pm2 describe news-crawler
```

## 7. 코드 변경 사항 요약

1. **`app/utils/puppeteer-config.ts` (신규)**
   - Chrome 경로 자동 탐색 로직
   - 시스템 Chrome → `which` 명령어 → Puppeteer 번들 순으로 탐색
   - 공통 Puppeteer 설정

2. **크롤러 수정**
   - `bithumb-crawler.ts`: `launchBrowser()` 사용
   - `hyperliquid-crawler.ts`: `launchBrowser()` 사용
3. **Upbit 재시도 로직**
   - `upbit-crawler.ts`: 403 에러 발생 시 최대 3회 재시도
   - 지수 백오프 (2초, 4초, 6초)

## 8. 체크리스트

- [ ] EC2에 Chrome 설치 (`sudo yum install` 또는 `sudo apt-get install`)
- [ ] `google-chrome-stable --version` 명령어 동작 확인
- [ ] 프로젝트 최신 코드 가져오기 (`git pull`)
- [ ] PM2로 서비스 재시작 (`pm2 restart news-crawler`)
- [ ] 로그에서 "[Puppeteer] Found" 메시지 확인
- [ ] 크롤링이 정상 작동하는지 로그 모니터링

## 9. 문제가 계속되는 경우

```bash
# 1. Chrome 완전히 재설치
sudo yum remove -y google-chrome-stable
wget https://dl.google.com/linux/direct/google-chrome-stable_current_x86_64.rpm
sudo yum install -y ./google-chrome-stable_current_x86_64.rpm

# 2. Node.js 프로세스 완전 종료 후 재시작
pm2 delete news-crawler
pm2 flush  # 로그 초기화
pm2 start news-crawler-service.ts --name news-crawler --interpreter node --interpreter-args "--loader tsx"
pm2 save

# 3. 로그로 Chrome 경로 확인
pm2 logs news-crawler | grep -i chrome
pm2 logs news-crawler | grep -i puppeteer
```
