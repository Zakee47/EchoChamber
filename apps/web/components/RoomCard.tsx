"use client";

import Link from "next/link";
import type { RosterEntry } from "@echochamber/shared";
import type { LobbyRoom } from "@/lib/mockData";
import { CATEGORY_COLORS } from "@/lib/config";
import { Avatar } from "./Avatar";

export function RoomCard({
  room,
  rosterMap,
}: {
  room: LobbyRoom;
  rosterMap: Map<string, RosterEntry>;
}) {
  const color = CATEGORY_COLORS[room.category] ?? "#7c5cff";
  const experts = room.panel.map((id) => rosterMap.get(id)).filter(Boolean) as RosterEntry[];
  return (
    <Link
      href={`/room/${room.roomId}`}
      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl rt-surface p-5 transition hover:-translate-y-0.5"
    >
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-20 blur-2xl transition group-hover:opacity-40"
        style={{ background: color }}
      />
      <div className="relative">
        <div className="mb-3 flex items-center gap-2">
          {room.live ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-semibold text-red-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" /> LIVE
            </span>
          ) : (
            <span className="rounded-full rt-chip rt-muted px-2.5 py-1 text-xs font-medium">
              Upcoming
            </span>
          )}
          <span
            className="rounded-full px-2.5 py-1 text-xs font-medium capitalize"
            style={{ background: `${color}22`, color }}
          >
            {room.category}
          </span>
        </div>
        <h3 className="text-[15px] font-semibold leading-snug rt-text line-clamp-2">
          {room.topic}
        </h3>
        <p className="mt-1 text-xs rt-soft">{room.hostBlurb}</p>
      </div>

      <div className="relative mt-5 flex items-center justify-between">
        <div className="flex -space-x-2">
          {experts.slice(0, 5).map((e) => (
            <span key={e.id} className="ring-2 rt-ring rounded-full">
              <Avatar expert={e} size="sm" ring={false} />
            </span>
          ))}
        </div>
        <div className="text-right">
          {room.live ? (
            <span className="text-sm font-semibold rt-text">
              {room.participants.toLocaleString()} <span className="rt-soft">listening</span>
            </span>
          ) : (
            <span className="text-sm font-medium rt-accent-text transition group-hover:translate-x-0.5">
              Join →
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
