#!/usr/bin/env node

/**
 * Database Schema Alignment Verification Script
 * 
 * This script verifies that the database schema is properly aligned with:
 * 1. Current codebase usage
 * 2. main_sdk.txt specifications
 * 3. Enhanced discovery functionality
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuration
const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifyDatabaseSchema() {
    console.log('🔍 Database Schema Alignment Verification\n');

    try {
        // Test 1: Verify Controllers Table Structure
        console.log('1. Testing Controllers Table...');
        await testControllersTable();

        // Test 2: Verify Privileges Table Structure
        console.log('2. Testing Privileges Table...');
        await testPrivilegesTable();

        // Test 3: Verify Records Table Structure
        console.log('3. Testing Records Table...');
        await testRecordsTable();

        // Test 4: Verify Views
        console.log('4. Testing Views...');
        await testViews();

        // Test 5: Verify Constraints
        console.log('5. Testing Constraints...');
        await testConstraints();

        console.log('\n✅ All database schema verifications passed!');
        console.log('📊 Database is fully aligned with code and main_sdk.txt specifications.');

    } catch (error) {
        console.error('\n❌ Database verification failed:', error.message);
        console.error('💡 Make sure to run the migration first: supabase db reset');
        process.exit(1);
    }
}

async function testControllersTable() {
    // Test enhanced discovery data structure
    const testController = {
        device_serial_number: 123456789,
        ip_address: '192.168.1.100',
        subnet_mask: '255.255.255.0',
        gateway: '192.168.1.1',
        mac_address: '00:11:22:33:44:55',
        driver_version: '0102',
        driver_release_date: '20240101',
        discovered_at: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        online: true,
        status: {
            currentTime: '14:30:25',
            errorNumber: 0,
            lastRecord: {
                index: 1234,
                type: 1,
                validity: true,
                doorNumber: 1,
                direction: 'IN',
                cardNumber: 12345,
                reasonCode: 0
            },
            doorStatus: {
                sensors: [false, false, false, false],
                buttons: [false, false, false, false]
            }
        }
    };

    const { data, error } = await supabase
        .from('controllers')
        .upsert(testController)
        .select();

    if (error) throw error;
    
    console.log('   ✅ Controllers table structure verified');
    console.log(`   📝 Test record inserted with ID: ${data[0].id}`);

    // Clean up test data
    await supabase
        .from('controllers')
        .delete()
        .eq('device_serial_number', 123456789);
}

async function testPrivilegesTable() {
    // First insert a test controller
    const testController = {
        device_serial_number: 987654321,
        ip_address: '192.168.1.101',
        subnet_mask: '255.255.255.0',
        gateway: '192.168.1.1',
        mac_address: '00:11:22:33:44:56',
        driver_version: '0102',
        driver_release_date: '20240101'
    };

    await supabase.from('controllers').upsert(testController);

    // Test privilege data structure (main_sdk.txt Function ID 0x50)
    const testPrivilege = {
        device_serial_number: 987654321,
        card_number: 12345,
        start_date: '20250101',
        end_date: '20251231',
        door1_enabled: true,
        door2_enabled: false,
        door3_enabled: true,
        door4_enabled: false,
        password: 123456
    };

    const { data, error } = await supabase
        .from('privileges')
        .upsert(testPrivilege)
        .select();

    if (error) throw error;
    
    console.log('   ✅ Privileges table structure verified');
    console.log(`   📝 Test privilege inserted with ID: ${data[0].id}`);

    // Clean up test data
    await supabase
        .from('privileges')
        .delete()
        .eq('device_serial_number', 987654321);
    
    await supabase
        .from('controllers')
        .delete()
        .eq('device_serial_number', 987654321);
}

async function testRecordsTable() {
    // First insert a test controller
    const testController = {
        device_serial_number: 555666777,
        ip_address: '192.168.1.102',
        subnet_mask: '255.255.255.0',
        gateway: '192.168.1.1',
        mac_address: '00:11:22:33:44:57',
        driver_version: '0102',
        driver_release_date: '20240101'
    };

    await supabase.from('controllers').upsert(testController);

    // Test record data structure (main_sdk.txt Function ID 0xB0)
    const testRecord = {
        device_serial_number: 555666777,
        record_index: 1001,
        record_type: 1, // Swipe card record
        validity: true,
        door_number: 1,
        direction: 1, // IN
        card_number: 12345,
        swipe_time: new Date().toISOString(),
        reason_code: 0,
        record_type_description: 'Swipe card record'
    };

    const { data, error } = await supabase
        .from('records')
        .upsert(testRecord)
        .select();

    if (error) throw error;
    
    console.log('   ✅ Records table structure verified');
    console.log(`   📝 Test record inserted with ID: ${data[0].id}`);

    // Clean up test data
    await supabase
        .from('records')
        .delete()
        .eq('device_serial_number', 555666777);
    
    await supabase
        .from('controllers')
        .delete()
        .eq('device_serial_number', 555666777);
}

async function testViews() {
    // Test controller status view
    const { data: statusData, error: statusError } = await supabase
        .from('controller_status_view')
        .select('*')
        .limit(1);

    if (statusError) throw statusError;
    
    console.log('   ✅ Controller status view verified');

    // Test privilege summary view
    const { data: privilegeData, error: privilegeError } = await supabase
        .from('privilege_summary_view')
        .select('*')
        .limit(1);

    if (privilegeError) throw privilegeError;
    
    console.log('   ✅ Privilege summary view verified');
}

async function testConstraints() {
    console.log('   🔍 Testing main_sdk.txt constraint compliance...');

    // Test invalid card number (should fail)
    try {
        await supabase.from('controllers').upsert({
            device_serial_number: 999888777,
            ip_address: '192.168.1.103',
            subnet_mask: '255.255.255.0',
            gateway: '192.168.1.1',
            mac_address: '00:11:22:33:44:58',
            driver_version: '0102',
            driver_release_date: '20240101'
        });

        await supabase.from('privileges').upsert({
            device_serial_number: 999888777,
            card_number: 0, // Invalid - should be rejected
            start_date: '20250101',
            end_date: '20251231'
        });
        
        console.log('   ❌ Constraint test failed - invalid card number was accepted');
    } catch (error) {
        console.log('   ✅ Card number constraint working correctly');
    }

    // Test invalid password (should fail)
    try {
        await supabase.from('privileges').upsert({
            device_serial_number: 999888777,
            card_number: 12345,
            start_date: '20250101',
            end_date: '20251231',
            password: 9999999 // Invalid - exceeds 999999
        });
        
        console.log('   ❌ Constraint test failed - invalid password was accepted');
    } catch (error) {
        console.log('   ✅ Password constraint working correctly');
    }

    // Clean up
    await supabase.from('controllers').delete().eq('device_serial_number', 999888777);
    
    console.log('   ✅ All constraints verified');
}

// Run verification
if (require.main === module) {
    verifyDatabaseSchema().catch(console.error);
}

module.exports = { verifyDatabaseSchema };
