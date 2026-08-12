/* ============ 화면 전환 헬퍼 ============ */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function setCookie(name, value, days) {
  try {
    const d = new Date();
    d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${encodeURIComponent(value)};expires=${d.toUTCString()};path=/`;
  } catch (e) { console.warn("쿠키 저장 실패:", e); }
}

// "부서::팀" 형태의 groupKey를 { dept, team }으로 분해 (팀이 없으면 team: null)
function parseGroupKey(groupKey) {
  const idx = groupKey.indexOf('::');
  if (idx === -1) return { dept: groupKey, team: null };
  return { dept: groupKey.slice(0, idx), team: groupKey.slice(idx + 2) };
}

// 총괄관리자가 팀원 이름을 클릭하면, 그 팀원 세션으로 바꿔서 메인 화면으로 이동
function loginAsMember(memberId) {
  const member = allMembersCache.find(m => m.id === memberId);
  if (!member) return;
  if (!confirm(`"${member.name}"님으로 로그인할까요?\n메인 화면으로 이동합니다.`)) return;

  const { dept, team } = parseGroupKey(member.team);
  const session = { dept, team, groupKey: member.team, name: member.name, isBabjang: !!member.isBabjang };
  setCookie('sikgwon_session', JSON.stringify(session), 90);
  window.location.href = 'index.html';
}

/* ============ 접속 비밀번호 게이트 ============ */
const SUPER_ADMIN_PASSWORD = "chlqudwntkak";

async function enterSuperAdmin() {
  showScreen('screen-superadmin');
  document.getElementById('superAdminTableBody').innerHTML = '<tr><td colspan="4">불러오는 중...</td></tr>';
  try {
    allMembersCache = await loadAllMembers();
  } catch (err) {
    console.error(err);
    alert(`팀원 목록을 불러오는 중 문제가 발생했어요.\n\n[에러 내용]\n${err.code || ''} ${err.message || err}`);
    allMembersCache = [];
  }
  renderSuperAdminTable();
}

document.getElementById('adminGateBtn').addEventListener('click', () => {
  const pw = document.getElementById('adminGatePassword').value;
  if (pw !== SUPER_ADMIN_PASSWORD) { alert('비밀번호가 일치하지 않습니다.'); return; }
  enterSuperAdmin();
});
document.getElementById('adminGatePassword').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); document.getElementById('adminGateBtn').click(); }
});

/* ============ 총괄관리자: 팀원 관리 (부서 이동 / 삭제 / 밥장 지정) ============ */
let allMembersCache = [];

document.getElementById('superAdminSearchInput').addEventListener('input', renderSuperAdminTable);

// team(groupKey)을 "부서 · 팀" 형태로 보기 좋게 표시 ("부서::팀" -> "부서 · 팀", 팀 없으면 부서만)
function formatGroupKeyLabel(groupKey) {
  if (!groupKey) return '-';
  const idx = groupKey.indexOf('::');
  return idx === -1 ? groupKey : `${groupKey.slice(0, idx)} · ${groupKey.slice(idx + 2)}`;
}

function renderSuperAdminTable() {
  const keyword = document.getElementById('superAdminSearchInput').value.trim().toLowerCase();
  const tbody = document.getElementById('superAdminTableBody');

  const filtered = allMembersCache.filter(m => {
    if (!keyword) return true;
    return m.name.toLowerCase().includes(keyword) || formatGroupKeyLabel(m.team).toLowerCase().includes(keyword);
  }).sort((a, b) => (a.team || '').localeCompare(b.team || '', 'ko') || a.name.localeCompare(b.name, 'ko'));

  document.getElementById('superAdminCountNote').textContent = `전체 ${allMembersCache.length}명 중 ${filtered.length}명 표시`;

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="color:#999;">해당하는 팀원이 없습니다.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(m => `
    <tr>
      <td><a href="#" class="superadmin-login-as" data-mid="${m.id}" style="color:#245; text-decoration:underline dotted;">${m.name}</a></td>
      <td>${formatGroupKeyLabel(m.team)}</td>
      <td style="text-align:center;">
        <input type="checkbox" class="superadmin-babjang-check" data-mid="${m.id}" ${m.isBabjang ? 'checked' : ''}>
      </td>
      <td style="white-space:nowrap;">
        <button class="superadmin-move-btn" data-mid="${m.id}">부서이동</button>
        <button class="superadmin-delete-btn" data-mid="${m.id}">삭제</button>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.superadmin-login-as').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      loginAsMember(a.dataset.mid);
    });
  });

  tbody.querySelectorAll('.superadmin-babjang-check').forEach(cb => {
    cb.addEventListener('change', async () => {
      const member = allMembersCache.find(m => m.id === cb.dataset.mid);
      if (!member) return;
      cb.disabled = true;
      try {
        await setMemberBabjang(member.id, cb.checked);
        member.isBabjang = cb.checked;
      } catch (err) {
        console.error(err);
        alert('저장 중 문제가 발생했어요.');
        cb.checked = !cb.checked;
      } finally {
        cb.disabled = false;
      }
    });
  });

  tbody.querySelectorAll('.superadmin-move-btn').forEach(btn => {
    btn.addEventListener('click', () => openMoveMemberModal(btn.dataset.mid));
  });

  tbody.querySelectorAll('.superadmin-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteMemberFromSuperAdmin(btn.dataset.mid));
  });
}

