/* ============ Firestore 요청 타임아웃 헬퍼 ============ */
// 사내망 방화벽 등으로 firestore.googleapis.com에 연결이 안 되면 요청이 응답 없이 계속 대기할 수 있어서,
// 일정 시간(기본 10초) 안에 응답이 없으면 에러로 처리해 최소한 화면에 메시지는 뜨게 함
function withTimeout(promise, ms = 10000, label = '요청') {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label}이(가) ${ms/1000}초 안에 응답하지 않았어요. 네트워크(사내망 방화벽 등)에서 Firebase 접속이 막혀있을 수 있어요.`)), ms)
    )
  ]);
}

/* ============ 쿠키 유틸 ============ */
function setCookie(name, value, days) {
  try {
    const d = new Date();
    d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${encodeURIComponent(value)};expires=${d.toUTCString()};path=/`;
  } catch (e) { console.warn("쿠키 저장 실패:", e); }
}
function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}
function clearCookie(name) {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
}

/* ============ 화면 전환 ============ */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

/* ============ 로그인 화면 로직 ============ */
const departmentSelect = document.getElementById('departmentSelect');
const teamSelect = document.getElementById('teamSelect');
const teamField = document.getElementById('teamField');
departmentSelect.innerHTML = DEPARTMENT_LIST.map(d => `<option value="${d}">${d}</option>`).join('');

function populateLoginTeamOptions(dept) {
  const teams = TEAMS_BY_DEPT[dept]; // 목록에 없으면(부구청장/각 국) undefined
  if (!teams || teams.length === 0) {
    teamField.style.display = 'none';
    teamSelect.innerHTML = '';
    return;
  }
  teamField.style.display = 'block';
  teamSelect.innerHTML = teams.map(t => `<option value="${t}">${t}</option>`).join('');
}
departmentSelect.addEventListener('change', (e) => populateLoginTeamOptions(e.target.value));
populateLoginTeamOptions(departmentSelect.value);

async function doLogin() {
  const name = document.getElementById('nameInput').value.trim();
  const password = document.getElementById('passwordInput').value;
  if (!name) { alert('이름을 입력해주세요.'); return; }
  if (!password) { alert('비밀번호를 입력해주세요.'); return; }

  const loginBtn = document.getElementById('loginBtn');
  loginBtn.disabled = true;
  loginBtn.textContent = '확인 중...';

  try {
    const dept = departmentSelect.value;
    const hasTeams = teamField.style.display !== 'none';
    const team = hasTeams ? teamSelect.value : null; // 부구청장/각 국은 팀이 없음
    const groupKey = makeGroupKey(dept, team);
    const { member, error } = await withTimeout(registerOrLogin(groupKey, name, password), 10000, '로그인 확인');
    if (error) { alert(error); return; }

    session = {
      dept,
      team,
      groupKey, // 내부적으로 팀원명부/식당구독/식권로그를 구분하는 키 (부서명이 같아도 팀 이름은 겹칠 수 있어서)
      name,
      isBabjang: member.isBabjang // 총괄관리자가 Firebase 콘솔에서 이미 밥장으로 지정해뒀다면 여기서 반영됨
    };
    setCookie('sikgwon_session', JSON.stringify(session), 90);
    enterMainScreen();
  } catch (err) {
    console.error(err);
    alert(`로그인 중 문제가 발생했어요.\n\n[에러 내용]\n${err.code || ''} ${err.message || err}\n\nfirebase-init.js 설정값과 Firestore 규칙을 확인해주세요.`);
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = '시작하기';
  }
}
document.getElementById('loginBtn').addEventListener('click', doLogin);

// 이름/비밀번호 입력창에서 엔터키로 로그인
['nameInput', 'passwordInput'].forEach(id => {
  document.getElementById(id).addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); doLogin(); }
  });
});

window.addEventListener('DOMContentLoaded', () => {
  const saved = getCookie('sikgwon_session');
  if (saved) {
    try { session = JSON.parse(saved); enterMainScreen(); }
    catch (e) { showScreen('screen-login'); }
  }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  clearCookie('sikgwon_session');
  session = null;
  selectedDate = null;
  document.getElementById('nameInput').value = '';
  document.getElementById('passwordInput').value = '';
  showScreen('screen-login');
});

async function enterMainScreen() {
  document.getElementById('whoTeam').textContent = formatOrgLabel(session.dept, session.team);
  document.getElementById('whoName').textContent = session.name + (session.isBabjang ? ' (밥장)' : '');
  document.getElementById('toAdminBtn').style.display = session.isBabjang ? 'inline-block' : 'none';

  showScreen('screen-main');
  document.getElementById('restaurantList').innerHTML = '<p class="muted">불러오는 중...</p>';
  document.getElementById('calGrid').innerHTML = '';

  try {
    if (restaurantsCache.length === 0) await loadRestaurants(); // 식당 마스터는 앱 실행 중 한 번만 불러오면 충분
    teamEnabledIds = await loadTeamEnabledIds(session.groupKey);
    await loadMyMonthEntries(session.groupKey, session.name, currentYear, currentMonth);
  } catch (err) {
    console.error(err);
    alert('데이터를 불러오는 중 문제가 발생했어요. firebase-init.js 설정과 인터넷 연결을 확인해주세요.');
  }

  renderRestaurantList();
  renderCalendar();
  renderMonthlyGauge();
}

/* ============ 식당 목록 (클릭하면 모달 오픈) ============ */
function getEnabledRestaurants() {
  return sortedByDongThenName(restaurantsCache.filter(r => teamEnabledIds.has(r.id)));
}

function renderRestaurantList() {
  const wrap = document.getElementById('restaurantList');
  const keyword = (document.getElementById('restaurantSearch').value || '').trim().toLowerCase();
  const teamRestaurants = getEnabledRestaurants();

  const filtered = keyword
    ? teamRestaurants.filter(r => r.name.toLowerCase().includes(keyword) || r.dong.toLowerCase().includes(keyword))
    : teamRestaurants;

  let html = filtered.map(r => `
    <div class="r-item" data-id="${r.id}">
      <span>${r.name}</span><span class="r-dong">${r.dong}</span>
    </div>`).join('');

  if (filtered.length === 0) {
    html += `<p style="font-size:13px; color:#999; padding:8px 0;">검색 결과가 없습니다.</p>`;
  }

  // "기억 안남" 항목은 검색어와 무관하게 항상 표시
  html += `<div class="r-item unknown-item" data-id="${UNKNOWN_ID}">
      🤷 어디였는지 기억 안남
    </div>`;

  wrap.innerHTML = html;
  wrap.querySelectorAll('.r-item[data-id]').forEach(el => {
    el.addEventListener('click', () => {
      if (!selectedDate) { alert('먼저 캘린더에서 날짜를 선택해주세요.'); return; }
      openAddModal(el.dataset.id);
    });
  });
}

document.getElementById('restaurantSearch').addEventListener('input', renderRestaurantList);

/* ============ 캘린더 렌더링 ============ */
const monthLabel = document.getElementById('monthLabel');
const calGrid = document.getElementById('calGrid');

