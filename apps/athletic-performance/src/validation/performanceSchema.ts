import { z } from 'zod'
import { definitionById } from '../features/performances/performanceCatalog'
import type { SimplifiedGpxTrack } from '../types/performance'

const optionalNumber = (
  minimum: number,
  maximum: number,
  message: string,
) =>
  z
    .number({ error: message })
    .int(message)
    .min(minimum, message)
    .max(maximum, message)
    .optional()

const optionalDecimal = (maximum: number, message: string) =>
  z.number({ error: message }).min(0, message).max(maximum, message).optional()

export const performanceSchema = z
  .object({
    categoryKey: z.enum([
      'running',
      'cycling',
      'swimming',
      'winter-sports',
      'multisport',
    ]),
    sportKey: z.enum([
      'road-running',
      'trail-running',
      'road-cycling',
      'mountain-biking',
      'gravel-cycling',
      'open-water-swimming',
      'winter-trail',
      'ski-mountaineering',
      'cross-country-skiing-skating',
      'cross-country-skiing-classic',
      'triathlon',
    ]),
    activityDefinitionId: z.string().min(1),
    title: z
      .string()
      .trim()
      .min(2, 'Le nom doit contenir au moins 2 caracteres')
      .max(120, 'Le nom est limite a 120 caracteres'),
    year: z.number().int().min(1900).max(2100),
    month: z.number().int().min(1).max(12),
    day: z.number().int().min(1).max(31),
    distanceValue: optionalDecimal(1_000_000, 'Distance invalide'),
    distanceUnit: z.enum(['km', 'm']),
    elevationGainMeters: optionalNumber(
      0,
      100_000,
      'Denivele invalide',
    ),
    durationHours: optionalNumber(0, 100_000, 'Heures invalides'),
    durationMinutes: optionalNumber(0, 59, 'Entre 0 et 59 minutes'),
    durationSeconds: optionalNumber(0, 59, 'Entre 0 et 59 secondes'),
    swimDistanceValue: optionalDecimal(1_000_000, 'Distance invalide'),
    swimDistanceUnit: z.enum(['km', 'm']),
    swimDurationHours: optionalNumber(0, 100_000, 'Heures invalides'),
    swimDurationMinutes: optionalNumber(0, 59, 'Entre 0 et 59 minutes'),
    swimDurationSeconds: optionalNumber(0, 59, 'Entre 0 et 59 secondes'),
    swimTrack: z.custom<SimplifiedGpxTrack>().optional(),
    transition1Hours: optionalNumber(0, 100_000, 'Heures invalides'),
    transition1Minutes: optionalNumber(0, 59, 'Entre 0 et 59 minutes'),
    transition1Seconds: optionalNumber(0, 59, 'Entre 0 et 59 secondes'),
    bikeDistanceValue: optionalDecimal(1_000_000, 'Distance invalide'),
    bikeDistanceUnit: z.enum(['km', 'm']),
    bikeElevationGainMeters: optionalNumber(
      0,
      100_000,
      'Denivele invalide',
    ),
    bikeDurationHours: optionalNumber(0, 100_000, 'Heures invalides'),
    bikeDurationMinutes: optionalNumber(0, 59, 'Entre 0 et 59 minutes'),
    bikeDurationSeconds: optionalNumber(0, 59, 'Entre 0 et 59 secondes'),
    bikeTrack: z.custom<SimplifiedGpxTrack>().optional(),
    transition2Hours: optionalNumber(0, 100_000, 'Heures invalides'),
    transition2Minutes: optionalNumber(0, 59, 'Entre 0 et 59 minutes'),
    transition2Seconds: optionalNumber(0, 59, 'Entre 0 et 59 secondes'),
    runDistanceValue: optionalDecimal(1_000_000, 'Distance invalide'),
    runDistanceUnit: z.enum(['km', 'm']),
    runElevationGainMeters: optionalNumber(
      0,
      100_000,
      'Denivele invalide',
    ),
    runDurationHours: optionalNumber(0, 100_000, 'Heures invalides'),
    runDurationMinutes: optionalNumber(0, 59, 'Entre 0 et 59 minutes'),
    runDurationSeconds: optionalNumber(0, 59, 'Entre 0 et 59 secondes'),
    runTrack: z.custom<SimplifiedGpxTrack>().optional(),
    resultStatus: z.enum(['ranked', 'dnf', 'dsq', 'dns']),
    statusComment: z.string().max(1000).optional(),
    sexRank: optionalNumber(1, 10_000_000, 'Classement invalide'),
    sexParticipants: optionalNumber(
      1,
      10_000_000,
      'Nombre de participants invalide',
    ),
    includeOverallRanking: z.boolean(),
    overallRank: optionalNumber(1, 10_000_000, 'Classement invalide'),
    overallParticipants: optionalNumber(
      1,
      10_000_000,
      'Nombre de participants invalide',
    ),
    includeCategoryRanking: z.boolean(),
    categoryRank: optionalNumber(1, 10_000_000, 'Classement invalide'),
    categoryParticipants: optionalNumber(
      1,
      10_000_000,
      'Nombre de participants invalide',
    ),
    track: z.custom<SimplifiedGpxTrack>().optional(),
    notes: z.string().max(1500, 'Les notes sont limitees a 1500 caracteres'),
  })
  .superRefine((values, context) => {
    const definition = definitionById[values.activityDefinitionId]

    if (
      !definition ||
      definition.categoryKey !== values.categoryKey ||
      definition.sportKey !== values.sportKey
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Selection de sport invalide',
        path: ['sportKey'],
      })
      return
    }

    const date = new Date(Date.UTC(values.year, values.month - 1, values.day))
    if (
      date.getUTCFullYear() !== values.year ||
      date.getUTCMonth() !== values.month - 1 ||
      date.getUTCDate() !== values.day
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Date invalide',
        path: ['day'],
      })
    }

    if (values.resultStatus === 'ranked') {
      validateRanking(
        values.sexRank,
        values.sexParticipants,
        ['sexRank'],
        ['sexParticipants'],
        context,
      )

      if (values.includeOverallRanking) {
        validateRanking(
          values.overallRank,
          values.overallParticipants,
          ['overallRank'],
          ['overallParticipants'],
          context,
        )
      }

      if (values.includeCategoryRanking) {
        validateRanking(
          values.categoryRank,
          values.categoryParticipants,
          ['categoryRank'],
          ['categoryParticipants'],
          context,
        )
      }
    }
  })

function validateRanking(
  rank: number | undefined,
  participantCount: number | undefined,
  rankPath: string[],
  participantPath: string[],
  context: z.RefinementCtx,
) {
  if (typeof participantCount === 'number' && typeof rank !== 'number') {
    context.addIssue({
      code: 'custom',
      message: "Renseigne d'abord le classement",
      path: participantPath,
    })
  }

  if (
    typeof rank === 'number' &&
    typeof participantCount === 'number' &&
    participantCount < rank
  ) {
    context.addIssue({
      code: 'custom',
      message: 'Le total doit etre superieur ou egal au classement',
      path: participantPath,
    })
  }

  if (typeof rank === 'number' && rank < 1) {
    context.addIssue({
      code: 'custom',
      message: 'Le classement doit etre positif',
      path: rankPath,
    })
  }
}

export type PerformanceWizardValues = z.infer<typeof performanceSchema>
