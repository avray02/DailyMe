import {
  Activity,
  Bike,
  Footprints,
  Mountain,
  Snowflake,
  Waves,
  type LucideIcon,
} from 'lucide-react'
import type {
  ActivityDefinition,
  ActivityFieldDefinition,
  MedalKind,
  RaceData,
  ResultStatus,
  SportCategoryDefinition,
  SportDefinition,
  SportKey,
  TriathlonData,
} from '../../types/performance'

export type SportOption = SportDefinition & {
  icon: LucideIcon
}

export const sportCategories: SportCategoryDefinition[] = [
  {
    key: 'running',
    label: 'Course a pied',
    accent: '#c83f4b',
    softAccent: '#fbeaec',
  },
  {
    key: 'cycling',
    label: 'Cyclisme',
    accent: '#18794e',
    softAccent: '#e4f3eb',
  },
  {
    key: 'swimming',
    label: 'Natation',
    accent: '#173b63',
    softAccent: '#e7eef6',
  },
  {
    key: 'winter-sports',
    label: "Sports d'hiver",
    accent: '#3b82a0',
    softAccent: '#e7f4f8',
  },
  {
    key: 'multisport',
    label: 'Multisport',
    accent: '#8a4b61',
    softAccent: '#f6e9ee',
  },
]

export const sportOptions: SportOption[] = [
  {
    key: 'road-running',
    categoryKey: 'running',
    label: 'Course a pied',
    icon: Footprints,
  },
  {
    key: 'trail-running',
    categoryKey: 'running',
    label: 'Trail',
    icon: Mountain,
  },
  {
    key: 'road-cycling',
    categoryKey: 'cycling',
    label: 'Cyclisme sur route',
    icon: Bike,
  },
  {
    key: 'mountain-biking',
    categoryKey: 'cycling',
    label: 'VTT',
    icon: Mountain,
  },
  {
    key: 'gravel-cycling',
    categoryKey: 'cycling',
    label: 'Gravel',
    icon: Bike,
  },
  {
    key: 'open-water-swimming',
    categoryKey: 'swimming',
    label: 'Natation en eau libre',
    icon: Waves,
  },
  {
    key: 'winter-trail',
    categoryKey: 'winter-sports',
    label: "Trail d'hiver",
    icon: Mountain,
  },
  {
    key: 'ski-mountaineering',
    categoryKey: 'winter-sports',
    label: 'Ski de randonnee',
    icon: Mountain,
  },
  {
    key: 'cross-country-skiing-skating',
    categoryKey: 'winter-sports',
    label: 'Ski de fond skating',
    icon: Snowflake,
  },
  {
    key: 'cross-country-skiing-classic',
    categoryKey: 'winter-sports',
    label: 'Ski de fond classique',
    icon: Snowflake,
  },
  {
    key: 'triathlon',
    categoryKey: 'multisport',
    label: 'Triathlon',
    icon: Activity,
  },
]

export const categoryByKey = Object.fromEntries(
  sportCategories.map((category) => [category.key, category]),
) as Record<SportCategoryDefinition['key'], SportCategoryDefinition>

export const sportByKey = Object.fromEntries(
  sportOptions.map((sport) => [sport.key, sport]),
) as Record<SportKey, SportOption>

const commonResultFields: ActivityFieldDefinition[] = [
  {
    key: 'durationSeconds',
    label: 'Temps',
    section: 'results',
    valueType: 'duration',
    required: false,
    storageUnit: 's',
    displayFormat: 'hms',
  },
  {
    key: 'resultStatus',
    label: 'Statut du resultat',
    section: 'results',
    valueType: 'status',
    required: true,
    displayFormat: 'status',
  },
  {
    key: 'rankings',
    label: 'Classements',
    section: 'results',
    valueType: 'rankings',
    required: false,
    displayFormat: 'rankings',
  },
  {
    key: 'statusComment',
    label: 'Commentaire de statut',
    section: 'results',
    valueType: 'text',
    required: false,
    displayFormat: 'text',
  },
  {
    key: 'track',
    label: 'Trace GPX',
    section: 'route',
    valueType: 'gpx',
    required: false,
    displayFormat: 'map',
  },
  {
    key: 'notes',
    label: 'Notes',
    section: 'notes',
    valueType: 'text',
    required: false,
    displayFormat: 'text',
  },
]

