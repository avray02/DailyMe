export type SportCategoryKey =
  | 'running'
  | 'cycling'
  | 'swimming'
  | 'winter-sports'

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
  distanceMeters: number
  elevationGainMeters?: number
  durationSeconds: number
  resultStatus: ResultStatus
  rankings: Record<RankingKey, RankingResult>
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
  data: RaceData
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
