import { fileURLToPath, URL } from 'node:url'
import fs from 'node:fs'
import path from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'

import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

interface TicketRecord {
  id: string
  titre: string
  description: string
  demandeur: string
  priorite: string
  statut: string
  dateCreation: string
}

interface DbSchema {
  tickets: TicketRecord[]
  $schema?: string
}

function ticketsApiPlugin(): Plugin {
  const dbPath = path.resolve(process.cwd(), 'db.json')

  const readDb = (): DbSchema => {
    try {
      const raw = fs.readFileSync(dbPath, 'utf-8')
      const parsed = JSON.parse(raw) as DbSchema
      return {
        ...parsed,
        tickets: Array.isArray(parsed.tickets) ? parsed.tickets : [],
      }
    } catch {
      return { tickets: [] }
    }
  }

  const writeDb = (data: DbSchema) => {
    try {
      fs.writeFileSync(dbPath, JSON.stringify(data, null, 2) + '\n', 'utf-8')
    } catch {
      // Ignore write error if filesystem is read-only
    }
  }

  const readBody = (req: IncomingMessage): Promise<string> =>
    new Promise((resolve, reject) => {
      let body = ''
      req.on('data', (chunk: Buffer) => {
        body += chunk.toString()
      })
      req.on('end', () => resolve(body))
      req.on('error', reject)
    })

  const sendJson = (res: ServerResponse, statusCode: number, payload: unknown) => {
    res.statusCode = statusCode
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify(payload))
  }

  const createMiddleware = () => {
    return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
      const reqUrl = req.url ?? ''
      const pathname = reqUrl.split('?')[0] ?? ''

      if (!pathname.startsWith('/api/tickets')) {
        next()
        return
      }

      const method = (req.method ?? 'GET').toUpperCase()
      const idMatch = pathname.match(/^\/api\/tickets\/([^/]+)$/)
      const ticketId = idMatch ? decodeURIComponent(idMatch[1] ?? '') : null

      try {
        const db = readDb()

        if (method === 'GET' && !ticketId) {
          sendJson(res, 200, db.tickets)
          return
        }

        if (method === 'GET' && ticketId) {
          const found = db.tickets.find((t) => String(t.id) === ticketId)
          if (!found) {
            sendJson(res, 404, { error: 'Ticket introuvable' })
            return
          }
          sendJson(res, 200, found)
          return
        }

        if (method === 'POST' && !ticketId) {
          const rawBody = await readBody(req)
          const body = rawBody ? (JSON.parse(rawBody) as Partial<TicketRecord>) : {}
          const maxId = db.tickets.reduce((max, item) => {
            const num = Number.parseInt(String(item.id), 10)
            return Number.isFinite(num) && num > max ? num : max
          }, 0)
          const newTicket: TicketRecord = {
            id: body.id ? String(body.id) : String(maxId + 1),
            titre: body.titre ?? '',
            description: body.description ?? '',
            demandeur: body.demandeur ?? '',
            priorite: body.priorite ?? 'Moyenne',
            statut: body.statut ?? 'Ouvert',
            dateCreation: body.dateCreation ?? new Date().toISOString().slice(0, 10),
          }
          db.tickets.push(newTicket)
          writeDb(db)
          sendJson(res, 201, newTicket)
          return
        }

        if ((method === 'PUT' || method === 'PATCH') && ticketId) {
          const index = db.tickets.findIndex((t) => String(t.id) === ticketId)
          if (index === -1) {
            sendJson(res, 404, { error: 'Ticket introuvable' })
            return
          }
          const existing = db.tickets[index]!
          const rawBody = await readBody(req)
          const body = rawBody ? (JSON.parse(rawBody) as Partial<TicketRecord>) : {}

          const updated: TicketRecord =
            method === 'PUT'
              ? {
                  id: existing.id,
                  titre: body.titre ?? '',
                  description: body.description ?? '',
                  demandeur: body.demandeur ?? '',
                  priorite: body.priorite ?? 'Moyenne',
                  statut: body.statut ?? 'Ouvert',
                  dateCreation: body.dateCreation ?? existing.dateCreation,
                }
              : {
                  ...existing,
                  ...body,
                  id: existing.id,
                }

          db.tickets[index] = updated
          writeDb(db)
          sendJson(res, 200, updated)
          return
        }

        if (method === 'DELETE' && ticketId) {
          const index = db.tickets.findIndex((t) => String(t.id) === ticketId)
          if (index === -1) {
            sendJson(res, 404, { error: 'Ticket introuvable' })
            return
          }
          const [deleted] = db.tickets.splice(index, 1)
          writeDb(db)
          sendJson(res, 200, deleted)
          return
        }

        sendJson(res, 405, { error: 'Méthode non autorisée' })
      } catch (err) {
        sendJson(res, 400, {
          error: err instanceof Error ? err.message : 'Requête invalide',
        })
      }
    }
  }

  return {
    name: 'tickets-api-plugin',
    configureServer(server) {
      server.middlewares.use(createMiddleware())
    },
    configurePreviewServer(server) {
      server.middlewares.use(createMiddleware())
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vueDevTools(), ticketsApiPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
  },
})
