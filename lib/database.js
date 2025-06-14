const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const os = require('os');

const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const tableName = 'controllers';

// Local storage paths
const dataDir = path.join(os.homedir(), '.controller-config', 'data');
const controllersFile = path.join(dataDir, 'controllers.json');
const privilegesFile = path.join(dataDir, 'privileges.json');
const recordsFile = path.join(dataDir, 'records.json');
const backupDir = path.join(dataDir, 'backups');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Ensure data directories exist
function ensureDataDirectories() {
    [dataDir, backupDir].forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
}

// Enhanced data persistence with local backup
async function saveToLocalStorage(data, filePath) {
    ensureDataDirectories();
    try {
        // Create backup before saving
        if (fs.existsSync(filePath)) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(backupDir, `${path.basename(filePath, '.json')}_${timestamp}.json`);
            fs.copyFileSync(filePath, backupPath);
        }

        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving to local storage:', error);
        return false;
    }
}

function loadFromLocalStorage(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }
    } catch (error) {
        console.error('Error loading from local storage:', error);
    }
    return null;
}

async function upsertController(controller) {
    ensureDataDirectories();

    // Try database first
    let dbResult = null;
    try {
        const { data, error } = await supabase
            .from(tableName)
            .upsert(controller, { onConflict: 'device_serial_number' })
            .select();

        if (error) {
            console.warn('Database save failed, using local storage:', error.message);
        } else {
            console.log('Controller data saved/updated in database:', data);
            dbResult = data;
        }
    } catch (dbError) {
        console.warn('Database connection failed, using local storage:', dbError.message);
    }

    // Always save to local storage as backup
    const localControllers = loadFromLocalStorage(controllersFile) || [];
    const existingIndex = localControllers.findIndex(c =>
        c.device_serial_number === controller.device_serial_number
    );

    const updatedController = {
        ...controller,
        updated_at: new Date().toISOString(),
        created_at: controller.created_at || new Date().toISOString()
    };

    if (existingIndex >= 0) {
        localControllers[existingIndex] = updatedController;
    } else {
        localControllers.push(updatedController);
    }

    const localSaved = await saveToLocalStorage(localControllers, controllersFile);

    if (localSaved) {
        console.log('Controller data saved to local storage');
        return dbResult || [updatedController];
    }

    return null;
}

async function getControllers() {
    // Try database first
    try {
        const { data, error } = await supabase
            .from(tableName)
            .select('*');

        if (!error && data) {
            // Sync with local storage
            await saveToLocalStorage(data, controllersFile);
            return data;
        } else {
            console.warn('Database fetch failed, using local storage:', error?.message);
        }
    } catch (dbError) {
        console.warn('Database connection failed, using local storage:', dbError.message);
    }

    // Fallback to local storage
    const localData = loadFromLocalStorage(controllersFile);
    return localData || [];
}

async function deleteController(deviceSn) {
    let dbSuccess = false;

    // Try database first
    try {
        const { error } = await supabase
            .from(tableName)
            .delete()
            .eq('device_serial_number', deviceSn);

        if (!error) {
            console.log(`Controller with SN ${deviceSn} deleted from database.`);
            dbSuccess = true;
        } else {
            console.warn('Database delete failed, updating local storage:', error.message);
        }
    } catch (dbError) {
        console.warn('Database connection failed, updating local storage:', dbError.message);
    }

    // Always update local storage
    const localControllers = loadFromLocalStorage(controllersFile) || [];
    const filteredControllers = localControllers.filter(c =>
        c.device_serial_number !== deviceSn
    );

    const localSaved = await saveToLocalStorage(filteredControllers, controllersFile);

    if (localSaved) {
        console.log(`Controller with SN ${deviceSn} deleted from local storage.`);
        return true;
    }

    return dbSuccess;
}

