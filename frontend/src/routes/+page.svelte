<script lang="ts">
	import { writable, type Writable } from 'svelte/store';
	import { get } from 'svelte/store';
	import {
		SvelteFlow,
		Background,
		Controls,
		type Node,
		type Edge,
		SvelteFlowProvider,
		type NodeTypes
	} from '@xyflow/svelte';
	import '@xyflow/svelte/dist/style.css';
	import { onMount, setContext } from 'svelte';
	
	// Keep only nodes required by remaining layouts
	import PhaseBarSectionNode from '$lib/flow/nodes/PhaseBarSectionNode.svelte';
	// Timeline node component
	import TimelineNode from '$lib/flow/nodes/TimelineNode.svelte';
	// Space-filling curve unified component
	import SpaceFillingNode from '$lib/flow/nodes/SpaceFillingNode.svelte';

	// Layout manager (restricted to three layouts)
	import { applySelectedLayout, parseLayoutType, type LayoutType } from '$lib/flow/layouts/layoutManager';
	import Sidebar from '$lib/components/Sidebar.svelte';

	// Dynamic Diagram Loading & Processing
	const diagramModules: Record<string, () => Promise<any>> = import.meta.glob('$lib/flow/data/*.ts');
	import { calculatePhaseDistribution, type PhaseInfo } from '$lib/utils/diagramProcessing';
	import { sidebarOpen } from '$lib/stores/ui';

	const nodeTypes = {
		phaseBarSection: PhaseBarSectionNode,
		timeline: TimelineNode,
		timelineProblemDefinition: TimelineNode,
		timelineSolutionExploration: TimelineNode,
		timelineIterativeRefinement: TimelineNode,
		timelineFinalAnswer: TimelineNode,
		spaceFillingProblemDefinition: SpaceFillingNode,
		spaceFillingSolutionExploration: SpaceFillingNode,
		spaceFillingIterativeRefinement: SpaceFillingNode,
		spaceFillingFinalAnswer: SpaceFillingNode
	} as unknown as NodeTypes;

	// SvelteFlow stores and other state variables
	const nodes = writable<Node[]>([]);
	const edges = writable<Edge[]>([]);
	const availableDiagrams = writable<string[]>([]);
	const selectedDiagramStore = writable<string | undefined>(undefined);
	const currentDiagramQuestion = writable<string>("Select a diagram to view its prompt.");
	const currentDiagramResponse = writable<string>("Select a diagram to view its response.");
	const phaseDistribution = writable<PhaseInfo[]>([]);
	const selectedLevelOfDetail = writable<string>('0');
	const selectedLayoutType = writable<string>('space-filling-curve');
	
	const showRawTraceTextArea = writable<boolean>(false);
	const rawTraceText = writable<string>('');
	interface Step { index: number; text: string }
	const rawTraceSteps = writable<Step[]>([]);
	
	let currentQuestion = "";
	let currentModelResponse = "";
	
	function initializeFromURL() {
		if (typeof window !== 'undefined') {
			const params = new URL(window.location.href).searchParams;
			const diagram = params.get('diagram');
			const style = params.get('style') || 'space-filling-curve';
			if (diagram) selectedDiagramStore.set(diagram);
			selectedLayoutType.set(style);
		}
	}

	function updateURL() {
		if (typeof window !== 'undefined') {
			const params = new URLSearchParams();
			const currentDiagram = $selectedDiagramStore;
			const currentStyle = $selectedLayoutType;
			if (currentDiagram) params.set('diagram', currentDiagram);
			params.set('style', currentStyle);
			const newUrl = `${window.location.pathname}?${params.toString()}`;
			window.history.replaceState(null, '', newUrl);
		}
	}
	
	let originalDiagramNodes: Node[] = [];
	let originalDiagramEdges: Edge[] = [];
	
	const colorMode = 'light';
	let flowRef: SvelteFlow | null = null;
	let diagramLoadCounter = 0;

	function triggerLayoutUpdate() {
		const currentLayout = get(selectedLayoutType);
		if (currentLayout === 'space-filling-curve') {
			setTimeout(() => {
				applySelectedLayout(
					currentLayout as LayoutType,
					nodes, edges,
					undefined, undefined,
					() => flowRef?.fitView?.()
				);
			}, 50);
		}
	}
	
	setContext('triggerLayoutUpdate', triggerLayoutUpdate);

	function updateNodeData(nodeId: string, newData: any) {
		nodes.update(currentNodes => 
			currentNodes.map(node => node.id === nodeId ? { ...node, data: { ...node.data, ...newData } } : node)
		);
		if (get(selectedLayoutType) === 'space-filling-curve') setTimeout(() => triggerLayoutUpdate(), 50);
	}
	setContext('updateNodeData', updateNodeData);

	function expandPhaseSection(sectionId: string, subPhases?: any[]) {
		import('$lib/flow/layouts/sequentialTimelineLayout').then(({ SequentialTimelineLayoutStrategy }) => {
			const layout = new SequentialTimelineLayoutStrategy();
			const result = layout.expandPhaseSection(sectionId, subPhases as any[], $nodes, $edges);
			nodes.set(result.nodes);
			requestAnimationFrame(() => edges.set(result.edges));
		});
	}
	setContext('expandPhaseSection', expandPhaseSection);

	function collapsePhaseSection(sectionId: string) {
		import('$lib/flow/layouts/sequentialTimelineLayout').then(({ SequentialTimelineLayoutStrategy }) => {
			const layout = new SequentialTimelineLayoutStrategy();
			const result = layout.collapsePhaseSection(sectionId, $nodes, $edges);
			nodes.set(result.nodes);
			requestAnimationFrame(() => edges.set(result.edges));
		});
	}
	setContext('collapsePhaseSection', collapsePhaseSection);

	function handleSubsectionClick(nodeId: string) {
		import('$lib/flow/layouts/sequentialTimelineLayout').then(({ SequentialTimelineLayoutStrategy }) => {
			const layout = new SequentialTimelineLayoutStrategy();
			const result = layout.handleSubsectionClick(nodeId, $nodes, $edges);
			if (result) {
				nodes.set(result.nodes);
				requestAnimationFrame(() => edges.set(result.edges));
			}
		});
	}
	setContext('handleSubsectionClick', handleSubsectionClick);

	async function loadAndDisplayDiagram(diagramName: string | undefined) {
		originalDiagramNodes = [];
		originalDiagramEdges = [];
		if (!diagramName) { 
			nodes.set([]); edges.set([]);
			currentDiagramQuestion.set("Select a diagram to view its prompt.");
			currentDiagramResponse.set("Select a diagram to view its response.");
			phaseDistribution.set([]);
			return; 
		}
		diagramLoadCounter++;
		const idPrefix = `d${diagramLoadCounter}_${diagramName.replace(/[^a-zA-Z0-9_]/g, '')}_`;
		const targetFileName = `${diagramName}.ts`;
		let modulePathKey: string | undefined;
		for (const key in diagramModules) if (key.endsWith(targetFileName)) { modulePathKey = key; break; }
		if (!modulePathKey) { console.error(`Diagram module for '${diagramName}' not found.`); return; }
		const moduleLoader = diagramModules[modulePathKey];
		try {
			const module = await moduleLoader() as { initialNodes: Node[], initialEdges: Edge[], initialQuestion?: string, initialModelResponse?: string };
			if (!module.initialNodes || !module.initialEdges) { console.error(`Module for '${diagramName}' missing data.`); return; }
			currentDiagramQuestion.set(module.initialQuestion || "No prompt.");
			currentDiagramResponse.set(module.initialModelResponse || "No output.");
			phaseDistribution.set(calculatePhaseDistribution(module.initialNodes));
			const idMapping = new Map<string, string>();
			const currentDetailLevel = get(selectedLevelOfDetail);
			const prefixedNodes: Node[] = module.initialNodes.map(n => {
				const newId = `${idPrefix}${n.id}`; idMapping.set(n.id, newId);
				const nodeData = { ...n.data, levelOfDetail: currentDetailLevel };
				return { ...n, id: newId, data: nodeData, position: n.position || { x: 0, y: 0 } } as Node;
			});
			const prefixedEdges: Edge[] = module.initialEdges.map(e => {
				const newSourceId = idMapping.get((e as any).source);
				const newTargetId = idMapping.get((e as any).target);
				if (!newSourceId || !newTargetId) return null as unknown as Edge;
				return { ...(e as any), id: `${idPrefix}${(e as any).id}`, source: newSourceId, target: newTargetId, type: 'bezier', markerEnd: { type: 'arrowclosed', color: '#aaa', width: 6, height: 6 } } as any as Edge;
			}).filter((e): e is Edge => !!e);
			originalDiagramNodes = [...prefixedNodes];
			originalDiagramEdges = [...prefixedEdges];
			const currentLayoutType = parseLayoutType($selectedLayoutType);
			const layoutResult = applySelectedLayout(currentLayoutType, nodes, edges, prefixedNodes, prefixedEdges, () => flowRef?.fitView?.(), $phaseDistribution);
			if (layoutResult && layoutResult.useTextArea) { showRawTraceTextArea.set(true); rawTraceText.set(layoutResult.traceText || ''); rawTraceSteps.set(layoutResult.steps || []); }
			else { showRawTraceTextArea.set(false); rawTraceText.set(''); rawTraceSteps.set([]); }
		} catch (error) { console.error(`Error loading diagram '${diagramName}':`, error); }
	}

	onMount(() => {
		const diagramFileNames = Object.keys(diagramModules).map(p => p.split('/').pop()!.replace('.ts', ''));
		availableDiagrams.set(diagramFileNames);
		initializeFromURL();
		if (!$selectedDiagramStore && diagramFileNames.length > 0) {
			selectedDiagramStore.set(diagramFileNames[0]);
		} else if (!$selectedDiagramStore) {
			loadAndDisplayDiagram(undefined);
		}
	});
	
	selectedDiagramStore.subscribe(currentSelection => { loadAndDisplayDiagram(currentSelection); updateURL(); });
	$: if ($nodes && $nodes.length > 0 && $selectedLevelOfDetail) { nodes.update(cNodes => cNodes.map(node => ({ ...node, data: { ...node.data, levelOfDetail: $selectedLevelOfDetail } }))); }

	function handleLayoutChange(layoutType: string) {
		selectedLayoutType.set(layoutType); updateURL();
		if (originalDiagramNodes.length > 0) {
			const currentLayoutType = parseLayoutType(layoutType);
			const cleanOriginalNodes = originalDiagramNodes.map(node => ({ ...node, data: { ...node.data, sunflowOpen: false, expanded: false } }));
			const layoutResult = applySelectedLayout(currentLayoutType, nodes, edges, cleanOriginalNodes, originalDiagramEdges, () => flowRef?.fitView?.(), $phaseDistribution);
			if (layoutResult && layoutResult.useTextArea) { showRawTraceTextArea.set(true); rawTraceText.set(layoutResult.traceText || ''); rawTraceSteps.set(layoutResult.steps || []); }
			else { showRawTraceTextArea.set(false); rawTraceText.set(''); rawTraceSteps.set([]); }
		} else if ($nodes.length > 0) {
			const currentLayoutType = parseLayoutType(layoutType);
			const layoutResult = applySelectedLayout(currentLayoutType, nodes, edges, undefined, undefined, () => flowRef?.fitView?.(), $phaseDistribution);
			if (layoutResult && layoutResult.useTextArea) { showRawTraceTextArea.set(true); rawTraceText.set(layoutResult.traceText || ''); rawTraceSteps.set(layoutResult.steps || []); }
			else { showRawTraceTextArea.set(false); rawTraceText.set(''); rawTraceSteps.set([]); }
		}
	}
