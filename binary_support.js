import { lookup_table } from './binary_constants.js';
import { binary_adder } from './binary_math.js';
export function hex_to_binary(n, lut) {
    for (let [col1, col2, col3] of lut) {
        if (n === col1 || n === col2) {
            return col3;
        }
    }
}

export function binary_to_hex(n, lut) {
    let size = n.length;
    let single_binary_string = n.join("");
    let hex_string = [];

    if ((size % 4) !== 0) {
        return "ERROR";
    }

    for (let i = 0; i < Math.floor(size / 4); i++) {
        let bin_string_value = single_binary_string.substring(i * 4, i * 4 + 4);

        for (let [col1, col2, col3] of lut) {
            if (bin_string_value === col3) {
                hex_string.push(col2);
            }
        }
    }
    return hex_string.join("");
}

export function binary_string_to_int_list(n) {
    let integer_list = [];
    for (let i = 0; i < n.length; i++) {
        if (n[i] === '0') {
            integer_list.push(0);
        } else if (n[i] === '1') {
            integer_list.push(1);
        } else if (n[i] === '.') {
            integer_list.push(n[i]);
        }
    }
    return integer_list;
}

export function int_list_to_binary_string(n, size) {
    let binary_list = [];
    for (let i = 0; i < size; i++) {
        if (n[i] === 0) {
            binary_list.push('0');
        } else if (n[i] === 1) {
            binary_list.push('1');
        } else if (n[i] === '.') {
            binary_list.push(n[i]);
        }
    }
    return binary_list;
}

export function real_to_binary(n, default_frac_size) {
    let decimal_point_index;
    let sign_bit;
    let n_integer_abs;
    let n_fraction_abs;
    let integer_size;
    let fraction_size;

    if (n.includes('.')) {
        decimal_point_index = n.indexOf('.');

        if (n[0] === '-') {
            sign_bit = '1';
            n_integer_abs = n.substring(1, decimal_point_index);
            n_fraction_abs = n.substring(decimal_point_index + 1);

            if (n[1] === '0' && decimal_point_index === 2) {
                integer_size = 0;
            } else {
                integer_size = decimal_point_index - 1;
            }
        } else {
            sign_bit = '0';
            n_integer_abs = n.substring(0, decimal_point_index);
            n_fraction_abs = n.substring(decimal_point_index + 1);

            if (n[0] === '0' && decimal_point_index === 1) {
                integer_size = 0;
            } else {
                integer_size = decimal_point_index;
            }
        }

        if (decimal_point_index === n.length) {
            fraction_size = 0;
        } else {
            fraction_size = n_fraction_abs.length;
        }
    } else {
        decimal_point_index = n.length;

        if (n[0] === '-') {
            sign_bit = '1';
            n_integer_abs = n.substring(1);
            n_fraction_abs = "0";

            if (n[1] === '0' && decimal_point_index === 2) {
                integer_size = 0;
            } else {
                integer_size = decimal_point_index - 1;
            }
        } else {
            sign_bit = '0';
            n_integer_abs = n;
            n_fraction_abs = "0";

            if (n[0] === '0' && decimal_point_index === 1) {
                integer_size = 0;
            } else {
                integer_size = decimal_point_index;
            }
        }
        fraction_size = 0;
    }

    let integer_value = parseInt(n_integer_abs, 10);
    let fraction_value = parseInt(n_fraction_abs, 10);

    let fraction_sum = fraction_value;
    let fraction_compare_value = 1 * Math.pow(10, fraction_size);
    let binary_frac_value = [];

    if (fraction_size > 0) {
        for (let i = 0; i < default_frac_size; i++) {
            fraction_sum = fraction_sum * 2;
            if (fraction_sum >= fraction_compare_value) {
                fraction_sum -= fraction_compare_value;
                binary_frac_value.push('1');
            } else {
                binary_frac_value.push('0');
            }
        }
    } else {
        binary_frac_value.push('0');
    }

    let integer_quotient = integer_value;
    let binary_int_value = [];

    if (integer_size > 0) {
        while (integer_quotient !== 0) {
            let binary_bit = integer_quotient % 2;
            binary_int_value.push(String(binary_bit));
            integer_quotient = Math.floor(integer_quotient / 2);
        }
    } else {
        binary_int_value.push('0');
    }

    binary_int_value.reverse();

    let single_binary_int = binary_int_value.join("");
    let single_binary_frac = binary_frac_value.join("");

	if (n.includes('.')) {
//		console.log(single_binary_int, single_binary_frac)
    	return '0' + single_binary_int + '.' + single_binary_frac;
	}
	else {
		return '0' + single_binary_int
	}
}

