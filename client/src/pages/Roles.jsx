
import { useMemo, useState } from "react"

function shuffleArray(arr) {
  const copy = [...arr]

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }

  return copy
}

function generateRoundRobin(teams, options = {}) {
  let list = teams.filter(Boolean).map((t) => t.trim())

  if (options.shuffle) {
    list = shuffleArray(list)
  }

  const hasBye = list.length % 2 !== 0

  if (hasBye) {
    list.push("DESCANSA")
  }

  const rounds = []
  const totalRounds = list.length - 1
  const half = list.length / 2

  let rotation = [...list]

  for (let round = 0; round < totalRounds; round++) {
    const matches = []
    let byeTeam = null

    for (let i = 0; i < half; i++) {
      const home = rotation[i]
      const away = rotation[rotation.length - 1 - i]

      if (home === "DESCANSA") {
        byeTeam = away
        continue
      }

      if (away === "DESCANSA") {
        byeTeam = home
        continue
      }

      const shouldSwap = round % 2 === 0

      matches.push({
        home: shouldSwap ? away : home,
        away: shouldSwap ? home : away,
      })
    }

    rounds.push({
      round: round + 1,
      matches,
      byeTeam,
    })

    const fixed = rotation[0]
    const rest = rotation.slice(1)

    rest.unshift(rest.pop())

    rotation = [fixed, ...rest]
  }

  if (options.doubleRoundRobin) {
    const secondLeg = rounds.map((round) => ({
      ...round,
      round: round.round + rounds.length,
      matches: round.matches.map((m) => ({
        home: m.away,
        away: m.home,
      })),
    }))

    rounds.push(...secondLeg)
  }

  return rounds
}

function generateEliminationBracket(teams) {
  const shuffled = shuffleArray(teams.filter(Boolean))

  const matches = []

  for (let i = 0; i < shuffled.length; i += 2) {
    matches.push({
      home: shuffled[i] || "BYE",
      away: shuffled[i + 1] || "BYE",
    })
  }

  return matches
}

