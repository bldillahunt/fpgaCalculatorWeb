import subprocess
import json

params = {
    "main_display_value": main_display_value,
    "input_mode": input_mode,
    "output_mode": output_mode,
    "int_bits": int_bits,
    "frac_bits": frac_bits,
    "enable_print_statements": False
}

result = subprocess.run(
    ["node", "testbench.js"],
    input=json.dumps(params),
    capture_output=True,
    text=True
)

displays = json.loads(result.stdout)

display_a = displays[0]
display_b = displays[1]
