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
      "main_phase_summary": "The LM identified the goal of summing clips sold in two months and extensively analyzed the core ambiguity of whether 'sold clips to 48 of her friends' implies 48 clips were sold, concluding an assumption was necessary.",
      "subphases": [
        {
          "id": "subphase_1",
          "subcategory": "Define_Goal",
          "summary": "Stating the goal to find the total clips and re-reading the problem to confirm details.",
          "step_indices": [
            0,
            1
          ],
          "steps": [
            {
              "index": 0,
              "text": "I need to find out how many clips Natalia sold altogether in April and May. First, it says she sold clips to 48 of her friends in April. But it doesn't say how many clips each friend bought. It just says \"sold clips to 48 of her friends,\" which might mean that she sold to 48 friends, but we don't know how many clips per friend."
            },
            {
              "index": 1,
              "text": "Let me read the problem again: \"Natalia sold clips to 48 of her friends in April, and then she sold half as many clips in May. How many clips did Natalia sell altogether in April and May?\""
            }
          ]
        },
        {
          "id": "subphase_2",
          "subcategory": "Rephrase",
          "summary": "Repeatedly analyzing the ambiguity of '48 friends' versus '48 clips' and exploring interpretations before concluding that an assumption is required for the problem to be solvable.",
          "step_indices": [
            2,
            3,
            4,
            5,
            6,
            7,
            8,
            9,
            10,
            11,
            12,
            13,
            14,
            15,
            16,
            17,
            18,
            19
          ],
          "steps": [
            {
              "index": 2,
              "text": "It says \"sold clips to 48 of her friends,\" but it doesn't specify the number of clips. That seems odd. Maybe it's implying that each friend bought one clip? But that might not be the case. Perhaps \"clips\" here is a unit, and selling to friends means she sold one clip per friend? But that seems arbitrary."
            },
            {
              "index": 3,
              "text": "Another thought: maybe \"sold clips to 48 friends\" means she had 48 transactions or something, but again, we don't know the quantity per transaction."
            },
            {
              "index": 4,
              "text": "The sentence is: \"sold clips to 48 of her friends.\" It might be that the number of clips is not given, only the number of friends. But then it says she sold half as many clips in May, so we need the number of clips."
            },
            {
              "index": 5,
              "text": "Perhaps I misinterpreted. Let me read carefully: \"Natalia sold clips to 48 of her friends in April\" \u2013 this could mean that she sold clips, and it was to 48 friends, but the clips could be multiple. But the key point is that in May, she sold half as many clips, so \"clips\" is the unit we're counting."
            },
            {
              "index": 6,
              "text": "But we don't have the number of clips sold in April, only that it was to 48 friends. That doesn't give us the clip count."
            },
            {
              "index": 7,
              "text": "Unless... maybe it's assumed that each friend bought one clip? But the problem doesn't say that. It just says she sold clips to them, which could mean multiple clips per friend."
            },
            {
              "index": 8,
              "text": "This is confusing. Perhaps \"sold clips to 48 friends\" is meant to indicate that she sold 48 clips, one to each friend. That might be the intention, but it's not explicitly stated."
            },
            {
              "index": 9,
              "text": "Let me see the wording: \"sold clips to 48 of her friends.\" In English, this could be ambiguous. For example, \"I sold books to 10 people\" doesn't specify how many books each bought."
            },
            {
              "index": 10,
              "text": "But in the context of this problem, since it's a math problem, it might be simplified to mean that she sold one clip per friend. Otherwise, we don't have enough information."
            },
            {
              "index": 11,
              "text": "Moreover, it says \"half as many clips\" in May, so clips are being counted."
            },
            {
              "index": 12,
              "text": "Perhaps the phrase \"sold clips to 48 friends\" implies that clips were sold, and the number 48 refers to the friends, not necessarily the clips."
            },
            {
              "index": 13,
              "text": "I think I need to look for another way. Let me read the entire sentence: \"Natalia sold clips to 48 of her friends in April, and then she sold half as many clips in May.\""
            },
            {
              "index": 14,
              "text": "The key is \"half as many clips\" \u2013 so in May, she sold half the number of clips that she sold in April."
            },
            {
              "index": 15,
              "text": "But we don't know how many clips she sold in April, only that it was to 48 friends."
            },
            {
              "index": 16,
              "text": "Unless we assume that \"sold clips to 48 friends\" means she sold 48 clips, one to each."
            },
            {
              "index": 17,
              "text": "I think that's the only logical way, because otherwise, there's missing information."
            },
            {
              "index": 18,
              "text": "Perhaps \"clips\" is a typo or something, but I doubt it."
            },
            {
              "index": 19,
              "text": "Another idea: maybe \"clips\" here is meant to be the item, and \"sold to 48 friends\" means 48 units were sold, one per friend."
            }
          ]
        }
      ]
    },
    "initial_solution_and_exploration": {
      "main_phase_summary": "The LM committed to the assumption that 48 clips were sold in April, performed the necessary calculations to arrive at an initial total, and then immediately expressed doubt about the answer's validity.",
      "subphases": [
        {
          "id": "subphase_3",
          "subcategory": "Decomposition_&_Execution",
          "summary": "Assuming 48 clips were sold in April and calculating that half of that is 24 for May.",
          "step_indices": [
            20,
            21
          ],
          "steps": [
            {
              "index": 20,
              "text": "I think for the sake of solving, I should assume that she sold one clip to each friend, so 48 clips in April."
            },
            {
              "index": 21,
              "text": "Then in May, she sold half as many clips, so half of 48 is 24."
            }
          ]
        },
        {
          "id": "subphase_4",
          "subcategory": "First_Answer",
          "summary": "Calculating the initial total of 72 clips by summing the April and May amounts.",
          "step_indices": [
            22
          ],
          "steps": [
            {
              "index": 22,
              "text": "Altogether, 48 + 24 = 72."
            }
          ]
        },
        {
          "id": "subphase_5",
          "subcategory": "Confidence_Qualification",
          "summary": "Immediately questioning the correctness of the initial answer.",
          "step_indices": [
            23
          ],
          "steps": [
            {
              "index": 23,
              "text": "But is that correct? The problem says \"sold half as many clips,\" not \"half as many to friends\" or something."
            }
          ]
        }
      ]
    },
    "iterative_refinement_and_verification": {
      "main_phase_summary": "The LM engaged in extensive verification, repeatedly re-examining its core assumption, exploring and rejecting alternative interpretations (like algebraic variables or different meanings of 'clips'), and reinforcing its initial logic as the only viable path.",
      "subphases": [
        {
          "id": "subphase_6",
          "subcategory": "Correction",
          "summary": "Re-evaluating the core assumption by analyzing the problem's wording and justifying it as necessary for solvability.",
          "step_indices": [
            24,
            25,
            26,
            27,
            28,
            29,
            30
          ],
          "steps": [
            {
              "index": 24,
              "text": "Let me see the exact words: \"she sold half as many clips in May.\""
            },
            {
              "index": 25,
              "text": "So it's comparing the number of clips, not the number of friends."
            },
            {
              "index": 26,
              "text": "But in April, the number of clips isn't given, only the number of friends."
            },
            {
              "index": 27,
              "text": "Unless from context, it's implied that the number of clips equals the number of friends."
            },
            {
              "index": 28,
              "text": "Perhaps the phrase \"sold clips to 48 friends\" is idiomatic for selling 48 clips."
            },
            {
              "index": 29,
              "text": "I think I should go with that, as it's a common simplification in such problems."
            },
            {
              "index": 30,
              "text": "Otherwise, the problem is unsolvable, which is unlikely."
            }
          ]
        },
        {
          "id": "subphase_7",
          "subcategory": "Re-examine",
          "summary": "Re-stating the calculation and the answer based on the just-verified assumption.",
          "step_indices": [
            31,
            32,
            33,
            34,
            35
          ],
          "steps": [
            {
              "index": 31,
              "text": "So, let's assume in April, she sold 48 clips (one to each of 48 friends)."
            },
            {
              "index": 32,
              "text": "Then in May, she sold half as many clips, so 48 / 2 = 24 clips."
            },
            {
              "index": 33,
              "text": "Total clips sold in April and May: 48 + 24 = 72."
            },
            {
              "index": 34,
              "text": "The question is: \"how many clips did Natalia sell altogether in April and May?\""
            },
            {
              "index": 35,
              "text": "So, 72."
            }
          ]
        },
        {
          "id": "subphase_8",
          "subcategory": "Pausing_to_Rethink",
          "summary": "Signaling another round of verification by deciding to double-check.",
          "step_indices": [
            36
          ],
          "steps": [
            {
              "index": 36,
              "text": "But let me double-check."
            }
          ]
        },
        {
          "id": "subphase_9",
          "subcategory": "Correction",
          "summary": "Considering a nuance about the role of 'friends', reinforcing the assumption with experience from similar problems, and re-stating the calculation.",
          "step_indices": [
            37,
            38,
            39,
            40,
            41,
            42,
            43,
            44,
            45,
            46,
            47,
            48,
            49
          ],
          "steps": [
            {
              "index": 37,
              "text": "Another thought: it says \"sold clips to 48 of her friends.\" What about friends who didn't buy? It says \"48 of her friends,\" implying she has more friends, but only 48 bought in April. But for May, it doesn't say to how many friends, only the number of clips."
            },
            {
              "index": 38,
              "text": "In May, she sold clips, but not necessarily to the same friends or to friends at all; it just says \"sold half as many clips,\" so it's about the quantity, not who she sold to."
            },
            {
              "index": 39,
              "text": "So, the friends part is only for April to indicate the quantity sold, I think."
            },
            {
              "index": 40,
              "text": "But again, quantity not specified."
            },
            {
              "index": 41,
              "text": "I think I'm overcomplicating. Probably, the intended meaning is that she sold 48 clips in April."
            },
            {
              "index": 42,
              "text": "Perhaps \"clips\" is countable, and selling to friends means each transaction is with a friend, but multiple clips could be sold."
            },
            {
              "index": 43,
              "text": "But without additional information, we must assume one clip per friend."
            },
            {
              "index": 44,
              "text": "I recall similar problems where \"sold to X friends\" implies X items sold."
            },
            {
              "index": 45,
              "text": "For example, \"she sold cookies to 10 children\" often means 10 cookies in simple math problems."
            },
            {
              "index": 46,
              "text": "So, I think 48 clips in April is reasonable."
            },
            {
              "index": 47,
              "text": "Then half in May: 24."
            },
            {
              "index": 48,
              "text": "Total: 72."
            },
            {
              "index": 49,
              "text": "The problem says \"altogether in April and May,\" so sum."
            }
          ]
        },
        {
          "id": "subphase_10",
          "subcategory": "Try_Alternative",
          "summary": "Exploring an algebraic approach with a variable, which ultimately leads back to the same necessary assumption.",
          "step_indices": [
            50,
            51,
            52,
            53,
            54,
            55
          ],
          "steps": [
            {
              "index": 50,
              "text": "Perhaps I should let the number be a variable."
            },
            {
              "index": 51,
              "text": "Let C be the number of clips sold in April."
            },
            {
              "index": 52,
              "text": "But we don't know C, only that it was sold to 48 friends."
            },
            {
              "index": 53,
              "text": "The number of friends doesn't define C."
            },
            {
              "index": 54,
              "text": "Unless each friend bought exactly one clip."
            },
            {
              "index": 55,
              "text": "I think that's the case."
            }
          ]
        },
        {
          "id": "subphase_11",
          "subcategory": "Try_Alternative",
          "summary": "Briefly considering and dismissing the ideas that the problem is flawed or 'clips' has another meaning.",
          "step_indices": [
            56,
            57
          ],
          "steps": [
            {
              "index": 56,
              "text": "Perhaps the problem has a mistake, but I doubt it."
            },
            {
              "index": 57,
              "text": "Another idea: maybe \"clips\" is not the item, but something else? No, clips are probably hair clips or paper clips, sold individually."
            }
          ]
        },
        {
          "id": "subphase_12",
          "subcategory": "Re-examine",
          "summary": "Committing to the established logic and re-stating the full calculation and answer.",
          "step_indices": [
            58,
            59,
            60,
            61,
            62
          ],
          "steps": [
            {
              "index": 58,
              "text": "I think I should proceed with 48 clips in April."
            },
            {
              "index": 59,
              "text": "So, April: 48 clips"
            },
            {
              "index": 60,
              "text": "May: half as many, so 24 clips"
            },
            {
              "index": 61,
              "text": "Total: 48 + 24 = 72"
            },
            {
              "index": 62,
              "text": "The answer should be 72."
            }
          ]
        },
        {
          "id": "subphase_13",
          "subcategory": "Pausing_to_Rethink",
          "summary": "Pausing for one final check of other interpretations.",
          "step_indices": [
            63
          ],
          "steps": [
            {
              "index": 63,
              "text": "But let me see if there's another interpretation."
            }
          ]
        },
        {
          "id": "subphase_14",
          "subcategory": "Try_Alternative",
          "summary": "Formally rejecting the 'multiple clips per sale' interpretation due to insufficient information.",
          "step_indices": [
            64,
            65,
            66
          ],
          "steps": [
            {
              "index": 64,
              "text": "Suppose that \"sold clips to 48 friends\" means she had 48 sales, but each sale could have multiple clips. But then we don't know the clips per sale, so we can't find the total clips for April."
            },
            {
              "index": 65,
              "text": "Then, in May, \"sold half as many clips\" \u2013 but we don't know how many clips were in April, so impossible."
            },
            {
              "index": 66,
              "text": "Therefore, the only sensible interpretation is that each friend bought one clip, so 48 clips in April."
            }
          ]
        },
        {
          "id": "subphase_15",
          "subcategory": "Re-examine",
          "summary": "Confirming the chosen interpretation and calculation as the final logical step before concluding.",
          "step_indices": [
            67,
            68,
            69,
            70
          ],
          "steps": [
            {
              "index": 67,
              "text": "I think that's it."
            },
            {
              "index": 68,
              "text": "So, altogether, 48 + 24 = 72."
            },
            {
              "index": 69,
              "text": "The problem says \"she sold half as many clips in May\" compared to April, so yes."
            },
            {
              "index": 70,
              "text": "And \"how many clips did she sell altogether,\" so total clips."
            }
          ]
        }
      ]
    },
    "final_decision": {
      "main_phase_summary": "After extensive and repeated verification of its core assumption, the LM settled on its initial answer and prepared it as the final output.",
      "subphases": [
        {
          "id": "subphase_16",
          "subcategory": "Preparing_Output",
          "summary": "Stating the final answer of 72 with moderate confidence.",
          "step_indices": [
            71
          ],
          "steps": [
            {
              "index": 71,
              "text": "So, I think 72 is the answer."
            }
          ]
        }
      ]
    }
  },
  "question": "Natalia sold clips to 48 of her friends in April, and then she sold half as many clips in May. How many clips did Natalia sell altogether in April and May?",
  "model_response": "Natalia sold clips to 48 friends in April. Assuming each friend bought one clip, she sold 48 clips in April.\n\nIn May, she sold half as many clips as in April, which is \\( \\frac{48}{2} = 24 \\) clips.\n\nAltogether, the total number of clips sold in April and May is \\( 48 + 24 = 72 \\).\n\nThus, Natalia sold 72 clips altogether in April and May.\n\n\\boxed{72}"
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