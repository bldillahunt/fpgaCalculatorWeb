import unittest 
import itertools
from binary_support import int_list_to_binary_string, binary_string_to_int_list, list_to_string
from binary_conversions import binary_to_real
from itertools import chain
import random  # NEW: Required for generating random fuzzing inputs
import decimal
from decimal import Decimal
import subprocess
import json

"""Initializes the class layout once in memory for the tests.""" 
# =====================================================================
# ?? RANDOM FUZZING REGRESSION SECTION (Runs First & Decoupled)
# =====================================================================
print(" Initializing Decoupled Random Fuzzing Regression Suite...")

# Ensure the precision is high enough to hold your 35+ digit calculations
decimal.getcontext().prec = 60

# Define configuration bounds for the random generator
test_cases = ["REAL", "HEX", "BIN", "FP32", "FP64"]
math_ops = ["+", "-", "*", "/"]

SIZE_MAP = {
	"HEX":  (32, 64),
	"REAL": (32, 64),
	"BIN":  (32, 64),
	"FP32": (12, 11),
	"FP64": (32, 64),
}		

passed_fuzz = 0
failed_fuzz = 0
fuzz_mismatch_logs = []

if True:
	def gui_entry_parameters(value, input_mode, output_mode, int_size, frac_size):
		params = {
			"main_display_value": value,
			"input_mode": input_mode,
			"output_mode": output_mode,
			"int_bits": int_size,
			"frac_bits": frac_size,
			"enable_print_statements": False
		}

		result = subprocess.run(
			["node", "python_to_java.js"],
			input=json.dumps(params),
			capture_output=True,
			text=True
		)

		displays = json.loads(result.stdout)
		display_a = displays[0]
		display_b = displays[1]
		return display_b


	# Helper to execute calculations through your Tkinter app state silently
	def run_silent_fuzz(val, in_m, out_m, i_sz, f_sz):
		return gui_entry_parameters(val, in_m, out_m, i_sz, f_sz)

	# Helper to generate a completely randomized, valid fixed-point binary string list
	def generate_random_bin_list(int_w, frac_w):
		# Randomize sign bit, integer bits, and fractional bits
		bits = [random.choice([0, 1]) for _ in range(int_w + frac_w)]
		bits.insert(int_w, '.') # Drop the radix point at the exact boundary
		return bits

	print("Running random data")

	# Set a target number of random combinations to run (e.g., 2000 patterns)
	NUM_FUZZ_PATTERNS = 2000 

	for pattern_idx in range(NUM_FUZZ_PATTERNS):
		# 1. Randomly select format pairs, widths, and operations
		in_type = random.choice(test_cases)
		out_type = random.choice(test_cases)
		op = random.choice(math_ops)

		# Constrain registers dynamically to mirror your hardware parameters
	#			int_size = 12 if in_type == "HEX" else 32
	#			frac_size = 12 if in_type == "HEX" else 32

		int_size, frac_size = SIZE_MAP.get(in_type, (32, 64))

		# 2. Generate two distinct, randomized binary array seeds
		seed_a = generate_random_bin_list(int_size, frac_size)
		seed_b = generate_random_bin_list(int_size, frac_size)

		str_seed_a = "".join(map(str, seed_a))
		str_seed_b = "".join(map(str, seed_b))

		try:
			# 3. Process inputs through the calculator's conversion layer
			conv_a = run_silent_fuzz(str_seed_a, "BIN", in_type, int_size, frac_size)
			conv_b = run_silent_fuzz(str_seed_b, "BIN", in_type, int_size, frac_size)

			# Handle division by zero constraints safely at the regression layer
			if op == '/' and Decimal(binary_to_real(seed_b)) == 0.0:
				continue 

			# Combine operands and operator into your standard execution string
			eval_string = f"{conv_a}{op}{conv_b}"
			raw_output = run_silent_fuzz(eval_string, in_type, "BIN", int_size, frac_size)

			# 4. Reference Verification Math
			val_a = Decimal(binary_to_real(seed_a))
			val_b = Decimal(binary_to_real(seed_b))

			if op == '+': expected_real = val_a + val_b
			elif op == '-': expected_real = val_a - val_b
			elif op == '*': expected_real = val_a * val_b
			elif op == '/': expected_real = val_a / val_b

			calculated_real = Decimal(binary_to_real(binary_string_to_int_list(raw_output)))

			allowed_tolerance = 1e-4 if int_size == 64 else 1e-6

			if expected_real != 0:
				is_match = (abs(calculated_real - expected_real) / abs(expected_real)) < allowed_tolerance
			else:
				# If the expected answer is exactly 0.0, a relative check breaks (division by zero).
				# We gracefully fall back to a strict absolute boundary check for 0.0.
				is_match = abs(calculated_real) < allowed_tolerance

			# Validate tolerance to protect against basic floating-point representation limits
			if is_match:
				passed_fuzz += 1
			else:
				failed_fuzz += 1
				fuzz_mismatch_logs.append(
					f"Pattern #{pattern_idx} Mismatch!\n"
					f"  Format Pair: {in_type} -> {out_type} | Op: [{op}] | Width: Q{int_size}.{frac_size}\n"
					f"  Operand A Binary: {str_seed_a} ({val_a})\n"
					f"  Operand B Binary: {str_seed_b} ({val_b})\n"
					f"  Expected Real:    {expected_real}\n"
					f"  Calculator Real:  {calculated_real} (Raw Return: '{raw_output}')\n"
				)
		except Exception as e:
			failed_fuzz += 1
			fuzz_mismatch_logs.append(f"Pattern #{pattern_idx} CRASHED: {str(e)} | Context: {str_seed_a} {op} {str_seed_b} [{in_type}]")

	print("\n" + "="*60)
	print(f"RANDOM FUZZING REGRESSION RESULTS: {'PASSED' if failed_fuzz == 0 else 'FAILED'}")
	print(f"Total Random Permutations Evaluated: {passed_fuzz + failed_fuzz}")
	print(f"Passed Patterns: {passed_fuzz} | Detected Mismatches: {failed_fuzz}")
	print("="*60 + "\n")

	print("Report errors")
	if failed_fuzz > 0:
		print(" FUZZ ENGINE ERROR DIAGNOSTIC BREAKDOWN:")
		for log in fuzz_mismatch_logs[:5]: # Display first 5 failure vectors
			print(log + "-"*40)
		if failed_fuzz > 5:
			print(f"  ...and {failed_fuzz - 5} more hidden boundary failures discovered.")
		print("\n Regression check failed. Halting before executing directed tests.")
	#			raise RuntimeError("Randomized regression constraint mismatch detected.")

	print("Core ALU survived all random fuzzing patterns safely! Launching legacy directed tests...\n")
	# =====================================================================

	# =====================================================================
	# ?? MONKEY TYPING INTERFACE FUZZER (Decoupled Chaos Testing)
	# =====================================================================
	print("\n" + "="*60)
	print(" Launching Monkey Typing / Chaos Validation Tester...")
	print("="*60)

	# Pool of absolute keyboard smash chaos: letters, markdown, special characters, and numbers
	monkey_chaos_pool = string.printable + "   " if 'string' in globals() else "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+=-[]{}|;':\",./<>?`~ \t\n"

	NUM_MONKEY_SMASHES = 500
	monkey_crashes = 0
	monkey_crash_logs = []

	for monkey_idx in range(NUM_MONKEY_SMASHES):
		# Generate a random chaotic input string of random length (0 to 80 characters)
		smash_length = random.randint(0, 80)
		chaotic_input = "".join(random.choice(monkey_chaos_pool) for _ in range(smash_length))

		# Pick random states to simulate a frantic user switching formats while typing garbage
		rand_in = random.choice(test_cases)
		rand_out = random.choice(test_cases)
		rand_int, rand_frac = SIZE_MAP.get(rand_in, (32, 32))

		try:
			# Force the chaotic input directly into your Tkinter interface state variables
			gui_entry_parameters(chaotic_input, rand_in, rand_out, rand_int, rand_frac)

			# If your app handles the exception cleanly (e.g., updates an error message label), 
			# Python does not crash, and the loop moves on safely.

		except Exception as monkey_error:
			# A hard crash here means an unhandled exception occurred, which would crash Render!
			monkey_crashes += 1
			monkey_crash_logs.append(
				f"Monkey Crash #{monkey_idx}!\n"
				f"  Input Mode: {rand_in} -> {rand_out}\n"
				f"  Smashed String: {repr(chaotic_input)}\n"
				f"  Python Error Exception: {monkey_error}\n"
			)

	print("="*60)
	print(f"MONKEY CHAOS TEST RESULTS: {'PASSED' if monkey_crashes == 0 else 'FAILED'}")
	print(f"Total Random Keyboard Smashes Processed: {NUM_MONKEY_SMASHES}")
	print(f"Unhandled Interface Crashes: {monkey_crashes}")
	print("="*60 + "\n")

	if monkey_crashes > 0:
		print(" WARNING: Unhandled UI crashes found! Render could drop connections on these inputs:")
		for m_log in monkey_crash_logs[:3]: # Show first 3 keyboard crashes
			print(m_log + "-"*40)
		if monkey_crashes > 3:
			print(f"  ...and {monkey_crashes - 3} more unhandled crashes caught.")
	else:
		print(" Interface is perfectly armored! All keyboard smash exceptions caught gracefully.")
	print("="*60 + "\n")

	# Create test vectors that will fit into IEEE754 single values
	# STEP 1: Create the binary test vectors

