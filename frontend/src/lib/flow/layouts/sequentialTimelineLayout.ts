import type { Node, Edge } from '@xyflow/svelte';
import { type Writable } from 'svelte/store';
import { get } from 'svelte/store';
import type { PhaseInfo } from '$lib/utils/diagramProcessing';
import { Position } from '@xyflow/svelte';

// Layout constants for sequential timeline
const DEFAULT_NODE_WIDTH = 400;
const DEFAULT_NODE_HEIGHT = 120;
const TIMELINE_SPACING = 250; // Horizontal spacing between timeline nodes (increased for wider layout)
const TIMELINE_Y_POSITION = 50; // Y position for the main timeline row
const PHASE_BAR_Y_POSITION = 300; // Y position for the phase distribution bar
const PHASE_BAR_HEIGHT = 60; // Height of the phase distribution bar
const PHASE_BAR_WIDTH = 1200; // Total width of the phase distribution bar (increased for wider timeline)
const PHASE_BAR_START_X = 100; // Starting X position for the phase bar (increased for wider layout)

// Offset constants for positioning
const OFFSET_X = 120;
const OFFSET_Y = 350;

// Z-Index constants to ensure proper layering across all zoom levels
const Z_INDEX = {
    EDGES: -99999,         // Edges always behind everything - extremely low z-index
    PHASE_SECTIONS: 10,    // Phase bar sections at base level
    TIMELINE_NODES: 100,   // Timeline nodes above phase sections
    INTERACTIVE_NODES: 200 // Interactive/selectable nodes on top
} as const;

// Main phase order and names
const MAIN_PHASES = [
    { name: 'Problem Definition', nodeType: 'problemDefinition', color: '#FFD29F' },
    { name: 'Solution Exploration', nodeType: 'solutionExploration', color: '#FFC5FF' },
    { name: 'Iterative Refinement & Verification', nodeType: 'iterativeRefinement', color: '#c9baff' },
    { name: 'Final Answer', nodeType: 'finalAnswer', color: '#94F1C3' }
];

// Phase section data interface
interface PhaseSectionData extends Record<string, unknown> {
    phaseName: string;
    nodeType: string;
    color: string;
    width: number;
    height: number;
    isMainPhaseSection: boolean;
    expanded?: boolean; // For future expansion feature
    stepCount?: number;
    percentage?: number;
    subPhases?: PhaseInfo[]; // Store sub-phases for future expansion
    originalWidth?: number; // Store original width for collapse
    originalHeight?: number; // Store original height for collapse
    originalPhase?: PhaseInfo; // Store original phase data for collapse
    originalSubPhases?: NestedSubphase[]; // Store original rich subPhases for re-expansion after collapse
    subPhaseIndex?: number; // Index for subsection identification
    originalTimelineNodeData?: Record<string, unknown>; // Store original timeline node data for restoration
}

// Interface for nested subphases from the diagram data
interface NestedSubphase {
    id: string;
    subcategory: string;
    summary: string;
    step_indices: number[];
    steps?: {
        index: number;
        text: string;
    }[];
}

// Interface for node positioning during Smart Multi-Row Layout
interface NodePositionInfo {
    node: Node;
    index: number;
    desiredX: number;
    nodeType: string;
    category: string;
    phaseSection: Node;
}

interface FinalNodePosition {
    node: Node;
    finalX: number;
    finalY: number;
    row: number;
    nodeType: string;
    category: string;
}

// Sequential timeline layout strategy
export class SequentialTimelineLayoutStrategy {
    applyLayout(
        nodes: Node[], 
        edges: Edge[], 
        phaseDistribution?: PhaseInfo[]
    ): { nodes: Node[], edges: Edge[] } {
        console.log('[SequentialTimelineLayout] Applying sequential timeline layout');
        
        if (nodes.length === 0) {
            return { nodes, edges };
        }

        // Create timeline nodes and main phase bar
        const { timelineNodes, phaseSectionNodes } = this.createTimelineWithMainPhaseBar(nodes, phaseDistribution || []);
        
        // Create connections between timeline nodes and their main phase sections
        const connectionEdges = this.createMainPhaseConnections(timelineNodes, phaseSectionNodes);
        
        // Apply proper z-index to all original edges
        const originalEdgesWithZIndex = edges.map(edge => {
            const originalZIndex = edge.zIndex;
            const processedEdge = this.ensureEdgeZIndex(edge);
            if (originalZIndex && originalZIndex > 0) {
                console.log(`[SequentialTimelineLayout] Override edge ${edge.id} z-index from ${originalZIndex} to ${processedEdge.zIndex}`);
            }
            return processedEdge;
        });
        
        // Combine all nodes and edges with proper layering
        const allNodes = [...phaseSectionNodes, ...timelineNodes]; // Phase sections first, then timeline nodes
        const allEdges = [...connectionEdges, ...originalEdgesWithZIndex]; // Connection edges first, then original edges
        
        console.log(`[SequentialTimelineLayout] Final layout: ${allNodes.length} nodes, ${allEdges.length} edges`);
        console.log('[SequentialTimelineLayout] Z-index distribution:', this.getZIndexDistribution(allNodes, allEdges));
        
        return { nodes: allNodes, edges: allEdges };
    }

    /**
     * Utility function to create a node with proper z-index based on its type
     */
    private createNodeWithZIndex(baseNode: Partial<Node>, nodeType: 'phase' | 'timeline' | 'interactive'): Node {
        let zIndex: number;
        
        switch (nodeType) {
            case 'phase':
                zIndex = Z_INDEX.PHASE_SECTIONS;
                break;
            case 'timeline':
                zIndex = Z_INDEX.TIMELINE_NODES;
                break;
            case 'interactive':
                zIndex = Z_INDEX.INTERACTIVE_NODES;
                break;
            default:
                zIndex = Z_INDEX.TIMELINE_NODES;
        }
        
        return {
            ...baseNode,
            zIndex,
            style: `z-index: ${zIndex}; ${baseNode.style || ''}`
        } as Node;
    }

    /**
     * Utility function to create a standardized edge with consistent properties
     * All edges are created with zIndex: -9999 to ensure they render behind nodes
     */
    private createStandardEdge(id: string, source: string, target: string, style: string = 'stroke: #888; stroke-width: 2px'): Edge {
        return {
            id,
            source,
            target,
            type: 'straight',
            style: `${style}; z-index: ${Z_INDEX.EDGES}; opacity: 0.5;`,
            animated: false,
            selectable: false,
            sourceHandle: 'bottom',
            targetHandle: 'top',
            zIndex: Z_INDEX.EDGES // Ensure all edges render behind nodes with very low z-index
        };
    }

    /**
     * Ensure any edge has the correct z-index - forcefully override any existing values
     * Also prevent CSS transform stacking context issues that can affect z-index at different zoom levels
     */
    private ensureEdgeZIndex(edge: Edge): Edge {
        return {
            ...edge,
            zIndex: Z_INDEX.EDGES,
            style: `z-index: ${Z_INDEX.EDGES} !important; position: relative; opacity: 0.5; ${(edge.style || '').replace(/z-index\s*:\s*[^;]*;?/gi, '').replace(/position\s*:\s*[^;]*;?/gi, '').replace(/opacity\s*:\s*[^;]*;?/gi, '')};`,
            selectable: false
        };
    }

    /**
     * Get z-index distribution for debugging
     */
    private getZIndexDistribution(nodes: Node[], edges: Edge[]): Record<string, number> {
        const distribution: Record<string, number> = {};
        
        nodes.forEach(node => {
            const zIndex = node.zIndex || 0;
            distribution[`nodes_z${zIndex}`] = (distribution[`nodes_z${zIndex}`] || 0) + 1;
        });
        
        edges.forEach(edge => {
            const zIndex = edge.zIndex || 0;
            distribution[`edges_z${zIndex}`] = (distribution[`edges_z${zIndex}`] || 0) + 1;
        });
        
        return distribution;
    }

    private createTimelineWithMainPhaseBar(
        originalNodes: Node[], 
        phaseDistribution: PhaseInfo[]
    ): { timelineNodes: Node[], phaseSectionNodes: Node[] } {
        // Sort nodes by their category order if possible, otherwise keep original order
        const sortedNodes = this.sortNodesByPhase(originalNodes, phaseDistribution);
        
        // Create main phase bar sections first
        const phaseSectionNodes = this.createMainPhaseSections(phaseDistribution);
        
        // Create timeline nodes positioned above their respective phase sections
        const timelineNodes = this.createTimelineNodesAbovePhaseSections(sortedNodes, phaseSectionNodes);
        
        return { timelineNodes, phaseSectionNodes };
    }

