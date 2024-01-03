import * as vscode from 'vscode';
import * as childProcess from 'child_process';

export interface Module {
    type: 'module';
    name: string;
}

export interface Command {
    type: 'command';
    name: string;
}

export type TreeItemData = Module | Command;

export class PowershellModuleProvider implements vscode.TreeDataProvider<TreeItemData> {
    private _onDidChangeTreeData: vscode.EventEmitter<Module | undefined> = new vscode.EventEmitter<Module | undefined>();
    readonly onDidChangeTreeData: vscode.Event<Module | undefined> = this._onDidChangeTreeData.event;

    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }
    private getExportedCommands(moduleName: string): Promise<string[]> {
        return new Promise((resolve, reject) => {
            try {
                // Log the module name
                console.log(`Getting exported commands for module ${moduleName}`);
    
                // Construct and log the actual command being executed
                const commandToExecute = `powershell.exe -Command "Get-Command -Module ${moduleName} | Select-Object Name | Sort-Object Name"`;
                console.log("Executing PowerShell Command:", commandToExecute);
    
                // Execute the PowerShell command
                let psOutput = childProcess.execSync(commandToExecute).toString().trim();
                console.log("PowerShell Output:", psOutput);
    
                if (!psOutput) {
                    console.log("No output from PowerShell command.");
                    return resolve([]);
                }
    
                // Parse and resolve the command names
                const commandLines = psOutput.split('\n').slice(2);
                let commands = commandLines.map(line => line.trim());
                resolve(commands);
            } catch (error) {
                // Log the error
                console.error("Error executing PowerShell command:", error);
                reject(error);
            }
        });
    }
    getTreeItem(element: TreeItemData): vscode.TreeItem {
        let command;
        switch (element.type) {
            case 'module':
                break;
            case 'command':
                command = {
                    command: 'extension.openCommandDetails',
                    arguments: [element.name],
                    title: 'Split Editor Down'
                };
                break;
        }
        return {
            label: element.name,
            collapsibleState: element.type === 'command' ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Collapsed,
            command: command
        };
    }

    getChildren(element?: TreeItemData): Thenable<TreeItemData[]> {
        if (!element) {
            return this.getModules();
        } else if (element.type === 'module') {
            return this.getExportedCommands(element.name).then(commands => {
                return commands.map(commandName => ({ type: 'command', name: commandName }));
            });
        } else {
            // If we have a command, there are no children
            return Promise.resolve([]);
        }
    }
    getCommandDetails(commandName: string): Promise<{ parameterSets: { [name: string]: { requiredParameters: {name: string, type: string}[], optionalParameters: {name: string, type: string}[] } }, defaultParameterSet: string }> {
        return new Promise((resolve, reject) => {
            try {
                const commandToExecute = `powershell.exe -Command "(Get-Command ${commandName}).ParameterSets | ForEach-Object { $_.Name + '|' + ($_.Parameters | Where-Object { $_.IsMandatory } | ForEach-Object { $_.Name + ',' + $_.ParameterType }) + '|' + ($_.Parameters | Where-Object { !$_.IsMandatory } | ForEach-Object { $_.Name + ',' + $_.ParameterType }) }"`;
                let psOutput = childProcess.execSync(commandToExecute).toString().trim();
                console.log("PowerShell Output:", psOutput);
                const parameterSetsLines = psOutput.split('\n');
    
                const parameterSets: { [name: string]: { requiredParameters: {name: string, type: string}[], optionalParameters: {name: string, type: string}[] } } = {};
                let defaultParameterSet = '';
    
                for (const line of parameterSetsLines) {
                    const [name, requiredParametersString, optionalParametersString] = line.split('|');
                    const requiredParameters = requiredParametersString.split(' ').map(param => {
                        const [paramName, paramType] = param.split(',');
                        return {name: paramName.trim(), type: paramType.trim()};
                    });
                    const optionalParameters = optionalParametersString.split(' ').map(param => {
                        const [paramName, paramType] = param.split(',');
                        return {name: paramName.trim(), type: paramType.trim()};
                    });
    
                    parameterSets[name] = { requiredParameters, optionalParameters };
    
                    if (name === '(Default)') {
                        defaultParameterSet = name;
                    }
                }
    
                resolve({ parameterSets, defaultParameterSet });
            } catch (error) {
                console.error("Error executing PowerShell command:", error);
                reject(error);
            }
        });
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
                const parts = line.trim().split(/\s+/);
                const name = parts[0];
            
                return {
                    type: 'module' as const,
                    name: name,
                };
            });
    
            resolve(modules);
        });    
    }
}