# 신약 현대어 번역 웹앱 UI 기능 패치

## 수정 파일
- app.js
- styles.css

## 유지 파일
- index.html은 기존 원본 구조 유지

## 반영 기능
1. 권별 포인트 컬러 자동 적용
   - manifest의 order 기준으로 컬러 팔레트 자동 배정
   - 팔레트를 초과하는 권은 book id/order 기반으로 안정적인 HSL 컬러 자동 생성
2. 텍스트 선택 시 `m` 버튼 표시
   - 클릭하면 형광펜 마킹
   - localStorage 저장
3. 이미 마킹된 텍스트 선택 시 `d` 버튼 표시
   - 클릭하면 해당 마킹 취소

## 적용 방법
기존 프로젝트에서 app.js, styles.css만 교체하세요.