    private createTimelineNodesAbovePhaseSections(originalNodes: Node[], phaseSectionNodes: Node[]): Node[] {
        const timelineNodes: Node[] = [];
        
        console.log(`[SequentialTimeline] Creating ${originalNodes.length} timeline nodes with Smart Multi-Row Layout`);
        
        // First, collect the desired X positions for all nodes based on their phase sections
        const nodePositions = originalNodes.map((node, index) => {
            const nodeCategory = (node.data?.category as string) || '';
            const timelineNodeType = this.getTimelineNodeType(nodeCategory);
            
            // Map the node's category to its main phase
            const mainPhaseType = this.getMainPhaseForCategory(nodeCategory);
            
            // Find the corresponding phase section
            const targetPhaseSection = phaseSectionNodes.find(section => 
                section.data?.nodeType === mainPhaseType
            );
            
            if (!targetPhaseSection) {
                console.log(`[SequentialTimeline] No phase section found for main phase "${mainPhaseType}", skipping timeline node`);
                return null;
            }
            
            // Calculate desired X position (centered above phase section)
            const phaseSectionData = targetPhaseSection.data as PhaseSectionData;
            const centeredX = targetPhaseSection.position.x + (phaseSectionData.width / 2) - (DEFAULT_NODE_WIDTH / 2);
            
            return {
                node: {
                    ...node,
                    id: `timeline-${node.id}`,
                    type: timelineNodeType,
                    data: {
                        ...node.data,
                        content: node.data?.content || node.data?.title || node.data?.category || nodeCategory,
                        isTimelineNode: true,
                        title: node.data?.title || `${nodeCategory} Node`
                    },
                    width: DEFAULT_NODE_WIDTH,
                    height: DEFAULT_NODE_HEIGHT,
                    sourcePosition: Position.Bottom,
                    targetPosition: Position.Top,
                    draggable: false,
                    selectable: true,
                    position: { x: 0, y: 0 } // Will be set by Smart Multi-Row Layout
                } as Node,
                index,
                desiredX: centeredX,
                nodeType: timelineNodeType,
                category: nodeCategory,
                phaseSection: targetPhaseSection
            };
        }).filter(item => item !== null);
        
        // Apply Smart Multi-Row Layout to avoid overlaps
        const finalPositions = this.calculateSmartMultiRowLayout(nodePositions);
        
        // Create timeline nodes with calculated positions and proper z-index
        finalPositions.forEach(({ node, finalX, finalY, row }) => {
            const timelineNode = this.createNodeWithZIndex({
                ...node,
                position: { 
                    x: finalX, 
                    y: finalY + OFFSET_Y 
                }
            }, 'timeline');
            
            console.log(`[SequentialTimeline] Timeline node "${node.id}" positioned at x=${finalX}, y=${finalY} (row ${row}) with z-index ${timelineNode.zIndex}`);
            timelineNodes.push(timelineNode);
        });
        
        return timelineNodes;
    }

    private createMainPhaseSections(phaseDistribution: PhaseInfo[]): Node[] {
        if (phaseDistribution.length === 0) {
            // If no phase distribution provided, create equal sections for the 4 main phases
            return this.createEqualMainPhaseSections();
        }

        let currentX = PHASE_BAR_START_X;
        const mainPhaseSections: Node[] = [];
        
        // Group the phase distribution data by main phase
        const phaseGroups = this.groupPhasesByMainPhase(phaseDistribution);
        
        // Create a section for each main phase that has data
        MAIN_PHASES.forEach((mainPhase) => {
            const phasesInGroup = phaseGroups.get(mainPhase.nodeType) || [];
            
            if (phasesInGroup.length === 0) {
                // Create empty section with minimal width if no data for this phase
                const sectionWidth = PHASE_BAR_WIDTH * 0.05; // 5% minimum width
                const phaseSectionNode = this.createNodeWithZIndex({
                    id: `phase-section-${mainPhase.nodeType}`,
                    type: 'phaseBarSection',
                    position: { 
                        x: currentX + OFFSET_X, 
                        y: PHASE_BAR_Y_POSITION + OFFSET_Y 
                    },
                    data: {
                        phaseName: mainPhase.name,
                        nodeType: mainPhase.nodeType,
                        color: '#e5e7eb', // Gray color for empty sections
                        width: sectionWidth,
                        height: PHASE_BAR_HEIGHT,
                        isMainPhaseSection: true,
                        expanded: false,
                        stepCount: 0,
                        percentage: 0,
                        subPhases: []
                    } as PhaseSectionData,
                    width: sectionWidth,
                    height: PHASE_BAR_HEIGHT,
                    sourcePosition: Position.Top,
                    targetPosition: Position.Bottom,
                    draggable: false,
                    selectable: false
                }, 'phase');
                
                mainPhaseSections.push(phaseSectionNode);
                currentX += sectionWidth;
                return;
            }
            
            // Calculate total steps and percentage for this main phase
            const totalSteps = phasesInGroup.reduce((sum, phase) => sum + phase.steps, 0);
            const totalPercentage = phasesInGroup.reduce((sum, phase) => sum + phase.percentage, 0);
            
            // Calculate section width based on percentage
            const sectionWidth = (totalPercentage / 100) * PHASE_BAR_WIDTH;
            
            // Use the exact color from the original node components
            const phaseColor = this.getPhaseColor(mainPhase.nodeType);
            
            console.log(`[SequentialTimeline] Creating phase section for ${mainPhase.name}:`);
            console.log(`  - Total steps: ${totalSteps}`);
            console.log(`  - Total percentage: ${totalPercentage}%`);
            console.log(`  - Section width: ${sectionWidth}px`);
            console.log(`  - Phase color: ${phaseColor}`);
            console.log(`  - Position X: ${currentX}`);
            console.log(`  - Phases in group: ${phasesInGroup.length}`);
            
            const phaseSectionNode = this.createNodeWithZIndex({
                id: `phase-section-${mainPhase.nodeType}`,
                type: 'phaseBarSection',
                position: { 
                    x: currentX + OFFSET_X, 
                    y: PHASE_BAR_Y_POSITION + OFFSET_Y 
                },
                data: {
                    phaseName: mainPhase.name,
                    nodeType: mainPhase.nodeType,
                    color: phaseColor,
                    width: sectionWidth,
                    height: PHASE_BAR_HEIGHT,
                    isMainPhaseSection: true,
                    expanded: false,
                    stepCount: totalSteps,
                    percentage: totalPercentage,
                    // Store the individual phases for future expansion
                    subPhases: phasesInGroup
                } as PhaseSectionData,
                width: sectionWidth,
                height: PHASE_BAR_HEIGHT,
                sourcePosition: Position.Top,
                targetPosition: Position.Bottom,
                draggable: false, // Make the phase bar fixed/non-moveable
                selectable: false // Prevent selection to keep it as background element
            }, 'phase');
            
            mainPhaseSections.push(phaseSectionNode);
            currentX += sectionWidth;
        });
        
        return mainPhaseSections;
    }

    private groupPhasesByMainPhase(phaseDistribution: PhaseInfo[]): Map<string, PhaseInfo[]> {
        const groups = new Map<string, PhaseInfo[]>();
        
        console.log('[SequentialTimeline] Raw phase distribution data:', phaseDistribution);
        
        // Initialize groups for all main phases
        MAIN_PHASES.forEach(mainPhase => {
            groups.set(mainPhase.nodeType, []);
        });
        
        // Group phases by their main phase
        phaseDistribution.forEach(phase => {
            console.log(`[SequentialTimeline] Processing phase: "${phase.name}" with ${phase.steps} steps (${phase.percentage}%)`);
            const mainPhaseType = this.getMainPhaseForCategory(phase.name);
            console.log(`[SequentialTimeline] Mapped to main phase type: ${mainPhaseType}`);
            
            const existingGroup = groups.get(mainPhaseType) || [];
            existingGroup.push(phase);
            groups.set(mainPhaseType, existingGroup);
        });
        
        // Log the final groups
        console.log('[SequentialTimeline] Final phase groups:');
        groups.forEach((phases, mainPhaseType) => {
            console.log(`  ${mainPhaseType}:`, phases);
        });
        
        return groups;
    }

