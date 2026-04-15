import { describe, test, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/svelte';
import Page from './+page.svelte';

describe('/+page.svelte', () => {
	test('renders controls: diagram and layout selectors', () => {
		render(Page);
		expect(screen.getByLabelText('Select Diagram')).toBeInTheDocument();
		expect(screen.getByLabelText('Layout')).toBeInTheDocument();
	});
});
