import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { buttonPrimary } from "@/lib/display";

export function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 p-6 text-center">
      <div>
        <p className="font-mono text-sm text-cyan-300">404 / NOT_FOUND</p>
        <h1 className="mt-4 text-3xl font-bold text-white">페이지를 찾을 수 없습니다.</h1>
        <p className="mt-3 text-sm text-slate-500">요청한 콘솔 경로가 존재하지 않습니다.</p>
        <Link to="/dashboard" className={`${buttonPrimary} mt-7`}>
          <ArrowLeft className="size-4" /> 대시보드로 이동
        </Link>
      </div>
    </main>
  );
}
