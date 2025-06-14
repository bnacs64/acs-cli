// Helper to convert BCD to Decimal
function bcdToDec(bcd) {
    return (bcd >> 4) * 10 + (bcd & 0x0F);
}

// Helper to convert Decimal to BCD
function decToBcd(dec) {
    return (Math.floor(dec / 10) << 4) | (dec % 10);
}

module.exports = {
    bcdToDec,
    decToBcd
};