import type { Node } from '@xyflow/svelte'; // Assuming Node type is available or define a local one

export interface PhaseInfo {
    name: string;
    steps: number;
    color: string;
    percentage: number;
}

const defaultPhaseColors: Record<string, string> = {
    "Problem Definition & Scoping": "bg-[#FFD29F]",
    "Initial Solution & Exploration": "bg-[#FFC5FF]",
    "Iterative Refinement & Verification": "bg-[#c9baff]",
    "Final Answer": "bg-[#94F1C3]",
};

export function calculatePhaseDistribution(
    initialNodes: Node[] | undefined | null,
    phaseColors: Record<string, string> = defaultPhaseColors
): PhaseInfo[] {
    if (!initialNodes || initialNodes.length === 0) {
        return [];
    }

    let totalStepsOverall = 0;
    const phasesRawData: Array<{ name: string; steps: number }> = [];

    for (const node of initialNodes) {
        // Ensure node.data and node.data.category exist
        if (!node.data || typeof node.data.category !== 'string') {
            console.warn('Skipping node due to missing or invalid category:', node);
            continue;
        }
        const category = node.data.category;
        let stepsInThisPhase = 0;

        // Ensure node.data.subphases is an array before reducing
        if (node.data.subphases && Array.isArray(node.data.subphases)) {
            stepsInThisPhase = node.data.subphases.reduce(
                (sum, sub) => sum + (sub.step_indices?.length || 0),
                0
            );
        } else if (node.data.subphases) {
            // Handle cases where subphases might exist but not be an array, or log a warning
            console.warn(`Node ${node.id} has subphases that are not an array.`, node.data.subphases);
        }


        // Check if phase already exists to aggregate steps (if multiple nodes can belong to the same phase category)
        const existingPhase = phasesRawData.find(p => p.name === category);
        if (existingPhase) {
            existingPhase.steps += stepsInThisPhase;
        } else {
            phasesRawData.push({ name: category, steps: stepsInThisPhase });
        }
        totalStepsOverall += stepsInThisPhase;
    }

    if (totalStepsOverall === 0) {
        // Avoid division by zero and return steps if no percentages can be calculated
        return phasesRawData.map(p => ({
            name: p.name,
            steps: p.steps,
            color: phaseColors[p.name] || 'bg-slate-400', // Fallback color
            percentage: 0
        }));
    }

    return phasesRawData.map(p => ({
        name: p.name,
        steps: p.steps,
        color: phaseColors[p.name] || 'bg-slate-400', // Fallback color
        percentage: (p.steps / totalStepsOverall) * 100
    }));
}