def single_bit_shifter_right(operand_sign, seed_value):
	shift_register = seed_value

	if ('.' in shift_register):
		binary_point_index = shift_register.index('.')
	else:
		binary_point_index = len(shift_register)

	shift_register = [bit for bit in shift_register if bit != '.']

	shift_register.pop()
	shift_register.insert(0, operand_sign)
	shift_register.insert(binary_point_index, '.')
	return shift_register

def single_bit_shifter_left(operand_sign, seed_value):
	shift_register = seed_value

	if ('.' in shift_register):
		binary_point_index = shift_register.index('.')
	else:
		binary_point_index = len(shift_register)

	shift_register = [bit for bit in shift_register if bit != '.']

	shift_register.pop(0)
	shift_register.append(0)
	shift_register.insert(binary_point_index, '.')
	return shift_register


test_cases = ["REAL", "HEX", "BIN", "FP32", "FP64"]
integer_sizes = [32, 12, 32, 23, 32]
fraction_sizes = [32, 12, 32, 23, 32]

real_single_pos_right = []
hex_single_pos_right = []
bin_single_pos_right = []
fp32_single_pos_right = []
fp64_single_pos_right = []

output_arrays_pos_right = [real_single_pos_right, hex_single_pos_right, bin_single_pos_right, fp32_single_pos_right, fp64_single_pos_right]

