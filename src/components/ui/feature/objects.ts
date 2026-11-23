import pump from '@/assets/home/pump.png'
import receipt from '@/assets/home/receipt.png'
import chart from '@/assets/home/chart.png'
import map from '@/assets/home/map.png'
import coe from '@/assets/home/tool-coe.png'
import petrol from '@/assets/home/tool-petrol.png'
import workshops from '@/assets/home/tool-workshops.png'
import guides from '@/assets/home/next-guides.png'

/**
 * The 3D objects the feature pages stand on the studio floor: the home
 * page's family, nothing new. k evens out their optical size at one shared
 * height (the --icon of the list they are in): broad objects read larger
 * than tall narrow ones, so they stand a little shorter. The tool icons'
 * values are the ones HomeSingapore.astro uses.
 */
export const OBJECTS = {
  pump: { image: pump, k: 1 },
  receipt: { image: receipt, k: 1 },
  chart: { image: chart, k: 0.8 },
  map: { image: map, k: 0.78 },
  coe: { image: coe, k: 1 },
  petrol: { image: petrol, k: 1 },
  workshops: { image: workshops, k: 0.96 },
  guides: { image: guides, k: 1 },
} satisfies Record<string, { image: ImageMetadata; k: number }>

export type ObjectKey = keyof typeof OBJECTS

/** The custom properties a .tool__art box is sized by. */
export function objectStyle(key: ObjectKey) {
  const { image, k } = OBJECTS[key]
  return `--k: ${k}; --ratio: ${(image.width / image.height).toFixed(4)}`
}

/** Served at the native size and half of it: small renders, sharpest as they are. */
export function objectWidths(key: ObjectKey) {
  const { image } = OBJECTS[key]
  return [Math.round(image.width / 2), image.width]
}
