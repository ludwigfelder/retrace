import os
import json
from typing import Dict, Any, Optional, List, Union
from pathlib import Path
import jinja2

# Utilities to render prompts/templates and call the LLM provider (Gemini).
# Exposes `process_reasoning_step` used by grouping to produce JSON output.

# Attempt to import provider-specific libraries
try:
    from google import genai
    from google.genai import types as google_types
except ImportError:
    genai = None
    google_types = None
    print(
        "Warning: google-generativeai library not found. Gemini models will not be available. "
        "Install with 'pip install google-generativeai'"
    )


def _get_api_key(env_var_name: str) -> Optional[str]:
    """
    Retrieve API key from environment or .env.
    Uses python-dotenv if available, otherwise a minimal manual .env reader.
    Returns None if not found; empty string if explicitly set empty.
    """
    key_loaded_from_dotenv = False
    try:
        from dotenv import load_dotenv
        if load_dotenv():
            key_loaded_from_dotenv = True
    except ImportError:
        pass

    api_key = os.environ.get(env_var_name)

    if api_key is None:
        env_path = Path(".env")
        if env_path.exists():
            try:
                with open(env_path, "r") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#"):
                            try:
                                key, value = line.split("=", 1)
                                if key.strip() == env_var_name:
                                    api_key = value.strip().strip("'\"")
                                    break
                            except ValueError:
                                pass
                if api_key is not None and not key_loaded_from_dotenv:
                    print(
                        f"Note: Manually loaded {env_var_name} from .env file. "
                        "Consider installing python-dotenv for more robust .env handling."
                    )
            except Exception as e:
                print(f"Error manually reading .env file for {env_var_name}: {e}")
        elif not key_loaded_from_dotenv and not os.environ.get(env_var_name):
            print(
                f"Note: .env file not found, and {env_var_name} not in environment. "
                "To use .env files for API keys, install python-dotenv ('pip install python-dotenv') "
                f"and create a .env file, or set the {env_var_name} environment variable."
            )
    return api_key


def render_template(template_path: str, variables: Dict[str, Any]) -> str:
    """Render a Jinja2 template file with provided variables."""
    template_dir = os.path.dirname(template_path)
    template_file = os.path.basename(template_path)

    environment = jinja2.Environment(
        loader=jinja2.FileSystemLoader(template_dir),
        autoescape=jinja2.select_autoescape(['html', 'xml']),
        undefined=jinja2.StrictUndefined,
    )

    template = environment.get_template(template_file)
    return template.render(**variables)


def generate_content(
    prompt: str,
    config: Dict[str, Any],
    response_mime_type: Optional[str] = "application/json",
) -> Union[str, List[str]]:
    """
    Generate model output using Gemini via google-generativeai client.

    Required config keys:
      - model: Gemini model name, e.g., 'gemini-2.5-pro'
    Optional config keys used:
      - stream (bool)
      - template_variables: temperature, top_p, top_k, max_output_tokens
    """
    model_name = config.get("model")
    if not model_name:
        raise ValueError("Model name not specified in config.")

    stream = config.get("stream", False)
    template_vars = config.get("template_variables", {})

    if not model_name.startswith("gemini-"):
        raise ValueError(
            f"Unsupported model: {model_name}. Only Gemini models are supported (model must start with 'gemini-')."
        )

    if not genai or not google_types:
        raise ImportError(
            "google-generativeai library is required for Gemini models but not found. "
            "Install with 'pip install google-generativeai'"
        )

    api_key_value = _get_api_key("GEMINI_API_KEY")
    if not api_key_value:
        raise ValueError(
            "GEMINI_API_KEY is not set or is empty. Please set it to use Gemini models."
        )
    client = genai.Client(api_key=api_key_value)

    contents = [
        google_types.Content(
            role="user",
            parts=[google_types.Part.from_text(text=prompt)],
        )
    ]

    gemini_generation_params: Dict[str, Any] = {}
    if "temperature" in template_vars:
        gemini_generation_params["temperature"] = template_vars["temperature"]
    if "top_p" in template_vars:
        gemini_generation_params["top_p"] = template_vars["top_p"]
    if "top_k" in template_vars:
        gemini_generation_params["top_k"] = template_vars["top_k"]
    if "max_output_tokens" in template_vars:
        gemini_generation_params["max_output_tokens"] = template_vars["max_output_tokens"]

    gemini_config_args = {**gemini_generation_params}
    if response_mime_type == "application/json":
        gemini_config_args["response_mime_type"] = "application/json"

    gemini_content_config = google_types.GenerateContentConfig(**gemini_config_args)

    if stream:
        response_chunks: List[str] = []
        for chunk in client.models.generate_content_stream(
            model=model_name,
            contents=contents,
            config=gemini_content_config,
        ):
            if chunk.text:
                response_chunks.append(chunk.text)
        return response_chunks
    else:
        response = client.models.generate_content(
            model=model_name,
            contents=contents,
            config=gemini_content_config,
        )
        return response.text



