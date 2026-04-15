import type { Node, Edge } from '@xyflow/svelte';
import { type Writable } from 'svelte/store';
import { get } from 'svelte/store';

// Layout constants for space-filling curve
const DEFAULT_NODE_WIDTH = 440;
const DEFAULT_NODE_HEIGHT = 120;
const CURVE_SPACING = 100; // Base spacing between nodes along the curve

// Space-filling curve layout strategy
export class SpaceFillingCurveLayoutStrategy {
    applyLayout(nodes: Node[], edges: Edge[]): { nodes: Node[], edges: Edge[] } {
        console.log('[SpaceFillingCurveLayout] Applying space-filling curve layout');
        
        if (nodes.length === 0) {
            return { nodes, edges };
        }

        // Convert node types to space-filling variants and apply grid layout
        const convertedNodes = this.convertToSpaceFillingNodes(nodes);
        const positionedNodes = this.createSpaceFillingGrid(convertedNodes);
        
        // Keep edges unchanged for now
        const updatedEdges = edges.map(edge => ({ ...edge }));
        
        return { nodes: positionedNodes, edges: updatedEdges };
    }

    private convertToSpaceFillingNodes(nodes: Node[]): Node[] {
        return nodes.map(node => {
            let newType = node.type;
            
            // Convert standard node types to space-filling variants
            switch (node.type) {
                case 'problemDefinition':
                    newType = 'spaceFillingProblemDefinition';
                    break;
                case 'bloom':
                    newType = 'spaceFillingSolutionExploration';
                    break;
                case 'reconstruction':
                    newType = 'spaceFillingIterativeRefinement';
                    break;
                case 'finalAnswer':
                    newType = 'spaceFillingFinalAnswer';
                    break;
                default:
                    // Keep other node types unchanged
                    break;
            }
            
            return {
                ...node,
                type: newType,
                data: {
                    ...node.data,
                    // Preserve existing content, fall back to other fields if needed
                    content: node.data.content || node.data.label || node.data.summary || 'No content available',
                    category: this.getCategoryFromType(newType || 'unknown')
                }
            };
        });
    }

    private getCategoryFromType(nodeType: string): string {
        switch (nodeType) {
            case 'spaceFillingProblemDefinition':
                return 'Problem Definition & Scoping';
            case 'spaceFillingSolutionExploration':
                return 'Initial Solution & Exploration';
            case 'spaceFillingIterativeRefinement':
                return 'Iterative Refinement & Verification';
            case 'spaceFillingFinalAnswer':
                return 'Final Answer';
            default:
                return 'Unknown';
        }
    }

