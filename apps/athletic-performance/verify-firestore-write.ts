import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

type FirestoreValue =
  | { stringValue: string }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { arrayValue: { values: FirestoreValue[] } }
  | { mapValue: { fields: Record<string, FirestoreValue> } }

function encode(value: unknown): FirestoreValue {
  if (typeof value === 'string') return { stringValue: value }
  if (typeof value === 'boolean') return { booleanValue: value }
  if (typeof value === 'number') return { integerValue: String(value) }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(encode) } }
  }
  if (value && typeof value === 'object') {
    return { mapValue: { fields: encodeFields(value) } }
  }
  throw new Error(`Unsupported value: ${String(value)}`)
}

function encodeFields(value: object) {
  return Object.fromEntries(
    Object.entries(value).map(([key, fieldValue]) => [key, encode(fieldValue)]),
  )
}

async function request(
  url: string,
  authorization: string,
  method = 'GET',
  body?: unknown,
) {
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${authorization}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  if (!response.ok) {
    throw new Error(`${method} ${url}: ${response.status} ${await response.text()}`)
  }
  return response.status === 204 ? null : response.json()
}

const configPath = join(
  homedir(),
  '.config',
  'configstore',
  'firebase-tools.json',
)
const cliConfig = JSON.parse(await readFile(configPath, 'utf8'))
const adminToken = cliConfig.tokens?.access_token
if (!adminToken) throw new Error('Firebase CLI access token is unavailable')

const apps = await request(
  'https://firebase.googleapis.com/v1beta1/projects/webappalex/webApps',
  adminToken,
)
const webAppName = apps.apps?.[0]?.name
if (!webAppName) throw new Error('Firebase web app is unavailable')
const webConfig = await request(
  `https://firebase.googleapis.com/v1beta1/${webAppName}/config`,
  adminToken,
)
const apiKey = webConfig.apiKey
if (!apiKey) throw new Error('Firebase web API key is unavailable')

const suffix = crypto.randomUUID()
const email = `codex-${suffix}@example.com`
const password = `Codex-${suffix}-Aa1!`
const authBase = 'https://identitytoolkit.googleapis.com/v1/accounts'
let uid = ''
let idToken = ''
let performanceUrl = ''
let simplePerformanceUrl = ''
let userUrl = ''