function buildFields(includeElevation: boolean): ActivityFieldDefinition[] {
  const elevationFields: ActivityFieldDefinition[] = includeElevation
    ? [
        {
          key: 'elevationGainMeters',
          label: 'Denivele positif',
          section: 'description',
          valueType: 'integer',
          required: false,
          storageUnit: 'm',
          displayFormat: 'meters',
        },
      ]
    : []

  return [
    {
      key: 'distanceMeters',
      label: 'Distance',
      section: 'description',
      valueType: 'distance',
      required: false,
      storageUnit: 'm',
      inputUnits: ['km', 'm'],
      defaultInputUnit: 'km',
      displayFormat: 'adaptive-distance',
    },
    ...elevationFields,
    ...commonResultFields.map((field) => ({ ...field })),
  ]
}

const singleSportDefinitions: ActivityDefinition[] = sportOptions
  .filter((sport) => sport.key !== 'triathlon')
  .map((sport) => {
    const category = categoryByKey[sport.categoryKey]
    return {
      id: `${sport.key}__race`,
      categoryKey: sport.categoryKey,
      categoryLabel: category.label,
      categoryAccent: category.accent,
      sportKey: sport.key,
      sportLabel: sport.label,
      activityTypeKey: 'race',
      activityTypeLabel: 'Course',
      environment: 'outdoor',
      active: true,
      schemaVersion: 1,
      fields: buildFields(sport.key !== 'open-water-swimming'),
    }
  })

const triathlonCategory = categoryByKey.multisport

const triathlonDefinition: ActivityDefinition = {
  id: 'triathlon__race',
  categoryKey: 'multisport',
  categoryLabel: triathlonCategory.label,
  categoryAccent: triathlonCategory.accent,
  sportKey: 'triathlon',
  sportLabel: 'Triathlon',
  activityTypeKey: 'race',
  activityTypeLabel: 'Course',
  environment: 'outdoor',
  active: true,
  schemaVersion: 1,
  fields: [
    triathlonField(
      'swimDistanceMeters',
      'Distance natation',
      'distance',
      'disciplines.swimming.distanceMeters',
      'adaptive-distance',
    ),
    triathlonField(
      'swimDurationSeconds',
      'Temps natation',
      'duration',
      'disciplines.swimming.durationSeconds',
      'hms',
    ),
    triathlonField(
      'swimTrack',
      'Trace GPX natation',
      'gpx',
      'disciplines.swimming.track',
      'map',
    ),
    triathlonField(
      'transition1Seconds',
      'Transition T1',
      'duration',
      'transitions.t1DurationSeconds',
      'hms',
    ),
    triathlonField(
      'bikeDistanceMeters',
      'Distance cyclisme',
      'distance',
      'disciplines.cycling.distanceMeters',
      'adaptive-distance',
    ),
    triathlonField(
      'bikeElevationGainMeters',
      'Denivele cyclisme',
      'integer',
      'disciplines.cycling.elevationGainMeters',
      'meters',
    ),
    triathlonField(
      'bikeDurationSeconds',
      'Temps cyclisme',
      'duration',
      'disciplines.cycling.durationSeconds',
      'hms',
    ),
    triathlonField(
      'bikeTrack',
      'Trace GPX cyclisme',
      'gpx',
      'disciplines.cycling.track',
      'map',
    ),
    triathlonField(
      'transition2Seconds',
      'Transition T2',
      'duration',
      'transitions.t2DurationSeconds',
      'hms',
    ),
    triathlonField(
      'runDistanceMeters',
      'Distance course a pied',
      'distance',
      'disciplines.running.distanceMeters',
      'adaptive-distance',
    ),
    triathlonField(
      'runElevationGainMeters',
      'Denivele course a pied',
      'integer',
      'disciplines.running.elevationGainMeters',
      'meters',
    ),
    triathlonField(
      'runDurationSeconds',
      'Temps course a pied',
      'duration',
      'disciplines.running.durationSeconds',
      'hms',
    ),
    triathlonField(
      'runTrack',
      'Trace GPX course a pied',
      'gpx',
      'disciplines.running.track',
      'map',
    ),
    triathlonField(
      'totalDurationSeconds',
      'Temps total',
      'duration',
      'totalDurationSeconds',
      'hms',
    ),
    ...commonResultFields
      .filter((field) => field.key !== 'track')
      .map((field) => ({ ...field })),
  ],
}

