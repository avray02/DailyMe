export type SportCategoryKey =
  | 'running'
  | 'cycling'
  | 'swimming'
  | 'winter-sports'
  | 'multisport'

export type SportKey =
  | 'road-running'
  | 'trail-running'
  | 'road-cycling'
  | 'mountain-biking'
  | 'gravel-cycling'
  | 'open-water-swimming'
  | 'winter-trail'
  | 'ski-mountaineering'
  | 'cross-country-skiing-skating'
  | 'cross-country-skiing-classic'
  | 'triathlon'

export type ActivityTypeKey = 'race'
export type ActivityDefinitionId = `${SportKey}__race`
export type RankingKey = 'sex' | 'overall' | 'category'
export type ResultStatus = 'ranked' | 'dnf' | 'dsq' | 'dns'
export type MedalKind = 'gold' | 'silver' | 'bronze' | 'chocolate'
export type ActivityEnvironment = 'outdoor'

export type RankingResult = {
  rank?: number
  participantCount?: number
}

export type RaceData = {
  distanceMeters?: number
  elevationGainMeters?: number
  durationSeconds?: number
  resultStatus: ResultStatus
  rankings: Partial<Record<RankingKey, RankingResult>>
  statusComment?: string
}

export type TriathlonDisciplineData = {
  distanceMeters?: number
  elevationGainMeters?: number
  durationSeconds?: number
  track?: SimplifiedGpxTrack
}

export type TriathlonData = {
  disciplines: {
    swimming: TriathlonDisciplineData
    cycling: TriathlonDisciplineData
    running: TriathlonDisciplineData
  }
  transitions: {
    t1DurationSeconds?: number
    t2DurationSeconds?: number
  }
  totalDurationSeconds?: number
  resultStatus: ResultStatus
  rankings: Partial<Record<RankingKey, RankingResult>>
  statusComment?: string
}

export type MetricKey =
  | 'distance'
  | 'duration'
  | 'elevation'
  | 'rank'
  | 'pace'
  | 'speed'
  | 'custom'

export type Metric = {
  key: MetricKey
  label: string
  value: string
  normalizedValue?: number
  medal?: MedalKind
}

export type CalendarDate = {
  year: number
  month: number
  day: number
}

export type TrackPoint = {
  latitude: number
  longitude: number
  elevationMeters?: number
}

export type SimplifiedGpxTrack = {
  fileName: string
  originalPointCount: number
  points: TrackPoint[]
}

export type Performance = {
  id: string
  ownerUid: string
  activityDefinitionId: ActivityDefinitionId
  schemaVersion: number
  categoryKey: SportCategoryKey
  sportKey: SportKey
  activityTypeKey: ActivityTypeKey
  title: string
  status: 'completed'
  date: CalendarDate
  data: RaceData | TriathlonData
  track?: SimplifiedGpxTrack
  notes?: string
  tags: string[]
  searchKeywords: string[]
  createdAt: string
  updatedAt: string
}

export type SportCategoryDefinition = {
  key: SportCategoryKey
  label: string
  accent: string
  softAccent: string
}

export type SportDefinition = {
  key: SportKey
  categoryKey: SportCategoryKey
  label: string
}

export type ActivityFieldDefinition = {
  key:
    | 'distanceMeters'
    | 'elevationGainMeters'
    | 'durationSeconds'
    | 'swimDistanceMeters'
    | 'swimDurationSeconds'
    | 'swimTrack'
    | 'transition1Seconds'
    | 'bikeDistanceMeters'
    | 'bikeElevationGainMeters'
    | 'bikeDurationSeconds'
    | 'bikeTrack'
    | 'transition2Seconds'
    | 'runDistanceMeters'
    | 'runElevationGainMeters'
    | 'runDurationSeconds'
    | 'runTrack'
    | 'totalDurationSeconds'
    | 'resultStatus'
    | 'rankings'
    | 'statusComment'
    | 'track'
    | 'notes'
  label: string
  section: 'description' | 'results' | 'route' | 'notes'
  valueType:
    | 'distance'
    | 'integer'
    | 'duration'
    | 'status'
    | 'rankings'
    | 'gpx'
    | 'text'
  required: boolean
  storagePath?: string
  storageUnit?: 'm' | 's'
  inputUnits?: Array<'m' | 'km'>
  defaultInputUnit?: 'm' | 'km'
  displayFormat?:
    | 'adaptive-distance'
    | 'meters'
    | 'hms'
    | 'status'
    | 'rankings'
    | 'map'
    | 'text'
}

export type ActivityDefinition = {
  id: ActivityDefinitionId
  categoryKey: SportCategoryKey
  categoryLabel: string
  categoryAccent: string
  sportKey: SportKey
  sportLabel: string
  activityTypeKey: ActivityTypeKey
  activityTypeLabel: 'Course'
  environment: ActivityEnvironment
  active: boolean
  schemaVersion: number
  fields: ActivityFieldDefinition[]
}
