import type {
  MedalKind,
  Metric,
  Performance,
  RankingResult,
} from '../../types/performance'
import {
  getMedalForRank,
  resultStatusLabels,
} from './performanceCatalog'

export function getPerformanceMetrics(performance: Performance): Metric[] {
  const metrics: Metric[] = [
    {
      key: 'distance',
      label: 'Distance',
      value: formatDistance(performance.data.distanceMeters),
      normalizedValue: performance.data.distanceMeters,
    },
  ]

  if (typeof performance.data.elevationGainMeters === 'number') {
    metrics.push({
      key: 'elevation',
      label: 'Denivele positif',
      value: `${formatInteger(performance.data.elevationGainMeters)} m`,
      normalizedValue: performance.data.elevationGainMeters,
    })
  }

  metrics.push({
    key: 'duration',
    label: 'Temps',
    value: formatDuration(performance.data.durationSeconds),
    normalizedValue: performance.data.durationSeconds,
  })

  if (
    performance.categoryKey === 'running' ||
    performance.categoryKey === 'swimming'
  ) {
    metrics.push({
      key: 'pace',
      label:
        performance.categoryKey === 'swimming'
          ? 'Allure moyenne'
          : 'Rythme moyen',
      value: formatPace(
        performance.data.distanceMeters,
        performance.data.durationSeconds,
        performance.categoryKey === 'swimming' ? 100 : 1000,
      ),
    })
  } else {
    metrics.push({
      key: 'speed',
      label: 'Vitesse moyenne',
      value: formatSpeed(
        performance.data.distanceMeters,
        performance.data.durationSeconds,
      ),
    })
  }

  const primaryRanking =
    typeof performance.data.rankings.sex.rank === 'number'
      ? {
          label: 'Classement sexe',
          value: performance.data.rankings.sex,
        }
      : typeof performance.data.rankings.overall.rank === 'number'
        ? {
            label: 'Classement general',
            value: performance.data.rankings.overall,
          }
        : null

  if (primaryRanking) {
    metrics.push(toRankingMetric(primaryRanking.label, primaryRanking.value))
  }

  if (typeof performance.data.rankings.category.rank === 'number') {
    metrics.push(
      toRankingMetric(
        'Classement categorie',
        performance.data.rankings.category,
      ),
    )
  }

  return metrics
}

export function getStatusComment(performance: Performance) {
  return performance.data.statusComment
}

export function hasRanking(performance: Performance) {
  return Object.values(performance.data.rankings).some(
    (ranking) => typeof ranking.rank === 'number' && ranking.rank > 0,
  )
}

function toRankingMetric(label: string, ranking: RankingResult): Metric {
  return {
    key: 'rank',
    label,
    value: formatRanking(ranking),
    normalizedValue: ranking.rank,
    medal: getMedalForRank(ranking.rank),
  }
}

function formatSpeed(distanceMeters: number, durationSeconds: number) {
  const kilometersPerHour =
    distanceMeters / 1000 / (durationSeconds / 3600)
  return `${new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(kilometersPerHour)} km/h`
}

function formatPace(
  distanceMeters: number,
  durationSeconds: number,
  referenceMeters: number,
) {
  const secondsPerReference =
    durationSeconds / (distanceMeters / referenceMeters)
  const minutes = Math.floor(secondsPerReference / 60)
  const seconds = Math.round(secondsPerReference % 60)
  return `${minutes}:${String(seconds).padStart(2, '0')} / ${referenceMeters === 100 ? '100 m' : 'km'}`
}

export function formatDistance(distanceMeters: number) {
  if (distanceMeters >= 1000) {
    return `${new Intl.NumberFormat('fr-FR', {
      maximumFractionDigits: 2,
    }).format(distanceMeters / 1000)} km`
  }

  return `${formatInteger(distanceMeters)} m`
}

export function formatDuration(durationSeconds: number) {
  const hours = Math.floor(durationSeconds / 3600)
  const minutes = Math.floor((durationSeconds % 3600) / 60)
  const seconds = durationSeconds % 60
  return `${hours} H : ${padTime(minutes)} M : ${padTime(seconds)} S`
}

function formatRanking(ranking: RankingResult) {
  if (ranking.rank === -1) return resultStatusLabels.dnf
  if (ranking.rank === -2) return resultStatusLabels.dsq
  if (ranking.rank === -3) return resultStatusLabels.dns
  if (typeof ranking.rank !== 'number') return ''

  return ranking.participantCount
    ? `${formatInteger(ranking.rank)} / ${formatInteger(ranking.participantCount)}`
    : formatInteger(ranking.rank)
}

export function getMedalLabel(medal: MedalKind) {
  return {
    gold: "Medaille d'or",
    silver: "Medaille d'argent",
    bronze: 'Medaille de bronze',
    chocolate: 'Medaille en chocolat',
  }[medal]
}

function formatInteger(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 0,
  }).format(value)
}

function padTime(value: number) {
  return String(value).padStart(2, '0')
}
