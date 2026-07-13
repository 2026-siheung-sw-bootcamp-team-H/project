export type HealthStatus = {
  status: "ok";
  service: "@siheung/backend";
  timestamp: string;
};

export function getHealthStatus(): HealthStatus {
  return {
    status: "ok",
    service: "@siheung/backend",
    timestamp: new Date().toISOString()
  };
}
