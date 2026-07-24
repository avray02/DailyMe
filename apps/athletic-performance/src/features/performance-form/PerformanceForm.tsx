import { useAuth } from '@dailyme/auth'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  CalendarDays,
  Flag,
  Medal,
  Mountain,
  Route,
  Save,
  Timer,
  Trophy,
  Users,
} from 'lucide-react'
import { useEffect, useMemo, type CSSProperties, type ReactNode } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import type {
  ActivityDefinition,
  Performance,
  RankingResult,
  ResultStatus,
  SportCategoryKey,
  SportKey,
} from '../../types/performance'
import {
  performanceSchema,
  type PerformanceWizardValues,
} from '../../validation/performanceSchema'
import { listActivityDefinitions } from '../performances/activityDefinitionRepository'
import {
  activityDefinitions,
  categoryByKey,
  definitionHasField,
  resultSentinels,
  resultStatusLabels,
  sportByKey,
  sportCategories,
} from '../performances/performanceCatalog'
import { savePerformance } from '../performances/performanceRepository'
import { GpxTrackField } from './GpxTrackField'

type PerformanceFormProps = {
  performance?: Performance
}

const resultStatuses: ResultStatus[] = ['ranked', 'dnf', 'dsq', 'dns']

export function PerformanceForm({ performance }: PerformanceFormProps) {
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const ownerUid = user?.uid ?? 'local-demo-user'
  const isEditing = Boolean(performance)
  const definitionsQuery = useQuery({
    queryKey: ['activity-definitions'],
    queryFn: () => listActivityDefinitions(isAdmin),
  })
  const definitions = definitionsQuery.data ?? activityDefinitions
  const form = useForm<PerformanceWizardValues>({
    resolver: zodResolver(performanceSchema) as Resolver<PerformanceWizardValues>,
    mode: 'onBlur',
    defaultValues: getDefaultValues(performance),
  })
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    clearErrors,
    watch,
    formState: { errors },
  } = form
  const selectedCategory = watch('categoryKey')
  const selectedSport = watch('sportKey')
  const resultStatus = watch('resultStatus')
  const includeOverallRanking = watch('includeOverallRanking')
  const includeCategoryRanking = watch('includeCategoryRanking')
  const distanceUnit = watch('distanceUnit')
  const year = watch('year')
  const month = watch('month')
  const day = watch('day')
  const track = watch('track')
  const selectedDefinition = definitions.find(
    (definition) => definition.sportKey === selectedSport,
  )
  const availableCategories = useMemo(
    () =>
      sportCategories.filter((category) =>
        definitions.some(
          (definition) => definition.categoryKey === category.key,
        ),
      ),
    [definitions],
  )
  const availableSports = useMemo(
    () =>
      definitions
        .filter(
          (definition) => definition.categoryKey === selectedCategory,
        )
        .map((definition) => sportByKey[definition.sportKey]),
    [definitions, selectedCategory],
  )
  const category = categoryByKey[selectedCategory]
  const categoryStyle = {
    '--accent': category.accent,
    '--accent-hover': category.accent,
    '--accent-soft': category.softAccent,
    '--category-accent': category.accent,
    '--category-soft': category.softAccent,
  } as CSSProperties

  useEffect(() => {
    reset(getDefaultValues(performance))
  }, [performance, reset])

  useEffect(() => {
    const maximum = daysInMonth(year, month)
    if (day > maximum) {
      setValue('day', maximum)
      clearErrors('day')
    }
  }, [clearErrors, day, month, setValue, year])

  const saveMutation = useMutation({
    mutationFn: savePerformance,
    onError: (error) => {
      console.error('Firebase performance save failed:', error)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['performances', ownerUid],
      })
      navigate('/', {
        replace: true,
        state: {
          notice: isEditing
            ? 'Performance mise a jour.'
            : 'Performance ajoutee.',
        },
      })
    },
  })

  function selectCategory(categoryKey: SportCategoryKey) {
    const firstDefinition = definitions.find(
      (definition) => definition.categoryKey === categoryKey,
    )
    if (!firstDefinition) return

    setValue('categoryKey', categoryKey, { shouldDirty: true })
    selectSport(firstDefinition.sportKey)
  }

  function selectSport(sportKey: SportKey) {
    const definition = definitions.find(
      (candidate) => candidate.sportKey === sportKey,
    )
    if (!definition) return

    setValue('sportKey', sportKey, { shouldDirty: true })
    setValue('activityDefinitionId', definition.id, { shouldDirty: true })
    setValue('categoryKey', definition.categoryKey, { shouldDirty: true })
    if (!definitionHasField(definition, 'elevationGainMeters')) {
      setValue('elevationGainMeters', undefined)
    }
    clearErrors(['categoryKey', 'sportKey', 'activityDefinitionId'])
  }

  function submit(values: PerformanceWizardValues) {
    const definition = definitions.find(
      (candidate) => candidate.id === values.activityDefinitionId,
    )
    if (!definition) {
      return
    }

    saveMutation.mutate(
      buildPerformance(values, ownerUid, definition, performance),
    )
  }

  return (
    <main className="form-page" style={categoryStyle}>
      <Link className="back-link" to="/">
        <ArrowLeft size={16} aria-hidden="true" />
        Retour aux performances
      </Link>

      <header className="form-page-heading">
        <div className="page-heading">
          <p className="eyebrow">Competition outdoor</p>
          <h1>{isEditing ? 'Modifier la performance' : 'Nouvelle performance'}</h1>
        </div>
        <p>
          Renseigne le parcours, ton resultat et, si disponible, la trace GPX.
        </p>
      </header>

      <form className="performance-form" onSubmit={handleSubmit(submit)}>
        <FormSection
          number="01"
          title="Discipline"
          description="Choisis une famille puis le sport pratique."
        >
          <div className="activity-selection">
            <div>
              <span className="field-group-label">Categorie de sport</span>
              <div className="selection-grid category-selection-grid">
                {availableCategories.map((option) => (
                  <button
                    className={
                      selectedCategory === option.key
                        ? 'selection-choice is-selected'
                        : 'selection-choice'
                    }
                    key={option.key}
                    type="button"
                    style={
                      {
                        '--choice-accent': option.accent,
                        '--choice-soft': option.softAccent,
                      } as CSSProperties
                    }
                    aria-pressed={selectedCategory === option.key}
                    onClick={() => selectCategory(option.key)}
                  >
                    <span
                      className="category-swatch"
                      aria-hidden="true"
                    />
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="field-group-label">Sport</span>
              <div className="selection-grid sport-selection-grid">
                {availableSports.map((option) => {
                  const Icon = option.icon
                  return (
                    <button
                      className={
                        selectedSport === option.key
                          ? 'selection-choice is-selected'
                          : 'selection-choice'
                      }
                      key={option.key}
                      type="button"
                      aria-pressed={selectedSport === option.key}
                      onClick={() => selectSport(option.key)}
                    >
                      <Icon size={18} aria-hidden="true" />
                      {option.label}
                    </button>
                  )
                })}
              </div>
              {errors.sportKey ? <small>{errors.sportKey.message}</small> : null}
            </div>
          </div>
        </FormSection>

        <FormSection
          number="02"
          title="Identification"
          description="Donne un nom a la course et sa date."
        >
          <div className="form-grid">
            <label className="wide-field">
              <span>
                <Flag size={16} aria-hidden="true" />
                Nom de la competition
              </span>
              <input
                type="text"
                placeholder="Ex. Trail des Aiguilles Rouges"
                {...register('title')}
              />
              {errors.title ? <small>{errors.title.message}</small> : null}
            </label>
            <DateSelector
              register={register}
              year={year}
              month={month}
              errors={{
                year: errors.year?.message,
                month: errors.month?.message,
                day: errors.day?.message,
              }}
            />
          </div>
        </FormSection>

        <FormSection
          number="03"
          title="Parcours"
          description="Les valeurs sont conservees dans leurs unites canoniques."
        >
          <div className="form-grid metric-fields">
            <label>
              <span>
                <Route size={16} aria-hidden="true" />
                Distance
              </span>
              <span className="measurement-input">
                <input
                  type="number"
                  min="0"
                  step="any"
                  {...register('distanceValue', {
                    setValueAs: requiredNumber,
                  })}
                />
                <select
                  aria-label="Unite de distance"
                  {...register('distanceUnit')}
                >
                  <option value="km">km</option>
                  <option value="m">m</option>
                </select>
              </span>
              <small className="field-hint">
                Enregistrement :{' '}
                {distanceUnit === 'km' ? 'conversion en metres' : 'metres'}
              </small>
              {errors.distanceValue ? (
                <small>{errors.distanceValue.message}</small>
              ) : null}
            </label>

            {definitionHasField(
              selectedDefinition,
              'elevationGainMeters',
            ) ? (
              <label>
                <span>
                  <Mountain size={16} aria-hidden="true" />
                  Denivele positif (m)
                </span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  {...register('elevationGainMeters', {
                    setValueAs: optionalNumber,
                  })}
                />
                {errors.elevationGainMeters ? (
                  <small>{errors.elevationGainMeters.message}</small>
                ) : null}
              </label>
            ) : null}
          </div>
        </FormSection>

        <FormSection
          number="04"
          title="Resultats"
          description="Le classement par sexe est propose en premier."
        >
          <div className="result-fields">
            <DurationField register={register} errors={errors} />

            <div>
              <span className="field-group-label">Statut du resultat</span>
              <div
                className="result-status-row"
                role="group"
                aria-label="Statut du resultat"
              >
                {resultStatuses.map((status) => (
                  <button
                    className={resultStatus === status ? 'is-selected' : ''}
                    key={status}
                    type="button"
                    aria-pressed={resultStatus === status}
                    onClick={() =>
                      setValue('resultStatus', status, { shouldDirty: true })
                    }
                  >
                    {resultStatusLabels[status]}
                  </button>
                ))}
              </div>
            </div>

            {resultStatus === 'ranked' ? (
              <>
                <div className="ranking-grid">
                  <RankingGroup
                    label="Classement par sexe"
                    rankField="sexRank"
                    participantField="sexParticipants"
                    register={register}
                    errors={errors}
                  />
                  {includeOverallRanking ? (
                    <RankingGroup
                      label="Classement general"
                      rankField="overallRank"
                      participantField="overallParticipants"
                      register={register}
                      errors={errors}
                    />
                  ) : null}
                  {includeCategoryRanking ? (
                    <RankingGroup
                      label="Classement par categorie"
                      rankField="categoryRank"
                      participantField="categoryParticipants"
                      register={register}
                      errors={errors}
                    />
                  ) : null}
                </div>

                <div className="ranking-options">
                  <label className="multi-day-toggle">
                    <input
                      type="checkbox"
                      {...register('includeOverallRanking')}
                    />
                    Ajouter le classement general
                  </label>
                  <label className="multi-day-toggle">
                    <input
                      type="checkbox"
                      {...register('includeCategoryRanking')}
                    />
                    Ajouter le classement par categorie
                  </label>
                </div>
              </>
            ) : (
              <label className="status-comment">
                <span>Commentaire sur le statut</span>
                <textarea
                  rows={4}
                  placeholder="Contexte du DNF, DSQ ou DNS..."
                  {...register('statusComment')}
                />
                {errors.statusComment ? (
                  <small>{errors.statusComment.message}</small>
                ) : null}
              </label>
            )}
          </div>
        </FormSection>

        <FormSection
          number="05"
          title="Trace GPX"
          description="Le fichier est simplifie pour afficher le parcours sur la carte."
        >
          <div className="gpx-form-field">
            <GpxTrackField
              track={track}
              onChange={(nextTrack) =>
                setValue('track', nextTrack, { shouldDirty: true })
              }
            />
          </div>
        </FormSection>

        <FormSection
          number="06"
          title="Notes"
          description="Ajoute librement le contexte ou les sensations."
        >
          <div className="form-grid">
            <label className="wide-field">
              <span>Commentaire general</span>
              <textarea
                rows={5}
                placeholder="Conditions, sensations, objectifs..."
                {...register('notes')}
              />
              {errors.notes ? <small>{errors.notes.message}</small> : null}
            </label>
          </div>
        </FormSection>

        {saveMutation.isError ? (
          <p className="form-error" role="alert">
            {getSaveErrorMessage(saveMutation.error)}
          </p>
        ) : null}

        <footer className="form-actions">
          <Link className="secondary-button" to="/">
            Annuler
          </Link>
          <button
            className="primary-button"
            type="submit"
            disabled={saveMutation.isPending}
          >
            <Save size={17} aria-hidden="true" />
            {saveMutation.isPending
              ? 'Enregistrement...'
              : isEditing
                ? 'Enregistrer'
                : 'Ajouter la performance'}
          </button>
        </footer>
      </form>
    </main>
  )
}

function FormSection({
  number,
  title,
  description,
  children,
}: {
  number: string
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="form-section">
      <header className="section-heading">
        <span className="section-number">{number}</span>
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </header>
      {children}
    </section>
  )
}

function DateSelector({
  register,
  year,
  month,
  errors,
}: {
  register: ReturnType<typeof useForm<PerformanceWizardValues>>['register']
  year: number
  month: number
  errors: { year?: string; month?: string; day?: string }
}) {
  return (
    <fieldset className="date-selector wide-field">
      <legend>
        <CalendarDays size={16} aria-hidden="true" />
        Date
      </legend>
      <div>
        <label>
          <span>Annee</span>
          <select {...register('year', { valueAsNumber: true })}>
            {yearOptions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          {errors.year ? <small>{errors.year}</small> : null}
        </label>
        <label>
          <span>Mois</span>
          <select {...register('month', { valueAsNumber: true })}>
            {monthOptions.map((label, index) => (
              <option key={label} value={index + 1}>
                {label}
              </option>
            ))}
          </select>
          {errors.month ? <small>{errors.month}</small> : null}
        </label>
        <label>
          <span>Jour</span>
          <select {...register('day', { valueAsNumber: true })}>
            {Array.from(
              { length: daysInMonth(year, month) },
              (_, index) => index + 1,
            ).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          {errors.day ? <small>{errors.day}</small> : null}
        </label>
      </div>
    </fieldset>
  )
}

function DurationField({
  register,
  errors,
}: {
  register: ReturnType<typeof useForm<PerformanceWizardValues>>['register']
  errors: ReturnType<typeof useForm<PerformanceWizardValues>>['formState']['errors']
}) {
  return (
    <fieldset className="duration-field">
      <legend>
        <Timer size={16} aria-hidden="true" />
        Temps
        <small>obligatoire</small>
      </legend>
      <div className="duration-inputs">
        <label>
          <span>Heures</span>
          <input
            type="number"
            min="0"
            step="1"
            {...register('durationHours', { setValueAs: requiredNumber })}
          />
          {errors.durationHours ? (
            <small>{errors.durationHours.message}</small>
          ) : null}
        </label>
        <label>
          <span>Minutes</span>
          <input
            type="number"
            min="0"
            max="59"
            step="1"
            {...register('durationMinutes', { setValueAs: requiredNumber })}
          />
          {errors.durationMinutes ? (
            <small>{errors.durationMinutes.message}</small>
          ) : null}
        </label>
        <label>
          <span>Secondes</span>
          <input
            type="number"
            min="0"
            max="59"
            step="1"
            {...register('durationSeconds', { setValueAs: requiredNumber })}
          />
          {errors.durationSeconds ? (
            <small>{errors.durationSeconds.message}</small>
          ) : null}
        </label>
      </div>
    </fieldset>
  )
}

function RankingGroup({
  label,
  rankField,
  participantField,
  register,
  errors,
}: {
  label: string
  rankField: 'sexRank' | 'overallRank' | 'categoryRank'
  participantField:
    | 'sexParticipants'
    | 'overallParticipants'
    | 'categoryParticipants'
  register: ReturnType<typeof useForm<PerformanceWizardValues>>['register']
  errors: ReturnType<typeof useForm<PerformanceWizardValues>>['formState']['errors']
}) {
  return (
    <fieldset className="ranking-group">
      <legend>
        <Medal size={16} aria-hidden="true" />
        {label}
      </legend>
      <label>
        <span>
          <Trophy size={15} aria-hidden="true" />
          Position
        </span>
        <input
          type="number"
          min="1"
          step="1"
          placeholder="Ex. 12"
          {...register(rankField, { setValueAs: optionalNumber })}
        />
        {errors[rankField] ? <small>{errors[rankField]?.message}</small> : null}
      </label>
      <label>
        <span>
          <Users size={15} aria-hidden="true" />
          Participants
        </span>
        <input
          type="number"
          min="1"
          step="1"
          placeholder="Ex. 240"
          {...register(participantField, { setValueAs: optionalNumber })}
        />
        {errors[participantField] ? (
          <small>{errors[participantField]?.message}</small>
        ) : null}
      </label>
    </fieldset>
  )
}

function getDefaultValues(
  performance?: Performance,
): PerformanceWizardValues {
  const today = new Date()
  const durationSeconds = performance?.data.durationSeconds ?? 0
  const definition =
    activityDefinitions.find(
      (candidate) => candidate.id === performance?.activityDefinitionId,
    ) ?? activityDefinitions[0]

  return {
    categoryKey: definition.categoryKey,
    sportKey: definition.sportKey,
    activityDefinitionId: definition.id,
    title: performance?.title ?? '',
    year: performance?.date.year ?? today.getFullYear(),
    month: performance?.date.month ?? today.getMonth() + 1,
    day: performance?.date.day ?? today.getDate(),
    distanceValue: performance ? performance.data.distanceMeters / 1000 : 0,
    distanceUnit: 'km',
    elevationGainMeters: performance?.data.elevationGainMeters,
    durationHours: Math.floor(durationSeconds / 3600),
    durationMinutes: Math.floor((durationSeconds % 3600) / 60),
    durationSeconds: durationSeconds % 60,
    resultStatus: performance?.data.resultStatus ?? 'ranked',
    statusComment: performance?.data.statusComment ?? '',
    sexRank: rankedValue(performance?.data.rankings.sex),
    sexParticipants: performance?.data.rankings.sex.participantCount,
    includeOverallRanking:
      typeof performance?.data.rankings.overall.rank === 'number' &&
      Number(performance.data.rankings.overall.rank) > 0,
    overallRank: rankedValue(performance?.data.rankings.overall),
    overallParticipants: performance?.data.rankings.overall.participantCount,
    includeCategoryRanking:
      typeof performance?.data.rankings.category.rank === 'number' &&
      Number(performance.data.rankings.category.rank) > 0,
    categoryRank: rankedValue(performance?.data.rankings.category),
    categoryParticipants: performance?.data.rankings.category.participantCount,
    track: performance?.track,
    notes: performance?.notes ?? '',
  }
}

function buildPerformance(
  values: PerformanceWizardValues,
  ownerUid: string,
  definition: ActivityDefinition,
  existing?: Performance,
): Performance {
  const now = new Date().toISOString()
  const notes = clean(values.notes)
  const statusComment = clean(values.statusComment)
  const distanceMeters = Math.round(
    values.distanceUnit === 'km'
      ? values.distanceValue * 1000
      : values.distanceValue,
  )
  const rankings = buildRankings(values)

  return {
    id: existing?.id ?? crypto.randomUUID(),
    ownerUid,
    activityDefinitionId: definition.id,
    schemaVersion: definition.schemaVersion,
    categoryKey: definition.categoryKey,
    sportKey: definition.sportKey,
    activityTypeKey: 'race',
    title: values.title.trim(),
    status: 'completed',
    date: {
      year: values.year,
      month: values.month,
      day: values.day,
    },
    data: {
      distanceMeters,
      ...(definitionHasField(definition, 'elevationGainMeters')
        ? { elevationGainMeters: values.elevationGainMeters }
        : {}),
      durationSeconds:
        values.durationHours * 3600 +
        values.durationMinutes * 60 +
        values.durationSeconds,
      resultStatus: values.resultStatus,
      rankings,
      ...(values.resultStatus !== 'ranked' && statusComment
        ? { statusComment }
        : {}),
    },
    ...(values.track ? { track: values.track } : {}),
    ...(notes ? { notes } : {}),
    tags: [definition.categoryKey, definition.sportKey, 'race'],
    searchKeywords: [
      values.title,
      definition.categoryLabel,
      definition.sportLabel,
      String(values.year),
      String(distanceMeters),
      String(values.elevationGainMeters ?? ''),
    ]
      .join(' ')
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
}

function buildRankings(
  values: PerformanceWizardValues,
): Record<'sex' | 'overall' | 'category', RankingResult> {
  if (values.resultStatus !== 'ranked') {
    const rank = resultSentinels[values.resultStatus]
    return {
      sex: { rank },
      overall: { rank },
      category: { rank },
    }
  }

  return {
    sex: buildRanking(values.sexRank, values.sexParticipants),
    overall: values.includeOverallRanking
      ? buildRanking(values.overallRank, values.overallParticipants)
      : {},
    category: values.includeCategoryRanking
      ? buildRanking(values.categoryRank, values.categoryParticipants)
      : {},
  }
}

function buildRanking(
  rank: number | undefined,
  participantCount: number | undefined,
): RankingResult {
  return {
    ...(typeof rank === 'number' ? { rank } : {}),
    ...(typeof participantCount === 'number' ? { participantCount } : {}),
  }
}

function rankedValue(ranking?: RankingResult) {
  return ranking?.rank && ranking.rank > 0 ? ranking.rank : undefined
}

function requiredNumber(value: unknown) {
  return value === '' ? Number.NaN : Number(value)
}

function optionalNumber(value: unknown) {
  return value === '' || value === null ? undefined : Number(value)
}

function clean(value?: string) {
  const cleaned = value?.trim()
  return cleaned || undefined
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

function getSaveErrorMessage(error: unknown) {
  const code =
    error &&
    typeof error === 'object' &&
    'code' in error &&
    typeof error.code === 'string'
      ? error.code
      : ''

  if (code.endsWith('permission-denied')) {
    return "Firebase a refuse l'enregistrement. Verifie les droits du compte puis reessaie."
  }

  if (code.endsWith('unavailable')) {
    return "Firebase est momentanement indisponible. Verifie ta connexion puis reessaie."
  }

  return code
    ? `L'enregistrement a echoue (${code}).`
    : "L'enregistrement a echoue. Verifie ta connexion puis reessaie."
}

const monthOptions = [
  'Janvier',
  'Fevrier',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Aout',
  'Septembre',
  'Octobre',
  'Novembre',
  'Decembre',
]

const yearOptions = Array.from(
  { length: new Date().getFullYear() + 11 - 1950 },
  (_, index) => new Date().getFullYear() + 10 - index,
)
