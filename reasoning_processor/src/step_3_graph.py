import os
import json
import re
from typing import Optional, List

# --- Step 3: Graph Generation ---
# Create TypeScript files from grouped JSON outputs by injecting data into a template.
# Looks for files named `_grouped_complete_*.json` in the input folder and writes `*.ts` files
# to the output folder. The template is expected at `<output_ts_dir>/template.ts` and must
# contain a placeholder `const originalInputJson = { ... };` to be replaced.


def process_directory(input_json_dir: str, output_ts_dir: str, config: Optional[dict] = None) -> List[str]:
    """
    Generate .ts files from grouped JSON using a simple placeholder replacement in a template.

    Args:
        input_json_dir: Directory containing `_grouped_complete_*.json` files.
        output_ts_dir: Directory where generated `*.ts` files (and template.ts) live.
        config: Unused here; accepted for API consistency with other steps.

    Returns:
        List of paths to generated `.ts` files.
    """
    generated_files: List[str] = []

    # Ensure output directory exists
    try:
        os.makedirs(output_ts_dir, exist_ok=True)
    except OSError as e:
        print(f"Error creating output directory {output_ts_dir}: {e}")
        return generated_files

    # 1) Load template from output folder (assumes co-located template.ts)
    template_file_path = os.path.join(output_ts_dir, "template.ts")
    try:
        with open(template_file_path, 'r', encoding='utf-8') as f:
            template_content = f.read()
    except FileNotFoundError:
        print(f"Error: Template file not found at {template_file_path}")
        return generated_files
    except IOError as e:
        print(f"Error reading template file {template_file_path}: {e}")
        return generated_files

    # 2) Find grouped JSON files
    json_files_to_process = []
    try:
        for filename in os.listdir(input_json_dir):
            if filename.startswith("_grouped_complete_") and filename.endswith(".json"):
                json_files_to_process.append(filename)
    except FileNotFoundError:
        print(f"Error: Input JSON directory not found at {input_json_dir}")
        return generated_files
    except OSError as e:
        print(f"Error listing files in {input_json_dir}: {e}")
        return generated_files

    if not json_files_to_process:
        print(f"No JSON files starting with '_grouped_complete_' found in {input_json_dir}")
        return generated_files

    # 3) Render each JSON into a TS file by replacing the placeholder
    for json_filename in json_files_to_process:
        input_json_path = os.path.join(input_json_dir, json_filename)

        try:
            with open(input_json_path, 'r', encoding='utf-8') as f:
                json_data = json.load(f)
        except json.JSONDecodeError:
            print(f"Error: Could not decode JSON from {input_json_path}. Skipping.")
            continue
        except FileNotFoundError:  # Should not happen if listdir worked
            print(f"Error: JSON file {input_json_path} not found though listed. Skipping.")
            continue
        except IOError as e:
            print(f"Error reading JSON file {input_json_path}: {e}")
            continue

        # Replace `const originalInputJson = { ... };` with pretty-printed JSON
        js_object_string = json.dumps(json_data, indent=2)
        pattern = r"const originalInputJson = \{[\s\S]*?\};"
        replacement_text_for_template = f"const originalInputJson = {js_object_string};"
        modified_content, num_replacements = re.subn(
            pattern,
            lambda m: replacement_text_for_template,
            template_content,
            count=1,
        )

        if num_replacements == 0:
            print(
                f"Warning: Placeholder not found/replaced in template for {json_filename}. Output file might be incorrect."
            )

        # Output name: _grouped_complete_name.json -> name.ts
        base_name = json_filename.replace("_grouped_complete_", "", 1).replace(".json", "")
        if not base_name:
            base_name = "untitled"
        output_ts_filename = f"{base_name}.ts"
        output_ts_path = os.path.join(output_ts_dir, output_ts_filename)

        try:
            with open(output_ts_path, 'w', encoding='utf-8') as f:
                f.write(modified_content)
            print(f"Successfully generated {output_ts_path}")
            generated_files.append(output_ts_path)
        except IOError:
            print(f"Error: Could not write to output file {output_ts_path}")

    return generated_files


if __name__ == '__main__':
    # Convenient defaults when running this module directly
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    input_json_dir = os.path.join(base_dir, 'output', 'grouped')
    output_ts_dir = os.path.join(base_dir, 'output', 'graph')
    process_directory(input_json_dir, output_ts_dir)