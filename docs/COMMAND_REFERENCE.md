# Controller Configurator - Complete Command Reference

## 📖 **Command Syntax Guide**

### Parameter Types
- `<required>` - Required parameter
- `[optional]` - Optional parameter
- `selected` - Use selected controller (after running select-controller)
- `serial` - Controller serial number (9-digit number)
- `ip` - IP address (e.g., 192.168.1.100)

---

## 🔍 **DISCOVERY & SETUP COMMANDS**

### `enhanced-discover`
**Purpose**: Discover controllers on the network with enhanced real-time feedback

**Syntax**:
```bash
node cli-unified.js enhanced-discover [options]
```

**Options**:
- `--broadcast-ip <ip>` - Custom broadcast IP (default: 255.255.255.255)
- `--skip-persist` - Don't save discovered controllers
- `--quiet` - Reduce output verbosity
- `--timeout <ms>` - Discovery timeout in milliseconds (default: 3000)

**Examples**:
```bash
# Basic discovery
node cli-unified.js enhanced-discover

# Discovery with custom broadcast IP
node cli-unified.js enhanced-discover --broadcast-ip 192.168.1.255

# Quiet discovery without saving
node cli-unified.js enhanced-discover --quiet --skip-persist

# Extended timeout for slow networks
node cli-unified.js enhanced-discover --timeout 10000
```

**Output**:
```
🔍 Enhanced Controller Discovery
Scanning network for access control devices...

📡 Discovered: SN=123456789, IP=192.168.1.100
📡 Discovered: SN=987654321, IP=192.168.1.101

🎉 Found 2 controller(s):

#  Serial Number  IP Address     MAC Address        Driver Ver.  Status   Last Record
1  123456789      192.168.1.100  00:11:22:33:44:55  0102        Online   1234
2  987654321      192.168.1.101  00:11:22:33:44:56  0102        Online   5678
```

---

### `select-controller`
**Purpose**: Select a default controller for subsequent operations

**Syntax**:
```bash
node cli-unified.js select-controller
```

**Interactive Process**:
1. Shows list of discovered controllers
2. Prompts for selection
3. Saves selection for future "selected" parameter usage

**Example**:
```bash
node cli-unified.js select-controller

# Output:
Available controllers:
1. SN=123456789, IP=192.168.1.100 (Online)
2. SN=987654321, IP=192.168.1.101 (Online)

Select controller (1-2): 1
✅ Selected controller SN=123456789 as default
```

---

### `doctor`
**Purpose**: System diagnostics and health check

**Syntax**:
```bash
node cli-unified.js doctor [--fix]
```

**Options**:
- `--fix` - Attempt to fix detected issues automatically

**Example**:
```bash
node cli-unified.js doctor --fix

# Output:
🏥 System Diagnosis

✓ Node.js Version: v18.17.0
✓ Package Dependencies: 15 dependencies
✓ Configuration Directory: Created
✓ Data Storage: Ready
✗ Database Connection: Connection failed
  💡 Check Supabase configuration or use --offline mode

⚠️ Some issues detected. Use --fix to attempt automatic fixes.
```

---

## 🌐 **NETWORK CONFIGURATION COMMANDS**

### `set-network`
**Purpose**: Configure controller network settings (IP, subnet, gateway)

**Syntax**:
```bash
node cli-unified.js set-network <serial> <current_ip> <new_ip> <subnet_mask> <gateway>
```

**Parameters**:
- `serial` - Controller serial number
- `current_ip` - Current IP address of controller
- `new_ip` - New IP address to assign
- `subnet_mask` - Subnet mask (e.g., 255.255.255.0)
- `gateway` - Gateway IP address

**Example**:
```bash
# Change controller IP from 192.168.1.100 to 192.168.1.150
node cli-unified.js set-network 123456789 192.168.1.100 192.168.1.150 255.255.255.0 192.168.1.1

# Output:
✅ Network configuration sent to controller
⚠️  Controller will restart with new IP: 192.168.1.150
```

