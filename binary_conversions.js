import { precision_profile, lookup_table } from './binary_constants.js';
import {
    twos_complement_bin_rational, real_to_binary, hex_to_binary,
    int_list_to_binary_string, twos_complement, binary_string_to_int_list,
    list_to_string, remove_msbs
} from './binary_support.js';

let debug_enable = false;

export function real_to_twos_comp_binary(n, default_int_size, default_frac_size) {
    let n_binary = real_to_binary(n, default_frac_size);
    let n_binary_2s_comp;

    if (parseFloat(n) < 0) {
        let binary_list = twos_complement_bin_rational(n_binary);
        let binary_string = int_list_to_binary_string(binary_list, binary_list.length);
        n_binary_2s_comp = binary_string.join("");
    } else {
        n_binary_2s_comp = n_binary;
    }
    return n_binary_2s_comp;
}

export function hexadecimal_to_binary(n, integer_size, lookup_table) {
    if ((integer_size % 4) !== 0) {
        return "ERROR";
    } else {
        let binary_string = [];
        for (let i = 0; i < n.length; i++) {
            binary_string.append = binary_string.push(hex_to_binary(n[i], lookup_table));
        }

        let single_binary_string = binary_string.join("");
		return single_binary_string;
    }
}

export function ieee754_hex_to_binary(ieee754_hex, p, lookup_table) {
    let binary_string = [];
    for (let i = 0; i < ieee754_hex.length; i++) {
        binary_string.push(hex_to_binary(ieee754_hex[i], lookup_table));
    }

    let single_binary_string = binary_string.join("");
    if (!single_binary_string.includes('1')) {
        return "0".repeat(p.hexadecimal_size * 4);
    }

    let sign_bit = single_binary_string[0];
    let exponent = single_binary_string.substring(1, p.exponent_size + 1);
    let mantissa = single_binary_string.substring(p.exponent_size + 1);

    if (exponent === '1'.repeat(p.exponent_size)) {
        return "ERROR";
    }

    let shift_value = parseInt(exponent, 2) - p.exp_bias;
    let binary_output;

    if (shift_value > 0) {
        if (shift_value > p.mantissa_size) {
            let binary_value = '01' + mantissa + '0'.repeat(shift_value - p.mantissa_size);
            let binary_int_list = binary_string_to_int_list(binary_value);
            let binary_int_twos_comp, carry;
            if (sign_bit === '1') {
                [binary_int_twos_comp, carry] = twos_complement(binary_int_list);
            } else {
                binary_int_twos_comp = binary_int_list;
            }
            binary_output = binary_int_twos_comp;
        } else if (shift_value <= p.mantissa_size) {
            let binary_value = '01' + mantissa;
            let binary_int_list = binary_string_to_int_list(binary_value);
            let binary_int_twos_comp, carry;
            if (sign_bit === '1') {
                [binary_int_twos_comp, carry] = twos_complement(binary_int_list);
            } else {
                binary_int_twos_comp = binary_int_list;
            }

            let integer_part = binary_int_twos_comp.slice(0, shift_value + 2);
            let fraction_part = binary_int_twos_comp.slice(shift_value + 2);

            if (fraction_part.includes(1))
            {
            	binary_output = integer_part.concat(['.']).concat(fraction_part);
			}
			else
			{
				binary_output = integer_part;
			}
        }
    } else if (shift_value < 0) {
        let binary_value = '0'.repeat(Math.abs(shift_value) - 1) + '1' + mantissa;
        let binary_int_list = binary_string_to_int_list(binary_value);
        let binary_int_twos_comp, carry;
        if (sign_bit === '1') {
            [binary_int_twos_comp, carry] = twos_complement(binary_int_list);
            binary_output = [1].concat(['.']).concat(binary_int_twos_comp);
        } else {
            binary_int_twos_comp = binary_int_list;
            binary_output = [0].concat(['.']).concat(binary_int_twos_comp);
        }
    } else {
        let binary_value = '01' + mantissa;
        let binary_int_list = binary_string_to_int_list(binary_value);
        let binary_int_twos_comp, carry;
        if (sign_bit === '1') {
            [binary_int_twos_comp, carry] = twos_complement(binary_int_list);
        } else {
            binary_int_twos_comp = binary_int_list;
        }

		let integer_part = binary_int_twos_comp.slice(0, 2);
		let fraction_part = concat(binary_int_twos_comp.slice(2));

		if (fraction_part.includes(1))
		{
			binary_output = integer_part.concat(['.']).concat(fraction_part);
		}
		else
		{
			binary_output = integer_part;
		}
    }
//    console.log("Float to binary = ", binary_output)
    return binary_output;
}