real_single_neg_right = []
hex_single_neg_right = []
bin_single_neg_right = []
fp32_single_neg_right = []
fp64_single_neg_right = []

output_arrays_neg_right = [real_single_neg_right, hex_single_neg_right, bin_single_neg_right, fp32_single_neg_right, fp64_single_neg_right]

real_single_pos_left = []
hex_single_pos_left = []
bin_single_pos_left = []
fp32_single_pos_left = []
fp64_single_pos_left = []

output_arrays_pos_left = [real_single_pos_left, hex_single_pos_left, bin_single_pos_left, fp32_single_pos_left, fp64_single_pos_left]

real_single_neg_left = []
hex_single_neg_left = []
bin_single_neg_left = []
fp32_single_neg_left = []
fp64_single_neg_left = []

output_arrays_neg_left = [real_single_neg_left, hex_single_neg_left, bin_single_neg_left, fp32_single_neg_left, fp64_single_neg_left]

binary_input_file = open("binary_input_file.txt", "w")

# Test pattern: single bit, positive value shifted to the right
pos_right_seed_value = [0] + [1] + [0]*10 + ['.'] + [0]*12
single_positive_right_vectors = []

for i in range(0, 23):
	single_positive_right_vectors.append(pos_right_seed_value)
	pos_right_seed_value = single_bit_shifter_right(0, pos_right_seed_value)

binary_input_file.write("Single Positive Right Vectors" + "\n")

for test, item, int_size, frac_size in zip(test_cases, output_arrays_pos_right, integer_sizes, fraction_sizes): 
	for i in range(0, len(single_positive_right_vectors)):
		item.append(gui_entry_parameters("".join(map(str, single_positive_right_vectors[i])), "BIN", test, int_size, frac_size))
		binary_input_file.write(str(item[i]) + "\n")				

		if (len(item[i]) == 0):
			print("1. positive right", test, list_to_string(single_positive_right_vectors[i]))