function renderCalendar() {
  monthLabel.textContent = `${currentYear}년 ${currentMonth + 1}월`;
  calGrid.innerHTML = '';

  ['일','월','화','수','목','금','토'].forEach(d => {
    const el = document.createElement('div');
    el.className = 'cal-dow';
    el.textContent = d;
    calGrid.appendChild(el);
  });

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    const el = document.createElement('div');
    el.className = 'cal-cell empty';
    calGrid.appendChild(el);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = formatDate(currentYear, currentMonth, day);
    const cell = document.createElement('div');
    cell.className = 'cal-cell';
    if (dateStr === selectedDate) cell.classList.add('selected');

    const entries = entriesForDate(dateStr);
    const total = entries.reduce((sum, e) => sum + e.count, 0);
    const hasSpecial = entries.some(e => e.special);

    let summaryHtml = '';
    if (total > 0) {
      summaryHtml = `<div class="day-summary ${hasSpecial ? 'has-special' : ''}">${total}장${hasSpecial ? ' ⭐' : ''}</div>`;
    }

    cell.innerHTML = `<div class="date-num">${day}</div>${summaryHtml}`;
    cell.addEventListener('click', () => selectDate(dateStr));
    calGrid.appendChild(cell);
  }

  renderMonthlyGauge();
}
function formatDate(y, m, d) {
  return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}
function monthPrefix(y, m) { return `${y}-${String(m+1).padStart(2,'0')}`; }

function getMonthlyNormalTotal(y, m) {
  // myMonthEntries는 항상 "현재 표시 중인 달"만 담고 있어서, 그 달일 때만 정확함
  if (y !== currentYear || m !== currentMonth) return 0;
  return myMonthEntries.reduce((sum, e) => sum + (e.special ? 0 : e.count), 0);
}

function renderMonthlyGauge() {
  const total = getMonthlyNormalTotal(currentYear, currentMonth);
  const pct = Math.min(100, (total / MONTHLY_LIMIT) * 100);
  const over = total > MONTHLY_LIMIT;
  document.getElementById('monthlyGauge').innerHTML = `
    이번 달 일반 식권 사용: <b>${total} / ${MONTHLY_LIMIT}장</b>${over ? ' (초과 - 특별식권만 추가 가능)' : ''}
    <div class="bar-bg"><div class="bar-fill ${over ? 'over' : ''}" style="width:${pct}%"></div></div>
  `;
}

document.getElementById('prevMonthBtn').addEventListener('click', async () => {
  currentMonth--; if (currentMonth < 0) { currentMonth = 11; currentYear--; }
  selectedDate = null;
  document.getElementById('entryPanel').style.display = 'none';
  await loadMyMonthEntries(session.groupKey, session.name, currentYear, currentMonth);
  renderCalendar();
});
document.getElementById('nextMonthBtn').addEventListener('click', async () => {
  currentMonth++; if (currentMonth > 11) { currentMonth = 0; currentYear++; }
  selectedDate = null;
  document.getElementById('entryPanel').style.display = 'none';
  await loadMyMonthEntries(session.groupKey, session.name, currentYear, currentMonth);
  renderCalendar();
});

/* ============ 날짜 선택 -> 입력 패널 ============ */
function selectDate(dateStr) {
  selectedDate = dateStr;
  renderCalendar();
  renderEntryPanel();
}

function renderEntryPanel() {
  const panel = document.getElementById('entryPanel');
  panel.style.display = 'block';

  const [y, m, d] = selectedDate.split('-').map(Number);
  const dow = ['일','월','화','수','목','금','토'][new Date(y, m-1, d).getDay()];
  document.getElementById('entryDateLabel').textContent = `${m}월 ${d}일 (${dow}) 식권 사용`;

  const entries = entriesForDate(selectedDate);
  document.getElementById('entryTotalNote').textContent = `이 날 입력: ${entries.length}건`;

  const listEl = document.getElementById('entryList');
  listEl.innerHTML = entries.map((e) => {
    const name = e.unknown ? '🤷 어디였는지 기억 안남' : (restaurantsCache.find(r => r.id === e.restaurantId)?.name || '알수없음');
    const tag = e.special ? '<span class="tag">특별식권</span>' : '';
    return `<div class="entry-row">
      <span class="r-name">${name}${tag}</span>
      <span>${e.count}장</span>
      <span class="actions">
        <button onclick="openEditModal('${e.id}')">수정</button>
        <button onclick="removeEntry('${e.id}')">삭제</button>
      </span>
    </div>`;
  }).join('') || '<p style="font-size:13px;color:#999;">아직 입력된 식권 사용이 없습니다.</p>';
}

/* ============ 식권 입력/수정 모달 ============ */
let modalMode = null; // 'add' | 'edit'
let modalRestaurantId = null;
let modalEditEntryId = null;

function restaurantModalTitle(id) {
  if (id === UNKNOWN_ID) return '🤷 어디였는지 기억 안남';
  const r = restaurantsCache.find(r => r.id === id);
  return r ? `${r.name} (${r.dong})` : '알수없음';
}

function openAddModal(restaurantId) {
  modalMode = 'add';
  modalRestaurantId = restaurantId;
  modalEditEntryId = null;

  document.getElementById('modalRestaurantName').textContent = restaurantModalTitle(restaurantId);
  const [y, m, d] = selectedDate.split('-').map(Number);
  const dow = ['일','월','화','수','목','금','토'][new Date(y, m-1, d).getDay()];
  document.getElementById('modalDateLabel').textContent = `${m}월 ${d}일 (${dow})`;
  document.getElementById('modalCountInput').value = '';
  document.getElementById('modalSpecialCheck').checked = false;

  document.getElementById('entryModalOverlay').style.display = 'flex';
  document.getElementById('modalCountInput').focus();
}

function openEditModal(entryId) {
  const entry = myMonthEntries.find(e => e.id === entryId);
  if (!entry) return;
  modalMode = 'edit';
  modalRestaurantId = entry.restaurantId;
  modalEditEntryId = entryId;

  document.getElementById('modalRestaurantName').textContent = restaurantModalTitle(entry.restaurantId);
  const [y, m, d] = selectedDate.split('-').map(Number);
  const dow = ['일','월','화','수','목','금','토'][new Date(y, m-1, d).getDay()];
  document.getElementById('modalDateLabel').textContent = `${m}월 ${d}일 (${dow}) 수정`;
  document.getElementById('modalCountInput').value = entry.count;
  document.getElementById('modalSpecialCheck').checked = entry.special;

  document.getElementById('entryModalOverlay').style.display = 'flex';
  document.getElementById('modalCountInput').focus();
}

function closeModal() {
  document.getElementById('entryModalOverlay').style.display = 'none';
  modalMode = null; modalRestaurantId = null; modalEditEntryId = null;
}

document.getElementById('modalCancelBtn').addEventListener('click', closeModal);
document.getElementById('entryModalOverlay').addEventListener('click', (e) => {
  if (e.target.id === 'entryModalOverlay') closeModal();
});

