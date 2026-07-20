# Frontend Implementation Plan

## 목표

프론트엔드 창에서는 **보안 관리자 콘솔**을 기능 중심으로 구현한다. 디자인은 나중에 다시 잡을 예정이므로, 지금은 화면 흐름과 API 연동이 먼저다.

## 최종 프론트 스택

- React
- TypeScript
- Vite
- tailwindcss
- TanStack Query
- Zustand
- React Router
- Monaco Editor
- Recharts 또는 ECharts

## 사용자 기준

이 서비스는 일반 회원 서비스가 아니라 **보안 관리자 콘솔**이다.

- 회원가입은 만들지 않는다.
- 고정 관리자 계정으로 로그인한다.
- MVP에서는 조직/워크스페이스도 만들지 않는다.
- 보호 대상은 `Demo Shop API` 하나로 시작한다.

## 프론트 작업 순서

### 1. 라우팅 구성

필수 페이지를 먼저 만든다.

- `/login`: 관리자 로그인
- `/dashboard`: 전체 상태
- `/services`: 보호 대상 서비스
- `/logs`: 요청 로그 목록
- `/logs/:id`: 요청 상세
- `/rules`: 시그니처 룰 목록
- `/rules/:id`: 룰 상세/편집
- `/validation/:id`: 검증 결과
- `/deployments`: 룰 배포 상태
- `/reports/:id`: AI 리포트

### 2. 로그인 화면

회원가입 없이 고정 계정 로그인만 제공한다.

필요 요소:

- 이메일 입력
- 비밀번호 입력
- 로그인 버튼
- 데모 계정 안내

로그인 후 JWT를 저장하고 관리자 콘솔로 이동한다.

### 3. 대시보드

보안 플랫폼의 현재 상태를 한눈에 보여준다.

필요 카드:

- 보호 대상 서비스 상태
- 최근 요청 수
- 최근 차단 이벤트 수
- 활성 룰 수
- 평균 confidence
- 최근 검증 성공/실패

필요 그래프:

- 시간대별 요청 수
- 공격/정상/차단 비율
- 라운드별 탐지율 개선

### 4. 보호 대상 서비스 화면

MVP에서는 `Demo Shop API` 하나만 보여준다.

표시 정보:

- 서비스명: `Demo Shop API`
- 연결 방식: `Nginx + ModSecurity`
- 상태: `Connected`
- API URL
- 최근 요청 시간
- 적용된 룰 수

버튼:

- 정상 트래픽 생성
- 공격 트래픽 생성
- 요청 로그 보기

### 5. 요청 로그 화면

정상/공격/차단 요청을 목록으로 보여준다.

필터:

- 전체
- 정상
- 공격 의심
- 차단됨
- SQL Injection
- XSS
- Path Traversal

목록 컬럼:

- 시간
- Method
- Path
- IP
- User-Agent
- 상태
- 공격 유형

### 6. 요청 상세 화면

시그니처 생성의 시작 화면이다.

필수 영역:

- 원본 요청
- 정규화된 요청
- 추출된 토큰
- 의심 공격 유형
- 관련 로그

버튼:

- 시그니처 생성
- 샌드박스 검증
- AI 분석 요청

### 7. 시그니처 생성 화면

공격 로그를 기반으로 생성된 룰을 보여준다.

필수 영역:

- AI 분석 요약
- 생성된 Signature Rule JSON
- Normalizer 목록
- Match 조건 트리
- 예상 action
- confidence 초기값

`Monaco Editor`를 사용해 JSON 룰을 읽기 좋게 보여준다.

### 8. 검증 화면

이 프로젝트의 핵심 화면이다.

필수 지표:

- Attack Detection Rate
- False Positive Rate
- Bypass Success Rate
- Confidence
- Hardening Round

필수 표:

- 공격 샘플 검증 결과
- 정상 요청 오탐 검증 결과
- 우회 공격 성공/실패 결과

필수 그래프:

- 라운드별 탐지율 변화
- 라운드별 오탐률 변화
- 우회 성공률 감소 그래프

버튼:

- 우회 테스트 실행
- 룰 보강 실행
- 다시 검증
- 승인 대기열로 보내기

### 9. 룰 목록 화면

생성된 시그니처 룰을 관리한다.

상태:

- Draft
- Testing
- Passed
- Review Required
- Active
- Failed

목록 컬럼:

- 룰 ID
- 공격 유형
- 버전
- 상태
- confidence
- 오탐률
- 생성일
- 배포 대상

### 10. 룰 상세/편집 화면

룰의 전체 정보를 보여준다.

필수 영역:

- 룰 JSON
- 버전 히스토리
- 검증 결과
- 배포 대상
- AI 리포트 링크

버튼:

- 검증 실행
- 관리자 승인
- 활성화
- 비활성화
- ModSecurity 룰 export
- Cloudflare 룰 export

### 11. 룰 배포 화면

검증된 룰을 어디에 적용할지 보여준다.

배포 대상:

- Internal Signature Policy
- Nginx / ModSecurity Rule
- Cloudflare Custom Rule

MVP에서는 실제 Cloudflare API 배포가 아니어도, export 결과를 보여주면 된다.

### 12. AI 리포트 화면

AI Report는 차단 엔진이 아니라 설명 화면이다.

필수 내용:

- 공격 요약
- 탐지 근거
- 정규화 전/후 비교
- 우회 테스트 결과
- confidence 계산 근거
- 운영자 대응 가이드
- 배포 권장 여부

## 프론트 완료 기준

- 로그인 후 관리자 콘솔에 진입할 수 있다.
- Demo Shop API 상태를 볼 수 있다.
- 요청 로그 목록/상세를 볼 수 있다.
- 공격 로그에서 시그니처 생성을 요청할 수 있다.
- 생성된 룰 JSON을 확인할 수 있다.
- 검증 결과와 지표를 볼 수 있다.
- 검증된 룰을 승인/배포하는 흐름을 시연할 수 있다.
- AI 리포트를 볼 수 있다.

## 화면 구현 우선순위

1. 로그인
2. 대시보드
3. 요청 로그 목록/상세
4. 시그니처 생성 화면
5. 검증 결과 화면
6. 룰 목록/상세
7. 배포 화면
8. AI 리포트 화면

## 디자인 원칙

지금은 예쁘게 만들지 않는다. 대신 다음을 지킨다.

- 한 화면에 한 가지 주요 행동만 둔다.
- 원본 요청과 정규화 결과는 비교 가능하게 둔다.
- 숫자 지표는 카드로 크게 보여준다.
- 룰 JSON은 접거나 펼칠 수 있게 한다.
- 버튼 이름은 기능 그대로 쓴다.
