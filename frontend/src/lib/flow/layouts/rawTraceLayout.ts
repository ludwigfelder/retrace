import type { Node, Edge } from '@xyflow/svelte';
import { type Writable } from 'svelte/store';

// Type definitions for the raw trace layout
interface Step {
    index: number;
    text: string;
}

interface Subphase {
    id: string;
    subcategory: string;
    summary: string;
    step_indices: number[];
    steps: Step[];
}

/**
 * Applies a raw trace layout that displays the reasoning trace as a scrollable textarea
 * This layout bypasses the canvas entirely
 */
export function applyRawTraceLayout(
    nodesWritable: Writable<Node[]>,
    edgesWritable: Writable<Edge[]>,
    initialNodesFromLoad?: Node[]
): { useTextArea: true; traceText: string; steps: Step[] } | void {
    console.log('[RawTraceLayout] Applying raw trace layout');
    
    if (!initialNodesFromLoad || initialNodesFromLoad.length === 0) {
        console.warn('[RawTraceLayout] No initial nodes provided');
        nodesWritable.set([]);
        edgesWritable.set([]);
        return;
    }

    // Extract all steps from all nodes to reconstruct the raw trace
    const allSteps: Step[] = [];
    
    initialNodesFromLoad.forEach(node => {
        if (node.data.subphases && Array.isArray(node.data.subphases)) {
            (node.data.subphases as Subphase[]).forEach((subphase: Subphase) => {
                if (subphase.steps && Array.isArray(subphase.steps)) {
                    subphase.steps.forEach((step: Step) => {
                        allSteps.push({
                            index: step.index,
                            text: step.text
                        });
                    });
                }
            });
        }
    });
    
    // Sort steps by index to maintain original order
    allSteps.sort((a, b) => a.index - b.index);
    
    // Combine all steps into a continuous reasoning trace
    let traceText = '';
    allSteps.forEach(step => {
        traceText += `${step.text}\n\n`;
    });

    console.log(`[RawTraceLayout] Created trace text with ${allSteps.length} steps`);
    
    // Clear the canvas
    nodesWritable.set([]);
    edgesWritable.set([]);
    
    // Return the trace text and steps to be displayed in a textarea
    return {
        useTextArea: true,
        traceText,
        steps: allSteps
    };
}
