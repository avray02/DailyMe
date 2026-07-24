import { Route, Trash2 } from 'lucide-react'
import type {
  SimplifiedGpxTrack,
  TrackPoint,
} from '../../types/performance'

type GpxTrackPreviewProps = {
  track: SimplifiedGpxTrack
  onRemove?: () => void
  compact?: boolean
}

export function GpxTrackPreview({
  track,
  onRemove,
  compact = false,
}: GpxTrackPreviewProps) {
  return (
    <div className={compact ? 'gpx-preview is-compact' : 'gpx-preview'}>
      {!compact ? (
        <header>
          <span>
            <Route size={17} aria-hidden="true" />
            <strong>{track.fileName}</strong>
            <small>{track.originalPointCount} points source</small>
          </span>
          {onRemove ? (
            <button
              className="icon-button"
              type="button"
              title="Retirer le GPX"
              aria-label="Retirer le GPX"
              onClick={onRemove}
            >
              <Trash2 size={16} aria-hidden="true" />
            </button>
          ) : null}
        </header>
      ) : null}

      <div className="gpx-visuals">
        <TrackSketch points={track.points} />
        <ElevationProfile track={track} />
      </div>
    </div>
  )
}

function TrackSketch({ points }: { points: TrackPoint[] }) {
  const normalized = normalizeTrack(points)
  const path = normalized
    .map(
      (point, index) =>
        `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`,
    )
    .join(' ')
  const start = normalized[0]
  const finish = normalized.at(-1) ?? start

  return (
    <figure className="track-sketch">
      <svg
        viewBox="0 0 100 64"
        role="img"
        aria-label="Schema du trace GPX, du depart a l'arrivee"
      >
        <path className="track-sketch-halo" d={path} />
        <path className="track-sketch-line" d={path} />
        <circle
          className="track-marker track-marker-start"
          cx={start.x}
          cy={start.y}
          r="1.8"
        />
        <circle
          className="track-marker track-marker-finish"
          cx={finish.x}
          cy={finish.y}
          r="1.8"
        />
      </svg>
      <figcaption>
        <span>
          <i className="track-legend-dot is-start" aria-hidden="true" />
          Depart
        </span>
        <span>
          <i className="track-legend-dot is-finish" aria-hidden="true" />
          Arrivee
        </span>
      </figcaption>
    </figure>
  )
}

function normalizeTrack(points: TrackPoint[]) {
  const averageLatitude =
    points.reduce((total, point) => total + point.latitude, 0) / points.length
  const longitudeCorrection = Math.max(
    Math.cos((averageLatitude * Math.PI) / 180),
    0.1,
  )
  const projected = points.map((point) => ({
    x: point.longitude * longitudeCorrection,
    y: point.latitude,
  }))
  const minimumX = Math.min(...projected.map((point) => point.x))
  const maximumX = Math.max(...projected.map((point) => point.x))
  const minimumY = Math.min(...projected.map((point) => point.y))
  const maximumY = Math.max(...projected.map((point) => point.y))
  const width = Math.max(maximumX - minimumX, 0.000001)
  const height = Math.max(maximumY - minimumY, 0.000001)
  const scale = Math.min(84 / width, 48 / height)
  const centerX = (minimumX + maximumX) / 2
  const centerY = (minimumY + maximumY) / 2

  return projected.map((point) => ({
    x: 50 + (point.x - centerX) * scale,
    y: 32 - (point.y - centerY) * scale,
  }))
}

function ElevationProfile({ track }: { track: SimplifiedGpxTrack }) {
  const elevations = track.points
    .map((point) => point.elevationMeters)
    .filter((value): value is number => typeof value === 'number')

  if (elevations.length < 2) {
    return (
      <div className="elevation-profile is-empty">
        Profil d'altitude indisponible
      </div>
    )
  }

  const minimum = Math.min(...elevations)
  const maximum = Math.max(...elevations)
  const range = Math.max(maximum - minimum, 1)
  const path = elevations
    .map((elevation, index) => {
      const x = (index / (elevations.length - 1)) * 100
      const y = 30 - ((elevation - minimum) / range) * 24
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')

  return (
    <figure className="elevation-profile">
      <figcaption>
        <strong>Profil d'altitude</strong>
        <span>
          {Math.round(minimum)} m - {Math.round(maximum)} m
        </span>
      </figcaption>
      <svg
        viewBox="0 0 100 36"
        preserveAspectRatio="none"
        role="img"
        aria-label={`Altitude de ${Math.round(minimum)} a ${Math.round(maximum)} metres`}
      >
        <line className="elevation-baseline" x1="0" y1="30" x2="100" y2="30" />
        <path d={path} />
      </svg>
    </figure>
  )
}
