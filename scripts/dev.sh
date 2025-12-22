#!/bin/bash
# Simple development setup script

set -e

echo "Starting HandoverKey development environment..."

# Check prerequisites
if ! command -v node &> /dev/null || ! command -v docker &> /dev/null; then
    echo "Please install Node.js 22+ and Docker first"
    exit 1
fi

# Install dependencies and build
npm install
npm run build

# Start required database services
npm run docker:up

# Wait for database
echo "⏳ Waiting for database..."
sleep 15

# Run migrations
npm run db:migrate

echo "Development environment ready!"
echo ""
echo "Now use 'npm run dev' to start the development server."
echo ""
echo "To stop: npm run docker:down"