async function saveEntryModal() {
  const count = parseInt(document.getElementById('modalCountInput').value, 10);
  const isSpecial = document.getElementById('modalSpecialCheck').checked;

  if (!count || count <= 0) { alert('장수를 올바르게 입력해주세요.'); return; }

  const [y, m] = selectedDate.split('-').map(Number);

  const saveBtn = document.getElementById('modalSaveBtn');
  saveBtn.disabled = true;

  try {
    if (modalMode === 'add') {
      if (!isSpecial) {
        const currentMonthlyTotal = getMonthlyNormalTotal(y, m - 1);
        if (currentMonthlyTotal + count > MONTHLY_LIMIT) {
          alert(`이번 달 일반 식권은 최대 ${MONTHLY_LIMIT}장까지예요. (현재 ${currentMonthlyTotal}장 사용)\n비상근무 특별식권이면 체크 후 저장해주세요.`);
          return;
        }
      }
      const isUnknown = (modalRestaurantId === UNKNOWN_ID);
      const entry = { team: session.groupKey, member: session.name, date: selectedDate, restaurantId: modalRestaurantId, count, special: isSpecial, unknown: isUnknown };
      const id = await addMealEntryDoc(entry);
      myMonthEntries.push({ id, ...entry });

    } else if (modalMode === 'edit') {
      const entry = myMonthEntries.find(e => e.id === modalEditEntryId);
      if (!entry) return;
      if (!isSpecial) {
        const otherMonthlyTotal = getMonthlyNormalTotal(y, m - 1) - entry.count;
        if (otherMonthlyTotal + count > MONTHLY_LIMIT) {
          alert(`이번 달 일반 식권 한도(${MONTHLY_LIMIT}장)를 넘을 수 없습니다.`);
          return;
        }
      }
      await updateMealEntryDoc(entry.id, { count, special: isSpecial });
      entry.count = count;
      entry.special = isSpecial;
    }

    closeModal();
    renderEntryPanel();
    renderCalendar();
  } catch (err) {
    console.error(err);
    alert('저장 중 문제가 발생했어요. 잠시 후 다시 시도해주세요.');
  } finally {
    saveBtn.disabled = false;
  }
}
document.getElementById('modalSaveBtn').addEventListener('click', saveEntryModal);

// 장수 입력창에서 엔터키로 저장
document.getElementById('modalCountInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); saveEntryModal(); }
});

async function removeEntry(entryId) {
  try {
    await deleteMealEntryDoc(entryId);
    myMonthEntries = myMonthEntries.filter(e => e.id !== entryId);
    renderEntryPanel();
    renderCalendar();
  } catch (err) {
    console.error(err);
    alert('삭제 중 문제가 발생했어요. 잠시 후 다시 시도해주세요.');
  }
}

/* ============ 밥장: 밥장 넘기기 (상단 버튼 -> 모달) ============ */
function openBabjangHandoffModal() {
  document.getElementById('babjangHandoffModalOverlay').style.display = 'flex';
  renderBabjangHandoffList();
}
function closeBabjangHandoffModal() {
  document.getElementById('babjangHandoffModalOverlay').style.display = 'none';
}
document.getElementById('babjangHandoffOpenBtn').addEventListener('click', openBabjangHandoffModal);
document.getElementById('babjangHandoffCloseBtn').addEventListener('click', closeBabjangHandoffModal);
document.getElementById('babjangHandoffModalOverlay').addEventListener('click', (e) => {
  if (e.target.id === 'babjangHandoffModalOverlay') closeBabjangHandoffModal();
});

async function renderBabjangHandoffList() {
  const wrap = document.getElementById('babjangHandoffList');
  wrap.innerHTML = '<p class="muted">불러오는 중...</p>';

  const allTeamMembers = await getTeamMembers(session.groupKey);
  const members = allTeamMembers.filter(m => m.name !== session.name);

  if (members.length === 0) {
    wrap.innerHTML = '<p class="muted">아직 넘길 수 있는 다른 팀원이 없습니다. (팀원이 한 번 로그인하면 목록에 나타나요)</p>';
    return;
  }

  wrap.innerHTML = members.map(m => `
    <div style="display:flex; justify-content:space-between; align-items:center; padding:7px 0; font-size:13px; border-bottom:1px dashed #eee;">
      <span>${m.name} ${m.isBabjang ? '<span class="badge-special">밥장</span>' : ''}</span>
      <button data-mid="${m.id}" class="handoff-btn">밥장 넘기기</button>
    </div>
  `).join('');

  wrap.querySelectorAll('.handoff-btn').forEach(btn => {
    btn.addEventListener('click', () => handoffBabjang(btn.dataset.mid, allTeamMembers));
  });
}

async function handoffBabjang(targetId, cachedMembers) {
  const members = cachedMembers || await getTeamMembers(session.groupKey);
  const target = members.find(m => m.id === targetId);
  if (!target) return;

  if (!confirm(`밥장 권한을 "${target.name}"님에게 넘기시겠어요?\n넘긴 후에는 본인은 더 이상 밥장이 아니게 됩니다.`)) return;

  if (members.filter(m => m.isBabjang).length >= 2 && !target.isBabjang) {
    alert('이 팀은 이미 밥장 2명이 지정되어 있어 넘길 수 없어요. 총괄관리자에게 문의해주세요.');
    return;
  }

  const me = members.find(m => m.name === session.name);
  try {
    if (me) await setMemberBabjang(me.id, false);
    await setMemberBabjang(target.id, true);
  } catch (err) {
    console.error(err);
    alert('넘기는 중 문제가 발생했어요. 잠시 후 다시 시도해주세요.');
    return;
  }

  session.isBabjang = false;
  setCookie('sikgwon_session', JSON.stringify(session), 90);

  alert(`밥장 권한이 "${target.name}"님에게 넘어갔어요.`);
  closeBabjangHandoffModal();
  document.getElementById('toAdminBtn').style.display = 'none';
  document.getElementById('whoName').textContent = session.name;
  showScreen('screen-main');
}

/* ============ 밥장: 우리 팀 식당 관리 ============ */
function populateDongFilter() {
  document.getElementById('newRestaurantDong').innerHTML = DONG_LIST.map(d => `<option value="${d}">${d}</option>`).join('');
  document.getElementById('bulkRestaurantDong').innerHTML = DONG_LIST.map(d => `<option value="${d}">${d}</option>`).join('');

  const sel = document.getElementById('dongFilterSelect');
  const dongsInUse = [...new Set(restaurantsCache.map(r => r.dong))];
  const dongs = DONG_LIST.filter(d => dongsInUse.includes(d))
    .concat(dongsInUse.filter(d => !DONG_LIST.includes(d))); // 목록에 없는 동은 뒤에 붙임
  sel.innerHTML = `<option value="__all__">전체 동</option>` + dongs.map(d => `<option value="${d}">${d}</option>`).join('');
  sel.onchange = renderTeamRestaurantChecklist;
}

let restaurantDeleteModeActive = false;

