// 식당 목록을 Firestore restaurants 컬렉션에 한 번에 등록하는 스크립트.
// 실행 방법은 이 폴더의 README.md 참고.
//
// 이미 등록된 식당(이름+동이 같은 경우)은 건너뛰기 때문에, restaurants-data.js에
// 새 동을 채워넣고 다시 실행해도 안전합니다 (중복 등록 안 됨).

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json'); // 콘솔에서 받은 키 파일 (직접 준비해야 함)
const restaurantsByDong = require('./restaurants-data.js');

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function seed() {
  // 이미 등록된 (이름, 동) 조합을 미리 읽어서 중복 방지
  const existingSnap = await db.collection('restaurants').get();
  const existingKeys = new Set(
    existingSnap.docs.map(d => `${d.data().name}__${d.data().dong}`)
  );

  let added = 0;
  let skipped = 0;

  for (const [dong, names] of Object.entries(restaurantsByDong)) {
    if (!names || names.length === 0) continue;

    for (const name of names) {
      const key = `${name}__${dong}`;
      if (existingKeys.has(key)) {
        skipped++;
        continue;
      }
      await db.collection('restaurants').add({ name, dong, qrImageUrl: null });
      existingKeys.add(key);
      added++;
      console.log(`추가됨: [${dong}] ${name}`);
    }
  }

  console.log(`\n완료 - 새로 추가 ${added}개, 이미 있어서 건너뜀 ${skipped}개`);
  process.exit(0);
}

seed().catch(err => {
  console.error('스크립트 실행 중 오류:', err);
  process.exit(1);
});