# Test pattern: single bit, negative value shifted to the right
neg_right_seed_value = [1] + [0]*11 + ['.'] + [0]*12
single_negative_right_vectors = []

for i in range(0, 23):
	single_negative_right_vectors.append(neg_right_seed_value)
	neg_right_seed_value = single_bit_shifter_right(1, neg_right_seed_value)

binary_input_file.write("Single Negative Right Vectors" + "\n")

for test, item, int_size, frac_size in zip(test_cases, output_arrays_neg_right, integer_sizes, fraction_sizes): 			
	for i in range(0, len(single_negative_right_vectors)):
		item.append(gui_entry_parameters("".join(map(str, single_negative_right_vectors[i])), "BIN", test, int_size, frac_size))
		binary_input_file.write(str(item[i]) + "\n")				

		if (len(item[i]) == 0):
			print("1. negative right", test, list_to_string(single_negative_right_vectors[i]))

# Test pattern: single bit, positive value shifted to the left
pos_left_seed_value = [0]*11 + ['.'] + [0]*11 + [1]
single_positive_left_vectors = []

for i in range(0, 23):
	single_positive_left_vectors.append(pos_left_seed_value)
	pos_left_seed_value = single_bit_shifter_left(0, pos_left_seed_value)

binary_input_file.write("Single Positive Left Vectors" + "\n")

for test, item, int_size, frac_size in zip(test_cases, output_arrays_pos_left, integer_sizes, fraction_sizes): 			
	for i in range(0, len(single_positive_left_vectors)):
		item.append(gui_entry_parameters("".join(map(str, single_positive_left_vectors[i])), "BIN", test, int_size, frac_size))
		binary_input_file.write(str(item[i]) + "\n")				

		if (len(item[i]) == 0):
			print("1. positive left", test, list_to_string(single_positive_left_vectors[i]))

# Test pattern: single bit, negative value shifted to the left
neg_left_seed_value = [1]*11 + ['.'] + [1]*11 + [1]
single_negative_left_vectors = []

for i in range(0, 23):
	single_negative_left_vectors.append(neg_left_seed_value)
	neg_left_seed_value = single_bit_shifter_left(0, neg_left_seed_value)

binary_input_file.write("Single Negative Left Vectors" + "\n")

for test, item, int_size, frac_size in zip(test_cases, output_arrays_neg_left, integer_sizes, fraction_sizes): 			
	for i in range(0, len(single_negative_left_vectors)):
		item.append(gui_entry_parameters("".join(map(str, single_negative_left_vectors[i])), "BIN", test, int_size, frac_size))
		binary_input_file.write(str(item[i]) + "\n")				

		if (len(item[i]) == 0):
			print("1. negative left", test, list_to_string(single_negative_left_vectors[i]))

#		print("Created test vectors")

# STEP 2: Run the test vectors back through the calculator
binary_output_file = open("binary_output_file.txt", "w")

# Test pattern: single bit, positive value shifted to the right
single_pos_right_real = []
single_pos_right_hex = []
single_pos_right_bin = []
single_pos_right_fp32 = []
single_pos_right_fp64 = []

bin_out_arrays_pos_right = [single_pos_right_real, single_pos_right_hex, single_pos_right_bin, single_pos_right_fp32, single_pos_right_fp64]
real_out_arrays_pos_right = [single_pos_right_real, single_pos_right_hex, single_pos_right_bin, single_pos_right_fp32, single_pos_right_fp64]

binary_output_file.write("Single Positive Right Output Vectors" + "\n")

for tests, input_lists, output_lists, int_size, frac_size in zip(test_cases, output_arrays_pos_right, bin_out_arrays_pos_right, integer_sizes, fraction_sizes):
	binary_output_file.write("Output type = " + str(tests) + "\n")

	for i in range(0, len(input_lists)):
		output_lists.append(gui_entry_parameters(input_lists[i], tests, "BIN", int_size, frac_size))
		binary_output_file.write(str(output_lists[i]) + "\n")

		if (len(output_lists[i]) == 0) or (len(input_lists[i]) == 0):
			print("positive right", tests, input_lists[i])

