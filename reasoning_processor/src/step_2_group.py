import os
import json
from typing import Dict, Any, List, Optional
import time

from .file_utils import (
    load_json_file,
    save_json_file,
    ensure_directory,
    list_files
)
from .llm_utils import process_reasoning_step

# --- Step 2: Grouping ---
# Takes parsed reasoning (list of steps) and groups them into logical phases using an LLM.
# Produces two artifacts per file in output_dir:
#   - grouped_<filename>.json: raw LLM output (may include error info)
#   - _grouped_complete_<filename>.json: enriched with step texts (if considered valid)


def group_reasoning_steps(
    parsed_data: Dict[str, Any],
    prompt_path: str = "./prompts/group_system.md",
    template_path: str = "./prompts/group_template.j2",
    config: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:  # This function MUST return a Dict
    """
    Call the LLM with a rendered prompt/template to group parsed steps.

    Ensures the returned data is a dictionary. If a string or invalid JSON is returned,
    convert or wrap it into an error dictionary so callers can handle failures uniformly.
    """
    llm_output = process_reasoning_step(
        input_data=parsed_data,
        prompt_path=prompt_path,
        template_path=template_path,
        config=config,
    )

    if isinstance(llm_output, str):
        try:
            parsed_json = json.loads(llm_output)
            if not isinstance(parsed_json, dict):
                # Valid JSON but not a JSON object
                error_detail = f"LLM output parsed to type {type(parsed_json).__name__}, not a dictionary."
                print(f"Warning: {error_detail} Raw string snippet: {llm_output[:200]}...")
                return {
                    "error": "LLM output did not parse to a dictionary object",
                    "details": error_detail,
                    "raw_response": llm_output,
                }
            return parsed_json
        except json.JSONDecodeError as e:
            error_detail = f"Failed to parse LLM string output as JSON: {e}"
            print(f"Error: {error_detail} Raw string snippet: {llm_output[:200]}...")
            return {
                "error": "LLM output was an invalid JSON string",
                "details": error_detail,
                "raw_response": llm_output,
            }
    elif isinstance(llm_output, dict):
        return llm_output
    else:
        error_detail = f"process_reasoning_step returned unexpected type: {type(llm_output).__name__}"
        llm_output_str = str(llm_output)
        print(f"Error: {error_detail} Content snippet: {llm_output_str[:200]}...")
        return {
            "error": "Unexpected data type from LLM processing step",
            "details": error_detail,
            "raw_response": llm_output_str,
        }


def validate_groups(grouped_data: Dict[str, Any]) -> bool:
    """
    Validate the grouped output against basic structural expectations.
    Returns True for now (placeholder), but prints detailed errors when false.
    """
    # Placeholder: real validation rules can be enabled later
    return True


def create_complete_grouped_data(parsed_data: Dict[str, Any], grouped_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Enrich grouped_data with original step texts and carry forward question/response.
    Expects parsed_data to include 'reasoning_content' with indices and text.
    """
    step_content_map = {step.get("index"): step.get("content", "") for step in parsed_data.get("reasoning_content", [])}

    # Deep copy to avoid mutating input
    complete_grouped_data = json.loads(json.dumps(grouped_data))

    # Traverse nested structure to attach steps under reasoning_analysis.*.subphases[].steps
    if "reasoning_analysis" in complete_grouped_data:
        analysis_data = complete_grouped_data["reasoning_analysis"]
        for main_phase_key, main_phase_value in analysis_data.items():
            if isinstance(main_phase_value, dict) and "subphases" in main_phase_value:
                for subphase in main_phase_value.get("subphases", []):
                    steps_with_content = []
                    for index in subphase.get("step_indices", []):
                        if index in step_content_map:
                            steps_with_content.append({"index": index, "text": step_content_map[index]})
                    subphase["steps"] = steps_with_content

    # Carry over top-level context
    if "question" in parsed_data:
        complete_grouped_data["question"] = parsed_data["question"]
    if "model_response" in parsed_data:
        complete_grouped_data["model_response"] = parsed_data["model_response"]

    return complete_grouped_data


def process_file(
    file_path: str,
    output_dir: str = None,
    prompt_path: str = "./prompts/group_system.md",
    template_path: str = "./prompts/group_template.j2",
    config: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Group one parsed JSON file and write artifacts to output_dir.

    - Always saves raw LLM output as grouped_<filename>.json
    - If validation passes, also saves _grouped_complete_<filename>.json
    - If errors occur, saves a failed_* file with details
    """
    parsed_data = load_json_file(file_path)

    if not isinstance(parsed_data.get("reasoning_content"), list):
        print(f"Error: File {file_path} doesn't contain structured reasoning steps")
        return parsed_data

    try:
        grouped_data_from_llm = group_reasoning_steps(
            parsed_data=parsed_data,
            prompt_path=prompt_path,
            template_path=template_path,
            config=config,
        )

        if not isinstance(grouped_data_from_llm, dict):
            error_message = (
                f"Critical error: group_reasoning_steps did not return a dictionary for {file_path}. "
                f"Got type: {type(grouped_data_from_llm)}."
            )
            print(error_message)
            if isinstance(grouped_data_from_llm, (str, bytes)):
                print(f"Raw content: {grouped_data_from_llm}")

            if output_dir:
                filename = os.path.basename(file_path)
                error_output_path = os.path.join(output_dir, f"failed_grouped_bad_llm_type_{filename}")
                error_data_to_save = {
                    "error": "LLM did not return a dictionary during grouping stage",
                    "details": f"Expected dict, got {type(grouped_data_from_llm)}",
                    "raw_response_content": str(grouped_data_from_llm),
                    "original_file": file_path,
                }
                try:
                    save_json_file(error_data_to_save, error_output_path)
                    print(f"Saved LLM bad response type information to {error_output_path}")
                except Exception as save_e:
                    print(f"Could not save LLM bad response type info: {save_e}")

        # Replace with real validation if/when ready
        is_valid = validate_groups(grouped_data_from_llm)
        if not is_valid:
            print(
                f"Warning: Raw LLM output for grouping {file_path} is invalid. See details from validate_groups."
            )

        if output_dir:
            filename = os.path.basename(file_path)
            raw_output_filename = f"grouped_{filename}" if is_valid else f"failed_grouped_{filename}"
            raw_output_path = os.path.join(output_dir, raw_output_filename)
            save_json_file(grouped_data_from_llm, raw_output_path)
            print(
                f"Saved {'raw' if is_valid else 'failed raw'} LLM output for grouping to {raw_output_path}"
            )

            if is_valid:
                complete_grouped_data = create_complete_grouped_data(parsed_data, grouped_data_from_llm)
                complete_output_path = os.path.join(output_dir, f"_grouped_complete_{filename}")
                save_json_file(complete_grouped_data, complete_output_path)
                print(f"Saved complete (validated) grouped reasoning to {complete_output_path}")
            else:
                print(
                    f"Skipped saving complete grouped reasoning for {filename} due to invalid raw LLM output."
                )

        return grouped_data_from_llm

    except Exception as e:
        print(f"Critical error processing {file_path} during grouping stage: {e}")
        if output_dir:
            filename = os.path.basename(file_path)
            error_output_path = os.path.join(output_dir, f"failed_grouped_critical_error_{filename}")
            error_data = {
                "error": "Critical error during grouping stage",
                "details": str(e),
                "original_file": file_path,
            }
            try:
                save_json_file(error_data, error_output_path)
                print(f"Saved critical error information to {error_output_path}")
            except Exception as save_e:
                print(f"Could not save critical error information for {file_path}: {save_e}")
        return parsed_data


def process_directory(
    input_dir: str,
    output_dir: str,
    prompt_path: str = "./prompts/group_system.md",
    template_path: str = "./prompts/group_template.j2",
    config: Optional[Dict[str, Any]] = None,
) -> List[Dict[str, Any]]:
    """
    Group all parsed JSON files in input_dir and write artifacts to output_dir.

    Returns a list of LLM outputs (dicts), one per file.
    """
    ensure_directory(output_dir)

    json_files = list_files(input_dir, ".json")

    grouped_data_list: List[Dict[str, Any]] = []
    for file_path in json_files:
        try:
            # Optional: add delay to avoid provider rate limits
            # time.sleep(1)
            result = process_file(
                file_path=file_path,
                output_dir=output_dir,
                prompt_path=prompt_path,
                template_path=template_path,
                config=config,
            )
            grouped_data_list.append(result)
            print(f"Successfully processed {file_path}")
        except Exception as e:
            print(f"Error processing {file_path}: {e}")

    return grouped_data_list


if __name__ == "__main__":
    # Helpful defaults for ad-hoc runs
    input_dir = "./output/parsed"
    output_dir = "./output/grouped"

    ensure_directory(output_dir)
    grouped_data_list = process_directory(input_dir, output_dir)
    print(f"Processed {len(grouped_data_list)} files")