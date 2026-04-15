<script lang="ts">
    type PhaseInfo = {
        name: string;
        steps: number;
        color: string;
        percentage: number;
    };
    export let phaseDistributionData: PhaseInfo[] = [];
</script>

{#if phaseDistributionData.length > 0}
    <div class="pt-2">
        <h3 class="block text-sm font-medium text-gray-700 mb-1">Phase Step Distribution</h3>
        
        <!-- Combined Progress Bar -->
        <div class="w-full bg-gray-200 rounded-full h-4 flex overflow-hidden dark:bg-gray-700">
            {#each phaseDistributionData as phase (phase.name)}
                <div
                    class="{phase.color} h-full"
                    style="width: {phase.percentage}%;"
                    title="{phase.name}: {phase.steps} steps ({phase.percentage.toFixed(1)}%)"
                >
                    <span class="sr-only">{phase.name}: {phase.steps} steps ({phase.percentage.toFixed(1)}%)</span>
                </div>
            {/each}
        </div>

        <!-- Optional: Legend for the combined bar -->
        <div class="mt-2 space-y-1">
            {#each phaseDistributionData as phase (phase.name)}
                <div class="flex items-center text-xs text-gray-600">
                    <span class="w-3 h-3 rounded-sm mr-2 {phase.color}"></span>
                    <span class="truncate pr-1" title={phase.name}>{phase.name}</span>
                    <span class="ml-auto whitespace-nowrap">{phase.steps} steps ({phase.percentage.toFixed(1)}%)</span>
                </div>
            {/each}
        </div>
    </div>
{/if}