    private convertTailwindToHex(tailwindColor: string): string {
        // Convert common Tailwind color classes to hex colors
        const colorMap: { [key: string]: string } = {
            // Blue variations
            'bg-blue-300': '#93c5fd',
            'bg-blue-400': '#60a5fa',
            'bg-blue-500': '#3b82f6',
            'bg-blue-600': '#2563eb',
            'bg-blue-700': '#1d4ed8',
            
            // Green variations
            'bg-green-300': '#86efac',
            'bg-green-400': '#4ade80',
            'bg-green-500': '#22c55e',
            'bg-green-600': '#16a34a',
            'bg-green-700': '#15803d',
            
            // Yellow/Amber variations
            'bg-yellow-300': '#fde047',
            'bg-yellow-400': '#facc15',
            'bg-yellow-500': '#eab308',
            'bg-amber-400': '#fbbf24',
            'bg-amber-500': '#f59e0b',
            'bg-amber-600': '#d97706',
            
            // Red variations
            'bg-red-300': '#fca5a5',
            'bg-red-400': '#f87171',
            'bg-red-500': '#ef4444',
            'bg-red-600': '#dc2626',
            'bg-red-700': '#b91c1c',
            
            // Purple variations
            'bg-purple-300': '#c4b5fd',
            'bg-purple-400': '#a78bfa',
            'bg-purple-500': '#8b5cf6',
            'bg-purple-600': '#7c3aed',
            'bg-purple-700': '#6d28d9',
            
            // Indigo variations
            'bg-indigo-300': '#a5b4fc',
            'bg-indigo-400': '#818cf8',
            'bg-indigo-500': '#6366f1',
            'bg-indigo-600': '#4f46e5',
            'bg-indigo-700': '#4338ca',
            
            // Pink variations
            'bg-pink-300': '#f9a8d4',
            'bg-pink-400': '#f472b6',
            'bg-pink-500': '#ec4899',
            'bg-pink-600': '#db2777',
            'bg-pink-700': '#be185d',
            
            // Gray variations
            'bg-gray-300': '#d1d5db',
            'bg-gray-400': '#9ca3af',
            'bg-gray-500': '#6b7280',
            'bg-gray-600': '#4b5563',
            'bg-gray-700': '#374151',
            
            // Teal variations
            'bg-teal-300': '#5eead4',
            'bg-teal-400': '#2dd4bf',
            'bg-teal-500': '#14b8a6',
            'bg-teal-600': '#0d9488',
            'bg-teal-700': '#0f766e',
            
            // Orange variations
            'bg-orange-300': '#fdba74',
            'bg-orange-400': '#fb923c',
            'bg-orange-500': '#f97316',
            'bg-orange-600': '#ea580c',
            'bg-orange-700': '#c2410c'
        };
        
        // If it's already a hex color or other valid CSS color, return as is
        if (tailwindColor.startsWith('#') || tailwindColor.startsWith('rgb') || tailwindColor.startsWith('hsl')) {
            return tailwindColor;
        }
        
        return colorMap[tailwindColor] || tailwindColor || '#6b7280';
    }

    // Get the exact color used by the original node components
    private getPhaseColor(nodeType: string): string {
        switch (nodeType) {
            case 'problemDefinition':
                return '#FFD29F'; // Problem Definition Node color
            case 'solutionExploration':
                return '#FFC5FF'; // Bloom Node color
            case 'iterativeRefinement':
                return '#c9baff'; // Reconstruction Node color
            case 'finalAnswer':
                return '#94F1C3'; // Final Answer Node color
            default:
                return '#e5e7eb'; // Gray fallback
        }
    }

    private createEqualMainPhaseSections(): Node[] {
        const sectionWidth = PHASE_BAR_WIDTH / MAIN_PHASES.length;
        const currentX = PHASE_BAR_START_X;
        
        return MAIN_PHASES.map((mainPhase, index) => {
            const phaseSectionNode = this.createNodeWithZIndex({
                id: `phase-section-${mainPhase.nodeType}`,
                type: 'phaseBarSection',
                position: { 
                    x: currentX + (index * sectionWidth) + OFFSET_X, 
                    y: PHASE_BAR_Y_POSITION + OFFSET_Y 
                },
                data: {
                    phaseName: mainPhase.name,
                    nodeType: mainPhase.nodeType,
                    color: this.getPhaseColor(mainPhase.nodeType),
                    width: sectionWidth,
                    height: PHASE_BAR_HEIGHT,
                    isMainPhaseSection: true,
                    expanded: false,
                    stepCount: 1 // Placeholder for now
                } as PhaseSectionData,
                width: sectionWidth,
                height: PHASE_BAR_HEIGHT,
                sourcePosition: Position.Top,
                targetPosition: Position.Bottom,
                draggable: false,
                selectable: false
            }, 'phase');
            
            return phaseSectionNode;
        });
    }

    private createMainPhaseConnections(timelineNodes: Node[], phaseSectionNodes: Node[]): Edge[] {
        const connections: Edge[] = [];
        
        console.log(`[SequentialTimeline] Creating vertical connections for ${timelineNodes.length} timeline nodes and ${phaseSectionNodes.length} phase sections`);
        
        timelineNodes.forEach((timelineNode) => {
            const nodeCategory = timelineNode.data?.category as string;
            if (!nodeCategory) {
                console.log(`[SequentialTimeline] Node ${timelineNode.id} has no category, skipping connection`);
                return;
            }
            
            // Map the node's category to its main phase
            const mainPhaseType = this.getMainPhaseForCategory(nodeCategory);
            console.log(`[SequentialTimeline] Node ${timelineNode.id} category "${nodeCategory}" -> main phase "${mainPhaseType}"`);
            
            // Find the corresponding main phase section
            const targetPhaseSection = phaseSectionNodes.find(section => 
                section.data?.nodeType === mainPhaseType
            );
            
            if (!targetPhaseSection) {
                console.log(`[SequentialTimeline] No phase section found for main phase "${mainPhaseType}"`);
                return;
            }
            
            console.log(`[SequentialTimeline] Connecting node ${timelineNode.id} to phase section ${targetPhaseSection.id} with vertical edge`);
            
            // Create vertical connection edge using standardized function
            const connectionEdge = this.createStandardEdge(
                `connection-${timelineNode.id}-${targetPhaseSection.id}`,
                timelineNode.id,
                targetPhaseSection.id
            );
            
            connections.push(connectionEdge);
        });
        
        console.log(`[SequentialTimeline] Created ${connections.length} vertical connections`);
        return connections;
    }

    private getMainPhaseForCategory(category: string): string {
        // Map specific categories to main phases based on naming patterns
        const lowerCategory = category.toLowerCase();
        
        console.log(`[SequentialTimeline] Mapping category: "${category}"`);
        
        // Map the actual categories from your data
        if (lowerCategory.includes('problem definition & scoping') || 
            (lowerCategory.includes('problem') && lowerCategory.includes('scoping'))) {
            console.log(`[SequentialTimeline] Mapped "${category}" to problemDefinition`);
            return 'problemDefinition';
        } else if (lowerCategory.includes('initial solution & exploration') ||
                   (lowerCategory.includes('initial') && lowerCategory.includes('solution')) ||
                   (lowerCategory.includes('initial') && lowerCategory.includes('exploration'))) {
            console.log(`[SequentialTimeline] Mapped "${category}" to solutionExploration`);
            return 'solutionExploration';
        } else if (lowerCategory.includes('iterative refinement & verification') ||
                   (lowerCategory.includes('iterative') && lowerCategory.includes('refinement')) ||
                   (lowerCategory.includes('iterative') && lowerCategory.includes('verification'))) {
            console.log(`[SequentialTimeline] Mapped "${category}" to iterativeRefinement`);
            return 'iterativeRefinement';
        } else if (lowerCategory.includes('final answer') ||
                   (lowerCategory.includes('final') && lowerCategory.includes('answer'))) {
            console.log(`[SequentialTimeline] Mapped "${category}" to finalAnswer`);
            return 'finalAnswer';
        }
        
        // Fallback patterns for more flexible matching
        else if (lowerCategory.includes('problem') || lowerCategory.includes('definition')) {
            console.log(`[SequentialTimeline] Fallback mapped "${category}" to problemDefinition`);
            return 'problemDefinition';
        } else if (lowerCategory.includes('initial') || lowerCategory.includes('solution') || lowerCategory.includes('exploration')) {
            console.log(`[SequentialTimeline] Fallback mapped "${category}" to solutionExploration`);
            return 'solutionExploration';
        } else if (lowerCategory.includes('iterative') || lowerCategory.includes('refinement') || lowerCategory.includes('verification')) {
            console.log(`[SequentialTimeline] Fallback mapped "${category}" to iterativeRefinement`);
            return 'iterativeRefinement';
        } else if (lowerCategory.includes('final') || lowerCategory.includes('answer')) {
            console.log(`[SequentialTimeline] Fallback mapped "${category}" to finalAnswer`);
            return 'finalAnswer';
        }
        
        // Default mapping - assign to first main phase if no match
        console.log(`[SequentialTimeline] Unknown category "${category}", defaulting to problemDefinition`);
        return 'problemDefinition';
    }

    private getTimelineNodeType(category: string): string {
        // Map category to specific timeline node type
        const lowerCategory = category.toLowerCase();
        
        if (lowerCategory.includes('problem') || 
            lowerCategory.includes('definition') || 
            lowerCategory.includes('scoping')) {
            return 'timelineProblemDefinition';
        } else if (lowerCategory.includes('solution') || 
                   lowerCategory.includes('exploration') || 
                   lowerCategory.includes('initial')) {
            return 'timelineSolutionExploration';
        } else if (lowerCategory.includes('refinement') || 
                   lowerCategory.includes('verification') || 
                   lowerCategory.includes('iterative')) {
            return 'timelineIterativeRefinement';
        } else if (lowerCategory.includes('final') || 
                   lowerCategory.includes('answer')) {
            return 'timelineFinalAnswer';
        }
        
        // Default to generic timeline node
        return 'timeline';
    }

