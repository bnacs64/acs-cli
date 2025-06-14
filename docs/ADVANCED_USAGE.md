# Controller Configurator - Advanced Usage Guide

## 🎯 **Advanced Configuration**

### Environment Variables
```bash
# Database Configuration
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_ANON_KEY="your-anon-key"

# Operational Modes
export OFFLINE_MODE="true"                    # Force offline mode
export NODE_ENV="development"                 # Enable debug features
export DEBUG="controller:*"                  # Enable debug logging

# Custom Paths
export CONTROLLER_CONFIG_DIR="/custom/path"  # Custom config directory
export CONTROLLER_DATA_DIR="/custom/data"    # Custom data directory
```

### Configuration File
Location: `~/.controller-config/config.json`

```json
{
  "selectedController": {
    "device_serial_number": 123456789,
    "ip_address": "192.168.1.100"
  },
  "discovery": {
    "timeout": 5000,
    "retries": 3,
    "broadcastIp": "255.255.255.255"
  },
  "database": {
    "syncInterval": 300000,
    "autoBackup": true,
    "maxBackups": 10
  },
  "ui": {
    "colorOutput": true,
    "verboseMode": false,
    "jsonOutput": false
  }
}
```

## 🔄 **Automation & Scripting**

### Batch Operations Script
```bash
#!/bin/bash
# bulk-add-privileges.sh

# Read CSV file and add privileges
while IFS=',' read -r card_number start_date end_date doors password; do
    echo "Adding privilege for card: $card_number"
    node cli-unified.js add-privilege selected selected \
        "$card_number" "$start_date" "$end_date" \
        ${doors:0:1} ${doors:1:1} ${doors:2:1} ${doors:3:1} \
        "$password"
done < privileges.csv
```

### Monitoring Script
```bash
#!/bin/bash
# monitor-controllers.sh

while true; do
    echo "=== $(date) ==="
    
    # Check all controllers
    node cli-unified.js --json query-status selected selected | \
        jq '.online, .lastRecord.timestamp, .errorNumber'
    
    # Wait 5 minutes
    sleep 300
done
```

### Backup Automation
```bash
#!/bin/bash
# daily-backup.sh

# Create daily backup
node cli-unified.js data-manager backup --verbose

# Sync to database
node cli-unified.js data-manager sync --to-db

# Clean old backups (keep last 30 days)
find ~/.controller-config/data/backups -name "*.json" -mtime +30 -delete

echo "Daily backup completed: $(date)"
```

## 📊 **Data Analysis & Reporting**

### Export Data for Analysis
```bash
# Export all data in JSON format
node cli-unified.js --json data-manager status > system-status.json

# Export controller data
node cli-unified.js --json enhanced-discover --skip-persist > controllers.json

# Export privilege summary
node cli-unified.js --json read-total-privileges selected selected > privilege-count.json
```

### Generate Reports
```javascript
// report-generator.js
const fs = require('fs');
const { getControllers, getPrivileges, getRecords } = require('./lib/database');

async function generateReport() {
    const controllers = await getControllers();
    const privileges = await getPrivileges();
    const records = await getRecords();
    
    const report = {
        timestamp: new Date().toISOString(),
        summary: {
            totalControllers: controllers.length,
            onlineControllers: controllers.filter(c => c.online).length,
            totalPrivileges: privileges.length,
            totalRecords: records.length
        },
        controllers: controllers.map(c => ({
            serial: c.device_serial_number,
            ip: c.ip_address,
            online: c.online,
            lastSeen: c.last_seen,
            privilegeCount: privileges.filter(p => p.device_serial_number === c.device_serial_number).length
        }))
    };
    
    fs.writeFileSync(`report-${Date.now()}.json`, JSON.stringify(report, null, 2));
    console.log('Report generated successfully');
}

generateReport().catch(console.error);
```

## 🔧 **Custom Commands & Extensions**

