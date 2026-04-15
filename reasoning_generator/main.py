#!/usr/bin/env python
import os
import json
from dotenv import load_dotenv # For loading .env file
from openai import OpenAI, APIError # Import OpenAI and specific error types
from typing import List, Dict, Any # For type hinting
import datetime # Import the datetime module

# --- Configuration for DeepSeek ---
DEEPSEEK_BASE_URL = "https://api.deepseek.com"
MODEL_NAME = "deepseek-reasoner"
# ---------------------

def call_deepseek_reasoner_api(api_key: str, question: str, model: str = MODEL_NAME) -> Dict[str, Any] | None:
    """
    Calls the DeepSeek Reasoner API with a given question using the OpenAI SDK
    and returns the raw API response object (as a dictionary).
    """
    try:
        client = OpenAI(api_key=api_key, base_url=DEEPSEEK_BASE_URL)
        print(f"Sending request to DeepSeek API (model: '{model}')...")
        
        messages = [
            {"role": "user", "content": question}
        ]

        response = client.chat.completions.create(
            model=model,
            messages=messages
        )
        return response.model_dump(exclude_unset=True) 
        
    except APIError as e:
        print(f"Error: DeepSeek API error occurred: {e.status_code} - {e.message}")
        if hasattr(e, 'body') and e.body:
            try:
                error_body = json.loads(e.body) if isinstance(e.body, (str, bytes)) else e.body
                print(f"Error body: {json.dumps(error_body, indent=2)}")
            except json.JSONDecodeError:
                 print(f"Error body (raw): {e.body}")
        return None
    except Exception as e:
        print(f"Error: An unexpected error occurred calling DeepSeek API for question \"{question[:50]}...\": {e}")
        return None

def main(questions_to_process: List[str], output_destination_dir: str):
    """
    Main function to process questions with DeepSeek Reasoner API and save responses
    in the specified custom JSON format.
    
    Args:
        questions_to_process: A list of strings, where each string is a question.
        output_destination_dir: The path to the directory where JSON responses will be saved.
    """
    load_dotenv()
    api_key = os.getenv("DEEPSEEK_API_KEY")

    if not api_key:
        print("Error: DEEPSEEK_API_KEY not found.")
        print("Please ensure a .env file exists in the script's directory with DEEPSEEK_API_KEY=your_key")
        print("Or that the DEEPSEEK_API_KEY environment variable is set.")
        return

    try:
        os.makedirs(output_destination_dir, exist_ok=True)
    except OSError as e:
        print(f"Error creating output directory '{output_destination_dir}': {e}")
        return

    print(f"Starting to process {len(questions_to_process)} questions with model '{MODEL_NAME}'...")
    print(f"API Key loaded. Responses will be saved to: {output_destination_dir}")

    for i, question_text in enumerate(questions_to_process):
        print(f"\n--- Processing question {i+1}/{len(questions_to_process)} ---")
        print(f"Question: \"{question_text}\"")

        raw_api_response = call_deepseek_reasoner_api(api_key, question_text)
        current_timestamp = datetime.datetime.now().isoformat()

        if raw_api_response:
            # Prepare the custom output structure
            reasoning_content = None
            model_response_content = None

            if raw_api_response.get("choices") and len(raw_api_response["choices"]) > 0:
                message_data = raw_api_response["choices"][0].get("message", {})
                reasoning_content = message_data.get("reasoning_content")
                model_response_content = message_data.get("content")

            output_data = {
                "index": i,
                "question": question_text,
                "timestamp": current_timestamp,
                "reasoning_content": reasoning_content,
                "model_response": model_response_content,
                "raw_response": raw_api_response # The full dictionary from response.model_dump()
            }
            
            output_filename = os.path.join(output_destination_dir, f"formatted_response_{i}.json")
            
            try:
                with open(output_filename, 'w', encoding='utf-8') as f:
                    json.dump(output_data, f, indent=4, ensure_ascii=False)
                print(f"Successfully saved formatted JSON response to {output_filename}")
                if reasoning_content:
                    print(f"  Reasoning Content (CoT) included.")
                if model_response_content:
                    print(f"  Final Answer Content included.")

            except IOError as e:
                print(f"Error saving response to {output_filename}: {e}")
            except Exception as e:
                print(f"An unexpected error occurred while saving the file: {e}")
        else:
            print(f"Failed to get a valid response for question {i+1}. Skipping save.")
            # Optionally, save a failure record
            failure_data = {
                "index": i,
                "question": question_text,
                "timestamp": current_timestamp,
                "error": "Failed to retrieve response from API or API returned an error."
            }
            output_filename = os.path.join(output_destination_dir, f"failure_response_{i}.json")
            try:
                with open(output_filename, 'w', encoding='utf-8') as f:
                    json.dump(failure_data, f, indent=4, ensure_ascii=False)
                print(f"Saved failure record to {output_filename}")
            except Exception as e:
                print(f"Could not save failure record: {e}")


    print("\n--- All questions processed. ---")

if __name__ == "__main__":
    my_questions = [
        """""The Polish-Lithuanian-Teutonic War or Great War occurred between 1409 and 1411, pitting the allied Kingdom of Poland and Grand Duchy of Lithuania against the Teutonic Knights. Inspired by the local Samogitian uprising, the war began by Teutonic invasion of Poland in August 1409. As neither side was ready for a full-scale war, Wenceslaus IV of Bohemia brokered a nine-month truce. After the truce expired in June 1410, the military-religious monks were decisively defeated in the Battle of Grunwald , one of the largest battles in medieval Europe. Most of the Teutonic leadership was killed or taken prisoner. While defeated, the Teutonic Knights withstood the siege on their capital in Marienburg and suffered only minimal territorial losses in the Peace of Thorn . Territorial disputes lasted until the Peace of Melno of 1422. However, the Knights never recovered their former power and the financial burden of war reparations caused internal conflicts and economic decline in their lands. The war shifted the balance of power in Eastern Europe and marked the rise of the Polish-Lithuanian union as the dominant power in the region.\nHow many years between the truce expiring and the Peace of Melno?""",
        """Natalia sold clips to 48 of her friends in April, and then she sold half as many clips in May. How many clips did Natalia sell altogether in April and May?""",
        """\"There are 4 houses, numbered 1 to 4 from left to right, as seen from across the street. Each house is occupied by a different person. Each house has a unique attribute for each of the following characteristics:\n        - Each person has a unique name: Arnold, Alice, Peter, Eric\n        - People have unique favorite book genres: mystery, romance, science fiction, fantasy\n\n        ## Clues:\n        1. Arnold is the person who loves science fiction books.\n        2. The person who loves fantasy books is not in the second house.\n        3. Alice is not in the second house.\n        4. The person who loves romance books is in the first house.\n        5. Peter is the person who loves romance books.\n        6. Arnold is somewhere to the right of Alice.\"\t\n        What is BookGenre of the person who lives in House 2?"""
    ]


    current_script_directory = os.path.dirname(os.path.abspath(__file__))
    my_output_directory_name = "output" 
    target_output_path = os.path.join(current_script_directory, my_output_directory_name)

    main(questions_to_process=my_questions, output_destination_dir=target_output_path)