    private createSpaceFillingGrid(nodes: Node[]): Node[] {
        type Step = { index?: number; text?: string };
        type Subphase = { id?: string; subcategory?: string; steps?: Step[]; step_indices?: number[] };
        console.log('[SpaceFillingGrid] Input nodes:', nodes.map(n => ({ id: n.id, type: n.type, sunflowOpen: n.data?.sunflowOpen })));
        
        // Space-filling curve grid layout constants
    const GRID_PADDING = 16;
    const COLLAPSED_NODE_WIDTH = 792; // (1600 - 32) / 2 = 784px per node
    const EXPANDED_NODE_WIDTH = 1600; // Full width when expanded
    const MIN_NODE_HEIGHT = 120;
    const EXPANDED_NODE_HEIGHT = 240; // Height for open/expanded nodes
        
        // Simple offset for positioning
        const OFFSET_X = 80;
        const OFFSET_Y = 80;
        
        // Check which nodes are expanded to determine the layout strategy
        const expandedNodeIndices = nodes.map((node, index) => 
            node.data?.sunflowOpen === true ? index : -1
        ).filter(index => index !== -1);
        
        console.log('[SpaceFillingGrid] Expanded node indices:', expandedNodeIndices);
        
        const isProblemDefinitionExpanded = expandedNodeIndices.includes(0);
        const isSolutionExplorationExpanded = expandedNodeIndices.includes(1);
        const isIterativeRefinementExpanded = expandedNodeIndices.includes(2);
        const isFinalAnswerExpanded = expandedNodeIndices.includes(3);
        const isOnlySolutionExplorationExpanded =
            isSolutionExplorationExpanded &&
            !isProblemDefinitionExpanded &&
            !isIterativeRefinementExpanded &&
            !isFinalAnswerExpanded;
        
        console.log('[SpaceFillingGrid] Layout state - ProblemDef expanded:', isProblemDefinitionExpanded, 'SolutionExp expanded:', isSolutionExplorationExpanded, 'IterativeRef expanded:', isIterativeRefinementExpanded, 'FinalAnswer expanded:', isFinalAnswerExpanded);
        
        // First pass: calculate heights for all nodes using row-based grid math
        const nodeHeights = nodes.map((node) => {
            const isExpanded = node.data?.sunflowOpen === true;

            if (!isExpanded) return MIN_NODE_HEIGHT;

            if (node.data?.subphases && Array.isArray(node.data.subphases)) {
                const subphases = (node.data as { subphases: Subphase[] }).subphases;
                const subnodesCount = subphases.length;

                // Normalize expandedSubphases to Set (stored either as Set or string[])
                const expProp = (node.data as { expandedSubphases?: Set<string> | string[] }).expandedSubphases;
                const expandedSubphases: Set<string> =
                    expProp instanceof Set ? expProp : new Set<string>(Array.isArray(expProp) ? expProp : []);
                const subphaseKey = (sp: Subphase, index: number) => (sp?.id ?? sp?.subcategory ?? String(index)) + '';

                // Layout constants aligned with SpaceFillingNode.svelte structure
                const GRID_COLUMNS = 4;          // grid-template-columns: repeat(4, 1fr)
                const ROW_GAP = 16;              // gap-4
                const HEADER_HEIGHT = 96;        // Title + summary area when open
                const FOOTER_HEIGHT = 36;        // Footer area with meta info
                const CONTAINER_V_PADDING = 16;  // py-2 total
                const GRID_TOP_MARGIN = 8;       // small spacing above the grid

                // Collapsed subphase card estimated height
                const COLLAPSED_CARD_HEIGHT = 112;

                // Expanded subphase: fixed header + steps grid rows
                const EXPANDED_FIXED_BEFORE_STEPS = 120; // subphase header/summary/labels
                const STEP_ROW_HEIGHT = 82;              // each row of steps (cards) est height

                // Count expanded subphases present in data
                let expandedCount = 0;
                let expandedHeightsTotal = 0;
                for (const [i, sp] of subphases.entries()) {
                    const key = subphaseKey(sp, i);
                    if (expandedSubphases.has(key)) {
                        expandedCount++;
                        const stepsCount = Array.isArray(sp.steps) ? sp.steps.length : 0;
                        const stepsRows = Math.max(1, Math.ceil(stepsCount / GRID_COLUMNS));
                        const stepsGridHeight = stepsRows * STEP_ROW_HEIGHT + (stepsRows > 1 ? (stepsRows - 1) * ROW_GAP : 0);
                        expandedHeightsTotal += EXPANDED_FIXED_BEFORE_STEPS + stepsGridHeight;
                    }
                }

                // Remaining collapsed subphases distribute across GRID_COLUMNS
                const collapsedCount = Math.max(0, subnodesCount - expandedCount);
                const collapsedRows = collapsedCount > 0 ? Math.ceil(collapsedCount / GRID_COLUMNS) : 0;
                const collapsedRowsHeight = collapsedRows * COLLAPSED_CARD_HEIGHT;

                // Total rows in the grid = collapsed rows + number of expanded subphases (each occupies a full row)
                const totalRows = collapsedRows + expandedCount;
                const gridGaps = totalRows > 1 ? (totalRows - 1) * ROW_GAP : 0;

                // Compose the final node height
                const calculatedHeight =
                    HEADER_HEIGHT + GRID_TOP_MARGIN + collapsedRowsHeight + expandedHeightsTotal + gridGaps + FOOTER_HEIGHT + CONTAINER_V_PADDING;

                const safeHeight = Math.max(EXPANDED_NODE_HEIGHT, Math.ceil(calculatedHeight));
                console.log(`[SpaceFillingGrid] Node ${node.id} rows=${totalRows} (collapsedRows=${collapsedRows}, expanded=${expandedCount}) -> height=${safeHeight}`);
                return safeHeight;
            }

            return EXPANDED_NODE_HEIGHT;
        });
        
    const positionedNodes = nodes.map((node, index) => {
            const isExpanded = node.data?.sunflowOpen === true;
            const nodeHeight = nodeHeights[index];
            
            // Determine node width based on layout rules
            let nodeWidth = COLLAPSED_NODE_WIDTH; // Default to half width
            
            if (isExpanded) {
                // Expanded nodes typically take full width
                nodeWidth = EXPANDED_NODE_WIDTH;
            } else {
                // Check if this collapsed node should take full width due to layout rules
                if (isOnlySolutionExplorationExpanded) {
                    // Special rule: only Solution Exploration is expanded
                    // - Problem Definition takes full width on the first row
                    // - Iterative Refinement and Final Answer share a single row (two columns)
                    if (index === 0) nodeWidth = EXPANDED_NODE_WIDTH;
                    if (index === 2 || index === 3) nodeWidth = COLLAPSED_NODE_WIDTH;
                } else if (isProblemDefinitionExpanded && !isSolutionExplorationExpanded) {
                    // When Problem Definition is expanded, Solution Exploration takes full width
                    if (index === 1) nodeWidth = EXPANDED_NODE_WIDTH;
                    // Special rule: If Final Answer is expanded in this scenario, make both Iterative (2) and Final (3) full width
                    if (isFinalAnswerExpanded && (index === 2 || index === 3)) nodeWidth = EXPANDED_NODE_WIDTH;
                    // If Iterative Refinement is also expanded and this is Final Answer, it takes full width
                    if (isIterativeRefinementExpanded && index === 3) nodeWidth = EXPANDED_NODE_WIDTH;
                } else if (isSolutionExplorationExpanded && !isProblemDefinitionExpanded) {
                    // When Solution Exploration is expanded, Problem Definition takes full width
                    if (index === 0) nodeWidth = EXPANDED_NODE_WIDTH;
                    // Iterative Refinement takes full width (gets its own row)
                    if (index === 2) nodeWidth = EXPANDED_NODE_WIDTH;
                    // Final Answer always takes full width (gets its own row regardless of Iterative Refinement state)
                    if (index === 3) nodeWidth = EXPANDED_NODE_WIDTH;
                } else if (isProblemDefinitionExpanded && isSolutionExplorationExpanded) {
                    // When 0 & 1 are expanded: width depends on whether either 2 or 3 is expanded
                    if (isIterativeRefinementExpanded || isFinalAnswerExpanded) {
                        // 2 and 3 will be on separate rows -> full width
                        if (index === 2 || index === 3) nodeWidth = EXPANDED_NODE_WIDTH;
                    } else {
                        // 2 and 3 share one two-column row -> half width
                        if (index === 2 || index === 3) nodeWidth = COLLAPSED_NODE_WIDTH;
                    }
                } else if (isIterativeRefinementExpanded && !isFinalAnswerExpanded) {
                    // When Iterative Refinement is expanded, Final Answer takes full width
                    if (index === 3) nodeWidth = EXPANDED_NODE_WIDTH;
                } else if (isFinalAnswerExpanded && !isIterativeRefinementExpanded) {
                    // When Final Answer is expanded, Iterative Refinement takes full width
                    if (index === 2) nodeWidth = EXPANDED_NODE_WIDTH;
                }
            }
            // Ensure width rule sticks even if nodes 2/3 are expanded
            if (isProblemDefinitionExpanded && isSolutionExplorationExpanded) {
                if (isIterativeRefinementExpanded || isFinalAnswerExpanded) {
                    if (index === 2 || index === 3) nodeWidth = EXPANDED_NODE_WIDTH;
                } else if (index === 2 || index === 3) {
                    nodeWidth = COLLAPSED_NODE_WIDTH;
                }
            }
            
            let x = 0;
            let y = 0;
            
            // Apply specific layout rules based on which nodes are expanded
            if (isProblemDefinitionExpanded && isSolutionExplorationExpanded && isIterativeRefinementExpanded && isFinalAnswerExpanded) {
                // All four nodes are expanded - each gets its own row, full width
                const problemDefHeight = nodeHeights[0];
                const solutionExpHeight = nodeHeights[1];
                const iterativeRefHeight = nodeHeights[2];
                switch (index) {
                    case 0: // Problem Definition - first row, full width
                        x = 0;
                        y = 0;
                        break;
                    case 1: // Solution Exploration - second row, full width
                        x = 0;
                        y = problemDefHeight + GRID_PADDING;
                        break;
                    case 2: // Iterative Refinement - third row, full width
                        x = 0;
                        y = problemDefHeight + GRID_PADDING + solutionExpHeight + GRID_PADDING;
                        break;
                    case 3: // Final Answer - fourth row, full width
                        x = 0;
                        y = problemDefHeight + GRID_PADDING + solutionExpHeight + GRID_PADDING + iterativeRefHeight + GRID_PADDING;
                        break;
                }
            } else if (isProblemDefinitionExpanded && !isSolutionExplorationExpanded) {
                // Rule 1: Problem Definition (index 0) is expanded
                const problemDefHeight = nodeHeights[0];
                const iterativeRefHeight = isIterativeRefinementExpanded ? nodeHeights[2] : MIN_NODE_HEIGHT;
                if (isFinalAnswerExpanded) {
                    // Requirement: when Problem and Final Answer are opened, Verification should be full width
                    // and Final Answer should go to the next row full width.
                    switch (index) {
                        case 0: // Problem Definition - first row, full width
                            x = 0;
                            y = 0;
                            break;
                        case 1: // Solution Exploration - second row, full width
                            x = 0;
                            y = problemDefHeight + GRID_PADDING;
                            break;
                        case 2: // Iterative Refinement - third row, full width (even if collapsed)
                            x = 0;
                            y = problemDefHeight + GRID_PADDING + MIN_NODE_HEIGHT + GRID_PADDING;
                            break;
                        case 3: // Final Answer - fourth row, full width
                            x = 0;
                            y = problemDefHeight + GRID_PADDING + MIN_NODE_HEIGHT + GRID_PADDING + nodeHeights[2] + GRID_PADDING;
                            break;
                    }
                } else {
                    switch (index) {
                        case 0: // Problem Definition - stays in first row, full width
                            x = 0;
                            y = 0;
                            break;
                        case 1: // Solution Exploration - moves to second row, full width
                            x = 0;
                            y = problemDefHeight + GRID_PADDING;
                            break;
                        case 2: // Iterative Refinement - moves to third row, full width if expanded, half width if not
                            x = 0;
                            y = problemDefHeight + GRID_PADDING + MIN_NODE_HEIGHT + GRID_PADDING;
                            break;
                        case 3: // Final Answer - positioning depends on whether Iterative Refinement is expanded
                            if (isIterativeRefinementExpanded) {
                                // If Iterative Refinement is expanded, Final Answer goes to fourth row, full width
                                x = 0;
                                y = problemDefHeight + GRID_PADDING + MIN_NODE_HEIGHT + GRID_PADDING + iterativeRefHeight + GRID_PADDING;
                            } else {
                                // If Iterative Refinement is not expanded, Final Answer shares third row, half width
                                x = COLLAPSED_NODE_WIDTH + GRID_PADDING;
                                y = problemDefHeight + GRID_PADDING + MIN_NODE_HEIGHT + GRID_PADDING;
                            }
                            break;
                    }
                }
            } else if (isSolutionExplorationExpanded && !isProblemDefinitionExpanded) {
                // Rule 2: Solution Exploration (index 1) is expanded
                const solutionExpHeight = nodeHeights[1];
                const iterativeRefHeight = isIterativeRefinementExpanded ? nodeHeights[2] : MIN_NODE_HEIGHT;
                if (isOnlySolutionExplorationExpanded) {
                    // Special-case: only Solution Exploration is expanded
                    // Layout:
                    // Row 1: Problem Definition (full width, collapsed height)
                    // Row 2: Solution Exploration (full width, expanded height)
                    // Row 3: Iterative Refinement (left half) + Final Answer (right half), same row
                    switch (index) {
                        case 0:
                            x = 0;
                            y = 0;
                            break;
                        case 1:
                            x = 0;
                            y = MIN_NODE_HEIGHT + GRID_PADDING;
                            break;
                        case 2:
                            x = 0;
                            y = MIN_NODE_HEIGHT + GRID_PADDING + solutionExpHeight + GRID_PADDING;
                            break;
                        case 3:
                            x = COLLAPSED_NODE_WIDTH + GRID_PADDING;
                            y = MIN_NODE_HEIGHT + GRID_PADDING + solutionExpHeight + GRID_PADDING;
                            break;
                    }
                } else {
                switch (index) {
                    case 0: // Problem Definition - stays in first row, full width
                        x = 0;
                        y = 0;
                        break;
                    case 1: // Solution Exploration - moves to second row, full width
                        x = 0;
                        y = MIN_NODE_HEIGHT + GRID_PADDING;
                        break;
                    case 2: // Iterative Refinement - moves to third row, full width
                        x = 0;
                        y = MIN_NODE_HEIGHT + GRID_PADDING + solutionExpHeight + GRID_PADDING;
                        break;
                    case 3: // Final Answer - positioning depends on whether Iterative Refinement is expanded
                        if (isIterativeRefinementExpanded) {
                            // If Iterative Refinement is expanded, Final Answer goes to fourth row, full width
                            x = 0;
                            y = MIN_NODE_HEIGHT + GRID_PADDING + solutionExpHeight + GRID_PADDING + iterativeRefHeight + GRID_PADDING;
                        } else {
                            // If Iterative Refinement is not expanded, Final Answer gets its own row (fourth row), full width
                            x = 0;
                            y = MIN_NODE_HEIGHT + GRID_PADDING + solutionExpHeight + GRID_PADDING + MIN_NODE_HEIGHT + GRID_PADDING;
                        }
                        break;
                }
                }
            } else if (isProblemDefinitionExpanded && isSolutionExplorationExpanded) {
                // Both Problem Definition and Solution Exploration are expanded
                const problemDefHeight = nodeHeights[0];
                const solutionExpHeight = nodeHeights[1];
                if (isIterativeRefinementExpanded || isFinalAnswerExpanded) {
                    // 0: full width, 1: full width, 2: full width, 3: next row full width
                    const iterativeRefHeight = nodeHeights[2];
                    switch (index) {
                        case 0:
                            x = 0;
                            y = 0;
                            break;
                        case 1:
                            x = 0;
                            y = problemDefHeight + GRID_PADDING;
                            break;
                        case 2:
                            x = 0;
                            y = problemDefHeight + GRID_PADDING + solutionExpHeight + GRID_PADDING;
                            break;
                        case 3:
                            x = 0;
                            y = problemDefHeight + GRID_PADDING + solutionExpHeight + GRID_PADDING + iterativeRefHeight + GRID_PADDING;
                            break;
                    }
                } else {
                    // 2 and 3 share one two-col row
                    switch (index) {
                        case 0: // Problem Definition - first row, full width
                            x = 0;
                            y = 0;
                            break;
                        case 1: // Solution Exploration - second row, full width
                            x = 0;
                            y = problemDefHeight + GRID_PADDING;
                            break;
                        case 2: // Iterative Refinement - third row, left column
                            x = 0;
                            y = problemDefHeight + GRID_PADDING + solutionExpHeight + GRID_PADDING;
                            break;
                        case 3: // Final Answer - third row, right column
                            x = COLLAPSED_NODE_WIDTH + GRID_PADDING;
                            y = problemDefHeight + GRID_PADDING + solutionExpHeight + GRID_PADDING;
                            break;
                    }
                }
            } else if (isIterativeRefinementExpanded && !isFinalAnswerExpanded) {
                // Rule 3: Iterative Refinement (index 2) is expanded
                const iterativeRefHeight = nodeHeights[2];
                switch (index) {
                    case 0: // Problem Definition - stays in first row, half width
                        x = 0;
                        y = 0;
                        break;
                    case 1: // Solution Exploration - stays in first row, half width, next to Problem Definition
                        x = COLLAPSED_NODE_WIDTH + GRID_PADDING;
                        y = 0;
                        break;
                    case 2: // Iterative Refinement - moves to second row, full width
                        x = 0;
                        y = MIN_NODE_HEIGHT + GRID_PADDING;
                        break;
                    case 3: // Final Answer - moves to third row, full width
                        x = 0;
                        y = MIN_NODE_HEIGHT + GRID_PADDING + iterativeRefHeight + GRID_PADDING;
                        break;
                }
            } else if (isFinalAnswerExpanded && !isIterativeRefinementExpanded) {
                // Rule 4: Final Answer (index 3) is expanded
                switch (index) {
                    case 0: // Problem Definition - stays in first row, half width
                        x = 0;
                        y = 0;
                        break;
                    case 1: // Solution Exploration - stays in first row, half width, next to Problem Definition
                        x = COLLAPSED_NODE_WIDTH + GRID_PADDING;
                        y = 0;
                        break;
                    case 2: // Iterative Refinement - moves to second row, full width
                        x = 0;
                        y = MIN_NODE_HEIGHT + GRID_PADDING;
                        break;
                    case 3: // Final Answer - moves to third row, full width
                        x = 0;
                        y = MIN_NODE_HEIGHT + GRID_PADDING + MIN_NODE_HEIGHT + GRID_PADDING;
                        break;
                }
            } else if (isIterativeRefinementExpanded && isFinalAnswerExpanded) {
                // Both Iterative Refinement and Final Answer are expanded
                const iterativeRefHeight = nodeHeights[2];
                switch (index) {
                    case 0: // Problem Definition - first row, half width
                        x = 0;
                        y = 0;
                        break;
                    case 1: // Solution Exploration - first row, half width, next to Problem Definition
                        x = COLLAPSED_NODE_WIDTH + GRID_PADDING;
                        y = 0;
                        break;
                    case 2: // Iterative Refinement - second row, full width
                        x = 0;
                        y = MIN_NODE_HEIGHT + GRID_PADDING;
                        break;
                    case 3: // Final Answer - third row, full width
                        x = 0;
                        y = MIN_NODE_HEIGHT + GRID_PADDING + iterativeRefHeight + GRID_PADDING;
                        break;
                }
            } else {
                // Default 2x2 grid layout when no specific nodes are expanded
                const row = Math.floor(index / 2);
                const col = index % 2;
                
                x = col * (COLLAPSED_NODE_WIDTH + GRID_PADDING);
                y = row * (MIN_NODE_HEIGHT + GRID_PADDING);
            }
            
            // Provide layout constants to the node for use by renderers (single source of truth)
            const layoutConstants = {
                // Grid in the expanded node content
                gridColumns: 4,
                rowGap: 16,
                // Header height can differ for full vs half width; compute per node width
                headerHeight: (isExpanded || nodeWidth >= 1400) ? 50 : 72,
                footerHeight: 36,
                containerVPadding: 16,
                gridTopMargin: 8,
                collapsedCardHeight: 112,
                expandedFixedBeforeSteps: 120,
                stepRowHeight: 82,
                // Base node heights
                minNodeHeight: MIN_NODE_HEIGHT,
                expandedNodeHeight: EXPANDED_NODE_HEIGHT,
                // Flags useful for the renderer
                isFullWidth: nodeWidth >= 1400
            } as const;

            return {
                ...node,
                position: { x: x + OFFSET_X, y: y + OFFSET_Y },
                width: nodeWidth,
                height: nodeHeight,
                draggable: false, // Make nodes non-draggable
                data: {
                    ...node.data,
                    gridPosition: index,
                    totalGridItems: nodes.length,
                    layoutConstants
                },
                style: `width: ${nodeWidth}px; height: ${nodeHeight}px;`
            };
        });
        
        console.log('[SpaceFillingGrid] Output nodes:', positionedNodes.map((node) => ({ 
            id: node.id, 
            position: `(${node.position?.x || 0}, ${node.position?.y || 0})`, 
            width: node.width
        })));
        
        return positionedNodes;
    }

