import json
import os
import yaml
from pathlib import Path
from typing import Dict, Any, List

# Small file utilities used across steps: config loading, json IO, directory handling, file listing, and prompt loading.


def load_config(config_path: str = "./config.yaml") -> Dict[str, Any]:
    """Load YAML configuration if present; return {} when missing."""
    if not os.path.exists(config_path):
        return {}
    with open(config_path, "r") as f:
        return yaml.safe_load(f)


def ensure_directory(directory_path: str) -> None:
    """Create directory (and parents) if it doesn't exist."""
    Path(directory_path).mkdir(parents=True, exist_ok=True)


def load_json_file(file_path: str) -> Dict[str, Any]:
    """Read a JSON file as a dict."""
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json_file(data: Dict[str, Any], file_path: str, indent: int = 2) -> None:
    """Write a dict to JSON, ensuring destination directory exists."""
    ensure_directory(os.path.dirname(file_path))
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=indent, ensure_ascii=False)


def list_files(directory_path: str, file_extension: str = ".json") -> List[str]:
    """List files with a given extension in a directory (non-recursive)."""
    path = Path(directory_path)
    return [str(file_path) for file_path in path.glob(f"*{file_extension}")]


def load_prompt(prompt_path: str) -> str:
    """Read prompt text from a file."""
    with open(prompt_path, "r", encoding="utf-8") as f:
        return f.read()