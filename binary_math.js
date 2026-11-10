import {
    twos_complement, append_msbs, binary_comparator,
    binary_point_removal, list_to_string, binary_point_alignment,
    binary_string_to_int_list
} from './binary_support.js';

let enable_print_statements = false;

export function binary_division(operand1, operand2, max_size) {
    let [operand1_no_bin_point, operand2_no_bin_point, operand1_fraction_size, operand2_fraction_size] = binary_point_alignment(operand1, operand2, false);

    let numerator, op1_carry, sign_operand1;
    if (operand1[0] === 1) {
        [numerator, op1_carry] = twos_complement(operand1_no_bin_point);
        sign_operand1 = 1;
    } else {
        numerator = operand1_no_bin_point;
        sign_operand1 = 0;
    }

    let denominator, op2_carry, sign_operand2;
    if (operand2[0] === 1) {
        [denominator, op2_carry] = twos_complement(operand2_no_bin_point);
        sign_operand2 = 1;
    } else {
        denominator = operand2_no_bin_point;
        sign_operand2 = 0;
    }

    let invert_quotient = sign_operand1 ^ sign_operand2;
    let num_bin_point_index = numerator.includes('.') ? numerator.indexOf('.') : numerator.length;
    let denom_bin_point_index = denominator.includes('.') ? denominator.indexOf('.') : denominator.length;

    let num_frac_size = numerator.includes('.') ? numerator.length - (num_bin_point_index + 1) : 0;
    let denom_frac_size = denominator.includes('.') ? denominator.length - (denom_bin_point_index + 1) : 0;

    if (enable_print_statements === true) {
        console.log(num_bin_point_index, denom_bin_point_index, num_frac_size, denom_frac_size);
    }

    let num_no_bin_point = numerator.includes('.') ? numerator.slice(0, num_bin_point_index).concat(numerator.slice(num_bin_point_index + 1)) : numerator;
    let denom_no_bin_point = denominator.includes('.') ? denominator.slice(0, denom_bin_point_index).concat(denominator.slice(denom_bin_point_index + 1)) : denominator;

    while (num_no_bin_point.length > 1 && num_no_bin_point[0] === 0) {
        num_no_bin_point.shift();
    }
    while (denom_no_bin_point.length > 1 && denom_no_bin_point[0] === 0) {
        denom_no_bin_point.shift();
    }

    let num_padded, denom_padded;
    if (denom_frac_size > num_frac_size) {
        num_padded = num_no_bin_point.concat(new Array(denom_frac_size - num_frac_size).fill(0));
        denom_padded = denom_no_bin_point;
    } else {
        num_padded = num_no_bin_point;
        denom_padded = denom_no_bin_point.concat(new Array(num_frac_size - denom_frac_size).fill(0));
    }

    let num_size = num_padded.length;
    let denom_size = denom_padded.length;
    let partial_remainder = num_size > denom_size ? num_padded.slice(0, denom_size) : num_padded;

    let [denom_2s_comp, denom_carry] = twos_complement(denom_padded);

    if (enable_print_statements === true) {
        console.log(num_size, denom_size, num_bin_point_index, denom_bin_point_index, num_frac_size, denom_frac_size);
        console.log(list_to_string(num_no_bin_point), list_to_string(denom_no_bin_point));
        console.log(num_padded.join(""), denom_padded.join(""), denom_2s_comp.join(""), denom_carry);
        console.log("--------------------SIGNS = ", sign_operand1, sign_operand2, invert_quotient, " --------------------");
    }

    let quotient = [];
    let offset = denom_size;
    let allow_bit_growth = false;

    quotient.push(0);

    for (let i = 0; i < max_size; i++) {
        let [a_comp, b_comp] = append_msbs(partial_remainder, denom_padded, 0, 0);

        if (binary_comparator(a_comp, b_comp, 'GT') === true || list_to_string(partial_remainder) === list_to_string(denom_padded)) {
            let [addend_a, addend_b] = append_msbs(partial_remainder, denom_2s_comp, 0, denom_2s_comp[0]);
            let [p_rem, carry] = binary_adder(addend_a, addend_b);
            partial_remainder = p_rem;
            quotient.push(1);
            partial_remainder.shift();

            if (allow_bit_growth === true) {
                if (partial_remainder.includes(1)) {
                    while (partial_remainder[0] === 0) {
                        partial_remainder.shift();
                    }
                } else {
                    if (enable_print_statements === true) {
                        console.log(quotient.join(""));
                    }
                    break;
                }
            }
        } else {
            let [addend_a, addend_b] = append_msbs(partial_remainder, new Array(partial_remainder.length).fill(0), 0, 0);
            let [p_rem, carry] = binary_adder(addend_a, addend_b);
            partial_remainder = p_rem;

            quotient.push(0);

            if (partial_remainder.length > denom_size) {
                partial_remainder.shift();
            }
        }

        if (offset < num_size) {
            partial_remainder.push(num_padded[offset]);
        } else {
            if (offset === num_size || ((denom_size > num_size) && (i === 0))) {
                quotient.push('.');
            }
            partial_remainder.push(0);
            allow_bit_growth = true;
        }
        offset += 1;
    }

    let math_result_2s_comp;
    if (invert_quotient === 1) {
        let quotient_size = quotient.length;
        let quotient_radix_index = quotient.includes('.') ? quotient.indexOf('.') : quotient_size;

        if (quotient.includes('.')) {
            quotient.splice(quotient_radix_index, 1);
        }

        let quotient_fraction_size = quotient_radix_index < quotient_size ? quotient_size - (quotient_radix_index + 1) : 0;
        let quotient_no_bin_point = quotient;
        let [quotient_2s_comp, carry_quotient] = twos_complement(quotient_no_bin_point);
        let quotient_2s_comp_bin_point = quotient_2s_comp.slice(0, quotient_size - quotient_fraction_size - 1).concat(['.']).concat(quotient_2s_comp.slice(quotient_size - quotient_fraction_size - 1));

        math_result_2s_comp = quotient_2s_comp_bin_point;
    } else {
        math_result_2s_comp = quotient;
    }

    return math_result_2s_comp;
}

