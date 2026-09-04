import { getSkill } from '../game/skills'
import type { Player } from '../game/types'
import { CharacterAvatar } from './CharacterAvatar'

interface PlayerTagProps {
  player: Player
  size?: 'sm' | 'md' | 'lg'
  showRole?: boolean
  showSkill?: boolean
  className?: string
}

const FRAME = { sm: 'h-9 w-9', md: 'h-12 w-12', lg: 'h-20 w-20' } as const
const GLYPH = { sm: 'sm', md: 'sm', lg: 'md' } as const

export function PlayerTag({
  player,
  size = 'md',
  showRole = true,
  showSkill = false,
  className = '',
}: PlayerTagProps) {
  const skill = getSkill(player.skillId)
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        className={`flex shrink-0 items-end justify-center overflow-hidden rounded-xl border ${FRAME[size]}`}
        style={{
          borderColor: `${player.accent}66`,
          backgroundColor: `${player.accent}14`,
          boxShadow: `0 0 22px -10px ${player.accent}`,
        }}
      >
        <CharacterAvatar
          appearance={player.appearance}
          accent={player.accent}
          size={GLYPH[size]}
          title={player.name}
        />
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-ink">
          <span aria-hidden className="mr-1">
            {player.avatar}
          </span>
          {player.name}
        </div>
        {showRole ? (
          <div className="truncate font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
            {player.role}
          </div>
        ) : null}
        {showSkill ? (
          <div
            className="mt-1 truncate font-mono text-[10px] uppercase tracking-[0.12em]"
            style={{ color: skill.accent }}
          >
            {skill.glyph} {skill.name} — {player.skillLabel}
          </div>
        ) : null}
      </div>
    </div>
  )
}
