<script lang="ts">
	import { Handle, Position } from '@xyflow/svelte';
	
	// Node props for main phase bar sections
	export let data: {
		phaseName: string;
		nodeType: string;
		color: string;
		width: number;
		height: number;
		isMainPhaseSection: boolean;
		expanded?: boolean;
		stepCount?: number;
		percentage?: number;
		subPhases?: Array<{
			name: string;
			steps: number;
			color: string;
			percentage: number;
			[key: string]: any;
		}>;
		subPhaseIndex?: number; // For subsections
	};
	// svelte-ignore export_let_unused
	export let id: string;
	export let selected = false;
	export let zIndex = 1;
	
	// Get the expansion and collapse handlers from context
	import { getContext } from 'svelte';
	const expandPhaseSection = getContext<(sectionId: string, subPhases: any[]) => void>('expandPhaseSection');
	const collapsePhaseSection = getContext<(sectionId: string) => void>('collapsePhaseSection');
	const handleSubsectionClick = getContext<(nodeId: string) => void>('handleSubsectionClick');
	
	$: phaseName = (data.phaseName || '').replace(/_/g, ' ');
	$: color = data.color || '#e5e7eb';
	$: width = data.width || 100;
	$: height = data.height || 60;
	$: stepCount = data.stepCount || 0;
	$: percentage = data.percentage || 0;
	$: isMainPhaseSection = data.isMainPhaseSection;
	$: expanded = data.expanded || false;
	$: subPhases = data.subPhases || [];
	$: subPhaseIndex = data.subPhaseIndex;
	$: canExpand = isMainPhaseSection && !expanded && subPhases.length > 0;
	$: canCollapse = isMainPhaseSection && expanded;
	$: isSubsection = !isMainPhaseSection && subPhaseIndex !== undefined;
	// Double margin for specific main phases (robust match for variants like "Initial Solution % Exploration")
	$: isDoubleMargin = (() => {
		const n = phaseName.trim().toLowerCase();
		return isMainPhaseSection && (n.includes('solution') || n.includes('final answer'));
	})();

	// Debug logging for expansion capability
	$: {
		if (isMainPhaseSection) {
			console.log(`[PhaseBarSection ${id}] Debug:`, {
				isMainPhaseSection,
				expanded,
				subPhasesLength: subPhases.length,
				canExpand,
				canCollapse,
				subPhases: subPhases
			});
		}
	}

	function handleClick() {
		if (canExpand && expandPhaseSection) {
			console.log(`[PhaseBarSection] Expanding section ${id} with ${subPhases.length} subsections`);
			expandPhaseSection(id, subPhases);
		} else if (canCollapse && collapsePhaseSection) {
			console.log(`[PhaseBarSection] Collapsing section ${id}`);
			collapsePhaseSection(id);
		} else if (isSubsection && handleSubsectionClick) {
			console.log(`[PhaseBarSection] Handling subsection click for ${id}`);
			handleSubsectionClick(id);
		}
	}
</script>