**Important Notes**:
- Controller will restart after IP change
- Use current IP for communication, not the new IP
- Verify new IP is available on network

---

### `read-receiving-server` / `set-receiving-server`
**Purpose**: Configure server for receiving controller events

**Read Syntax**:
```bash
node cli-unified.js read-receiving-server <serial> <ip>
```

**Set Syntax**:
```bash
node cli-unified.js set-receiving-server <serial> <ip> <server_ip> <server_port>
```

**Examples**:
```bash
# Read current server configuration
node cli-unified.js read-receiving-server selected selected

# Set server to receive events
node cli-unified.js set-receiving-server selected selected 192.168.1.200 8080
```

---

## ⏰ **TIME MANAGEMENT COMMANDS**

### `read-time`
**Purpose**: Read current date and time from controller

**Syntax**:
```bash
node cli-unified.js read-time <serial> <ip>
```

**Example**:
```bash
node cli-unified.js read-time selected selected

# Output:
📅 Controller Time: 2025-06-14 14:30:25
🕐 System Time:     2025-06-14 14:30:27
⏱️  Time Difference: 2 seconds
```

---

### `sync-time`
**Purpose**: Synchronize controller time with system time

**Syntax**:
```bash
node cli-unified.js sync-time <serial> <ip>
```

**Example**:
```bash
node cli-unified.js sync-time selected selected

# Output:
🔄 Synchronizing time...
✅ Time synchronized successfully
📅 Controller time set to: 2025-06-14 14:30:25
```

---

## 🔐 **PRIVILEGE MANAGEMENT COMMANDS**

### `add-privilege`
**Purpose**: Add or modify card access privilege

**Syntax**:
```bash
node cli-unified.js add-privilege <serial> <ip> <card_number> <start_date> <end_date> <door1> <door2> <door3> <door4> [password]
```

**Parameters**:
- `card_number` - Card number (1-999999999, restrictions apply)
- `start_date` - Start date (YYYYMMDD format)
- `end_date` - End date (YYYYMMDD format)
- `door1-4` - Door permissions (1=enabled, 0=disabled)
- `password` - Optional 6-digit password (max 999999)

**Examples**:
```bash
# Add card with access to doors 1 and 3, no password
node cli-unified.js add-privilege selected selected 12345 20250611 20260611 1 0 1 0

# Add card with access to all doors and password
node cli-unified.js add-privilege selected selected 67890 20250101 20251231 1 1 1 1 123456

# Add temporary access (1 day)
node cli-unified.js add-privilege selected selected 99999 20250614 20250614 1 0 0 0
```

**Output**:
```
🔐 Adding Privilege
Card Number: 12345
Valid Period: 2025-06-11 to 2026-06-11
Door Access: Door1=✓, Door2=✗, Door3=✓, Door4=✗
Password: None

✅ Privilege added successfully
💾 Saved to database and local storage
```

---

### `delete-privilege`
**Purpose**: Remove card access privilege

**Syntax**:
```bash
node cli-unified.js delete-privilege <serial> <ip> <card_number>
```

**Example**:
```bash
node cli-unified.js delete-privilege selected selected 12345

# Output:
🗑️  Deleting privilege for card: 12345
✅ Privilege deleted successfully
```

---

### `clear-all-privileges`
**Purpose**: Remove ALL privileges (DANGEROUS operation)

**Syntax**:
```bash
node cli-unified.js clear-all-privileges <serial> <ip>
```

**Example**:
```bash
node cli-unified.js clear-all-privileges selected selected

# Output:
⚠️  WARNING: This will delete ALL privileges!
❓ Are you sure? (yes/no): yes
🗑️  Clearing all privileges...
✅ All privileges cleared
```

**Safety Features**:
- Requires explicit confirmation
- Uses identification bytes to prevent accidental execution
- Creates automatic backup before clearing

---

### `query-privilege`
**Purpose**: Check if a specific card has privileges

**Syntax**:
```bash
node cli-unified.js query-privilege <serial> <ip> <card_number>
```

