import * as vscode from 'vscode';
import { PowerShellModuleProvider, Module, Version } from './PowershellModuleProvider';

export function activate(context: vscode.ExtensionContext) {
    const provider = new PowerShellModuleProvider();
    vscode.window.registerTreeDataProvider('powershellModulesView', provider);

    context.subscriptions.push(vscode.commands.registerCommand('extension.showVersions', (module: Module) => {
        vscode.window.showInformationMessage(`Selected module: ${module.name}`);
        // Add code here to do something with the selected module, such as showing its versions
    }));

    context.subscriptions.push(vscode.commands.registerCommand('extension.showExportedCommands', (version: Version) => {
        vscode.window.showInformationMessage(`Selected version: ${version.version}`);
        // Add code here to do something with the selected version, such as showing its exported commands
    }));
}

export function deactivate() {}