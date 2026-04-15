// ----- SVELTE FLOW & DATA STRUCTURE TYPES -----
enum MarkerType {
  ArrowClosed = 'ArrowClosed'
}

interface XYPosition {
  x: number;
  y: number;
}

// Define the Step interface, similar to SubphaseNode.svelte
interface Step {
  index: number;
  text: string;
}

// Represents a subphase when nested within a main group's data
interface NestedSubphase {
  id: string;
  subcategory: string;
  summary: string;
  step_indices: number[];
  steps?: Step[]; // Added steps property
}

// Data payload for a Svelte Flow Node
interface NodeData {
  step: number; // Overall step/order of the main group node
  category: string; // e.g., "Problem Definition & Scoping"
  subcategory: string; // Subcategory of the main group (from its first subphase)
  content: string; // Summary of the main group (from its first subphase)
  group_indices: number[]; // Step indices of the main group (from its first subphase)
  subphases?: NestedSubphase[]; // Optional array of nested subphases
}

// Svelte Flow Node structure
interface Node {
  id: string;
  type: string; // e.g., 'problemDefinition', 'bloom'
  data: NodeData;
  position: XYPosition;
}

// Svelte Flow Edge structure
interface Edge {
  id: string;
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
  markerEnd: { type: MarkerType };
  type: string; // e.g., 'bezier'
  style: string;
}

// Structure for the transformed groups, serving as input to node generation
interface TransformedGroup {
  category: string;
  id: string;
  step_indices: number[];
  summary: string;
  subcategory: string;
  subphases?: NestedSubphase[];
}

// Overall application input structure for Svelte Flow generation
interface AppInputForFlow {
  groups: TransformedGroup[];
  question: string;
}

