import os
import json
from typing import Dict, Any, List, Optional

from .file_utils import (
    load_json_file,
    save_json_file,
    ensure_directory,
    list_files
)

# --- Step 1: Parsing ---
# Convert raw reasoning text (single string) into a structured list of step objects.
# Each step has an incremental index and the original line text.


def parse_raw_reasoning(reasoning_text: str) -> List[Dict[str, Any]]:
    """
    Split raw reasoning text by lines and produce a list of steps.

    Each non-empty line becomes a step: {"index": int, "content": str}.
    Leading/trailing whitespace is trimmed; empty lines are ignored.
    """
    lines = reasoning_text.strip().split("\n")
    steps: List[Dict[str, Any]] = []
    index = 0

    for line in lines:
        line = line.strip()
        if line:  # skip empty lines
            steps.append({"index": index, "content": line})
            index += 1

    return steps


def process_file(file_path: str, output_dir: str = None) -> Dict[str, Any]:
    """
    Parse one input JSON file into structured reasoning steps.

    Input JSON is expected to contain keys like 'question', 'reasoning_content' (raw string or list), and 'model_response'.
    If 'reasoning_content' is already a list, the data is returned unchanged.

    When output_dir is provided, the parsed result is saved with the same filename in that folder.
    """
    print(f"Loading file: {file_path}")
    data = load_json_file(file_path)

    reasoning_content = data.get("reasoning_content", "")

    # If already structured, return as-is
    if isinstance(reasoning_content, List):
        print(f"File {file_path} already has structured reasoning content.")
        return data

    print(f"Parsing raw reasoning from: {file_path}")
    parsed_steps = parse_raw_reasoning(reasoning_content)

    output_data = {
        "question": data.get("question", ""),
        "reasoning_content": parsed_steps,
        "model_response": data.get("model_response", ""),
    }

    if output_dir:
        filename = os.path.basename(file_path)
        output_path = os.path.join(output_dir, f"{filename}")  # keep the same name
        save_json_file(output_data, output_path)
        print(f"Saved parsed reasoning to {output_path}")

    return output_data


def process_directory(input_dir: str, output_dir: str, config: Optional[Dict[str, Any]] = None):
    """
    Parse all JSON files in input_dir and write results to output_dir.

    Args:
        input_dir: Folder containing input JSON files.
        output_dir: Destination folder for parsed JSON files.
        config: Unused in this step (accepted for a consistent API).

    Returns:
        List[Dict[str, Any]] of parsed results.
    """
    print(f"Starting to process directory: {input_dir}")
    print(f"Output directory: {output_dir}")

    ensure_directory(output_dir)

    json_files = list_files(input_dir, ".json")
    print(f"Found {len(json_files)} JSON files to process")

    processed_data: List[Dict[str, Any]] = []
    for i, file_path in enumerate(json_files, 1):
        print(f"\n--- Processing file {i}/{len(json_files)} ---")
        try:
            result = process_file(file_path, output_dir)
            processed_data.append(result)
            print(f"✓ File {i}/{len(json_files)} completed successfully")
        except Exception as e:
            print(f"✗ Error processing {file_path}: {e}")

    print(f"\n=== Directory processing complete ===")
    print(f"Successfully processed {len(processed_data)}/{len(json_files)} files")
    return processed_data


if __name__ == "__main__":
    # Helpful defaults for ad-hoc runs
    input_dir = "output/parsed"
    output_dir = "output/parsed"

    ensure_directory(output_dir)
    processed_data = process_directory(input_dir, output_dir)
    print(f"Processed {len(processed_data)} files")