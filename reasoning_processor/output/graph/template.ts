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
const originalInputJson = {};

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