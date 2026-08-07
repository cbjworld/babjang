/* ============ 목데이터 ============ */
// 부서 목록 (용산구청 조직도의 '과' 단위 - * 붙은 항목만 반영)
const DEPARTMENT_LIST = [
  // 부구청장 직속
  "감사담당관",
  // 기획조정실
  "기획예산담당관", "미래전략담당관", "홍보담당관", "일자리정책담당관",
  // 행정지원국
  "행정지원과", "자치행정과", "교육지원과", "스마트정보과", "민원여권과",
  // 문화경제국
  "문화진흥과", "관광체육과", "지역경제과", "재무과", "세무관리과", "세무1과", "세무2과",
  // 생활지원국
  "복지정책과", "청소행정과", "사회복지과", "어르신복지과", "아동청소년과", "가족정책과", "복지조사과",
  // 도시관리국
  "주택과", "도시계획과", "재정비사업과", "건축과", "공원녹지과", "부동산정보과", "맑은환경과",
  // 안전건설교통국
  "안전재난과", "건설관리과", "교통행정과", "주차관리과", "도로과", "치수과",
  // 보건소
  "마음건강정책과", "보건위생과", "건강관리과", "보건의료과",
  // 의회사무국
  "의회사무국"
];

// 부서(과)별 팀 목록 - 로그인 시 부서 선택 후 이 목록에서 팀을 선택함
const TEAMS_BY_DEPT = {
  "감사담당관": ["청렴감사팀", "조사팀", "직소민원팀", "적극행정조성팀", "일상감사팀"],
  "기획예산담당관": ["기획팀", "예산팀", "평가관리팀", "의회법제팀"],
  "미래전략담당관": ["대외전략팀", "정책소통팀", "특정개발진흥팀"],
  "홍보담당관": ["언론팀", "홍보팀", "미디어소통팀"],
  "일자리정책담당관": ["일자리정책팀", "청년정책팀", "사회적경제팀"],
  "행정지원과": ["총무팀", "인사팀", "후생교육팀", "국제협력팀"],
  "자치행정과": ["자치행정팀", "자치지원팀", "주민협력팀", "민방위팀"],
  "교육지원과": ["교육기획팀", "학교지원팀", "평생교육팀", "독서진흥팀"],
  "스마트정보과": ["스마트행정팀", "스마트지원팀", "전산운영팀", "정보통신팀", "유지보수팀"],
  "민원여권과": ["민원행정팀", "민원처리팀", "가족관계등록팀", "여권팀"],
  "문화진흥과": ["문화정책팀", "문화예술팀", "박물관팀"],
  "관광체육과": ["관광정책팀", "체육시설팀", "생활체육팀"],
  "지역경제과": ["지역경제팀", "시장지원팀", "생활경제팀"],
  "재무과": ["재산관리팀", "계약팀", "지출팀"],
  "세무관리과": ["세입총괄팀", "38세금징수1팀", "38세금징수2팀", "체납차량관리팀", "세외수입팀"],
  "세무1과": ["재산세총괄팀", "재산세1팀", "재산세2팀", "법인조사팀", "주택평가팀"],
  "세무2과": ["세입관리팀", "자동차세팀", "주민세팀", "지방소득세1팀", "지방소득세2팀"],
  "복지정책과": ["복지기획팀", "복지자원팀", "희망복지팀", "돌봄지원팀", "통합돌봄TF팀"],
  "청소행정과": ["청소기획팀", "자원순환팀", "도시청결팀", "청소위생팀", "시설장비팀"],
  "사회복지과": ["생활보장팀", "장애인정책팀", "장애인지원팀", "주거복지팀"],
  "어르신복지과": ["여가정책팀", "생활지원팀", "요양보호팀"],
  "아동청소년과": ["아동친화팀", "아동보호팀", "청소년팀", "드림스타트팀"],
  "가족정책과": ["보육정책팀", "보육운영팀", "출생다문화팀", "양성평등팀", "1인가구지원팀"],
  "복지조사과": ["자활복지팀", "복지조사팀", "복지관리팀"],
  "주택과": ["주택행정팀", "임대사업관리팀", "주택사업팀", "주택정비팀"],
  "도시계획과": ["도시계획팀", "입체도시개발팀", "도시정비팀", "지구단위계획팀"],
  "재정비사업과": ["재정비촉진팀", "재개발사업팀", "신속통합개발팀", "소규모정비팀", "신속추진팀"],
  "건축과": ["건축기획팀", "건축관리팀", "건축지원팀", "유니버셜디자인팀", "공공건축팀", "건축안전팀"],
  "공원녹지과": ["공원기획팀", "공원관리팀", "조경팀", "자연생태팀"],
  "부동산정보과": ["부동산행정팀", "토지관리팀", "지적관리팀", "지가조사팀", "도로명주소팀"],
  "맑은환경과": ["환경기획팀", "녹색성장팀", "환경지도팀", "생화로한경팀"], // 마지막 팀명 원문 그대로 - '생활환경팀' 오타로 보이면 알려주세요
  "안전재난과": ["안전기획팀", "재난대책팀", "중대재해예방팀", "스마트관제팀"],
  "건설관리과": ["공공용지관리팀", "도로점용팀", "가로관리팀", "광고물관리팀"],
  "교통행정과": ["교통행정팀", "교통시설팀", "자동차등록팀", "자동차관리팀"],
  "주차관리과": ["주차관리팀", "주차시설팀", "주차단속팀", "주차과징팀"],
  "도로과": ["도로계획팀", "도로관리팀", "보도관리팀", "지하안전굴착팀", "도로조명팀"],
  "치수과": ["치수팀", "하수팀", "기전팀"],
  "마음건강정책과": ["보건행정팀", "마음건강팀", "보건분소팀", "보건시설건립지원TF팀"],
  "보건위생과": ["식품위생팀", "공중위생팀", "동물보호팀"],
  "건강관리과": ["건강돌봄팀", "모자보건팀", "만성질환관리팀", "건강도시팀"],
  "보건의료과": ["의무팀", "약무팀", "감염병관리팀", "감염병대응팀", "검진팀"],
  "의회사무국": ["의정팀", "의사팀", "홍보팀", "전문위원실"]
};