export const activityDefinitions: ActivityDefinition[] = [
  ...singleSportDefinitions,
  triathlonDefinition,
]

function triathlonField(
  key: ActivityFieldDefinition['key'],
  label: string,
  valueType: ActivityFieldDefinition['valueType'],
  storagePath: string,
  displayFormat: NonNullable<ActivityFieldDefinition['displayFormat']>,
): ActivityFieldDefinition {
  return {
    key,
    label,
    section: valueType === 'gpx' ? 'route' : 'description',
    valueType,
    required: false,
    storagePath,
    ...(valueType === 'distance'
      ? {
          storageUnit: 'm' as const,
          inputUnits: ['km', 'm'] as Array<'km' | 'm'>,
          defaultInputUnit: 'km' as const,
        }
      : valueType === 'duration'
        ? { storageUnit: 's' as const }
        : valueType === 'integer'
          ? { storageUnit: 'm' as const }
          : {}),
    displayFormat,
  }
}

export const definitionById = Object.fromEntries(
  activityDefinitions.map((definition) => [definition.id, definition]),
) as Record<string, ActivityDefinition>

export const resultSentinels: Record<Exclude<ResultStatus, 'ranked'>, number> = {
  dnf: -1,
  dsq: -2,
  dns: -3,
}

export const resultStatusLabels: Record<ResultStatus, string> = {
  ranked: 'Classe',
  dnf: 'DNF',
  dsq: 'DSQ',
  dns: 'DNS',
}

export function definitionHasField(
  definition: ActivityDefinition | undefined,
  key: ActivityFieldDefinition['key'],
) {
  return Boolean(definition?.fields.some((field) => field.key === key))
}

export function isRaceData(
  value: unknown,
  includeElevation: boolean,
): value is RaceData {
  if (!value || typeof value !== 'object') {
    return false
  }

  const data = value as Partial<RaceData>
  const hasElevation =
    typeof data.elevationGainMeters === 'number' &&
    Number.isInteger(data.elevationGainMeters) &&
    data.elevationGainMeters >= 0
  const hasDistance =
    typeof data.distanceMeters === 'undefined' ||
    (Number.isInteger(data.distanceMeters) &&
      Number(data.distanceMeters) > 0)
  const hasDuration =
    typeof data.durationSeconds === 'undefined' ||
    (Number.isInteger(data.durationSeconds) &&
      Number(data.durationSeconds) > 0)

  return (
    hasDistance &&
    (includeElevation
      ? typeof data.elevationGainMeters === 'undefined' || hasElevation
      : typeof data.elevationGainMeters === 'undefined') &&
    hasDuration &&
    (data.resultStatus === 'ranked' ||
      typeof data.durationSeconds === 'undefined') &&
    isResultStatus(data.resultStatus) &&
    hasValidRankings(data)
  )
}

