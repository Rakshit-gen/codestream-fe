#!/bin/bash

echo "🚀 Setting up CodeStream..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Go is installed
if ! command -v go &> /dev/null; then
    echo "❌ Go is not installed. Please install Go first."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Start Redis
echo "🐳 Starting Redis with Docker Compose..."
docker-compose up -d

# Setup Backend
echo "🔧 Setting up Go backend..."
cd backend
cp .env.example .env
echo "⚠️  Please update backend/.env with your ANTHROPIC_API_KEY"
go mod download
cd ..

# Setup Frontend
echo "🎨 Setting up Next.js frontend..."
cd frontend
cp .env.local.example .env.local
echo "⚠️  Please update frontend/.env.local with your Clerk keys"
npm install
cd ..

echo ""
echo "✨ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Update backend/.env with your Anthropic API key"
echo "2. Update frontend/.env.local with your Clerk keys"
echo "3. Run 'npm run dev:backend' to start the Go server"
echo "4. Run 'npm run dev:frontend' to start the Next.js app"
echo ""
echo "🌐 Access the app at http://localhost:3000"
