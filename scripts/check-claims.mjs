// Claims the site must not publish without current evidence (AGENTS.md rule 6
// and the home page's global constraints). Each pattern is case-insensitive.
const bannedClaimPatterns = [
  // Rider, user, download or workshop counts: "1,251 riders", "4,800+ downloads", "10k users"
  /\b\d[\d,.]*\s*k?\+?\s*(?:riders?|users?|downloads?|workshops?)\b/gi,
  // Ratings and review counts: "rated 5.0", "5 stars", "320 reviews"
  /\brated\s+\d(?:\.\d+)?/gi,
  /\b\d(?:\.\d+)?\s*-?\s*stars?\b/gi,
  /\b\d[\d,]*\+?\s*(?:reviews?|ratings?)\b/gi,
  /\bverified\b/gi,
  /\bfree\s+forever\b/gi,
  /\breal[\s-]?time\b/gi,
  /\btestimonials?\b/gi,
  // Workshop booking: "book a slot", "booking". "does not book" is allowed.
  /\bbook\s+(?:a|an|your)\b/gi,
  /\bbookings?\b/gi,
  /\brider\s+club\b/gi,
  /\brewards?\b/gi,
  /\bvouchers?\b/gi,
  /\bchop\s+cards?\b/gi,
  /\bwallet\s+pass(?:es)?\b/gi,
  /\bsouth[\s-]?east\s+asia\b/gi,
]

export function findBannedClaims(text) {
  return bannedClaimPatterns.flatMap((pattern) => [...text.matchAll(pattern)].map((match) => match[0]))
}