{#if canExpand || canCollapse || isSubsection}
<div class="node-container">
	<button
		class="phase-bar-section expandable"
		style="
			width: {width}px;
			height: {height}px;
			background-color: {color};
			border: 2px solid {selected ? '#1f2937' : 'transparent'};
			z-index: 10;
			cursor: pointer;
			opacity: {isMainPhaseSection && expanded ? 0 : expanded ? 0.6 : 1};
			pointer-events: {isMainPhaseSection && expanded ? 'none' : 'auto'};
		"
		class:selected
		class:main-phase={isMainPhaseSection}
		class:subsection={isSubsection}
		class:expanded
		on:click={handleClick}
		aria-expanded={expanded}
		title={canExpand ? `Click to expand ${subPhases.length} subsections` : 
			   canCollapse ? 'Click to collapse' : 
			   isSubsection ? 'Click to collapse back to main phase' : ''}
	>
		<!-- Phase step count and subphase count -->
		<div class="phase-info">
			{#if stepCount > 0}
				<div class="phase-steps">{stepCount} step{stepCount !== 1 ? 's' : ''}</div>
				<!-- {#if percentage > 0}
					<div class="phase-percentage">{percentage.toFixed(1)}%</div>
				{/if} -->
			{:else}
				<div class="phase-steps">No steps</div>
			{/if}
			{#if isMainPhaseSection && subPhases.length > 0}
				<div class="subphase-count">{subPhases.length} subphase{subPhases.length !== 1 ? 's' : ''}</div>
			{/if}
		</div>
		
		<!-- Connection handles -->
		<Handle
			type="target"
			position={Position.Top}
			id="top"
			style="top: 0px; left: 50%; transform: translateX(-50%); background: {color || '#e5e7eb'}; border: 3px solid #888; opacity: 0.9;"
		/>

	</button>
	
	<!-- Phase name below the node -->
	<div class="phase-name-below" class:always-visible={isMainPhaseSection} class:push-down={isMainPhaseSection && expanded} class:double-margin={isDoubleMargin}>
		<div>{phaseName}</div>
		{#if isMainPhaseSection && percentage > 0}
			<div class="text-gray-500 text-xs font-medium mt-0.5">{percentage.toFixed(1)}%</div>
		{/if}
	</div>
</div>
{:else}
<div class="node-container">
	<div
		class="phase-bar-section"
		style="
			width: {width}px;
			height: {height}px;
			background-color: {color};
			border: 2px solid {selected ? '#1f2937' : 'transparent'};
			z-index: 10;
			cursor: default;
			opacity: {isMainPhaseSection && expanded ? 0 : expanded ? 0.6 : 1};
			pointer-events: {isMainPhaseSection && expanded ? 'none' : 'auto'};
		"
		class:selected
		class:main-phase={isMainPhaseSection}
		class:expanded
	>
		<!-- Phase step count and subphase count -->
		<div class="phase-info">
			{#if stepCount > 0}
				<div class="phase-steps">{stepCount} step{stepCount !== 1 ? 's' : ''}</div>
				{#if percentage > 0}
					<div class="phase-percentage">{percentage.toFixed(1)}%</div>
				{/if}
			{:else}
				<div class="phase-steps">No steps</div>
			{/if}
			{#if isMainPhaseSection && subPhases.length > 0}
				<div class="subphase-count">{subPhases.length} subphase{subPhases.length !== 1 ? 's' : ''}</div>
			{/if}
		</div>
		
		<!-- Connection handles -->
		<Handle
			type="target"
			position={Position.Top}
			id="top"
			style="top: 0px; left: 50%; transform: translateX(-50%); background: {color || '#e5e7eb'}; border: 3px solid #888; opacity: 0.9;"
		/>
		<!-- <Handle
			type="source"
			position={Position.Bottom}
			id="bottom"
			style="bottom: 2px; left: 50%; transform: translateX(-50%); background: {color || '#e5e7eb'}; border: 2px solid white; opacity: 0.8;"
		/> -->
	</div>
	
	<!-- Phase name below the node -->
	<div class="phase-name-below" class:always-visible={isMainPhaseSection} class:push-down={isMainPhaseSection && expanded} class:double-margin={isDoubleMargin}>
		<div>{phaseName}</div>
		{#if isMainPhaseSection && percentage > 0}
			<div class="text-gray-500 text-xs font-medium mt-0.5">{percentage.toFixed(1)}%</div>
		{/if}
	</div>
</div>
{/if}

<style>
	.node-container {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.phase-bar-section {
		position: relative;
		border-radius: 6px;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s ease;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		overflow: hidden;
		background: none; /* Reset button background */
		padding: 0; /* Reset button padding */
		font-family: inherit; /* Inherit font */
	}

	/* Ensure button version looks exactly like div version */
	button.phase-bar-section {
		border: 1px solid rgba(255, 255, 255, 0.2);
		outline: none;
	}

	button.phase-bar-section:focus-visible {
		outline: 2px solid #3b82f6;
		outline-offset: 2px;
	}
	
	/* .phase-bar-section:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	} */
	
	.phase-bar-section.selected {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
		border-color: #1f2937;
	}
	
	.phase-bar-section.main-phase {
		border-radius: 8px;
		font-weight: 600;
		position: relative;
	}
	
	.phase-bar-section.main-phase::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%);
		pointer-events: none;
	}
	
	/* .phase-bar-section.main-phase:hover {
		transform: translateY(-3px);
		box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
	} */
	
	.phase-bar-section.expandable::after {
		position: absolute;
		top: 50%;
		right: 8px;
		transform: translateY(-50%);
		color: #374151;
		font-weight: bold;
		font-size: 16px;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
		pointer-events: none;
	}
	
	.phase-bar-section.expandable:hover::after {
		font-size: 18px;
	}
	
	.phase-bar-section.expanded::after {
		content: '−';
	}
	
	.phase-info {
		text-align: center;
		color: #374151;
		pointer-events: none;
	}
	
	.phase-name-below {
		font-weight: 600;
		font-size: 14px;
		margin-top: 8px;
		text-align: center;
		color: #374151;
		max-width: 120px;
		word-wrap: break-word;
		line-height: 1.2;
		opacity: 0;
		transition: opacity 0.2s ease;
		pointer-events: none;
	}

	.node-container:hover .phase-name-below {
		opacity: 1;
	}

	/* Always show title for first-level (main) nodes */
	.phase-name-below.always-visible {
		margin-top: 48px;
		opacity: 1;
	}

	/* Double margin for specific phases (Initial Solution, Final answer) */
	.phase-name-below.always-visible.double-margin {
		margin-top: 96px;
	}

	/* When expanded (second level open), push the title further down to avoid overlap */
	.phase-name-below.push-down {
		margin-top: 48px;
	}

	/* Ensure push-down respects double margin when applicable */
	.phase-name-below.push-down.double-margin {
		margin-top: 96px;
	}
	
	.phase-steps {
		font-size: 11px;
		opacity: 0.9;
	}
	
	.subphase-count {
		font-size: 10px;
		opacity: 0.7;
		margin-top: 1px;
		color: #6b7280;
	}
	
	.phase-percentage {
		font-size: 10px;
		opacity: 0.8;
		margin-top: 1px;
	}

	/* Below-title percentage for main (first-level) bars */
	/* Removed unused selector .phase-percentage-below */
</style>
