import { useState } from 'react'
import { ACCENTS, AVATARS, ROLE_SUGGESTIONS, SKILL_LABEL_SUGGESTIONS } from '../game/avatars'
import {
  ACCESSORIES,
  HAIR_COLOURS,
  HAIR_STYLES,
  OUTFITS,
  SKIN_TONES,
  defaultAppearance,
  hairHex,
  randomAppearance,
  skinHex,
} from '../game/appearance'
import { CharacterAvatar } from './CharacterAvatar'
import { SKILLS, getSkill } from '../game/skills'
import { MAX_PLAYERS, MIN_PLAYERS, useGame } from '../game/store'
import type { Appearance, Player, SkillId } from '../game/types'
import { Button, Chip, Field, Panel, SectionLabel, inputClass } from './ui/kit'
import { RealityCheckPanel } from './RealityCheckPanel'

interface Draft {
  name: string
  role: string
  skillLabel: string
  skillId: SkillId
  avatar: string
  accent: string
  appearance: Appearance
}

function emptyDraft(index: number): Draft {
  return {
    name: '',
    role: ROLE_SUGGESTIONS[index % ROLE_SUGGESTIONS.length] ?? '',
    skillLabel: SKILL_LABEL_SUGGESTIONS[index % SKILL_LABEL_SUGGESTIONS.length] ?? '',
    skillId: SKILLS[index % SKILLS.length]?.id ?? 'decrypt',
    avatar: AVATARS[index % AVATARS.length] ?? '🧑‍💻',
    accent: ACCENTS[index % ACCENTS.length] ?? '#35f2c0',
    appearance: defaultAppearance(index),
  }
}