function renderTeamRestaurantChecklist() {
  const wrap = document.getElementById('teamRestaurantChecklist');
  const dongFilter = document.getElementById('dongFilterSelect').value;

  const list = sortedByDongThenName(
    dongFilter === '__all__' ? restaurantsCache : restaurantsCache.filter(r => r.dong === dongFilter)
  );

  if (list.length === 0) {
    wrap.innerHTML = '<p class="muted" style="padding:6px 4px;">해당 동에 등록된 식당이 없습니다.</p>';
    syncSelectAllState([]);
    return;
  }

  wrap.innerHTML = `<div class="checklist-grid">` + list.map(r => `
    <div class="checklist-item">
      <label>
        <input type="checkbox" data-rid="${r.id}" ${teamEnabledIds.has(r.id) ? 'checked' : ''}>
        <span>${r.name} <span style="color:#999; font-size:11px;">(${r.dong})</span></span>
      </label>
      ${restaurantDeleteModeActive ? `<button class="restaurant-delete-btn" data-rid="${r.id}" data-rname="${r.name}" title="식당 삭제">✕</button>` : ''}
    </div>
  `).join('') + `</div>`;

  wrap.querySelectorAll('input[type=checkbox]').forEach(cb => {
    cb.addEventListener('change', async () => {
      if (cb.checked) teamEnabledIds.add(cb.dataset.rid);
      else teamEnabledIds.delete(cb.dataset.rid);
      syncSelectAllState(list);
      try { await saveTeamEnabledIds(session.groupKey, teamEnabledIds); }
      catch (err) { console.error(err); alert('저장 중 문제가 발생했어요.'); }
    });
  });

  wrap.querySelectorAll('.restaurant-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteRestaurant(btn.dataset.rid, btn.dataset.rname));
  });

  syncSelectAllState(list);
}

// 식당 삭제는 되돌릴 수 없는 중요한 작업이라 확인 비밀번호를 한 번 더 물어봄
const RESTAURANT_DELETE_PASSWORD = "최병주사마";

document.getElementById('toggleDeleteModeBtn').addEventListener('click', () => {
  if (restaurantDeleteModeActive) {
    // 이미 켜져있으면 그냥 끄기 (다시 물어볼 필요 없음)
    restaurantDeleteModeActive = false;
    document.getElementById('toggleDeleteModeBtn').textContent = '식당삭제';
    renderTeamRestaurantChecklist();
    return;
  }

  const pw = prompt('식당 삭제는 중요한 작업이라 확인 비밀번호가 필요해요.');
  if (pw === null) return; // 취소
  if (pw !== RESTAURANT_DELETE_PASSWORD) { alert('비밀번호가 일치하지 않습니다.'); return; }

  restaurantDeleteModeActive = true;
  document.getElementById('toggleDeleteModeBtn').textContent = '삭제 모드 끄기';
  renderTeamRestaurantChecklist();
});

async function deleteRestaurant(restaurantId, restaurantName) {
  if (!confirm(`정말 "${restaurantName}"을(를) 삭제할까요?\n(과거 식권 사용 기록은 그대로 남아있고, 식당 목록에서만 사라져요)`)) return;

  try {
    await deleteRestaurantDoc(restaurantId);
    restaurantsCache = restaurantsCache.filter(r => r.id !== restaurantId);
    teamEnabledIds.delete(restaurantId);
    await saveTeamEnabledIds(session.groupKey, teamEnabledIds);
    await removeRestaurantFromAllTeams(restaurantId); // 다른 팀 구독 목록에도 죽은 참조가 안 남도록 정리

    populateDongFilter();
    renderTeamRestaurantChecklist();
    renderRestaurantList();
    alert(`"${restaurantName}" 삭제했어요.`);
  } catch (err) {
    console.error(err);
    alert('삭제 중 문제가 발생했어요.');
  }
}

function syncSelectAllState(list) {
  const selectAll = document.getElementById('selectAllCheck');
  selectAll.checked = list.length > 0 && list.every(r => teamEnabledIds.has(r.id));
}

document.getElementById('selectAllCheck').addEventListener('change', async (e) => {
  const dongFilter = document.getElementById('dongFilterSelect').value;
  const list = dongFilter === '__all__' ? restaurantsCache : restaurantsCache.filter(r => r.dong === dongFilter);
  list.forEach(r => { if (e.target.checked) teamEnabledIds.add(r.id); else teamEnabledIds.delete(r.id); });
  try { await saveTeamEnabledIds(session.groupKey, teamEnabledIds); }
  catch (err) { console.error(err); alert('저장 중 문제가 발생했어요.'); }
  renderTeamRestaurantChecklist();
});

document.getElementById('addRestaurantBtn').addEventListener('click', async () => {
  const nameInput = document.getElementById('newRestaurantName');
  const dongSelect = document.getElementById('newRestaurantDong');
  const phoneInput = document.getElementById('newRestaurantPhone');
  const name = nameInput.value.trim();
  const dong = dongSelect.value;
  const phone = phoneInput.value.trim();

  if (!name || !dong) { alert('식당 이름을 입력하고 동을 선택해주세요.'); return; }

  const exists = restaurantsCache.some(r => r.name === name && r.dong === dong);
  if (exists) { alert('이미 같은 이름/동네의 식당이 등록되어 있어요.'); return; }

  const addBtn = document.getElementById('addRestaurantBtn');
  addBtn.disabled = true;
  try {
    const newId = await addRestaurantDoc(name, dong, phone);
    restaurantsCache.push({ id: newId, name, dong, phone: phone || '', qrImageUrl: null });

    // 새로 추가한 밥장의 팀에는 자동으로 활성화
    teamEnabledIds.add(newId);
    await saveTeamEnabledIds(session.groupKey, teamEnabledIds);

    nameInput.value = '';
    phoneInput.value = '';
    populateDongFilter();
    document.getElementById('dongFilterSelect').value = '__all__'; // 방금 추가한 식당이 필터에 가려 안 보이는 일이 없도록
    renderTeamRestaurantChecklist();
  } catch (err) {
    console.error(err);
    alert('식당 추가 중 문제가 발생했어요.');
  } finally {
    addBtn.disabled = false;
  }
});