### Creating Custom Commands
```javascript
// commands/custom-bulk-add.js
const { BaseCommand } = require('../lib/baseCommand');

class CustomBulkAddCommand extends BaseCommand {
    async execute(csvFile) {
        const fs = require('fs');
        const csv = fs.readFileSync(csvFile, 'utf8');
        
        const lines = csv.split('\n').slice(1); // Skip header
        
        for (const line of lines) {
            const [card, start, end, doors, password] = line.split(',');
            
            try {
                await this.addPrivilege({
                    card_number: parseInt(card),
                    start_date: start,
                    end_date: end,
                    door1: doors[0] === '1',
                    door2: doors[1] === '1',
                    door3: doors[2] === '1',
                    door4: doors[3] === '1',
                    password: password ? parseInt(password) : null
                });
                
                this.ui.success(`Added privilege for card ${card}`);
            } catch (error) {
                this.ui.error(`Failed to add card ${card}: ${error.message}`);
            }
        }
    }
}

module.exports = {
    register: (program) => {
        program
            .command('bulk-add <csv-file>')
            .description('Bulk add privileges from CSV file')
            .action(async (csvFile) => {
                const command = new CustomBulkAddCommand();
                await command.execute(csvFile);
                command.cleanup();
            });
    }
};
```

### CSV Format for Bulk Operations
```csv
card_number,start_date,end_date,doors,password
12345,20250611,20260611,1100,
67890,20250611,20251211,1010,123456
99999,20250614,20250614,1000,999999
```

## 🌐 **Network & Security**

### Advanced Network Configuration
```bash
# Configure multiple controllers with different network settings
for controller in 123456789 987654321 555666777; do
    echo "Configuring controller: $controller"
    
    # Read current network settings
    node cli-unified.js --json read-network $controller auto | \
        jq '.ip_address, .subnet_mask, .gateway'
    
    # Set new network configuration if needed
    # node cli-unified.js set-network $controller current_ip new_ip mask gateway
done
```

### Security Monitoring
```bash
# Monitor for unauthorized access attempts
node cli-unified.js --json get-record selected selected auto | \
    jq 'select(.validity == false)' | \
    while read -r record; do
        echo "Unauthorized access attempt: $record"
        # Send alert notification
    done
```

### Firewall Configuration
```bash
# Allow UDP traffic on port 60000 for controller communication
sudo ufw allow 60000/udp comment "Controller communication"

# Allow specific controller IPs only
sudo ufw allow from 192.168.1.100 to any port 60000
sudo ufw allow from 192.168.1.101 to any port 60000
```

## 📈 **Performance Optimization**

### Database Optimization
```sql
-- Create additional indexes for better performance
CREATE INDEX CONCURRENTLY idx_records_timestamp ON records(swipe_time);
CREATE INDEX CONCURRENTLY idx_privileges_active ON privileges(start_date, end_date) 
    WHERE start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE;

-- Partition large tables by date
CREATE TABLE records_2025 PARTITION OF records 
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
```

### Local Storage Optimization
```bash
# Compress old backup files
find ~/.controller-config/data/backups -name "*.json" -mtime +7 -exec gzip {} \;

# Archive old records
node -e "
const fs = require('fs');
const records = JSON.parse(fs.readFileSync('~/.controller-config/data/records.json'));
const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days ago
const recent = records.filter(r => new Date(r.saved_at) > cutoff);
fs.writeFileSync('~/.controller-config/data/records.json', JSON.stringify(recent, null, 2));
"
```

## 🔍 **Debugging & Troubleshooting**

### Advanced Debugging
```bash
# Enable comprehensive debugging
DEBUG="controller:*,supabase:*" NODE_ENV=development \
    node cli-unified.js --debug --verbose enhanced-discover

# Network packet capture
sudo tcpdump -i any -w controller-traffic.pcap port 60000

# Analyze packet capture
wireshark controller-traffic.pcap
```

### Log Analysis
```bash
# Parse application logs
tail -f ~/.controller-config/logs/app.log | \
    grep -E "(ERROR|WARN)" | \
    while read line; do
        echo "$(date): $line"
        # Send to monitoring system
    done

# Database query performance
psql -h localhost -d postgres -c "
SELECT query, mean_time, calls 
FROM pg_stat_statements 
WHERE query LIKE '%controllers%' 
ORDER BY mean_time DESC;
"
```

