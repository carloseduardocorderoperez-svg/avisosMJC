// Utilities to parse and format dates coming from multiple sources
// Supports: JS Date, Firestore Timestamp-like objects, dd/mm[/yyyy] strings,
// ISO strings, and Spanish textual dates like "Jueves 16 de abril del 2026".

const MONTHS = {
  enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
  julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11,
}

export function parseFlexibleDate(value) {
  if (!value && value !== 0) return null
  // Date instance
  if (value instanceof Date) return value

  // Firestore Timestamp (has toDate method)
  if (typeof value === 'object' && value !== null) {
    if (typeof value.toDate === 'function') {
      try { return value.toDate() } catch (e) { /* ignore */ }
    }
    // Plain object with seconds/nanoseconds
    if ('seconds' in value && 'nanoseconds' in value) {
      try { return new Date(value.seconds * 1000 + Math.floor(value.nanoseconds / 1e6)) } catch (e) {}
    }
    if ('_seconds' in value && '_nanoseconds' in value) {
      try { return new Date(value._seconds * 1000 + Math.floor(value._nanoseconds / 1e6)) } catch (e) {}
    }
  }

  // Strings
  if (typeof value === 'string') {
    const s = value.trim()

    // dd/mm/yyyy or dd/mm/yy
    const dm = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
    if (dm) {
      const day = parseInt(dm[1], 10)
      const month = parseInt(dm[2], 10) - 1
      const year = dm[3].length === 2 ? 2000 + parseInt(dm[3], 10) : parseInt(dm[3], 10)
      const d = new Date(year, month, day)
      if (!isNaN(d.getTime())) return d
    }

    // ISO / RFC parsable
    const iso = new Date(s)
    if (!isNaN(iso.getTime())) return iso

    // Spanish textual: optional weekday, day de month (del year)
    const m = s.match(/(?:^[A-Za-záéíóúñÁÉÍÓÚÑ]+\s+)?(\d{1,2})\s+de\s+([a-záéíóúñ]+)(?:\s+(?:del|de)\s+(\d{2,4}))?/i)
    if (m) {
      const day = parseInt(m[1], 10)
      const monthName = m[2].toLowerCase()
      const year = m[3] ? parseInt(m[3], 10) : new Date().getFullYear()
      const monthIndex = MONTHS[monthName]
      if (typeof monthIndex === 'number') {
        const d = new Date(year, monthIndex, day)
        if (!isNaN(d.getTime())) return d
      }
    }
  }

  return null
}

export function formatDayMonth(value) {
  const d = parseFlexibleDate(value)
  if (!d) {
    if (typeof value === 'string') {
      // sanitize small known patterns
      const m = value.match(/(\d{1,2})\s+de\s+([a-záéíóúñ]+)/i)
      if (m) return `${parseInt(m[1], 10)} de ${m[2].toLowerCase()}`
      return value.replace(/\s+del\s+/i, ' de ')
    }
    return 'Set sin fecha'
  }
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })
}

export function formatFullDate(value, opts = { capitalizeWeekday: true, useDelYear: true }) {
  const d = parseFlexibleDate(value)
  if (!d) {
    if (typeof value === 'string') {
      // try to return a sanitized fallback
      const m = value.match(/(\d{1,2})\s+de\s+([a-záéíóúñ]+)(?:\s+(?:del|de)\s+(\d{2,4}))?/i)
      if (m) {
        const day = parseInt(m[1], 10)
        const month = m[2].toLowerCase()
        const year = m[3] ? m[3] : null
        return year ? `${opts.capitalizeWeekday ? '' : ''}${day} de ${month}${opts.useDelYear && year ? ` del ${year}` : year ? ` ${year}` : ''}` : `${day} de ${month}`
      }
      return value
    }
    return 'Set sin fecha'
  }

  const weekday = d.toLocaleDateString('es-ES', { weekday: 'long' })
  const weekdayStr = opts.capitalizeWeekday ? weekday.charAt(0).toUpperCase() + weekday.slice(1) : weekday
  const day = d.getDate()
  const month = d.toLocaleDateString('es-ES', { month: 'long' })
  const year = d.getFullYear()
  return `${weekdayStr} ${day} de ${month}${opts.useDelYear ? ` del ${year}` : ` ${year}`}`
}

export function getYear(value) {
  const d = parseFlexibleDate(value)
  return d ? d.getFullYear() : null
}

export default { parseFlexibleDate, formatDayMonth, getYear }
