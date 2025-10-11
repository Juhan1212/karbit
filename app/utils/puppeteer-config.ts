import * as puppeteer from "puppeteer";
import { execSync } from "child_process";
import { existsSync } from "fs";

/**
 * EC2 환경에서 Chrome 실행 파일 경로를 찾는 함수
 */
export function findChromePath(): string {
  // 1. 환경변수에서 먼저 확인
  if (
    process.env.PUPPETEER_EXECUTABLE_PATH &&
    existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)
  ) {
    console.log(
      "[Puppeteer] Using Chrome from PUPPETEER_EXECUTABLE_PATH:",
      process.env.PUPPETEER_EXECUTABLE_PATH
    );
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  // 2. 시스템에 설치된 Chrome 찾기
  const systemPaths = [
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/snap/bin/chromium",
  ];

  for (const path of systemPaths) {
    if (existsSync(path)) {
      console.log("[Puppeteer] Found system Chrome at:", path);
      return path;
    }
  }

  // 3. which 명령어로 찾기
  try {
    const chromePath = execSync("which google-chrome-stable", {
      encoding: "utf8",
    }).trim();
    if (chromePath && existsSync(chromePath)) {
      console.log("[Puppeteer] Found Chrome via which:", chromePath);
      return chromePath;
    }
  } catch (error) {
    // which 명령어 실패는 무시
  }

  // 4. Puppeteer가 설치한 Chrome 사용 (마지막 수단)
  try {
    const puppeteerPath = puppeteer.executablePath();
    if (existsSync(puppeteerPath)) {
      console.log("[Puppeteer] Using bundled Chrome:", puppeteerPath);
      return puppeteerPath;
    }
  } catch (error) {
    console.error("[Puppeteer] Failed to get executablePath:", error);
  }

  throw new Error(
    "Chrome not found! Please install Chrome: sudo yum install -y google-chrome-stable OR npx puppeteer browsers install chrome"
  );
}

/**
 * Puppeteer 브라우저 실행을 위한 공통 설정
 */
export async function launchBrowser() {
  const executablePath = findChromePath();

  return await puppeteer.launch({
    headless: true,
    executablePath,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-first-run",
      "--no-zygote",
      "--single-process",
      "--disable-accelerated-2d-canvas",
      "--disable-software-rasterizer",
      // 봇 감지 우회 (안전한 옵션만)
      "--disable-blink-features=AutomationControlled",
      "--window-size=1920,1080",
    ],
  });
}
