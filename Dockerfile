FROM node:22-alpine

WORKDIR /usr/app
ENV NODE_ENV=production

# install dependencies first so they're cached between code changes
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY assets ./assets
COPY discord ./discord
COPY languages ./languages
COPY misc ./misc
COPY valorant ./valorant
COPY sharding.js SkinPeek.js ./

# user data, skin cache and stats live here: mount a volume on it to persist them
RUN mkdir -p data

CMD ["node", "SkinPeek.js"]
