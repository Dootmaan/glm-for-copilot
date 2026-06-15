import * as vscode from 'vscode';
import { t } from '../i18n';
import type { GLMModel } from '../types';

/** Build the Copilot Chat model picker entry for a GLM model. */
export function toChatInfo(model: GLMModel, hasApiKey: boolean): vscode.LanguageModelChatInformation {
	const detail = resolveModelText(model, 'detail') ?? model.detail;
	const tooltip = resolveModelText(model, 'tooltip');
	return {
		id: model.id,
		name: model.name,
		family: model.family,
		version: model.version,
		detail: hasApiKey ? detail : t('auth.apiKeyRequiredDetail'),
		tooltip: hasApiKey ? tooltip : t('auth.apiKeyRequiredDetail'),
		maxInputTokens: model.maxInputTokens,
		maxOutputTokens: model.maxOutputTokens,
		capabilities: {
			toolCalling: model.capabilities.toolCalling,
			imageInput: model.capabilities.imageInput,
		},
	};
}

function resolveModelText(model: GLMModel, field: string): string | undefined {
	const key = `model.${model.id}.${field}`;
	const translated = t(key);
	return translated !== key ? translated : undefined;
}
