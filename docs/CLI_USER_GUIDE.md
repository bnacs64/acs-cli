# Controller Configurator CLI - User Guide

## 🚀 Quick Start

### Installation & Setup
```bash
# Install dependencies
npm install

# System diagnostics and setup
node cli-unified.js doctor --fix

# First discovery
node cli-unified.js enhanced-discover
```

### Basic Usage Pattern
```bash
node cli-unified.js <command> [options]

# Examples:
node cli-unified.js enhanced-discover
node cli-unified.js query-status selected selected
node cli-unified.js add-privilege selected selected 12345 20250611 20260611 1 0 0 0
```

## 📋 Command Categories

### 🔍 **Discovery & Setup**
| Command | Description | Usage |
|---------|-------------|-------|
| `enhanced-discover` | Enhanced network discovery with real-time feedback | `enhanced-discover [--broadcast-ip <ip>] [--quiet]` |
| `select-controller` | Select a default controller for operations | `select-controller` |
| `remove-controller` | Remove a controller from storage | `remove-controller <serial_number>` |
| `doctor` | System diagnostics and health check | `doctor [--fix]` |

### 🌐 **Network Configuration**
| Command | Description | Usage |
|---------|-------------|-------|
| `set-network` | Configure controller network settings | `set-network <serial> <ip> <new_ip> <mask> <gateway>` |
| `read-receiving-server` | Read server configuration | `read-receiving-server <serial> <ip>` |
| `set-receiving-server` | Set server configuration | `set-receiving-server <serial> <ip> <server_ip> <port>` |

### ⏰ **Time Management**
| Command | Description | Usage |
|---------|-------------|-------|
| `read-time` | Read controller date/time | `read-time <serial> <ip>` |
| `sync-time` | Synchronize controller time with system | `sync-time <serial> <ip>` |

### 🔐 **Privilege Management**
| Command | Description | Usage |
|---------|-------------|-------|
| `add-privilege` | Add card access privilege | `add-privilege <serial> <ip> <card> <start> <end> <d1> <d2> <d3> <d4> [password]` |
| `delete-privilege` | Remove card privilege | `delete-privilege <serial> <ip> <card_number>` |
| `clear-all-privileges` | Remove all privileges (DANGEROUS) | `clear-all-privileges <serial> <ip>` |
| `query-privilege` | Check specific card privilege | `query-privilege <serial> <ip> <card_number>` |
| `read-privilege-by-index` | Read privilege by index | `read-privilege-by-index <serial> <ip> <index>` |
| `read-total-privileges` | Get total privilege count | `read-total-privileges <serial> <ip>` |

### 🚪 **Door Control**
| Command | Description | Usage |
|---------|-------------|-------|
| `remote-open-door` | Open door remotely | `remote-open-door <serial> <ip> <door_number>` |
| `read-door-control` | Read door control settings | `read-door-control <serial> <ip>` |
| `set-door-control` | Configure door control | `set-door-control <serial> <ip> <settings>` |

### 📊 **Records & Status**
| Command | Description | Usage |
|---------|-------------|-------|
| `query-status` | Get controller status | `query-status <serial> <ip>` |
| `get-record` | Retrieve specific record | `get-record <serial> <ip> <index>` |
| `get-read-record-index` | Get current record index | `get-read-record-index <serial> <ip>` |
| `set-read-record-index` | Set record reading index | `set-read-record-index <serial> <ip> <index>` |

### 💾 **Data Management**
| Command | Description | Usage |
|---------|-------------|-------|
| `data-manager sync` | Synchronize data storage | `data-manager sync [--to-db] [--from-db] [--both]` |
| `data-manager backup` | Create data backup | `data-manager backup [--verbose]` |
| `data-manager restore` | Restore from backup | `data-manager restore` |
| `data-manager status` | Check storage status | `data-manager status` |
| `data-manager cleanup` | Clean old files | `data-manager cleanup` |

### 🎯 **Interactive Tools**
| Command | Description | Usage |
|---------|-------------|-------|
| `dashboard` | Interactive dashboard | `dashboard` |
| `wizard` | Guided setup wizard | `wizard` |
| `quick` | Quick action menu | `quick` |
| `list-commands` | Show all commands | `list-commands` |

## 🎯 **Common Usage Patterns**

### First-Time Setup
```bash
# 1. Check system health
node cli-unified.js doctor --fix

# 2. Discover controllers
node cli-unified.js enhanced-discover

# 3. Select default controller
node cli-unified.js select-controller

# 4. Check controller status
node cli-unified.js query-status selected selected
```

### Daily Operations
```bash
# Check controller status
node cli-unified.js query-status selected selected

# Add new card access
node cli-unified.js add-privilege selected selected 12345 20250611 20260611 1 1 0 0

# Open door remotely
node cli-unified.js remote-open-door selected selected 1

# Sync time
node cli-unified.js sync-time selected selected
```

### Bulk Operations
```bash
# Backup all data
node cli-unified.js data-manager backup

# Sync with database
node cli-unified.js data-manager sync --both

# Interactive dashboard for multiple operations
node cli-unified.js dashboard
```

