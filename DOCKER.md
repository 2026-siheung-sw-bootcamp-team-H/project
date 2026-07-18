# 백엔드 Docker 실행

이 모노레포는 프론트엔드를 로컬 Vite 개발 서버로 실행하면서 백엔드만 컨테이너로 실행할 수 있습니다.

```bash
docker compose up --build backend
```

- 백엔드 API: `http://localhost:4000`
- 상태 확인: `http://localhost:4000/api/health`
- Swagger UI: `http://localhost:4000/api-docs`
- 프론트엔드: 별도 터미널에서 `npm run frontend:dev`

컨테이너를 중지하고 제거하려면 다음 명령을 실행합니다.

```bash
docker compose down
```

`Dockerfile.backend`는 루트의 npm workspace 정보를 이용해 백엔드 의존성만 설치하고 빌드합니다. 최종 이미지에는 프론트엔드 소스나 빌드 결과물이 포함되지 않습니다.