export function binary_point_removal(operand_a, operand_b) {
    let a_size = operand_a.length;
    let b_size = operand_b.length;
    let a_radix_index = operand_a.includes('.') ? operand_a.indexOf('.') : 0;
    let b_radix_index = operand_b.includes('.') ? operand_b.indexOf('.') : 0;

    let a_integer_size, a_fraction_size;
    if (a_radix_index > 0) {
        if (a_radix_index === 1 && operand_a[0] === 0) {
            a_integer_size = 0;
            a_fraction_size = a_size - (a_radix_index + 1);
        } else {
            a_integer_size = a_radix_index;
            a_fraction_size = a_size - (a_radix_index + 1);
        }
    } else {
        if (operand_a[0] !== '.') {
            a_integer_size = a_size;
            a_fraction_size = 0;
        } else {
            a_integer_size = 0;
            a_fraction_size = a_size - 1;
        }
    }

    let b_integer_size, b_fraction_size;
    if (b_radix_index > 0) {
        if (b_radix_index === 1 && operand_b[0] === 0) {
            b_integer_size = 0;
            b_fraction_size = b_size - (b_radix_index + 1);
        } else {
            b_integer_size = b_radix_index;
            b_fraction_size = b_size - (b_radix_index + 1);
        }
    } else {
        if (operand_b[0] !== '.') {
            b_integer_size = b_size;
            b_fraction_size = 0;
        } else {
            b_integer_size = 0;
            b_fraction_size = b_size - 1;
        }
    }

    let a_no_radix_point;
    if (a_integer_size > 0) {
        if (a_fraction_size > 0) {
            a_no_radix_point = operand_a.slice(0, a_radix_index).concat(operand_a.slice(a_radix_index + 1));
        } else {
            if (a_radix_index === 0) {
                a_no_radix_point = [...operand_a];
            } else {
                a_no_radix_point = operand_a.slice(0, a_radix_index);
            }
        }
    } else {
        if (a_fraction_size > 0) {
            a_no_radix_point = operand_a.slice(a_radix_index + 1);
        } else {
            return "ERROR";
        }
    }

    let b_no_radix_point;
    if (b_integer_size > 0) {
        if (b_fraction_size > 0) {
            b_no_radix_point = operand_b.slice(0, b_radix_index).concat(operand_b.slice(b_radix_index + 1));
        } else {
            if (b_radix_index === 0) {
                b_no_radix_point = [...operand_b];
            } else {
                b_no_radix_point = operand_b.slice(0, b_radix_index);
            }
        }
    } else {
        if (b_fraction_size > 0) {
            b_no_radix_point = operand_b.slice(b_radix_index + 1);
        } else {
            return "ERROR";
        }
    }

    let a_msb = a_no_radix_point.includes(1) ? a_no_radix_point.indexOf(1) : 0;
    if (a_no_radix_point.includes(1) && a_msb < a_radix_index) {
        a_integer_size -= a_msb;
    }

    let b_msb = b_no_radix_point.includes(1) ? b_no_radix_point.indexOf(1) : 0;
    if (b_no_radix_point.includes(1) && b_msb < b_radix_index) {
        b_integer_size -= b_msb;
    }

    let operand_a_padded, operand_b_padded;
    if (a_integer_size > b_integer_size) {
        operand_a_padded = a_no_radix_point;
        operand_b_padded = new Array(a_msb).fill(0).concat(new Array(a_integer_size - b_integer_size).fill(b_no_radix_point[0])).concat(b_no_radix_point);
    } else if (b_integer_size > a_integer_size) {
        operand_a_padded = new Array(b_msb).fill(0).concat(new Array(b_integer_size - a_integer_size).fill(a_no_radix_point[0])).concat(a_no_radix_point);
        operand_b_padded = b_no_radix_point;
    } else {
        operand_a_padded = a_no_radix_point;
        operand_b_padded = b_no_radix_point;
    }

    let padding_size_a, padding_size_b, operand_a_out, operand_b_out, fraction_size;
    if (a_fraction_size > b_fraction_size) {
        padding_size_b = a_fraction_size - b_fraction_size;
        operand_a_out = operand_a_padded;
        operand_b_out = operand_b_padded.concat(new Array(padding_size_b).fill(0));
        fraction_size = a_fraction_size;
    } else if (b_fraction_size > a_fraction_size) {
        padding_size_a = b_fraction_size - a_fraction_size;
        operand_a_out = operand_a_padded.concat(new Array(padding_size_a).fill(0));
        operand_b_out = operand_b_padded;
        fraction_size = b_fraction_size;
    } else {
        operand_a_out = operand_a_padded;
        operand_b_out = operand_b_padded;
        fraction_size = a_fraction_size;
    }

    let a_size_out = operand_a_out.length;
    let b_size_out = operand_b_out.length;
    let result_a, result_b;

    if (a_size_out > b_size_out) {
        result_a = operand_a_out;
        result_b = new Array(a_size_out - b_size_out).fill(0).concat(operand_b_out);
    } else if (b_size_out > a_size_out) {
        result_a = new Array(b_size_out - a_size_out).fill(0).concat(operand_a_out);
        result_b = operand_b_out;
    } else {
        result_a = operand_a_out;
        result_b = operand_b_out;
    }

    return [result_a, result_b, a_radix_index, b_radix_index, fraction_size];
}

