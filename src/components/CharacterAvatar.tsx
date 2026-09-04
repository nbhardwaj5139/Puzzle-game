import { hairHex, skinHex } from '../game/appearance'
import type { Appearance } from '../game/types'

type Size = 'token' | 'sm' | 'md' | 'lg'

const PX: Record<Size, number> = { token: 26, sm: 34, md: 52, lg: 96 }

interface CharacterAvatarProps {
  appearance: Appearance
  /** Outfit colour — the player's accent. */
  accent: string
  size?: Size
  className?: string
  title?: string
}

/**
 * A small parametric coworker. The same drawing is the map token and the roster
 * portrait, so the person you customise is literally the person you move.
 */
export function CharacterAvatar({
  appearance,
  accent,
  size = 'md',
  className = '',
  title,
}: CharacterAvatarProps) {
  const skin = skinHex(appearance.skin)
  const hair = hairHex(appearance.hairColour)
  const px = PX[size]

  return (
    <svg
      viewBox="0 0 48 48"
      width={px}
      height={px}
      className={className}
      role="img"
      aria-label={title ?? 'Coworker'}
    >
      {title ? <title>{title}</title> : null}

      {/* torso */}
      <path
        d="M 11 48 v -9 a 13 13 0 0 1 26 0 v 9 z"
        fill={accent}
      />
      {appearance.outfit === 'hoodie' ? (
        <path d="M 17 39 h 14 v 9 h -14 z" fill="#00000026" />
      ) : null}
      {appearance.outfit === 'blazer' ? (
        <>
          <path d="M 20 34 l 4 8 l 4 -8 v 14 h -8 z" fill="#0e1119" opacity="0.8" />
          <path d="M 22.4 36 h 3.2 v 12 h -3.2 z" fill="#e8ecf6" />
        </>
      ) : null}
      {appearance.outfit === 'vest' ? (
        <>
          <rect x="12" y="40" width="24" height="3.4" fill="#ffe36b" />
          <rect x="12" y="45" width="24" height="3.4" fill="#ffe36b" />
        </>
      ) : null}
      {appearance.outfit === 'tee' ? (
        <path d="M 24 34 l 4 4 l -4 3 l -4 -3 z" fill="#ffffff" opacity="0.18" />
      ) : null}

      {/* neck + head */}
      <rect x="21" y="30" width="6" height="6" fill={skin} />
      <rect x="15" y="14" width="18" height="19" rx="8" fill={skin} />

      {/* hair */}
      {appearance.hair === 'crop' ? (
        <path d="M 15 22 v -3 a 9 9 0 0 1 18 0 v 3 a 12 12 0 0 0 -18 0 z" fill={hair} />
      ) : null}
      {appearance.hair === 'wave' ? (
        <path
          d="M 15 23 v -4 a 9 9 0 0 1 18 0 v 4 q -3 -4 -6 -1 q -3 3 -6 0 q -3 -3 -6 1 z"
          fill={hair}
        />
      ) : null}
      {appearance.hair === 'bun' ? (
        <>
          <circle cx="24" cy="10" r="4.6" fill={hair} />
          <path d="M 15 22 v -3 a 9 9 0 0 1 18 0 v 3 a 12 12 0 0 0 -18 0 z" fill={hair} />
        </>
      ) : null}
      {appearance.hair === 'long' ? (
        <>
          <path d="M 13 34 v -15 a 11 11 0 0 1 22 0 v 15 h -4 v -13 h -14 v 13 z" fill={hair} />
        </>
      ) : null}
      {appearance.hair === 'curls' ? (
        <>
          {[
            [17, 17],
            [21, 14],
            [25, 13.6],
            [29, 15],
            [32, 19],
            [16, 21],
          ].map(([cx, cy]) => (
            <circle key={`curl-${cx}-${cy}`} cx={cx} cy={cy} r="4.4" fill={hair} />
          ))}
        </>
      ) : null}

      {/* face */}
      <rect x="19.6" y="23" width="2.4" height="3" rx="1.2" fill="#181c26" />
      <rect x="26" y="23" width="2.4" height="3" rx="1.2" fill="#181c26" />
      <path
        d="M 21.4 28.6 q 2.6 2 5.2 0"
        fill="none"
        stroke="#181c26"
        strokeWidth="1.3"
        strokeLinecap="round"
      />

      {/* accessories */}
      {appearance.accessory === 'glasses' ? (
        <g stroke="#e8ecf6" strokeWidth="1.3" fill="none">
          <rect x="17.8" y="21.6" width="6.2" height="5.2" rx="2" />
          <rect x="24.8" y="21.6" width="6.2" height="5.2" rx="2" />
          <path d="M 24 24 h 0.8 M 17.8 23.4 h -2.4 M 31 23.4 h 2" />
        </g>
      ) : null}
      {appearance.accessory === 'headphones' ? (
        <g fill="#1d2230">
          <path
            d="M 14 25 v -5 a 10 10 0 0 1 20 0 v 5"
            fill="none"
            stroke="#1d2230"
            strokeWidth="3"
          />
          <rect x="11.6" y="22" width="5" height="8" rx="2.4" />
          <rect x="31.4" y="22" width="5" height="8" rx="2.4" />
        </g>
      ) : null}
      {appearance.accessory === 'lanyard' ? (
        <>
          <path
            d="M 21 33 L 24 41 L 27 33"
            fill="none"
            stroke="#45d0ff"
            strokeWidth="1.6"
          />
          <rect x="21.4" y="40" width="5.4" height="7" rx="1.2" fill="#e8ecf6" />
        </>
      ) : null}
      {appearance.accessory === 'mug' ? (
        <g>
          <rect x="33" y="38" width="8" height="8" rx="1.6" fill="#e8ecf6" />
          <path
            d="M 41 40 q 3 0 3 2 q 0 2 -3 2"
            fill="none"
            stroke="#e8ecf6"
            strokeWidth="1.5"
          />
        </g>
      ) : null}
      {appearance.accessory === 'cap' ? (
        <>
          <path d="M 14 20 a 10 10 0 0 1 20 0 z" fill="#1f2a3d" />
          <path d="M 33 20 h 7 v 2.6 h -7 z" fill="#16202f" />
        </>
      ) : null}
    </svg>
  )
}
