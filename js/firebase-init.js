/* ============ Firebase 초기화 ============ */
// 1) Firebase 콘솔 > 프로젝트 설정 > 내 앱 에서 나온 firebaseConfig 값을 아래에 그대로 붙여넣으세요.
const firebaseConfig = {
  apiKey: "AIzaSyDKqXtLp5GoOmC7GjRO1P2Gd23qRHMJBB0",
  authDomain: "babjang-af788.firebaseapp.com",
  projectId: "babjang-af788",
  storageBucket: "babjang-af788.firebasestorage.app",
  messagingSenderId: "864764163788",
  appId: "1:864764163788:web:c677d2648270b27c637469",
  measurementId: "G-T8HMGR9SZ9"
};
firebase.initializeApp(firebaseConfig);

// 앱 전체에서 재사용할 Firestore / Storage 핸들
const db = firebase.firestore();
const storage = firebase.storage();

// 참고: db.collection('members'), db.collection('restaurants') 같은 식으로
// data.js의 allMembers / RESTAURANTS 같은 로컬 변수들을 앞으로 이 db 객체 호출로 대체하게 됩니다.
