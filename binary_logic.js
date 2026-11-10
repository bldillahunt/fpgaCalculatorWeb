import { add_msbs } from './binary_support.js';

export function binary_and(A, B) {
    let [operand1_no_bin_point, operand2_no_bin_point] = add_msbs(A, B);
    return operand1_no_bin_point.map((bit_a, idx) => bit_a & operand2_no_bin_point[idx]);
}

export function binary_or(A, B) {
    let [operand1_no_bin_point, operand2_no_bin_point] = add_msbs(A, B);

    if (A.includes('.') || B.includes('.')) {
        return "Binary point in logic operation";
    } else if (typeof A === 'string' || typeof B === 'string') {
        return "Text input to binary OR";
    } else {
        return operand1_no_bin_point.map((bit_a, idx) => bit_a | operand2_no_bin_point[idx]);
    }
}

export function binary_xor(A, B) {
    let [operand1_no_bin_point, operand2_no_bin_point] = add_msbs(A, B);
    return operand1_no_bin_point.map((bit_a, idx) => bit_a ^ operand2_no_bin_point[idx]);
}

export function binary_not(A) {
    let operand_inverted = [];
    for (let i = 0; i < A.length; i++) {
        operand_inverted.push(A[i] ^ 1);
    }
    return operand_inverted;
}