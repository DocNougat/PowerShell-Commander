import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as childProcess from 'child_process';

export interface Module {
    name: string;
    versions: Version[];
}

export interface Version {
    version: string;
    exportedCommands: string[];
}

export class PowerShellModuleProvider implements vscode.TreeDataProvider<Module | Version> {
    private modules: Module[] | undefined;

    getTreeItem(element: Module | Version): vscode.TreeItem {
        let command: vscode.Command | undefined;
        if ('versions' in element) {
            // When a module is clicked, execute a command to show the versions of the module
            command = {
                command: 'extension.showVersions',
                arguments: [element],
                title: 'Show Versions'
            };
        } else {
            // When a version is clicked, execute a command to show the exported commands of the version
            command = {
                command: 'extension.showExportedCommands',
                arguments: [element],
                title: 'Show Exported Commands'
            };
        }
        return {
            label: 'versions' in element ? element.name : element.version,
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
            command: command
        };
    }

    getChildren(element?: Module | Version): Thenable<(Module | Version)[]> {
        if (!element) {
            // Load the list of modules
            return this.getModules();
        } else if ('versions' in element) {
            // Load the versions of the selected module
            return Promise.resolve(element.versions);
        } else {
            // Load the exported commands of the selected version
            return Promise.resolve(element.exportedCommands.map(command => ({ name: command, version: '', exportedCommands: [] })));
        }
    }

    private getModules(): Promise<Module[]> {
        return new Promise(resolve => {
            let psOutput;
            try {
                // Execute the PowerShell command
                psOutput = childProcess.execSync('pwsh.exe -Command "Get-Module -ListAvailable | Group-Object Name | ForEach-Object { $_.Group | Sort-Object Version -Descending | Select-Object -First 1 } | Select-Object Name, Version, ModuleBase"').toString().trim();
                console.log("PowerShell Output:", psOutput);
            } catch (error) {
                console.error("Error executing PowerShell command:", error);
                return;
            }
    
            // Split the output into lines and skip the first two rows (header and spacer)
            const moduleLines = psOutput.split('\n').slice(2);
    
            // Parse each line to create Module objects
            let modules = moduleLines.map(line => {
                // Split each line by whitespace or custom delimiter to get name, version, and module path
                const parts = line.trim().split(/\s+/);
                const name = parts[0];
                const version = parts[1];
                const moduleBase = parts[2]; // Assuming the path is the third part
    
                return {
                    name: name,
                    versions: [{
                        version: version,
                        exportedCommands: [], // Additional logic may be required to populate this
                    }]
                };
            });
    
            // Assign the parsed modules
            this.modules = modules;
            resolve(this.modules);
        });
    }
}