**Example**:
```bash
node cli-unified.js query-privilege selected selected 12345

# Output (if found):
🔍 Privilege Found for Card: 12345
📅 Valid Period: 2025-06-11 to 2026-06-11
🚪 Door Access: Door1=✓, Door2=✗, Door3=✓, Door4=✗
🔒 Password: Set (6 digits)

# Output (if not found):
❌ No privilege found for card: 12345
```

---

### `read-total-privileges`
**Purpose**: Get total number of privileges stored in controller

**Syntax**:
```bash
node cli-unified.js read-total-privileges <serial> <ip>
```

**Example**:
```bash
node cli-unified.js read-total-privileges selected selected

# Output:
📊 Total Privileges: 1,247
💾 Controller Memory: 78% used (max ~1,600 privileges)
```

---

## 🚪 **DOOR CONTROL COMMANDS**

### `remote-open-door`
**Purpose**: Open a door remotely

**Syntax**:
```bash
node cli-unified.js remote-open-door <serial> <ip> <door_number>
```

**Parameters**:
- `door_number` - Door number (1, 2, 3, or 4)

**Examples**:
```bash
# Open door 1
node cli-unified.js remote-open-door selected selected 1

# Open door 3
node cli-unified.js remote-open-door selected selected 3
```

**Output**:
```
🚪 Opening Door 1...
✅ Door 1 opened successfully
🕐 Door will auto-close based on controller settings
```

---

### `read-door-control` / `set-door-control`
**Purpose**: Read or configure door control settings

**Read Syntax**:
```bash
node cli-unified.js read-door-control <serial> <ip>
```

**Set Syntax**:
```bash
node cli-unified.js set-door-control <serial> <ip> <settings>
```

**Example**:
```bash
# Read current door settings
node cli-unified.js read-door-control selected selected

# Output:
🚪 Door Control Settings:
Door 1: Auto-close 5s, Sensor enabled, Button enabled
Door 2: Auto-close 3s, Sensor enabled, Button disabled
Door 3: Manual close, Sensor disabled, Button enabled
Door 4: Auto-close 10s, Sensor enabled, Button enabled
```

---

## 📊 **STATUS & RECORDS COMMANDS**

### `query-status`
**Purpose**: Get comprehensive controller status

**Syntax**:
```bash
node cli-unified.js query-status <serial> <ip>
```

**Example**:
```bash
node cli-unified.js query-status selected selected

# Output:
📊 Controller Status (SN: 123456789)
🌐 IP Address: 192.168.1.100
🕐 Current Time: 14:30:25
🔋 Status: Online, No Errors

📝 Last Record:
   Index: 1234
   Type: Swipe card record
   Card: 12345
   Door: 1 (IN)
   Time: 2025-06-14 14:29:15
   Result: Access granted

🚪 Door Status:
   Door 1: Closed, Button: Not pressed
   Door 2: Closed, Button: Not pressed
   Door 3: Open, Button: Not pressed
   Door 4: Closed, Button: Not pressed
```

---

### `get-record`
**Purpose**: Retrieve a specific access record by index

**Syntax**:
```bash
node cli-unified.js get-record <serial> <ip> <record_index>
```

**Example**:
```bash
node cli-unified.js get-record selected selected 1234

# Output:
📝 Record #1234
🕐 Time: 2025-06-14 14:29:15
💳 Card: 12345
🚪 Door: 1 (Direction: IN)
✅ Result: Access granted
🔍 Reason: Valid card, within time range
```

---

### `get-read-record-index` / `set-read-record-index`
**Purpose**: Manage the record reading index pointer

**Get Syntax**:
```bash
node cli-unified.js get-read-record-index <serial> <ip>
```

**Set Syntax**:
```bash
node cli-unified.js set-read-record-index <serial> <ip> <index>
```

**Examples**:
```bash
# Get current record index
node cli-unified.js get-read-record-index selected selected
# Output: 📍 Current record index: 1234

# Set record index to start reading from record 1000
node cli-unified.js set-read-record-index selected selected 1000
# Output: ✅ Record index set to: 1000
```