def process_reasoning_step(
    input_data: Dict[str, Any],
    prompt_path: str,
    template_path: str,
    config: Optional[Dict[str, Any]] = None,
) -> Union[Dict[str, Any], str]:
    """
    Render the system prompt and template, call the model, and parse JSON response.

    If config is None, falls back to load_config(). Caller must ensure the final config has 'model'.
    Returns JSON (dict) when response_mime_type==application/json; otherwise returns raw text.
    """
    from src.file_utils import load_config, load_prompt  # local import to avoid circular deps

    effective_config = config or load_config()

    if "model" not in effective_config or not effective_config.get("model"):
        raise ValueError(
            "Model name not found or is empty in the effective configuration. "
            "Provide 'model' in config or ensure load_config() returns one."
        )

    system_prompt_content = load_prompt(prompt_path)

    template_variables = {**(effective_config.get("template_variables", {}))}
    template_variables["system_prompt"] = system_prompt_content
    template_variables["input_data"] = input_data
    if "question" in input_data:
        template_variables["question"] = input_data["question"]

    rendered_prompt_for_llm = render_template(template_path, template_variables)

    current_response_mime_type = effective_config.get(
        "response_mime_type", "application/json"
    )

    response_text_or_chunks = generate_content(
        prompt=rendered_prompt_for_llm,
        config=effective_config,
        response_mime_type=current_response_mime_type,
    )

    response_text = "".join(response_text_or_chunks) if isinstance(response_text_or_chunks, list) else response_text_or_chunks

    if current_response_mime_type != "application/json":
        return response_text

    try:
        cleaned_response_text = response_text.strip()
        # Handle fenced code blocks commonly returned by models
        if cleaned_response_text.startswith("```json"):
            cleaned_response_text = cleaned_response_text[len("```json"):].strip()
            if cleaned_response_text.endswith("```"):
                cleaned_response_text = cleaned_response_text[:-len("```")].strip()
        elif cleaned_response_text.startswith("```") and cleaned_response_text.endswith("```"):
            lines = cleaned_response_text.splitlines()
            if len(lines) > 1 and lines[0].strip() == "```" and lines[-1].strip() == "```":
                cleaned_response_text = "\n".join(lines[1:-1]).strip()
            else:
                first_newline = cleaned_response_text.find('\n')
                if first_newline != -1:
                    cleaned_response_text = cleaned_response_text[first_newline + 1 :]
                if cleaned_response_text.endswith("```"):
                    cleaned_response_text = cleaned_response_text[:-3]
                cleaned_response_text = cleaned_response_text.strip()

        return json.loads(cleaned_response_text)
    except json.JSONDecodeError:
        print(f"Error: Could not parse response as JSON. Raw response text: {response_text}")
        return {"error": "Failed to parse response as JSON", "raw_response": response_text}