    private sortNodesByPhase(nodes: Node[], phaseDistribution: PhaseInfo[]): Node[] {
        // Create a phase order map
        const phaseOrder = new Map(phaseDistribution.map((phase, index) => [phase.name, index]));
        
        return [...nodes].sort((a, b) => {
            const aPhase = (a.data?.category as string) || '';
            const bPhase = (b.data?.category as string) || '';
            const aOrder = phaseOrder.get(aPhase) ?? 999;
            const bOrder = phaseOrder.get(bPhase) ?? 999;
            return aOrder - bOrder;
        });
    }

    // Method to expand a phase section into its subsections
    expandPhaseSection(sectionId: string, subPhases: PhaseInfo[], currentNodes: Node[], currentEdges: Edge[]): { nodes: Node[], edges: Edge[] } {
        console.log(`[SequentialTimeline] Expanding section ${sectionId} with ${subPhases.length} subsections`);
        console.log(`[SequentialTimeline] SubPhases data:`, subPhases);
        
        // Find the main phase section to expand
        const mainSectionIndex = currentNodes.findIndex(node => node.id === sectionId);
        if (mainSectionIndex === -1) {
            console.error(`[SequentialTimeline] Could not find section ${sectionId} to expand`);
            return { nodes: currentNodes, edges: currentEdges };
        }

        const mainSection = currentNodes[mainSectionIndex];
        const mainSectionData = mainSection.data as PhaseSectionData;
        
        console.log(`[SequentialTimeline] Main section data:`, mainSectionData);
        console.log(`[SequentialTimeline] Main section width: ${mainSectionData.width}px`);
        
        // Check if we already have stored rich subphases data from a previous expansion
        let actualSubphases: NestedSubphase[] = [];
        
        if (mainSectionData.originalSubPhases && mainSectionData.originalSubPhases.length > 0) {
            // We have stored rich subphases from a previous expansion
            actualSubphases = mainSectionData.originalSubPhases;
            console.log(`[SequentialTimeline] Using stored originalSubPhases with ${actualSubphases.length} subphases:`, actualSubphases);
        } else {
            // This is the first expansion - find the original node that corresponds to this main phase
            const mainPhaseType = mainSectionData.nodeType;
            const originalNode = currentNodes.find(node => {
                const nodeCategory = node.data?.category as string;
                if (!nodeCategory) return false;
                
                const mappedPhaseType = this.getMainPhaseForCategory(nodeCategory);
                return mappedPhaseType === mainPhaseType && node.data?.subphases;
            });
            
            if (originalNode && originalNode.data?.subphases) {
                actualSubphases = originalNode.data.subphases as NestedSubphase[];
                console.log(`[SequentialTimeline] Found original node with ${actualSubphases.length} subphases:`, actualSubphases);
            } else {
                console.log(`[SequentialTimeline] No original node found with subphases, using provided subPhases`);
                // Convert PhaseInfo to the expected subphase format
                actualSubphases = subPhases.map((phase, index) => ({
                    id: `subphase_${index}`,
                    subcategory: phase.name,
                    summary: phase.name,
                    step_indices: Array.from({ length: phase.steps }, (_, i) => i),
                    steps: Array.from({ length: phase.steps }, (_, i) => ({
                        index: i,
                        text: `Step ${i + 1} of ${phase.name}`
                    }))
                }));
            }
        }
        
        if (actualSubphases.length === 0) {
            console.warn(`[SequentialTimeline] No subsections to expand for ${sectionId}`);
            return { nodes: currentNodes, edges: currentEdges };
        }
        
        // Store original data for collapse functionality
        const originalPhase = {
            name: mainSectionData.phaseName,
            steps: mainSectionData.stepCount || 0,
            percentage: mainSectionData.percentage || 0,
            nodeType: mainSectionData.nodeType,
            color: mainSectionData.color,
            subPhases: mainSectionData.subPhases || [] // Ensure subPhases are included
        };
        
        // Mark the main section as expanded
        console.log(`[SequentialTimeline] Expanding section ${sectionId}:`);
        console.log(`  - mainSectionData.subPhases:`, mainSectionData.subPhases);
        console.log(`  - actualSubphases found:`, actualSubphases);
        console.log(`  - Will store actualSubphases as originalSubPhases:`, actualSubphases);
        
        const updatedMainSection = this.createNodeWithZIndex({
            ...mainSection,
            data: {
                ...mainSectionData,
                expanded: true,
                originalWidth: mainSectionData.width,
                originalHeight: mainSectionData.height,
                originalPhase: originalPhase,
                originalSubPhases: actualSubphases, // Store the rich actualSubphases data instead
                subPhases: mainSectionData.subPhases || [] // Keep the minimal subPhases for compatibility
            }
        }, 'phase');

        console.log('[SequentialTimeline] Updated main section data after expansion:', {
            id: updatedMainSection.id,
            expanded: updatedMainSection.data.expanded,
            originalSubPhases: updatedMainSection.data.originalSubPhases,
            subPhases: updatedMainSection.data.subPhases,
            originalPhase: updatedMainSection.data.originalPhase
        });

        // Remove the original main timeline node(s) and their connections (identify early to avoid interfering with layout)
        // Find all timeline nodes connected to this phase section
        const connectedTimelineNodeIds = currentEdges
            .filter(edge => edge.target === sectionId)
            .map(edge => edge.source);

        // Filter existing nodes to exclude the soon-to-be-removed main timeline node for this section
        const existingNodesExcludingMain = currentNodes.filter(node => !connectedTimelineNodeIds.includes(node.id));

        // Create subsection nodes using actual subphases
        const subsectionNodes = this.createSubsectionNodesFromSubphases(mainSection, actualSubphases);
        console.log(`[SequentialTimeline] Created ${subsectionNodes.length} subsection nodes`);
        
        // Create subsection timeline nodes using actual subphases, considering existing nodes except the main node we will remove
        const subsectionTimelineNodes = this.createSubsectionTimelineNodesFromSubphases(mainSection, actualSubphases, existingNodesExcludingMain);
        console.log(`[SequentialTimeline] Created ${subsectionTimelineNodes.length} subsection timeline nodes`);
        
        // Create connections between subsection timeline nodes and subsection bar nodes
        const subsectionEdges = this.createSubsectionConnections(subsectionTimelineNodes, subsectionNodes);
        console.log(`[SequentialTimeline] Created ${subsectionEdges.length} subsection connections`);
        
        console.log(`[SequentialTimeline] Removing main timeline nodes connected to ${sectionId}:`, connectedTimelineNodeIds);
        
        // Store the original timeline node data before removing it for proper restoration during collapse
        const originalTimelineNodes = currentNodes.filter(node => connectedTimelineNodeIds.includes(node.id));
        const originalTimelineNodeData = originalTimelineNodes.length > 0 ? originalTimelineNodes[0].data : null;
        
        console.log(`[SequentialTimeline] Storing original timeline node data for restoration:`, originalTimelineNodeData);
        
        // Update the main section with the original timeline node data for restoration
        const updatedMainSectionWithOriginalNode = this.createNodeWithZIndex({
            ...updatedMainSection,
            data: {
                ...updatedMainSection.data,
                originalTimelineNodeData: originalTimelineNodeData // Store original timeline node data
            }
        }, 'phase');
        
        const filteredNodes = currentNodes.filter(node => !connectedTimelineNodeIds.includes(node.id));
        const filteredEdges = currentEdges.filter(edge => 
            !connectedTimelineNodeIds.includes(edge.source) && !connectedTimelineNodeIds.includes(edge.target)
        ).map(edge => this.ensureEdgeZIndex(edge)); // Ensure existing edges have correct z-index
        
        // Update the nodes and edges - ensure proper z-index on all elements
        const updatedNodes = [
            ...filteredNodes.map(node => node.id === sectionId ? updatedMainSectionWithOriginalNode : node),
            ...subsectionNodes,
            ...subsectionTimelineNodes
        ];
        
        const updatedEdges = [
            ...subsectionEdges, // Add subsection edges first
            ...filteredEdges    // Then add remaining edges
        ];

        console.log(`[SequentialTimeline] Expansion complete:`);
        console.log(`  - ${subsectionNodes.length} subsection nodes created`);
        console.log(`  - ${subsectionTimelineNodes.length} timeline nodes created`);
        console.log(`  - ${subsectionEdges.length} connections created`);
        console.log(`  - Total nodes: ${updatedNodes.length}, Total edges: ${updatedEdges.length}`);
        console.log(`  - Z-index distribution:`, this.getZIndexDistribution(updatedNodes, updatedEdges));
        
        return { nodes: updatedNodes, edges: updatedEdges };
    }

