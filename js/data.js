/* ============ 목데이터 ============ */
// 부서 목록 - 구청장/부구청장/국(팀 없음)과 과(팀 있음)를 모두 선택지로 둠
const DEPARTMENT_LIST = [
  "구청장",
  "부구청장",
  // 부구청장 직속
  "감사담당관",
  // 기획조정실
  "기획조정실", "기획예산담당관", "미래전략담당관", "홍보담당관", "일자리정책담당관",
  // 행정지원국
  "행정지원국", "행정지원과", "자치행정과", "교육지원과", "스마트정보과", "민원여권과",
  // 문화경제국
  "문화경제국", "문화진흥과", "관광체육과", "지역경제과", "재무과", "세무관리과", "세무1과", "세무2과",
  // 생활지원국
  "생활지원국", "복지정책과", "청소행정과", "사회복지과", "어르신복지과", "아동청소년과", "가족정책과", "복지조사과",
  // 도시관리국
  "도시관리국", "주택과", "도시계획과", "재정비사업과", "건축과", "공원녹지과", "부동산정보과", "맑은환경과",
  // 안전건설교통국
  "안전건설교통국", "안전재난과", "건설관리과", "교통행정과", "주차관리과", "도로과", "치수과",
  // 보건소
  "보건소", "마음건강정책과", "보건위생과", "건강관리과", "보건의료과",
  // 의회사무국
  "의회사무국"
];

// 부서(과)별 팀 목록 - 로그인 시 부서 선택 후 이 목록에서 팀을 선택함
// 구청장만 예외로 '비서실' 팀 하나가 있고, 부구청장/각 국(國)은 팀 선택 자체가 없음(목록에 없으면 자동으로 팀 선택란이 숨겨짐)
const TEAMS_BY_DEPT = {
  "구청장": ["비서실"],
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
  // "부구청장", "기획조정실", "행정지원국", "문화경제국", "생활지원국", "도시관리국", "안전건설교통국", "보건소"
  // 는 의도적으로 여기 없음 -> 팀 선택란이 자동으로 숨겨짐
};

// ============ 식당 마스터 (Firestore restaurants 컬렉션 - 전 부서/동 공유) ============
let restaurantsCache = []; // 앱 실행 중 캐시. loadRestaurants()로 채움

async function loadRestaurants() {
  const snap = await db.collection('restaurants').get();
  restaurantsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return restaurantsCache;
}

async function addRestaurantDoc(name, dong) {
  const ref = await db.collection('restaurants').add({ name, dong, qrImageUrl: null });
  return ref.id;
}

async function updateRestaurantQr(restaurantId, qrImageUrl) {
  await db.collection('restaurants').doc(restaurantId).update({ qrImageUrl });
  const r = restaurantsCache.find(x => x.id === restaurantId);
  if (r) r.qrImageUrl = qrImageUrl; // 캐시도 같이 갱신
}

// ============ 팀별 "우리 팀이 쓸 식당" 구독 (Firestore teamRestaurants 컬렉션, 문서ID=groupKey) ============
async function loadTeamEnabledIds(groupKey) {
  const doc = await db.collection('teamRestaurants').doc(groupKey).get();
  if (!doc.exists) return new Set(restaurantsCache.map(r => r.id)); // 최초엔 전체 마스터 다 켜진 상태로 시작
  return new Set(doc.data().enabledIds || []);
}

async function saveTeamEnabledIds(groupKey, idsSet) {
  await db.collection('teamRestaurants').doc(groupKey).set({ enabledIds: Array.from(idsSet) });
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
    const db2 = DONG_LIST.indexOf(b.dong);
    const dongDiff = (da === -1 ? 999 : da) - (db2 === -1 ? 999 : db2);
    if (dongDiff !== 0) return dongDiff;
    return a.name.localeCompare(b.name, 'ko');
  });
}

// 부서명이 같아도 팀 이름이 겹칠 수 있어서(예: 홍보팀) 내부적으로는 "부서::팀" 조합키로 구분함
// team이 없는 경우(부구청장/각 국처럼 팀 선택이 없는 부서)는 부서명 자체를 키로 씀
function makeGroupKey(dept, team) {
  return team ? `${dept}::${team}` : dept;
}
// 화면 표시용 - 팀이 없는 부서(부구청장/각 국)는 부서명만 보여줌
function formatOrgLabel(dept, team) {
  return team ? `${dept} · ${team}` : dept;
}

