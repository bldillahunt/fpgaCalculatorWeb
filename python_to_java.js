import { compute_evaluation_step } from './main_alu.js';

let input = '';

for await (const chunk of process.stdin) {
    input += chunk;
}

const params = JSON.parse(input);

const result = compute_evaluation_step(
    params.main_display_value,
    params.input_mode,
    params.output_mode,
    params.int_bits,
    params.frac_bits,
    params.enable_print_statements
);

console.log(JSON.stringify(result));