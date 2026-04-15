# retrace_submission

Supplementary materials for a EuroVIS submission. Includes:
- **reasoning_generator**: calls DeepSeek R1 and saves raw reasoning traces.
- **reasoning_processor**: parses → groups (Gemini) → emits graph `.ts` files.
  - Prompts for structuring the reasoning trace can be found in `reasoning_processor/prompts/` (`group_system.md`, `group_template.j2`).
- **frontend** (SvelteKit): visualizes structured traces in two layouts and raw trace.

> The three reasoning traces used in the user study are already present under `frontend/src/lib/flow/data`.
 
## Prerequisites
- Python 3.10+ recommended
- A single virtual environment is fine for both modules
- Packages used:
  - google-generativeai (Gemini)
  - jinja2 (templating)
  - python-dotenv (optional, for .env loading)
  - openai (DeepSeek via OpenAI SDK)

You can install them with:

```bash
pip install google-generativeai jinja2 python-dotenv openai
```

Or install all Python dependencies from requirements.txt:

```bash
pip install -r requirements.txt
```

## API Keys
- DeepSeek: set DEEPSEEK_API_KEY
  - Create a file reasoning_generator/.env with:
    ```
    DEEPSEEK_API_KEY=your_deepseek_api_key_here
    ```
  - Alternatively, export DEEPSEEK_API_KEY in your shell environment.

- Gemini: set GEMINI_API_KEY
  - Create a file reasoning_processor/.env with:
    ```
    GEMINI_API_KEY=your_gemini_api_key_here
    ```
  - Alternatively, export GEMINI_API_KEY in your shell environment.

Note: python-dotenv is optional; if installed, it loads .env automatically. The processor also has a fallback manual .env reader.

---

## reasoning_generator
Generates reasoning traces using DeepSeek Reasoner through the OpenAI SDK (base_url is set to DeepSeek’s endpoint).

- Input: list of questions in `reasoning_generator/main.py`
- Output: JSON files in `reasoning_generator/output/`, e.g., `formatted_response_0.json`
- Key fields in output JSON:
  - question (string)
  - reasoning_content (chain-of-thought or similar, if returned)
  - model_response (final answer content)
  - raw_response (full API response dict)

Run:
```bash
cd reasoning_generator
python main.py
```

After running, copy or point the processor to the generated JSON files (see next section).

---

## reasoning_processor
Processes reasoning traces through up to three steps:

1) parse: Convert raw reasoning text into a list of steps.
2) group: Group the parsed steps into logical phases using Gemini + Jinja2 template/prompts.
3) graph: Generate TypeScript files from grouped JSON by injecting data into a template.

Configuration is in `reasoning_processor/config.yaml`:
- model: Gemini model name (e.g., `gemini-2.5-pro`)
- stream: false (recommended for reproducibility)
- template_variables: includes temperature=0.0, top_p, top_k, max_output_tokens
- response_mime_type: application/json

Inputs
- Provide a directory with JSON files. For a simple workflow, copy generator outputs into `reasoning_processor/input/`.

Outputs
- `output/parsed/` — parsed JSON (list of steps)
- `output/grouped/` — grouped outputs:
  - `grouped_<filename>.json` (raw LLM output)
  - `_grouped_complete_<filename>.json` (enriched with step texts)
- `output/graph/` — generated `.ts` files; requires `output/graph/template.ts` to exist and contain the placeholder `const originalInputJson = { ... };`

Usage examples
```bash
cd reasoning_processor
# Run all steps (parse -> group -> graph) on the default input folder
python main.py input -s all

# Run only parse
python main.py input -s parse

# Run parse + group
python main.py input -s parse group

# Run only graph on an already-grouped folder
python main.py output/grouped -s graph

# Specify a different output folder and config
python main.py input -s all -o ./output -c ./config.yaml
```

Notes
- For grouping, ensure GEMINI_API_KEY is set and `google-generativeai` is installed.
- The `graph` step expects `output/graph/template.ts` to exist; it replaces the placeholder `const originalInputJson = { ... };` with data from `_grouped_complete_*.json`.
- For reproducibility, temperature is set to 0.0 by default in `config.yaml`. Model providers may still introduce minor variability.

## frontend
The SvelteKit frontend visualizes the processed reasoning graphs.

- Source: `frontend/`
- Data files: copy the generated TypeScript graph files from `reasoning_processor/output/graph/*.ts` into `frontend/src/lib/flow/data/`.
  - Each file exports `initialNodes`, `initialEdges`, and optionally `initialQuestion`, `initialModelResponse`.
  - The app discovers files in `src/lib/flow/data/` automatically and lists them in the UI selector.

Run locally
```bash
cd frontend
npm install
npm run dev
```
Then open the printed local URL. Use the bottom sidebar to:
- Select a diagram (based on files in `src/lib/flow/data/`).
- Switch layouts: Space-filling Nodes, Sequential Timeline, Raw Trace.

Notes
- If you add or replace files in `src/lib/flow/data/`, refresh the page to see them in the selector.
