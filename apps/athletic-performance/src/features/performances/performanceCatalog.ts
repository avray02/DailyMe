import {
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
    required: true,
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
          required: true,
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
      required: true,
      storageUnit: 'm',
      inputUnits: ['km', 'm'],
      defaultInputUnit: 'km',
      displayFormat: 'adaptive-distance',
    },
    ...elevationFields,
    ...commonResultFields.map((field) => ({ ...field })),
  ]
}

export const activityDefinitions: ActivityDefinition[] = sportOptions.map(
  (sport) => {
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
  },
)

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

  return (
    Number.isInteger(data.distanceMeters) &&
    Number(data.distanceMeters) > 0 &&
    (includeElevation
      ? hasElevation
      : typeof data.elevationGainMeters === 'undefined') &&
    Number.isInteger(data.durationSeconds) &&
    Number(data.durationSeconds) > 0 &&
    isResultStatus(data.resultStatus) &&
    hasValidRankings(data)
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
