# Matthew Korean Web App

마태복음 현대어 번역 웹앱입니다. 업로드한 `roman_empire_with_accent.html`의 카드형 디자인을 바탕으로, 마태복음 MD 파일을 읽기용 웹앱으로 재구성했습니다.

## 파일 구조

```txt
matthew-webapp/
├── index.html
├── styles.css
├── app.js
├── data/
│   ├── matthew.json
│   └── 01_Matthew_Korean_annotated.md
└── .nojekyll
```

## GitHub Pages 배포

1. 새 GitHub 저장소를 만든다.
2. 이 폴더 안의 파일을 저장소 루트에 업로드한다.
3. GitHub 저장소의 `Settings > Pages`로 이동한다.
4. `Deploy from a branch` 선택 후 `main / root`를 선택한다.
5. 배포 주소가 생성되면 접속한다.

## 로컬 확인

브라우저에서 파일을 직접 열면 `fetch()` 제한 때문에 데이터가 안 불러와질 수 있습니다. 아래처럼 로컬 서버로 확인하세요.

```bash
python -m http.server 8000
```

그다음 `http://localhost:8000` 접속.

## 콘텐츠 통계

- 장: 28
- 절: 1068
- 설명 각주: 42
