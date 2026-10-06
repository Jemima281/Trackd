export default function ComingSoon({
  title,
  blurb,
  step,
}: {
  title: string;
  blurb: string;
  step: number;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <h1 className="text-4xl font-black">{title}</h1>
      <p className="max-w-md text-white/60">{blurb}</p>
      <span className="rounded-full border border-dashed border-amber-400/50 px-4 py-1 text-sm text-amber-400">
        Coming in step {step}
      </span>
    </div>
  );
}