// Privilege management functions
async function upsertPrivilege(privilege) {
    ensureDataDirectories();

    // Try database first
    let dbResult = null;
    try {
        // Map privilege data to database schema
        const privilegeData = {
            device_serial_number: privilege.device_serial_number,
            card_number: privilege.card_number,
            start_date: privilege.start_date || privilege.startDate,
            end_date: privilege.end_date || privilege.endDate,
            door1_enabled: privilege.door1 || privilege.door1_enabled || false,
            door2_enabled: privilege.door2 || privilege.door2_enabled || false,
            door3_enabled: privilege.door3 || privilege.door3_enabled || false,
            door4_enabled: privilege.door4 || privilege.door4_enabled || false,
            password: privilege.password || null,
            created_at: privilege.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('privileges')
            .upsert(privilegeData, {
                onConflict: 'device_serial_number,card_number',
                ignoreDuplicates: false
            })
            .select();

        if (error) {
            console.warn('Database privilege save failed, using local storage:', error.message);
        } else {
            console.log('Privilege data saved/updated in database:', data);
            dbResult = data;
        }
    } catch (dbError) {
        console.warn('Database connection failed, using local storage:', dbError.message);
    }

    // Always save to local storage as backup
    const localPrivileges = loadFromLocalStorage(privilegesFile) || [];
    const existingIndex = localPrivileges.findIndex(p =>
        p.card_number === privilege.card_number &&
        p.device_serial_number === privilege.device_serial_number
    );

    const updatedPrivilege = {
        ...privilege,
        updated_at: new Date().toISOString(),
        created_at: privilege.created_at || new Date().toISOString()
    };

    if (existingIndex >= 0) {
        localPrivileges[existingIndex] = updatedPrivilege;
    } else {
        localPrivileges.push(updatedPrivilege);
    }

    const saved = await saveToLocalStorage(localPrivileges, privilegesFile);

    if (saved) {
        console.log('Privilege data saved to local storage');
        return dbResult || [updatedPrivilege];
    }

    return null;
}

async function getPrivileges(deviceSn = null) {
    const localData = loadFromLocalStorage(privilegesFile) || [];
    return deviceSn ? localData.filter(p => p.device_serial_number === deviceSn) : localData;
}

async function deletePrivilege(deviceSn, cardNumber) {
    const localPrivileges = loadFromLocalStorage(privilegesFile) || [];
    const filteredPrivileges = localPrivileges.filter(p =>
        !(p.device_serial_number === deviceSn && p.card_number === cardNumber)
    );

    return await saveToLocalStorage(filteredPrivileges, privilegesFile);
}

// Record management functions
async function saveRecord(record) {
    ensureDataDirectories();

    // Try database first
    let dbResult = null;
    try {
        // Map record data to database schema
        const recordData = {
            device_serial_number: record.device_serial_number,
            record_index: record.record_index || record.index,
            record_type: record.record_type || record.type,
            validity: record.validity || false,
            door_number: record.door_number || record.doorNumber,
            direction: record.direction === 'IN' ? 1 : (record.direction === 'OUT' ? 2 : record.direction),
            card_number: record.card_number || record.cardNumber || null,
            swipe_time: record.swipe_time || record.timestamp || new Date().toISOString(),
            reason_code: record.reason_code || record.reasonCode || null,
            record_type_description: record.record_type_description || record.typeDescription || null,
            saved_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('records')
            .upsert(recordData, {
                onConflict: 'device_serial_number,record_index',
                ignoreDuplicates: false
            })
            .select();

        if (error) {
            console.warn('Database record save failed, using local storage:', error.message);
        } else {
            console.log('Record data saved/updated in database:', data);
            dbResult = data;
        }
    } catch (dbError) {
        console.warn('Database connection failed, using local storage:', dbError.message);
    }

    // Always save to local storage as backup
    const localRecords = loadFromLocalStorage(recordsFile) || [];
    const recordWithTimestamp = {
        ...record,
        saved_at: new Date().toISOString()
    };

    localRecords.push(recordWithTimestamp);

    // Keep only last 10000 records to prevent file from growing too large
    if (localRecords.length > 10000) {
        localRecords.splice(0, localRecords.length - 10000);
    }

    const saved = await saveToLocalStorage(localRecords, recordsFile);

    if (saved) {
        console.log('Record data saved to local storage');
        return dbResult || [recordWithTimestamp];
    }

    return false;
}

async function getRecords(deviceSn = null, limit = 100) {
    const localData = loadFromLocalStorage(recordsFile) || [];
    let filtered = deviceSn ? localData.filter(r => r.device_serial_number === deviceSn) : localData;

    // Return most recent records first
    return filtered.slice(-limit).reverse();
}

// Data synchronization functions
async function syncToDatabase() {
    console.log('Starting data synchronization to database...');

    try {
        // Sync controllers
        const localControllers = loadFromLocalStorage(controllersFile) || [];
        for (const controller of localControllers) {
            try {
                await supabase
                    .from(tableName)
                    .upsert(controller, { onConflict: 'device_serial_number' });
            } catch (error) {
                console.warn(`Failed to sync controller ${controller.device_serial_number}:`, error.message);
            }
        }

        console.log(`Synchronized ${localControllers.length} controllers to database`);
        return true;
    } catch (error) {
        console.error('Synchronization failed:', error);
        return false;
    }
}

async function syncFromDatabase() {
    console.log('Starting data synchronization from database...');

    try {
        const { data, error } = await supabase
            .from(tableName)
            .select('*');

        if (!error && data) {
            await saveToLocalStorage(data, controllersFile);
            console.log(`Synchronized ${data.length} controllers from database`);
            return true;
        } else {
            console.warn('Failed to sync from database:', error?.message);
            return false;
        }
    } catch (error) {
        console.error('Synchronization failed:', error);
        return false;
    }
}

module.exports = {
    // Controller functions
    upsertController,
    getControllers,
    deleteController,

    // Privilege functions
    upsertPrivilege,
    getPrivileges,
    deletePrivilege,

    // Record functions
    saveRecord,
    getRecords,

    // Synchronization functions
    syncToDatabase,
    syncFromDatabase,

    // Utility functions
    saveToLocalStorage,
    loadFromLocalStorage,
    ensureDataDirectories
};