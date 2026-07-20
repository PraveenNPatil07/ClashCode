import type { College } from '@clashcode/shared';

import { AnimatedNumber } from './AnimatedNumber';
import { CollegeCrest, getCollegeBrand, getCollegeSurfaceStyle } from './CollegeBrand';

type CollegeCardProps = {
  college: College;
};

export function CollegeCard({ college }: CollegeCardProps) {
  const brand = getCollegeBrand(college.name);
  const surfaceStyle = getCollegeSurfaceStyle(college.name);

  return (
    <article className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-sm transition-transform duration-300 hover:-translate-y-1" style={surfaceStyle}>
      <div className="relative h-40 overflow-hidden border-b border-white/10 px-5 py-5">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),transparent_55%,rgba(2,6,23,0.55))]" />
        <div className="relative flex h-full items-start justify-between gap-4">
          <CollegeCrest collegeName={college.name} size={74} />
          <div className="rounded-full border border-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: brand.palette.ink, backgroundColor: `${brand.palette.soft}cc` }}>
            Level {college.base_level}
          </div>
        </div>
        <div className="relative mt-4 max-w-[14rem]">
          <p className="text-xs uppercase tracking-[0.32em] text-white/65">{brand.nickname}</p>
          <h3 className="mt-2 text-2xl font-black leading-tight text-white">{college.name}</h3>
        </div>
      </div>
      <div className="flex items-center justify-between bg-slate-950/72 p-5 text-white backdrop-blur-sm">
        <p className="text-sm font-semibold text-slate-300">Season Points</p>
        <AnimatedNumber value={college.total_points} className="text-2xl font-black text-white" />
      </div>
    </article>
  );
}
