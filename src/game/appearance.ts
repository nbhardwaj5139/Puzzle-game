import type { Appearance } from './types'

export const SKIN_TONES = [
  { id: 'porcelain', hex: '#f2d3bd' },
  { id: 'sand', hex: '#e0b48f' },
  { id: 'honey', hex: '#c68b62' },
  { id: 'umber', hex: '#9a5f3c' },
  { id: 'cocoa', hex: '#6f4227' },
  { id: 'espresso', hex: '#4a2b1a' },
] as const

export const HAIR_STYLES = [
  { id: 'crop', label: 'Crop' },
  { id: 'wave', label: 'Waves' },
  { id: 'bun', label: 'Bun' },
  { id: 'long', label: 'Long' },
  { id: 'curls', label: 'Curls' },
  { id: 'bald', label: 'Clean' },
] as const

export const HAIR_COLOURS = [
  { id: 'ink', hex: '#1d1f26' },
  { id: 'chestnut', hex: '#5a3320' },
  { id: 'sand', hex: '#c2914f' },
  { id: 'rust', hex: '#b1502a' },
  { id: 'silver', hex: '#b9c1d1' },
  { id: 'punch', hex: '#d4409a' },
] as const

export const ACCESSORIES = [
  { id: 'none', label: 'None' },
  { id: 'glasses', label: 'Glasses' },
  { id: 'headphones', label: 'Headphones' },
  { id: 'lanyard', label: 'Lanyard' },
  { id: 'mug', label: 'Mug' },
  { id: 'cap', label: 'Cap' },
] as const

export const OUTFITS = [
  { id: 'tee', label: 'Tee' },
  { id: 'hoodie', label: 'Hoodie' },
  { id: 'blazer', label: 'Blazer' },
  { id: 'vest', label: 'Hi-vis' },
] as const

export type SkinToneId = (typeof SKIN_TONES)[number]['id']
export type HairStyleId = (typeof HAIR_STYLES)[number]['id']
export type HairColourId = (typeof HAIR_COLOURS)[number]['id']
export type AccessoryId = (typeof ACCESSORIES)[number]['id']
export type OutfitId = (typeof OUTFITS)[number]['id']

export function skinHex(id: SkinToneId): string {
  return SKIN_TONES.find((t) => t.id === id)?.hex ?? SKIN_TONES[0].hex
}

export function hairHex(id: HairColourId): string {
  return HAIR_COLOURS.find((c) => c.id === id)?.hex ?? HAIR_COLOURS[0].hex
}

function pick<T>(items: readonly T[], index: number): T {
  return items[index % items.length]!
}

/** Deterministic starting look, so each new roster slot differs from the last. */
export function defaultAppearance(seed: number): Appearance {
  return {
    skin: pick(SKIN_TONES, seed).id,
    hair: pick(HAIR_STYLES, seed * 2 + 1).id,
    hairColour: pick(HAIR_COLOURS, seed * 3 + 2).id,
    outfit: pick(OUTFITS, seed).id,
    accessory: pick(ACCESSORIES, seed * 5 + 1).id,
  }
}

export function randomAppearance(): Appearance {
  const roll = <T,>(items: readonly T[]): T =>
    items[Math.floor(Math.random() * items.length)]!
  return {
    skin: roll(SKIN_TONES).id,
    hair: roll(HAIR_STYLES).id,
    hairColour: roll(HAIR_COLOURS).id,
    outfit: roll(OUTFITS).id,
    accessory: roll(ACCESSORIES).id,
  }
}

/** Rosters saved before appearances existed still load. */
export function normaliseAppearance(
  value: Partial<Appearance> | undefined,
  seed: number,
): Appearance {
  const base = defaultAppearance(seed)
  if (!value) return base
  return {
    skin: SKIN_TONES.some((t) => t.id === value.skin) ? value.skin! : base.skin,
    hair: HAIR_STYLES.some((h) => h.id === value.hair) ? value.hair! : base.hair,
    hairColour: HAIR_COLOURS.some((c) => c.id === value.hairColour)
      ? value.hairColour!
      : base.hairColour,
    outfit: OUTFITS.some((o) => o.id === value.outfit) ? value.outfit! : base.outfit,
    accessory: ACCESSORIES.some((a) => a.id === value.accessory)
      ? value.accessory!
      : base.accessory,
  }
}
