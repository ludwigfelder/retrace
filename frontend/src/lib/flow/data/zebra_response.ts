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
      "main_phase_summary": "The LM defined the puzzle's components (people, houses, genres) and constraints (clues), and established the goal of finding the genre for house 2.",
      "subphases": [
        {
          "id": "subphase_1",
          "subcategory": "Rephrase",
          "summary": "Reading the puzzle's premise, including the four people, genres, houses, and the six provided clues.",
          "step_indices": [
            0,
            1,
            2,
            3,
            4,
            5,
            6,
            7
          ],
          "steps": [
            {
              "index": 0,
              "text": "I have a logic puzzle with four houses, each occupied by a different person, and each person has a unique favorite book genre. The people are Arnold, Alice, Peter, and Eric. The genres are mystery, romance, science fiction, and fantasy."
            },
            {
              "index": 1,
              "text": "Here are the clues:"
            },
            {
              "index": 2,
              "text": "1. Arnold is the person who loves science fiction books."
            },
            {
              "index": 3,
              "text": "2. The person who loves fantasy books is not in the second house."
            },
            {
              "index": 4,
              "text": "3. Alice is not in the second house."
            },
            {
              "index": 5,
              "text": "4. The person who loves romance books is in the first house."
            },
            {
              "index": 6,
              "text": "5. Peter is the person who loves romance books."
            },
            {
              "index": 7,
              "text": "6. Arnold is somewhere to the right of Alice."
            }
          ]
        },
        {
          "id": "subphase_2",
          "subcategory": "Define_Goal",
          "summary": "Articulating the specific goal to find the book genre for the person in house 2.",
          "step_indices": [
            8
          ],
          "steps": [
            {
              "index": 8,
              "text": "I need to find the book genre of the person in house 2."
            }
          ]
        }
      ]
    },
    "initial_solution_and_exploration": {
      "main_phase_summary": "The LM systematically processed the clues to deduce the placement of all individuals and their corresponding book genres, arriving at a complete initial solution grid and answering the specific question.",
      "subphases": [
        {
          "id": "subphase_3",
          "subcategory": "Decomposition_&_Execution",
          "summary": "Systematically applying clues to deduce the occupants and genres for each house, starting with Peter, then placing Alice and Arnold, and finally determining Eric's position and the remaining genres.",
          "step_indices": [
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
            19,
            20,
            21,
            22,
            23,
            24,
            25,
            26,
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
            41,
            42,
            43,
            44,
            45,
            46,
            47,
            48,
            49,
            50,
            51
          ],
          "steps": [
            {
              "index": 9,
              "text": "First, from clue 4 and clue 5, the person who loves romance books is in the first house, and that person is Peter. So, house 1: Peter, romance."
            },
            {
              "index": 10,
              "text": "Clue 4 says: \"The person who loves romance books is in the first house.\""
            },
            {
              "index": 11,
              "text": "Clue 5 says: \"Peter is the person who loves romance books.\""
            },
            {
              "index": 12,
              "text": "Therefore, Peter is in house 1 with romance."
            },
            {
              "index": 13,
              "text": "So, house 1: Peter, romance."
            },
            {
              "index": 14,
              "text": "Now, clue 3: Alice is not in the second house. Since house 1 is Peter, Alice must be in house 3 or 4."
            },
            {
              "index": 15,
              "text": "Houses are 1,2,3,4 from left to right."
            },
            {
              "index": 16,
              "text": "Alice not in second, and not in first (since Peter is there), so Alice in 3 or 4."
            },
            {
              "index": 17,
              "text": "Similarly, Arnold is not in first, since Peter is there."
            },
            {
              "index": 18,
              "text": "Now, clue 1: Arnold loves science fiction."
            },
            {
              "index": 19,
              "text": "Clue 6: Arnold is to the right of Alice."
            },
            {
              "index": 20,
              "text": "Since Alice is in 3 or 4, and Arnold is to the right of her, that might be tricky."
            },
            {
              "index": 21,
              "text": "If Alice is in 3, Arnold could be in 4."
            },
            {
              "index": 22,
              "text": "If Alice is in 4, there is no house to the right, so Arnold can't be to the right of her. Therefore, Alice cannot be in house 4; she must be in house 3, and Arnold in house 4."
            },
            {
              "index": 23,
              "text": "Let me confirm."
            },
            {
              "index": 24,
              "text": "Houses: left to right, 1,2,3,4."
            },
            {
              "index": 25,
              "text": "So right means higher number."
            },
            {
              "index": 26,
              "text": "Arnold to the right of Alice, so Alice must be left of Arnold."
            },
            {
              "index": 27,
              "text": "If Alice in 4, no house right of 4, so impossible for Arnold to be right of her."
            },
            {
              "index": 28,
              "text": "Therefore, Alice cannot be in house 4."
            },
            {
              "index": 29,
              "text": "Alice not in second (clue 3), and not in first (Peter), so only possibility is house 3."
            },
            {
              "index": 30,
              "text": "Then Arnold must be in house 4, since he is to her right."
            },
            {
              "index": 31,
              "text": "And clue 1 says Arnold loves science fiction, so house 4: Arnold, science fiction."
            },
            {
              "index": 32,
              "text": "Now, we have house 1: Peter, romance"
            },
            {
              "index": 33,
              "text": "House 3: Alice, ? not romance, not sci-fi"
            },
            {
              "index": 34,
              "text": "House 4: Arnold, sci-fi"
            },
            {
              "index": 35,
              "text": "Now, house 2: must be Eric, since only one left."
            },
            {
              "index": 36,
              "text": "People: Arnold, Alice, Peter, Eric. Peter in 1, Alice in 3, Arnold in 4, so house 2 must be Eric."
            },
            {
              "index": 37,
              "text": "Now, genres: romance in 1, sci-fi in 4, so left are mystery and fantasy."
            },
            {
              "index": 38,
              "text": "Now, clue 2: The person who loves fantasy books is not in the second house."
            },
            {
              "index": 39,
              "text": "So, fantasy not in house 2."
            },
            {
              "index": 40,
              "text": "Therefore, since house 2 has Eric, and fantasy not there, so Eric must have mystery? Not necessarily."
            },
            {
              "index": 41,
              "text": "House 2 cannot be fantasy, so fantasy must be in house 3, since house 1 and 4 are taken."
            },
            {
              "index": 42,
              "text": "House 1: romance, house 4: sci-fi, so fantasy must be in house 3, with Alice."
            },
            {
              "index": 43,
              "text": "Then house 2 must be mystery with Eric."
            },
            {
              "index": 44,
              "text": "Clue 2 says fantasy not in second house, which we have, house 2 is not fantasy."
            },
            {
              "index": 45,
              "text": "And fantasy must be in house 3, since only house left besides 2, but house 1 and 4 are occupied with genres."
            },
            {
              "index": 46,
              "text": "Houses: 1,2,3,4"
            },
            {
              "index": 47,
              "text": "Genres: romance in 1, sci-fi in 4, so fantasy and mystery for 2 and 3."
            },
            {
              "index": 48,
              "text": "But fantasy not in second house, so fantasy must be in house 3."
            },
            {
              "index": 49,
              "text": "Therefore, house 3: Alice, fantasy."
            },
            {
              "index": 50,
              "text": "Then house 2: Eric, mystery."
            },
            {
              "index": 51,
              "text": "But clue 2 says \"the person who loves fantasy books is not in the second house.\" Which is satisfied."
            }
          ]
        },
        {
          "id": "subphase_4",
          "subcategory": "First_Answer",
          "summary": "Compiling the complete house-person-genre assignments and conducting a full check against all six clues, concluding with the initial answer: mystery.",
          "step_indices": [
            52,
            53,
            54,
            55,
            56,
            57,
            58,
            59,
            60,
            61,
            62,
            63,
            64,
            65
          ],
          "steps": [
            {
              "index": 52,
              "text": "Now, let me list all:"
            },
            {
              "index": 53,
              "text": "House 1: Peter, romance"
            },
            {
              "index": 54,
              "text": "House 2: Eric, mystery"
            },
            {
              "index": 55,
              "text": "House 3: Alice, fantasy"
            },
            {
              "index": 56,
              "text": "House 4: Arnold, science fiction"
            },
            {
              "index": 57,
              "text": "Now, check all clues."
            },
            {
              "index": 58,
              "text": "Clue 1: Arnold loves science fiction. Yes, house 4."
            },
            {
              "index": 59,
              "text": "Clue 2: Fantasy not in second house. Fantasy is in house 3, not 2, yes."
            },
            {
              "index": 60,
              "text": "Clue 3: Alice not in second. Alice in 3, not 2, yes."
            },
            {
              "index": 61,
              "text": "Clue 4: Romance in first house. Yes, Peter."
            },
            {
              "index": 62,
              "text": "Clue 5: Peter loves romance. Yes."
            },
            {
              "index": 63,
              "text": "Clue 6: Arnold right of Alice. Alice in 3, Arnold in 4, which is right, yes."
            },
            {
              "index": 64,
              "text": "All seem satisfied."
            },
            {
              "index": 65,
              "text": "The question is book genre of person in house 2, which is Eric with mystery."
            }
          ]
        }
      ]
    },
    "iterative_refinement_and_verification": {
      "main_phase_summary": "The LM engaged in multiple, extensive rounds of re-verification, re-examining key logical steps, using a grid to visualize the solution, and performing repeated full checks against all clues to ensure correctness.",
      "subphases": [
        {
          "id": "subphase_5",
          "subcategory": "Re-examine",
          "summary": "Re-verifying the deductions for Eric's placement, the genre assignments, and the critical logic concerning Alice and Arnold's relative positions.",
          "step_indices": [
            66,
            67,
            68,
            69,
            70,
            71,
            72,
            73,
            74,
            75,
            76,
            77,
            78,
            79,
            80,
            81
          ],
          "steps": [
            {
              "index": 66,
              "text": "But let me make sure Eric is the only one left, and genres."
            },
            {
              "index": 67,
              "text": "People: Arnold, Alice, Peter, Eric. Yes, Eric in house 2."
            },
            {
              "index": 68,
              "text": "Genres: mystery, romance, sci-fi, fantasy. Romance in 1, sci-fi in 4, fantasy in 3, so mystery in 2."
            },
            {
              "index": 69,
              "text": "Yes."
            },
            {
              "index": 70,
              "text": "But clue 2 says fantasy not in second, which is fine."
            },
            {
              "index": 71,
              "text": "Is there any other constraint?"
            },
            {
              "index": 72,
              "text": "Alice is in house 3 with fantasy, but no clue about that, so it should be fine."
            },
            {
              "index": 73,
              "text": "Perhaps I should confirm if Arnold could be elsewhere."
            },
            {
              "index": 74,
              "text": "Earlier I concluded Alice must be in 3, but let me double-check."
            },
            {
              "index": 75,
              "text": "Alice not in 1 or 2, so only 3 or 4."
            },
            {
              "index": 76,
              "text": "If Alice in 4, then Arnold to the right: but no house right of 4, so impossible. Therefore, Alice must be in 3, Arnold in 4."
            },
            {
              "index": 77,
              "text": "No other possibilities."
            },
            {
              "index": 78,
              "text": "Then house 2 must be Eric, and since fantasy not in second, and only mystery and fantasy left, fantasy must be in 3 with Alice, mystery in 2 with Eric."
            },
            {
              "index": 79,
              "text": "Could fantasy be in house 1 or 4? No, house 1 has romance, house 4 has sci-fi, so only 2 and 3 available for mystery and fantasy."
            },
            {
              "index": 80,
              "text": "Fantasy not in 2, so must be in 3."
            },
            {
              "index": 81,
              "text": "Yes."
            }
          ]
        },
        {
          "id": "subphase_6",
          "subcategory": "Try_Alternative",
          "summary": "Using a mental grid as an alternative method to visualize and confirm the house, person, and genre assignments.",
          "step_indices": [
            82,
            83,
            84,
            85,
            86,
            87
          ],
          "steps": [
            {
              "index": 82,
              "text": "Perhaps I should make a grid mentally."
            },
            {
              "index": 83,
              "text": "Houses: 1,2,3,4"
            },
            {
              "index": 84,
              "text": "People: 1: Peter, 2: ?, 3: Alice, 4: Arnold"
            },
            {
              "index": 85,
              "text": "Genres: 1: romance, 4: sci-fi, 2 and 3: mystery and fantasy."
            },
            {
              "index": 86,
              "text": "Fantasy not in 2, so 3: fantasy, 2: mystery."
            },
            {
              "index": 87,
              "text": "Yes."
            }
          ]
        },
        {
          "id": "subphase_7",
          "subcategory": "Re-examine",
          "summary": "Engaging in a final, extensive loop of re-verification, including another full clue check and questioning assumptions about unmentioned characters and genre placements.",
          "step_indices": [
            88,
            89,
            90,
            91,
            92,
            93,
            94,
            95,
            96,
            97,
            98,
            99,
            100,
            101,
            102,
            103,
            104,
            105,
            106,
            107,
            108,
            109,
            110,
            111,
            112,
            113,
            114,
            115,
            116,
            117,
            118,
            119,
            120,
            121
          ],
          "steps": [
            {
              "index": 88,
              "text": "The person in house 2 has mystery genre."
            },
            {
              "index": 89,
              "text": "But the question is \"What is BookGenre of the person who lives in House 2?\""
            },
            {
              "index": 90,
              "text": "So, mystery."
            },
            {
              "index": 91,
              "text": "But let me see the answer format."
            },
            {
              "index": 92,
              "text": "Perhaps I should write it out."
            },
            {
              "index": 93,
              "text": "Another thing: Eric is not mentioned, but he must be in house 2."
            },
            {
              "index": 94,
              "text": "And genre mystery."
            },
            {
              "index": 95,
              "text": "But clue 2 is about fantasy not in second, which we used."
            },
            {
              "index": 96,
              "text": "I think it's fine."
            },
            {
              "index": 97,
              "text": "So, book genre for house 2 is mystery."
            },
            {
              "index": 98,
              "text": "But let me see if there's any mistake."
            },
            {
              "index": 99,
              "text": "Clue 6: Arnold is somewhere to the right of Alice."
            },
            {
              "index": 100,
              "text": "With Alice in 3, Arnold in 4, he is immediately right, which is fine."
            },
            {
              "index": 101,
              "text": "No issue."
            },
            {
              "index": 102,
              "text": "Perhaps I should list all attributes."
            },
            {
              "index": 103,
              "text": "House 1: Person: Peter, Genre: romance"
            },
            {
              "index": 104,
              "text": "House 2: Person: Eric, Genre: mystery"
            },
            {
              "index": 105,
              "text": "House 3: Person: Alice, Genre: fantasy"
            },
            {
              "index": 106,
              "text": "House 4: Person: Arnold, Genre: science fiction"
            },
            {
              "index": 107,
              "text": "Now, clues:"
            },
            {
              "index": 108,
              "text": "1. Arnold loves sci-fi: yes, house 4."
            },
            {
              "index": 109,
              "text": "2. Fantasy not in second: fantasy in 3, not 2, yes."
            },
            {
              "index": 110,
              "text": "3. Alice not in second: in 3, not 2, yes."
            },
            {
              "index": 111,
              "text": "4. Romance in first: yes, house 1."
            },
            {
              "index": 112,
              "text": "5. Peter loves romance: yes."
            },
            {
              "index": 113,
              "text": "6. Arnold right of Alice: 4 is right of 3, yes."
            },
            {
              "index": 114,
              "text": "All good."
            },
            {
              "index": 115,
              "text": "So, house 2 has mystery genre."
            },
            {
              "index": 116,
              "text": "The question is for the person, but it asks for book genre, so mystery."
            },
            {
              "index": 117,
              "text": "Perhaps I need to box the answer."
            },
            {
              "index": 118,
              "text": "But let me see if Eric could have something else, but no."
            },
            {
              "index": 119,
              "text": "Another thought: is there a clue about Eric? No, but it's fine."
            },
            {
              "index": 120,
              "text": "Perhaps I should consider if fantasy could be in other house, but no, houses 1 and 4 are fixed."
            },
            {
              "index": 121,
              "text": "Yes."
            }
          ]
        }
      ]
    },
    "final_decision": {
      "main_phase_summary": "After extensive verification, the LM concluded its reasoning by expressing confidence in the final answer.",
      "subphases": [
        {
          "id": "subphase_8",
          "subcategory": "Stating_Confidence",
          "summary": "Concluding the reasoning process with a final statement of confidence in the derived solution.",
          "step_indices": [
            122
          ],
          "steps": [
            {
              "index": 122,
              "text": "So, I think it's correct."
            }
          ]
        }
      ]
    }
  },
  "question": "\"There are 4 houses, numbered 1 to 4 from left to right, as seen from across the street. Each house is occupied by a different person. Each house has a unique attribute for each of the following characteristics:\n        - Each person has a unique name: Arnold, Alice, Peter, Eric\n        - People have unique favorite book genres: mystery, romance, science fiction, fantasy\n\n        ## Clues:\n        1. Arnold is the person who loves science fiction books.\n        2. The person who loves fantasy books is not in the second house.\n        3. Alice is not in the second house.\n        4. The person who loves romance books is in the first house.\n        5. Peter is the person who loves romance books.\n        6. Arnold is somewhere to the right of Alice.\"\t\n        What is BookGenre of the person who lives in House 2?",
  "model_response": "Based on the given clues, the arrangement of the houses, people, and book genres is as follows:\n\n- **House 1**: Peter, romance (from clues 4 and 5).\n- **House 2**: Eric, mystery (as the only remaining person and genre, with fantasy excluded from house 2 by clue 2).\n- **House 3**: Alice, fantasy (as Alice is not in house 2 or 1, and fantasy is not in house 2, so it must be in house 3).\n- **House 4**: Arnold, science fiction (from clue 1 and clue 6, with Arnold to the right of Alice in house 3).\n\n### Verification of Clues:\n1. **Clue 1**: Arnold loves science fiction \u2013 satisfied (house 4).\n2. **Clue 2**: Fantasy is not in the second house \u2013 satisfied (fantasy is in house 3).\n3. **Clue 3**: Alice is not in the second house \u2013 satisfied (Alice is in house 3).\n4. **Clue 4**: Romance is in the first house \u2013 satisfied (house 1).\n5. **Clue 5**: Peter loves romance \u2013 satisfied (house 1).\n6. **Clue 6**: Arnold is to the right of Alice \u2013 satisfied (house 4 is to the right of house 3).\n\nThe book genre for the person in house 2 is **mystery**.\n\n\\boxed{\\text{mystery}}"
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