    private createSerpentinePattern(nodes: Node[]): Node[] {
        const nodesPerRow = Math.ceil(Math.sqrt(nodes.length));
        const rowHeight = DEFAULT_NODE_HEIGHT + CURVE_SPACING;
        const colWidth = DEFAULT_NODE_WIDTH + CURVE_SPACING;
        
        return nodes.map((node, index) => {
            const row = Math.floor(index / nodesPerRow);
            const col = index % nodesPerRow;
            
            // Alternate row directions for serpentine pattern
            const actualCol = row % 2 === 0 ? col : nodesPerRow - 1 - col;
            
            const x = actualCol * colWidth;
            const y = row * rowHeight;
            
            return {
                ...node,
                position: { x, y }
            };
        });
    }

    // TODO: Implement these advanced curve algorithms
    private createHilbertCurve(nodes: Node[]): Node[] {
        // Placeholder for Hilbert curve implementation
        return this.createSerpentinePattern(nodes);
    }

    private createZOrderCurve(nodes: Node[]): Node[] {
        // Placeholder for Z-order curve implementation  
        return this.createSerpentinePattern(nodes);
    }
}

// Main layout calculation function
export function calculateSpaceFillingCurveLayout(nodesToLayout: Node[], edgesToLayout: Edge[]): { nodes: Node[], edges: Edge[] } {
    const strategy = new SpaceFillingCurveLayoutStrategy();
    return strategy.applyLayout(nodesToLayout, edgesToLayout);
}