document.getElementById('bulkAddRestaurantBtn').addEventListener('click', async () => {
  const textarea = document.getElementById('bulkRestaurantNames');
  const dong = document.getElementById('bulkRestaurantDong').value;
  const resultNote = document.getElementById('bulkAddResult');

  const names = [...new Set(
    textarea.value.split('\n').map(n => n.trim()).filter(n => n.length > 0)
  )]; // 줄바꿈 기준으로 나누고, 빈 줄/중복 줄 제거

  if (names.length === 0) { alert('추가할 식당 이름을 한 줄에 하나씩 입력해주세요.'); return; }
  if (!dong) { alert('동을 선택해주세요.'); return; }

  const bulkBtn = document.getElementById('bulkAddRestaurantBtn');
  bulkBtn.disabled = true;

  let added = 0, skipped = 0, failed = 0;
  for (const name of names) {
    const exists = restaurantsCache.some(r => r.name === name && r.dong === dong);
    if (exists) { skipped++; continue; }

    resultNote.textContent = `등록 중... (${added + skipped + failed + 1}/${names.length}) ${name}`;
    try {
      const newId = await addRestaurantDoc(name, dong, '');
      restaurantsCache.push({ id: newId, name, dong, phone: '', qrImageUrl: null });
      teamEnabledIds.add(newId); // 추가한 밥장의 팀에는 자동으로 활성화
      added++;
    } catch (err) {
      console.error(`실패: ${name}`, err);
      failed++;
    }
  }

  try {
    await saveTeamEnabledIds(session.groupKey, teamEnabledIds); // 여러 건이라 마지막에 한 번만 저장
  } catch (err) {
    console.error(err);
  }

  resultNote.textContent = `완료 — 추가 ${added}개, 이미 있어서 건너뜀 ${skipped}개${failed > 0 ? `, 실패 ${failed}개` : ''}`;
  textarea.value = '';
  populateDongFilter();
  document.getElementById('dongFilterSelect').value = '__all__';
  renderTeamRestaurantChecklist();
  bulkBtn.disabled = false;
});

/* ============ 밥장 관리 화면: 인원 x 식당 기준 집계 ============ */
document.getElementById('toAdminBtn').addEventListener('click', async () => {
  document.getElementById('adminTeamLabel').textContent = formatOrgLabel(session.dept, session.team);
  populateDongFilter();
  renderTeamRestaurantChecklist();

  document.getElementById('adminTableBody').innerHTML = '<tr><td>불러오는 중...</td></tr>';
  showScreen('screen-admin');

  try {
    await loadTeamAllEntries(session.groupKey);
    teamMembersCache = await getTeamMembers(session.groupKey);
  } catch (err) {
    console.error(err);
    alert('식권 기록을 불러오는 중 문제가 발생했어요.');
  }
  populateAdminMonths();
  renderAdminTable();
});
document.getElementById('backToMainBtn').addEventListener('click', () => {
  renderRestaurantList(); // 밥장 관리 화면에서 바꾼 '우리 팀 식당' 설정을 메인 화면에 반영
  renderCalendar();
  showScreen('screen-main');
});

function populateAdminMonths() {
  const sel = document.getElementById('adminMonthSelect');
  const months = teamAllEntries.map(e => e.date.slice(0,7));
  const uniqueMonths = [...new Set(months)].sort();
  if (uniqueMonths.length === 0) uniqueMonths.push(monthPrefix(currentYear, currentMonth));
  sel.innerHTML = uniqueMonths.map(m => `<option value="${m}">${m}</option>`).join('');
  sel.value = monthPrefix(currentYear, currentMonth);
  sel.onchange = renderAdminTable;
}

function restaurantLabel(id) {
  if (id === UNKNOWN_ID) return '🤷 기억안남';
  return restaurantsCache.find(r => r.id === id)?.name || '알수없음';
}

// 식당(행) x 팀원(열) 매트릭스 생성 - 팀 전체 명단/활성화된 식당 전체를 기준으로 하고, 사용량 0인 것도 행/열에 포함시킴
function buildAdminMatrix(monthSel) {
  const monthLogs = teamAllEntries.filter(e => e.date.startsWith(monthSel));

  const members = teamMembersCache.length > 0
    ? teamMembersCache.map(m => m.name).sort((a, b) => a.localeCompare(b, 'ko'))
    : [...new Set(monthLogs.map(e => e.member))].sort((a, b) => a.localeCompare(b, 'ko'));

  const enabledRestaurants = sortedByDongThenName(restaurantsCache.filter(r => teamEnabledIds.has(r.id)));
  const restaurantIds = enabledRestaurants.map(r => r.id);
  if (monthLogs.some(e => e.restaurantId === UNKNOWN_ID)) restaurantIds.push(UNKNOWN_ID); // 기억안남은 실제 사용이 있을 때만 행으로 추가

  const matrix = {}; // matrix[restaurantId][member] = count
  restaurantIds.forEach(rid => { matrix[rid] = {}; members.forEach(m => matrix[rid][m] = 0); });
  monthLogs.forEach(e => {
    if (!matrix[e.restaurantId]) return; // 팀에서 비활성화된 식당의 과거 기록은 매트릭스에서 제외
    if (!(e.member in matrix[e.restaurantId])) return; // 팀 명단에 없는(탈퇴 등) 사용자 기록도 방어적으로 제외
    matrix[e.restaurantId][e.member] += e.count;
  });

  const rowTotals = {};
  restaurantIds.forEach(rid => { rowTotals[rid] = members.reduce((s,m) => s + matrix[rid][m], 0); });
  const colTotals = {};
  members.forEach(m => { colTotals[m] = restaurantIds.reduce((s,rid) => s + matrix[rid][m], 0); });
  const grandTotal = Object.values(colTotals).reduce((s,v) => s+v, 0);

  return { members, restaurantIds, matrix, rowTotals, colTotals, grandTotal };
}

function renderAdminTable() {
  const monthSel = document.getElementById('adminMonthSelect').value;
  const { members, restaurantIds, matrix, rowTotals, colTotals, grandTotal } = buildAdminMatrix(monthSel);

  const thead = document.getElementById('adminTableHead');
  const tbody = document.getElementById('adminTableBody');
  const tfoot = document.getElementById('adminTableFoot');

  if (members.length === 0) {
    thead.innerHTML = '<tr><th>구분</th><th>합계</th><th>금액</th></tr>';
    tbody.innerHTML = '<tr><td colspan="3" style="color:#999;">등록된 팀원이 없습니다.</td></tr>';
    tfoot.innerHTML = '';
    window._adminMatrix = null;
    return;
  }
  if (restaurantIds.length === 0) {
    thead.innerHTML = '<tr><th>구분</th><th>합계</th><th>금액</th></tr>';
    tbody.innerHTML = '<tr><td colspan="3" style="color:#999;">우리 팀에 활성화된 식당이 없습니다. 위 "우리 팀 식당 관리"에서 체크해주세요.</td></tr>';
    tfoot.innerHTML = '';
    window._adminMatrix = null;
    return;
  }

  thead.innerHTML = `<tr><th>구분</th>${members.map(m => `<th>${m}</th>`).join('')}<th>합계</th><th>금액</th></tr>`;

  tbody.innerHTML = restaurantIds.map(rid => {
    const cells = members.map(m => `<td>${matrix[rid][m]}</td>`).join('');
    const clickable = rid !== UNKNOWN_ID;
    const cellStyle = clickable ? 'style="cursor:pointer; text-decoration:underline dotted; color:#245;"' : '';
    const amount = (rowTotals[rid] * AVG_PRICE).toLocaleString() + '원';
    return `<tr><td ${cellStyle} data-rid="${rid}" class="restaurant-cell">${restaurantLabel(rid)}</td>${cells}<td><b>${rowTotals[rid]}</b></td><td>${amount}</td></tr>`;
  }).join('');

  tbody.querySelectorAll('.restaurant-cell').forEach(td => {
    td.addEventListener('click', () => {
      if (td.dataset.rid !== UNKNOWN_ID) openQrModal(td.dataset.rid);
    });
  });

  const grandAmount = (grandTotal * AVG_PRICE).toLocaleString() + '원';
  tfoot.innerHTML = `<tr><td>합계</td>${members.map(m => `<td>${colTotals[m]}</td>`).join('')}<td>${grandTotal}</td><td>${grandAmount}</td></tr>`;

  window._adminMatrix = { members, restaurantIds, matrix, rowTotals, colTotals, grandTotal, monthSel };
}

