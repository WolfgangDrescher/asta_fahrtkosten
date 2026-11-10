import type { H3Event } from 'h3'
import { create, CappedMap } from 'altcha-lib/frameworks/h3'
import { deriveKey } from 'altcha-lib/algorithms/pbkdf2'

const CHALLENGE_TTL_MS = 10 * 60 * 1000

// Remembers solved challenges so that a payload is only accepted once
const store = new CappedMap<string, boolean>({ maxSize: 10000 })

let altcha: ReturnType<typeof create> | undefined

export const useAltcha = (event: H3Event) => {
  const { altchaHmacKey } = useRuntimeConfig(event)

  if (!altchaHmacKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'NUXT_ALTCHA_HMAC_KEY is not set.'
    })
  }

  altcha ??= create({
    deriveKey,
    hmacSignatureSecret: altchaHmacKey,
    store,
    createChallengeParameters: () => ({
      algorithm: 'PBKDF2/SHA-256',
      cost: 5000,
      expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS)
    })
  })

  return altcha
}

export const verifyAltcha = async (payload: string, event: H3Event) => {
  if (import.meta.dev) return true

  const { altchaHmacKey } = useRuntimeConfig(event)
  const { error } = await useAltcha(event).verify(payload, deriveKey, altchaHmacKey, undefined, store)

  return !error
}
