# CodeStream Deployment Guide

This guide covers deploying both the frontend (Next.js) and backend (Go) of CodeStream.

## 🚀 Quick Deploy Options

### Option 1: Vercel (Frontend) + Railway/Render (Backend) - Recommended
- **Frontend**: Deploy to Vercel (free tier available)
- **Backend**: Deploy to Railway or Render (free tier available)
- **Redis**: Use Upstash Redis (free tier) or Railway's Redis

### Option 2: Full Stack on Railway
- Deploy both frontend and backend on Railway
- Use Railway's Redis addon

### Option 3: Docker Compose (Self-hosted)
- Deploy everything on a VPS (DigitalOcean, AWS EC2, etc.)

---

## 📦 Frontend Deployment (Next.js)

### Deploy to Vercel (Recommended)

1. **Push your code to GitHub** (if not already done)
   ```bash
   git push origin main
   ```

2. **Go to [Vercel](https://vercel.com)** and sign in with GitHub

3. **Import your repository**
   - Click "New Project"
   - Select your `codestream-fe` repository
   - Set the root directory to `frontend`

4. **Configure build settings:**
   - Framework Preset: Next.js
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `.next`

5. **Add Environment Variables:**
   ```
   NEXT_PUBLIC_BACKEND_URL=https://your-backend-url.com
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key
   CLERK_SECRET_KEY=your_clerk_secret
   ```

6. **Deploy!** Vercel will automatically deploy on every push to main.

### Alternative: Deploy to Netlify

1. **Install Netlify CLI:**
   ```bash
   npm install -g netlify-cli
   ```

2. **Build and deploy:**
   ```bash
   cd frontend
   npm run build
   netlify deploy --prod
   ```

---

## 🔧 Backend Deployment (Go)

### Option 1: Railway (Recommended - Free Tier Available)

1. **Go to [Railway](https://railway.app)** and sign in with GitHub

2. **Create a new project** → "Deploy from GitHub repo"

3. **Select your repository** and set:
   - Root Directory: `backend`
   - Build Command: `go build -o codestream .`
   - Start Command: `./codestream`

4. **Add Environment Variables:**
   ```
   PORT=8080
   REDIS_URL=your_redis_url
   REDIS_PASSWORD=your_redis_password
   ANTHROPIC_API_KEY=your_api_key
   ```

5. **Add Redis Service:**
   - Click "New" → "Database" → "Add Redis"
   - Railway will automatically set `REDIS_URL` and `REDIS_PASSWORD`

6. **Deploy!** Railway will build and deploy automatically.

### Option 2: Render

1. **Go to [Render](https://render.com)** and sign in

2. **Create a new Web Service:**
   - Connect your GitHub repository
   - Name: `codestream-backend`
   - Root Directory: `backend`
   - Environment: Go
   - Build Command: `go build -o codestream .`
   - Start Command: `./codestream`

3. **Add Environment Variables:**
   ```
   PORT=8080
   REDIS_URL=your_redis_url
   REDIS_PASSWORD=your_redis_password
   ANTHROPIC_API_KEY=your_api_key
   ```

4. **Add Redis Database:**
   - Create a new Redis instance
   - Copy the Internal Redis URL
   - Use it as `REDIS_URL`

### Option 3: Fly.io

1. **Install Fly CLI:**
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Login:**
   ```bash
   fly auth login
   ```

3. **Initialize Fly app:**
   ```bash
   cd backend
   fly launch
   ```

4. **Set environment variables:**
   ```bash
   fly secrets set ANTHROPIC_API_KEY=your_key
   fly secrets set REDIS_URL=your_redis_url
   fly secrets set REDIS_PASSWORD=your_password
   ```

5. **Deploy:**
   ```bash
   fly deploy
   ```

### Option 4: DigitalOcean App Platform

1. **Go to [DigitalOcean](https://cloud.digitalocean.com/apps)**

2. **Create App** → "GitHub" → Select repository

3. **Configure:**
   - Type: Web Service
   - Source: `backend/`
   - Build Command: `go build -o codestream .`
   - Run Command: `./codestream`

4. **Add Environment Variables** and **Managed Redis Database**

---

## 🗄️ Redis Deployment

### Option 1: Upstash (Free Tier - 10K commands/day)

1. **Go to [Upstash](https://upstash.com)** and sign up
2. **Create Redis Database**
3. **Copy the REST URL** and use it as `REDIS_URL`
4. **Copy the password** and use it as `REDIS_PASSWORD`

### Option 2: Railway Redis (Included with Railway)

- When you add Redis to Railway, it automatically provides the connection string

### Option 3: Redis Cloud (Free Tier)

1. **Go to [Redis Cloud](https://redis.com/try-free/)**
2. **Create a free database**
3. **Copy connection details**

---

## 🔐 Environment Variables Setup

### Frontend (.env.local)
```env
NEXT_PUBLIC_BACKEND_URL=https://your-backend-url.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

### Backend (.env)
```env
PORT=8080
REDIS_URL=redis://default:password@host:port
REDIS_PASSWORD=your_password
ANTHROPIC_API_KEY=your_api_key_here
```

---

## 🔄 Update Frontend to Use Production Backend

After deploying the backend, update your frontend code:

1. **Update WebSocket URL in `frontend/hooks/use-websocket.ts`:**
   ```typescript
   const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 
     `wss://your-backend-url.com/ws?session=${sessionId}&...`
   ```

2. **Update API URLs in `frontend/app/session/[id]/page.tsx`:**
   ```typescript
   const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080'
   ```

3. **Update CORS in `backend/main.go`:**
   ```go
   AllowedOrigins: []string{
     "http://localhost:3000",
     "https://your-frontend-domain.vercel.app",
   },
   ```

---

## 🐳 Docker Deployment (Self-hosted)

### Create Dockerfile for Backend

```dockerfile
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o codestream .

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/codestream .
EXPOSE 8080
CMD ["./codestream"]
```

### Deploy with Docker Compose

1. **Update `docker-compose.yml`** to include backend
2. **Run:**
   ```bash
   docker-compose up -d
   ```

---

## ✅ Post-Deployment Checklist

- [ ] Backend is accessible at production URL
- [ ] Frontend can connect to backend API
- [ ] WebSocket connections work
- [ ] Redis is connected and working
- [ ] Environment variables are set correctly
- [ ] CORS is configured for frontend domain
- [ ] Clerk authentication is working
- [ ] API keys are set (Groq/Anthropic)

---

## 🐛 Troubleshooting

### Backend not connecting to Redis
- Check `REDIS_URL` format: `redis://default:password@host:port`
- Verify Redis is accessible from your backend host

### CORS errors
- Update `AllowedOrigins` in `backend/main.go` with your frontend URL
- Include both `http://` and `https://` if needed

### WebSocket connection fails
- Ensure WebSocket URL uses `wss://` for HTTPS
- Check firewall/security group allows WebSocket connections

### Environment variables not loading
- Restart the service after adding env vars
- Check variable names match exactly (case-sensitive)

---

## 📚 Additional Resources

- [Vercel Deployment Docs](https://vercel.com/docs)
- [Railway Docs](https://docs.railway.app)
- [Render Docs](https://render.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)

