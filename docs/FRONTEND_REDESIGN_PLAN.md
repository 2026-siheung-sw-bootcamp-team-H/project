# Frontend Redesign & Integration Plan

## 목표

프론트는 보안 플랫폼의 핵심 흐름을 명확히 보여줘야 한다. 현재 구현은 실제 API 연동이 상당 부분 진행된 상태이므로, 이 문서는 “앞으로 할 계획”이 아니라 **이미 구현된 흐름과 남은 UI 개선 작업**을 구분해서 정리한다.

핵심 흐름은 다음 순서로 통일한다.

```text
시그니처 생성
→ 결정론적 우회·Sandbox 검증
→ Holdout 통과
→ Shadow 배포
→ 관리자 승인 요청
→ 관리자 승인
→ Active 배포
→ 필요 시 Rollback
```

## 현재 구현된 흐름

아래 항목은 현재 구현 기준으로 완료된 기능이다.

- JWT 로그인과 인증 헤더 처리
- Demo Shop 실제 API 호출
- 요청 로그 목록·상세 조회
- 시그니처 생성
- 룰 목록·상세 조회
- 결정론적 우회·Holdout 검증
- 비동기 작업 polling
- 검증 수치 기반 리포트
- Shadow 배포, 승인 요청, 승인, Active 배포, Rollback API 연결
- WAF를 통과한 다중 인코딩 공격 수집
- 보안 플랫폼 mock 데이터와 고정 ID 제거
- Demo Shop 상품의 이미지·색상·상세 설명은 프론트 표시용 정적 데이터로 보완

## 용어 정리

현재 구현 기준에서는 AI 표현을 과장하지 않는다.

- `AI 검증` 대신 `우회·Sandbox 검증`
- `AI 우회 검증 시작` 대신 `우회 검증 시작`
- `AI 리포트`는 향후 AI 연동 시 제공되는 설명 리포트
- 현재 리포트는 실제 검증 수치 기반의 결정론적 검증 리포트
- AI는 운영 차단의 주체가 아니라 설명과 보조 판단 역할이다.

## 전체 화면 구조

### 1. 온보딩 / 시작 페이지

서비스의 정체성을 짧게 설명한다.

- 서비스명과 한 줄 설명
- 보호 대상: Demo Shop API
- 핵심 흐름: Observe → Generate → Validate → Shadow → Approve → Deploy
- CTA: 관리자 로그인, Demo Shop 보기

### 2. 로그인 화면

회원가입은 만들지 않는다. 고정 관리자 계정으로만 진입한다.

- 관리자 계정 입력
- 데모 계정 안내
- “운영 배포는 관리자가 최종 승인한다”는 문구

### 3. 대시보드

처음 들어왔을 때 현재 보안 상태를 한눈에 보여준다.

- 보호 서비스 연결 상태
- 누적 요청 수
- 향후 백엔드에서 시간 조건을 지원하면 최근 24시간 요청 수로 확장
- 공격 의심 요청 수
- 차단 요청 수
- 활성 WAF 룰 수
- 평균 confidence
- 최신 위험 로그 5개
- 최신 검증/배포 상태
- 전체 파이프라인 진행 카드

추천 레이아웃:

- 상단: 핵심 지표 카드 4개
- 중앙: 요청/공격/차단 추이 그래프
- 오른쪽: 현재 진행해야 할 다음 작업
- 하단: 최근 공격 로그 테이블

### 4. 보호 서비스 화면

Demo Shop이 어떻게 보호되는지 설명한다.

- 사용자 요청 흐름: 사용자 → 공개 서비스 주소 → Nginx + ModSecurity 보안 관문 → Demo Shop API
- 연결 상태
- 공개 서비스 주소
- 원본 API 주소
- WAF 주소
- 최근 요청 시간
- 테스트 공격 요청 버튼

### 5. 요청 로그 화면

보안 플랫폼의 핵심 화면이다. “무슨 요청이 들어왔고, 왜 의심스러운지”를 보여준다.

- 요청 목록
- 정상/공격/차단 필터
- method, path, status, classification, attackCategory
- action: allowed / blocked / monitored
- 현재 프론트는 `MONITOR`를 별도 상태로 표시하지 않으므로 `ALLOW / BLOCK / MONITOR` 구분 표시가 추가로 필요하다.
- 발생 시간
- 위험도 색상
- 클릭 시 로그 상세로 이동

필수 UX:

- 공격 요청은 빨간색
- 차단 요청은 초록/파란색
- 정상 요청은 회색

### 6. 요청 로그 상세 화면

시그니처 생성 전 근거를 보여준다.

- 요청 기본 정보
- sanitized request
- normalized request
- extracted tokens
- detection reason
- enforcement source
- enforcement result
- replay-safe payload 여부
- “시그니처 룰 생성” 버튼

주의:

- raw request를 강조하지 않는다.
- 민감정보 제거/정규화 결과를 강조한다.
- 단순 SQL 공격만 보여주면 CRS 효과와 플랫폼 룰 효과가 구분되지 않으므로, 다중 인코딩 우회 요청을 데모에 사용한다.

### 7. 시그니처 룰 목록 화면

생성된 룰들의 운영 상태를 보여준다.

- 룰 ID
- 공격 카테고리: SQLi, XSS, Path Traversal
- 상태: draft, sandbox_tested, holdout_passed, shadow_mode, approval_required, approved, active, rolled_back
- confidence
- false positive rate
- 현재 버전
- 배포 대상

필터:

- 상태별
- 카테고리별
- active 여부

### 8. 시그니처 룰 상세 화면

룰 하나의 생애주기를 보여준다.

- 룰 요약
- 조건 트리 JSON
- normalizer 목록
- match conditions
- source request
- version history
- “우회 검증 시작” 버튼
- “배포 관리로 이동” 버튼

