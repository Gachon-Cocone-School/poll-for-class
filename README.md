# 투표 애플리케이션

> **주목!**
>
> **vibe coding 의 품질을 테스트하기 위해 github copilot 을 이용해서 제작하였으며 가급적 개발자가 개입하는 것을 최소화하였다.**

수업에서 학생들이 실시간으로 투표를 하고 그 결과를 볼 수 있는 웹 애플리케이션입니다.

## 기술 스택

Next.js, tRPC, Firebase Firestore를 사용하여 T3 스택으로 구축된 투표 애플리케이션입니다.

## 기능

- 투표 생성, 조회, 수정 및 삭제
- 그룹 생성, 조회, 수정 및 삭제
- 투표와 그룹 연결
- 투표와 그룹 페이지 간 이동

## Firebase 스키마

이 애플리케이션은 다음과 같은 Firestore 컬렉션을 사용합니다:

### 그룹 컬렉션 (Groups)

- `group_name` (문자열)
- `group_description` (문자열)
- 하위 컬렉션: `members`
  - `member_name` (문자열)
  - `member_no` (문자열)

### 투표 컬렉션 (Polls)

- `poll_name` (문자열)
- `poll_description` (문자열)
- `poll_group` (그룹 문서 참조)
- 하위 컬렉션: `questions`
  - `question` (문자열)
  - `choices` (문자열 목록)

## 시작하기

### 필수 요구사항

- Node.js 18+ 및 npm
- Firestore가 활성화된 Firebase 프로젝트

### 설정

1. 이 저장소를 복제합니다
2. 의존성 설치:
   ```
   npm install
   ```
3. `.env.example`을 `.env`로 복사하고 Firebase 구성 정보를 입력하세요:
   ```
   cp src/.env.example .env
   ```
4. Firebase 프로젝트 구성:
   - [Firebase 콘솔](https://console.firebase.google.com/)로 이동
   - 새 프로젝트 생성 (또는 기존 프로젝트 사용)
   - Firestore 데이터베이스 활성화
   - 프로젝트 설정 > 일반으로 이동하여 Firebase 구성 값을 `.env` 파일에 복사

### 개발

개발 서버 실행:

```
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 애플리케이션을 확인하세요.

### 프로덕션 빌드

```
npm run build
npm run start
```

## 프로젝트 구조

이 애플리케이션은 T3 스택 구조를 따릅니다:

- `/src/app` - Next.js 앱 라우터 페이지
- `/src/components` - 재사용 가능한 React 컴포넌트
- `/src/lib` - Firebase 구성 및 서비스 함수
- `/src/server` - tRPC 라우터 및 프로시저
- `/src/styles` - 전역 CSS

## 사용된 기술

- [Next.js](https://nextjs.org/) - React 프레임워크
- [tRPC](https://trpc.io/) - 엔드-투-엔드 타입세이프 API
- [Firebase](https://firebase.google.com/) - 백엔드 및 데이터베이스
- [TailwindCSS](https://tailwindcss.com/) - 스타일링
- [TypeScript](https://www.typescriptlang.org/) - 타입 안전성
