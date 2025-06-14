-- Controllers table - aligned with main_sdk.txt and enhanced discovery
CREATE TABLE controllers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Core controller identification (from main_sdk.txt)
    device_serial_number BIGINT UNIQUE NOT NULL,

    -- Network configuration (from main_sdk.txt discovery response)
    ip_address INET NOT NULL,
    subnet_mask INET NOT NULL,
    gateway INET NOT NULL,
    mac_address MACADDR NOT NULL,

    -- Driver information (from main_sdk.txt)
    driver_version TEXT NOT NULL,
    driver_release_date TEXT NOT NULL, -- Changed to TEXT for BCD format compatibility

    -- Enhanced discovery fields (from enhanced-discover.js)
    discovered_at TIMESTAMP WITH TIME ZONE,
    last_seen TIMESTAMP WITH TIME ZONE,
    online BOOLEAN DEFAULT false,
    status_error TEXT,

    -- Real-time status data (JSON for flexibility)
    status JSONB,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable the uuid-ossp extension for uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create a function to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update the updated_at column on each update
CREATE TRIGGER update_controllers_updated_at
BEFORE UPDATE ON controllers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Privileges table - based on main_sdk.txt Function ID 0x50
CREATE TABLE privileges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Controller reference
    device_serial_number BIGINT NOT NULL REFERENCES controllers(device_serial_number) ON DELETE CASCADE,

    -- Card information (from main_sdk.txt)
    card_number BIGINT NOT NULL, -- Cannot be 0, 0xffffffff, 0x00ffffff

    -- Date range (YYYYMMDD format from main_sdk.txt)
    start_date TEXT NOT NULL, -- Format: YYYYMMDD (e.g., "20250611")
    end_date TEXT NOT NULL,   -- Format: YYYYMMDD (e.g., "20291231")

    -- Door permissions (from main_sdk.txt)
    door1_enabled BOOLEAN DEFAULT false,
    door2_enabled BOOLEAN DEFAULT false,
    door3_enabled BOOLEAN DEFAULT false,
    door4_enabled BOOLEAN DEFAULT false,

    -- Password (from main_sdk.txt - max 6 digits, up to 999999)
    password INTEGER DEFAULT NULL, -- NULL if no password set

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Unique constraint for card per controller
    UNIQUE(device_serial_number, card_number)
);

-- Records table - based on main_sdk.txt Function ID 0xB0 and status query
CREATE TABLE records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Controller reference
    device_serial_number BIGINT NOT NULL REFERENCES controllers(device_serial_number) ON DELETE CASCADE,

    -- Record identification (from main_sdk.txt)
    record_index BIGINT NOT NULL,

    -- Record type (from main_sdk.txt)
    record_type SMALLINT NOT NULL, -- 0=no record, 1=swipe card, 2=door sensor/button/remote, 3=alarm, 255=overwritten

    -- Validity and access info
    validity BOOLEAN NOT NULL, -- 0=not passed, 1=passed
    door_number SMALLINT NOT NULL, -- 1,2,3,4
    direction SMALLINT NOT NULL, -- 1=IN, 2=OUT

    -- Card or event number
    card_number BIGINT,

    -- Timestamp (from main_sdk.txt - BCD format converted to timestamp)
    swipe_time TIMESTAMP WITH TIME ZONE NOT NULL,

    -- Reason code (from main_sdk.txt)
    reason_code SMALLINT,

    -- Additional metadata
    record_type_description TEXT,
    saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Index for efficient queries
    UNIQUE(device_serial_number, record_index)
);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_privileges_updated_at
BEFORE UPDATE ON privileges
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_controllers_device_sn ON controllers(device_serial_number);
CREATE INDEX idx_controllers_ip_address ON controllers(ip_address);
CREATE INDEX idx_controllers_online ON controllers(online);
CREATE INDEX idx_controllers_last_seen ON controllers(last_seen);

CREATE INDEX idx_privileges_device_sn ON privileges(device_serial_number);
CREATE INDEX idx_privileges_card_number ON privileges(card_number);
CREATE INDEX idx_privileges_date_range ON privileges(start_date, end_date);

CREATE INDEX idx_records_device_sn ON records(device_serial_number);
CREATE INDEX idx_records_record_index ON records(record_index);
CREATE INDEX idx_records_swipe_time ON records(swipe_time);
CREATE INDEX idx_records_card_number ON records(card_number);
CREATE INDEX idx_records_type ON records(record_type);

