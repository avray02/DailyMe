import { useAuth } from '@dailyme/auth'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { PerformanceForm } from '../features/performance-form/PerformanceForm'
import { getPerformance } from '../features/performances/performanceRepository'

export function PerformanceFormPage() {
  const { user } = useAuth()
  const { performanceId } = useParams()
  const ownerUid = user?.uid ?? 'local-demo-user'
  const performanceQuery = useQuery({
    queryKey: ['performance', ownerUid, performanceId],
    queryFn: () => getPerformance(ownerUid, performanceId ?? ''),
    enabled: Boolean(performanceId),
  })
  if (!performanceId) {
    return <PerformanceForm />
  }

  if (performanceQuery.isLoading) {
    return <p className="state-message">Chargement de la performance...</p>
  }

  if (performanceQuery.isError) {
    return (
      <section className="state-message">
        <h1>Chargement impossible</h1>
        <p>La performance n'a pas pu etre recuperee.</p>
        <Link className="secondary-button" to="/">
          <ArrowLeft size={17} aria-hidden="true" />
          Retour
        </Link>
      </section>
    )
  }

  if (!performanceQuery.data) {
    return (
      <section className="state-message">
        <h1>Performance introuvable</h1>
        <p>Elle a peut-etre ete supprimee ou n'appartient pas a ce compte.</p>
        <Link className="secondary-button" to="/">
          <ArrowLeft size={17} aria-hidden="true" />
          Retour
        </Link>
      </section>
    )
  }

  return <PerformanceForm performance={performanceQuery.data} />
}
