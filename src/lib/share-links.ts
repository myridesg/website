/**
 * Share addresses for a guide. Plain links into each app's own share screen:
 * no SDK, no script and nothing the page loads from WhatsApp or Telegram.
 * Spaces go as %20, not "+": a share screen may show a "+" as it is.
 */
export function shareLinks(url: string, title: string): { whatsapp: string; telegram: string } {
  const q = encodeURIComponent
  return {
    // WhatsApp takes one text field, so the address goes at the end of it.
    whatsapp: `https://wa.me/?text=${q(`${title} ${url}`)}`,
    telegram: `https://t.me/share/url?url=${q(url)}&text=${q(title)}`,
  }
}
