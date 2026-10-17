FROM node:20-alpine

WORKDIR /app

# Copy application files (zero dependencies needed!)
COPY package.json ./
COPY server.js ./
COPY index.html ./
COPY panel.html ./
COPY styles.css ./
COPY app.js ./
COPY panel.js ./

ENV PORT=3000
ENV HOST=0.0.0.0

EXPOSE 3000

CMD ["node", "server.js"]
