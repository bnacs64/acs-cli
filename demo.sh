#!/bin/bash

# Enhanced CLI Demonstration Script
# This script demonstrates the key features of the improved controller configuration CLI

echo "🎛️  Controller Configuration Tool - Enhanced CLI Demo"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

demo_step() {
    echo -e "${CYAN}$1${NC}"
    echo "Command: ${YELLOW}$2${NC}"
    echo ""
}

pause_demo() {
    echo -e "${BLUE}Press Enter to continue...${NC}"
    read
    echo ""
}

echo -e "${GREEN}This demo showcases the enhanced UX features of the CLI${NC}"
echo ""
pause_demo

# 1. System Diagnostics
demo_step "1. 🏥 System Health Check" "node cli-enhanced.js doctor"
node cli-enhanced.js doctor
echo ""
pause_demo

# 2. Dashboard Overview
demo_step "2. 📊 Dashboard Overview" "node cli-enhanced.js dashboard --list"
node cli-enhanced.js dashboard --list
echo ""
pause_demo

# 3. List all commands
demo_step "3. 📋 Available Commands" "node cli-enhanced.js list-commands"
node cli-enhanced.js list-commands
echo ""
pause_demo

# 4. Quick Operations Demo (non-interactive)
demo_step "4. ⚡ Quick Operations Menu" "node cli-enhanced.js quick"
echo "Available quick operations:"
echo "  🎫 Add card privilege"
echo "  🔍 Check card access"
echo "  🚪 Open door now"
echo "  ⏰ Sync time"
echo "  📊 Controller status"
echo "  📝 Recent activity"
echo "  🗑️  Remove card"
echo "  🔧 Quick test"
echo ""
pause_demo

# 5. Wizard Demo (non-interactive)
demo_step "5. 🧙 Interactive Wizard" "node cli-enhanced.js wizard"
echo "Available wizard options:"
echo "  🚀 Initial Setup - Discover and configure your first controller"
echo "  🎫 Privilege Management - Add, modify, or remove access cards"
echo "  🌐 Network Configuration - Set up controller network settings"
echo "  🚪 Door Control - Configure door behavior and access"
echo "  🔧 Maintenance - System status, time sync, and diagnostics"
echo ""
pause_demo

# 6. Enhanced Help
demo_step "6. 📖 Enhanced Help System" "node cli-enhanced.js --help"
node cli-enhanced.js --help
echo ""
pause_demo

# 7. Command-specific help
demo_step "7. 🔍 Command-specific Help" "node cli-enhanced.js discover --help"
node cli-enhanced.js discover --help
echo ""
pause_demo

# 8. Error handling demo
demo_step "8. 🚨 Error Handling Demo" "node cli-enhanced.js nonexistent-command"
node cli-enhanced.js nonexistent-command 2>/dev/null || echo -e "${RED}✗ Unknown command handled gracefully${NC}"
echo ""
pause_demo

echo -e "${GREEN}🎉 Demo Complete!${NC}"
echo ""
echo -e "${CYAN}Key Improvements Demonstrated:${NC}"
echo "✓ Rich visual feedback with colors and icons"
echo "✓ Comprehensive system diagnostics"
echo "✓ Interactive dashboard and quick operations"
echo "✓ Guided wizards for complex workflows"
echo "✓ Enhanced help with examples and grouping"
echo "✓ Graceful error handling"
echo "✓ Professional command organization"
echo ""

echo -e "${YELLOW}Try these commands next:${NC}"
echo "• node cli-enhanced.js wizard           # Guided setup"
echo "• node cli-enhanced.js dashboard -i     # Interactive dashboard"
echo "• node cli-enhanced.js quick            # Quick operations"
echo "• node cli-enhanced.js doctor           # System diagnostics"
echo ""

echo -e "${GREEN}Happy managing! 🎛️${NC}"
