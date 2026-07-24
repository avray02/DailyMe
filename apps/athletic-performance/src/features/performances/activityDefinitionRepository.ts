import { db, firebaseMode } from '@dailyme/auth'
import { collection, doc, getDocs, setDoc } from 'firebase/firestore'
import type { ActivityDefinition } from '../../types/performance'
import { activityDefinitions } from './performanceCatalog'

const appDocumentPath = ['apps', 'athletic-performance'] as const

export async function listActivityDefinitions(canManage: boolean) {
  if (firebaseMode !== 'firebase' || !db) {
    return activityDefinitions
  }

  const definitionsCollection = collection(
    db,
    ...appDocumentPath,
    'activityDefinitions',
  )

  try {
    if (canManage) {
      await setDoc(
        doc(db, ...appDocumentPath),
        {
          id: 'athletic-performance',
          label: 'Athletic Performance',
          schemaVersion: 1,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      )
      await Promise.all(
        activityDefinitions.map((definition) =>
          setDoc(doc(definitionsCollection, definition.id), definition),
        ),
      )
      return activityDefinitions
    }

    const snapshot = await getDocs(definitionsCollection)
    const definitions = snapshot.docs
      .map((definitionDocument) => {
        const supportedDefinition = activityDefinitions.find(
          (definition) => definition.id === definitionDocument.id,
        )

        return supportedDefinition
          ? ({
              ...supportedDefinition,
              ...definitionDocument.data(),
              id: definitionDocument.id,
            } as ActivityDefinition)
          : null
      })
      .filter(
        (definition): definition is ActivityDefinition =>
          Boolean(definition?.active),
      )

    return definitions.length ? definitions : activityDefinitions
  } catch (error) {
    console.warn('Activity definitions could not be loaded from Firestore', error)
    return activityDefinitions
  }
}