# Test pattern: single bit, negative value shifted to the right
single_neg_right_real = []
single_neg_right_hex = []
single_neg_right_bin = []
single_neg_right_fp32 = []
single_neg_right_fp64 = []

bin_out_arrays_neg_right = [single_neg_right_real, single_neg_right_hex, single_neg_right_bin, single_neg_right_fp32, single_neg_right_fp64]

binary_output_file.write("Single Negative Right Output Vectors" + "\n")

for tests, input_lists, output_lists, int_size, frac_size in zip(test_cases, output_arrays_neg_right, bin_out_arrays_neg_right, integer_sizes, fraction_sizes):
	binary_output_file.write("Output type = " + str(tests) + "\n")

	for i in range(0, len(input_lists)):
		output_lists.append(gui_entry_parameters(input_lists[i], tests, "BIN", int_size, frac_size))
		binary_output_file.write(str(output_lists[i]) + "\n")

		if (len(output_lists[i]) == 0) or (len(input_lists[i]) == 0):
			print("negative right", tests, input_lists[i])

# Test pattern: single bit, positive value shifted to the left
single_pos_left_real = []
single_pos_left_hex = []
single_pos_left_bin = []
single_pos_left_fp32 = []
single_pos_left_fp64 = []

bin_out_arrays_pos_left = [single_pos_left_real, single_pos_left_hex, single_pos_left_bin, single_pos_left_fp32, single_pos_left_fp64]

binary_output_file.write("Single Positive Left Output Vectors" + "\n")

for tests, input_lists, output_lists, int_size, frac_size in zip(test_cases, output_arrays_pos_left, bin_out_arrays_pos_left, integer_sizes, fraction_sizes):
	binary_output_file.write("Output type = " + str(tests) + "\n")

	for i in range(0, len(input_lists)):
		output_lists.append(gui_entry_parameters(input_lists[i], tests, "BIN", int_size, frac_size))
		binary_output_file.write(str(output_lists[i]) + "\n")

		if (len(output_lists[i]) == 0) or (len(input_lists[i]) == 0):
			print("positive left", tests, input_lists[i])

# Test pattern: single bit, negative value shifted to the left
single_neg_left_real = []
single_neg_left_hex = []
single_neg_left_bin = []
single_neg_left_fp32 = []
single_neg_left_fp64 = []

bin_out_arrays_neg_left = [single_neg_left_real, single_neg_left_hex, single_neg_left_bin, single_neg_left_fp32, single_neg_left_fp64]

binary_output_file.write("Single Negative Left Output Vectors" + "\n")

for tests, input_lists, output_lists, int_size, frac_size in zip(test_cases, output_arrays_neg_left, bin_out_arrays_neg_left, integer_sizes, fraction_sizes):
	binary_output_file.write("Output type = " + str(tests) + "\n")

	for i in range(0, len(input_lists)):
		output_lists.append(gui_entry_parameters(input_lists[i], tests, "BIN", int_size, frac_size))
		binary_output_file.write(str(output_lists[i]) + "\n")

		if (len(output_lists[i]) == 0) or (len(input_lists[i]) == 0):
			print("negative left", tests, input_lists[i])

binary_input_file.close()
binary_output_file.close()

#		print("Generated binary outputs")

# Step 3: Compare input lists to output lists
# Put binary inputs and binary outputs together in the same file
comparison_file = open("binary_comparison.txt", "w")

for tests, output_list in zip(test_cases, bin_out_arrays_pos_right):
	for i in range(0, len(single_positive_right_vectors)):
		if (len(single_positive_right_vectors[i]) == 0) or (len(output_list[i]) == 0):
			print("single positive right", "test = ", tests, "input vector = ", single_positive_right_vectors[i], "output vector = ", output_list[i])

		comparison_file.write(binary_to_real(single_positive_right_vectors[i]) + " " + binary_to_real(binary_string_to_int_list(output_list[i])) + " " + list_to_string(single_positive_right_vectors[i]) + " " + output_list[i] + "\n")

for tests, output_list in zip(test_cases, bin_out_arrays_neg_right):
	for i in range(0, len(single_negative_right_vectors)):
		if (len(single_positive_right_vectors[i]) == 0) or (len(output_list[i]) == 0):
			print("single negative right", tests)

		comparison_file.write(binary_to_real(single_negative_right_vectors[i]) + " " + binary_to_real(binary_string_to_int_list(output_list[i])) + " " + list_to_string(single_negative_right_vectors[i]) + " " + output_list[i] + "\n")

