import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import authRouter from './routes/auth.js'
import leaguesRouter from './routes/leagues.js'
import seasonsRouter from './routes/seasons.js'
import categoriesRouter from './routes/categories.js'
import teamsRouter from './routes/teams.js'
import paymentsRouter from './routes/payments.js'
import playersRouter from './routes/players.js'
import gamesRouter from './routes/games.js'
import matchdaysRouter from './routes/matchdays.js'
import standingsRouter from './routes/standings.js'
import statsRouter from './routes/stats.js'
import playoffsRouter from './routes/playoffs.js'
import managerRouter from './routes/manager.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') })
}

const app = express()
const PORT = process.env.PORT || process.env.API_PORT || 3001

const corsOptions = {
  origin: true,          // refleja cualquier Origin
  credentials: true,     // permite cookies/credenciales
  methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // <- importante para preflight

app.use(express.json({ limit: '5mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/api/auth', authRouter)
app.use('/api/leagues', leaguesRouter)
app.use('/api', seasonsRouter)
app.use('/api', categoriesRouter)
app.use('/api', teamsRouter)
app.use('/api', paymentsRouter)
app.use('/api', playersRouter)
app.use('/api', gamesRouter)
app.use('/api', matchdaysRouter)
app.use('/api', standingsRouter)
app.use('/api', statsRouter)
app.use('/api', playoffsRouter)
app.use('/api/manager', managerRouter)

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`)
})