async function deleteMemberFromSuperAdmin(memberId) {
  const member = allMembersCache.find(m => m.id === memberId);
  if (!member) return;
  if (!confirm(`"${member.name}" (${formatGroupKeyLabel(member.team)})님을 삭제할까요?\n(과거 식권 사용 기록은 그대로 남아있고, 로그인 계정만 삭제돼요. 재로그인하면 새 비밀번호로 다시 등록할 수 있어요.)`)) return;

  try {
    await deleteMemberDoc(memberId);
    allMembersCache = allMembersCache.filter(m => m.id !== memberId);
    renderSuperAdminTable();
  } catch (err) {
    console.error(err);
    alert('삭제 중 문제가 발생했어요.');
  }
}

/* ---- 부서 이동 모달 ---- */
let moveMemberTarget = null;
const moveMemberDeptSelect = document.getElementById('moveMemberDeptSelect');
const moveMemberTeamSelect = document.getElementById('moveMemberTeamSelect');
const moveMemberTeamField = document.getElementById('moveMemberTeamField');

moveMemberDeptSelect.innerHTML = DEPARTMENT_LIST.map(d => `<option value="${d}">${d}</option>`).join('');

function populateMoveMemberTeamOptions(dept) {
  const teams = TEAMS_BY_DEPT[dept];
  if (!teams || teams.length === 0) {
    moveMemberTeamField.style.display = 'none';
    moveMemberTeamSelect.innerHTML = '';
    return;
  }
  moveMemberTeamField.style.display = 'block';
  moveMemberTeamSelect.innerHTML = teams.map(t => `<option value="${t}">${t}</option>`).join('');
}
moveMemberDeptSelect.addEventListener('change', (e) => populateMoveMemberTeamOptions(e.target.value));

function openMoveMemberModal(memberId) {
  const member = allMembersCache.find(m => m.id === memberId);
  if (!member) return;
  moveMemberTarget = member;

  document.getElementById('moveMemberTitle').textContent = `"${member.name}" 부서 이동 (현재: ${formatGroupKeyLabel(member.team)})`;
  moveMemberDeptSelect.value = DEPARTMENT_LIST[0];
  populateMoveMemberTeamOptions(moveMemberDeptSelect.value);

  document.getElementById('moveMemberModalOverlay').style.display = 'flex';
}
function closeMoveMemberModal() {
  document.getElementById('moveMemberModalOverlay').style.display = 'none';
  moveMemberTarget = null;
}
document.getElementById('moveMemberCancelBtn').addEventListener('click', closeMoveMemberModal);
document.getElementById('moveMemberModalOverlay').addEventListener('click', (e) => {
  if (e.target.id === 'moveMemberModalOverlay') closeMoveMemberModal();
});

document.getElementById('moveMemberConfirmBtn').addEventListener('click', async () => {
  if (!moveMemberTarget) return;
  const dept = moveMemberDeptSelect.value;
  const hasTeam = moveMemberTeamField.style.display !== 'none';
  const team = hasTeam ? moveMemberTeamSelect.value : null;
  const newGroupKey = makeGroupKey(dept, team);

  const confirmBtn = document.getElementById('moveMemberConfirmBtn');
  confirmBtn.disabled = true;
  try {
    const result = await moveMemberToTeam(moveMemberTarget, newGroupKey);
    allMembersCache = allMembersCache.filter(m => m.id !== moveMemberTarget.id);
    allMembersCache.push({ ...moveMemberTarget, id: result.newDocId, team: newGroupKey });
    closeMoveMemberModal();
    renderSuperAdminTable();
    alert(`이동 완료 (식권 기록 ${result.movedUsageCount}건도 같이 옮겨졌어요)`);
  } catch (err) {
    console.error(err);
    alert(err.message || '이동 중 문제가 발생했어요.');
  } finally {
    confirmBtn.disabled = false;
  }
});
