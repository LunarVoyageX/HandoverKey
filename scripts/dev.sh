#!/bin/bash
# Simple development setup script

set -e

echo "🚀 Starting HandoverKey development environment..."

# Check prerequisites
if ! command -v node &> /dev/null || ! command -v docker &> /dev/null; then
    echo "❌ Please install Node.js 22+ and Docker first"
    exit 1
fi

# Create .env if needed
if [ ! -f .env ]; then
    cp env.example .env
    echo "✅ Created .env file"
fi

# Install dependencies and build
npm install
npm run build

# Start services
docker-compose up -d

# Wait for database
echo "⏳ Waiting for database..."
sleep 5

# Run migrations
npm run db:migrate

echo "✅ Development environment ready!"
echo ""
echo "🌐 Web app: http://localhost:3000"
echo "🔧 API: http://localhost:3001"
echo "🗄️  Database: localhost:5432"
echo ""
echo "To stop: docker-compose down"