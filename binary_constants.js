// =====================================================================
// DATA STRUCTURES AND STATIC LOOKUP TABLES
// =====================================================================

class PrecisionParameters {
    constructor(exponent_size, mantissa_size, exp_bias, exp_mask, mantissa_mask, exp_nibble_size, mantissa_nibble_size, hexadecimal_size, precision) {
        this.exponent_size = exponent_size;
        this.mantissa_size = mantissa_size;
        this.exp_bias = exp_bias;
        this.exp_mask = exp_mask;
        this.mantissa_mask = mantissa_mask;
        this.exp_nibble_size = exp_nibble_size;
        this.mantissa_nibble_size = mantissa_nibble_size;
        this.hexadecimal_size = hexadecimal_size;
        this.precision = precision;
    }
}

export const precision_profile = {
    "SINGLE": new PrecisionParameters(8, 23, 127, 0x7F, 0x7FFFFF, 2, 6, 8, "SINGLE"),
    "DOUBLE": new PrecisionParameters(11, 52, 1023, 0x7FF, 0xFFFFFFFFFFFFF, 3, 14, 16, "DOUBLE")
};

export const lookup_table = [
    ['0', '0', "0000"],
    ['1', '1', "0001"],
    ['2', '2', "0010"],
    ['3', '3', "0011"],
    ['4', '4', "0100"],
    ['5', '5', "0101"],
    ['6', '6', "0110"],
    ['7', '7', "0111"],
    ['8', '8', "1000"],
    ['9', '9', "1001"],
    ['a', 'A', "1010"],
    ['b', 'B', "1011"],
    ['c', 'C', "1100"],
    ['d', 'D', "1101"],
    ['e', 'E', "1110"],
    ['f', 'F', "1111"]
];
