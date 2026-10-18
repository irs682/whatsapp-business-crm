# WhatsApp Business CRM - Production Deployment Guide

## 1. Production Architecture Overview

In a production environment, WhatsApp Business CRM requires:
- High availability PostgreSQL instance (e.g. AWS RDS, DigitalOcean Managed Database)
- HTTPS / SSL termination (Meta requires HTTPS for all webhook endpoints)
- Reverse proxy (Nginx or Cloudflare) with WebSocket / HTTP keep-alive support
- Production process manager (PM2 or Docker/Kubernetes container)

```mermaid
graph LR
    User[End Agent / Browser] -->|HTTPS 443| Cloudflare[Cloudflare CDN & DDoS Protection]
    Meta[Meta WhatsApp Cloud API] -->|HTTPS Webhook| Cloudflare
    Cloudflare --> Nginx[Nginx Reverse Proxy]
    Nginx -->|Proxy Pass 5000| NodeApp[PM2 Node.js Cluster]
    Nginx -->|Static Assets| SPA[Vite Client Build /dist]
    NodeApp --> Postgres[(Managed PostgreSQL)]
```

## 2. Docker Deployment

### Backend Dockerfile (`server/Dockerfile`)
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
RUN npx prisma generate

COPY . .

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app /app
ENV NODE_ENV=production
EXPOSE 5000
CMD ["npm", "run", "start"]
```

## 3. Environment Variables Checklist

Ensure these production values are securely injected:
- `NODE_ENV=production`
- `PORT=5000`
- `DATABASE_URL=postgresql://user:secure_pwd@rds.endpoint:5432/crm_prod?sslmode=require`
- `JWT_SECRET` (Use cryptographically secure 64+ char random string)
- `JWT_EXPIRES_IN=1d`
- `CLIENT_URL=https://crm.yourdomain.com`
- `WHATSAPP_ACCESS_TOKEN` (Meta System User Permanent Token)
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_BUSINESS_ACCOUNT_ID`
- `WHATSAPP_VERIFY_TOKEN` (Long unique random token)
- `WHATSAPP_APP_SECRET`

## 4. Meta Webhook URL Configuration

Inside the Meta App Developer Portal:
1. Navigate to **WhatsApp > Configuration**.
2. Set **Callback URL** to: `https://api.yourdomain.com/api/v1/webhooks/whatsapp`.
3. Set **Verify Token** to match your `WHATSAPP_VERIFY_TOKEN`.
4. Click **Verify and Save**.
5. Subscribe to Webhook fields: `messages`, `message_template_status_update`.
