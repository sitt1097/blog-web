export function postTokenCookie(slug: string) {
  return `post-token-${slug}`;
}

export function commentTokenCookie(id: string) {
  return `comment-token-${id}`;
}
