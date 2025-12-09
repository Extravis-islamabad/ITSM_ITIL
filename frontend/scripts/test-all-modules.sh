#!/bin/bash

# ITSM Platform - Comprehensive E2E Test Runner
# This script tests all modules and generates a detailed report

echo "🧪 ITSM Platform - Comprehensive Test Suite"
echo "==========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if backend is running
echo "🔍 Checking if backend is running..."
if curl -s http://localhost:8000/docs > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Backend is running"
else
    echo -e "${RED}✗${NC} Backend is not running. Please start it first:"
    echo "   cd backend && python -m uvicorn app.main:app --reload --port 8000"
    exit 1
fi

# Check if frontend dev server is configured
echo "🔍 Checking Playwright configuration..."
if [ -f "playwright.config.ts" ]; then
    echo -e "${GREEN}✓${NC} Playwright is configured"
else
    echo -e "${RED}✗${NC} Playwright configuration not found"
    exit 1
fi

# Install Playwright browsers if needed
echo ""
echo "📦 Installing Playwright browsers (if needed)..."
npx playwright install chromium --with-deps

# Run tests
echo ""
echo "🚀 Running comprehensive E2E tests..."
echo "   This will test all modules and workflows"
echo ""

# Run Playwright tests
npx playwright test --reporter=html,json

# Generate custom report
echo ""
echo "📊 Generating detailed report..."
npx tsx scripts/run-tests-with-report.ts

# Show results
if [ -f "test-results/TEST-REPORT.md" ]; then
    echo ""
    echo "📄 Test Report Preview:"
    echo "======================="
    head -n 50 test-results/TEST-REPORT.md
    echo ""
    echo "Full report: test-results/TEST-REPORT.md"
fi

echo ""
echo "✅ Testing complete!"
echo ""
echo "📊 View detailed HTML report:"
echo "   npx playwright show-report test-results/html-report"
echo ""