강조할 점:

- 생성된 룰은 바로 운영 차단하지 않는다.
- confidence는 자동 배포 기준이 아니라 참고 점수다.
- Shadow 배포 이후에 관리자 승인 요청이 가능하다.
- Shadow 배포, 승인 요청, 승인·반려, Active 배포, Rollback 작업은 배포 화면에서만 수행한다.

### 9. 검증 결과 화면

심사위원에게 가장 설득력 있는 화면이다.

- 공격 탐지율
- 오탐률
- 우회 성공률
- confidence
- 라운드별 변화 그래프
- 정상 요청 검증 결과
- 공격 요청 검증 결과
- Holdout 평가 결과

필수 카드:

- Before: 최초 룰 탐지율
- After: 보강 후 탐지율
- False Positive: 정상 요청 차단 비율
- Holdout: 최종 평가 통과 여부

### 10. 리포트 화면

현재는 AI 리포트가 아니라 검증 수치 기반 리포트로 표현한다. AI API 연동 이후에는 AI 설명 리포트로 확장한다.

- 공격 요약
- 정규화 전/후 비교
- 탐지 근거
- 우회 테스트 결과
- 룰 보강 이유
- 배포 추천 여부
- 운영자 체크리스트

문구 방향:

- “AI 판단으로 차단” 금지
- “검증 수치와 관리자의 승인으로 배포” 강조
- AI 연동 시 “AI가 설명하고, 관리자가 승인”이라고 표현

### 11. 배포 화면

WAF 배포 상태를 보여준다.

- 배포 대상: Internal, ModSecurity
- 현재 룰 상태
- Shadow 배포 결과
- 관리자 승인 상태
- Active 배포 버튼
- Rollback 버튼
- 최근 배포 이력
- export된 ModSecurity SecRule 미리보기

정확한 배포 흐름:

1. Holdout 통과
2. Shadow 배포
3. Shadow 모니터링 결과 확인
4. 관리자 승인 요청
5. 관리자 승인 또는 반려
6. Active 배포
7. 문제 발생 시 Rollback

### 12. Demo Shop 화면

보안 플랫폼을 실험하는 보호 대상 서비스다.

- 상품 목록
- 상품 검색
- 상품 상세
- 리뷰 작성
- 로그인
- 공격 테스트용 입력 예시 버튼

주의:

- 실제 취약 서비스처럼 만들지 않는다.
- 공격 payload는 DB 실행이 아니라 로그 수집/탐지용으로만 사용한다.
- 데모 공격은 기존 CRS가 바로 막는 단순 payload보다, CRS를 우회해 내부 탐지기가 잡는 다중 인코딩 payload를 사용한다.

## 아직 남은 UI 작업

아래 항목은 현재 구현 이후 디자인/UX 개선으로 남은 작업이다.

- 로그 정상/공격/차단 필터
- 요청 로그의 `ALLOW / BLOCK / MONITOR` 상태 구분 표시
- 룰 상태·카테고리 필터
- 요청 상세의 detection reason 표시 강화
- 요청 상세의 enforcement source 표시
- 룰 버전 이력 UI
- Holdout 전용 결과 카드
- Shadow 모니터링 통계
- ModSecurity SecRule 미리보기
- 관리자 반려 사유 입력 UI
- 서비스가 여러 개일 때 서비스 선택 기능

## 디자인 방향

### 톤

- 어두운 보안 콘솔 느낌 유지
- 너무 게임 UI처럼 보이지 않게 정리
- Discord 느낌보다는 Datadog, Cloudflare, Grafana 같은 운영 콘솔 느낌

### 컬러

- Background: `#0B0F19`
- Surface: `#111827`, `#1F2937`
- Primary: `#6366F1`
- Success: `#10B981`
- Warning: `#F59E0B`
- Danger: `#EF4444`
- Text: `#F9FAFB`, `#9CA3AF`

### 레이아웃

- 좌측 사이드바 고정
- 상단에는 현재 서비스 상태 표시
- 본문은 카드 + 테이블 + 그래프 중심
- 각 화면 상단에 “이 화면에서 해야 하는 일”을 짧게 표시

## 다음 개발 지시 순서

1. 로그 목록에 정상/공격/차단 필터를 추가한다.
2. 요청 로그에서 `ALLOW / BLOCK / MONITOR` 상태를 구분해 표시한다.
3. 룰 목록에 상태·카테고리 필터를 추가한다.
4. 요청 상세에 detection reason과 enforcement source를 명확하게 표시한다.
5. 룰 상세에 버전 이력 UI를 추가한다.
6. 검증 결과 화면에 Holdout 전용 결과 카드를 추가한다.
7. 배포 화면에 Shadow 모니터링 통계를 추가한다.
8. 배포 화면에 ModSecurity SecRule 미리보기를 추가한다.
9. 관리자 반려 시 사유 입력 UI를 추가한다.
10. 마지막에 전체 디자인 톤을 통일한다.

## 완료 기준

- Demo Shop에서 CRS를 우회하는 다중 인코딩 공격 요청을 보낸다.
- 요청 로그에 공격이 기록된다.
- 로그 상세에서 정규화/탐지 근거를 확인한다.
- 해당 로그로 시그니처 룰을 생성한다.
- 결정론적 우회·Sandbox 검증을 실행한다.
- Holdout 평가를 통과한다.
- Shadow 배포 후 모니터링 결과를 확인한다.
- 관리자가 승인한다.
- Active 배포한다.
- 기존 CRS를 우회해 내부에서 탐지된 다중 인코딩 공격으로 룰을 생성하고, 해당 룰을 Active 배포한 뒤 같은 공격이 생성된 룰에 의해 차단되는 것을 확인한다.