// ----- ORIGINAL INPUT JSON (Can be modified here) -----
const originalInputJson = {
  "reasoning_analysis": {
    "problem_definition_and_scoping": {
      "main_phase_summary": "The LM defined the goal as calculating the time between two events and extracted the key years, 1410 for the truce expiration and 1422 for the Peace of Melno, from the provided text.",
      "subphases": [
        {
          "id": "subphase_1",
          "subcategory": "Define_Goal",
          "summary": "Establishing the goal to find the years between the truce expiration and the Peace of Melno, and extracting the relevant years (1410 and 1422).",
          "step_indices": [
            0,
            1,
            2,
            3
          ],
          "steps": [
            {
              "index": 0,
              "text": "I need to find out how many years passed between the truce expiring and the Peace of Melno. Let me read the question carefully."
            },
            {
              "index": 1,
              "text": "The truce expired in June 1410. That's when the fighting resumed, and the Battle of Grunwald happened soon after."
            },
            {
              "index": 2,
              "text": "The Peace of Melno is mentioned as happening in 1422. It says: \"Territorial disputes lasted until the Peace of Melno of 1422.\""
            },
            {
              "index": 3,
              "text": "So, the truce expired in 1410, and the Peace of Melno was in 1422."
            }
          ]
        }
      ]
    },
    "initial_solution_and_exploration": {
      "main_phase_summary": "The LM performed an initial calculation by subtracting the years to arrive at an answer of 12, and briefly qualified this approach as valid despite missing month data.",
      "subphases": [
        {
          "id": "subphase_2",
          "subcategory": "Decomposition_&_Execution",
          "summary": "Formulating and executing a simple subtraction: 1422 - 1410 = 12.",
          "step_indices": [
            4,
            5
          ],
          "steps": [
            {
              "index": 4,
              "text": "To find the number of years between them, I should subtract 1410 from 1422."
            },
            {
              "index": 5,
              "text": "1422 minus 1410 equals 12."
            }
          ]
        },
        {
          "id": "subphase_3",
          "subcategory": "Confidence_Qualification",
          "summary": "Briefly considering the missing month data but concluding that using years is acceptable.",
          "step_indices": [
            6
          ],
          "steps": [
            {
              "index": 6,
              "text": "But let me make sure about the dates. The truce expired in June 1410, and the Peace of Melno was in 1422. I don't have the exact month for the Peace of Melno, but since we're dealing with years, and the question asks for years between, it should be fine to use the years."
            }
          ]
        }
      ]
    },
    "iterative_refinement_and_verification": {
      "main_phase_summary": "The LM engaged in an extensive and repetitive verification process, repeatedly questioning the validity of simple year subtraction due to missing month data and exploring and dismissing potential distractors like the Peace of Thorn, before consistently reaffirming its initial calculation.",
      "subphases": [
        {
          "id": "subphase_4",
          "subcategory": "Correction",
          "summary": "Re-reading the question and re-evaluating the ambiguity of using years without exact months.",
          "step_indices": [
            7,
            8,
            9,
            10,
            11,
            12
          ],
          "steps": [
            {
              "index": 7,
              "text": "The question is: \"How many years between the truce expiring and the Peace of Melno?\""
            },
            {
              "index": 8,
              "text": "The truce expired in 1410, and Peace of Melno in 1422. So, from 1410 to 1422 is 12 years."
            },
            {
              "index": 9,
              "text": "But let me think if the expiration is the start or end. The truce expired, meaning it ended, and then the war continued. Peace of Melno ended the territorial disputes."
            },
            {
              "index": 10,
              "text": "So, the time between the expiration of the truce and the signing of the Peace of Melno."
            },
            {
              "index": 11,
              "text": "From June 1410 to some time in 1422. If I don't have the month, I should just use the years."
            },
            {
              "index": 12,
              "text": "Perhaps the answer is 12 years."
            }
          ]
        },
        {
          "id": "subphase_5",
          "subcategory": "Correction",
          "summary": "Checking the source text again to confirm the dates and justifying the simple subtraction method.",
          "step_indices": [
            13,
            14,
            15,
            16,
            17,
            18,
            19,
            20
          ],
          "steps": [
            {
              "index": 13,
              "text": "But let me double-check the text."
            },
            {
              "index": 14,
              "text": "\"Inspired by the local Samogitian uprising, the war began by Teutonic invasion of Poland in August 1409. As neither side was ready for a full-scale war, Wenceslaus IV of Bohemia brokered a nine-month truce. After the truce expired in June 1410, the military-religious monks were decisively defeated in the Battle of Grunwald...\""
            },
            {
              "index": 15,
              "text": "Then, \"Territorial disputes lasted until the Peace of Melno of 1422.\""
            },
            {
              "index": 16,
              "text": "So, truce expired June 1410."
            },
            {
              "index": 17,
              "text": "Peace of Melno 1422."
            },
            {
              "index": 18,
              "text": "Now, from June 1410 to June 1422 would be exactly 12 years. But since the Peace was in 1422, and we don't know when, it might be from mid-1410 to some point in 1422."
            },
            {
              "index": 19,
              "text": "But typically, for such questions, we just subtract the years, so 1422 - 1410 = 12."
            },
            {
              "index": 20,
              "text": "I think it's safe to say 12 years."
            }
          ]
        },
        {
          "id": "subphase_6",
          "subcategory": "Pausing_to_Rethink",
          "summary": "Considering the possibility of a trick involving the irrelevant Peace of Thorn.",
          "step_indices": [
            21,
            22
          ],
          "steps": [
            {
              "index": 21,
              "text": "But let me see if there's any trick. The Battle of Grunwald was in 1410 after the truce, but the Peace of Thorn was earlier, which was in 1411."
            },
            {
              "index": 22,
              "text": "It says: \"suffered only minimal territorial losses in the Peace of Thorn.\" And Peace of Thorn was in 1411."
            }
          ]
        },
        {
          "id": "subphase_7",
          "subcategory": "Correction",
          "summary": "Dismissing the Peace of Thorn distraction and refocusing on the correct calculation.",
          "step_indices": [
            23,
            24,
            25,
            26
          ],
          "steps": [
            {
              "index": 23,
              "text": "But the question is about the truce expiring and the Peace of Melno, not Peace of Thorn."
            },
            {
              "index": 24,
              "text": "Peace of Melno is later, in 1422."
            },
            {
              "index": 25,
              "text": "So, between truce expiration (1410) and Peace of Melno (1422)."
            },
            {
              "index": 26,
              "text": "1422 - 1410 = 12."
            }
          ]
        },
        {
          "id": "subphase_8",
          "subcategory": "Re-examine",
          "summary": "Repeatedly analyzing the month vs. year ambiguity, using examples to justify the simple subtraction.",
          "step_indices": [
            27,
            28,
            29,
            30,
            31,
            32,
            33,
            34,
            35,
            36,
            37,
            38,
            39,
            40,
            41
          ],
          "steps": [
            {
              "index": 27,
              "text": "Perhaps I should consider the duration."
            },
            {
              "index": 28,
              "text": "From June 1410 to January 1422 is about 11 years and 7 months, but since we're asked for years, and Peace of Melno could be any time in 1422, it's approximately 12 years."
            },
            {
              "index": 29,
              "text": "But in historical contexts, we often say the number of years between events by subtracting the years."
            },
            {
              "index": 30,
              "text": "For example, between 1410 and 1422 is 12 years later."
            },
            {
              "index": 31,
              "text": "Let me calculate the difference."
            },
            {
              "index": 32,
              "text": "Year 1410 to year 1421 is 11 years, but since it's from 1410 to 1422, it's 12 years if we count inclusively or something? No."
            },
            {
              "index": 33,
              "text": "The number of years between two dates."
            },
            {
              "index": 34,
              "text": "If something happened in year A and year B, the number of years between them is |B - A|."
            },
            {
              "index": 35,
              "text": "For instance, between 2020 and 2022 is 2 years."
            },
            {
              "index": 36,
              "text": "Similarly, between 1410 and 1422 is 12 years."
            },
            {
              "index": 37,
              "text": "But let's think: from Jan 1410 to Jan 1422 is 12 years."
            },
            {
              "index": 38,
              "text": "But the truce expired in June 1410, so if Peace of Melno was in June 1422, it would be exactly 12 years."
            },
            {
              "index": 39,
              "text": "But if it was in January 1422, it would be less."
            },
            {
              "index": 40,
              "text": "However, I don't think the exact date is given, so we should go with the year difference."
            },
            {
              "index": 41,
              "text": "Moreover, the question says \"how many years\" and in the context, it's likely expecting a simple subtraction."
            }
          ]
        },
        {
          "id": "subphase_9",
          "subcategory": "Correction",
          "summary": "Introducing external knowledge about an exact date but correctly deciding to ignore it for the final answer.",
          "step_indices": [
            42,
            43,
            44,
            45,
            46
          ],
          "steps": [
            {
              "index": 42,
              "text": "Perhaps I can confirm the dates."
            },
            {
              "index": 43,
              "text": "I recall that the Peace of Melno was signed on September 27, 1422."
            },
            {
              "index": 44,
              "text": "But the text doesn't say that, so I should stick to what's given."
            },
            {
              "index": 45,
              "text": "In the text, it only says \"Peace of Melno of 1422\" and \"truce expired in June 1410\"."
            },
            {
              "index": 46,
              "text": "So, from June 1410 to September 1422 is about 12 years and 3 months, but again, for the purpose of this question, it's 12 years."
            }
          ]
        },
        {
          "id": "subphase_10",
          "subcategory": "Correction",
          "summary": "Refocusing on the key events specified in the question and reaffirming the answer.",
          "step_indices": [
            47,
            48,
            49,
            50,
            51
          ],
          "steps": [
            {
              "index": 47,
              "text": "The battle was in July 1410, I think, but the truce expired in June."
            },
            {
              "index": 48,
              "text": "After truce expired in June, the battle happened."
            },
            {
              "index": 49,
              "text": "But the point is the expiration."
            },
            {
              "index": 50,
              "text": "Perhaps the question considers the expiration as the event."
            },
            {
              "index": 51,
              "text": "I think 12 is correct."
            }
          ]
        },
        {
          "id": "subphase_11",
          "subcategory": "Re-examine",
          "summary": "Revisiting the Peace of Thorn distraction and re-interpreting the question's scope.",
          "step_indices": [
            52,
            53,
            54,
            55,
            56,
            57,
            58,
            59
          ],
          "steps": [
            {
              "index": 52,
              "text": "But let me see the answer choices or if there's any mistake."
            },
            {
              "index": 53,
              "text": "There are no choices; I need to state the number."
            },
            {
              "index": 54,
              "text": "Another thing: the territorial disputes lasted until 1422, but the war itself ended earlier with Peace of Thorn in 1411."
            },
            {
              "index": 55,
              "text": "But the question is specifically between the truce expiring and Peace of Melno."
            },
            {
              "index": 56,
              "text": "Truce expiring is when the active conflict resumed, and Peace of Melno is when the disputes were settled."
            },
            {
              "index": 57,
              "text": "So, time between those two events."
            },
            {
              "index": 58,
              "text": "I think 12 years."
            },
            {
              "index": 59,
              "text": "Perhaps they mean the time from when the truce ended to when peace was finally made, which is 1410 to 1422, 12 years."
            }
          ]
        },
        {
          "id": "subphase_12",
          "subcategory": "Re-examine",
          "summary": "Again calculating the exact duration in months before recognizing this as an overcomplication.",
          "step_indices": [
            60,
            61,
            62,
            63,
            64,
            65,
            66,
            67
          ],
          "steps": [
            {
              "index": 60,
              "text": "But let's calculate the actual time span."
            },
            {
              "index": 61,
              "text": "From June 1410 to, say, January 1422 is 11 years and 7 months, but since Peace was in September, it's about 12 years and 3 months."
            },
            {
              "index": 62,
              "text": "But I think for \"how many years\", it's 12."
            },
            {
              "index": 63,
              "text": "In many such contexts, it's the difference in years."
            },
            {
              "index": 64,
              "text": "For example, from 1409 to 1411 is 2 years for the war, but here it's events."
            },
            {
              "index": 65,
              "text": "I think I'm overcomplicating."
            },
            {
              "index": 66,
              "text": "1422 - 1410 = 12."
            },
            {
              "index": 67,
              "text": "So, the answer should be 12 years."
            }
          ]
        },
        {
          "id": "subphase_13",
          "subcategory": "Correction",
          "summary": "Performing a final check by re-reading the question and dismissing last-minute doubts.",
          "step_indices": [
            68,
            69,
            70,
            71,
            72,
            73,
            74
          ],
          "steps": [
            {
              "index": 68,
              "text": "But let me read the question once more: \"How many years between the truce expiring and the Peace of Melno?\""
            },
            {
              "index": 69,
              "text": "Truce expired in 1410, Peace in 1422, so 12 years between them."
            },
            {
              "index": 70,
              "text": "Yes."
            },
            {
              "index": 71,
              "text": "Perhaps they want the number of full years or something, but I doubt it."
            },
            {
              "index": 72,
              "text": "Another thought: the truce expired in 1410, and immediately the battle happened, but the war continued until 1411 with Peace of Thorn, but the disputes went on."
            },
            {
              "index": 73,
              "text": "But the Peace of Melno is the endpoint for the disputes."
            },
            {
              "index": 74,
              "text": "The question is clear: between truce expiring and Peace of Melno."
            }
          ]
        }
      ]
    },
    "final_decision": {
      "main_phase_summary": "The LM concluded its lengthy verification, stated its confidence in the answer of 12, and prepared to output the final result.",
      "subphases": [
        {
          "id": "subphase_14",
          "subcategory": "Stating_Confidence",
          "summary": "Expressing final confidence that 12 is the correct answer.",
          "step_indices": [
            75
          ],
          "steps": [
            {
              "index": 75,
              "text": "So, I think 12 is correct."
            }
          ]
        },
        {
          "id": "subphase_15",
          "subcategory": "Preparing_Output",
          "summary": "Committing to the final answer of 12.",
          "step_indices": [
            76
          ],
          "steps": [
            {
              "index": 76,
              "text": "I'll go with 12."
            }
          ]
        }
      ]
    }
  },
  "question": "The Polish-Lithuanian-Teutonic War or Great War occurred between 1409 and 1411, pitting the allied Kingdom of Poland and Grand Duchy of Lithuania against the Teutonic Knights. Inspired by the local Samogitian uprising, the war began by Teutonic invasion of Poland in August 1409. As neither side was ready for a full-scale war, Wenceslaus IV of Bohemia brokered a nine-month truce. After the truce expired in June 1410, the military-religious monks were decisively defeated in the Battle of Grunwald , one of the largest battles in medieval Europe. Most of the Teutonic leadership was killed or taken prisoner. While defeated, the Teutonic Knights withstood the siege on their capital in Marienburg and suffered only minimal territorial losses in the Peace of Thorn . Territorial disputes lasted until the Peace of Melno of 1422. However, the Knights never recovered their former power and the financial burden of war reparations caused internal conflicts and economic decline in their lands. The war shifted the balance of power in Eastern Europe and marked the rise of the Polish-Lithuanian union as the dominant power in the region.\nHow many years between the truce expiring and the Peace of Melno?",
  "model_response": "The truce expired in June 1410, and the Peace of Melno was signed in 1422. To find the number of years between these two events, subtract the year of the truce expiration from the year of the Peace of Melno:  \n1422 - 1410 = 12 years.  \n\nAlthough the exact month of the Peace of Melno is not specified in the given text (it is historically known to be September 1422), the calculation is based on the year difference, which is standard for such historical intervals. Therefore, there are 12 years between the expiration of the truce and the Peace of Melno.\n\n\\boxed{12}"
};

