import { useAuth } from '@dailyme/auth'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Bike,
  CalendarDays,
  Flag,
  Footprints,
  Medal,
  Mountain,
  Route,
  Save,
  Timer,
  Trophy,
  Users,
  Waves,
} from 'lucide-react'
import { useEffect, useMemo, type CSSProperties, type ReactNode } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import type {
  ActivityDefinition,
  Performance,
  RaceData,
  RankingResult,
  ResultStatus,
  SimplifiedGpxTrack,
  SportCategoryKey,
  SportKey,
  TriathlonData,
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
  isTriathlonData,
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
  const swimTrack = watch('swimTrack')
  const bikeTrack = watch('bikeTrack')
  const runTrack = watch('runTrack')
  const watchedValues = watch()
  const isTriathlon = selectedSport === 'triathlon'
  const triathlonTotalSeconds =
    isTriathlon && resultStatus === 'ranked'
      ? calculateTriathlonTotal(watchedValues)
      : 0
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
    onSuccess: async (_result, savedPerformance) => {
      queryClient.setQueryData<Performance[]>(
        ['performances', ownerUid],
        (performances = []) => [
          savedPerformance,
          ...performances.filter(
            (candidate) => candidate.id !== savedPerformance.id,
          ),
        ],
      )
      await queryClient.invalidateQueries({
        queryKey: ['performances', ownerUid],
        refetchType: 'active',
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
    } else {
      setValue('elevationGainMeters', 0)
    }
    clearErrors(['categoryKey', 'sportKey', 'activityDefinitionId'])
  }

  function selectResultStatus(status: ResultStatus) {
    setValue('resultStatus', status, { shouldDirty: true })
    if (status !== 'ranked') {
      setValue('durationHours', 0, { shouldDirty: true })
      setValue('durationMinutes', 0, { shouldDirty: true })
      setValue('durationSeconds', 0, { shouldDirty: true })
      const triathlonDurationFields = [
        'swimDurationHours',
        'swimDurationMinutes',
        'swimDurationSeconds',
        'transition1Hours',
        'transition1Minutes',
        'transition1Seconds',
        'bikeDurationHours',
        'bikeDurationMinutes',
        'bikeDurationSeconds',
        'transition2Hours',
        'transition2Minutes',
        'transition2Seconds',
        'runDurationHours',
        'runDurationMinutes',
        'runDurationSeconds',
      ] as const
      triathlonDurationFields.forEach((field) =>
        setValue(field, 0, { shouldDirty: true }),
      )
      clearErrors([
        'durationHours',
        'durationMinutes',
        'durationSeconds',
        ...triathlonDurationFields,
      ])
    }
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
          title={isTriathlon ? 'Disciplines et transitions' : 'Parcours'}
          description={
            isTriathlon
              ? 'Renseigne les trois disciplines dans leur ordre de course.'
              : 'Les valeurs sont conservees dans leurs unites canoniques.'
          }
        >
          {isTriathlon ? (
            <TriathlonCourseFields
              register={register}
              errors={errors}
              showTimes={resultStatus === 'ranked'}
            />
          ) : (
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
                      setValueAs: optionalNumber,
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
          )}
        </FormSection>

        <FormSection
          number="04"
          title="Resultats"
          description="Le classement par sexe est propose en premier."
        >
          <div className="result-fields">
            {resultStatus === 'ranked' && !isTriathlon ? (
              <DurationField register={register} errors={errors} />
            ) : null}

            {resultStatus === 'ranked' && isTriathlon ? (
              <div className="triathlon-total" aria-live="polite">
                <Timer size={19} aria-hidden="true" />
                <span>
                  <small>Temps total calcule</small>
                  <strong>
                    {triathlonTotalSeconds > 0
                      ? formatDurationInput(triathlonTotalSeconds)
                      : 'Non renseigne'}
                  </strong>
                </span>
              </div>
            ) : null}

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
                    onClick={() => selectResultStatus(status)}
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
          title={isTriathlon ? 'Traces GPX' : 'Trace GPX'}
          description={
            isTriathlon
              ? 'Chaque discipline conserve sa propre trace simplifiee.'
              : 'Le fichier est simplifie pour dessiner le parcours et son profil.'
          }
        >
          {isTriathlon ? (
            <div className="triathlon-gpx-grid">
              <LabeledGpxField
                label="Natation"
                track={swimTrack}
                onChange={(nextTrack) =>
                  setValue('swimTrack', nextTrack, { shouldDirty: true })
                }
              />
              <LabeledGpxField
                label="Cyclisme sur route"
                track={bikeTrack}
                onChange={(nextTrack) =>
                  setValue('bikeTrack', nextTrack, { shouldDirty: true })
                }
              />
              <LabeledGpxField
                label="Course a pied"
                track={runTrack}
                onChange={(nextTrack) =>
                  setValue('runTrack', nextTrack, { shouldDirty: true })
                }
              />
            </div>
          ) : (
            <div className="gpx-form-field">
              <GpxTrackField
                track={track}
                onChange={(nextTrack) =>
                  setValue('track', nextTrack, { shouldDirty: true })
                }
              />
            </div>
          )}
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

type FormRegister = ReturnType<
  typeof useForm<PerformanceWizardValues>
>['register']
type FormErrors = ReturnType<
  typeof useForm<PerformanceWizardValues>
>['formState']['errors']
type TriathlonDistanceField =
  | 'swimDistanceValue'
  | 'bikeDistanceValue'
  | 'runDistanceValue'
type TriathlonDistanceUnitField =
  | 'swimDistanceUnit'
  | 'bikeDistanceUnit'
  | 'runDistanceUnit'
type TriathlonElevationField =
  | 'bikeElevationGainMeters'
  | 'runElevationGainMeters'
type DurationFieldNames = {
  hours:
    | 'swimDurationHours'
    | 'transition1Hours'
    | 'bikeDurationHours'
    | 'transition2Hours'
    | 'runDurationHours'
  minutes:
    | 'swimDurationMinutes'
    | 'transition1Minutes'
    | 'bikeDurationMinutes'
    | 'transition2Minutes'
    | 'runDurationMinutes'
  seconds:
    | 'swimDurationSeconds'
    | 'transition1Seconds'
    | 'bikeDurationSeconds'
    | 'transition2Seconds'
    | 'runDurationSeconds'
}

function TriathlonCourseFields({
  register,
  errors,
  showTimes,
}: {
  register: FormRegister
  errors: FormErrors
  showTimes: boolean
}) {
  return (
    <div className="triathlon-course-flow">
      <TriathlonDisciplineFields
        number="1"
        label="Natation"
        icon={<Waves size={19} aria-hidden="true" />}
        distanceField="swimDistanceValue"
        distanceUnitField="swimDistanceUnit"
        durationFields={{
          hours: 'swimDurationHours',
          minutes: 'swimDurationMinutes',
          seconds: 'swimDurationSeconds',
        }}
        register={register}
        errors={errors}
        showTime={showTimes}
      />
      {showTimes ? (
        <TransitionFields
          label="T1"
          description="Natation vers cyclisme"
          fields={{
            hours: 'transition1Hours',
            minutes: 'transition1Minutes',
            seconds: 'transition1Seconds',
          }}
          register={register}
          errors={errors}
        />
      ) : null}
      <TriathlonDisciplineFields
        number="2"
        label="Cyclisme sur route"
        icon={<Bike size={19} aria-hidden="true" />}
        distanceField="bikeDistanceValue"
        distanceUnitField="bikeDistanceUnit"
        elevationField="bikeElevationGainMeters"
        durationFields={{
          hours: 'bikeDurationHours',
          minutes: 'bikeDurationMinutes',
          seconds: 'bikeDurationSeconds',
        }}
        register={register}
        errors={errors}
        showTime={showTimes}
      />
      {showTimes ? (
        <TransitionFields
          label="T2"
          description="Cyclisme vers course a pied"
          fields={{
            hours: 'transition2Hours',
            minutes: 'transition2Minutes',
            seconds: 'transition2Seconds',
          }}
          register={register}
          errors={errors}
        />
      ) : null}
      <TriathlonDisciplineFields
        number="3"
        label="Course a pied"
        icon={<Footprints size={19} aria-hidden="true" />}
        distanceField="runDistanceValue"
        distanceUnitField="runDistanceUnit"
        elevationField="runElevationGainMeters"
        durationFields={{
          hours: 'runDurationHours',
          minutes: 'runDurationMinutes',
          seconds: 'runDurationSeconds',
        }}
        register={register}
        errors={errors}
        showTime={showTimes}
      />
    </div>
  )
}

function TriathlonDisciplineFields({
  number,
  label,
  icon,
  distanceField,
  distanceUnitField,
  elevationField,
  durationFields,
  register,
  errors,
  showTime,
}: {
  number: string
  label: string
  icon: ReactNode
  distanceField: TriathlonDistanceField
  distanceUnitField: TriathlonDistanceUnitField
  elevationField?: TriathlonElevationField
  durationFields: DurationFieldNames
  register: FormRegister
  errors: FormErrors
  showTime: boolean
}) {
  return (
    <article className="triathlon-discipline">
      <header>
        <span className="triathlon-discipline-icon">{icon}</span>
        <span>
          <small>Discipline {number}</small>
          <strong>{label}</strong>
        </span>
      </header>
      <div
        className={
          showTime
            ? 'triathlon-discipline-grid'
            : 'triathlon-discipline-grid without-time'
        }
      >
        <label>
          <span>Distance</span>
          <span className="measurement-input">
            <input
              type="number"
              min="0"
              step="any"
              {...register(distanceField, { setValueAs: optionalNumber })}
            />
            <select
              aria-label={`Unite de distance ${label}`}
              {...register(distanceUnitField)}
            >
              <option value="km">km</option>
              <option value="m">m</option>
            </select>
          </span>
          <FieldError errors={errors} field={distanceField} />
        </label>
        {elevationField ? (
          <label>
            <span>Denivele positif (m)</span>
            <input
              type="number"
              min="0"
              step="1"
              {...register(elevationField, { setValueAs: optionalNumber })}
            />
            <FieldError errors={errors} field={elevationField} />
          </label>
        ) : null}
        {showTime ? (
          <CompactDurationInputs
            label={`Temps ${label.toLowerCase()}`}
            fields={durationFields}
            register={register}
            errors={errors}
          />
        ) : null}
      </div>
    </article>
  )
}

function TransitionFields({
  label,
  description,
  fields,
  register,
  errors,
}: {
  label: string
  description: string
  fields: DurationFieldNames
  register: FormRegister
  errors: FormErrors
}) {
  return (
    <div className="triathlon-transition">
      <span className="transition-name">{label}</span>
      <span className="transition-copy">{description}</span>
      <CompactDurationInputs
        label={`Temps ${label}`}
        fields={fields}
        register={register}
        errors={errors}
        compact
      />
    </div>
  )
}

function CompactDurationInputs({
  label,
  fields,
  register,
  errors,
  compact = false,
}: {
  label: string
  fields: DurationFieldNames
  register: FormRegister
  errors: FormErrors
  compact?: boolean
}) {
  return (
    <fieldset
      className={
        compact
          ? 'compact-duration is-transition'
          : 'compact-duration'
      }
    >
      <legend>{label}</legend>
      <div>
        <label>
          <span>H</span>
          <input
            type="number"
            min="0"
            step="1"
            aria-label={`${label}, heures`}
            {...register(fields.hours, { setValueAs: optionalNumber })}
          />
          <FieldError errors={errors} field={fields.hours} />
        </label>
        <label>
          <span>M</span>
          <input
            type="number"
            min="0"
            max="59"
            step="1"
            aria-label={`${label}, minutes`}
            {...register(fields.minutes, { setValueAs: optionalNumber })}
          />
          <FieldError errors={errors} field={fields.minutes} />
        </label>
        <label>
          <span>S</span>
          <input
            type="number"
            min="0"
            max="59"
            step="1"
            aria-label={`${label}, secondes`}
            {...register(fields.seconds, { setValueAs: optionalNumber })}
          />
          <FieldError errors={errors} field={fields.seconds} />
        </label>
      </div>
    </fieldset>
  )
}

function FieldError({
  errors,
  field,
}: {
  errors: FormErrors
  field: keyof PerformanceWizardValues
}) {
  const message = errors[field]?.message
  return typeof message === 'string' ? <small>{message}</small> : null
}

function LabeledGpxField({
  label,
  track,
  onChange,
}: {
  label: string
  track?: SimplifiedGpxTrack
  onChange: (track?: SimplifiedGpxTrack) => void
}) {
  return (
    <section className="labeled-gpx-field">
      <h3>{label}</h3>
      <GpxTrackField track={track} onChange={onChange} />
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
      </legend>
      <div className="duration-inputs">
        <label>
          <span>Heures</span>
          <input
            type="number"
            min="0"
            step="1"
            {...register('durationHours', { setValueAs: optionalNumber })}
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
            {...register('durationMinutes', { setValueAs: optionalNumber })}
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
            {...register('durationSeconds', { setValueAs: optionalNumber })}
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
  const definition =
    activityDefinitions.find(
      (candidate) => candidate.id === performance?.activityDefinitionId,
    ) ?? activityDefinitions[0]
  const triathlonData = isTriathlonData(performance?.data)
    ? performance.data
    : undefined
  const raceData =
    performance && !triathlonData ? (performance.data as RaceData) : undefined
  const duration = toDurationParts(raceData?.durationSeconds)
  const swimDuration = toDurationParts(
    triathlonData?.disciplines.swimming.durationSeconds,
  )
  const bikeDuration = toDurationParts(
    triathlonData?.disciplines.cycling.durationSeconds,
  )
  const runDuration = toDurationParts(
    triathlonData?.disciplines.running.durationSeconds,
  )
  const transition1 = toDurationParts(
    triathlonData?.transitions.t1DurationSeconds,
  )
  const transition2 = toDurationParts(
    triathlonData?.transitions.t2DurationSeconds,
  )

  return {
    categoryKey: definition.categoryKey,
    sportKey: definition.sportKey,
    activityDefinitionId: definition.id,
    title: performance?.title ?? '',
    year: performance?.date.year ?? today.getFullYear(),
    month: performance?.date.month ?? today.getMonth() + 1,
    day: performance?.date.day ?? today.getDate(),
    distanceValue:
      typeof raceData?.distanceMeters === 'number'
        ? raceData.distanceMeters / 1000
        : 0,
    distanceUnit: 'km',
    elevationGainMeters: definitionHasField(
      definition,
      'elevationGainMeters',
    )
      ? (raceData?.elevationGainMeters ?? 0)
      : undefined,
    durationHours: duration.hours,
    durationMinutes: duration.minutes,
    durationSeconds: duration.seconds,
    swimDistanceValue:
      (triathlonData?.disciplines.swimming.distanceMeters ?? 0) / 1000,
    swimDistanceUnit: 'km',
    swimDurationHours: swimDuration.hours,
    swimDurationMinutes: swimDuration.minutes,
    swimDurationSeconds: swimDuration.seconds,
    swimTrack: triathlonData?.disciplines.swimming.track,
    transition1Hours: transition1.hours,
    transition1Minutes: transition1.minutes,
    transition1Seconds: transition1.seconds,
    bikeDistanceValue:
      (triathlonData?.disciplines.cycling.distanceMeters ?? 0) / 1000,
    bikeDistanceUnit: 'km',
    bikeElevationGainMeters:
      triathlonData?.disciplines.cycling.elevationGainMeters ?? 0,
    bikeDurationHours: bikeDuration.hours,
    bikeDurationMinutes: bikeDuration.minutes,
    bikeDurationSeconds: bikeDuration.seconds,
    bikeTrack: triathlonData?.disciplines.cycling.track,
    transition2Hours: transition2.hours,
    transition2Minutes: transition2.minutes,
    transition2Seconds: transition2.seconds,
    runDistanceValue:
      (triathlonData?.disciplines.running.distanceMeters ?? 0) / 1000,
    runDistanceUnit: 'km',
    runElevationGainMeters:
      triathlonData?.disciplines.running.elevationGainMeters ?? 0,
    runDurationHours: runDuration.hours,
    runDurationMinutes: runDuration.minutes,
    runDurationSeconds: runDuration.seconds,
    runTrack: triathlonData?.disciplines.running.track,
    resultStatus: performance?.data.resultStatus ?? 'ranked',
    statusComment: performance?.data.statusComment ?? '',
    sexRank: rankedValue(performance?.data.rankings.sex),
    sexParticipants: performance?.data.rankings.sex?.participantCount,
    includeOverallRanking:
      typeof performance?.data.rankings.overall?.rank === 'number' &&
      Number(performance.data.rankings.overall?.rank) > 0,
    overallRank: rankedValue(performance?.data.rankings.overall),
    overallParticipants:
      performance?.data.rankings.overall?.participantCount,
    includeCategoryRanking:
      typeof performance?.data.rankings.category?.rank === 'number' &&
      Number(performance.data.rankings.category?.rank) > 0,
    categoryRank: rankedValue(performance?.data.rankings.category),
    categoryParticipants:
      performance?.data.rankings.category?.participantCount,
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
  const isTriathlonDefinition = definition.sportKey === 'triathlon'
  const data = isTriathlonDefinition
    ? buildTriathlonData(values)
    : buildRaceData(values, definition)
  const searchableNumbers = isTriathlonDefinition
    ? [
        values.swimDistanceValue,
        values.bikeDistanceValue,
        values.bikeElevationGainMeters,
        values.runDistanceValue,
        values.runElevationGainMeters,
      ]
    : [values.distanceValue, values.elevationGainMeters]

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
    data,
    ...(!isTriathlonDefinition && values.track
      ? { track: values.track }
      : {}),
    ...(notes ? { notes } : {}),
    tags: [definition.categoryKey, definition.sportKey, 'race'],
    searchKeywords: [
      values.title,
      definition.categoryLabel,
      definition.sportLabel,
      String(values.year),
      ...searchableNumbers.map((value) => String(value ?? '')),
    ]
      .join(' ')
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
}

function buildRaceData(
  values: PerformanceWizardValues,
  definition: ActivityDefinition,
): RaceData {
  const distanceMeters = toDistanceMeters(
    values.distanceValue,
    values.distanceUnit,
  )
  const elevationGainMeters = positiveValue(values.elevationGainMeters)
  const durationSeconds =
    values.resultStatus === 'ranked'
      ? durationFromParts(
          values.durationHours,
          values.durationMinutes,
          values.durationSeconds,
        )
      : undefined
  const statusComment = clean(values.statusComment)

  return {
    ...(distanceMeters ? { distanceMeters } : {}),
    ...(definitionHasField(definition, 'elevationGainMeters') &&
    elevationGainMeters
      ? { elevationGainMeters }
      : {}),
    ...(durationSeconds ? { durationSeconds } : {}),
    resultStatus: values.resultStatus,
    rankings: buildRankings(values),
    ...(values.resultStatus !== 'ranked' && statusComment
      ? { statusComment }
      : {}),
  }
}

function buildTriathlonData(
  values: PerformanceWizardValues,
): TriathlonData {
  const keepsTime = values.resultStatus === 'ranked'
  const swimming = buildTriathlonDiscipline({
    distanceValue: values.swimDistanceValue,
    distanceUnit: values.swimDistanceUnit,
    durationSeconds: keepsTime
      ? durationFromParts(
          values.swimDurationHours,
          values.swimDurationMinutes,
          values.swimDurationSeconds,
        )
      : undefined,
    track: values.swimTrack,
  })
  const cycling = buildTriathlonDiscipline({
    distanceValue: values.bikeDistanceValue,
    distanceUnit: values.bikeDistanceUnit,
    elevationGainMeters: values.bikeElevationGainMeters,
    durationSeconds: keepsTime
      ? durationFromParts(
          values.bikeDurationHours,
          values.bikeDurationMinutes,
          values.bikeDurationSeconds,
        )
      : undefined,
    track: values.bikeTrack,
  })
  const running = buildTriathlonDiscipline({
    distanceValue: values.runDistanceValue,
    distanceUnit: values.runDistanceUnit,
    elevationGainMeters: values.runElevationGainMeters,
    durationSeconds: keepsTime
      ? durationFromParts(
          values.runDurationHours,
          values.runDurationMinutes,
          values.runDurationSeconds,
        )
      : undefined,
    track: values.runTrack,
  })
  const t1DurationSeconds = keepsTime
    ? durationFromParts(
        values.transition1Hours,
        values.transition1Minutes,
        values.transition1Seconds,
      )
    : undefined
  const t2DurationSeconds = keepsTime
    ? durationFromParts(
        values.transition2Hours,
        values.transition2Minutes,
        values.transition2Seconds,
      )
    : undefined
  const totalDurationSeconds = [
    swimming.durationSeconds,
    t1DurationSeconds,
    cycling.durationSeconds,
    t2DurationSeconds,
    running.durationSeconds,
  ].reduce<number>((total, duration) => total + (duration ?? 0), 0)
  const statusComment = clean(values.statusComment)

  return {
    disciplines: {
      swimming,
      cycling,
      running,
    },
    transitions: {
      ...(t1DurationSeconds ? { t1DurationSeconds } : {}),
      ...(t2DurationSeconds ? { t2DurationSeconds } : {}),
    },
    ...(totalDurationSeconds > 0 ? { totalDurationSeconds } : {}),
    resultStatus: values.resultStatus,
    rankings: buildRankings(values),
    ...(values.resultStatus !== 'ranked' && statusComment
      ? { statusComment }
      : {}),
  }
}

function buildTriathlonDiscipline({
  distanceValue,
  distanceUnit,
  elevationGainMeters,
  durationSeconds,
  track,
}: {
  distanceValue?: number
  distanceUnit: 'km' | 'm'
  elevationGainMeters?: number
  durationSeconds?: number
  track?: SimplifiedGpxTrack
}) {
  const distanceMeters = toDistanceMeters(distanceValue, distanceUnit)
  const elevation = positiveValue(elevationGainMeters)

  return {
    ...(distanceMeters ? { distanceMeters } : {}),
    ...(elevation ? { elevationGainMeters: elevation } : {}),
    ...(durationSeconds ? { durationSeconds } : {}),
    ...(track ? { track } : {}),
  }
}

function calculateTriathlonTotal(values: PerformanceWizardValues) {
  return [
    durationFromParts(
      values.swimDurationHours,
      values.swimDurationMinutes,
      values.swimDurationSeconds,
    ),
    durationFromParts(
      values.transition1Hours,
      values.transition1Minutes,
      values.transition1Seconds,
    ),
    durationFromParts(
      values.bikeDurationHours,
      values.bikeDurationMinutes,
      values.bikeDurationSeconds,
    ),
    durationFromParts(
      values.transition2Hours,
      values.transition2Minutes,
      values.transition2Seconds,
    ),
    durationFromParts(
      values.runDurationHours,
      values.runDurationMinutes,
      values.runDurationSeconds,
    ),
  ].reduce<number>((total, duration) => total + (duration ?? 0), 0)
}

function durationFromParts(
  hours?: number,
  minutes?: number,
  seconds?: number,
) {
  const duration =
    (hours ?? 0) * 3600 + (minutes ?? 0) * 60 + (seconds ?? 0)
  return duration > 0 ? duration : undefined
}

function toDurationParts(durationSeconds?: number) {
  return {
    hours:
      typeof durationSeconds === 'number'
        ? Math.floor(durationSeconds / 3600)
        : 0,
    minutes:
      typeof durationSeconds === 'number'
        ? Math.floor((durationSeconds % 3600) / 60)
        : 0,
    seconds:
      typeof durationSeconds === 'number' ? durationSeconds % 60 : 0,
  }
}

function toDistanceMeters(value: number | undefined, unit: 'km' | 'm') {
  if (typeof value !== 'number' || value <= 0) {
    return undefined
  }

  return Math.round(unit === 'km' ? value * 1000 : value)
}

function positiveValue(value?: number) {
  return typeof value === 'number' && value > 0 ? value : undefined
}

function formatDurationInput(durationSeconds: number) {
  const { hours, minutes, seconds } = toDurationParts(durationSeconds)
  return `${hours} H : ${String(minutes).padStart(2, '0')} M : ${String(seconds).padStart(2, '0')} S`
}

function buildRankings(
  values: PerformanceWizardValues,
): Partial<Record<'sex' | 'overall' | 'category', RankingResult>> {
  if (values.resultStatus !== 'ranked') {
    return {}
  }

  const sex = buildRanking(values.sexRank, values.sexParticipants)
  const overall = buildRanking(
    values.overallRank,
    values.overallParticipants,
  )
  const category = buildRanking(
    values.categoryRank,
    values.categoryParticipants,
  )

  return {
    ...(hasRankingValues(sex) ? { sex } : {}),
    ...(values.includeOverallRanking && hasRankingValues(overall)
      ? { overall }
      : {}),
    ...(values.includeCategoryRanking && hasRankingValues(category)
      ? { category }
      : {}),
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

function hasRankingValues(ranking: RankingResult) {
  return (
    typeof ranking.rank === 'number' ||
    typeof ranking.participantCount === 'number'
  )
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