export function isTriathlonData(value: unknown): value is TriathlonData {
  if (!value || typeof value !== 'object') {
    return false
  }

  const data = value as Partial<TriathlonData>
  if (
    !data.disciplines ||
    !data.transitions ||
    !isResultStatus(data.resultStatus) ||
    !hasValidRankings(data)
  ) {
    return false
  }

  const swimming = data.disciplines.swimming
  const cycling = data.disciplines.cycling
  const running = data.disciplines.running
  if (
    !isTriathlonDiscipline(swimming, false) ||
    !isTriathlonDiscipline(cycling, true) ||
    !isTriathlonDiscipline(running, true)
  ) {
    return false
  }

  const t1 = data.transitions.t1DurationSeconds
  const t2 = data.transitions.t2DurationSeconds
  if (!isOptionalPositiveInteger(t1) || !isOptionalPositiveInteger(t2)) {
    return false
  }

  const durations = [
    swimming.durationSeconds,
    t1,
    cycling.durationSeconds,
    t2,
    running.durationSeconds,
  ]
  const calculatedTotal = durations.reduce<number>(
    (total, duration) => total + (duration ?? 0),
    0,
  )
  const storedTotal = data.totalDurationSeconds
  const totalIsValid =
    calculatedTotal > 0
      ? storedTotal === calculatedTotal
      : typeof storedTotal === 'undefined'

  return (
    totalIsValid &&
    (data.resultStatus === 'ranked' ||
      (durations.every((duration) => typeof duration === 'undefined') &&
        typeof storedTotal === 'undefined'))
  )
}

function isTriathlonDiscipline(
  value: unknown,
  allowsElevation: boolean,
) {
  if (!value || typeof value !== 'object') {
    return false
  }

  const discipline = value as {
    distanceMeters?: unknown
    elevationGainMeters?: unknown
    durationSeconds?: unknown
    track?: unknown
  }

  return (
    isOptionalPositiveInteger(discipline.distanceMeters) &&
    isOptionalPositiveInteger(discipline.durationSeconds) &&
    (allowsElevation
      ? typeof discipline.elevationGainMeters === 'undefined' ||
        (Number.isInteger(discipline.elevationGainMeters) &&
          Number(discipline.elevationGainMeters) >= 0)
      : typeof discipline.elevationGainMeters === 'undefined') &&
    (typeof discipline.track === 'undefined' ||
      isValidSimplifiedTrack(discipline.track))
  )
}

function isOptionalPositiveInteger(value: unknown) {
  return (
    typeof value === 'undefined' ||
    (Number.isInteger(value) && Number(value) > 0)
  )
}

function isValidSimplifiedTrack(value: unknown) {
  if (!value || typeof value !== 'object') {
    return false
  }

  const track = value as {
    fileName?: unknown
    originalPointCount?: unknown
    points?: unknown
  }
  return (
    typeof track.fileName === 'string' &&
    track.fileName.length > 0 &&
    track.fileName.length <= 200 &&
    Number.isInteger(track.originalPointCount) &&
    Array.isArray(track.points) &&
    track.points.length >= 2 &&
    track.points.length <= 500
  )
}

function hasValidRankings(data: Partial<RaceData>) {
  if (!data.rankings || typeof data.rankings !== 'object') {
    return false
  }

  if (data.resultStatus === 'ranked') {
    return Object.values(data.rankings).every(isStandardRanking)
  }

  if (
    data.resultStatus === 'dnf' ||
    data.resultStatus === 'dsq' ||
    data.resultStatus === 'dns'
  ) {
    const sentinel = resultSentinels[data.resultStatus]
    return Object.values(data.rankings).every(
      (ranking) => ranking.rank === sentinel,
    )
  }

  return false
}

function isStandardRanking(value: unknown) {
  if (!value || typeof value !== 'object') {
    return false
  }

  const ranking = value as { rank?: unknown; participantCount?: unknown }
  const rankIsValid =
    typeof ranking.rank === 'undefined' ||
    (Number.isInteger(ranking.rank) && Number(ranking.rank) > 0)
  const participantsAreValid =
    typeof ranking.participantCount === 'undefined' ||
    (Number.isInteger(ranking.participantCount) &&
      Number(ranking.participantCount) > 0 &&
      typeof ranking.rank === 'number' &&
      Number(ranking.participantCount) >= ranking.rank)

  return rankIsValid && participantsAreValid
}

function isResultStatus(value: unknown): value is ResultStatus {
  return value === 'ranked' || value === 'dnf' || value === 'dsq' || value === 'dns'
}

export function getMedalForRank(rank?: number): MedalKind | undefined {
  if (rank === 1) return 'gold'
  if (rank === 2) return 'silver'
  if (rank === 3) return 'bronze'
  if (rank === 4) return 'chocolate'
  return undefined
}
