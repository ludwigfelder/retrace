<script lang="ts">
	import { Handle, Position } from '@xyflow/svelte';
	import { getContext, onMount, onDestroy } from 'svelte';

	// Node props
	export let data: {
		content?: string;
		category?: string;
		title?: string;
		isTimelineNode?: boolean;
		isSubsection?: boolean;
		subPhaseIndex?: number;
		stepCount?: number;
		percentage?: number;
		mainPhaseType?: string;
		subphaseData?: any; // Store the full subphase data
		stepsExpanded?: boolean; // Track if steps are expanded
		steps?: any[]; // Direct steps array
		subphases?: any[]; // Array of subphases like in space-filling nodes
		levelOfDetail?: string;
		[key: string]: any; // Allow any additional properties
	};
	// svelte-ignore export_let_unused
	export let id: string;
	// svelte-ignore export_let_unused
	export let selected = false;
	export let zIndex = 1;

	const triggerLayoutUpdate = getContext<() => void>('triggerLayoutUpdate');
	const expandPhaseSection = getContext<(sectionId: string, subPhases?: any[]) => void>('expandPhaseSection');

	// Declare reactive variables
	let hasSteps = false;
	let stepsArray: any[] = [];

	// Extract data
	$: content = data.content || data.title || data.category || '';
	$: category = data.category || data.mainPhaseType || 'Iterative Refinement & Verification';

	// Map internal mainPhaseType keys to display labels
	function mainPhaseDisplay(type: string): string {
		const t = (type || '').toLowerCase();
		if (t.includes('problem')) return 'Problem Definition';
		if (t.includes('solution')) return 'Solution Exploration';
		if (t.includes('iterative')) return 'Iterative Refinement & Verification';
		if (t.includes('final')) return 'Final Answer';
		return type;
	}

	// Build footer label: Level 2 category – Level 1 category (for subsection nodes)
	$: footerLabel = (() => {
		const level2 = String(category || '').replace(/_/g, ' ');
		let level1 = '';
		if (data.mainPhaseType) {
			level1 = mainPhaseDisplay(String(data.mainPhaseType));
		} else {
			// Derive from category mapping if mainPhaseType missing
			const mapped = mapCategoryToMainPhase(String(data.category || ''));
			level1 = mainPhaseDisplay(mapped);
		}
		return data.isSubsection ? `${level2} – ${level1}` : level2;
	})();

		// Determine dynamic background class based on phase/category (Tailwind purge-safe)
		const BG_CLASSES = {
			problem: 'bg-[#FFD29F]',
			solution: 'bg-[#FFC5FF]',
			iterative: 'bg-[#c9baff]',
			final: 'bg-[#94F1C3]'
		} as const;

		$: bgClass = (() => {
			const key = (data.mainPhaseType || data.category || '').toLowerCase();
			if (key.includes('problem')) return BG_CLASSES.problem; // Problem Definition
			if (key.includes('solution')) return BG_CLASSES.solution; // Solution Exploration
			if (key.includes('final')) return BG_CLASSES.final; // Final Answer
			if (key.includes('refinement') || key.includes('verification')) return BG_CLASSES.iterative; // Iterative Refinement & Verification
			return BG_CLASSES.iterative; // Fallback
		})();

	$: {
		console.log('Timeline node data:', data);
		console.log('subphaseData:', data.subphaseData);
		console.log('subphaseData.steps:', data.subphaseData?.steps);
		console.log('data.steps:', data.steps);
		console.log('data.subphases:', data.subphases);
		console.log('All data keys:', Object.keys(data));

		// Check if we have subphases like in space-filling nodes
		if (data.subphases && Array.isArray(data.subphases)) {
			console.log('Found subphases array:', data.subphases);
			data.subphases.forEach((subphase, index) => {
				console.log(`Subphase ${index}:`, subphase);
				if (subphase.steps) {
					console.log(`Subphase ${index} steps:`, subphase.steps);
				}
			});
		}
	}

	$: {
		// Comprehensive steps detection logic - only for subsection nodes
		let foundSteps = [] as any[];
		let stepSource = 'none';

		// Only allow step expansion for subsection nodes, not main phase nodes
		if (data.isSubsection) {
			// Check multiple possible locations for steps
			if (data.subphaseData?.steps && data.subphaseData.steps.length > 0) {
				foundSteps = data.subphaseData.steps;
				stepSource = 'subphaseData.steps';
			} else if (data.steps && data.steps.length > 0) {
				foundSteps = data.steps;
				stepSource = 'data.steps';
			} else if (data.subphases && data.subphases.length > 0) {
				// Check if this is a specific subphase with steps
				const firstSubphase = data.subphases[0];
				if (firstSubphase && firstSubphase.steps && firstSubphase.steps.length > 0) {
					foundSteps = firstSubphase.steps;
					stepSource = 'subphases[0].steps';
				}
			} else if (data.subPhaseIndex !== undefined) {
				// For subsection nodes, try to find steps in the original source data
				// This is a fallback - the layout system should ideally pass the steps directly
				console.log('Subsection node detected, subPhaseIndex:', data.subPhaseIndex);
				console.log('Subsection node should have steps data directly attached');
				stepSource = 'subsection-fallback';
			}
		}

		console.log('Steps detection - Source:', stepSource, 'Steps found:', foundSteps.length, 'Steps:', foundSteps);
		stepsArray = foundSteps;
		// Only enable step expansion for subsection nodes that actually have steps
		hasSteps = !!data.isSubsection && foundSteps.length > 0;
	}

	// First-level metrics (non-subsection): total steps and subphase count
	$: firstLevelSubphaseCount = !data.isSubsection ? (() => {
		const subLower = Array.isArray(data.subphases) ? data.subphases : undefined;
		// Fallback to PascalCase if present on some nodes
		const subUpper = !subLower && Array.isArray((data as any).subPhases) ? (data as any).subPhases : undefined;
		return (subLower?.length ?? subUpper?.length ?? 0) as number;
	})() : 0;

	$: firstLevelStepsCount = !data.isSubsection ? (() => {
		if (typeof data.stepCount === 'number') return data.stepCount;
		// Prefer lower-case subphases, fallback to PascalCase
		const subAny: any[] = Array.isArray(data.subphases)
			? data.subphases as any[]
			: (Array.isArray((data as any).subPhases) ? (data as any).subPhases as any[] : []);
		if (subAny.length > 0) {
			return subAny.reduce((acc, sp) => acc + (Array.isArray(sp.steps) ? sp.steps.length : Array.isArray(sp.step_indices) ? sp.step_indices.length : 0), 0);
		}
		if (Array.isArray(data.steps)) return data.steps.length;
		return 0;
	})() : 0;

	// Calculate dynamic dimensions based on expanded state
	let dynamicNodeHeight: number;
	let dynamicNodeWidth: number;
	$: {
		const BASE_HEIGHT = 100;
		const BASE_WIDTH = 380; // Default timeline node width

		if (!data.stepsExpanded || !hasSteps) {
			dynamicNodeHeight = BASE_HEIGHT;
			dynamicNodeWidth = BASE_WIDTH;
		} else {
			// Keep height modest, expand width for horizontal layout
			dynamicNodeHeight = BASE_HEIGHT + 60;

			const stepsCount = stepsArray.length;
			const STEP_CARD_WIDTH = 150; // Matches .step-card inline style width
			const GAP_PX = 8; // Keep in sync with TimelineIterativeRefinementNode
			const H_PADDING_PX = 64; // Total horizontal padding

			const gapsTotal = Math.max(0, stepsCount - 1) * GAP_PX;
			const stepsWidth = (stepsCount * STEP_CARD_WIDTH) + gapsTotal;

			dynamicNodeWidth = Math.max(BASE_WIDTH, stepsWidth + H_PADDING_PX);
		}
		console.log('Dynamic dimensions calculated:', { width: dynamicNodeWidth, height: dynamicNodeHeight }, 'for steps expanded:', data.stepsExpanded);
	}

	function toggleSteps() {
		if (!hasSteps) return;
		const opening = !data.stepsExpanded;
		console.log('Toggling steps from', data.stepsExpanded, 'to', opening);
		data.stepsExpanded = opening;
		data = data; // Trigger reactivity
		if (opening && typeof document !== 'undefined') {
			// Broadcast accordion event so siblings in same main phase collapse
			document.dispatchEvent(new CustomEvent('timeline-subsection-open', {
				detail: { id, mainPhaseType: data.mainPhaseType }
			}));
		}
		if (triggerLayoutUpdate) setTimeout(() => triggerLayoutUpdate(), 10);
	}

	// Accordion listener: close this node if another in same main phase opened
	function handleAccordion(e: CustomEvent) {
		const { id: openedId, mainPhaseType } = e.detail || {};
		if (openedId !== id && data.isSubsection && data.stepsExpanded && mainPhaseType === data.mainPhaseType) {
			console.log('[TimelineNode] Closing due to accordion event from', openedId, 'in phase', mainPhaseType);
			data.stepsExpanded = false;
			data = data;
			if (triggerLayoutUpdate) setTimeout(() => triggerLayoutUpdate(), 10);
		}
	}

	onMount(() => {
		// Do not auto-expand any subsection on creation; wait for user interaction
		if (typeof document !== 'undefined') {
			// @ts-ignore - CustomEvent typing
			document.addEventListener('timeline-subsection-open', handleAccordion as any);
		}
	});

	onDestroy(() => {
		if (typeof document !== 'undefined') {
			// @ts-ignore
			document.removeEventListener('timeline-subsection-open', handleAccordion as any);
		}
	});

	// Enable expanding to second level when clicking a first-level (non-subsection) node
	let isFirstLevelClickable = false;
	$: isFirstLevelClickable = !data.isSubsection && typeof expandPhaseSection === 'function';

	function mapCategoryToMainPhase(cat: string): 'problemDefinition' | 'solutionExploration' | 'iterativeRefinement' | 'finalAnswer' {
		const c = (cat || '').toLowerCase();
		if (c.includes('problem') && (c.includes('definition') || c.includes('scoping'))) return 'problemDefinition';
		if (c.includes('solution') || c.includes('exploration') || c.includes('initial')) return 'solutionExploration';
		if (c.includes('iterative') || c.includes('refinement') || c.includes('verification')) return 'iterativeRefinement';
		if (c.includes('final') && c.includes('answer')) return 'finalAnswer';
		// Fallbacks
		if (c.includes('problem')) return 'problemDefinition';
		if (c.includes('final')) return 'finalAnswer';
		return 'solutionExploration';
	}

	function handleMainClick() {
		if (isFirstLevelClickable) {
			const mainType = data.mainPhaseType || mapCategoryToMainPhase(String(data.category || ''));
			const sectionId = `phase-section-${mainType}`;
			console.log('[TimelineNode] Expanding phase section', sectionId, 'triggered from timeline node:', id);
			expandPhaseSection?.(sectionId);
		}
	}

	// Calculate position offset to keep node centered when width changes
	let positionOffset: number;
	$: {
		const BASE_WIDTH = 380;
		if (data.stepsExpanded && hasSteps) {
			// Calculate how much wider the expanded node is
			const widthDifference = dynamicNodeWidth - BASE_WIDTH;
			// Offset by half the difference to keep centered
			positionOffset = -widthDifference / 2;
		} else {
			positionOffset = 0;
		}
		console.log('Position offset calculated:', positionOffset, 'for width difference:', dynamicNodeWidth - BASE_WIDTH);
	}

	// Apply a prominent drop shadow when a second-level (subsection) node is opened
	$: dropShadowClass = data.isSubsection && data.stepsExpanded ? 'drop-shadow-xl' : '';

	// --- New: counts for first-level nodes (subphases and steps) ---
	let subphaseCount: number = 0;
	let totalStepCount: number = 0;
	$: {
		// Only compute for first-level nodes; for subsections, keep counts local
		if (!data.isSubsection) {
			const subphs: any[] = Array.isArray(data.subphases)
				? data.subphases
				: (Array.isArray((data as any).subPhases) ? (data as any).subPhases : []);

			subphaseCount = subphs.length || 0;

			if (subphs.length > 0) {
				// Sum steps across all subphases
				totalStepCount = subphs.reduce((acc, sp) => acc + (Array.isArray(sp?.steps) ? sp.steps.length : 0), 0);
			} else {
				// Fallbacks if subphases not provided
				totalStepCount = typeof data.stepCount === 'number'
					? data.stepCount
					: (Array.isArray(data.steps) ? data.steps.length : 0);
			}
		} else {
			// For subsection nodes, don't show subphase count; step count from detected stepsArray
			subphaseCount = 0;
			totalStepCount = Array.isArray(stepsArray) ? stepsArray.length : 0;
		}

		console.log('[TimelineNode] Counts -> subphases:', subphaseCount, 'steps:', totalStepCount, 'isSubsection:', data.isSubsection);
	}
