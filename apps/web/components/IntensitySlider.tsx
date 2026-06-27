"use client";

import type { DebateIntensity } from "@echochamber/shared";
import { INTENSITY } from "@echochamber/shared";

const COLORS: Record<DebateIntensity, string> = {
  1: "#10B981",
  2: "#F59E0B",
  3: "#EF4444",
};

export function IntensitySlider({
  value,
  onChange,
  compact = false,
}: {
  value: DebateIntensity;
  onChange: (v: DebateIntensity) => void;
  compact?: boolean;
}) {
  const cfg = INTENSITY[value];
  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium rt-muted">Debate intensity</span>
        <span className="text-sm font-semibold" style={{ color: COLORS[value] }}>
          {cfg.label}
        </span>
      </div>
      <div className="flex gap-2">
        {([1, 2, 3] as DebateIntensity[]).map((lvl) => (
          <button
            key={lvl}
            type="button"
            onClick={() => onChange(lvl)}
            className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition ${
              value === lvl ? "" : "rt-divider rt-muted rt-hover"
            }`}
            style={value === lvl ? { background: `${COLORS[lvl]}22`, borderColor: COLORS[lvl], color: COLORS[lvl] } : {}}
          >
            {INTENSITY[lvl].label}
          </button>
        ))}
      </div>
      {!compact && <p className="mt-2 text-xs leading-relaxed rt-soft">{cfg.directive}</p>}
    </div>
  );
}
