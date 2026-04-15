<script lang="ts">
	import type { NodeProps } from '@xyflow/svelte';
	import { getContext } from 'svelte';

	type $$Props = NodeProps;
	export let data: $$Props['data'] & {
		levelOfDetail?: string;
		subphases?: any[];
		sunflowOpen?: boolean;
		originalHeight?: number;
		content?: string;
		category?: string;
		gridPosition?: number;
		totalGridItems?: number;
		expandedSubphases?: Set<string>;
		layoutConstants?: {
			gridColumns?: number;
			rowGap?: number;
			headerHeight?: number;
			footerHeight?: number;
			containerVPadding?: number;
			gridTopMargin?: number;
			collapsedCardHeight?: number;
			expandedFixedBeforeSteps?: number;
			stepRowHeight?: number;
			minNodeHeight?: number;
			expandedNodeHeight?: number;
			isFullWidth?: boolean;
		};
	};
	export const isConnectable: $$Props['isConnectable'] = undefined as unknown as $$Props['isConnectable'];
	export let id: $$Props['id'];
	export let width: $$Props['width'] = undefined;

	// Context from main page for layout + data updates
	const triggerLayoutUpdate = getContext<() => void>('triggerLayoutUpdate');
	const updateNodeData = getContext<(nodeId: string, newData: any) => void>('updateNodeData');

	// Derive kind from category for styling/handles
	function normalizeCategory(cat?: string): 'problem' | 'solution' | 'iterative' | 'final' | 'unknown' {
		const c = (cat || '').toLowerCase();
		if (c.includes('problem')) return 'problem';
		if (c.includes('solution')) return 'solution';
		if (c.includes('iterative')) return 'iterative';
		if (c.includes('final')) return 'final';
		return 'unknown';
	}

	const colorByKind: Record<string, { closed: string; open: string; card: string; border: string; text: string }> = {
		problem: { closed: 'bg-[#FFD29F]', open: 'bg-[#FFD29F]/60', card: 'bg-[#FFD29F]', border: 'border-[#FFD29F]', text: 'text-black' },
		solution: { closed: 'bg-[#FFC5FF]', open: 'bg-[#FFC5FF]/60', card: 'bg-[#FFC5FF]', border: 'border-[#FFC5FF]', text: 'text-black' },
		iterative:{ closed: 'bg-[#c9baff]', open: 'bg-[#c9baff]/60', card: 'bg-[#c9baff]', border: 'border-[#c9baff]', text: 'text-black' },
		final:    { closed: 'bg-[#94F1C3]', open: 'bg-[#94F1C3]/60', card: 'bg-[#94F1C3]', border: 'border-[#94F1C3]', text: 'text-black' },
		unknown:  { closed: 'bg-white', open: 'bg-white/60', card: 'bg-white', border: 'border-gray-200', text: 'text-black' }
	};

	const titleByKind: Record<string, string> = {
		problem: 'Problem Definition & Scoping',
		solution: 'Initial Solution & Exploration',
		iterative: 'Iterative Refinement & Verification',
		final: 'Final Answer',
		unknown: 'Section'
	};

	let selectedSummary: string | null = null;
	function showSummary(summary: string) {
		selectedSummary = selectedSummary === summary ? null : summary;
	}

	function toggleSubphase(subphaseId: string) {
		// Normalize to Set for local ops
		const currentSet = data.expandedSubphases instanceof Set
			? new Set<string>(Array.from(data.expandedSubphases as Set<string>))
			: new Set<string>(Array.isArray(data.expandedSubphases) ? (data.expandedSubphases as any[]) : []);

		// Enforce single-expanded behavior: open one, close others
		if (currentSet.has(subphaseId)) {
			currentSet.delete(subphaseId);
		} else {
			currentSet.clear();
			currentSet.add(subphaseId);
		}

		// Update local data for immediate UI
		data.expandedSubphases = currentSet;
		data = data; // trigger reactivity

		// Persist as array for stable cloning across layouts
		if (updateNodeData) updateNodeData(id, { expandedSubphases: Array.from(currentSet) });
		if (triggerLayoutUpdate) setTimeout(() => triggerLayoutUpdate(), 10);
	}

	// Reactive calculation of dynamic node height based on expanded subphases
	// Prefer layout-provided constants; fall back to defaults
	$: layoutConstants = (data as any)?.layoutConstants || {};
	$: isFullWidth = layoutConstants.isFullWidth ?? ((width ?? 0) >= 1400);
	function toExpandedSet(val: any): Set<string> {
		if (val instanceof Set) return val as Set<string>;
		if (Array.isArray(val)) return new Set<string>(val as any[]);
		return new Set<string>();
	}

	function subphaseKey(sp: any, index: number): string {
		return (sp?.id ?? sp?.subcategory ?? String(index)) + '';
	}

	let dynamicNodeHeight: number;
	$: {
		const MIN_NODE_HEIGHT = layoutConstants.minNodeHeight ?? 120;
		const EXPANDED_NODE_HEIGHT = layoutConstants.expandedNodeHeight ?? 280;
		if (!data?.sunflowOpen) {
			dynamicNodeHeight = MIN_NODE_HEIGHT;
		} else if (data?.subphases && Array.isArray(data.subphases)) {
			const subphases = data.subphases;
			const subnodesCount = subphases.length;
			const expandedSubphases = toExpandedSet(data.expandedSubphases);

			// Layout constants aligned with CSS in this component
			const GRID_COLUMNS = layoutConstants.gridColumns ?? 4;          // repeat(4, 1fr)
			const ROW_GAP = layoutConstants.rowGap ?? 16;                   // gap-4
			const HEADER_HEIGHT = layoutConstants.headerHeight ?? (isFullWidth ? 50 : 72);
			const FOOTER_HEIGHT = layoutConstants.footerHeight ?? 36;        // footer meta area
			const CONTAINER_V_PADDING = layoutConstants.containerVPadding ?? 16;  // py-2
			const GRID_TOP_MARGIN = layoutConstants.gridTopMargin ?? 8;       // small spacing above grid

			const COLLAPSED_CARD_HEIGHT = layoutConstants.collapsedCardHeight ?? 112; // subphase card when collapsed
			const EXPANDED_FIXED_BEFORE_STEPS = layoutConstants.expandedFixedBeforeSteps ?? 120; // expanded card header/labels
			const STEP_ROW_HEIGHT = layoutConstants.stepRowHeight ?? 140;            // each row of steps

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

			const collapsedCount = Math.max(0, subnodesCount - expandedCount);
			const collapsedRows = collapsedCount > 0 ? Math.ceil(collapsedCount / GRID_COLUMNS) : 0;
			const collapsedRowsHeight = collapsedRows * COLLAPSED_CARD_HEIGHT;

			const totalRows = collapsedRows + expandedCount;
			const gridGaps = totalRows > 1 ? (totalRows - 1) * ROW_GAP : 0;

			const calculatedHeight = HEADER_HEIGHT + GRID_TOP_MARGIN + collapsedRowsHeight + expandedHeightsTotal + gridGaps + FOOTER_HEIGHT + CONTAINER_V_PADDING;
			dynamicNodeHeight = Math.max(EXPANDED_NODE_HEIGHT, Math.ceil(calculatedHeight));
		} else {
			dynamicNodeHeight = EXPANDED_NODE_HEIGHT;
		}
	}

	function handleMainClick() {
		if (data?.subphases && data.subphases.length > 0) {
			const newSunflowOpen = !data.sunflowOpen;
			if (updateNodeData) {
				updateNodeData(id, { sunflowOpen: newSunflowOpen });
			} else {
				data.sunflowOpen = newSunflowOpen; data = data;
				if (triggerLayoutUpdate) setTimeout(() => triggerLayoutUpdate(), 10);
			}
		}
	}

	let startStep: number | undefined;
	let endStep: number | undefined;
	$: {
		startStep = undefined; endStep = undefined;
		if (data.subphases && data.subphases.length > 0 && data.subphases[0].step_indices && data.subphases[0].step_indices.length > 0) {
			startStep = data.subphases[0].step_indices[0];
		}
		if (data.subphases && data.subphases.length > 0) {
			const lastSubphase = data.subphases[data.subphases.length - 1];
			if (lastSubphase.step_indices && lastSubphase.step_indices.length > 0) {
				endStep = lastSubphase.step_indices[lastSubphase.step_indices.length - 1];
			}
		}
	}

	$: kind = normalizeCategory(data?.category);
	$: colors = colorByKind[kind] || colorByKind.unknown;
	$: title = titleByKind[kind] || titleByKind.unknown;
	$: containerBg = data?.sunflowOpen ? colors.open : colors.closed;
