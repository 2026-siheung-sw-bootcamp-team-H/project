# AI 방어 파이프라인

## 실행 흐름

```text
공격 이벤트에서 초기 룰 생성
→ 최대 5라운드 우회 페이로드 생성 및 후보 룰 개선
→ Sandbox 평가
→ 잠금된 Holdout 데이터셋 최종 평가
→ 구조화 AI 리포트 생성
→ 배포 전 ZAP 스캔 자동 실행
→ 관리자가 리포트와 스캔 결과 확인 후 Shadow 배포
→ Shadow 관찰 결과를 바탕으로 Active 전환 승인 또는 반려
→ Active 배포
→ 배포 후 ZAP 스캔 자동 실행
→ 배포 전·후 결과 비교
```

검증과 AI 생성은 BullMQ Worker에서 실행된다. AI가 만든 룰 후보는 즉시 배포하지 않고 기존
Sandbox/Holdout 평가를 통과한 경우에만 채택한다. AI 리포트의 배포 의견 역시 설명 용도이며,
코드에서 계산한 탐지율·오탐률·우회 성공률과 관리자 승인이 최종 결정권을 갖는다.

## 환경 변수

`apps/backend/.env`의 AI 설정은 `compose.yaml`의 `env_file`을 통해 Backend와 Worker 모두에
전달된다.

```dotenv
AI_PROVIDER=openai
OPENAI_API_KEY=...
AI_MODEL=gpt-4.1-mini
AI_TIMEOUT_MS=20000
AI_MAX_OUTPUT_TOKENS=1200
AI_DAILY_CALL_LIMIT=50
ADVERSARIAL_MAX_ROUNDS=5
```

- `AI_MAX_OUTPUT_TOKENS`: 호출 한 번의 최대 출력 토큰 수
- `AI_DAILY_CALL_LIMIT`: Backend/Worker가 공유하는 일일 AI 호출 상한
- `ADVERSARIAL_MAX_ROUNDS`: 1~5 사이의 반복 개선 횟수
- 일일 상한, API 오류, timeout 또는 구조 검증 실패 시 결정론적 fallback을 사용한다.

## API

- `GET /api/ai/status`: 공급자, 모델, 최대 라운드, 오늘 호출 수와 남은 호출 수
- `POST /api/signature-rules/:id/validate`: 반복 개선, Holdout, 리포트, 배포 전 ZAP을 큐에 등록
- `GET /api/jobs/:id`: 검증 작업과 생성된 `validationRunId`, `reportId`, `securityScanRunId` 조회
- `POST /api/signature-rules/:id/deploy`: Shadow/Active/Rollback 실행
- `GET /api/security-scans/compare?ruleId=...`: 배포 전·후 ZAP 결과 비교

OpenAI 연동은 Responses API와 JSON Schema Structured Outputs를 사용한다. 모델 출력은 Zod로
한 번 더 검증하며, 원본 API 키나 전체 민감 요청 본문은 리포트 입력 및 감사 로그에 저장하지 않는다.