let RESTAURANTS = [
  { id: "r1", name: "삼각지 진심식당", dong: "이태원동", qrImageUrl: null },
  { id: "r2", name: "한남동 국수집", dong: "한남동", qrImageUrl: null },
  { id: "r3", name: "용산 뚝배기", dong: "용산2가동", qrImageUrl: null },
  { id: "r4", name: "중화반점 남영", dong: "남영동", qrImageUrl: null },
  { id: "r5", name: "할머니 손칼국수", dong: "용산2가동", qrImageUrl: null }
];
let restaurantIdCounter = RESTAURANTS.length;

// 팀별로 "우리 팀이 쓸 수 있는 식당" 구독 목록 (식당 마스터 자체는 전 부서/동 공유)
let teamRestaurantSettings = {}; // { [team]: Set(restaurantId) }
function getEnabledRestaurantIds(team) {
  if (!teamRestaurantSettings[team]) {
    teamRestaurantSettings[team] = new Set(RESTAURANTS.map(r => r.id)); // 최초엔 전체 마스터 다 켜진 상태로 시작
  }
  return teamRestaurantSettings[team];
}
// 동 목록 (순서는 나중에 지정 예정 - 지금은 임시 순서)
const DONG_LIST = ["이태원동", "한남동", "용산2가동", "남영동", "청파동"];

function sortedByName(list) {
  return [...list].sort((a, b) => a.name.localeCompare(b.name, 'ko'));
}

