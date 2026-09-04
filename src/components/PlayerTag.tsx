import { getSkill } from '../game/skills'
import type { Player } from '../game/types'

interface PlayerTagProps {
  player: Player
  size?: 'sm' | 'md' | 'lg'
  showRole?: boolean
  showSkill?: boolean
  className?: string
}

const AVATAR_SIZE = { sm: 'h-8 w-8 text-base', md: 'h-11 w-11 text-xl', lg: 'h-16 w-16 text-3xl' }

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
        className={`flex shrink-0 items-center justify-center rounded-xl border ${AVATAR_SIZE[size]}`}
        style={{
          borderColor: `${player.accent}66`,
          backgroundColor: `${player.accent}14`,
          boxShadow: `0 0 22px -10px ${player.accent}`,
        }}
      >
        <span aria-hidden>{player.avatar}</span>
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-ink">{player.name}</div>
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
