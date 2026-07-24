import { db, firebaseMode } from '@dailyme/auth'
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore'
import type {
  Performance,
  SimplifiedGpxTrack,
} from '../../types/performance'
import {
  definitionById,
  definitionHasField,
  isRaceData,
  isTriathlonData,
} from './performanceCatalog'

const localStorageKey = 'athletic-performance.records-v3'
const appDocumentPath = ['apps', 'athletic-performance'] as const

export async function listPerformances(ownerUid: string) {
  if (firebaseMode === 'firebase' && db) {
    const performancesQuery = query(
      collection(db, ...appDocumentPath, 'performances'),
      where('ownerUid', '==', ownerUid),
    )
    const snapshot = await getDocs(performancesQuery)

    return snapshot.docs
      .map((performanceDocument) =>
        parsePerformance(performanceDocument.data(), performanceDocument.id),
      )
      .filter((performance): performance is Performance => Boolean(performance))
      .sort(sortByDateDesc)
  }

  return loadLocalPerformances()
}

export async function getPerformance(
  ownerUid: string,
  performanceId: string,
) {
  if (firebaseMode === 'firebase' && db) {
    const snapshot = await getDoc(
      doc(db, ...appDocumentPath, 'performances', performanceId),
    )

    if (!snapshot.exists()) {
      return null
    }

    const performance = parsePerformance(snapshot.data(), snapshot.id)
    return performance?.ownerUid === ownerUid ? performance : null
  }

  const performances = await loadLocalPerformances()
  return (
    performances.find((performance) => performance.id === performanceId) ?? null
  )
}

export async function savePerformance(performance: Performance) {
  if (firebaseMode === 'firebase' && db) {
    await setDoc(
      doc(db, ...appDocumentPath, 'performances', performance.id),
      {
        ...performance,
        updatedAt: serverTimestamp(),
      },
    )
    return
  }

  const performances = await loadLocalPerformances()
  localStorage.setItem(
    localStorageKey,
    JSON.stringify([
      performance,
      ...performances.filter((item) => item.id !== performance.id),
    ]),
  )
}

export async function deletePerformance(performanceId: string) {
  if (firebaseMode === 'firebase' && db) {
    await deleteDoc(
      doc(db, ...appDocumentPath, 'performances', performanceId),
    )
    return
  }

  const performances = await loadLocalPerformances()
  localStorage.setItem(
    localStorageKey,
    JSON.stringify(performances.filter((item) => item.id !== performanceId)),
  )
}

function loadLocalPerformances() {
  const raw = localStorage.getItem(localStorageKey)

  if (!raw) {
    return []
  }

  return (JSON.parse(raw) as Record<string, unknown>[])
    .map((performance) =>
      parsePerformance(
        performance,
        typeof performance.id === 'string' ? performance.id : '',
      ),
    )
    .filter((performance): performance is Performance => Boolean(performance))
    .sort(sortByDateDesc)
}

function parsePerformance(
  data: Record<string, unknown>,
  id: string,
): Performance | null {
  const definition =
    typeof data.activityDefinitionId === 'string'
      ? definitionById[data.activityDefinitionId]
      : undefined
  const performanceDataIsValid =
    definition?.sportKey === 'triathlon'
      ? isTriathlonData(data.data)
      : Boolean(
          definition &&
            isRaceData(
              data.data,
              definitionHasField(definition, 'elevationGainMeters'),
            ),
        )
  const topLevelTrackIsValid =
    typeof data.track === 'undefined' ||
    (Boolean(definition && definitionHasField(definition, 'track')) &&
      isValidTrack(data.track))

  if (
    !id ||
    !definition ||
    typeof data.ownerUid !== 'string' ||
    typeof data.title !== 'string' ||
    data.categoryKey !== definition.categoryKey ||
    data.sportKey !== definition.sportKey ||
    data.activityTypeKey !== 'race' ||
    !isValidCalendarDate(data.date) ||
    !performanceDataIsValid ||
    !topLevelTrackIsValid
  ) {
    return null
  }

  return {
    ...data,
    id,
  } as Performance
}

function sortByDateDesc(left: Performance, right: Performance) {
  if (left.date.year !== right.date.year) {
    return right.date.year - left.date.year
  }

  if (left.date.month !== right.date.month) {
    return right.date.month - left.date.month
  }

  return right.date.day - left.date.day
}

function isValidCalendarDate(value: unknown): value is {
  year: number
  month: number
  day: number
} {
  if (!value || typeof value !== 'object') {
    return false
  }

  const date = value as {
    year?: unknown
    month?: unknown
    day?: unknown
  }
  if (
    !Number.isInteger(date.year) ||
    !Number.isInteger(date.month) ||
    !Number.isInteger(date.day)
  ) {
    return false
  }

  const timestamp = new Date(
    Date.UTC(Number(date.year), Number(date.month) - 1, Number(date.day)),
  )
  return (
    timestamp.getUTCFullYear() === date.year &&
    timestamp.getUTCMonth() === Number(date.month) - 1 &&
    timestamp.getUTCDate() === date.day
  )
}

function isValidTrack(value: unknown): value is SimplifiedGpxTrack {
  if (!value || typeof value !== 'object') {
    return false
  }

  const track = value as Partial<SimplifiedGpxTrack>
  return (
    typeof track.fileName === 'string' &&
    track.fileName.length > 0 &&
    track.fileName.length <= 200 &&
    Number.isInteger(track.originalPointCount) &&
    Array.isArray(track.points) &&
    track.points.length >= 2 &&
    track.points.length <= 500 &&
    track.points.every(
      (point) =>
        point &&
        typeof point === 'object' &&
        Number.isFinite(point.latitude) &&
        Number.isFinite(point.longitude) &&
        (typeof point.elevationMeters === 'undefined' ||
          Number.isFinite(point.elevationMeters)),
    )
  )
}
