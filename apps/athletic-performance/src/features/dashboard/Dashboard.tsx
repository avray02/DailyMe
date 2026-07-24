import { useAuth } from '@dailyme/auth'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity,
  AlertTriangle,
  Award,
  CalendarDays,
  ChevronRight,
  CirclePlus,
  Filter,
  Gauge,
  Medal,
  Mountain,
  Pencil,
  Route,
  Search,
  Timer,
  Trash2,
  Trophy,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Link, useLocation } from 'react-router-dom'
import type {
  Metric,
  Performance,
  SimplifiedGpxTrack,
  SportCategoryKey,
  SportKey,
} from '../../types/performance'
import { GpxTrackPreview } from '../performance-form/GpxTrackPreview'
import {
  categoryByKey,
  isTriathlonData,
  sportByKey,
  sportCategories,
  sportOptions,
} from '../performances/performanceCatalog'
import {
  deletePerformance,
  listPerformances,
} from '../performances/performanceRepository'
import {
  getMedalLabel,
  getPerformanceMetrics,
  getStatusComment,
  hasRanking,
} from '../performances/performanceMetrics'

type DashboardNotice = {
  notice?: string
}

const metricIcons: Record<Metric['key'], LucideIcon> = {
  distance: Route,
  duration: Timer,
  elevation: Mountain,
  rank: Award,
  pace: Gauge,
  speed: Gauge,
  custom: Activity,
}

