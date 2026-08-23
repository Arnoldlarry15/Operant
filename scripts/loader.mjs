import { pathToFileURL, fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'

export async function resolve(specifier, context, nextResolve) {
  let target = specifier

  if (target.startsWith('@/')) {
    const relPath = target.slice(2)
    target = pathToFileURL(process.cwd() + '/' + relPath).href
  } else if (target.startsWith('next/')) {
    target = pathToFileURL(process.cwd() + '/node_modules/' + target).href
  }

  try {
    return await nextResolve(target, context)
  } catch (err) {
    if (err.code === 'ERR_MODULE_NOT_FOUND' || err.code === 'ERR_UNSUPPORTED_DIR_IMPORT') {
      let baseUrl = context.parentURL ? new URL('.', context.parentURL).href : pathToFileURL(process.cwd() + '/').href
      let resolvedUrl
      try {
        resolvedUrl = new URL(target, baseUrl).href
      } catch {
        resolvedUrl = target
      }

      const filePath = resolvedUrl.startsWith('file://') ? fileURLToPath(resolvedUrl) : resolvedUrl
      for (const ext of ['.js', '.ts', '.tsx', '.mjs', '/index.js', '/index.ts']) {
        const candidate = filePath + ext
        if (existsSync(candidate)) {
          return await nextResolve(pathToFileURL(candidate).href, context)
        }
      }
    }
    throw err
  }
}
