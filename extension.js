const vscode = require('vscode');
const fs = require('fs');
const xml2js = require('xml2js');

function activate(context) {
    console.log('Extension activated');

    const disposable = vscode.commands.registerCommand('dropdown.showSubFamilyDevices', async function () {
		if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
            vscode.window.showErrorMessage('Please open a workspace first');
            return;
        }

        const xmlFilePath = vscode.workspace.workspaceFolders[0].uri.fsPath + '/devices.pdsc';
        console.log('Attempting to read file from:', xmlFilePath);

        if (!fs.existsSync(xmlFilePath)) {
            vscode.window.showErrorMessage(`The devices.pdsc file does not exist at: ${xmlFilePath}`);
            return;
        }

        const xmlContent = fs.readFileSync(xmlFilePath, 'utf-8');
        const parser = new xml2js.Parser();

        let parsedData;
        try {
            parsedData = await parser.parseStringPromise(xmlContent);
            console.log('Parsed Data Structure:', JSON.stringify(parsedData, null, 2));

           
            if (!parsedData.package) {
                vscode.window.showErrorMessage('Invalid .pdsc file: Missing package element');
                return;
            }

        
            if (!parsedData.package.devices) {
                vscode.window.showErrorMessage('Invalid .pdsc file: Missing devices element');
                return;
            }

            const devicesData = parsedData.package.devices[0];

            if (!devicesData.family) {
                vscode.window.showErrorMessage('Invalid .pdsc file: Missing family element');
                return;
            }

            const subFamilies = devicesData.family.flatMap(family => 
                family.subFamily ? family.subFamily.map(subFamily => ({
                    label: subFamily.$.DsubFamily,
                    devices: subFamily.device ? subFamily.device.map(device => ({
                        label: device.$.Dname,
                        description: device.description ? device.description[0] : 'No description available'
                    })) : []
                })) : []
            );

            console.log('Extracted SubFamilies:', JSON.stringify(subFamilies, null, 2));

            if (subFamilies.length === 0) {
                vscode.window.showErrorMessage('No subfamilies found in the .pdsc file');
                return;
            }

            // Show subFamily dropdown
            const selectedSubFamily = await vscode.window.showQuickPick(
                subFamilies.map(subFamily => ({ label: subFamily.label })),
                { placeHolder: 'Select a SubFamily' }
            );

            if (!selectedSubFamily) return;

            // Find devices under the selected subFamily
            const selectedDevices = subFamilies.find(subFamily => 
                subFamily.label === selectedSubFamily.label
            ).devices;

            // Show device dropdown
            const selectedDevice = await vscode.window.showQuickPick(
                selectedDevices.map(device => ({ label: device.label })),
                { placeHolder: 'Select a Device' }
            );

            if (!selectedDevice) return;

            // Find and display the description of the selected device
            const deviceDescription = selectedDevices.find(device => 
                device.label === selectedDevice.label
            ).description;
            vscode.window.showInformationMessage(`Description: ${deviceDescription}`);

        } catch (error) {
            console.error('Error parsing .pdsc file:', error);
            vscode.window.showErrorMessage('Failed to parse the .pdsc file: ' + error.message);
            return;
        }
    });

    context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};