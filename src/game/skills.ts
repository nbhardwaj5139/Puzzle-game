import type { SkillArchetype, SkillId } from './types'

export const SKILLS: SkillArchetype[] = [
  {
    id: 'decrypt',
    name: 'Decrypt',
    glyph: '◈',
    tagline: 'Reads the mess other people left behind',
    effect: 'Prints the plain-language version of the current directive to the feed.',
    accent: '#45d0ff',
  },
  {
    id: 'override',
    name: 'Override',
    glyph: '⧗',
    tagline: 'Somehow always gets the deadline moved',
    effect: 'Adds 45 seconds to the level clock.',
    accent: '#ffb43a',
  },
  {
    id: 'insight',
    name: 'Insight',
    glyph: '✦',
    tagline: 'Has been here long enough to just know',
    effect: 'Unlocks the level hint with no score penalty.',
    accent: '#b6f24a',
  },
  {
    id: 'amplify',
    name: 'Amplify',
    glyph: '⇈',
    tagline: 'Turns a small win into an all-hands announcement',
    effect: 'Doubles the score awarded for this level.',
    accent: '#ff5cc8',
  },
  {
    id: 'steady',
    name: 'Steady Hands',
    glyph: '⛊',
    tagline: 'Never once fat-fingered a production deploy',
    effect: 'Absorbs the next wrong entry — no penalty, no strike.',
    accent: '#35f2c0',
  },
  {
    id: 'network',
    name: 'Networker',
    glyph: '⌬',
    tagline: 'Knows exactly who to ask',
    effect: 'Reveals one correct position on the active lock.',
    accent: '#ff4d6d',
  },
]

const SKILL_MAP = new Map<SkillId, SkillArchetype>(SKILLS.map((s) => [s.id, s]))

export function getSkill(id: SkillId): SkillArchetype {
  const found = SKILL_MAP.get(id)
  if (!found) throw new Error(`Unknown skill archetype: ${id}`)
  return found
}