// Main apply layout function
export function applySpaceFillingCurveLayout(
    nodesWritable: Writable<Node[]>,
    edgesWritable: Writable<Edge[]>,
    initialNodesFromLoad?: Node[],
    initialEdgesFromLoad?: Edge[],
    fitView?: () => void
) {
    console.log('[SpaceFillingCurveLayout] Applying space-filling curve layout');
    
    // Determine if this call is for a new diagram load or a re-layout of existing data
    const isNewDiagramLoad = initialNodesFromLoad !== undefined && initialEdgesFromLoad !== undefined;

    let nodesForCalc: Node[];
    let edgesForCalc: Edge[];

    if (isNewDiagramLoad) {
        console.log("[SpaceFillingCurveLayout] Processing NEW diagram data.");
        nodesForCalc = initialNodesFromLoad!.map(n => ({ ...n }));
        edgesForCalc = initialEdgesFromLoad!.map(e => ({ ...e }));
    } else {
        console.log("[SpaceFillingCurveLayout] Re-layouting existing data from stores.");
        nodesForCalc = get(nodesWritable).map(n => ({ ...n }));
        edgesForCalc = get(edgesWritable).map(e => ({ ...e }));
        
        // Log current state of nodes before layout
        console.log('[SpaceFillingCurveLayout] Current node states before layout:', nodesForCalc.map(n => ({ 
            id: n.id, 
            type: n.type, 
            sunflowOpen: n.data?.sunflowOpen,
            position: `(${n.position?.x}, ${n.position?.y})`
        })));
    }

    if (nodesForCalc.length === 0 && edgesForCalc.length === 0 && !isNewDiagramLoad) {
        console.log("[SpaceFillingCurveLayout] No nodes or edges to re-layout from store. Skipping calculation.");
        if (fitView) {
            requestAnimationFrame(() => fitView && fitView());
        }
        return;
    }
    
    // Perform the layout calculation
    const { nodes: finalLayoutedNodes, edges: finalLayoutedEdges } = calculateSpaceFillingCurveLayout(nodesForCalc, edgesForCalc);

    console.log(`[SpaceFillingCurveLayout] Final layouted nodes:`, finalLayoutedNodes.map(n => ({ 
        id: n.id, 
        position: n.position, 
        width: n.width, 
        sunflowOpen: n.data?.sunflowOpen 
    })));

    // COMPLETE REDRAW: Clear stores first to ensure fresh rendering
    console.log("[SpaceFillingCurveLayout] Performing complete redraw - clearing stores first");
    nodesWritable.set([]);
    edgesWritable.set([]);
    
    // Use requestAnimationFrame to ensure the clear takes effect before setting new data
    requestAnimationFrame(() => {
        // Set nodes first to ensure they render before edges
        nodesWritable.set(finalLayoutedNodes);
        // Small delay to ensure nodes are rendered before edges for proper layering
        requestAnimationFrame(() => {
            edgesWritable.set(finalLayoutedEdges);
            console.log("[SpaceFillingCurveLayout] Complete redraw finished with proper layering");
            
            if (fitView) {
                setTimeout(() => {
                    try {
                        if (fitView) fitView();
                        console.log("[SpaceFillingCurveLayout] fitView executed.");
                    } catch (e) {
                        console.warn("[SpaceFillingCurveLayout] Error during fitView:", e);
                    }
                }, 50);
            }
        });
    });
}

export const SPACE_FILLING_CURVE_LAYOUT_CONFIG = {
    DEFAULT_NODE_WIDTH,
    DEFAULT_NODE_HEIGHT,
    CURVE_SPACING,
};
