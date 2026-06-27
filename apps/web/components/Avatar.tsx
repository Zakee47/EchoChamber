import type { RosterEntry } from "@echochamber/shared";

export type AvatarState = "idle" | "thinking" | "speaking";

const SIZES: Record<string, { box: string; text: string }> = {
  sm: { box: "h-9 w-9", text: "text-xs" },
  md: { box: "h-12 w-12", text: "text-sm" },
  lg: { box: "h-16 w-16", text: "text-base" },
  xl: { box: "h-24 w-24", text: "text-2xl" },
};

export function Avatar({
  expert,
  size = "md",
  state = "idle",
  ring = true,
}: {
  expert: Pick<RosterEntry, "name" | "avatar">;
  size?: keyof typeof SIZES;
  state?: AvatarState;
  ring?: boolean;
}) {
  const s = SIZES[size] ?? SIZES.md!;
  const speaking = state === "speaking";
  const thinking = state === "thinking";
  return (
    <span className="relative inline-flex items-center justify-center">
      {speaking && (
        <span
          className="absolute inset-0 rounded-full animate-pulse-ring"
          style={{ boxShadow: `0 0 0 4px ${expert.avatar.color}` }}
        />
      )}
      <span
        className={`${s.box} ${s.text} relative inline-flex items-center justify-center rounded-full font-semibold text-white transition-all duration-300 ${
          ring ? "ring-2" : ""
        }`}
        style={{
          background: `linear-gradient(135deg, ${expert.avatar.color}, ${expert.avatar.color}99)`,
          boxShadow: speaking ? `0 0 0 3px ${expert.avatar.color}, 0 0 32px 0 ${expert.avatar.color}aa` : undefined,
          ...(ring ? { ["--tw-ring-color" as string]: `${expert.avatar.color}55` } : {}),
        }}
        title={expert.name}
      >
        {expert.avatar.initials}
        {thinking && (
          <span className="absolute -bottom-1 flex gap-0.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-1 w-1 rounded-full bg-white/90 animate-speaking-bars"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </span>
        )}
      </span>
    </span>
  );
}