const UNKNOWN_ID = "unknown";
const AVG_PRICE = 9000;
const MONTHLY_LIMIT = 20;

// ============ 팀원 명부 (Firestore members 컬렉션) ============
// 문서ID를 "부서::팀__이름" 형식으로 고정해둬서, Firebase 콘솔에서 사람 찾기 쉽고
// 총괄관리자가 콘솔에서 직접 isBabjang 필드를 true/false로 바꾸면 그게 곧 밥장 지정/해제가 됨.

// 비밀번호를 평문으로 저장하지 않기 위한 최소한의 보호장치 (브라우저 내장 Web Crypto라 별도 설치 필요 없음)
async function hashPassword(password) {
  const enc = new TextEncoder().encode(password);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function memberDocId(groupKey, name) {
  return `${groupKey}__${name}`;
}

// 최초면 Firestore에 등록, 이미 있으면 비밀번호 검증. 반환: { member, error }
async function registerOrLogin(groupKey, name, password) {
  const docId = memberDocId(groupKey, name);
  const ref = db.collection('members').doc(docId);
  const snap = await ref.get();
  const passwordHash = await hashPassword(password);

  if (!snap.exists) {
    await ref.set({
      team: groupKey,
      name,
      passwordHash,
      isBabjang: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    return { member: { id: docId, name, isBabjang: false }, error: null };
  }

  const data = snap.data();
  if (data.passwordHash !== passwordHash) {
    return { member: null, error: '비밀번호가 일치하지 않습니다.' };
  }
  return { member: { id: docId, name, isBabjang: !!data.isBabjang }, error: null };
}

// 우리 팀 전체 팀원 목록 (밥장 관리 화면, 밥장 넘기기에서 사용)
async function getTeamMembers(groupKey) {
  const snap = await db.collection('members').where('team', '==', groupKey).get();
  return snap.docs.map(d => ({ id: d.id, name: d.data().name, isBabjang: !!d.data().isBabjang }));
}

// 밥장 지정/해제를 Firestore에 반영
async function setMemberBabjang(memberId, value) {
  await db.collection('members').doc(memberId).update({ isBabjang: value });
}

/* ============ 상태 ============ */
let session = null;
let currentYear, currentMonth;
let selectedDate = null;
let selectedRestaurantId = null; // 현재 입력 폼에서 클릭으로 선택된 식당

// 캘린더에 표시 중인 "이번 달 내 식권 사용 기록" 캐시 - 월 이동/로그인 시 loadMyMonthEntries()로 채움
let myMonthEntries = []; // [{id, date, restaurantId, count, special, unknown}]
// 밥장 관리 화면에서 쓰는 "우리 팀 전체 식권 기록" 캐시 (월 필터는 화면단에서)
let teamAllEntries = [];
// 우리 팀이 쓸 수 있는 식당 id 집합 캐시 - loadTeamEnabledIds()로 채움
let teamEnabledIds = new Set();

// ============ 식권 사용 기록 (Firestore mealUsage 컬렉션) ============
function entriesForDate(dateStr) {
  return myMonthEntries.filter(e => e.date === dateStr);
}

// 로그인한 본인의 이번 달 기록을 불러와 myMonthEntries에 채움
async function loadMyMonthEntries(groupKey, name, year, month) {
  const prefix = monthPrefix(year, month);
  const snap = await db.collection('mealUsage')
    .where('team', '==', groupKey)
    .where('member', '==', name)
    .get();
  myMonthEntries = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(e => e.date.startsWith(prefix));
  return myMonthEntries;
}

// 밥장 관리 화면용 - 우리 팀 전체(모든 팀원) 기록을 통째로 불러옴 (월 목록/집계 둘 다 여기서 뽑아 씀)
async function loadTeamAllEntries(groupKey) {
  const snap = await db.collection('mealUsage').where('team', '==', groupKey).get();
  teamAllEntries = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return teamAllEntries;
}

async function addMealEntryDoc(entry) {
  const ref = await db.collection('mealUsage').add(entry);
  return ref.id;
}
async function updateMealEntryDoc(id, patch) {
  await db.collection('mealUsage').doc(id).update(patch);
}
async function deleteMealEntryDoc(id) {
  await db.collection('mealUsage').doc(id).delete();
}

const todayObj = new Date();
currentYear = todayObj.getFullYear();
currentMonth = todayObj.getMonth();