// ----- DYNAMIC TRANSFORMATION FUNCTION -----
const mainPhaseToCategoryMap: Record<string, string> = {
    "problem_definition_and_scoping": "Problem Definition & Scoping",
    "initial_solution_and_exploration": "Initial Solution & Exploration",
    "iterative_refinement_and_verification": "Iterative Refinement & Verification",
    "final_decision": "Final Answer",
    // Add mappings for new main_phase keys if you add them to originalInputJson
    "another_phase": "Another Phase Category"
};

const nodeTypeMap: Record<string, string> = {
  "Problem Definition & Scoping": "problemDefinition",
  "Initial Solution & Exploration": "bloom",
  "Iterative Refinement & Verification": "reconstruction",
  "Final Answer": "finalAnswer",
  // Add mappings for new categories if you add them
  "Another Phase Category": "default" // Example fallback
};

function transformInputToFlowData(input: typeof originalInputJson): AppInputForFlow {
    const transformedGroups: TransformedGroup[] = [];
    const reasoningAnalysis = input.reasoning_analysis;
    const mainPhaseEntries = Object.entries(reasoningAnalysis);

    mainPhaseEntries.forEach(([mainPhaseKey, mainPhaseData], mainPhaseIndex) => {
        if (!mainPhaseData.subphases || mainPhaseData.subphases.length === 0) {
            return; // Skip if this main phase has no subphases
        }

        const firstSubphase = mainPhaseData.subphases[0];
        const category = mainPhaseToCategoryMap[mainPhaseKey] || mainPhaseData.main_phase_summary; // Fallback to main_phase_summary

        const group: TransformedGroup = {
            category: category,
            id: mainPhaseIndex === 0 ? `${firstSubphase.id}_top` : firstSubphase.id,
            step_indices: firstSubphase.step_indices,
            summary: mainPhaseData.main_phase_summary || firstSubphase.summary,

            subcategory: firstSubphase.subcategory,
            // Assign all subphases from the original data to the group's subphases
            // This will make all original subphases available as tags for every node.
            subphases: mainPhaseData.subphases.map(sub => ({
                id: sub.id,
                subcategory: sub.subcategory,
                summary: sub.summary,
                step_indices: sub.step_indices,
                steps: sub.steps // Ensure steps are carried over
            }))
        };

        transformedGroups.push(group);
    });

    return {
        groups: transformedGroups,
        question: "Write a function that checks if a string is a valid palindrome after removing exactly one character." // This can be made dynamic too if needed
    };
}

