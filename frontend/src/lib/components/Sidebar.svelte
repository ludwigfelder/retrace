<script lang="ts">
	import { writable, type Writable } from 'svelte/store';
	import MenuIconRaw from '$lib/icons/SidebarIcon.svelte';
	import CloseIconRaw from '$lib/icons/SidebarIcon.svelte';
	const MenuIcon: any = MenuIconRaw; // relax typing for icon components
	const CloseIcon: any = CloseIconRaw;
	import ProcessingStepsBar from './ProcessingStepsBar.svelte';
	import { marked } from 'marked';
	import markedKatex from 'marked-katex-extension';
	import 'katex/dist/katex.min.css';
	import { sidebarOpen } from '$lib/stores/ui';

	export let diagramOptions: string[] = [];
	export let selectedDiagram: string | undefined;
	export let onDiagramChange: (diagram: string) => void = () => {};

	// Layout selection (restricted)
	export let selectedLayoutType: string = 'space-filling-curve';
	export let onLayoutChange: (layoutType: string) => void = () => {};

	// svelte-ignore export_let_unused
	export let onLayout: (direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => void = () => {};

	export let diagramQuestion: string = "Input prompt will appear here.";
	export let diagramResponse: string = "Output will appear here.";

	interface PhaseInfo {
		name: string;
		steps: number;
		color: string;
		percentage: number;
	}
	export let phaseDistributionData: PhaseInfo[] = [];
	export let selectedLevelOfDetail: Writable<string>;

	marked.use(markedKatex({ throwOnError: false }));

	$: if (selectedLayoutType) {
		onLayoutChange(selectedLayoutType);
	}

	$: if (selectedDiagram) {
		onDiagramChange(selectedDiagram);
	}

	function toggleSidebar() {
		sidebarOpen.update((value) => !value);
	}

	function processTextForMarkdown(text: string): string {
		if (!text) return '';
		let processed = text.replace(/\\n/g, '\n');
		processed = processed.replace(/\n(?!\n)/g, '\n\n');
		return processed;
	}
	
	$: htmlDiagramQuestion = marked(processTextForMarkdown(diagramQuestion));
	$: htmlDiagramResponse = marked(processTextForMarkdown(diagramResponse));
</script>

<aside
	class="absolute bottom-0 left-0 w-full bg-gray-100
		   transition-all duration-300 ease-in-out flex flex-col
		   {$sidebarOpen ? 'h-80' : 'h-12'} z-[50]"
	aria-label="Control Panel Sidebar"
	style="pointer-events: auto;"
>
	{#if $sidebarOpen}
		<div class="flex-grow p-4">
			<div class="grid grid-cols-3 gap-4 h-full">
				<!-- Column 1: Selectors and Phase Distribution -->
				<div class="space-y-4">
					<h3 class="text-lg font-semibold text-gray-800">Controls</h3>

					<!-- Diagram Selector -->
					<div>
						<label for="diagram-selector" class="block text-sm font-medium text-gray-700"
							>Select Diagram</label
						>
						<select
							id="diagram-selector"
							bind:value={selectedDiagram}
							class="mt-1 block w-full pl-3 pr-10 py-2 text-base focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white text-gray-900"
						>
							{#if diagramOptions.length === 0}
								<option disabled value={undefined}>No diagrams available</option>
							{/if}
							{#each diagramOptions as optionName (optionName)}
								<option value={optionName}>{optionName}</option>
							{/each}
						</select>
					</div>

					<!-- Layout -->
					<div>
						<label for="layout-selector" class="block text-sm font-medium text-gray-700"
							>Layout</label
						>
						<select
							id="layout-selector"
							bind:value={selectedLayoutType}
							class="mt-1 block w-full pl-3 pr-10 py-2 text-base focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white text-gray-900"
						>
							<option value="space-filling-curve">Space-filling curve</option>
							<option value="sequential-timeline">Sequential timeline</option>
							<option value="raw-trace">Raw trace</option>
						</select>
					</div>

					<!-- Phase Step Distribution -->
					{#if selectedLayoutType !== 'raw-trace' && selectedLayoutType !== 'sequential-timeline'}
						<ProcessingStepsBar {phaseDistributionData} />
					{/if}
				</div>

				<!-- Column 2: Input -->
				<div class="flex flex-col h-full">
					<h3 class="text-lg font-semibold text-gray-800 mb-2">Input</h3>
					<div
						class="w-full sm:text-sm rounded-md bg-gray-50 text-gray-700 p-2 overflow-y-auto prose h-64"
					>{@html htmlDiagramQuestion}</div>
				</div>

				<!-- Column 3: Output -->
				<div class="flex flex-col h-full">
					<div class="flex items-center justify-between">
						<h3 class="text-lg font-semibold text-gray-800 mb-2">Output</h3>
						<!-- Toggle Button -->
						<button
							on:click={toggleSidebar}
							class="p-2 rounded-md text-gray-600 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transform -rotate-90"
							aria-label={$sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
						>
							{#if $sidebarOpen}
								<CloseIcon class="w-6 h-6" />
							{:else}
								<MenuIcon class="w-6 h-6" />
							{/if}
						</button>
					</div>
					<div
						class="w-full sm:text-sm rounded-md bg-gray-50 text-gray-700 p-2 overflow-y-auto prose h-64"
					>{@html htmlDiagramResponse}</div>
				</div>
			</div>
		</div>
	{:else}
		<!-- Collapsed state - show only toggle button -->
		<div class="h-12 flex items-center justify-end pr-4">
			<button
				on:click={toggleSidebar}
				class="p-2 rounded-md text-gray-600 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transform -rotate-90"
				aria-label={$sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
			>
				{#if $sidebarOpen}
					<CloseIcon class="w-6 h-6" />
				{:else}
					<MenuIcon class="w-6 h-6" />
				{/if}
			</button>
		</div>
	{/if}
</aside>

<style>
	/* For Webkit browsers to style the scrollbar if needed */
	.overflow-y-auto::-webkit-scrollbar { width: 8px; }
	.overflow-y-auto::-webkit-scrollbar-track { background: transparent; }
	.overflow-y-auto::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 4px; border: 2px solid transparent; background-clip: content-box; }

	/* Basic styling for rendered markdown, adjust as needed */
	:global(.prose h1),:global(.prose h2),:global(.prose h3),:global(.prose h4),:global(.prose h5),:global(.prose h6){ margin-top: .5em; margin-bottom: .25em; }
	:global(.prose p){ margin-bottom: .5em; }
	:global(.prose ul){ list-style-type: disc; list-style-position: outside; padding-left: 1.5em; margin-bottom: .5em; }
	:global(.prose ol){ list-style-type: decimal; list-style-position: outside; padding-left: 1.5em; margin-bottom: .5em; }
	:global(.prose li){ margin-bottom: .25em; }
	:global(.prose pre){ background-color: #585858; padding: .5em; border-radius: .25em; overflow-x: auto; }
	:global(.prose code){ font-family: monospace; background-color: #585858; color: white; padding: .1em .3em; border-radius: .25em; }
</style>