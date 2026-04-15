#!/usr/bin/env python
"""Reasoning Processor CLI

Runs the reasoning pipeline with selectable steps:
- parse:  Convert raw reasoning text into structured step list
- group:  Group steps into logical phases using LLM and templates
- graph:  Generate TypeScript graph files from grouped results via a template

Usage examples:
  python main.py input -s all
  python main.py input -s parse
  python main.py input -s group graph -o ./output -c ./config.yaml
"""
import os
import argparse
from typing import List

# Import from src directory
from src.file_utils import ensure_directory, load_config
from src.step_1_parse import process_directory as parse_directory
from src.step_2_group import process_directory as group_directory
from src.step_3_graph import process_directory as graph_directory


def process_reasoning(
    input_dir: str,
    output_dir: str,
    config_path: str = "./config.yaml",
    steps: List[str] = ["parse", "group", "graph"],
):
    """
    Orchestrate the parsing, grouping, and graph generation steps.

    Args:
        input_dir: Path containing the input JSON files.
        output_dir: Base output directory (creates parsed/, grouped/, graph/ inside).
        config_path: Path to YAML config (must include at least 'model').
        steps: Which steps to run (subset of [parse, group, graph]).
    """
    # Load configuration once and pass to steps that need it (e.g., grouping/LLM)
    main_llm_config = load_config(config_path)

    # Derived output directories for each step
    parsed_dir = os.path.join(output_dir, "parsed")
    grouped_dir = os.path.join(output_dir, "grouped")
    graph_dir = os.path.join(output_dir, "graph")

    # Ensure step output directories exist
    ensure_directory(parsed_dir)
    ensure_directory(grouped_dir)
    ensure_directory(graph_dir)

    # Step 1: Parse raw reasoning into steps
    if "parse" in steps:
        print("\n=== Step 1: Parsing raw reasoning ===")
        parse_directory(input_dir, parsed_dir, config=main_llm_config)
        print(f"Parsing complete. Results saved to {parsed_dir}")
    else:
        print("\n=== Skipping parsing step ===")

    # Step 2: Group reasoning steps into units (LLM + prompts/templates)
    if "group" in steps:
        print("\n=== Step 2: Grouping reasoning steps ===")
        # If we also ran parse, group the parsed output; otherwise group the original input
        group_input_dir = parsed_dir if "parse" in steps else input_dir
        group_directory(group_input_dir, grouped_dir, config=main_llm_config)
        print(f"Grouping complete. Results saved to {grouped_dir}")
    else:
        print("\n=== Skipping grouping step ===")

    # Step 3: Generate graph TypeScript from grouped data using a template
    if "graph" in steps:
        print("\n=== Step 3: Generating graph TypeScript ===")
        # If we also ran group, use grouped output; otherwise assume input_dir already contains grouped files
        graph_input_dir = grouped_dir if "group" in steps else input_dir
        graph_directory(graph_input_dir, graph_dir, config=main_llm_config)
        print(f"Graph generation complete. Results saved to {graph_dir}")
    else:
        print("\n=== Skipping graph generation step ===")

    print("\n=== Processing complete ===")


def main():
    """Parse CLI arguments and run selected steps."""
    parser = argparse.ArgumentParser(
        description="Process LLM reasoning traces through parsing, grouping, and graph generation steps."
    )

    parser.add_argument(
        "input_dir",
        help="Directory containing input reasoning data",
    )

    parser.add_argument(
        "--output-dir",
        "-o",
        default="./output",
        help="Base directory for output files (default: ./output)",
    )

    parser.add_argument(
        "--config",
        "-c",
        default="./config.yaml",
        help="Path to configuration file (default: ./config.yaml)",
    )

    parser.add_argument(
        "--steps",
        "-s",
        choices=["parse", "group", "graph", "all"],
        default="all",
        nargs="+",
        help="Processing steps to run: parse, group, graph, or all (default: all)",
    )

    args = parser.parse_args()

    steps_to_run = ["parse", "group", "graph"] if "all" in args.steps else args.steps

    process_reasoning(
        input_dir=args.input_dir,
        output_dir=args.output_dir,
        config_path=args.config,
        steps=steps_to_run,
    )


if __name__ == "__main__":
    main()