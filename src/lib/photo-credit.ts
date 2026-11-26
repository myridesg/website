/**
 * A photo's credit line, split so the page can link its two parts: who took
 * it (to the photo's own page) and the Creative Commons licence (to the
 * licence). CC licences ask for both, and CC 4.0 also asks to say the picture
 * was changed: every cover crops its photo to the panel, so a CC credit ends
 * "cropped".
 *
 * Credits are stored in Sanity as one line, written the way Wikimedia Commons
 * suggests: "Rainmaker47, CC BY-SA 3.0, via Wikimedia Commons". A credit with
 * no CC licence in it (Unsplash, public domain) stays one link. A credit that
 * mentions CC in any other form fails the build.
 */

export interface PhotoCredit {
  /** The credit up to the licence, e.g. "Rainmaker47". */
  author: string
  licence: { name: string; url: string } | null
  /** What follows the licence, e.g. ", via Wikimedia Commons". */
  rest: string
}

const CC_LICENCE = /CC(?: (BY(?:-SA|-ND|-NC|-NC-SA|-NC-ND)?)|(0)) (\d\.\d)/

export function parsePhotoCredit(credit: string): PhotoCredit {
  const match = CC_LICENCE.exec(credit)
  if (!match) {
    // A CC credit written another way would lose its licence link without
    // anyone noticing, and the link is what the licence asks for.
    if (/\bCC\b|creative commons/i.test(credit)) {
      throw new Error(`Photo credit names a CC licence this site cannot link: "${credit}". Write it like "Author, CC BY-SA 4.0, via Wikimedia Commons".`)
    }
    return { author: credit, licence: null, rest: '' }
  }
  const [name, by, zero, version] = match
  const url =
    zero
      ? `https://creativecommons.org/publicdomain/zero/${version}/`
      : `https://creativecommons.org/licenses/${by.toLowerCase()}/${version}/`
  return {
    author: credit.slice(0, match.index).replace(/,\s*$/, ''),
    licence: { name, url },
    rest: credit.slice(match.index + name.length),
  }
}