## 📝 **Parameter Reference**

### Controller Identification
- `<serial>` - Controller serial number (or "selected" for default)
- `<ip>` - Controller IP address (or "selected" for default)

### Privilege Parameters
- `<card>` - Card number (1-999999999, cannot be 0, 0xffffffff, 0x00ffffff)
- `<start>` - Start date (YYYYMMDD format, e.g., 20250611)
- `<end>` - End date (YYYYMMDD format, e.g., 20260611)
- `<d1>` `<d2>` `<d3>` `<d4>` - Door permissions (1=enabled, 0=disabled)
- `[password]` - Optional 6-digit password (max 999999)

### Network Parameters
- `<new_ip>` - New IP address (e.g., 192.168.1.100)
- `<mask>` - Subnet mask (e.g., 255.255.255.0)
- `<gateway>` - Gateway address (e.g., 192.168.1.1)

### Door Parameters
- `<door_number>` - Door number (1, 2, 3, or 4)

## 🔧 **Global Options**

### CLI Flags
```bash
--offline          # Work in offline mode (local storage only)
--debug           # Enable debug output
--verbose         # Show detailed operation logs
--no-color        # Disable colored output
--json            # Output in JSON format
--config <path>   # Use custom configuration file
```

### Environment Variables
```bash
export SUPABASE_URL="your-supabase-url"
export SUPABASE_ANON_KEY="your-anon-key"
export OFFLINE_MODE="true"              # Force offline mode
export NODE_ENV="development"           # Enable debug output
```

## 💡 **Tips & Best Practices**

### Using "selected" Parameters
After running `select-controller`, you can use "selected" instead of specific serial numbers and IPs:
```bash
# Instead of:
node cli-unified.js query-status 123456789 192.168.1.100

# Use:
node cli-unified.js query-status selected selected
```

### Date Format
Always use YYYYMMDD format for dates:
- ✅ Correct: `20250611` (June 11, 2025)
- ❌ Wrong: `2025-06-11`, `06/11/2025`, `11-06-2025`

### Card Number Restrictions
Card numbers have specific restrictions from the SDK:
- Must be greater than 0
- Cannot be 4294967295 (0xffffffff)
- Cannot be 16777215 (0x00ffffff)

### Door Permissions
Door permissions are binary flags:
- `1` = Door access enabled
- `0` = Door access disabled
- Example: `1 0 1 0` = Access to doors 1 and 3 only

### Password Guidelines
- Optional parameter (can be omitted)
- Maximum 6 digits (999999)
- Use 0 or omit for no password

## 🚨 **Error Handling**

### Common Errors & Solutions

**"Controller not found"**
```bash
# Solution: Run discovery first
node cli-unified.js enhanced-discover
```

**"Database connection failed"**
```bash
# Solution: Use offline mode
node cli-unified.js --offline <command>
```

**"Invalid card number"**
```bash
# Solution: Check card number restrictions
# Must be > 0 and not 0xffffffff or 0x00ffffff
```

**"Network timeout"**
```bash
# Solution: Check network connectivity
node cli-unified.js doctor
```

### Debug Mode
For troubleshooting, enable debug mode:
```bash
node cli-unified.js --debug --verbose <command>
```

## 📊 **Output Formats**

### Default Output
Human-readable with colors and formatting

### JSON Output
```bash
node cli-unified.js --json query-status selected selected
```

### Verbose Output
```bash
node cli-unified.js --verbose enhanced-discover
```

## 🔄 **Data Persistence**

### Dual Storage System
- **Primary**: Database (Supabase)
- **Backup**: Local JSON files (`~/.controller-config/data/`)
- **Automatic Fallback**: Uses local storage if database unavailable

### Storage Locations
```
~/.controller-config/
├── config.json              # Configuration
├── data/
│   ├── controllers.json     # Controller data
│   ├── privileges.json      # Privilege data
│   ├── records.json         # Access records
│   └── backups/             # Versioned backups
└── logs/                    # Operation logs
```

## 🎮 **Interactive Mode**

### Dashboard
```bash
node cli-unified.js dashboard
```
- Real-time controller monitoring
- Quick action buttons
- Status overview
- Interactive privilege management

### Wizard
```bash
node cli-unified.js wizard
```
- Guided first-time setup
- Step-by-step configuration
- Automatic discovery and selection

### Quick Actions
```bash
node cli-unified.js quick
```
- Common operations menu
- Preset configurations
- Batch operations

---

## 📞 **Getting Help**

### Built-in Help
```bash
node cli-unified.js --help                    # General help
node cli-unified.js <command> --help          # Command-specific help
node cli-unified.js list-commands             # List all commands
```

### System Diagnostics
```bash
node cli-unified.js doctor                    # Check system health
node cli-unified.js doctor --fix              # Fix common issues
```

### Debug Information
```bash
node cli-unified.js --debug --verbose <command>
```

For additional support, check the README.md and IMPROVEMENTS_SUMMARY.md files.