### Health Monitoring
```javascript
// health-monitor.js
const { getControllers } = require('./lib/database');
const { ControllerSDK } = require('./lib/sdkImplementation');

async function healthCheck() {
    const controllers = await getControllers();
    const sdk = new ControllerSDK();
    
    for (const controller of controllers) {
        try {
            const status = await sdk.queryControllerStatus(
                controller.device_serial_number,
                controller.ip_address
            );
            
            if (status.errorNumber !== 0) {
                console.warn(`Controller ${controller.device_serial_number} has error: ${status.errorNumber}`);
                // Send alert
            }
            
            if (status.doorStatus.sensors.some(s => s)) {
                console.warn(`Controller ${controller.device_serial_number} has open doors`);
                // Send alert
            }
            
        } catch (error) {
            console.error(`Controller ${controller.device_serial_number} is offline: ${error.message}`);
            // Send alert
        }
    }
}

// Run health check every 5 minutes
setInterval(healthCheck, 5 * 60 * 1000);
```

## 🚀 **Integration Examples**

### REST API Integration
```javascript
// api-server.js
const express = require('express');
const { getControllers, addPrivilege } = require('./lib/database');

const app = express();
app.use(express.json());

// Get all controllers
app.get('/api/controllers', async (req, res) => {
    try {
        const controllers = await getControllers();
        res.json(controllers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add privilege via API
app.post('/api/privileges', async (req, res) => {
    try {
        const result = await addPrivilege(req.body);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(3000, () => {
    console.log('API server running on port 3000');
});
```

### Webhook Integration
```javascript
// webhook-handler.js
const express = require('express');
const { saveRecord } = require('./lib/database');

const app = express();
app.use(express.json());

// Receive controller events via webhook
app.post('/webhook/controller-event', async (req, res) => {
    const { device_serial_number, record } = req.body;
    
    try {
        await saveRecord({
            device_serial_number,
            ...record,
            received_at: new Date().toISOString()
        });
        
        // Process event (send notifications, trigger actions, etc.)
        if (record.validity === false) {
            // Unauthorized access attempt
            await sendSecurityAlert(device_serial_number, record);
        }
        
        res.json({ status: 'success' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(8080, () => {
    console.log('Webhook handler running on port 8080');
});
```

## 📱 **Mobile & Web Integration**

### Web Dashboard
```html
<!-- dashboard.html -->
<!DOCTYPE html>
<html>
<head>
    <title>Controller Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <div id="controller-status"></div>
    <canvas id="access-chart"></canvas>
    
    <script>
        // Fetch controller status
        fetch('/api/controllers')
            .then(response => response.json())
            .then(controllers => {
                const statusDiv = document.getElementById('controller-status');
                controllers.forEach(controller => {
                    const div = document.createElement('div');
                    div.innerHTML = `
                        <h3>Controller ${controller.device_serial_number}</h3>
                        <p>Status: ${controller.online ? 'Online' : 'Offline'}</p>
                        <p>IP: ${controller.ip_address}</p>
                    `;
                    statusDiv.appendChild(div);
                });
            });
    </script>
</body>
</html>
```

### Mobile App Integration
```javascript
// mobile-api.js
const { ControllerSDK } = require('./lib/sdkImplementation');

class MobileAPI {
    constructor() {
        this.sdk = new ControllerSDK();
    }
    
    async openDoorRemotely(controllerId, doorNumber, userAuth) {
        // Verify user authorization
        if (!await this.verifyUserAuth(userAuth)) {
            throw new Error('Unauthorized');
        }
        
        // Log the action
        console.log(`User ${userAuth.userId} opening door ${doorNumber} on controller ${controllerId}`);
        
        // Open the door
        return await this.sdk.remoteOpenDoor(controllerId, doorNumber);
    }
    
    async verifyUserAuth(auth) {
        // Implement your authentication logic
        return true;
    }
}

module.exports = { MobileAPI };
```

---

## 💡 **Best Practices for Advanced Users**

1. **Use environment variables** for sensitive configuration
2. **Implement proper error handling** in custom scripts
3. **Monitor system performance** regularly
4. **Create automated backups** with retention policies
5. **Use database transactions** for bulk operations
6. **Implement proper logging** for audit trails
7. **Set up monitoring alerts** for critical events
8. **Use version control** for custom configurations
9. **Test changes** in development environment first
10. **Document custom integrations** for maintenance