// ----- SVELTE FLOW NODE AND EDGE GENERATION -----

// Perform the transformation
const svelteFlowReadyInput = transformInputToFlowData(originalInputJson);
const groupsForFlow = svelteFlowReadyInput.groups;

// Generate Nodes
export const initialNodes: Node[] = groupsForFlow.map((group, index) => ({
  id: group.id,
  type: nodeTypeMap[group.category] || 'default', // Fallback to 'default' type
  data: {
    step: index + 1,
    category: group.category,
    subcategory: group.subcategory,
    content: group.summary,
    group_indices: group.step_indices,
    subphases: group.subphases,
  },
  position: { x: (index % 4) * 250, y: Math.floor(index / 4) * 180 }, // Basic dynamic positioning
}));

// Generate Edges
const edges: Edge[] = [];
let edgeCreationCounter = 0;

const createEdge = (
  sourceId: string,
  targetId: string,
  sourceHandle: string,
  targetHandle: string
): Edge => {
  return {
    id: `e_${sourceId}-${targetId}_${edgeCreationCounter++}`,
    source: sourceId,
    sourceHandle,
    target: targetId,
    targetHandle,
    markerEnd: { type: MarkerType.ArrowClosed },
    type: 'bezier',
    style: 'stroke-width: 2px; stroke: #AAA',
  };
};