---

## 💾 **DATA MANAGEMENT COMMANDS**

### `data-manager sync`
**Purpose**: Synchronize data between database and local storage

**Syntax**:
```bash
node cli-unified.js data-manager sync [--to-db] [--from-db] [--both]
```

**Options**:
- `--to-db` - Sync local data to database
- `--from-db` - Sync database data to local storage
- `--both` - Sync in both directions

**Examples**:
```bash
# Interactive sync (prompts for direction)
node cli-unified.js data-manager sync

# Sync local data to database
node cli-unified.js data-manager sync --to-db

# Sync database to local storage
node cli-unified.js data-manager sync --from-db

# Sync both directions
node cli-unified.js data-manager sync --both
```

---

### `data-manager backup`
**Purpose**: Create versioned backup of all local data

**Syntax**:
```bash
node cli-unified.js data-manager backup [--verbose]
```

**Example**:
```bash
node cli-unified.js data-manager backup --verbose

# Output:
💾 Creating Data Backup

✅ Backed up Controllers
✅ Backed up Privileges  
✅ Backed up Records

Backup completed: 3/3 files backed up
📁 Backup ID: 2025-06-14T14-30-25-123Z
```

---

### `data-manager status`
**Purpose**: Check data storage status and health

**Syntax**:
```bash
node cli-unified.js data-manager status
```

**Example Output**:
```
📊 Data Storage Status

✓ Data Directory: /home/user/.controller-config/data (exists)
✓ Backup Directory: /home/user/.controller-config/data/backups (exists)

Type         Status  Size     Records  Modified
Controllers  ✓       15.2 KB  12       2025-06-14
Privileges   ✓       8.7 KB   247      2025-06-14
Records      ✓       125.4 KB 1,234    2025-06-14

📡 Database Connectivity:
✓ Database connection successful

💾 Backups: 5 available
   Latest: 2025-06-14T14-30-25-123Z (3 files)
```

---

## 🎯 **INTERACTIVE COMMANDS**

### `dashboard`
**Purpose**: Launch interactive dashboard with real-time monitoring

**Syntax**:
```bash
node cli-unified.js dashboard
```

**Features**:
- Real-time controller status
- Quick action buttons
- Live record monitoring
- Interactive privilege management

---

### `wizard`
**Purpose**: Guided setup wizard for first-time users

**Syntax**:
```bash
node cli-unified.js wizard
```

**Process**:
1. System health check
2. Network discovery
3. Controller selection
4. Basic configuration
5. Test operations

---

### `quick`
**Purpose**: Quick action menu for common operations

**Syntax**:
```bash
node cli-unified.js quick
```

**Available Actions**:
- Quick privilege add
- Emergency door open
- Time sync
- Status check
- Backup creation

---

## 🔧 **UTILITY COMMANDS**

### `list-commands`
**Purpose**: Display all available commands with descriptions

**Syntax**:
```bash
node cli-unified.js list-commands
```

**Output**: Categorized list of all commands with descriptions

---

## 📝 **Usage Examples by Scenario**

### Daily Operations
```bash
# Morning routine
node cli-unified.js query-status selected selected
node cli-unified.js sync-time selected selected

# Add temporary visitor access
node cli-unified.js add-privilege selected selected 99999 20250614 20250614 1 0 0 0

# Emergency door open
node cli-unified.js remote-open-door selected selected 1

# End of day backup
node cli-unified.js data-manager backup
```

### Bulk Setup
```bash
# Discover all controllers
node cli-unified.js enhanced-discover

# Use wizard for guided setup
node cli-unified.js wizard

# Sync all data
node cli-unified.js data-manager sync --both
```

### Troubleshooting
```bash
# System diagnostics
node cli-unified.js doctor --fix

# Check specific controller
node cli-unified.js --debug query-status 123456789 192.168.1.100

# Work offline if database issues
node cli-unified.js --offline enhanced-discover
```