export function Dashboard() {
  const { user } = useAuth()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<SportCategoryKey | 'all'>('all')
  const [sport, setSport] = useState<SportKey | 'all'>('all')
  const [selected, setSelected] = useState<Performance | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Performance | null>(null)
  const [notice, setNotice] = useState(
    (location.state as DashboardNotice | null)?.notice ?? '',
  )
  const ownerUid = user?.uid ?? 'local-demo-user'
  const performancesQuery = useQuery({
    queryKey: ['performances', ownerUid],
    queryFn: () => listPerformances(ownerUid),
  })
  const performances = useMemo(
    () => performancesQuery.data ?? [],
    [performancesQuery.data],
  )
  const availableCategories = useMemo(
    () =>
      sportCategories.filter((option) =>
        performances.some(
          (performance) => performance.categoryKey === option.key,
        ),
      ),
    [performances],
  )
  const availableSports = useMemo(
    () =>
      sportOptions.filter(
        (option) =>
          (category === 'all' || option.categoryKey === category) &&
          performances.some(
            (performance) => performance.sportKey === option.key,
          ),
      ),
    [category, performances],
  )
  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    return performances.filter((performance) => {
      const metrics = getPerformanceMetrics(performance)
      const searchText = [
        performance.title,
        ...performance.searchKeywords,
        ...metrics.flatMap((metric) => [metric.label, metric.value]),
      ]
        .join(' ')
        .toLowerCase()

      return (
        (!normalizedSearch || searchText.includes(normalizedSearch)) &&
        (category === 'all' || performance.categoryKey === category) &&
        (sport === 'all' || performance.sportKey === sport)
      )
    })
  }, [category, performances, search, sport])
  const yearGroups = useMemo(
    () =>
      filtered.reduce<Record<string, Performance[]>>((groups, performance) => {
        const year = String(performance.date.year)
        groups[year] = groups[year] ?? []
        groups[year].push(performance)
        return groups
      }, {}),
    [filtered],
  )
  const sortedYears = Object.keys(yearGroups).sort(
    (left, right) => Number(right) - Number(left),
  )
  const currentYear = new Date().getFullYear()
  const currentYearCount = performances.filter(
    (performance) => performance.date.year === currentYear,
  ).length
  const rankedCount = performances.filter(hasRanking).length
  const deleteMutation = useMutation({
    mutationFn: deletePerformance,
    onSuccess: async (_, performanceId) => {
      if (selected?.id === performanceId) {
        setSelected(null)
      }
      setDeleteTarget(null)
      setNotice('Performance supprimee.')
      queryClient.removeQueries({
        queryKey: ['performance', ownerUid, performanceId],
      })
      await queryClient.invalidateQueries({
        queryKey: ['performances', ownerUid],
      })
    },
  })

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      if (deleteTarget) {
        setDeleteTarget(null)
      } else {
        setSelected(null)
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [deleteTarget])

  function chooseCategory(nextCategory: SportCategoryKey | 'all') {
    setCategory(nextCategory)
    if (
      sport !== 'all' &&
      nextCategory !== 'all' &&
      sportByKey[sport].categoryKey !== nextCategory
    ) {
      setSport('all')
    }
  }

  return (
    <>
      <section className="dashboard-header" aria-labelledby="dashboard-title">
        <div className="page-heading">
          <p className="eyebrow">Journal de competitions</p>
          <h1 id="dashboard-title">Mes performances</h1>
          <p>
            Retrouve chaque course, ses resultats et son parcours au fil des
            saisons.
          </p>
        </div>
        <Link className="primary-button" to="/new">
          <CirclePlus size={18} aria-hidden="true" />
          Ajouter une performance
        </Link>
      </section>

      <section className="summary-strip" aria-label="Resume">
        <SummaryItem label="Total" value={performances.length} />
        <SummaryItem label={String(currentYear)} value={currentYearCount} />
        <SummaryItem
          label="Sports"
          value={new Set(performances.map((item) => item.sportKey)).size}
        />
        <SummaryItem label="Classements" value={rankedCount} />
      </section>

      {notice ? (
        <div className="notice-banner" role="status">
          <span>{notice}</span>
          <button
            className="subtle-icon-button"
            type="button"
            title="Fermer"
            aria-label="Fermer la notification"
            onClick={() => setNotice('')}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      ) : null}

      <section className="control-panel" aria-label="Filtres performances">
        <label className="search-box">
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            placeholder="Rechercher une course, un sport, une annee..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>

        <div className="filter-group">
          <span className="filter-label">
            <Filter size={16} aria-hidden="true" />
            Categorie
          </span>
          <div className="filter-row" role="group" aria-label="Categorie">
            <FilterButton
              active={category === 'all'}
              onClick={() => chooseCategory('all')}
            >
              Toutes
            </FilterButton>
            {availableCategories.map((option) => (
              <FilterButton
                key={option.key}
                active={category === option.key}
                onClick={() => chooseCategory(option.key)}
              >
                {option.label}
              </FilterButton>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <span className="filter-label">Sport</span>
          <div className="filter-row" role="group" aria-label="Sport">
            <FilterButton
              active={sport === 'all'}
              onClick={() => setSport('all')}
            >
              Tous
            </FilterButton>
            {availableSports.map((option) => (
              <FilterButton
                key={option.key}
                active={sport === option.key}
                onClick={() => setSport(option.key)}
              >
                {option.label}
              </FilterButton>
            ))}
          </div>
        </div>
      </section>

      {performancesQuery.isLoading ? (
        <p className="state-message">Chargement des performances...</p>
      ) : null}

      {performancesQuery.isError ? (
        <section className="state-message">
          <h2>Chargement impossible</h2>
          <p>Verifie la connexion Firebase puis reessaie.</p>
        </section>
      ) : null}

      {!performancesQuery.isLoading &&
      !performancesQuery.isError &&
      sortedYears.length === 0 ? (
        <EmptyState hasPerformances={performances.length > 0} />
      ) : null}

      <section className="timeline" aria-label="Timeline des performances">
        {sortedYears.map((year) => (
          <section
            className="year-group"
            key={year}
            aria-labelledby={`year-${year}`}
          >
            <header className="year-marker">
              <h2 id={`year-${year}`}>{year}</h2>
              <span>
                {yearGroups[year].length} course
                {yearGroups[year].length > 1 ? 's' : ''}
              </span>
            </header>
            <div className="performance-grid">
              {yearGroups[year].map((performance, index) => (
                <PerformanceCard
                  key={performance.id}
                  performance={performance}
                  index={index}
                  onSelect={() => setSelected(performance)}
                  onDelete={() => setDeleteTarget(performance)}
                />
              ))}
            </div>
          </section>
        ))}
      </section>

      <AnimatePresence>
        {selected ? (
          <PerformanceDrawer
            performance={selected}
            onClose={() => setSelected(null)}
            onDelete={() => setDeleteTarget(selected)}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {deleteTarget ? (
          <DeleteDialog
            performance={deleteTarget}
            isDeleting={deleteMutation.isPending}
            hasError={deleteMutation.isError}
            onCancel={() => {
              deleteMutation.reset()
              setDeleteTarget(null)
            }}
            onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
          />
        ) : null}
      </AnimatePresence>
    </>
  )
}

function SummaryItem({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

function FilterButton({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: string
  onClick: () => void
}) {
  return (
    <button
      className={active ? 'filter-button is-active' : 'filter-button'}
      type="button"
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function PerformanceCard({
  performance,
  index,
  onSelect,
  onDelete,
}: {
  performance: Performance
  index: number
  onSelect: () => void
  onDelete: () => void
}) {
  const sport = sportByKey[performance.sportKey]
  const category = categoryByKey[performance.categoryKey]
  const SportIcon = sport.icon
  const visibleMetrics = getPerformanceMetrics(performance).slice(0, 4)
  const performanceTracks = getPerformanceTracks(performance)
  const primaryTrack = performanceTracks[0]?.track
  const style = {
    '--sport-accent': category.accent,
    '--sport-soft': category.softAccent,
  } as CSSProperties

  return (
    <motion.article
      className={`performance-card category-${performance.categoryKey}`}
      style={style}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-32px' }}
      transition={{ delay: Math.min(index * 0.03, 0.18), duration: 0.28 }}
    >
      <header className="performance-card-header">
        <span className="sport-icon" aria-hidden="true">
          <SportIcon size={19} />
        </span>
        <div className="card-actions">
          <Link
            className="subtle-icon-button"
            to={`/edit/${performance.id}`}
            title="Modifier"
            aria-label={`Modifier ${performance.title}`}
          >
            <Pencil size={16} aria-hidden="true" />
          </Link>
          <button
            className="subtle-icon-button is-danger"
            type="button"
            title="Supprimer"
            aria-label={`Supprimer ${performance.title}`}
            onClick={onDelete}
          >
            <Trash2 size={16} aria-hidden="true" />
          </button>
        </div>
      </header>

      <button className="performance-card-main" type="button" onClick={onSelect}>
        <div
          className={
            primaryTrack ? 'card-summary has-track' : 'card-summary'
          }
        >
          <div className="card-summary-copy">
            <div className="card-meta">
              <span>
                <CalendarDays size={15} aria-hidden="true" />
                {formatDate(performance.date)}
              </span>
              <span className="activity-badge">Course</span>
            </div>
            <h3>{performance.title}</h3>
            <p className="sport-label">{sport.label}</p>
          </div>
          {primaryTrack ? (
            <GpxTrackPreview track={primaryTrack} compact />
          ) : null}
        </div>

        <div className="card-metrics">
          {visibleMetrics.map((metric, metricIndex) => (
            <MetricValue
              key={`${metric.key}-${metric.label}-${metricIndex}`}
              metric={metric}
            />
          ))}
        </div>

        <span className="details-link">
          Voir les details
          <ChevronRight size={16} aria-hidden="true" />
        </span>
      </button>
    </motion.article>
  )
}

function MetricValue({ metric }: { metric: Metric }) {
  const Icon = metricIcons[metric.key]
  return (
    <div className="metric-value">
      <Icon size={16} aria-hidden="true" />
      <span>
        <small>{metric.label}</small>
        <strong className="metric-result">
          {metric.value}
          {metric.medal ? (
            <span
              className={`medal-icon medal-${metric.medal}`}
              title={getMedalLabel(metric.medal)}
              aria-label={getMedalLabel(metric.medal)}
            >
              <Medal size={14} aria-hidden="true" />
            </span>
          ) : null}
        </strong>
      </span>
    </div>
  )
}

function PerformanceDrawer({
  performance,
  onClose,
  onDelete,
}: {
  performance: Performance
  onClose: () => void
  onDelete: () => void
}) {
  const sport = sportByKey[performance.sportKey]
  const category = categoryByKey[performance.categoryKey]
  const SportIcon = sport.icon
  const metrics = getPerformanceMetrics(performance)
  const statusComment = getStatusComment(performance)
  const performanceTracks = getPerformanceTracks(performance)
  const style = {
    '--sport-accent': category.accent,
    '--sport-soft': category.softAccent,
  } as CSSProperties

  return (
    <motion.aside
      className="detail-drawer"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <motion.div
        className={`drawer-panel category-${performance.categoryKey}`}
        style={style}
        initial={{ x: 32, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 32, opacity: 0 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        <header className="drawer-toolbar">
          <span className="sport-icon" aria-hidden="true">
            <SportIcon size={20} />
          </span>
          <div className="drawer-toolbar-actions">
            <Link
              className="subtle-icon-button"
              to={`/edit/${performance.id}`}
              title="Modifier"
              aria-label="Modifier la performance"
            >
              <Pencil size={16} aria-hidden="true" />
            </Link>
            <button
              className="subtle-icon-button is-danger"
              type="button"
              title="Supprimer"
              aria-label="Supprimer la performance"
              onClick={onDelete}
            >
              <Trash2 size={16} aria-hidden="true" />
            </button>
            <button
              className="subtle-icon-button"
              type="button"
              title="Fermer"
              aria-label="Fermer"
              onClick={onClose}
            >
              <X size={17} aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="drawer-title-block">
          <p className="eyebrow">{category.label}</p>
          <h2 id="drawer-title">{performance.title}</h2>
          <span>{sport.label}</span>
        </div>

        <div className="drawer-meta">
          <span>
            <CalendarDays size={15} aria-hidden="true" />
            {formatDate(performance.date)}
          </span>
          <span>Course</span>
        </div>

        <section className="drawer-section" aria-labelledby="metrics-title">
          <h3 id="metrics-title">Resultats</h3>
          <div className="drawer-metrics">
            {metrics.map((metric, index) => (
              <MetricValue
                key={`${metric.key}-${metric.label}-${index}`}
                metric={metric}
              />
            ))}
          </div>
        </section>

        {statusComment ? (
          <section
            className="drawer-section"
            aria-labelledby="status-comment-title"
          >
            <h3 id="status-comment-title">Commentaire de statut</h3>
            <p className="drawer-notes">{statusComment}</p>
          </section>
        ) : null}

        {performanceTracks.map(({ label, track }, index) => (
          <section
            className="drawer-section"
            aria-labelledby={`track-title-${index}`}
            key={label}
          >
            <h3 id={`track-title-${index}`}>{label}</h3>
            <GpxTrackPreview track={track} />
          </section>
        ))}

        {performance.notes ? (
          <section className="drawer-section" aria-labelledby="notes-title">
            <h3 id="notes-title">Notes</h3>
            <p className="drawer-notes">{performance.notes}</p>
          </section>
        ) : null}
      </motion.div>
    </motion.aside>
  )
}

function DeleteDialog({
  performance,
  isDeleting,
  hasError,
  onCancel,
  onConfirm,
}: {
  performance: Performance
  isDeleting: boolean
  hasError: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <motion.div
      className="dialog-layer"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
      >
        <span className="dialog-icon" aria-hidden="true">
          <AlertTriangle size={22} />
        </span>
        <div>
          <h2 id="delete-dialog-title">Supprimer cette performance ?</h2>
          <p>
            <strong>{performance.title}</strong> sera retiree definitivement de
            ton compte.
          </p>
        </div>
        {hasError ? (
          <p className="form-error" role="alert">
            La suppression a echoue. Reessaie dans quelques instants.
          </p>
        ) : null}
        <div className="dialog-actions">
          <button
            className="secondary-button"
            type="button"
            disabled={isDeleting}
            onClick={onCancel}
          >
            Annuler
          </button>
          <button
            className="danger-button"
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
          >
            <Trash2 size={17} aria-hidden="true" />
            {isDeleting ? 'Suppression...' : 'Supprimer'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function EmptyState({ hasPerformances }: { hasPerformances: boolean }) {
  return (
    <section className="empty-state">
      <Trophy size={28} aria-hidden="true" />
      <h2>
        {hasPerformances
          ? 'Aucune performance ne correspond aux filtres.'
          : 'Aucune performance enregistree.'}
      </h2>
      <p>
        {hasPerformances
          ? 'Modifie la recherche ou selectionne un autre filtre.'
          : 'Ajoute ta premiere course pour commencer ton historique.'}
      </p>
      {!hasPerformances ? (
        <Link className="primary-button" to="/new">
          <CirclePlus size={18} aria-hidden="true" />
          Ajouter une performance
        </Link>
      ) : null}
    </section>
  )
}

function getPerformanceTracks(performance: Performance) {
  const tracks: Array<{ label: string; track: SimplifiedGpxTrack }> = []

  if (isTriathlonData(performance.data)) {
    const disciplines = [
      ['Trace natation', performance.data.disciplines.swimming],
      ['Trace cyclisme', performance.data.disciplines.cycling],
      ['Trace course a pied', performance.data.disciplines.running],
    ] as const

    disciplines.forEach(([label, discipline]) => {
      if (discipline.track) {
        tracks.push({ label, track: discipline.track })
      }
    })
    return tracks
  }

  if (performance.track) {
    tracks.push({ label: 'Trace et profil', track: performance.track })
  }
  return tracks
}

function formatDate(date: Performance['date']) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date.year, date.month - 1, date.day))
}