    /**
     * Handle subsection clicks - public method to be called from UI components
     * Detects if a clicked node is a subsection and triggers collapse to main phase
     * Note: Subsection nodes are not selectable to avoid visual feedback, so this method
     * should be called from onClick handlers in the node components themselves
     */
    handleSubsectionClick(nodeId: string, currentNodes: Node[], currentEdges: Edge[]): { nodes: Node[], edges: Edge[] } | null {
        console.log(`[SequentialTimeline] Handling potential subsection click: ${nodeId}`);
        
        // Find the clicked node
        const clickedNode = currentNodes.find(node => node.id === nodeId);
        if (!clickedNode) {
            console.log(`[SequentialTimeline] Node ${nodeId} not found`);
            return null;
        }

        const nodeData = clickedNode.data as PhaseSectionData;
        
        // Check if this is a subsection (not a main phase section)
        if (nodeData.isMainPhaseSection !== false) {
            console.log(`[SequentialTimeline] Node ${nodeId} is not a subsection, ignoring`);
            return null;
        }

        // This is a subsection, trigger collapse immediately
        console.log(`[SequentialTimeline] Node ${nodeId} is a subsection, triggering immediate collapse`);
        return this.collapseFromSubsection(nodeId, currentNodes, currentEdges);
    }

    private createSubsectionNodes(mainSection: Node, subPhases: PhaseInfo[]): Node[] {
        const mainSectionData = mainSection.data as PhaseSectionData;
        const totalWidth = mainSectionData.width;
        const subsectionWidth = totalWidth / subPhases.length;
        
        console.log(`[SequentialTimeline] Creating ${subPhases.length} subsection nodes:`);
        console.log(`  - Total width: ${totalWidth}px`);
        console.log(`  - Subsection width: ${subsectionWidth}px each`);
        console.log(`  - Starting X: ${mainSection.position.x}`);
        
        let currentX = mainSection.position.x;
        
        return subPhases.map((subPhase, index) => {
            const subsectionNode = this.createNodeWithZIndex({
                id: `${mainSection.id}-sub-${index}`,
                type: 'phaseBarSection',
                position: {
                    x: currentX,
                    y: mainSection.position.y
                },
                data: {
                    phaseName: subPhase.name,
                    nodeType: mainSectionData.nodeType,
                    color: mainSectionData.color, // Use same color as main section
                    width: subsectionWidth,
                    height: mainSectionData.height,
                    isMainPhaseSection: false, // This is a subsection
                    expanded: false,
                    stepCount: subPhase.steps,
                    percentage: subPhase.percentage,
                    subPhases: [], // Subsections don't have further subsections for now
                    subPhaseIndex: index // Add index for identification
                } as PhaseSectionData,
                width: subsectionWidth,
                height: mainSectionData.height,
                sourcePosition: Position.Bottom,
                targetPosition: Position.Top, // Target handle on top for subsections
                draggable: false,
                selectable: false // Keep subsections non-selectable to avoid visual feedback
            }, 'phase');
            
            console.log(`  - Subsection ${index}: "${subPhase.name}" at x=${currentX}, steps=${subPhase.steps}, z-index=${subsectionNode.zIndex}`);
            
            currentX += subsectionWidth;
            return subsectionNode;
        });
    }

    private createSubsectionTimelineNodes(mainSection: Node, subPhases: PhaseInfo[]): Node[] {
        const mainSectionData = mainSection.data as PhaseSectionData;
        const totalWidth = mainSectionData.width;
        const subsectionWidth = totalWidth / subPhases.length;
        
        console.log(`[SequentialTimeline] Creating ${subPhases.length} subsection timeline nodes:`);
        console.log(`  - Each timeline node width: ${Math.min(DEFAULT_NODE_WIDTH, subsectionWidth - 10)}px`);
        
        let currentX = mainSection.position.x;
        
        return subPhases.map((subPhase, index) => {
            // Determine the correct timeline node type based on subphase name/category
            const timelineNodeType = this.getTimelineNodeType(subPhase.name) || this.getTimelineNodeType(mainSectionData.nodeType);
            
            const nodeWidth = Math.min(DEFAULT_NODE_WIDTH, subsectionWidth - 10);
            const centeredX = currentX + (subsectionWidth / 2) - (nodeWidth / 2);
            
            const timelineNode = this.createNodeWithZIndex({
                id: `timeline-${mainSection.id}-sub-${index}`,
                type: timelineNodeType,
                position: {
                    x: centeredX, // Center the node (phase section already has offset)
                    y: TIMELINE_Y_POSITION + OFFSET_Y
                },
                data: {
                    content: subPhase.name,
                    category: subPhase.name, // Use the actual subphase name as category
                    title: subPhase.name,
                    isTimelineNode: true,
                    isSubsection: true,
                    subPhaseIndex: index,
                    stepCount: subPhase.steps,
                    percentage: subPhase.percentage,
                    mainPhaseType: mainSectionData.nodeType, // Keep reference to main phase
                    isOpen: false, // Start closed; user must open manually
                },
                width: nodeWidth,
                height: DEFAULT_NODE_HEIGHT,
                sourcePosition: Position.Bottom,
                targetPosition: Position.Top,
                draggable: false,
                selectable: true
            }, 'timeline');
            
            console.log(`  - Timeline node ${index}: "${subPhase.name}" (${timelineNodeType}) at x=${centeredX}, z-index=${timelineNode.zIndex}`);
            
            currentX += subsectionWidth;
            return timelineNode;
        });
    }

    private createSubsectionNodesFromSubphases(mainSection: Node, subPhases: NestedSubphase[]): Node[] {
        const mainSectionData = mainSection.data as PhaseSectionData;
        const totalWidth = mainSectionData.width;
        const subsectionWidth = totalWidth / subPhases.length;
        
        console.log(`[SequentialTimeline] Creating ${subPhases.length} subsection nodes from subphases:`);
        console.log(`  - Total width: ${totalWidth}px`);
        console.log(`  - Subsection width: ${subsectionWidth}px each`);
        console.log(`  - Starting X: ${mainSection.position.x}`);
        
        let currentX = mainSection.position.x;
        
        return subPhases.map((subPhase, index) => {
            const subsectionNode = this.createNodeWithZIndex({
                id: `${mainSection.id}-sub-${index}`,
                type: 'phaseBarSection',
                position: {
                    x: currentX,
                    y: mainSection.position.y
                },
                data: {
                    phaseName: subPhase.subcategory,
                    nodeType: mainSectionData.nodeType,
                    color: mainSectionData.color, // Use same color as main section
                    width: subsectionWidth,
                    height: mainSectionData.height,
                    isMainPhaseSection: false, // This is a subsection
                    expanded: false,
                    stepCount: subPhase.step_indices.length,
                    percentage: (subPhase.step_indices.length / 56) * 100, // Assume 56 total steps for percentage calculation
                    subPhases: [], // Subsections don't have further subsections for now
                    subPhaseIndex: index // Add index for identification
                } as PhaseSectionData,
                width: subsectionWidth,
                height: mainSectionData.height,
                sourcePosition: Position.Bottom,
                targetPosition: Position.Top, // Target handle on top for subsections
                draggable: false,
                selectable: false // Keep subsections non-selectable to avoid visual feedback
            }, 'phase');
            
            console.log(`  - Subsection ${index}: "${subPhase.subcategory}" at x=${currentX}, steps=${subPhase.step_indices.length}, z-index=${subsectionNode.zIndex}`);
            
            currentX += subsectionWidth;
            return subsectionNode;
        });
    }

    private createSubsectionTimelineNodesFromSubphases(mainSection: Node, subPhases: NestedSubphase[], existingNodes?: Node[]): Node[] {
        const mainSectionData = mainSection.data as PhaseSectionData;
        const totalWidth = mainSectionData.width;
        const subsectionWidth = totalWidth / subPhases.length;
        
        console.log(`[SequentialTimeline] Creating ${subPhases.length} subsection timeline nodes from subphases with Smart Multi-Row Layout:`);
        console.log(`  - Using full node width: ${DEFAULT_NODE_WIDTH}px`);
        console.log(`  - Considering ${existingNodes?.length || 0} existing nodes for overlap detection`);
        
        // Collect the desired X positions for all subphase nodes
        let currentX = mainSection.position.x;
        const nodePositions: NodePositionInfo[] = subPhases.map((subPhase, index) => {
            const centeredX = currentX + (subsectionWidth / 2) - (DEFAULT_NODE_WIDTH / 2);
            const nodeType = this.getTimelineNodeType(mainSectionData.nodeType);
            
            const result = {
                node: {
                    id: `timeline-${mainSection.id}-sub-${index}`,
                    type: nodeType,
                    data: {
                        content: subPhase.summary,
                        category: subPhase.subcategory,
                        title: subPhase.subcategory,
                        isTimelineNode: true,
                        isSubsection: true,
                        subPhaseIndex: index,
                        stepCount: subPhase.step_indices.length,
                        percentage: (subPhase.step_indices.length / 56) * 100,
                        mainPhaseType: mainSectionData.nodeType,
                        // Include step data for expansion functionality
                        steps: subPhase.steps || [],
                        subphaseData: subPhase,
                        // For compatibility with existing detection logic
                        subPhases: [{
                            id: subPhase.id,
                            subcategory: subPhase.subcategory,
                            summary: subPhase.summary,
                            step_indices: subPhase.step_indices,
                            steps: subPhase.steps || []
                        }],
                        isOpen: false, // Start closed; user must open manually
                    },
                    width: DEFAULT_NODE_WIDTH,
                    height: DEFAULT_NODE_HEIGHT,
                    sourcePosition: Position.Bottom,
                    targetPosition: Position.Top,
                    draggable: false,
                    selectable: true,
                    position: { x: 0, y: 0 } // Will be set by Smart Multi-Row Layout
                } as Node,
                index,
                desiredX: centeredX,
                nodeType: nodeType,
                category: subPhase.subcategory,
                phaseSection: mainSection
            };
            
            currentX += subsectionWidth;
            return result;
        });
        
        // Apply Smart Multi-Row Layout to avoid overlaps with existing nodes
        const finalPositions = this.calculateSmartMultiRowLayoutWithExisting(nodePositions, existingNodes || []);
        
        // Create timeline nodes with calculated positions and proper z-index
        return finalPositions.map(({ node, finalX, finalY, row }) => {
            const timelineNode = this.createNodeWithZIndex({
                ...node,
                position: {
                    x: finalX,
                    y: finalY + OFFSET_Y
                }
            }, 'timeline');
            
            console.log(`  - Timeline node ${node.data.subPhaseIndex}: "${node.data.category}" at x=${finalX}, y=${finalY} (row ${row}), z-index=${timelineNode.zIndex}`);
            
            return timelineNode;
        });
    }