export function binary_multiplier(operand_a, operand_b) {
	if (enable_print_statements) {
		console.log("multiplier start");
		console.log(operand_a.join(""), operand_b.join(""));
	}
    let a_has_binary_point = operand_a.includes('.');
    let b_has_binary_point = operand_b.includes('.');

    let [operand_a_padded, operand_b_padded, a_fraction_size, b_fraction_size] = binary_point_alignment(operand_a, operand_b, true);
    let total_fraction_size;

    if (a_fraction_size > b_fraction_size) {
        total_fraction_size = a_fraction_size * 2;
    } else if (b_fraction_size >= a_fraction_size) {
        total_fraction_size = b_fraction_size * 2;
    }

	if (enable_print_statements) {
		console.log(a_fraction_size, b_fraction_size, total_fraction_size);
		console.log(list_to_string(operand_a_padded), list_to_string(operand_b_padded));
	}

    let negative_output = operand_a[0] ^ operand_b[0];
    let a_size = operand_a_padded.length;
    let b_size = operand_b_padded.length;
    let current_sum = new Array(a_size).fill(0);

    for (let i = a_size - 1; i >= 0; i--) {
        let addend_a, addend_b;
        if (operand_b_padded[i] === 1) {
            addend_a = current_sum;
            addend_b = operand_a_padded.concat(new Array((a_size - 1) - i).fill(0));
        } else {
            addend_a = current_sum;
            addend_b = new Array(a_size).fill(0).concat(new Array((a_size - 1) - i).fill(0));
        }

        let [c_sum, current_carry] = binary_adder(addend_a, addend_b);
        current_sum = [current_carry].concat(c_sum);
    }

    let product_2s_comp;
    if (negative_output === 1) {
        let product_carry;
        [product_2s_comp, product_carry] = twos_complement(current_sum);
    } else {
        product_2s_comp = current_sum;
    }

    let product_size = product_2s_comp.length;

    if (enable_print_statements === true) {
        console.log(product_2s_comp.join(""));
        console.log("multiplier stop");
    }

    let product;
    if (a_has_binary_point === true || b_has_binary_point === true) {
        product = product_2s_comp.slice(0, product_size - total_fraction_size).concat(['.']).concat(product_2s_comp.slice(product_size - total_fraction_size));
    } else {
        product = product_2s_comp;
    }

    return product;
}