</script>

<div 
	class="px-4 py-2 rounded-md {containerBg} backdrop-blur-md w-full flex flex-col gap-2 problem-node-container border-gray-200"
	style="min-height: {data?.sunflowOpen ? dynamicNodeHeight : (layoutConstants.minNodeHeight ?? 82)}px; height: {data?.sunflowOpen ? '100%' : 'auto'}; box-shadow: 0 2px 5px rgba(0,0,0,0.1);"
	aria-live="polite"
>
	<div 
		class="summary-section flex-grow"
		class:cursor-pointer={data?.subphases && data.subphases.length > 0}
		class:cursor-default={!data?.subphases || data.subphases.length === 0}
		class:h-[50px]={isFullWidth}
		class:min-h-[50px]={isFullWidth}
		class:max-h-[50px]={isFullWidth}
		class:overflow-hidden={isFullWidth}
		on:click={handleMainClick}
		on:keydown={(e) => e.key === 'Enter' && handleMainClick()}
		role="button"
		tabindex="0"
		aria-expanded={data?.sunflowOpen}
		aria-controls="subphases-for-{id}"
	>
		<p class="text-black text-base leading-relaxed">{data.content}</p>
	</div>

	{#if data?.sunflowOpen && data.subphases && data.subphases.length > 0}
		<div class="subphases-grid grid grid-flow-row" style="grid-template-columns: repeat({layoutConstants.gridColumns ?? 4}, 1fr); gap: {layoutConstants.rowGap ?? 16}px;">
			{#each data.subphases as subphase, index}
				{@const expandedSet = toExpandedSet(data.expandedSubphases)}
				{@const key = subphaseKey(subphase, index)}
				{@const isSubphaseExpanded = expandedSet.has(key)}
				<div class="subphase-card {colors.card} backdrop-blur-sm p-2 flex flex-col justify-between rounded-lg border {colors.border} {isSubphaseExpanded ? 'col-span-4 ' + colors.card : ''}"
						 on:click={() => toggleSubphase(key)}
						 on:keydown={(e) => e.key === 'Enter' && toggleSubphase(key)}
						 role="button"
						 tabindex="0"
						 style="cursor: pointer;">
						 <p class="text-black text-base leading-relaxed">{subphase.summary}</p>
						<div class="flex items-baseline justify-between mb-2">
							<p class="text-black font-medium text-xs">{subphase.subcategory.replace(/_/g, ' ')}</p>
							{#if subphase.step_indices && subphase.step_indices.length > 0}
								<span class="text-xs font-medium text-black">
									Steps: {subphase.step_indices[0]+1}{subphase.step_indices.length > 1 ? `-${subphase.step_indices[subphase.step_indices.length - 1]+1}` : ''}
								</span>
							{/if}
						</div>

					{#if isSubphaseExpanded && subphase.steps && subphase.steps.length > 0}
						<div class="pt-4">
							<h5 class="text-black font-medium text-xs mb-3">Raw Steps:</h5>
							<div class="steps-grid grid gap-3" style="grid-template-columns: repeat(4, 1fr);">
								{#each subphase.steps as step, i}
									<div class="step-card bg-white p-3 rounded">
										<div class="text-black text-xs font-medium mb-1">Step {(step?.index ?? i) + 1}</div>
										<p class="text-black text-xs leading-relaxed">{step?.text ?? ''}</p>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{:else if data.levelOfDetail === '2' && !data?.sunflowOpen}
		<div class="tags-and-summary-preview" id="subphases-for-{id}">
			{#if data.subphases && data.subphases.length > 0}
				<div class="flex flex-wrap gap-2">
					{#each data.subphases as subphase}
						<span 
							class="px-2 py-0.5 text-xs text-black bg-white rounded-full cursor-pointer hover:bg-gray-200 border border-gray-300 transition-colors"
							on:click|stopPropagation={() => showSummary(subphase.summary)}
							role="button"
							tabindex="0"
							on:keydown|stopPropagation={(e) => e.key === 'Enter' && showSummary(subphase.summary)}
							aria-pressed={selectedSummary === subphase.summary}
						>
							{subphase.subcategory.replace(/_/g, ' ')}
						</span>
					{/each}
				</div>
			{/if}
			{#if selectedSummary}
				<div class="p-2 text-xs text-gray-800 bg-white rounded border border-gray-300 max-h-24 overflow-y-auto">
					{selectedSummary}
				</div>
			{/if}
		</div>
	{/if}

	<div class="footer-section mt-auto pt-2 ">
		<div class="w-full flex items-center justify-between">
			<p class="font-medium text-black text-xs">{data?.category || title}</p>
			<div class="flex items-center gap-4 text-xs text-black">
				{#if data?.subphases && data.subphases.length > 0}
					<span>Subphases: {data.subphases.length}</span>
				{/if}
				{#if startStep !== undefined && endStep !== undefined}
					<span>Steps: {startStep + 1}{startStep === endStep ? '' : `-${endStep +1}`}</span>
				{/if}
			</div>
		</div>
	</div>
</div>

<!-- Handles removed: not needed for space-filling layout -->