</script>

<div 
	class="timeline-node-wrapper"
	style="z-index: {zIndex}; position: relative; isolation: isolate;"
>
		<div 
			class={`px-4 py-2 rounded-md backdrop-blur-md flex flex-col problem-node-container ${bgClass} ${dropShadowClass}`}
			style="min-height: {dynamicNodeHeight}px; width: {dynamicNodeWidth}px; height: auto; cursor: default; box-shadow: 0 2px 5px rgba(0,0,0,0.1); transform: translateX({positionOffset}px); position: relative;"
			aria-live="polite"
		>
			{#if hasSteps}
				<button 
					class="summary-section text-left w-full p-0 bg-transparent border-none cursor-pointer"
					on:click={toggleSteps}
					aria-expanded={data.stepsExpanded}
				>
					<div class="flex-grow">
						<p class="text-black text-sm">
							{content || 'Node Content'}
						</p>
					</div>
				</button>
			{:else}
				{#if isFirstLevelClickable}
					<button 
						class="summary-section text-left w-full p-0 bg-transparent border-none"
						on:click={handleMainClick}
						aria-expanded={data?.expanded}
						style="cursor: pointer;"
					>
						<p class="text-black text-sm">
							{content || 'Node Content'}
						</p>
					</button>
				{:else}
					<div class="summary-section flex-grow">
						<p class="text-black text-sm">
							{content || 'Node Content'}
						</p>
					</div>
				{/if}
			{/if}

			{#if data.stepsExpanded && hasSteps}
				<div class="mt-2 pt-2">
					<h5 class="text-gray-800 font-medium text-xs mb-2">Raw Steps:</h5>
					<div class="steps-container flex gap-3 overflow-x-auto pb-2">
						{#each stepsArray as step}
							<div class="step-card bg-white p-2 rounded flex-shrink-0 flex flex-col" style="width: 150px; height: auto;">
								<p class="text-black text-xs leading-relaxed whitespace-pre-wrap break-words flex-grow">{step.text}</p>
								<div class="text-black text-xs font-medium mt-2">Step {step.index + 1}</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<div class="inner mt-auto pt-2 footer-section">
				<div class="w-full flex items-center justify-between">
					<p class="font-medium text-gray-800 text-xs">{footerLabel}</p>
					{#if !data.isSubsection}
						<div class="text-gray-700 text-[10px] font-medium">
							{subphaseCount} subphase{subphaseCount === 1 ? '' : 's'} • {totalStepCount} step{totalStepCount === 1 ? '' : 's'}
						</div>
					{/if}
				</div>
			</div>
		</div>

	<!-- Connection handle at center bottom - stays centered regardless of node width -->
	<Handle
		class="!bg-neutral-400 !border-0"
		type="source"
		position={Position.Bottom}
		id="bottom"
		style="bottom: -2px; left: 50%; transform: translateX(-50%);"
	/>
</div>

