![홍익밥장 프로젝트 표지](docs/cover.svg)

# 홍익밥장 · Babjang

**팀의 식권 사용 기록과 월별 현황을 한곳에서.**

홍익밥장은 식권 사용 기록, 식당 목록, 팀별 관리를 위한 JavaScript·Firebase 웹앱입니다.

`JavaScript` · `Firebase` · `Firestore`

> **운영 전 보안 정리가 필요합니다.** 이 저장소에서 서버용 서비스 계정 개인키 파일이 확인되었습니다. 공개된 키는 발급처에서 폐기·재발급하고, 코드와 기록에서 제거해야 합니다. 파일 삭제만으로 이미 공개된 키가 무효화되지는 않습니다.

## 기능 구성

| 팀원 화면 | 관리 화면 |
| --- | --- |
| 날짜별 식권 사용 입력·수정 | 팀원과 소속 관리 |
| 식당 선택 | 팀별 식당 설정 |
| 월별 사용량과 식당별 요약 | 식당 목록 관리 |

추가로 `coupon-editor/`에 쿠폰 편집 화면이 포함되어 있습니다.

## 프로젝트 구조

| 경로 | 역할 |
| --- | --- |
| `index.html` | 팀원 사용 화면 |
| `admin.html` | 관리 화면 |
| `js/app.js` | 사용 기록과 월별 화면 |
| `js/admin.js` | 관리자 기능 |
| `js/firebase-init.js` | Firebase 초기화 |
| `scripts/` | 관리자용 식당 데이터 등록 도구 |

## 개발 환경 준비

보안 정리를 마친 뒤, 운영 데이터와 분리한 Firebase 개발 프로젝트에서 확인하세요.

1. `js/firebase-init.js`의 설정을 자신의 Firebase 개발 프로젝트에 맞춥니다.
2. Firestore·Storage의 권한 규칙을 설정합니다.
3. 정적 웹 서버에서 화면을 실행합니다.

```bash
python -m http.server 8000
```

`http://localhost:8000`에서 팀원 화면, `/admin.html`에서 관리 화면을 확인합니다. 화면에서 부서·이름을 입력하는 절차만으로 서버 데이터 접근 권한이 보장되지는 않습니다. Firebase 규칙과 인증 설정을 별도로 확인해야 합니다.

## 관리자 스크립트

식당 데이터 등록 흐름은 [scripts/README.md](scripts/README.md)에 정리되어 있습니다. 서비스 계정 키는 서버 작업용 비밀값이므로 브라우저에서 쓰거나 공개 저장소에 올리지 마세요.

## 개선 제안

[Issues](https://github.com/cbjworld/babjang/issues)에 사용 흐름과 개선 아이디어를 남길 수 있습니다. 팀원 이름·식권 기록 등 운영 데이터는 포함하지 마세요.

**English:** A JavaScript and Firebase meal-voucher management app with team administration and monthly usage summaries. Credential cleanup and access-rule review are required before deployment or reuse.
