export function postTokenCookie(slug: string) {
  return `post-token-${slug}`;
}

export function commentTokenCookie(id: string) {
  return `comment-token-${id}`;
}

export function postReactionCookie(slug: string) {
  return `post-reactions-${slug}`;
}

export function commentReactionCookie(id: string) {
  return `comment-reactions-${id}`;
}

export function adminTokenCookie() {
  return "va-admin-token";
}
