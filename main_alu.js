import {
    twos_complement,
    binary_string_to_int_list, int_list_to_binary_string,
    binary_point_alignment, list_to_string
} from './binary_support.js';

import {
    real_to_twos_comp_binary, hexadecimal_to_binary,
    ieee754_hex_to_binary, binary_to_real,
    binary_to_hexadecimal, binary_to_ieee754
} from './binary_conversions.js';

import {
    binary_division, binary_multiplier, binary_adder,
    binary_subtraction, binary_modulo, binary_twos_complement
} from './binary_math.js';

import { binary_and, binary_or, binary_xor, binary_not } from './binary_logic.js';
import {
	precision_profile, lookup_table
} from './binary_constants.js';

const HEX_NEGATIVE_LIST = ["8", "9", "A", "B", "C", "D", "E", "F", "a", "b", "c", "d", "e", "f"];
const enable_print_statements = true;

export function compute_evaluation_step(main_display_value, input_mode, output_mode, int_bits, frac_bits, enable_print_statements) {
    let nibble_size = Math.floor(int_bits / 4);
	if (enable_print_statements)
    	console.log("Starting operation");

    let [operand1, operator, operand2, operand1_present, operator_present, operand2_present, input_error] = parse_input_string(main_display_value);

    let operand1_data_error = false;
    let operand2_data_error = false;

	if (enable_print_statements)
    	console.log("operand1 =  ", operand1, "operand2 = ", operand2, "operator = ", operator, "error = ", input_error);

    if (!input_error) {
        if (input_mode === "REAL") {
            operand1_data_error = verify_real_input(operand1);
            if (operand2 !== "") {
                operand2_data_error = verify_real_input(operand2);
            }
        } else if (input_mode === "HEX") {
            if (operand1.length > 0 && operand1.length < nibble_size) {
                operand1 = operand1.padStart(nibble_size, HEX_NEGATIVE_LIST.includes(operand1) ? "F" : "0");
            }
            operand1_data_error = verify_hex_input(operand1, int_bits, frac_bits);

            if (operand2_present) {
                if (operand2.length > 0 && operand2.length < nibble_size) {
                    operand2 = operand2.padStart(nibble_size, HEX_NEGATIVE_LIST.includes(operand2) ? "F" : "0");
                }
                operand2_data_error = verify_hex_input(operand2, int_bits, frac_bits);
            }
        } else if (input_mode === "BIN") {
            operand1_data_error = verify_bin_input(operand1);
            if (operand2 !== "") {
                operand2_data_error = verify_bin_input(operand2);
            } else if (operator_present && !operand2_present) {
                operand2_data_error = true;
            }
			if (enable_print_statements)
            	console.log("operand1 error = ", operand1_data_error, "operand2 error = ", operand2_data_error);
        } else if (input_mode === "FP32") {
            operand1_data_error = verify_fp32_input(operand1);
            if (operand2_present) {
                operand2_data_error = verify_fp32_input(operand2);
            }
        } else if (input_mode === "FP64") {
            operand1_data_error = verify_fp64_input(operand1);
            if (operand2_present) {
                operand2_data_error = verify_fp64_input(operand2);
            }
        }
    }

    let operator_error = verify_operator(operator, input_mode, output_mode);

    if (!input_error) {
        if (((operand1.includes('.') || operand2.includes('.')) && ["&", "|", "^", "~"].includes(operator)) || (operator_error && operator !== "")) {
            if (enable_print_statements) {
                console.log("input error", operator_error, operand1, operand2, operator);
            }
            if (["&", "|", "^", "~"].includes(operator)) {
                return ["", "Enter logic operands without radix point"];
            }
            return ["", "ERROR"];

        } else if (!operand1_data_error && !operand2_data_error && !operator_error) {
            let operand1_binary;
            if (["~", "!"].includes(operator) || (operand2_present && ["&", "|", "^"].includes(operator))) {
                operand1_binary = convert_to_binary(operand1, input_mode, int_bits, 0);
            } else {
                operand1_binary = convert_to_binary(operand1, input_mode, int_bits, frac_bits);
            }

            let calculator_result;
            if (operand2_present) {
                let operand2_binary;
                if (["&", "|", "^"].includes(operator)) {
                    operand2_binary = convert_to_binary(operand2, input_mode, int_bits, 0);
                } else {
                    operand2_binary = convert_to_binary(operand2, input_mode, int_bits, frac_bits);
                }

                let binary_result = binary_math_operation(operand1_binary, operand2_binary, operator, int_bits, frac_bits, output_mode, enable_print_statements);
                calculator_result = convert_from_binary(binary_result, output_mode);
            } else if (["~", "!", "2'S"].includes(operator)) {
                let binary_result = binary_math_operation(operand1_binary, null, operator, int_bits, frac_bits, output_mode, enable_print_statements);
                calculator_result = convert_from_binary(binary_result, output_mode);
            } else {
                calculator_result = convert_from_binary(operand1_binary, output_mode);
            }

            return [main_display_value, calculator_result];
        } else {
            if (enable_print_statements) {
                console.log("general error");
            }
            return ["", "ERROR"];
        }
    } else {
        return ["", "ERROR"];
    }
}