try {
  const signUpResponse = await fetch(`${authBase}:signUp?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  })
  if (!signUpResponse.ok) {
    throw new Error(`Sign-up failed: ${await signUpResponse.text()}`)
  }
  const signUp = await signUpResponse.json()
  uid = signUp.localId
  idToken = signUp.idToken

  const firestoreBase =
    'https://firestore.googleapis.com/v1/projects/webappalex/databases/(default)/documents'
  userUrl = `${firestoreBase}/users/${uid}`
  const performanceId = `codex-triathlon-${suffix}`
  performanceUrl =
    `${firestoreBase}/apps/athletic-performance/performances/${performanceId}`
  simplePerformanceUrl =
    `${firestoreBase}/apps/athletic-performance/performances/simple-${performanceId}`

  await request(userUrl, adminToken, 'PATCH', {
    fields: encodeFields({
      email,
      displayName: 'Codex integration test',
      allowedApps: ['athletic-performance'],
      createdAt: new Date().toISOString(),
    }),
  })
  await request(userUrl, idToken)
  await request(
    `${firestoreBase}/apps/athletic-performance/activityDefinitions/triathlon__race`,
    idToken,
  )

  await request(simplePerformanceUrl, idToken, 'PATCH', {
    fields: encodeFields({
      id: `simple-${performanceId}`,
      ownerUid: uid,
      activityDefinitionId: 'road-running__race',
      schemaVersion: 1,
      categoryKey: 'running',
      sportKey: 'road-running',
      activityTypeKey: 'race',
      title: 'Simple integration test',
      status: 'completed',
      date: { year: 2026, month: 7, day: 25 },
      data: { resultStatus: 'ranked', rankings: {} },
      tags: ['running', 'road-running', 'race'],
      searchKeywords: ['simple', 'integration', 'test'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
  })

  const basePerformance = {
    id: performanceId,
    ownerUid: uid,
    activityDefinitionId: 'triathlon__race',
    schemaVersion: 1,
    categoryKey: 'multisport',
    sportKey: 'triathlon',
    activityTypeKey: 'race',
    title: 'Triathlon integration test',
    status: 'completed',
    date: { year: 2026, month: 7, day: 25 },
    tags: ['multisport', 'triathlon', 'race'],
    searchKeywords: ['triathlon', 'integration', 'test'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  await request(performanceUrl, idToken, 'PATCH', {
    fields: encodeFields({
      ...basePerformance,
      data: {
        disciplines: {
          swimming: {},
          cycling: {},
          running: {},
        },
        transitions: {},
        resultStatus: 'dns',
        rankings: {},
      },
    }),
  })
  await request(performanceUrl, idToken, 'PATCH', {
    fields: encodeFields({
      ...basePerformance,
      data: {
        disciplines: {
          swimming: {},
          cycling: {},
          running: {},
        },
        transitions: {},
        resultStatus: 'ranked',
        rankings: {},
      },
    }),
  })
  await request(performanceUrl, idToken, 'PATCH', {
    fields: encodeFields({
      ...basePerformance,
      data: {
        disciplines: {
          swimming: { durationSeconds: 1800 },
          cycling: {},
          running: {},
        },
        transitions: {},
        totalDurationSeconds: 1800,
        resultStatus: 'ranked',
        rankings: {},
      },
    }),
  })

  const rankedPerformance = {
    ...basePerformance,
    data: {
      disciplines: {
        swimming: { distanceMeters: 1500, durationSeconds: 1800 },
        cycling: {
          distanceMeters: 40000,
          elevationGainMeters: 500,
          durationSeconds: 4800,
        },
        running: { distanceMeters: 10000, durationSeconds: 3000 },
      },
      transitions: {
        t1DurationSeconds: 300,
        t2DurationSeconds: 240,
      },
      totalDurationSeconds: 10140,
      resultStatus: 'ranked',
      rankings: {
        sex: { rank: 2, participantCount: 100 },
        overall: { rank: 5, participantCount: 100 },
      },
    },
  }
  await request(performanceUrl, idToken, 'PATCH', {
    fields: encodeFields({
      ...rankedPerformance,
      data: { ...rankedPerformance.data, rankings: {} },
    }),
  })
  await request(performanceUrl, idToken, 'PATCH', {
    fields: encodeFields({
      ...rankedPerformance,
      data: {
        ...rankedPerformance.data,
        rankings: { sex: { rank: 2 } },
      },
    }),
  })
  await request(performanceUrl, idToken, 'PATCH', {
    fields: encodeFields({
      ...rankedPerformance,
      data: {
        ...rankedPerformance.data,
        rankings: { sex: { rank: 2, participantCount: 100 } },
      },
    }),
  })
  await request(performanceUrl, idToken, 'PATCH', {
    fields: encodeFields(rankedPerformance),
  })

  const dnsPerformance = {
    ...basePerformance,
    updatedAt: new Date().toISOString(),
    data: {
      disciplines: {
        swimming: { distanceMeters: 1500 },
        cycling: { distanceMeters: 40000, elevationGainMeters: 500 },
        running: { distanceMeters: 10000 },
      },
      transitions: {},
      resultStatus: 'dns',
      rankings: {},
    },
  }
  await request(performanceUrl, idToken, 'PATCH', {
    fields: encodeFields(dnsPerformance),
  })

  const stored = await request(performanceUrl, idToken)
  const storedData = stored.fields.data.mapValue.fields
  const hasRemovedFields =
    !storedData.totalDurationSeconds &&
    !storedData.disciplines.mapValue.fields.swimming.mapValue.fields
      .durationSeconds &&
    !storedData.rankings.mapValue.fields.overall

  if (!hasRemovedFields) {
    throw new Error('The full replacement retained obsolete nested fields')
  }

  console.log('FIRESTORE_CREATE_AND_REPLACE_VERIFIED')
} finally {
  if (performanceUrl) {
    await fetch(performanceUrl, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    })
  }
  if (simplePerformanceUrl) {
    await fetch(simplePerformanceUrl, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    })
  }
  if (userUrl) {
    await fetch(userUrl, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    })
  }
  if (idToken && apiKey) {
    await fetch(`${authBase}:delete?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    })
  }
}