async function exportAdminExcel() {
  const m = window._adminMatrix;
  if (!m || m.members.length === 0) { alert('데이터가 없습니다.'); return; }

  const exportBtn = document.getElementById('exportExcelBtn');
  exportBtn.disabled = true;

  try {
    const monthNum = parseInt(m.monthSel.split('-')[1], 10); // "2026-08" -> 8
    const PAYMENT_METHOD = '제로페이Biz'; // 지금은 결제방법을 한 종류로만 다루고 있어 고정값으로 둠

    const headerLabels = ['연 번', '식  당  명', '금    액', '정산방법', ...m.members, '식 합계', '전화번호'];
    const colCount = headerLabels.length;
    const amountColIdx = 3;       // "금액" 열 (1-indexed)
    const sikTotalColIdx = colCount - 1; // "식 합계" 열

    const thinBorder = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' }
    };
    // 원본 양식과 동일한 회계 표시형식 (0은 "-"로, 통화기호 없이 천단위 콤마)
    const ACCOUNTING_FMT = '_-* #,##0_-;-* #,##0_-;_-* "-"_-;_-@_-';

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('사용처별 내역');

    // 제목 행 - A~D열까지만 병합, 굵게, 가운데 정렬
    sheet.mergeCells(1, 1, 1, 4);
    const titleCell = sheet.getCell(1, 1);
    titleCell.value = `${monthNum}월  급식비 사용내역`;
    titleCell.font = { bold: true, size: 16, name: '맑은 고딕' };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 28;

    // 2행은 원본 양식처럼 빈 줄로 비워둠

    // 헤더 행(3행) - 굵게, 흰 글씨, 회색 배경, 테두리
    const headerRow = sheet.getRow(3);
    headerLabels.forEach((label, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = label;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: '맑은 고딕', size: 11 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF969696' } };
      cell.border = thinBorder;
    });
    headerRow.height = 16.5;

    // 데이터 행 - 테두리(기본 실선), 식당명은 가운데 정렬, 금액은 회계 서식, 식합계는 천단위 콤마
    m.restaurantIds.forEach((rid, idx) => {
      const rowIdx = 4 + idx;
      const restaurant = restaurantsCache.find(r => r.id === rid);
      const label = restaurantLabel(rid);
      const amount = m.rowTotals[rid] * AVG_PRICE;
      const rowValues = [
        idx + 1, label, amount, rid === UNKNOWN_ID ? '' : PAYMENT_METHOD,
        ...m.members.map(mem => m.matrix[rid][mem] || ''), // 0은 원본 양식처럼 빈 칸으로
        m.rowTotals[rid],
        (restaurant && restaurant.phone) || ''
      ];
      const row = sheet.getRow(rowIdx);
      rowValues.forEach((val, i) => {
        const col = i + 1;
        const cell = row.getCell(col);
        cell.value = val;
        cell.border = thinBorder;
        cell.font = { name: '맑은 고딕', size: 11 };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        if (col === amountColIdx + 1) cell.numFmt = ACCOUNTING_FMT;
        else if (col === sikTotalColIdx + 1) cell.numFmt = '#,##0';
      });
      row.height = 16.5;
    });

    // 소계 행 - 연번+식당명 병합, 배경색(살구색), 금액 회계 서식
    const subtotalRowIdx = 4 + m.restaurantIds.length;
    sheet.mergeCells(subtotalRowIdx, 1, subtotalRowIdx, 2);
    const subtotalValues = [
      `소계(${PAYMENT_METHOD})`, '',
      m.grandTotal * AVG_PRICE, '',
      ...m.members.map(mem => m.colTotals[mem]),
      m.grandTotal, ''
    ];
    const subtotalRow = sheet.getRow(subtotalRowIdx);
    subtotalValues.forEach((val, i) => {
      const col = i + 1;
      const cell = subtotalRow.getCell(col);
      cell.value = val;
      cell.border = thinBorder;
      cell.font = { name: '맑은 고딕', size: 11, bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCC99' } };
      cell.alignment = { horizontal: col === 1 ? 'left' : 'center', vertical: 'middle' };
      if (col === amountColIdx + 1) cell.numFmt = ACCOUNTING_FMT;
    });
    subtotalRow.height = 16.5;

    // 열 너비
    sheet.getColumn(1).width = 6;
    sheet.getColumn(2).width = 18;
    sheet.getColumn(3).width = 10;
    sheet.getColumn(4).width = 12;
    m.members.forEach((_, i) => { sheet.getColumn(5 + i).width = 8; });
    sheet.getColumn(sikTotalColIdx + 1).width = 8;
    sheet.getColumn(colCount).width = 14;

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const orgLabelForFile = session.team ? `${session.dept}_${session.team}` : session.dept;

    const a = document.createElement('a');
    a.href = url;
    a.download = `식권정산_${orgLabelForFile}_${m.monthSel}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error(err);
    alert('엑셀 생성 중 문제가 발생했어요.');
  } finally {
    exportBtn.disabled = false;
  }
}
document.getElementById('exportExcelBtn').addEventListener('click', exportAdminExcel);


/* ============ 밥장: 팀원 식권 수정 ============ */
function openMemberEditModal() {
  const m = window._adminMatrix;
  const members = (m && m.members) || [];
  if (members.length === 0) { alert('이번 달 기록이 있는 팀원이 없어요.'); return; }

  const select = document.getElementById('memberEditSelect');
  select.innerHTML = members.map(name => `<option value="${name}">${name}</option>`).join('');

  document.getElementById('memberEditModalOverlay').style.display = 'flex';
  renderMemberEntryList();
}
function closeMemberEditModal() {
  document.getElementById('memberEditModalOverlay').style.display = 'none';
}
document.getElementById('memberEditOpenBtn').addEventListener('click', openMemberEditModal);
document.getElementById('memberEditCloseBtn').addEventListener('click', closeMemberEditModal);
document.getElementById('memberEditModalOverlay').addEventListener('click', (e) => {
  if (e.target.id === 'memberEditModalOverlay') closeMemberEditModal();
});
document.getElementById('memberEditSelect').addEventListener('change', renderMemberEntryList);

function renderMemberEntryList() {
  const memberName = document.getElementById('memberEditSelect').value;
  const monthSel = document.getElementById('adminMonthSelect').value;
  const wrap = document.getElementById('memberEntryList');

  const entries = teamAllEntries
    .filter(e => e.member === memberName && e.date.startsWith(monthSel))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (entries.length === 0) {
    wrap.innerHTML = '<p class="muted" style="padding:8px 0;">이번 달 입력된 기록이 없습니다.</p>';
    return;
  }

  wrap.innerHTML = entries.map(e => {
    const rName = e.unknown ? '🤷 어디였는지 기억 안남' : restaurantLabel(e.restaurantId);
    const tag = e.special ? '<span class="tag">특별식권</span>' : '';
    return `<div class="entry-row">
      <span class="r-name">${e.date} · ${rName}${tag}</span>
      <span>${e.count}장</span>
      <span class="actions"><button data-id="${e.id}" class="member-entry-edit-btn">수정</button></span>
    </div>`;
  }).join('');

  wrap.querySelectorAll('.member-entry-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const entry = entries.find(e => e.id === btn.dataset.id);
      if (entry) openMemberEntryEditModal(entry);
    });
  });
}

let memberEditTargetEntry = null;

function openMemberEntryEditModal(entry) {
  memberEditTargetEntry = entry;
  const rName = entry.unknown ? '🤷 어디였는지 기억 안남' : restaurantLabel(entry.restaurantId);
  document.getElementById('memberEntryEditTitle').textContent = `${entry.date} · ${rName}`;
  document.getElementById('memberEntryCountInput').value = entry.count;
  document.getElementById('memberEntrySpecialCheck').checked = entry.special;
  document.getElementById('memberEntryEditModalOverlay').style.display = 'flex';
}
function closeMemberEntryEditModal() {
  document.getElementById('memberEntryEditModalOverlay').style.display = 'none';
  memberEditTargetEntry = null;
}
document.getElementById('memberEntryCancelBtn').addEventListener('click', closeMemberEntryEditModal);
document.getElementById('memberEntryEditModalOverlay').addEventListener('click', (e) => {
  if (e.target.id === 'memberEntryEditModalOverlay') closeMemberEntryEditModal();
});

// 방금 수정/삭제한 기록이 "로그인한 나 자신"의 것이었다면, 캘린더에 쓰는 myMonthEntries 캐시도 같이 맞춰줌
function syncMyMonthEntriesAfterAdminEdit(entry, deleted) {
  if (entry.member !== session.name) return;
  if (deleted) {
    myMonthEntries = myMonthEntries.filter(e => e.id !== entry.id);
  } else {
    const mine = myMonthEntries.find(e => e.id === entry.id);
    if (mine) { mine.count = entry.count; mine.special = entry.special; }
  }
}

document.getElementById('memberEntrySaveBtn').addEventListener('click', async () => {
  const count = parseInt(document.getElementById('memberEntryCountInput').value, 10);
  const special = document.getElementById('memberEntrySpecialCheck').checked;
  if (!count || count <= 0) { alert('장수를 올바르게 입력해주세요.'); return; }
  if (!memberEditTargetEntry) return;

  try {
    await updateMealEntryDoc(memberEditTargetEntry.id, { count, special });
    memberEditTargetEntry.count = count;
    memberEditTargetEntry.special = special;
    syncMyMonthEntriesAfterAdminEdit(memberEditTargetEntry, false);
  } catch (err) {
    console.error(err);
    alert('저장 중 문제가 발생했어요.');
    return;
  }

  closeMemberEntryEditModal();
  renderMemberEntryList();
  renderAdminTable();
});

document.getElementById('memberEntryDeleteBtn').addEventListener('click', async () => {
  if (!memberEditTargetEntry) return;
  if (!confirm('이 식권 사용 기록을 삭제할까요?')) return;

  try {
    await deleteMealEntryDoc(memberEditTargetEntry.id);
    teamAllEntries = teamAllEntries.filter(e => e.id !== memberEditTargetEntry.id);
    syncMyMonthEntriesAfterAdminEdit(memberEditTargetEntry, true);
  } catch (err) {
    console.error(err);
    alert('삭제 중 문제가 발생했어요.');
    return;
  }

  closeMemberEntryEditModal();
  renderMemberEntryList();
  renderAdminTable();
});

/* ============ 결제 QR 모달 (밥장 전용, 웹 화면에서만 표시 - 엑셀엔 포함 안 됨) ============ */
// Storage 없이 Firestore 문서(최대 1MB)에 base64로 바로 저장하기 위한 제한값
const QR_MAX_ORIGINAL_MB = 15;   // 업로드 원본 파일 용량 제한
const QR_MAX_DIM = 600;          // 저장 전 리사이즈할 최대 가로/세로(px) - QR은 이 정도면 스캔에 충분함

let qrModalRestaurantId = null;
let qrPendingDataUrl = null;   // 최종 저장될 이미지 (크롭 결과 또는 원본, 리사이즈 완료 상태)
let qrOriginalDataUrl = null;  // 방금 업로드한 원본 파일의 dataURL
let qrSourceImage = null;      // 크롭용 원본 Image 객체
let qrCropScale = 1;
let qrCropRect = null;
let qrCropDragging = false;
let qrCropStartX = 0, qrCropStartY = 0;

// 캔버스를 QR_MAX_DIM 이하로 축소해서 PNG dataURL로 반환 (이미 작으면 그대로)
function canvasToLimitedDataUrl(canvas, maxDim) {
  const { width, height } = canvas;
  if (width <= maxDim && height <= maxDim) {
    return canvas.toDataURL('image/png');
  }
  const scale = maxDim / Math.max(width, height);
  const outCanvas = document.createElement('canvas');
  outCanvas.width = Math.round(width * scale);
  outCanvas.height = Math.round(height * scale);
  outCanvas.getContext('2d').drawImage(canvas, 0, 0, outCanvas.width, outCanvas.height);
  return outCanvas.toDataURL('image/png');
}

function estimateBase64KB(dataUrl) {
  return Math.round((dataUrl.length * 0.75) / 1024); // base64는 원본보다 약 33% 커지는 걸 역산
}

function openQrModal(restaurantId) {
  const r = restaurantsCache.find(x => x.id === restaurantId);
  if (!r) return;

  qrModalRestaurantId = restaurantId;
  qrPendingDataUrl = null;
  resetCropState();

  document.getElementById('qrModalRestaurantName').textContent = `${r.name} (${r.dong})`;
  document.getElementById('qrPhoneInput').value = r.phone || '';
  document.getElementById('qrFileInput').value = '';
  document.getElementById('qrPreviewWrap').style.display = 'block';
  renderQrPreview(r.qrImageUrl);

  document.getElementById('qrModalOverlay').style.display = 'flex';
}

function resetCropState() {
  qrOriginalDataUrl = null;
  qrSourceImage = null;
  qrCropRect = null;
  document.getElementById('qrCropSection').style.display = 'none';
  document.getElementById('qrCropSelection').style.display = 'none';
  document.getElementById('qrSizeNote')?.remove();
}

function renderQrPreview(url) {
  const img = document.getElementById('qrPreviewImg');
  const empty = document.getElementById('qrEmptyNote');
  if (url) {
    img.src = url;
    img.style.display = 'inline-block';
    empty.style.display = 'none';
  } else {
    img.style.display = 'none';
    empty.style.display = 'block';
  }
}

// 파일 선택 -> 바로 저장하지 않고, 크롭할 수 있도록 캔버스에 띄움
document.getElementById('qrFileInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const fileMB = file.size / (1024 * 1024);
  if (fileMB > QR_MAX_ORIGINAL_MB) {
    alert(`파일이 너무 커요 (${fileMB.toFixed(1)}MB). ${QR_MAX_ORIGINAL_MB}MB 이하 이미지로 다시 선택해주세요.`);
    e.target.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = (ev) => {
    qrOriginalDataUrl = ev.target.result;
    const img = new Image();
    img.onload = () => { qrSourceImage = img; setupCropCanvas(img); };
    img.src = qrOriginalDataUrl;
  };
  reader.readAsDataURL(file);
});

function setupCropCanvas(img) {
  const maxDim = 280;
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  qrCropScale = scale;

  const canvas = document.getElementById('qrCropCanvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  qrCropRect = null;
  document.getElementById('qrCropSelection').style.display = 'none';
  document.getElementById('qrCropSection').style.display = 'block';
  document.getElementById('qrPreviewWrap').style.display = 'none'; // 크롭 끝날 때까지 아래 미리보기는 숨김
}

function updateSelectionBox() {
  const sel = document.getElementById('qrCropSelection');
  if (!qrCropRect) { sel.style.display = 'none'; return; }
  sel.style.display = 'block';
  sel.style.left = qrCropRect.x + 'px';
  sel.style.top = qrCropRect.y + 'px';
  sel.style.width = qrCropRect.w + 'px';
  sel.style.height = qrCropRect.h + 'px';
}

function cropPointerPos(e, canvas) {
  const rect = canvas.getBoundingClientRect();
  const cx = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
  const cy = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
  return { x: Math.max(0, Math.min(canvas.width, cx)), y: Math.max(0, Math.min(canvas.height, cy)) };
}

const qrCropCanvasEl = document.getElementById('qrCropCanvas');
function cropStart(e) {
  const p = cropPointerPos(e, qrCropCanvasEl);
  qrCropDragging = true;
  qrCropStartX = p.x; qrCropStartY = p.y;
  qrCropRect = { x: p.x, y: p.y, w: 0, h: 0 };
  updateSelectionBox();
  e.preventDefault();
}
function cropMove(e) {
  if (!qrCropDragging) return;
  const p = cropPointerPos(e, qrCropCanvasEl);
  qrCropRect = {
    x: Math.min(qrCropStartX, p.x), y: Math.min(qrCropStartY, p.y),
    w: Math.abs(p.x - qrCropStartX), h: Math.abs(p.y - qrCropStartY)
  };
  updateSelectionBox();
  e.preventDefault();
}
function cropEnd() { qrCropDragging = false; }

qrCropCanvasEl.addEventListener('mousedown', cropStart);
qrCropCanvasEl.addEventListener('mousemove', cropMove);
window.addEventListener('mouseup', cropEnd);
qrCropCanvasEl.addEventListener('touchstart', cropStart);
qrCropCanvasEl.addEventListener('touchmove', cropMove);
window.addEventListener('touchend', cropEnd);

function finishCropUI(dataUrl) {
  qrPendingDataUrl = dataUrl;
  document.getElementById('qrCropSection').style.display = 'none';
  document.getElementById('qrPreviewWrap').style.display = 'block';
  renderQrPreview(dataUrl);

  document.getElementById('qrSizeNote')?.remove(); // 이전에 붙여둔 용량 안내가 있으면 제거하고 새로 표시
  const kb = estimateBase64KB(dataUrl);
  document.getElementById('qrPreviewWrap').insertAdjacentHTML('beforeend',
    `<p class="muted" id="qrSizeNote" style="margin-top:6px;">저장 용량: 약 ${kb}KB (자동으로 ${QR_MAX_DIM}px 이하로 줄였어요)</p>`);
}

document.getElementById('qrCropApplyBtn').addEventListener('click', () => {
  if (!qrCropRect || qrCropRect.w < 5 || qrCropRect.h < 5) {
    alert('잘라낼 영역을 이미지 위에서 드래그해 선택해주세요.');
    return;
  }
  const sx = qrCropRect.x / qrCropScale;
  const sy = qrCropRect.y / qrCropScale;
  const sw = qrCropRect.w / qrCropScale;
  const sh = qrCropRect.h / qrCropScale;

  const outCanvas = document.createElement('canvas');
  outCanvas.width = Math.round(sw);
  outCanvas.height = Math.round(sh);
  outCanvas.getContext('2d').drawImage(qrSourceImage, sx, sy, sw, sh, 0, 0, sw, sh);

  finishCropUI(canvasToLimitedDataUrl(outCanvas, QR_MAX_DIM));
});

document.getElementById('qrUseFullBtn').addEventListener('click', () => {
  const fullCanvas = document.createElement('canvas');
  fullCanvas.width = qrSourceImage.width;
  fullCanvas.height = qrSourceImage.height;
  fullCanvas.getContext('2d').drawImage(qrSourceImage, 0, 0);

  finishCropUI(canvasToLimitedDataUrl(fullCanvas, QR_MAX_DIM));
});

function closeQrModal() {
  document.getElementById('qrModalOverlay').style.display = 'none';
  qrModalRestaurantId = null;
  qrPendingDataUrl = null;
  resetCropState();
}

document.getElementById('qrCancelBtn').addEventListener('click', closeQrModal);
document.getElementById('qrModalOverlay').addEventListener('click', (e) => {
  if (e.target.id === 'qrModalOverlay') closeQrModal();
});

document.getElementById('qrSaveBtn').addEventListener('click', async () => {
  const r = restaurantsCache.find(x => x.id === qrModalRestaurantId);
  if (!r) { closeQrModal(); return; }

  const patch = { phone: document.getElementById('qrPhoneInput').value.trim() };
  if (qrPendingDataUrl) patch.qrImageUrl = qrPendingDataUrl; // 새로 업로드한 QR이 있으면 같이 저장

  try {
    await updateRestaurantFields(r.id, patch); // Firestore에 저장 - 다른 팀 밥장도 같은 정보를 보게 됨
  } catch (err) {
    console.error(err);
    alert('저장 중 문제가 발생했어요.');
    return;
  }
  closeQrModal();
});

document.getElementById('qrDeleteBtn').addEventListener('click', async () => {
  const r = restaurantsCache.find(x => x.id === qrModalRestaurantId);
  if (!r) return;
  if (!confirm('이 식당의 결제 QR을 삭제할까요?')) return;
  try {
    await updateRestaurantFields(r.id, { qrImageUrl: null });
  } catch (err) {
    console.error(err);
    alert('삭제 중 문제가 발생했어요.');
    return;
  }
  qrPendingDataUrl = null;
  renderQrPreview(null);
});
