# Mobile Compact Layout Patch

모바일에서 페이지가 지나치게 길어지는 문제를 줄이기 위한 CSS 패치입니다.

## 적용 파일

- `index.html`
- `mobile_compact.css`

## 적용 내용

- BOOKS 목록을 모바일에서 세로 27개 리스트가 아니라 가로 스크롤 칩으로 표시
- 장 선택 버튼도 가로 스크롤로 표시
- 설명 리스트와 선택 설명 영역은 높이를 제한하고 내부 스크롤 처리
- 본문, 검색, 각주, 형광펜 기능은 건드리지 않음
- 데스크톱 레이아웃은 기존 유지

## 확인

```bash
python -m http.server 8000
```
