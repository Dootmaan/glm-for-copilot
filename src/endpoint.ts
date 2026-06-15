import { ENDPOINTS, EXTERNAL_URLS } from './consts';
import { getApiMode, getBaseUrlOverride, getRegion } from './config';

export function normalizeBaseUrl(url: string): string {
	return url.trim().replace(/\/+$/, '');
}

/**
 * Resolve the chat-completions base URL from settings.
 * Override wins; otherwise derive from apiMode (+ region for standard mode).
 */
export function resolveBaseUrl(): string {
	const override = getBaseUrlOverride();
	if (override) {
		return normalizeBaseUrl(override);
	}
	if (getApiMode() === 'coding-plan') {
		return ENDPOINTS.codingPlan;
	}
	return getRegion() === 'china' ? ENDPOINTS.standardChina : ENDPOINTS.standardInternational;
}

/** The key-management page that matches the current apiMode/region. */
export function resolveKeyPageUrl(): string {
	if (getApiMode() === 'coding-plan') {
		return EXTERNAL_URLS.codingPlanKeys;
	}
	return getRegion() === 'china'
		? EXTERNAL_URLS.standardKeysChina
		: EXTERNAL_URLS.standardKeysInternational;
}