-- Add constraints based on main_sdk.txt specifications
ALTER TABLE controllers ADD CONSTRAINT chk_device_sn_format
    CHECK (device_serial_number > 0 AND device_serial_number <= 999999999); -- 9 digits max

ALTER TABLE privileges ADD CONSTRAINT chk_card_number_valid
    CHECK (card_number > 0 AND card_number != 4294967295 AND card_number != 16777215); -- Not 0, 0xffffffff, 0x00ffffff

ALTER TABLE privileges ADD CONSTRAINT chk_password_range
    CHECK (password IS NULL OR (password >= 0 AND password <= 999999)); -- Max 6 digits

ALTER TABLE privileges ADD CONSTRAINT chk_date_format
    CHECK (start_date ~ '^[0-9]{8}$' AND end_date ~ '^[0-9]{8}$'); -- YYYYMMDD format

ALTER TABLE records ADD CONSTRAINT chk_record_type_valid
    CHECK (record_type IN (0, 1, 2, 3, 255)); -- Valid record types from main_sdk.txt

ALTER TABLE records ADD CONSTRAINT chk_door_number_valid
    CHECK (door_number >= 1 AND door_number <= 4); -- Doors 1-4

ALTER TABLE records ADD CONSTRAINT chk_direction_valid
    CHECK (direction IN (1, 2)); -- 1=IN, 2=OUT

-- Add comments for documentation
COMMENT ON TABLE controllers IS 'Access control controllers discovered and managed by the system';
COMMENT ON COLUMN controllers.device_serial_number IS 'Unique 9-digit controller serial number (1=single-door, 2=double-door, 4=four-door)';
COMMENT ON COLUMN controllers.driver_version IS 'Controller firmware version (BCD format)';
COMMENT ON COLUMN controllers.driver_release_date IS 'Driver release date in BCD format (YYYYMMDD)';
COMMENT ON COLUMN controllers.status IS 'Real-time controller status including door sensors, buttons, and last record';

COMMENT ON TABLE privileges IS 'Card access privileges for controllers';
COMMENT ON COLUMN privileges.card_number IS 'Card number (cannot be 0, 0xffffffff, or 0x00ffffff)';
COMMENT ON COLUMN privileges.start_date IS 'Privilege start date in YYYYMMDD format';
COMMENT ON COLUMN privileges.end_date IS 'Privilege end date in YYYYMMDD format';
COMMENT ON COLUMN privileges.password IS 'Optional 6-digit password (max 999999)';

COMMENT ON TABLE records IS 'Access control records from controllers';
COMMENT ON COLUMN records.record_type IS '0=no record, 1=swipe card, 2=door sensor/button/remote, 3=alarm, 255=overwritten';
COMMENT ON COLUMN records.direction IS '1=IN, 2=OUT';
COMMENT ON COLUMN records.reason_code IS 'Reason code for access decision (see controller documentation)';

-- Create a view for easy controller status monitoring
CREATE VIEW controller_status_view AS
SELECT
    c.device_serial_number,
    c.ip_address,
    c.mac_address,
    c.driver_version,
    c.online,
    c.last_seen,
    c.status->>'currentTime' as current_time,
    c.status->>'errorNumber' as error_number,
    c.status->'lastRecord'->>'index' as last_record_index,
    c.status->'doorStatus'->'sensors' as door_sensors,
    c.status->'doorStatus'->'buttons' as door_buttons,
    CASE
        WHEN c.online AND c.last_seen > NOW() - INTERVAL '5 minutes' THEN 'ONLINE'
        WHEN c.last_seen > NOW() - INTERVAL '1 hour' THEN 'RECENTLY_SEEN'
        ELSE 'OFFLINE'
    END as connection_status
FROM controllers c
ORDER BY c.last_seen DESC;

-- Create a view for privilege summary
CREATE VIEW privilege_summary_view AS
SELECT
    p.device_serial_number,
    c.ip_address,
    COUNT(*) as total_privileges,
    COUNT(CASE WHEN p.start_date <= TO_CHAR(NOW(), 'YYYYMMDD')
                AND p.end_date >= TO_CHAR(NOW(), 'YYYYMMDD') THEN 1 END) as active_privileges,
    COUNT(CASE WHEN p.password IS NOT NULL THEN 1 END) as privileges_with_password,
    MAX(p.updated_at) as last_privilege_update
FROM privileges p
JOIN controllers c ON p.device_serial_number = c.device_serial_number
GROUP BY p.device_serial_number, c.ip_address
ORDER BY p.device_serial_number;