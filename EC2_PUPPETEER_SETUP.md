# EC2에서 Puppeteer 실행 설정 가이드

## 문제 해결

EC2 인스턴스에서 Puppeteer를 실행할 때 Chrome을 찾을 수 없는 문제와 Upbit의 403 에러를 해결하기 위한 가이드입니다.

## 1. Chrome 설치 (Amazon Linux 2 / Ubuntu 기준)

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

## 2. Puppeteer Chrome 설치

```bash
# 프로젝트 디렉토리에서
npx puppeteer browsers install chrome

# 또는 환경변수 설정 후 설치
export PUPPETEER_SKIP_DOWNLOAD=false
npm install puppeteer
```

## 3. 환경 변수 설정

`.env` 파일에 추가하거나 PM2 ecosystem 파일에 설정:

```bash
# Chrome 실행 파일 경로 지정 (선택사항)
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# 또는
PUPPETEER_EXECUTABLE_PATH=$(which google-chrome-stable)
```

## 4. PM2 Ecosystem 설정

`ecosystem.config.js` 파일을 만들거나 수정:

```javascript
module.exports = {
  apps: [
    {
      name: "news-crawler",
      script: "news-crawler-service.ts",
      interpreter: "node",
      interpreter_args: "--loader tsx",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PUPPETEER_EXECUTABLE_PATH: "/usr/bin/google-chrome-stable",
        // 또는 시스템에서 찾기
        // PUPPETEER_EXECUTABLE_PATH: process.env.CHROME_PATH || '/usr/bin/google-chrome-stable'
      },
      error_file: "./logs/news-crawler-error.log",
      out_file: "./logs/news-crawler-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
  ],
};
```

## 5. PM2로 실행

```bash
# ecosystem 파일로 실행
pm2 start ecosystem.config.js

# 또는 직접 실행
pm2 start news-crawler-service.ts \
  --interpreter node \
  --interpreter-args "--loader tsx" \
  --name news-crawler \
  --env production \
  --max-memory-restart 1G

# 환경변수 설정하고 재시작
pm2 restart news-crawler --update-env

# 로그 확인
pm2 logs news-crawler

# 상태 확인
pm2 status
```

## 6. 테스트

```bash
# Chrome 경로 확인
which google-chrome-stable

# Chrome 실행 테스트
google-chrome-stable --headless --disable-gpu --dump-dom https://www.google.com

# Node.js에서 Puppeteer 테스트
node -e "const puppeteer = require('puppeteer'); (async () => { const browser = await puppeteer.launch({ headless: true, executablePath: '/usr/bin/google-chrome-stable', args: ['--no-sandbox', '--disable-setuid-sandbox'] }); console.log('Success!'); await browser.close(); })()"
```

## 7. 추가 문제 해결

### Chrome이 실행되지 않는 경우

```bash
# 권한 확인
ls -la /usr/bin/google-chrome-stable

# 실행 권한 추가
sudo chmod +x /usr/bin/google-chrome-stable

# 심볼릭 링크 확인
ls -la /usr/bin/google-chrome
```

### Upbit 403 에러 대처

Upbit API는 IP 기반 차단이나 Rate Limiting을 할 수 있습니다:

1. **요청 간격 조정**: 크롤링 주기를 늘림 (현재 10분으로 설정됨)
2. **헤더 개선**: User-Agent와 Referer 헤더 추가 (이미 적용됨)
3. **재시도 로직**: 실패 시 지수 백오프로 재시도

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

## 8. 모니터링

```bash
# PM2 모니터링
pm2 monit

# 로그 실시간 확인
pm2 logs news-crawler --lines 100

# 메모리/CPU 사용량 확인
pm2 describe news-crawler
```

## 9. 체크리스트

- [ ] Chrome/Chromium 설치 완료
- [ ] `google-chrome-stable --version` 명령어 동작 확인
- [ ] `npx puppeteer browsers install chrome` 실행
- [ ] `.env` 파일에 `PUPPETEER_EXECUTABLE_PATH` 설정
- [ ] PM2 ecosystem 파일 설정
- [ ] PM2로 서비스 재시작
- [ ] 로그 확인하여 에러 해결

## 10. 문제가 계속되는 경우

```bash
# Puppeteer 캐시 삭제 후 재설치
rm -rf ~/.cache/puppeteer
rm -rf node_modules/puppeteer
npm install puppeteer

# Chrome 재설치
npx puppeteer browsers install chrome

# 환경변수 확인
pm2 env 0

# 서비스 재시작
pm2 delete news-crawler
pm2 start ecosystem.config.js
pm2 save
```