export function RosterScreen() {
  const players = useGame((s) => s.players)
  const mode = useGame((s) => s.mode)
  const addPlayer = useGame((s) => s.addPlayer)
  const updatePlayer = useGame((s) => s.updatePlayer)
  const removePlayer = useGame((s) => s.removePlayer)
  const setMode = useGame((s) => s.setMode)
  const beginBriefing = useGame((s) => s.beginBriefing)
  const goPhase = useGame((s) => s.goPhase)

  const [draft, setDraft] = useState<Draft>(() => emptyDraft(0))
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [calibrationOpen, setCalibrationOpen] = useState(false)

  const full = players.length >= MAX_PLAYERS && !editingId
  const canStart = players.length >= MIN_PLAYERS

  function commit() {
    const name = draft.name.trim()
    if (!name) {
      setError('Give them a name — the game calls people out loud.')
      return
    }
    const clash = players.some(
      (p) => p.id !== editingId && p.name.trim().toLowerCase() === name.toLowerCase(),
    )
    if (clash) {
      setError('Two operators with the same name gets confusing fast.')
      return
    }
    setError(null)
    const payload = {
      name,
      role: draft.role.trim() || 'Team Member',
      skillLabel: draft.skillLabel.trim() || getSkill(draft.skillId).tagline,
      skillId: draft.skillId,
      avatar: draft.avatar,
      accent: draft.accent,
      appearance: draft.appearance,
    }
    if (editingId) {
      updatePlayer(editingId, payload)
      setEditingId(null)
    } else {
      addPlayer(payload)
    }
    setDraft(emptyDraft(players.length + 1))
  }

  function startEdit(player: Player) {
    setEditingId(player.id)
    setError(null)
    setDraft({
      name: player.name,
      role: player.role,
      skillLabel: player.skillLabel,
      skillId: player.skillId,
      avatar: player.avatar,
      accent: player.accent,
      appearance: player.appearance,
    })
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <SectionLabel>Step 1 — the crew</SectionLabel>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-ink sm:text-4xl">
            Who is still in the building?
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
            Add between {MIN_PLAYERS} and {MAX_PLAYERS} coworkers. Their archetype is a
            real ability they spend once per level, so pick it to cover the crew's weak
            spot — not just the one that sounds most like them.
          </p>
        </div>
        <div className="flex gap-2">
          <Button tone="quiet" onClick={() => goPhase('title')}>
            ◂ Back
          </Button>
          <Button onClick={() => setCalibrationOpen(true)}>Reality Check ⚙</Button>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* ---- roster list ---- */}
        <div className="space-y-3">
          {players.length === 0 ? (
            <Panel className="p-8 text-center">
              <p className="text-sm text-ink-soft">
                Nobody on the roster yet. Add your first coworker on the right.
              </p>
            </Panel>
          ) : null}

          {players.map((player, i) => {
            const skill = getSkill(player.skillId)
            return (
              <Panel
                key={player.id}
                className={`animate-rise p-4 ${
                  editingId === player.id ? 'border-neon/60' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="flex h-16 w-16 shrink-0 items-end justify-center overflow-hidden rounded-xl border"
                    style={{
                      borderColor: `${player.accent}66`,
                      backgroundColor: `${player.accent}14`,
                      boxShadow: `0 0 26px -12px ${player.accent}`,
                    }}
                  >
                    <CharacterAvatar
                      appearance={player.appearance}
                      accent={player.accent}
                      size="md"
                      title={player.name}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[10px] text-ink-faint">
                        P{i + 1}
                      </span>
                      <h3 className="text-base font-bold text-ink">
                        <span aria-hidden className="mr-1">
                          {player.avatar}
                        </span>
                        {player.name}
                      </h3>
                      <Chip>{player.role}</Chip>
                      <Chip accent={skill.accent}>
                        {skill.glyph} {skill.name}
                      </Chip>
                    </div>
                    <p className="mt-1.5 text-[12px] italic leading-relaxed text-ink-soft">
                      “{player.skillLabel}”
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-ink-faint">
                      {skill.effect}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1.5">
                    <Button size="sm" tone="quiet" onClick={() => startEdit(player)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      tone="danger"
                      onClick={() => {
                        if (editingId === player.id) setEditingId(null)
                        removePlayer(player.id)
                      }}
                    >
                      Cut
                    </Button>
                  </div>
                </div>
              </Panel>
            )
          })}

          {/* ---- play mode ---- */}
          <Panel className="p-4">
            <SectionLabel>Step 2 — how are you playing?</SectionLabel>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {(
                [
                  {
                    id: 'hotseat' as const,
                    title: 'Pass the device',
                    body: 'One phone or laptop travels. The game blocks a station until the named operator confirms they are holding it.',
                  },
                  {
                    id: 'shared' as const,
                    title: 'Shared screen',
                    body: 'Everyone can see and reach the screen. Station ownership is still shown, just not enforced.',
                  },
                ]
              ).map((option) => {
                const active = mode === option.id
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setMode(option.id)}
                    className={`rounded-lg border p-3 text-left transition-all ${
                      active
                        ? 'border-neon/60 bg-neon/8 shadow-[0_0_30px_-18px] shadow-neon'
                        : 'border-hairline bg-carbon/60 hover:border-neon/40'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          active ? 'bg-neon' : 'bg-hairline'
                        }`}
                      />
                      <span className="text-sm font-semibold text-ink">
                        {option.title}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-ink-soft">
                      {option.body}
                    </p>
                  </button>
                )
              })}
            </div>
          </Panel>

          <Panel glow className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="min-w-0 flex-1">
                <SectionLabel>Step 3 — clock in</SectionLabel>
                <p className="mt-1 text-sm text-ink-soft">
                  {canStart
                    ? `${players.length} operators ready. Checkpoints are dealt round-robin at the start of each stage.`
                    : `Add at least ${MIN_PLAYERS} operators — no checkpoint in this game can be cleared alone.`}
                </p>
              </div>
              <Button
                tone="primary"
                size="lg"
                disabled={!canStart}
                onClick={beginBriefing}
              >
                Enter Bay 4B ▸
              </Button>
            </div>
          </Panel>
        </div>

        {/* ---- add / edit form ---- */}
        <Panel className="h-fit p-5 lg:sticky lg:top-5">
          <SectionLabel>{editingId ? 'Edit operator' : 'Add an operator'}</SectionLabel>

          <div className="mt-4 space-y-4">
            <Field label="Name">
              <input
                className={inputClass}
                value={draft.name}
                maxLength={22}
                placeholder="e.g. Priya"
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commit()
                }}
              />
            </Field>

            <Field label="Role / job title">
              <input
                className={inputClass}
                value={draft.role}
                maxLength={34}
                placeholder="e.g. QA Lead"
                onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value }))}
              />
            </Field>

            <Field
              label="Special workplace skill"
              hint="The in-joke version. Shown whenever they spend a charge."
            >
              <input
                className={inputClass}
                value={draft.skillLabel}
                maxLength={64}
                placeholder="e.g. Fixes the printer by looking at it"
                onChange={(e) => setDraft((d) => ({ ...d, skillLabel: e.target.value }))}
              />
            </Field>

            <div>
              <span className="label-caps mb-1.5 block">Archetype — what it does</span>
              <div className="space-y-1.5">
                {SKILLS.map((skill) => {
                  const active = draft.skillId === skill.id
                  return (
                    <button
                      key={skill.id}
                      type="button"
                      onClick={() => setDraft((d) => ({ ...d, skillId: skill.id }))}
                      className={`flex w-full items-start gap-2.5 rounded-lg border p-2.5 text-left transition-all ${
                        active
                          ? 'bg-white/[0.03]'
                          : 'border-hairline bg-transparent hover:border-hairline'
                      }`}
                      style={
                        active
                          ? {
                              borderColor: `${skill.accent}77`,
                              boxShadow: `0 0 26px -18px ${skill.accent}`,
                            }
                          : undefined
                      }
                    >
                      <span
                        className="mt-0.5 font-mono text-sm leading-none"
                        style={{ color: skill.accent }}
                      >
                        {skill.glyph}
                      </span>
                      <span className="min-w-0">
                        <span
                          className="block font-mono text-[11px] font-semibold uppercase tracking-[0.12em]"
                          style={{ color: active ? skill.accent : '#e8ecf6' }}
                        >
                          {skill.name}
                        </span>
                        <span className="mt-0.5 block text-[11px] leading-relaxed text-ink-soft">
                          {skill.effect}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ---- look ---- */}
            <div className="rounded-xl border border-hairline bg-carbon/60 p-3">
              <div className="flex items-start gap-3">
                <div
                  className="flex h-24 w-24 shrink-0 items-end justify-center overflow-hidden rounded-xl border"
                  style={{
                    borderColor: `${draft.accent}55`,
                    backgroundColor: `${draft.accent}12`,
                  }}
                >
                  <CharacterAvatar
                    appearance={draft.appearance}
                    accent={draft.accent}
                    size="lg"
                    title="Character preview"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="label-caps mb-1 block">Look</span>
                  <p className="text-[11px] leading-relaxed text-ink-faint">
                    This is the token you move around the floor, so make them easy to
                    pick out from across the table.
                  </p>
                  <Button
                    size="sm"
                    className="mt-2"
                    onClick={() =>
                      setDraft((d) => ({ ...d, appearance: randomAppearance() }))
                    }
                  >
                    🎲 Randomise
                  </Button>
                </div>
              </div>

              <div className="mt-3 space-y-3">
                <div>
                  <span className="label-caps mb-1.5 block">Skin</span>
                  <div className="flex flex-wrap gap-1.5">
                    {SKIN_TONES.map((tone) => (
                      <button
                        key={tone.id}
                        type="button"
                        aria-label={`Skin ${tone.id}`}
                        title={tone.id}
                        onClick={() =>
                          setDraft((d) => ({
                            ...d,
                            appearance: { ...d.appearance, skin: tone.id },
                          }))
                        }
                        className={`h-7 w-7 rounded-full border-2 transition-transform ${
                          draft.appearance.skin === tone.id
                            ? 'scale-110 border-ink'
                            : 'border-transparent hover:scale-105'
                        }`}
                        style={{ backgroundColor: skinHex(tone.id) }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <span className="label-caps mb-1.5 block">Hair</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {HAIR_STYLES.map((style) => (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() =>
                          setDraft((d) => ({
                            ...d,
                            appearance: { ...d.appearance, hair: style.id },
                          }))
                        }
                        className={`rounded-md border py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors ${
                          draft.appearance.hair === style.id
                            ? 'border-neon bg-neon/10 text-neon'
                            : 'border-hairline text-ink-faint hover:text-ink'
                        }`}
                      >
                        {style.label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {HAIR_COLOURS.map((colour) => (
                      <button
                        key={colour.id}
                        type="button"
                        aria-label={`Hair ${colour.id}`}
                        title={colour.id}
                        onClick={() =>
                          setDraft((d) => ({
                            ...d,
                            appearance: { ...d.appearance, hairColour: colour.id },
                          }))
                        }
                        className={`h-6 w-6 rounded-full border-2 transition-transform ${
                          draft.appearance.hairColour === colour.id
                            ? 'scale-110 border-ink'
                            : 'border-transparent hover:scale-105'
                        }`}
                        style={{ backgroundColor: hairHex(colour.id) }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <span className="label-caps mb-1.5 block">Outfit</span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {OUTFITS.map((outfit) => (
                      <button
                        key={outfit.id}
                        type="button"
                        onClick={() =>
                          setDraft((d) => ({
                            ...d,
                            appearance: { ...d.appearance, outfit: outfit.id },
                          }))
                        }
                        className={`rounded-md border py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors ${
                          draft.appearance.outfit === outfit.id
                            ? 'border-neon bg-neon/10 text-neon'
                            : 'border-hairline text-ink-faint hover:text-ink'
                        }`}
                      >
                        {outfit.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="label-caps mb-1.5 block">Accessory</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {ACCESSORIES.map((accessory) => (
                      <button
                        key={accessory.id}
                        type="button"
                        onClick={() =>
                          setDraft((d) => ({
                            ...d,
                            appearance: { ...d.appearance, accessory: accessory.id },
                          }))
                        }
                        className={`rounded-md border py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors ${
                          draft.appearance.accessory === accessory.id
                            ? 'border-neon bg-neon/10 text-neon'
                            : 'border-hairline text-ink-faint hover:text-ink'
                        }`}
                      >
                        {accessory.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <span className="label-caps mb-1.5 block">Badge sticker</span>
              <div className="grid grid-cols-8 gap-1.5">
                {AVATARS.map((avatar) => (
                  <button
                    key={avatar}
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, avatar }))}
                    className={`flex h-9 items-center justify-center rounded-md border text-lg transition-all ${
                      draft.avatar === avatar
                        ? 'border-neon bg-neon/12'
                        : 'border-hairline hover:border-neon/50'
                    }`}
                  >
                    <span aria-hidden>{avatar}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="label-caps mb-1.5 block">Accent</span>
              <div className="flex flex-wrap gap-2">
                {ACCENTS.map((accent) => (
                  <button
                    key={accent}
                    type="button"
                    aria-label={`Accent ${accent}`}
                    onClick={() => setDraft((d) => ({ ...d, accent }))}
                    className={`h-7 w-7 rounded-full border-2 transition-transform ${
                      draft.accent === accent
                        ? 'scale-110 border-ink'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: accent }}
                  />
                ))}
              </div>
            </div>

            {error ? (
              <p className="font-mono text-[11px] text-flare">{error}</p>
            ) : null}

            <div className="flex gap-2">
              <Button tone="primary" full disabled={full} onClick={commit}>
                {editingId ? 'Save operator' : full ? 'Roster full' : 'Add to roster'}
              </Button>
              {editingId ? (
                <Button
                  tone="quiet"
                  onClick={() => {
                    setEditingId(null)
                    setError(null)
                    setDraft(emptyDraft(players.length))
                  }}
                >
                  Cancel
                </Button>
              ) : null}
            </div>
          </div>
        </Panel>
      </div>

      <RealityCheckPanel
        open={calibrationOpen}
        onClose={() => setCalibrationOpen(false)}
      />
    </div>
  )
}
