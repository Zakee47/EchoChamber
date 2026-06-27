"use client";

import type { RosterEntry, VisualCard, VisualCardType } from "@echochamber/shared";

const META: Record<VisualCardType, { label: string; color: string; icon: string }> = {
  takeaway: { label: "Takeaway", color: "#10B981", icon: "★" },
  framework: { label: "Framework", color: "#6366F1", icon: "◆" },
  action_item: { label: "Action item", color: "#F59E0B", icon: "→" },
};

export function CardsSidebar({
  cards,
  rosterMap,
}: {
  cards: VisualCard[];
  rosterMap: Map<string, RosterEntry>;
}) {
  return (
    <div className="flex h-full flex-col">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold rt-text">
        Insight cards
        <span className="rounded-full rt-chip rt-muted px-2 py-0.5 text-xs">
          {cards.length}
        </span>
      </h3>
      <div className="transcript-scroll flex-1 space-y-3 overflow-y-auto pr-1">
        {cards.length === 0 && (
          <p className="pt-6 text-center text-xs rt-soft">
            Frameworks, takeaways &amp; action items appear here as the panel debates.
          </p>
        )}
        {[...cards].reverse().map((card) => {
          const m = META[card.type];
          const name = rosterMap.get(card.attribution)?.name ?? card.attribution;
          return (
            <div
              key={card.id}
              className="animate-float-in rounded-xl border rt-divider rt-chip p-3"
            >
              <div className="mb-1.5 flex items-center gap-2">
                <span
                  className="flex h-5 w-5 items-center justify-center rounded-md text-xs"
                  style={{ background: `${m.color}22`, color: m.color }}
                >
                  {m.icon}
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: m.color }}>
                  {m.label}
                </span>
              </div>
              <p className="text-sm leading-snug rt-text">{card.text}</p>
              <p className="mt-1.5 text-[11px] rt-soft">— {name}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
