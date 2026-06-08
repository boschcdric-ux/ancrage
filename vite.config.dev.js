import { mkdirSync, existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { defineConfig, mergeConfig } from 'vite'
import base from './vite.config.js'

/** Répertoire sans fichiers .env (Vite ne lit pas le .env à la racine). */
const isolatedEnvDir = join(tmpdir(), 'adhd-app-vite-dev-env')
if (!existsSync(isolatedEnvDir)) {
  mkdirSync(isolatedEnvDir, { recursive: true })
}

function parseEnvDevFile() {
  const p = join(process.cwd(), '.env.dev')
  if (!existsSync(p)) return {}
  const out = {}
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq === -1) continue
    const key = t.slice(0, eq).trim()
    let val = t.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    out[key] = val
  }
  return out
}

export default defineConfig(() => {
  const parsed = parseEnvDevFile()
  /** @type {Record<string, string>} */
  const define = {}
  for (const [k, v] of Object.entries(parsed)) {
    if (k.startsWith('VITE_')) {
      define[`import.meta.env.${k}`] = JSON.stringify(v)
    }
  }
  return mergeConfig(base, {
    envDir: isolatedEnvDir,
    define
  })
})
