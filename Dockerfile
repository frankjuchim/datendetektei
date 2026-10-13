# Datendetektei – Node.js 22 (Vertrag §9: Node ≥ 20, Docker + CapRover)
# Stufe 1: Abhängigkeiten (Build-Werkzeuge für better-sqlite3, falls kein Prebuild passt)
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force \
 && node -e "require('express'); require('helmet'); new (require('better-sqlite3'))(':memory:'); console.log('Abhängigkeiten ok')"

# Stufe 2: Materialien (Spec §12.1/§12.4): erzeugte PDFs + Whitelists (verzeichnis.json); die docx/pptx-Originale
# (materialien/Originale/verzeichnis.json) nur mit ORIGINALE_IM_IMAGE=1 (Standard: ja; mit --build-arg ORIGINALE_IM_IMAGE=0 ohne).
FROM node:22-bookworm-slim AS material
ARG ORIGINALE_IM_IMAGE=1
WORKDIR /bau
COPY materialien ./materialien
COPY scripts/materialien_fuer_image.js ./
RUN ORIGINALE_IM_IMAGE=$ORIGINALE_IM_IMAGE node materialien_fuer_image.js ./materialien /material

# Stufe 3: schlankes Laufzeit-Image
FROM node:22-bookworm-slim
ENV NODE_ENV=production \
    PORT=80 \
    DATA_DIR=/app/data \
    TZ=Europe/Berlin
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY src ./src
COPY public ./public
COPY seed ./seed
COPY scripts ./scripts
COPY --from=material /material ./materialien
# Datenverzeichnis (in CapRover als Persistent Directory /app/data einbinden)
RUN mkdir -p /app/data && chown -R node:node /app/data
# Port 80 ohne root-Rechte binden dürfen
RUN apt-get update \
 && apt-get install -y --no-install-recommends libcap2-bin \
 && setcap 'cap_net_bind_service=+ep' "$(readlink -f "$(which node)")" \
 && apt-get purge -y libcap2-bin && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*
USER node
VOLUME ["/app/data"]
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||80)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "src/server.js"]
