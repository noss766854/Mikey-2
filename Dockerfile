FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm@11.7.0 \
  && pnpm install --prod --frozen-lockfile

COPY . .

CMD ["pnpm", "start"]
