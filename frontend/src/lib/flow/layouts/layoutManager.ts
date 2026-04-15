import type { Node, Edge } from '@xyflow/svelte';
import { type Writable } from 'svelte/store';
import type { PhaseInfo } from '$lib/utils/diagramProcessing';

// Import layout strategies
import { applySpaceFillingCurveLayout } from './spaceFillingCurveLayout';
import { applySequentialTimelineLayout } from './sequentialTimelineLayout';
import { applyRawTraceLayout } from './rawTraceLayout';

// Type definitions
interface Step {
    index: number;
    text: string;
}

// Layout type definitions (restricted to three)
export type LayoutType = 'space-filling-curve' | 'sequential-timeline' | 'raw-trace';

// Layout manager class
export class LayoutManager {
    private currentLayoutType: LayoutType = 'space-filling-curve';

    setLayoutType(layoutType: LayoutType) {
        this.currentLayoutType = layoutType;
        console.log(`[LayoutManager] Layout type set to: ${layoutType}`);
    }

    getCurrentLayoutType(): LayoutType {
        return this.currentLayoutType;
    }

    applyCurrentLayout(
        nodesWritable: Writable<Node[]>,
        edgesWritable: Writable<Edge[]>,
        initialNodesFromLoad?: Node[],
        initialEdgesFromLoad?: Edge[],
        fitView?: () => void,
        phaseDistribution?: PhaseInfo[]
    ): { useTextArea?: boolean; traceText?: string; steps?: Step[] } | void {
        console.log(`[LayoutManager] Applying layout: ${this.currentLayoutType}`);
        
        switch (this.currentLayoutType) {
            case 'space-filling-curve':
                applySpaceFillingCurveLayout(nodesWritable, edgesWritable, initialNodesFromLoad, initialEdgesFromLoad, fitView);
                break;
                
            case 'sequential-timeline':
                applySequentialTimelineLayout(nodesWritable, edgesWritable, phaseDistribution, initialNodesFromLoad, initialEdgesFromLoad, fitView);
                break;
                
            case 'raw-trace':
                return applyRawTraceLayout(nodesWritable, edgesWritable, initialNodesFromLoad);
                
            default:
                console.warn(`[LayoutManager] Unknown layout type: ${this.currentLayoutType}, falling back to space-filling-curve`);
                applySpaceFillingCurveLayout(nodesWritable, edgesWritable, initialNodesFromLoad, initialEdgesFromLoad, fitView);
                break;
        }
    }
}

// Global layout manager instance
export const globalLayoutManager = new LayoutManager();

// Convenience function for external use
export function applySelectedLayout(
    layoutType: LayoutType,
    nodesWritable: Writable<Node[]>,
    edgesWritable: Writable<Edge[]>,
    initialNodesFromLoad?: Node[],
    initialEdgesFromLoad?: Edge[],
    fitView?: () => void,
    phaseDistribution?: PhaseInfo[]
): { useTextArea?: boolean; traceText?: string; steps?: Step[] } | void {
    globalLayoutManager.setLayoutType(layoutType);
    return globalLayoutManager.applyCurrentLayout(nodesWritable, edgesWritable, initialNodesFromLoad, initialEdgesFromLoad, fitView, phaseDistribution);
}

// Helper function to get layout type from string
export function parseLayoutType(layoutString: string): LayoutType {
    const validLayouts: LayoutType[] = ['space-filling-curve', 'sequential-timeline', 'raw-trace'];
    
    if (validLayouts.includes(layoutString as LayoutType)) {
        return layoutString as LayoutType;
    }
    
    console.warn(`[LayoutManager] Invalid layout type: ${layoutString}, falling back to 'space-filling-curve'`);
    return 'space-filling-curve';
}

// Export layout type for external use
export { type LayoutType as LayoutTypeExport };
