import * as vscode from 'vscode';
import { AuthManager } from '../auth';
import { VENDOR_ID } from '../consts';
import { logger } from '../logger';
import { GLMChatProvider } from '../provider';

export async function registerProvider(context: vscode.ExtensionContext): Promise<GLMChatProvider> {
	const authManager = new AuthManager(context);
	const provider = new GLMChatProvider(context, authManager);
	context.subscriptions.push(
		vscode.commands.registerCommand('glm-copilot.setApiKey', () => provider.configureApiKey()),
		vscode.commands.registerCommand('glm-copilot.clearApiKey', () => provider.clearApiKey()),
		vscode.lm.registerLanguageModelChatProvider(VENDOR_ID, provider),
	);
	await activateCopilotChat();
	provider.refreshModelPicker();
	return provider;
}

async function activateCopilotChat(): Promise<void> {
	try {
		await vscode.extensions.getExtension('github.copilot-chat')?.activate();
	} catch (error) {
		logger.warn('Copilot Chat activation unavailable; model picker refresh may be delayed', error);
	}
}