</script>

<SvelteFlowProvider>
	<div class="relative h-screen w-full overflow-hidden">
		<div class="absolute inset-0 z-0">
			<SvelteFlow
				{nodes} {edges} {nodeTypes} {colorMode}
				bind:this={flowRef}
				minZoom={0.1} maxZoom={3}
				style="pointer-events: auto;"
				fitViewOptions={{ padding: 0.2 }}
				zoomOnDoubleClick={false}
			>
				<Background />
				<Controls position="top-right" />
			</SvelteFlow>
		</div>

		<Sidebar
			diagramOptions={$availableDiagrams}
			bind:selectedDiagram={$selectedDiagramStore}
			{selectedLevelOfDetail}
			selectedLayoutType={$selectedLayoutType}
			onLayoutChange={handleLayoutChange}
			onDiagramChange={(diagram) => updateURL()}
			diagramQuestion={$currentDiagramQuestion}
			diagramResponse={$currentDiagramResponse}
			phaseDistributionData={$phaseDistribution}
			onLayout={(direction) => { if ($nodes.length > 0) { requestAnimationFrame(() => flowRef?.fitView?.()); } }}
		/>

		{#if $showRawTraceTextArea}
			<div class="absolute top-0 right-0 bg-gray-50 p-4 px-32 z-40" style="width: 100vw; height: 100vh; pointer-events: auto;">
				<div class="h-full">
					<div class={`bg-white rounded-lg shadow-lg p-6 ${$sidebarOpen ? 'pb-80' : 'pb-14'} h-full flex flex-col`}>
						<div class="mb-4"><h2 class="text-2xl font-bold text-gray-800 mb-2">Raw Reasoning Trace</h2></div>
						<div class="flex-1 w-full p-4 text-sm font-mono leading-relaxed bg-gray-50 border border-gray-200 rounded overflow-auto">
							{#each $rawTraceSteps as step, i}
								<div class="step-text mb-4 p-1 rounded hover:bg-gray-100 relative cursor-default" title="Step {step.index + 1}">
									<span class="step-content whitespace-pre-wrap">{step.text}</span>
									<div class="absolute -top-2 -right-2 opacity-0 hover:opacity-100 transition-opacity">
										<span class="bg-blue-500 text-white text-xs px-2 py-1 rounded shadow">Step {step.index + 1}</span>
									</div>
								</div>
							{/each}
							{#if $rawTraceSteps.length === 0}
								<div class="text-gray-500 italic">Raw reasoning trace will appear here...</div>
							{/if}
						</div>
					</div>
				</div>
			</div>
		{/if}
	</div>
</SvelteFlowProvider>

<style>
	:global(.svelte-flow .sunflow-parent-node){overflow:visible!important}
	:global(.svelte-flow .sunflow-subphase-wrapper-node){overflow:visible!important}
	:global(.svelte-flow .sunflow-step-node){box-shadow:0 1px 2px rgba(0,0,0,0.05)}
	:global(.svelte-flow .svelte-flow__node-subphase .svelte-flow__resize-control-wrapper),
	:global(.svelte-flow .svelte-flow__node-output.sunflow-step-node .svelte-flow__resize-control-wrapper){display:none}
</style>