export function binary_adder(n, addend) {
	let n_sum = [];
	let carry = 0;
	for (let i = n.length - 1; i >= 0; i--) {
		n_sum.push((addend[i] ^ n[i]) ^ carry);
		carry = (carry & n[i]) | (n[i] & addend[i]) | (carry & addend[i]);
	}
	let carry_out;
	if (n_sum.length > n.length) {
		carry_out = carry | n_sum[n_sum.length - 1];
	} else {
		carry_out = carry;
	}
	n_sum.reverse();
	return [n_sum, carry_out];
}

export function binary_subtraction(A, B) {
    let [operand_a_padded, operand_b_padded, a_fraction_size, b_fraction_size] = binary_point_alignment(A, B, false);
    let [operand_b_2s_comp, carry] = twos_complement(operand_b_padded);
    let fraction_size = a_fraction_size > b_fraction_size ? a_fraction_size : b_fraction_size;

    let [difference_sum, difference_carry] = binary_adder(operand_a_padded, operand_b_2s_comp);
    let difference;

    if ((A[0] === 1 && B[0] === 0) || (A[0] === 0 && B[0] === 1)) {
        difference = [difference_carry].concat(difference_sum);
    } else {
        difference = difference_sum;
    }

    let binary_point_index = difference.length - fraction_size;
    let difference_bin_point = difference.slice(0, binary_point_index).concat(['.']).concat(difference.slice(binary_point_index));

    if (enable_print_statements === true) {
        console.log(list_to_string(A), list_to_string(B));
        console.log(list_to_string(operand_a_padded), list_to_string(operand_b_padded), a_fraction_size, b_fraction_size);
        console.log(list_to_string(difference));
    }

    return difference_bin_point;
}

export function binary_modulo(A, B, max_size) {
    let a_copy = [...A];
    let b_copy = [...B];
    let a_sign_bit = A[0];
    let b_sign_bit = B[0];
	let quotient = binary_division(A, B, max_size);
	let radix_index = quotient.indexOf('.');
	let quotient_floor = quotient.slice(0, radix_index);
	let product = binary_multiplier(b_copy, quotient_floor);
	let modulo = binary_subtraction(a_copy, product);
	let modulo_2s_comp;
	if ((a_sign_bit ^ b_sign_bit) === 1) {
		let modulo_radix = modulo.indexOf('.');
		modulo.splice(modulo_radix, 1);
		let [m_2s_comp, carry] = twos_complement(modulo);
		modulo_2s_comp = m_2s_comp;
		modulo_2s_comp.splice(modulo_radix, 0, '.');
	} else {
		modulo_2s_comp = modulo;
	}
	return modulo_2s_comp;
}
export function binary_twos_complement(A) {
	let a_2s_comp;
	if (A.includes('.')) {
		let binary_point_index = A.indexOf('.');
		let A_copy = [...A];
		A_copy.splice(binary_point_index, 1);
		let [m_2s_comp, carry] = twos_complement(A_copy);
		a_2s_comp = m_2s_comp;
		a_2s_comp.splice(binary_point_index, 0, '.');
	} else {
		let [m_2s_comp, carry] = twos_complement(A);
		a_2s_comp = m_2s_comp;
	}
	return a_2s_comp;
}