function scheduleMatches(rounds, courts, maxRounds) {
  const limitedRounds = maxRounds
    ? rounds.slice(0, Number(maxRounds))
    : rounds

  return limitedRounds.map((round) => {
    const scheduledMatches = round.matches.map((match, idx) => ({
      ...match,
      court: (idx % courts) + 1,
      slot: Math.floor(idx / courts) + 1,
    }))

    return {
      ...round,
      matches: scheduledMatches,
    }
  })
}
export default function TournamentPage() {
  const [mode, setMode] = useState("roundRobin")
  const [doubleRoundRobin, setDoubleRoundRobin] = useState(false)
  const [shuffle, setShuffle] = useState(true)
  const [teamInput, setTeamInput] = useState(
    "Cadena\nEscuadrón\nJuvenil\nConquista\nOmaha"
  )
  const [courts, setCourts] = useState(2)
const [maxRounds, setMaxRounds] = useState("")

  const teams = useMemo(() => {
    return teamInput
      .split("\n")
      .map((t) => t.trim())
      .filter(Boolean)
  }, [teamInput])

  const rounds = useMemo(() => {
  if (mode !== "roundRobin") return []

  const generated = generateRoundRobin(teams, {
    doubleRoundRobin,
    shuffle,
  })

  return scheduleMatches(
    generated,
    courts,
    maxRounds
  )
}, [
  teams,
  mode,
  doubleRoundRobin,
  shuffle,
  courts,
  maxRounds,
])

  const eliminationMatches = useMemo(() => {
    if (mode !== "elimination") return []

    return generateEliminationBracket(teams)
  }, [teams, mode])

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Roles y Torneos MJC</h1>

            <p style={styles.subtitle}>
              Generador automático de roles, rondas y partidos.
            </p>
          </div>
        </div>

        <div style={styles.layout}>
          <div style={styles.sidebar}>
            <div style={styles.card}>
              <h2 style={styles.sectionTitle}>Configuración</h2>

              <div style={styles.field}>
                <label style={styles.label}>Modalidad</label>

                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                  style={styles.select}
                >
                  <option value="roundRobin">
                    Todos contra todos
                  </option>

                  <option value="elimination">
                    Eliminación directa
                  </option>
                </select>
                <div style={styles.field}>
  <label style={styles.label}>
    Canchas disponibles
  </label>

  <input
    type="number"
    min="1"
    value={courts}
    onChange={(e) =>
      setCourts(Number(e.target.value))
    }
    style={styles.input}
  />
</div>

<div style={styles.field}>
  <label style={styles.label}>
    Máximo de rondas
  </label>

  <input
    type="number"
    min="1"
    placeholder="Todas"
    value={maxRounds}
    onChange={(e) =>
      setMaxRounds(e.target.value)
    }
    style={styles.input}
  />
</div>
              </div>

              {mode === "roundRobin" && (
                <>
                  <label style={styles.checkboxRow}>
                    <input
                      type="checkbox"
                      checked={doubleRoundRobin}
                      onChange={(e) =>
                        setDoubleRoundRobin(e.target.checked)
                      }
                    />

                    Ida y vuelta
                  </label>

                  <label style={styles.checkboxRow}>
                    <input
                      type="checkbox"
                      checked={shuffle}
                      onChange={(e) => setShuffle(e.target.checked)}
                    />

                    Aleatorizar equipos
                  </label>
                </>
              )}

              <div style={styles.field}>
                <label style={styles.label}>
                  Equipos participantes
                </label>

                <textarea
                  value={teamInput}
                  onChange={(e) => setTeamInput(e.target.value)}
                  placeholder="Un equipo por línea"
                  style={styles.textarea}
                />
              </div>

              <div style={styles.stats}>
                <div style={styles.statBox}>
                  <div style={styles.statValue}>{teams.length}</div>
                  <div style={styles.statLabel}>Equipos</div>
                </div>

                <div style={styles.statBox}>
                  <div style={styles.statValue}>
                    {mode === "roundRobin"
                      ? rounds.length
                      : eliminationMatches.length}
                  </div>

                  <div style={styles.statLabel}>
                    {mode === "roundRobin"
                      ? "Rondas"
                      : "Partidos"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={styles.content}>
            {mode === "roundRobin" && (
              <>
                {rounds.map((round) => (
                  <div key={round.round} style={styles.roundCard}>
                    <div style={styles.roundHeader}>
                      <h3 style={styles.roundTitle}>
                        Ronda {round.round}
                      </h3>

                      {round.byeTeam && (
                        <div style={styles.byeBadge}>
                          Descansa: {round.byeTeam}
                        </div>
                      )}
                    </div>

                    <div style={styles.matchesGrid}>
                      {round.matches.map((match, idx) => (
                        <div key={idx} style={styles.matchCard}>
                          <div style={styles.team}>
                            {match.home}
                          </div>

                          <div style={styles.vs}>VS</div>

                          <div style={styles.team}>
                            {match.away}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}

            {mode === "elimination" && (
              <div style={styles.roundCard}>
                <div style={styles.roundHeader}>
                  <h3 style={styles.roundTitle}>
                    Primera ronda
                  </h3>
                </div>

                <div style={styles.matchesGrid}>
                  {eliminationMatches.map((match, idx) => (
                    <div key={idx} style={styles.matchCard}>
                      <div style={styles.team}>{match.home}</div>

                      <div style={styles.vs}>VS</div>

                      <div style={styles.team}>{match.away}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#0f1117",
    color: "white",
    padding: "24px",
    boxSizing: "border-box",
  },

  container: {
    maxWidth: "1700px",
    margin: "0 auto",
  },

  header: {
    marginBottom: "24px",
  },

  title: {
    fontSize: "2.2rem",
    margin: 0,
    fontWeight: 800,
  },

  subtitle: {
    opacity: 0.7,
    marginTop: "8px",
  },

  layout: {
    display: "grid",
    gridTemplateColumns: "320px 1fr",
    gap: "24px",
    alignItems: "start",
  },

  sidebar: {
    position: "sticky",
    top: "24px",
  },

  content: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },

  card: {
    background: "#171922",
    border: "1px solid #2a2e3d",
    borderRadius: "18px",
    padding: "20px",
  },

  sectionTitle: {
    marginTop: 0,
    marginBottom: "20px",
    fontSize: "1.2rem",
  },

  field: {
    marginBottom: "18px",
  },

  label: {
    display: "block",
    marginBottom: "8px",
    fontWeight: 600,
  },

  select: {
    width: "100%",
    padding: "12px",
    borderRadius: "12px",
    border: "1px solid #3a4156",
    background: "#10131c",
    color: "white",
  },

  textarea: {
    width: "100%",
    minHeight: "220px",
    resize: "vertical",
    padding: "14px",
    borderRadius: "14px",
    border: "1px solid #3a4156",
    background: "#10131c",
    color: "white",
    boxSizing: "border-box",
    fontFamily: "inherit",
    lineHeight: 1.5,
  },

  checkboxRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "12px",
    fontSize: "0.95rem",
  },

  stats: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
    marginTop: "18px",
  },

  statBox: {
    background: "#10131c",
    border: "1px solid #2e3446",
    borderRadius: "14px",
    padding: "14px",
    textAlign: "center",
  },

  statValue: {
    fontSize: "1.6rem",
    fontWeight: 800,
  },

  statLabel: {
    opacity: 0.7,
    marginTop: "4px",
    fontSize: "0.9rem",
  },

  roundCard: {
    background: "#171922",
    border: "1px solid #2a2e3d",
    borderRadius: "18px",
    padding: "20px",
  },

  roundHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "18px",
    gap: "16px",
    flexWrap: "wrap",
  },

  roundTitle: {
    margin: 0,
    fontSize: "1.25rem",
  },

  byeBadge: {
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.12)",
    padding: "8px 12px",
    borderRadius: "999px",
    fontSize: "0.9rem",
  },

  matchesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "16px",
  },

  matchCard: {
    background: "#10131c",
    border: "1px solid #2e3446",
    borderRadius: "16px",
    padding: "18px",
    textAlign: "center",
  },

  team: {
    fontWeight: 700,
    fontSize: "1rem",
  },

  vs: {
    margin: "12px 0",
    opacity: 0.5,
    fontSize: "0.85rem",
    letterSpacing: "2px",
  },

  input: {
  width: "100%",
  padding: "12px",
  borderRadius: "12px",
  border: "1px solid #3a4156",
  background: "#10131c",
  color: "white",
  boxSizing: "border-box",
},

matchMeta: {
  fontSize: "0.8rem",
  opacity: 0.6,
  marginTop: "4px",
},
}


