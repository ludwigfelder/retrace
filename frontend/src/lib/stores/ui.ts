import { writable } from 'svelte/store';

// Shared store for sidebar open/closed state
export const sidebarOpen = writable<boolean>(true);