    private createSubsectionConnections(timelineNodes: Node[], subsectionNodes: Node[]): Edge[] {
        const connections: Edge[] = [];
        
        console.log(`[SequentialTimeline] Creating connections between ${timelineNodes.length} timeline nodes and ${subsectionNodes.length} subsection nodes`);
        
        timelineNodes.forEach((timelineNode, index) => {
            const subsectionNode = subsectionNodes[index];
            if (subsectionNode) {
                // Create edge using standardized function
                const edge = this.createStandardEdge(
                    `edge-${timelineNode.id}-to-${subsectionNode.id}`,
                    timelineNode.id,
                    subsectionNode.id
                );
                
                console.log(`  - Connection ${index}: ${timelineNode.id} -> ${subsectionNode.id} (z-index: ${edge.zIndex})`);
                connections.push(edge);
            }
        });
        
        console.log(`[SequentialTimeline] Created ${connections.length} subsection connections`);
        return connections;
    }

    /**
     * Toggle (or open) a subsection timeline node while ensuring only one is open per main phase.
     * Accordion rule: when opening a node inside a main phase, all sibling subsection timeline nodes
     * (same mainPhaseType) are closed. Clicking the already open node keeps it open (always at least one open).
     * @param nodeId The id of the subsection timeline node to open.
     * @param currentNodes All current nodes.
     * @param currentEdges All current edges (returned unchanged).
     */
    toggleSubphaseTimelineNodeOpen(nodeId: string, currentNodes: Node[], currentEdges: Edge[]): { nodes: Node[], edges: Edge[] } {
        const target = currentNodes.find(n => n.id === nodeId && n.data?.isTimelineNode && n.data?.isSubsection);
        if (!target) return { nodes: currentNodes, edges: currentEdges };
        const mainPhaseType = target.data.mainPhaseType;
        // If already open, keep as-is (enforces always one open) – alternatively could allow close if more than one open not desired.
        if (target.data.isOpen) {
            return { nodes: currentNodes, edges: currentEdges };
        }
        const updatedNodes = currentNodes.map(n => {
            if (n.data?.isTimelineNode && n.data?.isSubsection && n.data?.mainPhaseType === mainPhaseType) {
                if (n.id === nodeId) {
                    return {
                        ...n,
                        data: { ...n.data, isOpen: true }
                    } as Node;
                }
                return {
                    ...n,
                    data: { ...n.data, isOpen: false }
                } as Node;
            }
            return n;
        });
        return { nodes: updatedNodes, edges: currentEdges };
    }

    /**
     * Handle clicks on subsection nodes to collapse back to main phase
     * This method identifies which main phase a subsection belongs to and triggers collapse
     */
    collapseFromSubsection(subsectionId: string, currentNodes: Node[], currentEdges: Edge[]): { nodes: Node[], edges: Edge[] } {
        console.log(`[SequentialTimeline] Collapsing from subsection: ${subsectionId}`);
        
        // Find the subsection node
        const subsectionNode = currentNodes.find(node => node.id === subsectionId);
        if (!subsectionNode) {
            console.warn(`[SequentialTimeline] Subsection ${subsectionId} not found`);
            return { nodes: currentNodes, edges: currentEdges };
        }

        const subsectionData = subsectionNode.data as PhaseSectionData;
        
        // Check if this is actually a subsection
        if (subsectionData.isMainPhaseSection !== false) {
            console.warn(`[SequentialTimeline] Node ${subsectionId} is not a subsection`);
            return { nodes: currentNodes, edges: currentEdges };
        }

        // Extract the main section ID from the subsection ID
        // Subsection IDs follow pattern: "phase-section-{mainPhaseType}-sub-{index}"
        const mainSectionId = subsectionId.replace(/-sub-\d+$/, '');
        console.log(`[SequentialTimeline] Extracted main section ID: ${mainSectionId}`);
        
        // Use the existing collapse method
        return this.collapsePhaseSection(mainSectionId, currentNodes, currentEdges);
    }