// 동 순서(DONG_LIST 기준) 우선, 같은 동 안에서는 식당 이름 가나다순
function sortedByDongThenName(list) {
  return [...list].sort((a, b) => {
    const da = DONG_LIST.indexOf(a.dong);
    const db = DONG_LIST.indexOf(b.dong);
    const dongDiff = (da === -1 ? 999 : da) - (db === -1 ? 999 : db);
    if (dongDiff !== 0) return dongDiff;
    return a.name.localeCompare(b.name, 'ko');
  });
}

function getEnabledRestaurants(team) {
  const ids = getEnabledRestaurantIds(team);
  return sortedByDongThenName(RESTAURANTS.filter(r => ids.has(r.id)));
}
// 부서명이 같아도 팀 이름이 겹칠 수 있어서(예: 홍보팀) 내부적으로는 "부서::팀" 조합키로 구분함
function makeGroupKey(dept, team) {
  return `${dept}::${team}`;
}

const UNKNOWN_ID = "unknown";
const AVG_PRICE = 9000;
const MONTHLY_LIMIT = 20;

// 팀별 팀원 명부 - 최초 등록 시 이름+비밀번호가 여기 저장되고, 이후엔 로그인 검증에 사용됨
// isBabjang은 총괄관리자가 DB(Supabase)에서 직접 지정하거나, 밥장 본인이 넘기기 기능으로 바꿈
let allMembers = {
  [makeGroupKey("행정지원과", "총무팀")]: [
    { id: "seed1", name: "김태호", password: "0000", isBabjang: true },
    { id: "seed2", name: "박은지", password: "0000", isBabjang: true },
    { id: "seed3", name: "최수민", password: "0000", isBabjang: false }
  ]
};
function getTeamMembers(team) {
  if (!allMembers[team]) allMembers[team] = [];
  return allMembers[team];
}
// 최초면 등록, 이미 있으면 비밀번호 검증. 반환: { member, error }
function registerOrLogin(team, name, password) {
  const members = getTeamMembers(team);
  let member = members.find(m => m.name === name);

  if (!member) {
    member = { id: 'mem_' + Date.now() + '_' + Math.floor(Math.random()*1000), name, password, isBabjang: false };
    members.push(member);
    return { member, error: null };
  }

  if (member.password !== password) {
    return { member: null, error: '비밀번호가 일치하지 않습니다.' };
  }
  return { member, error: null };
}

/* ============ 상태 ============ */
let session = null;
let currentYear, currentMonth;
let selectedDate = null;
let selectedRestaurantId = null; // 현재 입력 폼에서 클릭으로 선택된 식당
let mealUsage = {}; // { "YYYY-MM-DD": [{restaurantId, count, special, unknown}] }

// 밥장 관리 화면용 팀 전체 로그 (실제로는 서버에서 팀원 전체 데이터를 받아옴 - 지금은 데모용 목업 포함)
let teamMealLogs = [
  { member: "김민준", team: makeGroupKey("행정지원과", "총무팀"), date: "2026-08-03", restaurantId: "r1", count: 3, special: false, unknown: false },
  { member: "김민준", team: makeGroupKey("행정지원과", "총무팀"), date: "2026-08-10", restaurantId: "r3", count: 2, special: false, unknown: false },
  { member: "이서연", team: makeGroupKey("행정지원과", "총무팀"), date: "2026-08-05", restaurantId: "r2", count: 4, special: false, unknown: false },
  { member: "이서연", team: makeGroupKey("행정지원과", "총무팀"), date: "2026-08-14", restaurantId: UNKNOWN_ID, count: 1, special: false, unknown: true },
  { member: "박도윤", team: makeGroupKey("행정지원과", "총무팀"), date: "2026-08-06", restaurantId: "r5", count: 5, special: false, unknown: false },
  { member: "박도윤", team: makeGroupKey("행정지원과", "총무팀"), date: "2026-08-20", restaurantId: "r1", count: 2, special: true, unknown: false }
];

const todayObj = new Date();
currentYear = todayObj.getFullYear();
currentMonth = todayObj.getMonth();

