# 3D 프린팅 견적 자동화 웹 플랫폼

> **AI 기반 3D 프린팅 견적 자동화 웹 플랫폼**  
> Remix + Feature-Sliced Design + Online3DViewer + AI 분석

## 🎯 프로젝트 개요

3D 모델(STL, 3MF, OBJ, PLY, GLTF, GLB)을 업로드하면 웹에서 Online3DViewer 기반의 고급 3D 뷰어로 시각화하고, AI 분석을 통해 최적 설정을 추천하여 정확한 3D 프린팅 견적을 자동 산출하는 웹 시스템입니다.

### 핵심 기능

- 🔄 **고급 3D 뷰어**: Online3DViewer 기반 다중 포맷 지원 (STL/3MF/OBJ/PLY/GLTF/GLB)
- 🎨 **3MF 색상 지원**: 멀티컬러 3MF 파일의 색상 정보 파싱 및 표시
- 🤖 **AI 모델 분석**: 파일명, 크기, 형식 기반 스마트 분류 (장식용/기능성/조립체)
- ⚙️ **자동 슬라이싱 설정**: 분류별 최적화된 프린팅 설정 추천
- 💰 **정확한 견적 산출**: 프린팅 시간, 필라멘트 사용량, 비용 자동 계산
- 📊 **실시간 모델 정보**: 바운딩 박스, 부피, 표면적 등 상세 정보 표시

## 🛠 기술 스택

### Frontend

- **Framework**: Remix (React-based 풀스택 프레임워크)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **State Management**: Zustand
- **3D Rendering**: Online3DViewer (Three.js 기반)
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
│   ├── preview/       # 3D 모델 프리뷰 (useNewOnline3DViewer)
│   ├── settings/      # 설정 관리
│   └── ams/           # AMS 필라멘트 관리
├── widgets/           # 복합 UI 컴포넌트
│   ├── model-viewer/  # 3D 모델 뷰어 (NewModelViewer)
│   ├── model-settings-3mf/ # 3MF 설정 표시
│   ├── slicer-settings/    # 슬라이서 설정
│   └── layout/        # 레이아웃 컴포넌트
├── shared/            # 공유 유틸리티
│   ├── lib/          # Zustand 스토어
│   └── config/       # 설정 파일
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

- STL, 3MF, OBJ, PLY, GLTF, GLB 파일을 드래그 앤 드롭하거나 "Load Model" 버튼 클릭
- Online3DViewer 기반 고급 3D 뷰어에서 실시간 모델 프리뷰 확인
- 3MF 파일의 경우 색상 정보 자동 파싱 및 표시

### 2단계: AI 분석 대기

- 파일명, 크기, 형식 기반으로 모델을 자동 분석하여 용도별 분류
- 분류 결과에 따른 최적 설정 자동 추천

### 3단계: 출력 설정 선택

- **추천 설정**: AI 기반 분류별 최적화된 설정 중 선택
- **사용자 정의**: 고급 사용자를 위한 수동 설정 조정

### 4단계: 견적 확인

- **프린팅 시간**: 예상 소요 시간
- **필라멘트 사용량**: 길이(m) 및 무게(g)
- **예상 비용**: 재료비 + 전력비 포함
- **모델 정보**: 바운딩 박스, 부피, 표면적 등 상세 정보

## 🎨 주요 특징

### Online3DViewer 기반 고급 3D 뷰어

- **다중 포맷 지원**: STL, 3MF, OBJ, PLY, GLTF, GLB
- **3MF 색상 파싱**: 멀티컬러 3MF 파일의 색상 정보 자동 추출
- **고급 렌더링**: ACES Filmic Tone Mapping, 고해상도 그림자
- **다양한 뷰 모드**: Solid, Wireframe, X-Ray
- **실시간 컨트롤**: Fit to Window, Reset View, Apply Colors
- **모델 정보 패널**: 상세한 모델 메타데이터 표시

### AI 기반 스마트 추천

- 파일명, 크기, 형식 기반 모델 분류
- 분류별 최적화된 프린팅 설정 템플릿 적용
- 복잡도, 서포트 필요성 등을 고려한 다중 추천

### Bambu Lab 호환 설정

- AMS 필라멘트 관리 시스템 고려
- 냉각 및 전력 설정 최적화
- 다양한 프린팅 품질 옵션

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

### 3D 뷰어 개발

```typescript
// features/preview/useNewOnline3DViewer.ts
export const useNewOnline3DViewer = () => {
  // Online3DViewer 초기화 및 3D 모델 로딩 로직
  // 색상 정보 파싱, 렌더링 최적화 등
};
```

## 📋 프롬프트 가이드

### 3D 뷰어 구현 과정

1. **기본 3D 뷰어 설정**

   ```bash
   npm install online-3d-viewer three @types/three
   ```

2. **Online3DViewer 컴포넌트 생성**

   - Three.js 기반 3D 렌더링
   - 다중 파일 포맷 지원
   - 드래그 앤 드롭 기능

3. **고급 기능 추가**

   - ACES Filmic Tone Mapping
   - 다중 조명 설정
   - 다양한 뷰 모드 (Solid, Wireframe, X-Ray)
   - 카메라 컨트롤 최적화

4. **3MF 색상 파싱**

   - ZIP 해제 및 XML 파싱
   - 색상 정보 추출
   - Material 적용

5. **UI/UX 개선**
   - 로딩 상태 표시
   - 에러 핸들링
   - 반응형 디자인
   - 접근성 고려

### 코드 최적화 과정

1. **불필요한 파일 정리**

   - 사용하지 않는 컴포넌트 삭제
   - 빈 디렉토리 제거
   - 중복 코드 통합

2. **Import 정리**

   - 사용하지 않는 import 제거
   - 경로 최적화
   - 타입 안정성 확보

3. **성능 최적화**
   - 번들 크기 최소화
   - 지연 로딩 적용
   - 메모리 누수 방지

### 아키텍처 설계 원칙

1. **Feature-Sliced Design 준수**

   - 레이어별 명확한 책임 분리
   - 의존성 방향 준수
   - 재사용성 최대화

2. **TypeScript 활용**

   - 엄격한 타입 체크
   - 인터페이스 정의
   - 제네릭 활용

3. **상태 관리 최적화**
   - Zustand 스토어 설계
   - 불필요한 리렌더링 방지
   - 상태 정규화

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
- [Online3DViewer](https://github.com/kovacsv/Online3DViewer)
- [Three.js Documentation](https://threejs.org/docs/)
- [Bambu Lab](https://bambulab.com/)

---

**프로젝트 상태**: 🚧 Frontend 완료 (Online3DViewer 기반 고급 3D 뷰어 구현), Backend 연동 대기중
