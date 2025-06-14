# Controller Configurator - Quick Reference Card

## 🚀 **Essential Commands**

### First-Time Setup
```bash
node cli-unified.js doctor --fix              # Check system health
node cli-unified.js enhanced-discover         # Find controllers
node cli-unified.js select-controller         # Set default controller
```

### Daily Operations
```bash
node cli-unified.js query-status selected selected                    # Check status
node cli-unified.js add-privilege selected selected 12345 20250611 20260611 1 0 0 0  # Add card
node cli-unified.js remote-open-door selected selected 1              # Open door
node cli-unified.js sync-time selected selected                       # Sync time
```

### Data Management
```bash
node cli-unified.js data-manager sync --both    # Sync all data
node cli-unified.js data-manager backup         # Create backup
node cli-unified.js data-manager status         # Check storage
```

## 📋 **Parameter Quick Guide**

### Common Patterns
- `selected selected` - Use default controller (after select-controller)
- `123456789 192.168.1.100` - Specific controller by serial and IP
- `20250611` - Date format (YYYYMMDD) for June 11, 2025
- `1 0 1 0` - Door permissions (doors 1 and 3 enabled)

### Card Numbers
- ✅ Valid: `1` to `999999999`
- ❌ Invalid: `0`, `4294967295`, `16777215`

### Passwords
- Optional 6-digit number (max `999999`)
- Use `0` or omit for no password

## 🎯 **Common Use Cases**

### Add New Employee Card
```bash
# Full access, 1 year validity
node cli-unified.js add-privilege selected selected 12345 20250611 20260611 1 1 1 1

# Limited access (door 1 only), 6 months
node cli-unified.js add-privilege selected selected 67890 20250611 20251211 1 0 0 0
```

### Temporary Visitor Access
```bash
# Today only, door 1, with password
node cli-unified.js add-privilege selected selected 99999 20250614 20250614 1 0 0 0 123456
```

### Emergency Operations
```bash
# Open all doors
node cli-unified.js remote-open-door selected selected 1
node cli-unified.js remote-open-door selected selected 2
node cli-unified.js remote-open-door selected selected 3
node cli-unified.js remote-open-door selected selected 4

# Check system status
node cli-unified.js query-status selected selected
```

### Maintenance Tasks
```bash
# Weekly backup
node cli-unified.js data-manager backup

# Monthly cleanup
node cli-unified.js data-manager cleanup

# Check privilege count
node cli-unified.js read-total-privileges selected selected
```

## 🔧 **Troubleshooting Quick Fixes**

### Connection Issues
```bash
node cli-unified.js doctor                    # Diagnose issues
node cli-unified.js --offline <command>       # Work offline
node cli-unified.js enhanced-discover         # Rediscover controllers
```

### Data Issues
```bash
node cli-unified.js data-manager status       # Check data health
node cli-unified.js data-manager sync --both  # Sync everything
node cli-unified.js data-manager restore      # Restore from backup
```

### Debug Mode
```bash
node cli-unified.js --debug --verbose <command>  # Full debug output
```

## 📊 **Status Codes & Meanings**

### Controller Status
- 🟢 **Online** - Controller responding normally
- 🟡 **Recently Seen** - Last seen within 1 hour
- 🔴 **Offline** - No response for over 1 hour

### Door Status
- **Closed** - Door sensor shows closed
- **Open** - Door sensor shows open
- **Button Pressed** - Exit button is pressed

### Record Types
- **Type 1** - Card swipe record
- **Type 2** - Door sensor/button/remote open
- **Type 3** - Alarm record
- **Type 255** - Overwritten record

## 🎮 **Interactive Tools**

### Dashboard
```bash
node cli-unified.js dashboard
```
- Real-time monitoring
- Quick actions
- Visual status display

### Wizard
```bash
node cli-unified.js wizard
```
- Guided setup
- Step-by-step configuration
- Automatic discovery

### Quick Menu
```bash
node cli-unified.js quick
```
- Common operations
- Preset configurations
- Batch actions

## 📁 **File Locations**

### Configuration
```
~/.controller-config/config.json              # Main configuration
```

### Data Storage
```
~/.controller-config/data/
├── controllers.json                          # Controller data
├── privileges.json                           # Privilege data
├── records.json                              # Access records
└── backups/                                  # Versioned backups
```

### Logs
```
~/.controller-config/logs/                    # Operation logs
```

## 🔐 **Security Best Practices**

### Card Management
- Use unique card numbers for each person
- Set appropriate expiration dates
- Regularly audit privilege lists
- Remove terminated employees immediately

### Access Control
- Limit door permissions to minimum required
- Use passwords for sensitive areas
- Monitor access records regularly
- Set up automated backups

### System Security
- Keep controller firmware updated
- Use secure network configurations
- Regular system health checks
- Monitor for unauthorized access

## 📞 **Help & Support**

### Built-in Help
```bash
node cli-unified.js --help                    # General help
node cli-unified.js <command> --help          # Command help
node cli-unified.js list-commands             # All commands
```

### Documentation
- `docs/CLI_USER_GUIDE.md` - Complete user guide
- `docs/COMMAND_REFERENCE.md` - Detailed command reference
- `README.md` - System overview and setup

### Debug Information
```bash
node cli-unified.js doctor                    # System diagnostics
node cli-unified.js data-manager status       # Data status
node cli-unified.js --debug <command>         # Debug mode
```

---

## 💡 **Pro Tips**

1. **Use "selected" parameters** after running `select-controller` to avoid typing serial numbers and IPs repeatedly

2. **Enable offline mode** with `--offline` flag when database is unavailable

3. **Create regular backups** before making bulk changes to privileges

4. **Use the wizard** for first-time setup - it handles discovery and configuration automatically

5. **Monitor controller status** regularly with the dashboard for real-time insights

6. **Set up environment variables** for Supabase to avoid connection issues

7. **Use JSON output** with `--json` flag for scripting and automation

8. **Check system health** with `doctor --fix` before troubleshooting other issues
