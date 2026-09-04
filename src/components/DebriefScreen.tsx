import { LEVELS, TOTAL_LEVELS, levelAt } from '../game/levels'
import { getSkill } from '../game/skills'
import { useGame } from '../game/store'
import { Button, Chip, Panel, SectionLabel } from './ui/kit'
import { LogFeed } from './LogFeed'
import { CharacterAvatar } from './CharacterAvatar'

export function DebriefScreen() {
  const levelIndex = useGame((s) => s.levelIndex)
  const results = useGame((s) => s.results)
  const totalScore = useGame((s) => s.totalScore)
  const lastLevelScore = useGame((s) => s.lastLevelScore)
  const strikesLeft = useGame((s) => s.strikesLeft)
  const players = useGame((s) => s.players)
  const log = useGame((s) => s.log)
  const advance = useGame((s) => s.advance)
  const retryLevel = useGame((s) => s.retryLevel)

  const level = levelAt(levelIndex)
  const result = results.find((r) => r.levelId === level.id)
  const cleared = Boolean(result?.cleared)
  const isLast = levelIndex === TOTAL_LEVELS - 1

  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <Panel glow={cleared} className="animate-rise p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <SectionLabel>{level.codename} debrief</SectionLabel>
            <h1
              className={`mt-1 text-3xl font-black tracking-tight sm:text-4xl ${
                cleared ? 'text-neon text-glow' : 'text-flare'
              }`}
            >
              {cleared ? 'STAGE CLEARED' : 'CLOCK EXPIRED'}
            </h1>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
              {level.title} · {level.location}
            </p>
          </div>
          <div className="text-right">
            <div className="label-caps">Payout</div>
            <div
              className={`font-mono text-4xl font-black tabular-nums ${
                cleared ? 'text-neon' : 'text-ink-faint'
              }`}
            >
              {lastLevelScore}
            </div>
            <div className="label-caps mt-1">Banked total {totalScore}</div>
          </div>
        </div>

        <p className="mt-5 rounded-lg border border-hairline bg-carbon/60 p-4 text-[13px] leading-relaxed text-ink-soft">
          {cleared ? level.payoff : 'The stage reset itself and the lockdown clock rolled back to full. Nothing you learned is lost — but a coffee refill is.'}
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          {[
            { label: 'Time left', value: result ? `${result.secondsLeft}s` : '—' },
            { label: 'Misses', value: String(result?.attempts ?? 0) },
            { label: 'Hints', value: String(result?.hintsUsed ?? 0) },
            {
              label: 'Refills left',
              value: '☕'.repeat(Math.max(0, strikesLeft)) || 'none',
            },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg border border-hairline p-3">
              <div className="label-caps">{stat.label}</div>
              <div className="mt-0.5 font-mono text-lg font-bold text-ink">
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {result && result.skillsUsed.length > 0 ? (
          <div className="mt-4">
            <SectionLabel>Charges spent</SectionLabel>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {result.skillsUsed.map((id, i) => {
                const skill = getSkill(id)
                return (
                  <Chip key={`${id}-${i}`} accent={skill.accent}>
                    {skill.glyph} {skill.name}
                  </Chip>
                )
              })}
              {result.doubled ? <Chip accent="#ff5cc8">×2 payout applied</Chip> : null}
            </div>
          </div>
        ) : null}

        <div className="mt-5">
          <SectionLabel>Campaign</SectionLabel>
          <div className="mt-2 flex flex-wrap gap-2">
            {LEVELS.map((l, i) => {
              const r = results.find((x) => x.levelId === l.id)
              const state = r?.cleared ? 'done' : i === levelIndex ? 'here' : 'todo'
              return (
                <div
                  key={l.id}
                  className={`flex-1 rounded-lg border p-2.5 ${
                    state === 'done'
                      ? 'border-neon/40 bg-neon/5'
                      : state === 'here'
                        ? 'border-amber-signal/40 bg-amber-signal/5'
                        : 'border-hairline'
                  }`}
                >
                  <div className="font-mono text-[9px] tracking-[0.14em] text-ink-faint">
                    {l.codename}
                  </div>
                  <div className="text-[12px] font-semibold text-ink">{l.title}</div>
                  <div className="font-mono text-[10px] text-ink-faint">
                    {r?.cleared ? `${r.score} pts` : state === 'here' ? 'in play' : 'sealed'}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2 border-t border-hairline pt-5">
          {cleared ? (
            <Button tone="primary" size="lg" onClick={advance}>
              {isLast ? 'Walk out of the building ▸' : 'Advance to the next stage ▸'}
            </Button>
          ) : (
            <Button tone="primary" size="lg" onClick={retryLevel}>
              Retry {level.codename} ▸
            </Button>
          )}
          <div className="ml-auto flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
              crew of {players.length}
            </span>
            {players.map((p) => (
              <CharacterAvatar
                key={p.id}
                appearance={p.appearance}
                accent={p.accent}
                size="sm"
                title={p.name}
              />
            ))}
          </div>
        </div>
      </Panel>

      <Panel className="mt-4 flex max-h-64 flex-col p-4">
        <LogFeed log={log} className="min-h-0 flex-1" />
      </Panel>
    </div>
  )
}