export function parse_input_string(input_string) {
    let state = 'Empty_String_Check';
    let data_length = input_string.length;
    let input_index = 0;
    let left = "", op = "", right = "";
    let operand1_present = false;
    let operator_present = false;
    let operand2_present = false;
    let input_error = false;

    const isAlphanumeric = str => /^[a-z0-9]+$/i.test(str);

    while (true) {
        switch (state) {
            case 'Empty_String_Check':
                if (!input_string) {
                    return ["", "", "", false, false, false, true];
                }
                state = 'First_Character';
                break;
            case 'First_Character':
                if (['+', '~', '!'].includes(input_string[input_index])) {
                    if (['~', '!'].includes(input_string[input_index])) {
                        op = input_string[input_index];
                    }

                    if (data_length > 1) {
                        input_index += 1;
                        state = 'First_Operand';
                    } else {
                        return ["", "", "", false, false, false, true];
                    }
                } else if (input_string[input_index] === '-' || isAlphanumeric(input_string[input_index]) || input_string[input_index] === ".") {
                    left += input_string[input_index];

                    if (data_length > 1) {
                        input_index += 1;
                        state = 'First_Operand';
                    } else {
                        return [left, op, right, operand1_present, operator_present, operand2_present, input_error];
                    }
                } else {
                    return ["", "", "", false, false, false, true];
                }
                break;
            case 'First_Operand':
                while (input_index < data_length && !["+", "-", "*", "/", "%", "&", "|", "^"].includes(input_string[input_index])) {
                    if (isAlphanumeric(input_string[input_index]) || input_string[input_index] === ".") {
                        left += input_string[input_index];
                        if (input_index < data_length - 1) {
                            input_index += 1;
                        } else {
                            operand1_present = true;
                            return [left, op, right, operand1_present, operator_present, operand2_present, input_error];
                        }
                    } else {
                        return ["", "", "", false, false, false, true];
                    }
                }

                operand1_present = true;
                operator_present = true;
                if (!['~', '!'].includes(op)) {
                    op = input_string[input_index];
                }
                input_index += 1;

                if (input_index < data_length) {
                    if (input_string[input_index] !== "") {
                        state = 'Second_Operand';
                    } else {
                        operand2_present = false;
                        return [left, op, right, operand1_present, operator_present, operand2_present, input_error];
                    }
                } else {
                    operand2_present = false;
                    return [left, op, right, operand1_present, operator_present, operand2_present, input_error];
                }
                break;
            case 'Second_Operand':
                while (input_index < data_length) {
                    if (isAlphanumeric(input_string[input_index]) || input_string[input_index] === "." || (right === "" && input_string[input_index] === "-")) {
                        right += input_string[input_index];
                        if (input_index < data_length - 1) {
                            input_index += 1;
                        } else {
                            operand2_present = true;
                            return [left, op, right, operand1_present, operator_present, operand2_present, input_error];
                        }
                    } else {
                        return ["", "", "", false, false, false, true];
                    }
                }
                operand2_present = true;
				return [left, op, right, operand1_present, operator_present, operand2_present, input_error];
		}
	}
}
export function verify_real_input(input_string) {
	return isNaN(Number(input_string));
}
export function verify_hex_input(input_string, int_bits, frac_bits) {
	let val = parseInt(input_string, 16);
	if (isNaN(val)) return true;
		return input_string.length > (int_bits + frac_bits) / 4;
}
export function verify_bin_input(input_string) {

    let countDot = (input_string.match(/\./g) || []).length;

    return (
        countDot > 1 || /[2-9A-Fa-f]/.test(input_string)
    );
}
export function verify_fp32_input(input_string) {
	if (isNaN(parseInt(input_string, 16))) return true;
		return input_string.length !== 8;
}
export function verify_fp64_input(input_string) {
	if (isNaN(parseInt(input_string, 16))) return true;
		return input_string.length !== 16;
}
export function verify_operator(input_string, input_mode, output_mode) {
	let logic_error = false;
	if (["&", "|", "^", "~", "!", "2'S"].includes(input_string)) {
		logic_error = ["REAL", "FP32", "FP64"].includes(input_mode) || ["REAL", "FP32", "FP64"].includes(output_mode);
	} else {
		logic_error = false;
	}
	return (!["+", "-", "*", "/", "%", "&", "|", "^", "~", "!", "2'S", ""].includes(input_string)) || logic_error;
}
export function convert_to_binary(operand, input_mode, int_bits, frac_bits) {
	if (input_mode === "REAL") {
		return binary_string_to_int_list(real_to_twos_comp_binary(operand, int_bits, frac_bits));
	} else if (input_mode === "HEX") {
		return binary_string_to_int_list(hexadecimal_to_binary(operand, int_bits, frac_bits, lookup_table));
	} else if (input_mode === "FP32") {
		return ieee754_hex_to_binary(operand, precision_profile["SINGLE"], lookup_table);
	} else if (input_mode === "FP64") {
		return ieee754_hex_to_binary(operand, precision_profile["DOUBLE"], lookup_table);
	} else {
		return binary_string_to_int_list(operand);
	}
}
export function binary_math_operation(operand1, operand2, operator, int_bits, frac_bits, output_mode, enable_print_statements = false) {
	if (operator === "/") {
	let max_size = int_bits + frac_bits;
	if (output_mode === "FP32") {
		max_size = Math.max(64, int_bits + frac_bits);
	} else if (output_mode === "FP64") {
		max_size = Math.max(128, int_bits + frac_bits);
	}
		return binary_division(operand1, operand2, max_size);
	} else if (operator === "*") {
		return binary_multiplier(operand1, operand2);
	} else if (operator === "+") {
		let [addend_a, addend_b, op1_f, op2_f] = binary_point_alignment(operand1, operand2, false);
		let fraction_size = Math.max(op1_f, op2_f);
		let [n_sum, n_carry] = binary_adder(addend_a, addend_b);
		let sum_result;
		if ((operand1[0] === 0 && operand2[0] === 0 && n_sum[0] === 1) || (operand1[0] === 1 && operand2[0] === 1 && n_sum[0] === 0)) {
			sum_result = [n_carry].concat(n_sum);
		} else {
			sum_result = n_sum;
		}
		let binary_point_index = sum_result.length - fraction_size;
		return sum_result.slice(0, binary_point_index).concat(['.']).concat(sum_result.slice(binary_point_index));
	} else if (operator === "-") {
		return binary_subtraction(operand1, operand2);
	} else if (operator === "%") {
		return binary_modulo(operand1, operand2, int_bits + frac_bits);
	} else if (operator === "&") {
		return binary_and(operand1, operand2);
	} else if (operator === "|") {
		return binary_or(operand1, operand2);
	} else if (operator === "^") {
		return binary_xor(operand1, operand2);
	} else if (operator === "~") {
		return binary_not(operand1);
	} else if (["!", "2'S"].includes(operator)) {
		return binary_twos_complement(operand1);
	}
}
export function convert_from_binary(operand, output_mode) {
	if (output_mode === "REAL") {
		return binary_to_real(operand);
	} else if (output_mode === "HEX") {
		return binary_to_hexadecimal(operand, lookup_table);
	} else if (output_mode === "FP32") {
		return binary_to_ieee754(operand, precision_profile["SINGLE"], lookup_table);
	} else if (output_mode === "FP64") {
		return binary_to_ieee754(operand, precision_profile["DOUBLE"], lookup_table);
	} else {
		return int_list_to_binary_string(operand, operand.length).join("");
	}
}
