import process from "node:process";

if (!process.env.CI && !process.env.VERCEL) {
  const { default: husky } = await import("husky");
  husky();
}
