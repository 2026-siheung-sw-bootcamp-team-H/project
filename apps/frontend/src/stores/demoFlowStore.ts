import { create } from "zustand";
import { persist } from "zustand/middleware";

export const demoSteps = [
  { id: "connect", label: "서비스 연결", path: "/services" },
  { id: "traffic", label: "공격 요청", path: "/logs" },
  { id: "signature", label: "시그니처 생성", path: "/logs/log-1048" },
  { id: "validate", label: "AI 우회 검증", path: "/rules/SIG-SQLI-014" },
  { id: "explain", label: "AI 설명 확인", path: "/reports/report-301" },
  { id: "deploy", label: "룰 배포", path: "/deployments" }
] as const;

type DemoFlowState = {
  step: number;
  serviceConnected: boolean;
  attackSent: boolean;
  ruleCreated: boolean;
  validationCompleted: boolean;
  reportReviewed: boolean;
  deployed: boolean;
  advance: (step: number) => void;
  reset: () => void;
};

const initialState = {
  step: 0,
  serviceConnected: false,
  attackSent: false,
  ruleCreated: false,
  validationCompleted: false,
  reportReviewed: false,
  deployed: false
};

export const useDemoFlowStore = create<DemoFlowState>()(
  persist(
    (set) => ({
      ...initialState,
      advance: (step) =>
        set((state) => {
          const nextStep = Math.max(state.step, Math.min(step, demoSteps.length));
          return {
            step: nextStep,
            serviceConnected: nextStep >= 1,
            attackSent: nextStep >= 2,
            ruleCreated: nextStep >= 3,
            validationCompleted: nextStep >= 4,
            reportReviewed: nextStep >= 5,
            deployed: nextStep >= 6
          };
        }),
      reset: () => set(initialState)
    }),
    { name: "aegis-guided-demo" }
  )
);
