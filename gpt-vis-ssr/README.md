# GPT-Vis-SSR — Local Chart Rendering Service

HTTP server wrapper for [`@antv/gpt-vis-ssr`](https://www.npmjs.com/package/@antv/gpt-vis-ssr) that fornisce un servizio di rendering dei grafici locale, eliminando la dipendenza dal cloud Alibaba.

## Architettura

```
┌─────────────┐     POST /render      ┌──────────────────┐
│  MCP Server │ ───────────────────▶   │  GPT-Vis-SSR     │
│  Chart      │                        │  (questo server)  │
│  :1122      │  ◀─────────────────    │  :3200            │
└─────────────┘  {success, resultObj}  └──────────────────┘
       │                                       │
       │  SSE/Streamable                       │  Serve immagini
       ▼                                       ▼
   MCP Client                          /images/<uuid>.png
```

## Quick Start con Docker Compose

Dalla root del progetto:

```bash
docker compose -f docker-compose.local.yaml up --build
```

Questo avvia:
- **gpt-vis-ssr** su `http://localhost:3200` — servizio di rendering
- **mcp-server-chart** su `http://localhost:1122` — server MCP (SSE)

## Test manuale del rendering

```bash
curl -X POST http://localhost:3200/render \
  -H "Content-Type: application/json" \
  -d '{
    "type": "line",
    "data": [
      {"time": "2025-05", "value": 512},
      {"time": "2025-06", "value": 1024}
    ]
  }'
```

Risposta attesa:
```json
{
  "success": true,
  "resultObj": "http://localhost:3200/images/<uuid>.png",
  "errorMessage": ""
}
```

## API

### `POST /render` (o `POST /`)

| Campo | Tipo | Descrizione |
|---|---|---|
| `type` | `string` | Tipo di grafico: `line`, `bar`, `area`, `pie`, `column`, ecc. |
| `data` | `array` | Dati del grafico |
| `...` | `any` | Altre opzioni supportate da GPT-Vis |

#### Risposta

| Campo | Tipo | Descrizione |
|---|---|---|
| `success` | `boolean` | Se il rendering è riuscito |
| `resultObj` | `string` | URL dell'immagine generata |
| `errorMessage` | `string` | Messaggio di errore (se `success = false`) |

### `GET /health`

Health check. Ritorna `{"status": "ok"}`.

## Variabili d'ambiente

| Variabile | Default | Descrizione |
|---|---|---|
| `PORT` | `3200` | Porta del server HTTP |
| `PUBLIC_HOST` | `http://localhost:3200` | Base URL per i link alle immagini generate |

## Esecuzione standalone (senza Docker)

```bash
cd gpt-vis-ssr
npm install
node server.js
```

> **Nota**: Richiede le librerie native per il rendering canvas (cairo, pango, ecc.).
> Su macOS: `brew install pkg-config cairo pango libpng jpeg giflib librsvg pixman`
> Su Ubuntu/Debian: `apt-get install libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev`

## Pulizia automatica

Le immagini più vecchie di 1 ora vengono rimosse automaticamente ogni 10 minuti.

## Limitazioni

Come indicato nella documentazione ufficiale, il private deployment **non supporta** le visualizzazioni geografiche:
- `geographic-district-map`
- `geographic-path-map`
- `geographic-pin-map`
