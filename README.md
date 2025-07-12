# 3D 프린팅 견적 자동화 웹 플랫폼

> **AI 기반 3D 프린팅 견적 자동화 웹 플랫폼**  
> Remix + Feature-Sliced Design + Orca Slicer + AI 분석

## 🎯 프로젝트 개요

3D 모델(STL, 3MF, OBJ)을 업로드하면 웹에서 Orca Slicer 방식으로 슬라이싱을 수행하고, AI 분석을 통해 최적 설정을 추천하여 정확한 3D 프린팅 견적을 자동 산출하는 웹 시스템입니다.

### 핵심 기능

- 🔄 **모델 업로드 & 3D 프리뷰**: STL/3MF/OBJ 지원, Three.js 기반 실시간 3D 뷰어
- 🤖 **AI 모델 분석**: SentenceTransformer 기반 모델 분류 (장식용/기능성/조립체)
- ⚙️ **자동 슬라이싱 설정**: Bambu Lab 설정 참조 스마트 추천
- 💰 **정확한 견적 산출**: 프린팅 시간, 필라멘트 사용량, 비용 자동 계산
- 📊 **실시간 결과**: G-code 다운로드 및 상세 견적서 제공

## 🛠 기술 스택

### Frontend
- **Framework**: Remix (React-based 풀스택 프레임워크)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **State Management**: Zustand
- **3D Rendering**: Three.js + STL Loader
- **Architecture**: Feature-Sliced Design (FSD)

### Backend (연동 예정)
- **API**: FastAPI (Python)
- **Slicer**: Orca Slicer CLI
- **AI**: SentenceTransformer / Ollama

## 📂 프로젝트 구조 (Feature-Sliced Design)

```
app/
├── entities/           # 비즈니스 엔티티
│   ├── model/         # 3D 모델 데이터 구조
│   └── settings/      # 출력 설정 구조
├── features/          # 비즈니스 로직 기능
│   ├── estimate/      # 견적 계산 로직
│   ├── uploader/      # 파일 업로드 기능
│   ├── preview/       # 3D 모델 프리뷰
│   └── slicer/        # 슬라이싱 연동
├── widgets/           # 복합 UI 컴포넌트
│   ├── estimation-card/    # 견적서 카드
│   ├── model-viewer/       # 3D 모델 뷰어
│   └── slicer-settings/    # 슬라이서 설정
├── shared/            # 공유 유틸리티
│   ├── api/          # API 클라이언트
│   ├── lib/          # Zustand 스토어
│   └── ui/           # 재사용 UI 컴포넌트
└── routes/           # Remix 라우트
    └── _index.tsx    # 메인 페이지
```

## 🚀 시작하기

### 사전 요구사항

- Node.js 18+ 
- npm 또는 yarn

### 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 시작
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 서버 시작
npm start
```

개발 서버가 시작되면 `http://localhost:5173`에서 확인할 수 있습니다.

## 📱 사용 방법

### 1단계: 모델 업로드
- STL, 3MF, OBJ 파일을 드래그 앤 드롭하거나 클릭하여 업로드
- 3D 뷰어에서 실시간 모델 프리뷰 확인

### 2단계: AI 분석 대기
- AI가 모델을 자동 분석하여 용도별 분류
- 분류 결과에 따른 최적 설정 자동 추천

### 3단계: 출력 설정 선택
- **추천 설정**: AI 기반 Bambu Lab 스타일 설정 중 선택
- **사용자 정의**: 고급 사용자를 위한 수동 설정

### 4단계: 견적 확인
- **프린팅 시간**: 예상 소요 시간
- **필라멘트 사용량**: 길이(m) 및 무게(g)
- **예상 비용**: 재료비 + 전력비 포함
- **G-code 다운로드**: 즉시 프린팅 가능

## 🎨 주요 특징

### AI 기반 스마트 추천
- 모델 형태 분석으로 장식용/기능성/조립체 자동 분류
- 분류별 최적화된 Bambu Lab 설정 템플릿 적용
- 복잡도, 서포트 필요성 등을 고려한 다중 추천

### Bambu Lab 호환 설정
- Speed Mode (Silent/Standard/Sport/Ludicrous)
- AMS 필라멘트 관리 시스템 고려
- 냉각 및 전력 설정 최적화

### 정확한 비용 계산
- 필라멘트 종류별 단가 데이터베이스
- 온도 기반 재료 자동 추정
- 전력비 및 마진 포함 실제 비용

## 🔧 개발 가이드

### 새로운 기능 추가 (FSD 가이드라인)

1. **Entity 레이어**: 새로운 비즈니스 데이터 구조 정의
2. **Feature 레이어**: 비즈니스 로직 및 훅 구현  
3. **Widget 레이어**: 복합 UI 컴포넌트 개발
4. **Page 레이어**: 라우트별 페이지 구성

### 상태 관리 (Zustand)

```typescript
// shared/lib/store.ts에서 전역 상태 관리
const useEstimationStore = create<EstimationState>((set) => ({
  currentModel: null,
  setCurrentModel: (model) => set({ currentModel: model }),
  // ...
}));
```

### API 연동

```typescript
// shared/api/slicer.ts에서 백엔드 통신
const slicerAPI = new SlicerAPI();
await slicerAPI.uploadModel(file);
await slicerAPI.slice(modelId, settings);
```

## 🤝 기여 가이드

1. Fork 후 feature 브랜치 생성
2. Feature-Sliced Design 아키텍처 준수
3. TypeScript 타입 안정성 확보
4. 컴포넌트 단위 테스트 작성
5. Pull Request 생성

## 📄 라이선스

MIT License

## 🔗 관련 링크

- [Remix Documentation](https://remix.run/docs)
- [Feature-Sliced Design](https://feature-sliced.design/)
- [Three.js Documentation](https://threejs.org/docs/)
- [Orca Slicer](https://github.com/SoftFever/OrcaSlicer)
- [Bambu Lab](https://bambulab.com/)

---

**프로젝트 상태**: 🚧 Frontend 완료, Backend 연동 대기중
