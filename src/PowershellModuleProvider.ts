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

/**
 * Represents a provider for PowerShell modules in the VSCode tree view.
 */
export class PowershellModuleProvider implements vscode.TreeDataProvider<TreeItemData> {
    /**
     * Event that fires when the tree data changes.
     */
    private _onDidChangeTreeData: vscode.EventEmitter<Module | undefined> = new vscode.EventEmitter<Module | undefined>();
    /**
     * Event that fires when the tree data changes.
     */
    readonly onDidChangeTreeData: vscode.Event<Module | undefined> = this._onDidChangeTreeData.event;

    /**
     * Refreshes the tree data.
     */
    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }

    /**
     * Retrieves the exported commands of a PowerShell module.
     * @param moduleName The name of the module.
     * @returns A promise that resolves to an array of exported command names.
     */
    private getExportedCommands(moduleName: string): Promise<string[]> {
        return new Promise((resolve, reject) => {
            try {
                // Log the module name
    
                // Construct and log the actual command being executed
                const commandToExecute = `pwsh.exe -Command "Get-Command -Module ${moduleName} | Select-Object Name | Sort-Object Name"`;
    
                // Execute the PowerShell command
                let psOutput = childProcess.execSync(commandToExecute).toString().trim();
    
                if (!psOutput) {
                    const commandToExecute = `powershell.exe -Command "Get-Command -Module ${moduleName} | Select-Object Name | Sort-Object Name"`;
                    let psOutput = childProcess.execSync(commandToExecute).toString().trim();
                    if (!psOutput) {
                        return resolve([]);
                    }
                    const commandLines = psOutput.split('\n').slice(2);
                    let commands = commandLines.map(line => line.trim());
                    resolve(commands);
                }
    
                // Parse and resolve the command names
                const commandLines = psOutput.split('\n').slice(2);
                let commands = commandLines.map(line => line.trim());
                resolve(commands);
            } catch (error) {
                // Log the error
                reject(error);
            }
        });
    }

    /**
     * Retrieves the tree item for a given element.
     * @param element The element for which to retrieve the tree item.
     * @returns The tree item representing the element.
     */
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

    /**
     * Retrieves the children of a given element.
     * @param element The element for which to retrieve the children.
     * @returns A promise that resolves to an array of child elements.
     */
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

    /**
     * Retrieves the details of a PowerShell command.
     * @param commandName The name of the command.
     * @returns A promise that resolves to an object containing the parameter sets and the default parameter set.
     */
    getCommandDetails(commandName: string): Promise<{
        parameterSets: {
            [name: string]: {
                requiredParameters: { name: string, type: string, validateSet?: string[] }[],
                optionalParameters: { name: string, type: string, validateSet?: string[] }[]
            }
        },
        defaultParameterSet: string
    }> {
        return new Promise((resolve, reject) => {
            try {
                const commandToExecute = `pwsh.exe -Command "(Get-Command ${commandName}).ParameterSets | % { $_.Name + '|' + ($_.Parameters | ? { $_.IsMandatory } | % { $_.Name + ',' + $_.ParameterType.Name + ',' + (($_.Attributes | ? { $_ -is [System.Management.Automation.ValidateSetAttribute] }).ValidValues -join ';') }) + '|' + ($_.Parameters | ? { !$_.IsMandatory } | % { $_.Name + ',' + $_.ParameterType.Name + ',' + (($_.Attributes | ? { $_ -is [System.Management.Automation.ValidateSetAttribute] }).ValidValues -join ';') }) }"`;
                let psOutput = childProcess.execSync(commandToExecute).toString().trim();
                const parameterSetsLines = psOutput.split('\n');
    
                const parameterSets: {
                    [name: string]: {
                        requiredParameters: { name: string, type: string, validateSet?: string[] }[],
                        optionalParameters: { name: string, type: string, validateSet?: string[] }[]
                    }
                } = {};
                let defaultParameterSet = '';
    
                for (const line of parameterSetsLines) {
                    const [name, requiredParametersString, optionalParametersString] = line.split('|');
                    const requiredParameters = requiredParametersString ? requiredParametersString.split(' ').map(param => {
                        const [paramName, paramType, validateSetString] = param.split(',');
                        return {
                            name: paramName ? paramName.trim() : '',
                            type: paramType ? paramType.trim() : '',
                            validateSet: validateSetString && validateSetString.trim() !== '' ? validateSetString.split(';') : []
                        };
                    }) : [];
                    
                    const optionalParameters = optionalParametersString ? optionalParametersString.split(' ').map(param => {
                        const [paramName, paramType, validateSetString] = param.split(',');
                        return {
                            name: paramName ? paramName.trim() : '',
                            type: paramType ? paramType.trim() : '',
                            validateSet: validateSetString && validateSetString.trim() !== '' ? validateSetString.split(';') : []
                        };
                    }) : [];
    
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

    /**
     * Retrieves the modules available in the PowerShell environment.
     * @returns A promise that resolves to an array of module objects.
     */
    private getModules(): Promise<Module[]> {
        return new Promise(resolve => {
            let psOutput;
            try {
                // Execute the PowerShell command
                psOutput = childProcess.execSync('pwsh.exe -Command "Get-Module -ListAvailable | Group-Object Name | ForEach-Object { $_.Group | Sort-Object Version -Descending | Select-Object -First 1 } | Select-Object Name, Version, ModuleBase"').toString().trim();
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