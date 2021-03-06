import { execFile, execFileSync, execSync } from "child_process";
import { app, BrowserWindow, ipcMain } from "electron";
import * as fs from "fs";
import * as getPort from "get-port";
import * as path from "path";
// apparently needed in some cases on macOS:
// however, doesn't have d.ts definitions so needs to be imported via a require.
const fixPath = require("fix-path");
fixPath();

let mainWindow: Electron.BrowserWindow;

function makeID(length: number): string {
	if (length < 0) {
		return "";
	}
	let result = "";
	const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	for (let i = 0; i < length; i++) {
		result += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return result;
}

function nymClientBinary() {
	switch (process.platform) {
		case "darwin": return "nym_client_osx";
		case "linux": return "nym_client_linux";
		case "win32": return "nym_client_windows";
		default: throw Error("Could not detect operating system type.");
	}
}

function sleep(ms: any) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

async function onReady() {
	if (app.isPackaged) {
		process.argv.unshift(""); // temp workaround
	}

	let wasIDLoaded = false;
	let nymID: string;
	if (process.argv.length > 2) {
		nymID = process.argv[2];
	} else {
		// see if anything is saved locally
		try {
			const data: string | Buffer = fs.readFileSync("savedID.nymchat");
			if (data.length > 0) {
				console.log("Loaded ID from the file!");
				nymID = data.toString();
				wasIDLoaded = true;
			} else {
				console.log("Generated fresh ID!");
				nymID = makeID(16);
			}
		} catch (e) {
			console.log("Generated fresh ID!");
			nymID = makeID(16);
		}
	}
	let nymPort: string;
	if (process.argv.length > 3) {
		nymPort = process.argv[3];
	} else {
		const nymPortNum = await getPort();
		nymPort = nymPortNum.toString();
	}

	console.log(`Chosen nym client ID: ${nymID}`);
	console.log(`Chosen port: ${nymPort}`);

	if (!wasIDLoaded) {
		// save the id for future use, if exists, simply overwrite it
		fs.writeFileSync("savedID.nymchat", nymID);
		console.log("Saved the id!");

		const out = execFileSync(path.resolve(__dirname, nymClientBinary()), ["init", "--id", nymID]);
		console.log(out.toString());
	}

	console.log(path.resolve(__dirname, nymClientBinary()));
	console.log(["websocket", "--id", nymID, "--port", nymPort]);
	const nymClient = execFile(
		path.resolve(__dirname, nymClientBinary()),
		["websocket", "--id", nymID, "--port", nymPort], // TODO: #1
		{},
		(
			(error: Error | null, stdout: string | Buffer, stderr: string | Buffer) => {
				if (error) {
					console.log("MY ERROR" + error);
					if (error.killed === true) {
						// we killed it so we can ignore the error
						console.log("Killed nym-mixnet-client process.");
					} else {
						throw error;
					}
				}
			}),
	);

	nymClient.on("error", (err: Error) => {
		throw new Error(`Error when handling nym-mixnet-client: ${err}`);
	});

	await sleep(7500);

	// listen for port requests from window we're about to spawn
	ipcMain.once("port", (event) => {
		event.returnValue = nymPort;
	});

	// Create the browser window.
	mainWindow = new BrowserWindow({
		height: 1000,
		webPreferences: {
			nodeIntegration: true,
		},
		width: 800,
	});


	// and load the index.html of the app.
	mainWindow.loadFile(path.resolve(__dirname, "index.html"));

	// Open the DevTools.
	if (!app.isPackaged) {
		mainWindow.webContents.openDevTools();
	}

	mainWindow.on("close", () => {
		app.quit();
	});

	app.on("quit", () => {
		nymClient.kill("SIGINT");
	});
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", onReady);

// Quit when all windows are closed.
app.on("window-all-closed", () => {
	// On OS X it is common for applications and their menu bar
	// to stay active until the user quits explicitly with Cmd + Q
	if (process.platform !== "darwin") {
		app.quit();
	}
});

app.on("activate", () => {
	// On OS X it"s common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if (mainWindow === null) {
		onReady();
	}
});

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
