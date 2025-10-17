import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')

function readEnvFile(filePath) {
  try {
    const raw = readFileSync(filePath, 'utf8')
    return raw
      .split(/\r?\n/)
      .filter(Boolean)
      .reduce((acc, line) => {
        const [key, ...rest] = line.split('=')
        if (!key) return acc
        acc[key.trim()] = rest.join('=').trim()
        return acc
      }, {})
  } catch (error) {
    return {}
  }
}

function writeEnvFile(filePath, values) {
  const content = Object.entries(values)
    .map(([key, value]) => `${key}=${value ?? ''}`)
    .join('\n')
  writeFileSync(filePath, `${content}\n`)
}

const commitSha = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_COMMIT_SHA || ''
const commitMessage = process.env.VERCEL_GIT_COMMIT_MESSAGE || process.env.GIT_COMMIT_MESSAGE || ''
const environment = process.env.VERCEL_ENV || process.env.NODE_ENV || 'development'
const deployUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : process.env.DEPLOY_URL || ''
const deployedAt = new Date().toISOString()
const shortSha = commitSha ? commitSha.slice(0, 7) : ''

const versionPayload = {
  commitSha: commitSha || undefined,
  shortSha: shortSha || undefined,
  commitMessage: commitMessage || undefined,
  environment,
  deployUrl: deployUrl || undefined,
  deployedAt,
}

const filteredPayload = Object.fromEntries(
  Object.entries(versionPayload).filter(([, value]) => value !== undefined),
)

mkdirSync(path.join(projectRoot, 'public'), { recursive: true })
writeFileSync(
  path.join(projectRoot, 'public', 'version.json'),
  `${JSON.stringify(filteredPayload, null, 2)}\n`,
)

const envLocalPath = path.join(projectRoot, '.env.local')
const existingEnv = readEnvFile(envLocalPath)
const nextEnv = {
  ...existingEnv,
  VITE_APP_COMMIT_SHA: commitSha,
  VITE_APP_COMMIT_MESSAGE: commitMessage,
  VITE_APP_ENVIRONMENT: environment,
  VITE_APP_DEPLOY_URL: deployUrl,
  VITE_APP_DEPLOYED_AT: deployedAt,
  VITE_APP_SHORT_SHA: shortSha,
}

writeEnvFile(envLocalPath, nextEnv)

console.info('[version] Wrote version.json and updated .env.local with build metadata')
