export const reactionOptions = [
  { id: "thumbsUp", label: "Me alegra", emoji: "👍" },
  { id: "heart", label: "Te abrazo", emoji: "❤️" },
  { id: "hope", label: "Te entiendo", emoji: "😢" },
  { id: "clap", label: "Te apoyo", emoji: "🙌" },
] as const;

export type ReactionId = (typeof reactionOptions)[number]["id"];

export function totalReactions(counts: ReactionCountRecord): number {
  return (
    counts.reactionThumbsUp +
    counts.reactionHeart +
    counts.reactionHope +
    counts.reactionClap
  );
}

export type ReactionCountRecord = {
  reactionThumbsUp: number;
  reactionHeart: number;
  reactionHope: number;
  reactionClap: number;
};

export function reactionsFromCookie(value: string | undefined): ReactionId[] {
  if (!value) return [];

  const allowed = new Set(reactionOptions.map(option => option.id));
  return value
    .split(",")
    .map(token => token.trim())
    .filter((token): token is ReactionId => allowed.has(token as ReactionId));
}
