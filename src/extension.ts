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
            `${commandName} Details`,
            vscode.ViewColumn.Two,
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

                const sortedRequiredParameters = parameterSets[parameterSet].requiredParameters.sort((a, b) => a.name.localeCompare(b.name));
                const sortedOptionalParameters = parameterSets[parameterSet].optionalParameters.sort((a, b) => a.name.localeCompare(b.name));

                for (const parameter of sortedRequiredParameters) {
                    if (parameter.name !== '' && !commonParameters.includes(parameter.name)) {
                        if (parameter.validateSet && parameter.validateSet.length > 0) {
                            uniqueParametersHtml += '<div><label class="parameter-label"><b>' + parameter.name + '*: </b></label><select class="parameter-input" name="' + parameter.name + '" title="' + parameter.type + '">';
                            for (const option of parameter.validateSet) {
                                uniqueParametersHtml += '<option value="' + option + '">' + option + '</option>';
                            }
                            uniqueParametersHtml += '</select></div>';
                        } else if (parameter.type === 'SwitchParameter') {
                            uniqueParametersHtml += '<div><label class="parameter-label"><b>' + parameter.name + '*: </b></label><input class="parameter-input" name="' + parameter.name + '" title="' + parameter.type + '" type="checkbox" checked></div>';
                        } else {
                            uniqueParametersHtml += '<div><label class="parameter-label"><b>' + parameter.name + '*: </b></label><input class="parameter-input" name="' + parameter.name + '" title="' + parameter.type + '" required></div>';
                        }
                    } else if (parameter.name !== '') {
                        if (parameter.validateSet && parameter.validateSet.length > 0) {
                            commonParametersHtml += '<div><label class="parameter-label"><b>' + parameter.name + '*: </b></label><select class="parameter-input" name="' + parameter.name + '" title="' + parameter.type + '">';
                            for (const option of parameter.validateSet) {
                                commonParametersHtml += '<option value="' + option + '">' + option + '</option>';
                            }
                            commonParametersHtml += '</select></div>';
                        } else if (parameter.type === 'SwitchParameter') {
                            commonParametersHtml += '<div><label class="parameter-label"><b>' + parameter.name + '*: </b></label><input class="parameter-input" name="' + parameter.name + '" title="' + parameter.type + '" type="checkbox" checked></div>';
                        } else {
                            commonParametersHtml += '<div><label class="parameter-label"><b>' + parameter.name + '*: </b></label><input class="parameter-input" name="' + parameter.name + '" title="' + parameter.type + '" required></div>';
                        }
                    }
                }
                for (const parameter of sortedOptionalParameters) {
                    if (parameter.name !== '' && !commonParameters.includes(parameter.name)) {
                        if (parameter.validateSet && parameter.validateSet.length > 0) {
                            uniqueParametersHtml += '<div><label class="parameter-label">' + parameter.name + ': </label><select class="parameter-input" name="' + parameter.name + '" title="' + parameter.type + '">';
                            uniqueParametersHtml += '<option value="">None</option>';
                            for (const option of parameter.validateSet) {
                                uniqueParametersHtml += '<option value="' + option + '">' + option + '</option>';
                            }
                            uniqueParametersHtml += '</select></div>';
                        } else if (parameter.type === 'SwitchParameter') {
                            uniqueParametersHtml += '<div><label class="parameter-label">' + parameter.name + ': </label><input class="parameter-input" name="' + parameter.name + '" title="' + parameter.type + '" type="checkbox"></div>';
                        } else {
                            uniqueParametersHtml += '<div><label class="parameter-label">' + parameter.name + ': </label><input class="parameter-input" name="' + parameter.name + '" title="' + parameter.type + '"></div>';
                        }
                    } else if (parameter.name !== '') {
                        if (parameter.validateSet && parameter.validateSet.length > 0) {
                            commonParametersHtml += '<div><label class="parameter-label">' + parameter.name + ': </label><select class="parameter-input" name="' + parameter.name + '" title="' + parameter.type + '">';
                            for (const option of parameter.validateSet) {
                                commonParametersHtml += '<option value="' + option + '">' + option + '</option>';
                            }
                            commonParametersHtml += '</select></div>';
                        } else if (parameter.type === 'SwitchParameter') {
                            commonParametersHtml += '<div><label class="parameter-label">' + parameter.name + ': </label><input class="parameter-input" name="' + parameter.name + '" title="' + parameter.type + '" type="checkbox"></div>';
                        } else {
                            commonParametersHtml += '<div><label class="parameter-label">' + parameter.name + ': </label><input class="parameter-input" name="' + parameter.name + '" title="' + parameter.type + '"></div>';
                        }
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
                for (const input of document.querySelectorAll('input, select')) {
                    if (input.type !== 'submit' && input.value !== '' && input.id !== 'parameterSet') {
                        if (input.type === 'checkbox') {
                            if (input.checked) {
                                commandString += ' -' + input.name;
                            }
                        } else {
                            if (input.value.includes(' ')) {
                                commandString += ' -' + input.name + ' "' + input.value + '"';
                            } else {
                                if (input.value == "true" || input.value == "false") {
                                    input.value = "$" + input.value;
                                }
                                commandString += ' -' + input.name + ' ' + input.value;
                            }
                        }
                    }
                }
                navigator.clipboard.writeText(commandString);
            });
        </script>`;

        panel.webview.html = formHtml;
    }));
}


export function deactivate() {}