import type {
  MedalKind,
  Metric,
  Performance,
  RaceData,
  RankingResult,
  TriathlonData,
  TriathlonDisciplineData,
} from '../../types/performance'
import {
  getMedalForRank,
  isTriathlonData,
  resultStatusLabels,
} from './performanceCatalog'

export function getPerformanceMetrics(performance: Performance): Metric[] {
  if (isTriathlonData(performance.data)) {
    return getTriathlonMetrics(performance.data)
  }

  return getSingleSportMetrics(performance, performance.data)
}

function getSingleSportMetrics(
  performance: Performance,
  data: RaceData,
): Metric[] {
  const metrics: Metric[] = []
  const { distanceMeters, durationSeconds } = data

  if (typeof distanceMeters === 'number' && distanceMeters > 0) {
    metrics.push({
      key: 'distance',
      label: 'Distance',
      value: formatDistance(distanceMeters),
      normalizedValue: distanceMeters,
    })
  }

  if (typeof data.elevationGainMeters === 'number') {
    metrics.push({
      key: 'elevation',
      label: 'Denivele positif',
      value: `${formatInteger(data.elevationGainMeters)} m`,
      normalizedValue: data.elevationGainMeters,
    })
  }

  if (typeof durationSeconds === 'number' && durationSeconds > 0) {
    metrics.push({
      key: 'duration',
      label: 'Temps',
      value: formatDuration(durationSeconds),
      normalizedValue: durationSeconds,
    })
  }

  if (
    typeof distanceMeters === 'number' &&
    distanceMeters > 0 &&
    typeof durationSeconds === 'number' &&
    durationSeconds > 0
  ) {
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
          distanceMeters,
          durationSeconds,
          performance.categoryKey === 'swimming' ? 100 : 1000,
        ),
      })
    } else {
      metrics.push({
        key: 'speed',
        label: 'Vitesse moyenne',
        value: formatSpeed(distanceMeters, durationSeconds),
      })
    }
  }

  appendResultMetrics(metrics, data)
  return metrics
}

function getTriathlonMetrics(data: TriathlonData) {
  const metrics: Metric[] = []
  if (
    typeof data.totalDurationSeconds === 'number' &&
    data.totalDurationSeconds > 0
  ) {
    metrics.push({
      key: 'duration',
      label: 'Temps total',
      value: formatDuration(data.totalDurationSeconds),
      normalizedValue: data.totalDurationSeconds,
    })
  }

  appendDisciplineMetric(
    metrics,
    'Natation',
    data.disciplines.swimming,
    'swimming',
  )
  appendDisciplineMetric(
    metrics,
    'Cyclisme',
    data.disciplines.cycling,
    'cycling',
  )
  appendDisciplineMetric(
    metrics,
    'Course a pied',
    data.disciplines.running,
    'running',
  )

  if (typeof data.transitions.t1DurationSeconds === 'number') {
    metrics.push({
      key: 'duration',
      label: 'Transition T1',
      value: formatDuration(data.transitions.t1DurationSeconds),
    })
  }
  if (typeof data.transitions.t2DurationSeconds === 'number') {
    metrics.push({
      key: 'duration',
      label: 'Transition T2',
      value: formatDuration(data.transitions.t2DurationSeconds),
    })
  }

  appendResultMetrics(metrics, data)
  return metrics
}

function appendDisciplineMetric(
  metrics: Metric[],
  label: string,
  discipline: TriathlonDisciplineData,
  kind: 'swimming' | 'cycling' | 'running',
) {
  const values: string[] = []
  if (typeof discipline.distanceMeters === 'number') {
    values.push(formatDistance(discipline.distanceMeters))
  }
  if (typeof discipline.durationSeconds === 'number') {
    values.push(formatDuration(discipline.durationSeconds))
  }
  if (
    typeof discipline.distanceMeters === 'number' &&
    typeof discipline.durationSeconds === 'number'
  ) {
    values.push(
      kind === 'cycling'
        ? formatSpeed(
            discipline.distanceMeters,
            discipline.durationSeconds,
          )
        : formatPace(
            discipline.distanceMeters,
            discipline.durationSeconds,
            kind === 'swimming' ? 100 : 1000,
          ),
    )
  }
  if (typeof discipline.elevationGainMeters === 'number') {
    values.push(`${formatInteger(discipline.elevationGainMeters)} m D+`)
  }

  if (values.length) {
    metrics.push({
      key: 'custom',
      label,
      value: values.join(' - '),
    })
  }
}

function appendResultMetrics(
  metrics: Metric[],
  data: Pick<RaceData, 'rankings' | 'resultStatus'>,
) {
  const primaryRanking =
    typeof data.rankings.sex?.rank === 'number'
      ? {
          label: 'Classement sexe',
          value: data.rankings.sex,
        }
      : typeof data.rankings.overall?.rank === 'number'
        ? {
            label: 'Classement general',
            value: data.rankings.overall,
          }
        : null

  if (primaryRanking) {
    metrics.push(toRankingMetric(primaryRanking.label, primaryRanking.value))
  }

  if (typeof data.rankings.category?.rank === 'number') {
    metrics.push(
      toRankingMetric(
        'Classement categorie',
        data.rankings.category,
      ),
    )
  }

  if (data.resultStatus !== 'ranked' && !primaryRanking) {
    metrics.push({
      key: 'rank',
      label: 'Statut',
      value: resultStatusLabels[data.resultStatus],
    })
  }
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