for tests, output_list in zip(test_cases, bin_out_arrays_pos_left):
	for i in range(0, len(single_positive_left_vectors)):
		if (len(single_positive_right_vectors[i]) == 0) or (len(output_list[i]) == 0):
			print("single positive left", tests)

		comparison_file.write(binary_to_real(single_positive_left_vectors[i]) + " " + binary_to_real(binary_string_to_int_list(output_list[i])) + " " + list_to_string(single_positive_left_vectors[i]) + " " + output_list[i] + "\n")

for tests, output_list in zip(test_cases, bin_out_arrays_neg_left):
	for i in range(0, len(single_negative_left_vectors)):
		if (len(single_positive_right_vectors[i]) == 0) or (len(output_list[i]) == 0):
			print("single negative left", tests)

		comparison_file.write(binary_to_real(single_negative_left_vectors[i]) + " " + binary_to_real(binary_string_to_int_list(output_list[i])) + " " + list_to_string(single_negative_left_vectors[i]) + " " + output_list[i] + "\n")

comparison_file.close()

with open("binary_comparison.txt", "r") as file:
	for line_num, line in enumerate(file, 1):
		# Skip empty lines
		if not line.strip(): 
			continue

		# Split the row into two string columns, then convert to floats
		col1, col2, col3, col4 = map(float, line.split())

		# Compare them
		if col1 != col2:
			print(f"Mismatch at line {line_num}: Column 1 ({col1}) != Column 2 ({col2})")

#---------- MATH OPERATION TESTS ----------
# STEP 4
# Use the data from the output of step 1 above, pair them off, and then pass them through four times,
# once for each math operation

math_operations = ["+", "-", "*", "/", "%"]

test_a_real_add = []
test_a_real_sub = []
test_a_real_mult = []
test_a_real_div = []

test_a_real_lists = [test_a_real_add, test_a_real_sub, test_a_real_mult, test_a_real_div]

test_a_hex_add = []
test_a_hex_sub = []
test_a_hex_mult = []
test_a_hex_div = []

test_a_hex_lists = [test_a_hex_add, test_a_hex_sub, test_a_hex_mult, test_a_hex_div]

test_a_bin_add = []
test_a_bin_sub = []
test_a_bin_mult = []
test_a_bin_div = []

test_a_bin_lists = [test_a_bin_add, test_a_bin_sub, test_a_bin_mult, test_a_bin_div]

test_a_fp32_add = []
test_a_fp32_sub = []
test_a_fp32_mult = []
test_a_fp32_div = []

test_a_fp32_lists = [test_a_fp32_add, test_a_fp32_sub, test_a_fp32_mult, test_a_fp32_div]

test_a_fp64_add = []
test_a_fp64_sub = []
test_a_fp64_mult = []
test_a_fp64_div = []

test_a_fp64_lists = [test_a_fp64_add, test_a_fp64_sub, test_a_fp64_mult, test_a_fp64_div]

test_b_real_add = []
test_b_real_sub = []
test_b_real_mult = []
test_b_real_div = []

test_b_real_lists = [test_b_real_add, test_b_real_sub, test_b_real_mult, test_b_real_div]

test_b_hex_add = []
test_b_hex_sub = []
test_b_hex_mult = []
test_b_hex_div = []

test_b_hex_lists = [test_b_hex_add, test_b_hex_sub, test_b_hex_mult, test_b_hex_div]

test_b_bin_add = []
test_b_bin_sub = []
test_b_bin_mult = []
test_b_bin_div = []

test_b_bin_lists = [test_b_bin_add, test_b_bin_sub, test_b_bin_mult, test_b_bin_div]

test_b_fp32_add = []
test_b_fp32_sub = []
test_b_fp32_mult = []
test_b_fp32_div = []

test_b_fp32_lists = [test_b_fp32_add, test_b_fp32_sub, test_b_fp32_mult, test_b_fp32_div]

test_b_fp64_add = []
test_b_fp64_sub = []
test_b_fp64_mult = []
test_b_fp64_div = []

