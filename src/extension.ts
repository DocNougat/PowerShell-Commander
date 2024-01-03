import * as vscode from 'vscode';
import { PowershellModuleProvider, Module, TreeItemData } from './PowershellModuleProvider';

export function activate(context: vscode.ExtensionContext) {
    const provider = new PowershellModuleProvider();
    vscode.window.registerTreeDataProvider('powershellModulesView', provider);

    context.subscriptions.push(vscode.commands.registerCommand('extension.showVersions', (module: Module) => {
        vscode.window.showInformationMessage(`Selected module: ${module.name}`);
        // Add code here to do something with the selected module, such as showing its versions
    }));
    context.subscriptions.push(vscode.commands.registerCommand('extension.openCommandDetails', async (commandName: string) => {
        const panel = vscode.window.createWebviewPanel(
            'commandDetails',
            'Command Details',
            vscode.ViewColumn.Beside,
            { enableScripts: true } // Enable JavaScript in the webview
        );
    
        const { parameterSets, defaultParameterSet } = await provider.getCommandDetails(commandName);
    
        let formHtml = `<form><h1>${commandName}</h1><select id="parameterSet" onchange="updateForm()">`;
        for (const parameterSetName of Object.keys(parameterSets).sort()) {
            const selected = parameterSetName === defaultParameterSet ? ' selected' : '';
            formHtml += `<option value="${parameterSetName}"${selected}>${parameterSetName}</option>`;
        }
        formHtml += `</select><br><br><div style="text-align: left;"><input type="submit" value="Copy Command"></div><div id="parameters"></div></form>`;
        formHtml += `<style>
            .parameter-label {
                display: block;
                margin-bottom: 5px;
            }
            .parameter-input {
                margin-bottom: 10px;
            }
        </style>`;
    
        formHtml += `<script>
            const vscode = acquireVsCodeApi();
            const parameterSets = ${JSON.stringify(parameterSets)};
            const commandName = ${JSON.stringify(commandName)};
            function updateForm() {
                const parameterSet = document.getElementById('parameterSet').value;
                const parametersDiv = document.getElementById('parameters');
                parametersDiv.innerHTML = '';
            
                const commonParameters = ['Debug', 'ErrorAction', 'ErrorVariable', 'InformationAction', 'InformationVariable', 'OutBuffer', 'OutVariable', 'PipelineVariable', 'Verbose', 'WarningAction', 'WarningVariable'];
                
                let uniqueParametersHtml = '<div id="uniqueParameters" style="width: 50%; float: left;"><h2>Unique Parameters</h2>';
                let commonParametersHtml = '<div id="commonParameters" style="width: 50%; float: right;"><h2>Common Parameters</h2>';
            
                for (const parameter of parameterSets[parameterSet].requiredParameters) {
                    if (parameter !== '' && !commonParameters.includes(parameter)) {
                        uniqueParametersHtml += '<div><label class="parameter-label"><b>' + parameter + ': </b></label><input class="parameter-input" name="' + parameter + '" required></div>';
                    } else if (parameter !== '') {
                        commonParametersHtml += '<div><label class="parameter-label"><b>' + parameter + ': </b></label><input class="parameter-input" name="' + parameter + '" required></div>';
                    }
                }
                for (const parameter of parameterSets[parameterSet].optionalParameters) {
                    if (parameter !== '' && !commonParameters.includes(parameter)) {
                        uniqueParametersHtml += '<div><label class="parameter-label">' + parameter + ': </label><input class="parameter-input" name="' + parameter + '"></div>';
                    } else if (parameter !== '') {
                        commonParametersHtml += '<div><label class="parameter-label">' + parameter + ': </label><input class="parameter-input" name="' + parameter + '"></div>';
                    }
                }
            
                uniqueParametersHtml += '</div>';
                commonParametersHtml += '</div>';
            
                parametersDiv.innerHTML = uniqueParametersHtml + commonParametersHtml;
            }
            updateForm();
            document.querySelector('form').addEventListener('submit', function(event) {
                event.preventDefault();
                let commandString = commandName;
                for (const input of document.querySelectorAll('input')) {
                    if (input.type !== 'submit' && input.value !== '') {
                        if(input.value == "true" || input.value == "false") {
                            input.value = "$" + input.value;
                        }
                        commandString += ' -' + input.name + ' ' + input.value;
                    }
                }
                navigator.clipboard.writeText(commandString);
            });
        </script>`;
    
        panel.webview.html = formHtml;
    }));
}


export function deactivate() {}