export function twos_complement(n_int_list) {
    let n_int_list_inverted = [];

	for (let i = 0; i < n_int_list.length; i++) {
		n_int_list_inverted.push(n_int_list[i] ^ 1);
	}
	let addend = new Array(n_int_list.length - 1).fill(0).concat([1]);
	let [addend_a, addend_b] = append_msbs(n_int_list_inverted, addend, 0, 0);
	let [n_sum, n_carry] = binary_adder(addend_a, addend_b);
	return [n_sum, n_carry];
}
export function twos_complement_bin_rational(n) {
	let binary_point_index = n.indexOf('.');
	let size = n.length;
	let fraction_size = 0;
	if (binary_point_index > 0 && binary_point_index < size) {
		fraction_size = size - binary_point_index - 1;
	}
	else {
		fraction_size = 0;
	}
	let n_int_list = binary_string_to_int_list(n);
	let n_int_list_inverted = [];
	for (let i = 0; i < size; i++) {
		if (n_int_list[i] !== '.') {
			n_int_list_inverted.push(n_int_list[i] ^ 1);
		} else {
			n_int_list_inverted.push(n_int_list[i]);
		}
	}
	let addend = 0
	if (fraction_size > 1) {
		addend = new Array(binary_point_index).fill(0).concat(['.']).concat(new Array(fraction_size - 1).fill(0)).concat([1]);
	}
	else if (fraction_size > 0) {
		addend = new Array(binary_point_index).concat(['.']).concat([1]);
	}
	else {
		addend = new Array(size-1).fill(0).concat([1]);
	}

	let n_inverted_sum = [];
	let carry = 0;
	let binary_point_location = 0;
	for (let i = size - 1; i >= 0; i--) {
		if (n_int_list_inverted[i] !== '.') {
			n_inverted_sum.push((addend[i] ^ n_int_list_inverted[i]) ^ carry);
			carry = (carry & n_int_list_inverted[i]) | (n_int_list_inverted[i] & addend[i]) | (carry & addend[i]);
		} else {
			binary_point_location = size - 1 - i;
		}
	}
	n_inverted_sum.push(carry | n_inverted_sum[n_inverted_sum.length - 1]);
	let twos_comp_sum = n_inverted_sum.slice(0, binary_point_location).concat(['.']).concat(n_inverted_sum.slice(binary_point_location));
	twos_comp_sum.reverse();
	return twos_comp_sum;
}
export function binary_comparator(a, b, operation) {
	let a_size = a.length;
	let b_size = b.length;
	let a_2s_comp, b_2s_comp, b_carry, a_carry;
	if (operation === 'GT') {
		a_2s_comp = a;
		[b_2s_comp, b_carry] = twos_complement(b);
	} else if (operation === 'LT') {
		[a_2s_comp, a_carry] = twos_complement(a);
		b_2s_comp = b;
	} else {
		a_2s_comp = a;
		b_2s_comp = b;
	}
	let addend_a, addend_b;
	if (a_size > b_size) {
		addend_a = a_2s_comp;
		addend_b = new Array(a_size - b_size).fill(0).concat(b_2s_comp);
	} else if (b_size > a_size) {
		addend_a = new Array(b_size - a_size).fill(0).concat(a_2s_comp);
		addend_b = b_2s_comp;
	} else {
		addend_a = a_2s_comp;
		addend_b = b_2s_comp;
	}
	let [difference, carry] = binary_adder(addend_a, addend_b);
	return carry === 1;
}
export function append_msbs(A, B, a_msb, b_msb) {
	let a_len = A.length;
	let b_len = B.length;
	let a_output, b_output;
	if (a_len > b_len) {
		a_output = A;
		b_output = new Array(a_len - b_len).fill(b_msb).concat(B);
	} else if (b_len > a_len) {
		a_output = new Array(b_len - a_len).fill(a_msb).concat(A);
		b_output = B;
	} else {
		a_output = A;
		b_output = B;
	}
	return [a_output, b_output];
}
export function list_to_string(n) {
	return n.join("");
}
export function remove_msbs(n) {
	let msb_index = n.includes(1) ? n.indexOf(1) : 0;
	let binary_point_index = n.includes('.') ? n.indexOf('.') : n.length;
	let binary_value;
	if (msb_index < binary_point_index) {
		if (n[0] === 0) {
			binary_value = [0].concat(n.slice(msb_index));
		} else {
			binary_value = n.slice(msb_index);
		}
	} else {
		binary_value = n.slice(binary_point_index - 1);
	}
	return binary_value;
}
export function binary_point_alignment(operand_a, operand_b, enable_twos_complement) {
	let a_has_binary_point = operand_a.includes('.');
	let b_has_binary_point = operand_b.includes('.');
	let a_radix_index = a_has_binary_point ? operand_a.indexOf('.') : operand_a.length;
//	console.log("a index = ", a_radix_index)
	let operand_a_normalized = [];
	if (a_has_binary_point) {
		operand_a_normalized = [...operand_a];
		operand_a_normalized.splice(a_radix_index, 1);
	} else {
		operand_a_normalized = [...operand_a];
	}
	let b_radix_index = b_has_binary_point ? operand_b.indexOf('.') : operand_b.length;
//	console.log("b index = ", b_radix_index)
	let operand_b_normalized = [];
	if (b_has_binary_point) {
		operand_b_normalized = [...operand_b];
		operand_b_normalized.splice(b_radix_index, 1);
	} else {
		operand_b_normalized = [...operand_b];
	}
	let a_size = operand_a.length;
	let b_size = operand_b.length;
	let a_integer_size, a_fraction_size;
	if (a_has_binary_point) {
		a_integer_size = a_radix_index;
		a_fraction_size = a_size - a_radix_index - 1;
	} else {
		a_integer_size = a_size;
		a_fraction_size = 0;
	}
	let b_integer_size, b_fraction_size;
	if (b_has_binary_point) {
		b_integer_size = b_radix_index;
		b_fraction_size = b_size - b_radix_index - 1;
	} else {
		b_integer_size = b_size;
		b_fraction_size = 0;
	}
	let operand_a_2s_comp, operand_b_2s_comp, carry_a, carry_b;
	if (enable_twos_complement) {
		if (operand_a_normalized[0] === 1) {
			[operand_a_2s_comp, carry_a] = twos_complement(operand_a_normalized);
		} else {
		operand_a_2s_comp = operand_a_normalized;
		}
		if (operand_b_normalized[0] === 1) {
		[operand_b_2s_comp, carry_b] = twos_complement(operand_b_normalized);
		} else {
		operand_b_2s_comp = operand_b_normalized;
		}
	} else {
		operand_a_2s_comp = operand_a_normalized;
		operand_b_2s_comp = operand_b_normalized;
	}
	let operand_a_padded_left, operand_b_padded_left;
	if (a_integer_size > b_integer_size) {
		operand_a_padded_left = operand_a_2s_comp;
		if (enable_twos_complement) {
			operand_b_padded_left = new Array(a_integer_size - b_integer_size).fill(0).concat(operand_b_2s_comp);
		} else {
			operand_b_padded_left = new Array(a_integer_size - b_integer_size).fill(operand_b_2s_comp[0]).concat(operand_b_2s_comp);
		}
	} else if (b_integer_size > a_integer_size) {
		if (enable_twos_complement) {
			operand_a_padded_left = new Array(b_integer_size - a_integer_size).fill(0).concat(operand_a_2s_comp);
		} else {
			operand_a_padded_left = new Array(b_integer_size - a_integer_size).fill(operand_a_2s_comp[0]).concat(operand_a_2s_comp);
		}
		operand_b_padded_left = operand_b_2s_comp;
	} else {
		operand_a_padded_left = operand_a_2s_comp;
		operand_b_padded_left = operand_b_2s_comp;
	}
	let operand_a_padded, operand_b_padded;
	if (a_fraction_size > b_fraction_size) {
		operand_a_padded = operand_a_padded_left;
		operand_b_padded = operand_b_padded_left.concat(new Array(a_fraction_size - b_fraction_size).fill(0));
	} else if (b_fraction_size > a_fraction_size) {
		operand_a_padded = operand_a_padded_left.concat(new Array(b_fraction_size - a_fraction_size).fill(0));
		operand_b_padded = operand_b_padded_left;
	} else {
		operand_a_padded = operand_a_padded_left;
		operand_b_padded = operand_b_padded_left;
	}
	return [operand_a_padded, operand_b_padded, a_fraction_size, b_fraction_size];
}
export function add_msbs(A, B) {
	let a_length = A.length;
	let b_length = B.length;
	let a_padded, b_padded;
	if (a_length > b_length) {
		a_padded = A;
		b_padded = new Array(a_length - b_length).fill(0).concat(B);
	} else {
		a_padded = new Array(b_length - a_length).fill(0).concat(A);
		b_padded = B;
	}
	return [a_padded, b_padded];
}