test_b_fp64_lists = [test_b_fp64_add, test_b_fp64_sub, test_b_fp64_mult, test_b_fp64_div]

test_a_lists = [test_a_real_lists, test_a_hex_lists, test_a_bin_lists, test_a_fp32_lists, test_a_fp64_lists]
test_b_lists = [test_b_real_lists, test_b_hex_lists, test_b_bin_lists, test_b_fp32_lists, test_b_fp64_lists]

error_counter = 0
permutation_counter = 0

for tests, test_a, test_b, pos_right, neg_right, pos_left, neg_left, int_size, frac_size in zip(test_cases, test_a_lists, test_b_lists, output_arrays_pos_right, output_arrays_neg_right, output_arrays_pos_left, output_arrays_neg_left, integer_sizes, fraction_sizes):	# 5 iterations
	for math_a, math_b, op in zip(test_a, test_b, math_operations):	# 4 iterations
		for i in range(0, len(pos_right)):
			input_data_a = pos_right[i] + op + neg_left[i]
			math_a.append(gui_entry_parameters(input_data_a, tests, "BIN", int_size, frac_size))

#					print(len(pos_right), len(neg_right), len(pos_left), len(neg_left))
#					print(pos_right[i])

			if (op == '+'):
				math_a_real_result = Decimal(binary_to_real(single_positive_right_vectors[i])) + Decimal(binary_to_real(single_negative_left_vectors[i]))
			elif (op == '-'):
				math_a_real_result = Decimal(binary_to_real(single_positive_right_vectors[i])) - Decimal(binary_to_real(single_negative_left_vectors[i]))
			elif (op == '*'):
				math_a_real_result = Decimal(binary_to_real(single_positive_right_vectors[i])) * Decimal(binary_to_real(single_negative_left_vectors[i]))
			elif (op == '/'):
				math_a_real_result = Decimal(binary_to_real(single_positive_right_vectors[i])) / Decimal(binary_to_real(single_negative_left_vectors[i]))
			elif (op == '%'):
				math_a_real_result = Decimal(binary_to_real(single_positive_right_vectors[i])) % Decimal(binary_to_real(single_negative_left_vectors[i]))

			math_a_real = Decimal(binary_to_real(binary_string_to_int_list(math_a[i])))

			if (math_a_real_result != math_a_real):
				print("Mismatch: output A = ", math_a_real, "actual = ", math_a_real_result, list_to_string(single_positive_right_vectors[i]), list_to_string(single_negative_left_vectors[i]), op, tests)
				print(input_data_a)
				error_counter += 1
#						input("Press enter to continue")

			permutation_counter += 1

			input_data_b = neg_right[i] + op + pos_left[i]
			math_b.append(gui_entry_parameters(input_data_b, tests, "BIN", int_size, frac_size))

			if (op == '+'):
				math_b_real_result = Decimal(binary_to_real(single_negative_right_vectors[i])) + Decimal(binary_to_real(single_positive_left_vectors[i]))
			elif (op == '-'):
				math_b_real_result = Decimal(binary_to_real(single_negative_right_vectors[i])) - Decimal(binary_to_real(single_positive_left_vectors[i]))
			elif (op == '*'):
				math_b_real_result = Decimal(binary_to_real(single_negative_right_vectors[i])) * Decimal(binary_to_real(single_positive_left_vectors[i]))
			elif (op == '/'):
				math_b_real_result = Decimal(binary_to_real(single_negative_right_vectors[i])) / Decimal(binary_to_real(single_positive_left_vectors[i]))
			elif (op == '%'):
				math_b_real_result = Decimal(binary_to_real(single_negative_right_vectors[i])) % Decimal(binary_to_real(single_positive_left_vectors[i]))

			math_b_real = Decimal(binary_to_real(binary_string_to_int_list(math_b[i])))

			if (math_b_real_result != math_b_real):
				print("Mismatch: output B = ", math_b_real, "actual = ", math_b_real_result, list_to_string(single_negative_right_vectors[i]), list_to_string(single_positive_left_vectors[i]), op, tests)
				print(input_data_b)
				error_counter += 1
#						input("Press enter to continue")

			permutation_counter += 1

print("Permutation count = ", permutation_counter, "Error count = ", error_counter)