    // Collapse a phase section back to its original state
    collapsePhaseSection(sectionId: string, currentNodes: Node[], currentEdges: Edge[]): { nodes: Node[], edges: Edge[] } {
        console.log(`[SequentialTimeline] Collapsing section: ${sectionId}`);
        
        // Find the main section that was expanded
        const mainSection = currentNodes.find(node => node.id === sectionId);
        if (!mainSection || !mainSection.data.expanded) {
            console.warn(`[SequentialTimeline] Section ${sectionId} not found or not expanded`);
            return { nodes: currentNodes, edges: currentEdges };
        }

        // Get the original phase information
        const mainSectionData = mainSection.data as PhaseSectionData;

        // Debug log to see what data we have
        console.log('[SequentialTimeline] Main section data before collapse:', {
            id: mainSection.id,
            expanded: mainSectionData.expanded,
            originalSubPhases: mainSectionData.originalSubPhases,
            subPhases: mainSectionData.subPhases,
            originalPhase: mainSectionData.originalPhase
        });

        // Ensure we have the subPhases data to restore
        const originalSubPhases = mainSectionData.originalSubPhases || [];
        
        // Convert NestedSubphase[] back to PhaseInfo[] format for the UI
        const subPhasesToRestore: PhaseInfo[] = originalSubPhases.map(subphase => ({
            name: subphase.subcategory || subphase.summary,
            steps: subphase.step_indices?.length || 0,
            percentage: 0, // We don't have percentage data in NestedSubphase
            color: mainSectionData.color // Use the main phase color
        }));

        console.log('[SequentialTimeline] SubPhases to restore:', subPhasesToRestore);
        console.log('[SequentialTimeline] Converted from originalSubPhases:', originalSubPhases);

        // Get the original phase data for timeline node restoration
        const originalPhase = mainSectionData.originalPhase || {
            name: mainSectionData.phaseName,
            steps: mainSectionData.stepCount || 0,
            percentage: mainSectionData.percentage || 0,
            nodeType: mainSectionData.nodeType,
            color: mainSectionData.color
        };

        // Restore the original main section (unexpanded)
        console.log(`[SequentialTimeline] Restoring section ${sectionId}:`);
        console.log(`  - originalSubPhases:`, mainSectionData.originalSubPhases);
        console.log(`  - mainSectionData.subPhases:`, mainSectionData.subPhases);
        console.log(`  - Will restore subPhases:`, subPhasesToRestore);
        
        const restoredMainSection = this.createNodeWithZIndex({
            ...mainSection,
            data: {
                phaseName: mainSectionData.phaseName,
                nodeType: mainSectionData.nodeType,
                color: mainSectionData.color,
                width: mainSectionData.originalWidth || mainSectionData.width,
                height: mainSectionData.originalHeight || mainSectionData.height,
                isMainPhaseSection: true,
                expanded: false,
                stepCount: mainSectionData.stepCount,
                percentage: mainSectionData.percentage,
                subPhases: subPhasesToRestore, // Use converted PhaseInfo[] for UI
                originalSubPhases: originalSubPhases, // Keep the rich NestedSubphase[] for future expansions
                // Don't carry over other original* fields to avoid confusion
            } as PhaseSectionData,
            width: mainSectionData.originalWidth || mainSectionData.width,
            height: mainSectionData.originalHeight || mainSectionData.height
        }, 'phase');

        console.log('[SequentialTimeline] Restored main section data:', {
            id: restoredMainSection.id,
            expanded: restoredMainSection.data.expanded,
            subPhases: restoredMainSection.data.subPhases,
            canExpand: restoredMainSection.data.isMainPhaseSection && 
                       !restoredMainSection.data.expanded && 
                       Array.isArray(restoredMainSection.data.subPhases) && 
                       restoredMainSection.data.subPhases.length > 0
        });

        // Remove all subsection nodes and their connections first (to compute layout against remaining nodes)
        const subsectionPrefix = `${sectionId}-sub-`;
        const timelineSubsectionPrefix = `timeline-${sectionId}-sub-`;
        const filteredNodes = currentNodes.filter(node => 
            !node.id.startsWith(subsectionPrefix) && 
            !node.id.startsWith(timelineSubsectionPrefix)
        );
        const filteredEdges = currentEdges.filter(edge => 
            !edge.source.startsWith(timelineSubsectionPrefix) && 
            !edge.target.startsWith(subsectionPrefix) &&
            !edge.source.startsWith(subsectionPrefix) &&
            !edge.target.startsWith(timelineSubsectionPrefix)
        ).map(edge => this.ensureEdgeZIndex(edge)); // Ensure remaining edges have correct z-index

        // Compute desired X centered above the main section
        const effectiveWidth = mainSectionData.originalWidth || mainSectionData.width;
        const centeredX = mainSection.position.x + (effectiveWidth / 2) - (DEFAULT_NODE_WIDTH / 2);

        // Build position info for the single restored node and place it with Smart Multi-Row Layout considering existing nodes
        const nodeType = this.getTimelineNodeType(mainSectionData.nodeType);
        const desiredNode: Node = {
            id: `timeline-${sectionId.replace('phase-section-', '')}`,
            type: nodeType,
            data: { isTimelineNode: true, isSubsection: false } as Record<string, unknown>,
            width: DEFAULT_NODE_WIDTH,
            height: DEFAULT_NODE_HEIGHT,
            sourcePosition: Position.Bottom,
            targetPosition: Position.Top,
            draggable: false,
            selectable: true,
            position: { x: 0, y: 0 }
        } as Node;

        const [{ finalX, finalY }] = this.calculateSmartMultiRowLayoutWithExisting([
            { node: desiredNode, index: 0, desiredX: centeredX, nodeType, category: mainSectionData.nodeType, phaseSection: mainSection }
        ], filteredNodes);

        // Use stored original timeline node data if available, otherwise fallback to phase data
        const originalTimelineNodeData = mainSectionData.originalTimelineNodeData;
        const nodeContent = (originalTimelineNodeData as Record<string, unknown>)?.content as string || 
                           (originalTimelineNodeData as Record<string, unknown>)?.title as string || 
                           originalPhase.name;
        const nodeTitle = (originalTimelineNodeData as Record<string, unknown>)?.title as string || originalPhase.name;
        const nodeCategory = (originalTimelineNodeData as Record<string, unknown>)?.category as string || mainSectionData.nodeType;

        console.log(`[SequentialTimeline] Restoring timeline node with content: "${nodeContent}", title: "${nodeTitle}", category: "${nodeCategory}"`);

        const mainTimelineNode = this.createNodeWithZIndex({
            ...desiredNode,
            position: { x: finalX, y: finalY + OFFSET_Y },
            data: {
                ...(originalTimelineNodeData || {}), // Restore all original data if available
                content: nodeContent,
                category: nodeCategory,
                title: nodeTitle,
                isTimelineNode: true,
                isSubsection: false
            }
        }, 'timeline');

        // Create the vertical connection edge using standardized function
        const connectionEdge = this.createStandardEdge(
            `edge-${mainTimelineNode.id}-to-${sectionId}`,
            mainTimelineNode.id,
            sectionId
        );

        // Update the nodes and edges with proper z-index
        const updatedNodes = [
            ...filteredNodes.map(node => node.id === sectionId ? restoredMainSection : node),
            mainTimelineNode
        ];
        
        const updatedEdges = [
            connectionEdge,    // Add connection edge first
            ...filteredEdges   // Then add remaining edges
        ];

        console.log(`[SequentialTimeline] Collapse complete: restored main timeline node with z-index ${mainTimelineNode.zIndex}`);
        console.log(`[SequentialTimeline] Z-index distribution:`, this.getZIndexDistribution(updatedNodes, updatedEdges));
        
        return { nodes: updatedNodes, edges: updatedEdges };
    }

    /**
     * Smart Multi-Row Layout Algorithm
     * Distributes nodes across multiple rows to prevent overlapping while maintaining visual coherence.
     * - Nodes are sorted by their desired X position (left to right)
     * - For each node, find the lowest available row where it won't overlap
     * - Rows are centered around the timeline, with appropriate vertical spacing
     */
    private calculateSmartMultiRowLayout(nodePositions: NodePositionInfo[]): FinalNodePosition[] {
        // Configuration constants
    const ROW_HEIGHT = 140; // Vertical spacing between rows
    const NODE_HORIZONTAL_PADDING = 20; // Minimum horizontal space between nodes
    const FIRST_ROW_OFFSET = 80; // Distance above timeline for first row
        
        console.log(`[SmartMultiRowLayout] Processing ${nodePositions.length} nodes`);
        
        // Sort nodes by desired X position (left to right)
        const sortedNodes = nodePositions.sort((a, b) => a.desiredX - b.desiredX);
        
        // Track occupied space in each row: Array of {startX, endX} ranges per row
        const rowOccupancy: Array<Array<{startX: number, endX: number}>> = [];
        const finalPositions: FinalNodePosition[] = [];
        
        sortedNodes.forEach((nodeInfo, index) => {
            const nodeWidth = DEFAULT_NODE_WIDTH;
            const nodeStartX = nodeInfo.desiredX;
            const nodeEndX = nodeStartX + nodeWidth;
            
            console.log(`[SmartMultiRowLayout] Processing node ${index}: "${nodeInfo.node.id}" at desired X=${nodeStartX}`);
            
            // Find the lowest row where this node can fit without overlapping
            let targetRow = 0;
            let canFitInRow = false;
            
            while (!canFitInRow) {
                // Ensure the row exists
                if (!rowOccupancy[targetRow]) {
                    rowOccupancy[targetRow] = [];
                }
                
                // Check if node can fit in this row
                canFitInRow = this.canFitNodeInRow(
                    nodeStartX, 
                    nodeEndX, 
                    rowOccupancy[targetRow], 
                    NODE_HORIZONTAL_PADDING
                );
                
                if (!canFitInRow) {
                    targetRow++;
                    console.log(`[SmartMultiRowLayout]   Row ${targetRow - 1} is full, trying row ${targetRow}`);
                }
            }
            
            // Add node to the target row
            rowOccupancy[targetRow].push({
                startX: nodeStartX - NODE_HORIZONTAL_PADDING / 2,
                endX: nodeEndX + NODE_HORIZONTAL_PADDING / 2
            });
            
            // Calculate final Y position for this row
            const finalY = TIMELINE_Y_POSITION - FIRST_ROW_OFFSET - (targetRow * ROW_HEIGHT);
            
            finalPositions.push({
                node: nodeInfo.node,
                finalX: nodeStartX,
                finalY: finalY,
                row: targetRow,
                nodeType: nodeInfo.nodeType,
                category: nodeInfo.category
            });
            
            console.log(`[SmartMultiRowLayout]   Placed in row ${targetRow} at Y=${finalY}`);
        });
        
        // Log row usage summary
        console.log(`[SmartMultiRowLayout] Layout complete - used ${rowOccupancy.length} rows:`);
        rowOccupancy.forEach((occupancy, rowIndex) => {
            console.log(`  Row ${rowIndex}: ${occupancy.length} nodes`);
        });
        
        return finalPositions;
    }
    
    /**
     * Check if a node can fit in a row without overlapping existing nodes
     */
    private canFitNodeInRow(
        nodeStartX: number, 
        nodeEndX: number, 
        rowOccupancy: Array<{startX: number, endX: number}>, 
        padding: number
    ): boolean {
        // If row is empty, node can definitely fit
        if (rowOccupancy.length === 0) {
            return true;
        }
        
        // Check overlap with each occupied region in the row
        for (const occupied of rowOccupancy) {
            // Check if there's any overlap (accounting for padding)
            const nodeEffectiveStart = nodeStartX - padding / 2;
            const nodeEffectiveEnd = nodeEndX + padding / 2;
            
            if (!(nodeEffectiveEnd <= occupied.startX || nodeEffectiveStart >= occupied.endX)) {
                // There's an overlap, can't fit in this row
                return false;
            }
        }
        
        return true;
    }

