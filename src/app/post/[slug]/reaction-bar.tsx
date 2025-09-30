"use client";

import { useMemo, useState, useTransition } from "react";

import { reactToPost } from "@/app/actions";
import { reactionOptions, type ReactionCountRecord, type ReactionId } from "@/lib/reactions";

type ReactionBarProps = {
  slug: string;
  initialCounts: ReactionCountRecord;
  initialViewerReactions: ReactionId[];
};

type OptimisticState = {
  counts: ReactionCountRecord;
  active: Set<ReactionId>;
};

export function ReactionBar({ slug, initialCounts, initialViewerReactions }: ReactionBarProps) {
  const [feedback, setFeedback] = useState("");
  const [isPending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState<OptimisticState>({
    counts: { ...initialCounts },
    active: new Set(initialViewerReactions),
  });

  const total = useMemo(
    () =>
      optimistic.counts.reactionThumbsUp +
      optimistic.counts.reactionHeart +
      optimistic.counts.reactionHope +
      optimistic.counts.reactionClap,
    [optimistic.counts],
  );

  const handleToggle = (reaction: ReactionId) => {
    setOptimistic(prev => {
      const active = new Set(prev.active);
      const counts = { ...prev.counts };
      const key = reactionKey(reaction);
      const isActive = active.has(reaction);

      if (isActive) {
        active.delete(reaction);
        counts[key] = Math.max(0, counts[key] - 1);
      } else {
        active.add(reaction);
        counts[key] += 1;
      }

      return { counts, active };
    });

    const formData = new FormData();
    formData.append("slug", slug);
    formData.append("reaction", reaction);

    startTransition(async () => {
      const result = await reactToPost(undefined, formData);
      setFeedback(result?.message ?? "");
    });
  };

  return (
    <div className="rounded-3xl border border-indigo-300/40 bg-indigo-500/10 p-4 text-sm text-indigo-100 shadow-inner shadow-indigo-900/20">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs uppercase tracking-widest text-indigo-200/80">Reacciones rápidas</span>
        <span className="rounded-full border border-indigo-300/30 px-2 py-0.5 text-[11px] uppercase tracking-wide text-indigo-100/80">
          {total} {total === 1 ? "apoyo" : "apoyos"}
        </span>
        {feedback ? <span className="text-[11px] text-indigo-200/80">{feedback}</span> : null}
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        {reactionOptions.map(option => {
          const isActive = optimistic.active.has(option.id);
          const count = optimistic.counts[reactionKey(option.id)];
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => handleToggle(option.id)}
              className={`group flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                isActive
                  ? "border-white/80 bg-white/20 text-white shadow-lg shadow-indigo-500/30"
                  : "border-white/20 bg-white/10 text-indigo-100 hover:border-white/40 hover:bg-white/20"
              } ${isPending ? "pointer-events-none opacity-70" : ""}`}
            >
              <span className="text-lg leading-none">{option.emoji}</span>
              <span>{option.label}</span>
              <span className="rounded-full bg-black/30 px-2 text-xs text-white/90">{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function reactionKey(reaction: ReactionId): keyof ReactionCountRecord {
  switch (reaction) {
    case "thumbsUp":
      return "reactionThumbsUp";
    case "heart":
      return "reactionHeart";
    case "hope":
      return "reactionHope";
    case "clap":
      return "reactionClap";
  }
}