for (let i = 0; i < groupsForFlow.length; i++) {
  const currentGroup = groupsForFlow[i];
  if (i + 1 >= groupsForFlow.length) {
    continue; // No next group to connect to
  }
  const nextGroup = groupsForFlow[i + 1];

  const currentCat = currentGroup.category;
  const nextCat = nextGroup.category;

  // Your edge creation logic (can be expanded)
  if (currentCat === "Problem Definition & Scoping") {
    if (nextCat === "Initial Solution & Exploration") {
      edges.push(createEdge(currentGroup.id, nextGroup.id, 'bottom', 'top'));
    }
  } else if (currentCat === "Initial Solution & Exploration") {
    if (nextCat === "Iterative Refinement & Verification") {
      edges.push(createEdge(currentGroup.id, nextGroup.id, 'right', 'left'));
    } else if (nextCat === "Final Answer") {
      edges.push(createEdge(currentGroup.id, nextGroup.id, 'right', 'top'));
    }
  } else if (currentCat === "Iterative Refinement & Verification") {
    if (nextCat === "Iterative Refinement & Verification") {
      const sourceHandle = (currentGroup.subcategory === "Rebloom" || currentGroup.subcategory === null) ? 'right' : 'bottom';
      edges.push(createEdge(currentGroup.id, nextGroup.id, sourceHandle, 'left'));
    } else if (nextCat === "Final Answer") {
      edges.push(createEdge(currentGroup.id, nextGroup.id, 'bottom', 'top'));
    }
  }
  // Add more rules if other categories can connect
}

export const initialEdges: Edge[] = edges;

// Export the question and model_response
export const initialQuestion: string = originalInputJson.question;
export const initialModelResponse: string = originalInputJson.model_response;

// ----- OUTPUT FOR VERIFICATION -----
// console.log('Transformed svelteFlowReadyInput.groups:', JSON.stringify(svelteFlowReadyInput.groups, null, 2));
// console.log('\nGenerated Nodes (initialNodes):', JSON.stringify(initialNodes, null, 2));
// console.log('\nGenerated Edges (initialEdges):', JSON.stringify(initialEdges, null, 2));