export function binary_to_real(n) {
    let n_int_list;
    if (typeof n === 'string') {
        if (n.includes('E') || n.includes('e')) {
            return "ERROR";
        } else {
            n_int_list = binary_string_to_int_list(n);
        }
    } else if (Array.isArray(n)) {
        n_int_list = n;
    } else {
        return "ERROR";
    }

    const isNegative = n_int_list[0] === 1;
    let real_output;

    if (n_int_list.includes('.')) {
        const binary_point_index = n_int_list.indexOf('.');
        let integer_list = n_int_list.slice(0, binary_point_index);
        let fraction_list = n_int_list.slice(binary_point_index + 1);
        const n_reassembled = integer_list.concat(fraction_list);

        let n_2s_comp, carry;
        if (isNegative) {
            [n_2s_comp, carry] = twos_complement(n_reassembled);
        } else {
            n_2s_comp = n_reassembled;
        }

        integer_list = n_2s_comp.slice(0, binary_point_index);
        fraction_list = n_2s_comp.slice(binary_point_index);

        // 1. Exact arbitrary-width integer calculation with BigInt
        let integer_part = 0n;
        for (let i = 0; i < integer_list.length; i++) {
            if (integer_list[i] === 1) {
                integer_part += (1n << BigInt(integer_list.length - 1 - i));
            }
        }

        // 2. Exact arbitrary-width fraction calculation with BigInt (2^-k = 5^k / 10^k)
        const frac_len = fraction_list.length;
        let fraction_scaled = 0n;
        for (let i = 0; i < frac_len; i++) {
            if (fraction_list[i] === 1) {
                const bitPos = BigInt(i + 1);
                const remaining = BigInt(frac_len - (i + 1));
                fraction_scaled += (5n ** bitPos) * (10n ** remaining);
            }
        }

        const integer_string = integer_part.toString();

        if (fraction_scaled === 0n) {
            real_output = integer_string;
        } else {
            // Pad with leading zeros to match frac_len, then strip trailing zeros
            let fraction_string = fraction_scaled.toString().padStart(frac_len, '0').replace(/0+$/, '');
            real_output = `${integer_string}.${fraction_string}`;
        }

        if (isNegative && real_output !== "0") {
            real_output = "-" + real_output;
        }

    } else {
        let n_2s_comp, carry;
        if (isNegative) {
            [n_2s_comp, carry] = twos_complement(n_int_list);
        } else {
            n_2s_comp = n_int_list;
        }

        let integer_part = 0n;
        for (let i = 0; i < n_2s_comp.length; i++) {
            if (n_2s_comp[i] === 1) {
                integer_part += (1n << BigInt(n_2s_comp.length - 1 - i));
            }
        }

        if (isNegative && integer_part !== 0n) {
            real_output = "-" + integer_part.toString();
        } else {
            real_output = integer_part.toString();
        }
    }
//	real_output = String(Number(real_output));
    return real_output;
}
export function binary_to_hexadecimal(n, lut) {
	let n_size = n.length;
	if (typeof n === 'string') {
		return n;
	}
	let binary_value;
	if (n.includes('.')) {
		let binary_point_index = n.indexOf('.');
		if (binary_point_index > 0) {
			let n_integer = n.slice(0, binary_point_index);
			let n_fraction = n.slice(binary_point_index + 1);
			binary_value = n_integer.concat(n_fraction);
		} else {
			binary_value = n.slice(1);
		}
		n_size -= 1;
	} else {
		binary_value = n;
	}
	let n_size_remainder = n_size % 4;
	let n_size_difference = 4 - n_size_remainder;
	n_size += n_size_difference;
	let binary_value_padded;
	if (n_size_remainder !== 0) {
		binary_value_padded = new Array(n_size_difference).fill(n[0]).concat(binary_value);
	} else {
		binary_value_padded = binary_value;
	}
	let binary_value_string = binary_value_padded.map(String).join("");
	let hex_string = [];
	for (let i = 0; i < Math.floor(n_size / 4); i++) {
		let bin_string_value = binary_value_string.substring(i * 4, i * 4 + 4);
		for (let [col1, col2, col3] of lut) {
			if (bin_string_value === col3) {
				hex_string.push(col2);
			}
		}
	}
	return hex_string.join("");
}
export function binary_to_ieee754(n, p, lookup_table) {
	let sign_bit = n[0];
	let binary_point_index;
	let no_binary_point;
	if (n.includes('.')) {
		binary_point_index = n.indexOf('.');
		no_binary_point = false;
	} else {
		binary_point_index = n.length;
		no_binary_point = true;
	}
	let n_no_binary_point;
	if (binary_point_index > 0) {
		n_no_binary_point = n.slice(0, binary_point_index).concat(n.slice(binary_point_index + 1));
	} else if (no_binary_point === false) {
		n_no_binary_point = n.slice(1);
	} else {
		n_no_binary_point = n;
	}
	let n_2s_comp, carry;
	if (sign_bit === 1) {
		[n_2s_comp, carry] = twos_complement(n_no_binary_point);
	} else {
	n_2s_comp = n_no_binary_point;
	}
	let n_2s_comp_binary_point;
	if (no_binary_point === false) {
		n_2s_comp_binary_point = n_2s_comp.slice(0, binary_point_index).concat(['.']).concat(n_2s_comp.slice(binary_point_index));
	} else {
		n_2s_comp_binary_point = n_2s_comp;
	}
	let mantissa_offet = 1;
	let n_stripped = remove_msbs(n_2s_comp_binary_point);
	let n_stripped_binary_point_index;
	if (n_stripped.includes('.')) {
		n_stripped_binary_point_index = n_stripped.indexOf('.');
	} else {
		n_stripped_binary_point_index = n_stripped.length;
	}
	let n_2s_comp_msb_index;
	if (n_stripped.includes(1)) {
		n_2s_comp_msb_index = n_stripped.indexOf(1);
	} else {
		return "0".repeat(p.hexadecimal_size);
	}
	let n_2s_comp_size;
	if (no_binary_point === false) {
		n_2s_comp_size = n_stripped.length - 1;
	} else {
		n_2s_comp_size = n_stripped.length;
	}
	let mantissa;
	if (no_binary_point === false) {
		if (n_2s_comp_size >= p.mantissa_size) {
			if (n_stripped_binary_point_index > n_2s_comp_msb_index) {
				if ((n_2s_comp_size - 2) >= p.mantissa_size) {
					mantissa = n_stripped.slice(n_2s_comp_msb_index + mantissa_offet, n_stripped_binary_point_index).concat(n_stripped.slice(n_stripped_binary_point_index + 1, p.mantissa_size + (mantissa_offet + 1 + n_2s_comp_msb_index)));
				} else {
					mantissa = n_stripped.slice(n_2s_comp_msb_index + mantissa_offet, n_stripped_binary_point_index).concat(n_stripped.slice(n_stripped_binary_point_index + 1)).concat(new Array(p.mantissa_size - (n_2s_comp_size - (mantissa_offet + 1))).fill(0));
				}
			} else {
				mantissa = n_stripped.slice(n_2s_comp_msb_index + mantissa_offet, n_2s_comp_msb_index + 1 + p.mantissa_size);
			}
		} else if (n_2s_comp_size < p.mantissa_size) {
			if (n_stripped_binary_point_index > n_2s_comp_msb_index) {
				mantissa = n_stripped.slice(n_2s_comp_msb_index + mantissa_offet, n_stripped_binary_point_index).concat(n_stripped.slice(n_stripped_binary_point_index + 1)).concat(new Array(p.mantissa_size - (n_2s_comp_size - n_2s_comp_msb_index) + mantissa_offet + 1).fill(0));
			} else {
				mantissa = n_stripped.slice(n_2s_comp_msb_index + mantissa_offet).concat(new Array(p.mantissa_size - (n_2s_comp_size - n_2s_comp_msb_index) + mantissa_offet + 1).fill(0));
			}
		}
	} else {
		if (n_2s_comp_size >= p.mantissa_size) {
			if ((n_2s_comp_size - 2) >= p.mantissa_size) {
				mantissa = n_stripped.slice(n_2s_comp_msb_index + mantissa_offet, n_stripped_binary_point_index).concat(n_stripped.slice(n_stripped_binary_point_index + 1, p.mantissa_size + (mantissa_offet + 1 + n_2s_comp_msb_index)));
			} else {
				mantissa = n_stripped.slice(n_2s_comp_msb_index + mantissa_offet, n_stripped_binary_point_index).concat(n_stripped.slice(n_stripped_binary_point_index + 1)).concat(new Array(p.mantissa_size - (n_2s_comp_size - (mantissa_offet + 1))).fill(0));
			}
		} else if (n_2s_comp_size < p.mantissa_size) {
			mantissa = n_stripped.slice(n_2s_comp_msb_index + mantissa_offet).concat(new Array(p.mantissa_size - (n_2s_comp_size - n_2s_comp_msb_index) + mantissa_offet + 1).fill(0));
		}
	}
	let shift_value = n_stripped_binary_point_index - n_2s_comp_msb_index;
	let exponent;
	if (shift_value > 0) {
		exponent = shift_value + p.exp_bias - 1;
	} else {
		exponent = shift_value + p.exp_bias;
	}
	let exponent_binary = exponent.toString(2).padStart(p.exponent_size, '0');
	let exponent_int_list = binary_string_to_int_list(exponent_binary);
	if (exponent_int_list.length < p.exponent_size) {
		exponent_int_list = new Array(p.exponent_size - exponent_int_list.length).fill(0).concat(exponent_int_list);
	}
	let ieee754_binary = [sign_bit].concat(exponent_int_list).concat(mantissa.slice(0, p.mantissa_size));
	let ieee754_hex_value = binary_to_hexadecimal(ieee754_binary, lookup_table);
	return ieee754_hex_value;
}