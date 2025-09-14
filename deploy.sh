#!/bin/bash
# Karbit 배포 및 데몬 등록 스크립트
# pm2가 없으면 설치
if ! command -v pm2 &> /dev/null; then
  echo "pm2가 설치되어 있지 않습니다. 설치를 진행합니다."
  npm install -g pm2
fi

# 환경 변수 로드 (.env)
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# 빌드 (필요시)
echo "앱 빌드 중..."
npm run build

# pm2에 데몬 등록 및 시작
echo "pm2로 서버 데몬 등록 및 시작"
pm2 delete karbit-server 2>/dev/null
pm2 start server.js --name karbit-server

# pm2를 systemd 서비스로 등록
echo "pm2를 systemd 서비스로 등록합니다."
sudo pm2 startup systemd -u $(whoami) --hp $HOME
pm2 save

# pm2 상태 확인
echo "pm2 프로세스 상태:"
pm2 status
