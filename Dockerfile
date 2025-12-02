FROM node:18-bullseye-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
  build-essential \
  pkg-config \
  libcairo2-dev \
  libpango1.0-dev \
  libjpeg-dev \
  libgif-dev \
  librsvg2-dev \
  ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app
COPY package.json package-lock.json* ./
RUN npm ci --production || npm install --production

COPY . .

EXPOSE 3000
CMD ["npm", "start"]
