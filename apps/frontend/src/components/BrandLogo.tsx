type BrandLogoProps = {
  className?: string;
};

export function BrandLogo({ className = "" }: BrandLogoProps) {
  return (
    <span
      className={`relative block shrink-0 overflow-hidden rounded-[22%] bg-white shadow-[0_0_30px_rgba(104,157,255,0.18)] ${className}`}
      aria-hidden="true"
    >
      <img
        src="/logo.png"
        alt=""
        className="absolute left-1/2 top-[41%] h-[175%] max-w-none -translate-x-1/2 -translate-y-1/2"
      />
    </span>
  );
}
