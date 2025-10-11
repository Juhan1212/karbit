// 오늘 방문자 추적을 위한 메모리 기반 저장소
// 실제 프로덕션에서는 Redis 사용 권장

interface VisitorData {
  visitors: Set<string>; // IP 또는 세션 ID
  date: string; // YYYY-MM-DD 형식
}

let visitorData: VisitorData = {
  visitors: new Set(),
  date: new Date().toISOString().split("T")[0],
};

// 방문자 추가
export function trackVisitor(identifier: string) {
  const today = new Date().toISOString().split("T")[0];

  // 날짜가 바뀌면 초기화
  if (visitorData.date !== today) {
    console.log(
      `[Visitor Tracker] 날짜 변경 감지: ${visitorData.date} -> ${today}, 방문자 초기화`
    );
    visitorData = {
      visitors: new Set(),
      date: today,
    };
  }

  // 새로운 방문자인지 확인
  const isNewVisitor = !visitorData.visitors.has(identifier);
  if (isNewVisitor) {
    visitorData.visitors.add(identifier);
    console.log(
      `[Visitor Tracker] 새 방문자 추가: ${identifier}, 총 방문자: ${visitorData.visitors.size}`
    );
  } else {
    console.log(
      `[Visitor Tracker] 기존 방문자: ${identifier}, 총 방문자: ${visitorData.visitors.size}`
    );
  }
}

// 오늘 방문자 수 조회
export function getTodayVisitorCount(): number {
  const today = new Date().toISOString().split("T")[0];

  // 날짜가 바뀌면 초기화하고 0 반환
  if (visitorData.date !== today) {
    console.log(
      `[Visitor Tracker] getTodayVisitorCount - 날짜 변경 감지: ${visitorData.date} -> ${today}`
    );
    visitorData = {
      visitors: new Set(),
      date: today,
    };
    return 0;
  }

  console.log(
    `[Visitor Tracker] 현재 방문자 수: ${visitorData.visitors.size}, 날짜: ${visitorData.date}`
  );
  return visitorData.visitors.size;
}

// 디버깅용: 현재 상태 조회
export function getVisitorDebugInfo() {
  return {
    date: visitorData.date,
    count: visitorData.visitors.size,
    visitors: Array.from(visitorData.visitors),
  };
}