    /**
     * Smart Multi-Row Layout Algorithm that considers existing nodes
     * Distributes nodes across multiple rows to prevent overlapping with both new nodes and existing timeline nodes.
     * - Existing nodes are pre-loaded into the row occupancy grid
     * - New nodes are then placed using the same algorithm as the basic version
     */
    private calculateSmartMultiRowLayoutWithExisting(nodePositions: NodePositionInfo[], existingNodes: Node[]): FinalNodePosition[] {
        // Configuration constants
        const ROW_HEIGHT = 140; // Vertical spacing between rows
        const NODE_HORIZONTAL_PADDING = 20; // Minimum horizontal space between nodes
        const FIRST_ROW_OFFSET = 80; // Distance above timeline for first row
        
        console.log(`[SmartMultiRowLayout] Processing ${nodePositions.length} new nodes with ${existingNodes.length} existing nodes`);
        
        // Sort new nodes by desired X position (left to right)
        const sortedNodes = nodePositions.sort((a, b) => a.desiredX - b.desiredX);
        
        // Pre-populate row occupancy with existing timeline nodes
        const rowOccupancy: Array<Array<{startX: number, endX: number}>> = [];
        
        // Map existing nodes to their rows and add to occupancy
    existingNodes.forEach(existingNode => {
            if (existingNode.data?.isTimelineNode) {
                // Calculate which row this existing node is in based on its Y position
        const nodeY = existingNode.position.y;
        // Existing timeline nodes are rendered with OFFSET_Y applied; align baseline accordingly
        const expectedFirstRowY = TIMELINE_Y_POSITION - FIRST_ROW_OFFSET + OFFSET_Y;
        const rowIndex = Math.round((expectedFirstRowY - nodeY) / ROW_HEIGHT);
                
                if (rowIndex >= 0) {
                    // Ensure the row exists
                    if (!rowOccupancy[rowIndex]) {
                        rowOccupancy[rowIndex] = [];
                    }
                    
                    // Add existing node's occupied space
                    const nodeWidth = existingNode.width || DEFAULT_NODE_WIDTH;
                    rowOccupancy[rowIndex].push({
                        startX: existingNode.position.x - NODE_HORIZONTAL_PADDING / 2,
                        endX: existingNode.position.x + nodeWidth + NODE_HORIZONTAL_PADDING / 2
                    });
                    
                    console.log(`[SmartMultiRowLayout] Existing node "${existingNode.id}" occupies row ${rowIndex} from x=${existingNode.position.x} to x=${existingNode.position.x + nodeWidth}`);
                }
            }
        });
        
        const finalPositions: FinalNodePosition[] = [];
        
        sortedNodes.forEach((nodeInfo, index) => {
            const nodeWidth = DEFAULT_NODE_WIDTH;
            const nodeStartX = nodeInfo.desiredX;
            const nodeEndX = nodeStartX + nodeWidth;
            
            console.log(`[SmartMultiRowLayout] Processing new node ${index}: "${nodeInfo.node.id}" at desired X=${nodeStartX}`);
            
            // Find the lowest row where this node can fit without overlapping
            let targetRow = 0;
            let canFitInRow = false;
            
            while (!canFitInRow) {
                // Ensure the row exists
                if (!rowOccupancy[targetRow]) {
                    rowOccupancy[targetRow] = [];
                }
                
                // Check if node can fit in this row
                canFitInRow = this.canFitNodeInRow(
                    nodeStartX, 
                    nodeEndX, 
                    rowOccupancy[targetRow], 
                    NODE_HORIZONTAL_PADDING
                );
                
                if (!canFitInRow) {
                    targetRow++;
                    console.log(`[SmartMultiRowLayout]   Row ${targetRow - 1} is full, trying row ${targetRow}`);
                }
            }
            
            // Add node to the target row
            rowOccupancy[targetRow].push({
                startX: nodeStartX - NODE_HORIZONTAL_PADDING / 2,
                endX: nodeEndX + NODE_HORIZONTAL_PADDING / 2
            });
            
            // Calculate final Y position for this row
            const finalY = TIMELINE_Y_POSITION - FIRST_ROW_OFFSET - (targetRow * ROW_HEIGHT);
            
            finalPositions.push({
                node: nodeInfo.node,
                finalX: nodeStartX,
                finalY: finalY,
                row: targetRow,
                nodeType: nodeInfo.nodeType,
                category: nodeInfo.category
            });
            
            console.log(`[SmartMultiRowLayout]   Placed new node in row ${targetRow} at Y=${finalY}`);
        });
        
        // Log row usage summary
        console.log(`[SmartMultiRowLayout] Layout complete - used ${rowOccupancy.length} rows total:`);
        rowOccupancy.forEach((occupancy, rowIndex) => {
            console.log(`  Row ${rowIndex}: ${occupancy.length} total nodes`);
        });
        
        return finalPositions;
    }
}

// Main layout calculation function
export function calculateSequentialTimelineLayout(
    nodesToLayout: Node[], 
    edgesToLayout: Edge[],
    phaseDistribution?: PhaseInfo[]
): { nodes: Node[], edges: Edge[] } {
    const strategy = new SequentialTimelineLayoutStrategy();
    return strategy.applyLayout(nodesToLayout, edgesToLayout, phaseDistribution);
}

// Main apply layout function
export function applySequentialTimelineLayout(
    nodesWritable: Writable<Node[]>,
    edgesWritable: Writable<Edge[]>,
    phaseDistribution?: PhaseInfo[],
    initialNodesFromLoad?: Node[],
    initialEdgesFromLoad?: Edge[],
    fitView?: () => void
) {
    console.log('[SequentialTimelineLayout] Applying sequential timeline layout with enhanced z-index management');
    
    // Determine if this call is for a new diagram load or a re-layout of existing data
    const isNewDiagramLoad = initialNodesFromLoad !== undefined && initialEdgesFromLoad !== undefined;

    let nodesForCalc: Node[];
    let edgesForCalc: Edge[];

    if (isNewDiagramLoad) {
        console.log("[SequentialTimelineLayout] Processing NEW diagram data.");
        nodesForCalc = initialNodesFromLoad!.map(n => ({ ...n }));
        edgesForCalc = initialEdgesFromLoad!.map(e => ({ ...e }));
    } else {
        console.log("[SequentialTimelineLayout] Re-layouting existing data from stores.");
        nodesForCalc = get(nodesWritable).map(n => ({ ...n }));
        edgesForCalc = get(edgesWritable).map(e => ({ ...e }));
    }

    if (nodesForCalc.length === 0 && edgesForCalc.length === 0 && !isNewDiagramLoad) {
        console.log("[SequentialTimelineLayout] No nodes or edges to re-layout from store. Skipping calculation.");
        if (fitView) {
            requestAnimationFrame(() => fitView && fitView());
        }
        return;
    }
    
    // Perform the layout calculation
    const { nodes: finalLayoutedNodes, edges: finalLayoutedEdges } = calculateSequentialTimelineLayout(
        nodesForCalc, 
        edgesForCalc, 
        phaseDistribution
    );

    console.log(`[SequentialTimelineLayout] Nodes to be set in store (count: ${finalLayoutedNodes.length})`);
    console.log(`[SequentialTimelineLayout] Edges to be set in store (count: ${finalLayoutedEdges.length})`);
    console.log(`[SequentialTimelineLayout] Final z-index distribution:`, finalLayoutedNodes.length > 0 ? getZIndexDistribution(finalLayoutedNodes, finalLayoutedEdges) : 'No nodes/edges');

    // COMPLETE REDRAW: Clear stores first to ensure fresh rendering
    console.log("[SequentialTimelineLayout] Performing complete redraw - clearing stores first");
    nodesWritable.set([]);
    edgesWritable.set([]);
    
    // Use requestAnimationFrame to ensure the clear takes effect before setting new data
    requestAnimationFrame(() => {
        // Set edges first to ensure they render behind nodes
        edgesWritable.set(finalLayoutedEdges);
        // Small delay to ensure edges are rendered before nodes for proper layering
        requestAnimationFrame(() => {
            nodesWritable.set(finalLayoutedNodes);
            console.log("[SequentialTimelineLayout] Complete redraw finished with proper z-index layering (edges first, then nodes)");
            
            if (fitView) {
                // For new diagram loads, add extra delay to allow components to mount and initialize handles
                const delay = isNewDiagramLoad ? 150 : 50;
                setTimeout(() => {
                    try {
                        if (fitView) fitView();
                        console.log("[SequentialTimelineLayout] fitView executed.");
                    } catch (e) {
                        console.warn("[SequentialTimelineLayout] Error during fitView:", e);
                    }
                }, delay);
            }
        });
    });
}

// Helper function for debugging z-index distribution
function getZIndexDistribution(nodes: Node[], edges: Edge[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    nodes.forEach(node => {
        const zIndex = node.zIndex || 0;
        distribution[`nodes_z${zIndex}`] = (distribution[`nodes_z${zIndex}`] || 0) + 1;
    });
    
    edges.forEach(edge => {
        const zIndex = edge.zIndex || 0;
        distribution[`edges_z${zIndex}`] = (distribution[`edges_z${zIndex}`] || 0) + 1;
    });
    
    return distribution;
}

export const SEQUENTIAL_TIMELINE_LAYOUT_CONFIG = {
    DEFAULT_NODE_WIDTH,
    DEFAULT_NODE_HEIGHT,
    TIMELINE_SPACING,
    TIMELINE_Y_POSITION,
    PHASE_BAR_Y_POSITION,
    PHASE_BAR_HEIGHT,
    PHASE_BAR_WIDTH,
    PHASE_BAR_START_X,
    Z_INDEX // Export z-index constants for external use
};