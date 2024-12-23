const fs = require("node:fs");
const path = require("node:path");
const YAML = require("yaml");
const yaml = require("js-yaml");
const colors = require("@colors/colors/safe");
const compareVersions = require("./bin/compareVersions");
const readline = require("readline");
const prompt = require("prompt");

prompt.message = "";
prompt.delimiter = "";

prompt.start();

const prompts = {
    path: {
        name: "path",
        description: colors.yellow("Full path to the game's data folder called \"Resources\" (<export location>/ExportedProject/Assets/Resources):"),
        type: "string",
        required: true,
        default: process.argv[2] || ""
    },
    confirm: {
        name: "confirm",
        description: colors.yellow("Game version is lower than or equal to data version. Do you want to proceed? (y/n):"),
        type: "string",
        required: true,
        pattern: /^[yYnN]$/,
        message: "Please enter 'y' for yes or 'n' for no."
    }
};

async function main() {
    // Prompt for path if not provided
    let inputDir = process.argv[2];
    if (!inputDir) {
        inputDir = (await prompt.get([prompts.path])).path.replaceAll("\"", "");
    }

    const outputDir = path.join(__dirname, "outdata");

    let totalFiles = 0;
    let processedFiles = 0;

    // Function to recursively count files to be processed
    function countFilesRecursively(dir) {
        let count = 0;
        const files = fs.readdirSync(dir);
        files.forEach(file => {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);

            if (stat.isDirectory()) {
                count += countFilesRecursively(filePath);
            } else if (file.endsWith('.prefab') || file.endsWith('.asset') || file.endsWith('.unity') || file.endsWith(".anim")) {
                count++;
            }
        });
        return count;
    }

    // Function to recursively read files from a directory
    function readFilesRecursively(dir) {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);

            if (stat.isDirectory()) {
                // If it's a directory, call the function recursively
                readFilesRecursively(filePath);
            } else if (file.endsWith('.prefab') || file.endsWith('.asset') || file.endsWith(".unity") || file.endsWith(".anim")) {
                // If it's a .prefab or .asset file, parse it
                parseFile(filePath);
                processedFiles++;
                console.clear();
                console.log(`Processed ${colors.yellow(processedFiles + "/" + totalFiles)} files`);
            }
        });
    }

    // Function to parse a single file
    function parseFile(filePath) {
        try {
            const FileData = fs.readFileSync(filePath);
            const MetaData = fs.readFileSync(filePath + ".meta");
            console.log(`Read the file contents: ${filePath}`);
            const ParsedData = YAML.parseAllDocuments(FileData.toString());
            ParsedData[0].set("guid", MetaData.toString().split("\n")[1].slice(6));
            console.log(`Parsed the data from: ${filePath}`);

            // Create output directory structure based on input directory
            const relativePath = filePath.replace(inputDir, "");
            const outputFilePath = path.join(outputDir, relativePath.replace(/\.prefab$|\.asset|\.anim$/, '.json'));

            // Create the output directory if it doesn't exist
            fs.mkdirSync(path.dirname(outputFilePath), { recursive: true });

            // Write the parsed data to a JSON file
            fs.writeFileSync(outputFilePath, JSON.stringify(ParsedData, null, 2));
        } catch (error) {
            console.error(`Error processing file ${filePath}:`, error);
            fs.rmSync(path.join(__dirname, "gameVersion.json"));
            process.exit(1);
        }
    }

    // Function to parse the "Scenes" folder
    async function readScenes(dir) {
        processedFiles = 0;
        const files = fs.readdirSync(dir);

        for (let i = 0; i < files.length; i++) {
            const file  = files[i];
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);

            if (stat.isDirectory()) {
                // Recursively process subdirectories
                await readScenes(filePath);
            } else if (file.endsWith(".unity")) {
                // Parse `.unity` files
                await parseScene(filePath);
                processedFiles++;
                console.clear();
                console.log(`Processed ${colors.yellow(processedFiles + "/" + totalFiles)} files`);
            }
        }
    }

    // Function to parse a single scene file
    async function parseScene(filePath) {
        try {
            const inputStream = fs.createReadStream(filePath, { encoding: "utf-8" });
    
            async function extractMonoBehaviours() {
                const rl = readline.createInterface({
                    input: inputStream,
                    crlfDelay: Infinity,
                });
                
                let documentBuffer = '';
                const monoBehaviours = [];
                
                for await (const line of rl) {
                    // Collect lines into a buffer until we hit the document separator
                    if (line.trim().startsWith('---')) {
                    // Parse the current document buffer
                    if (documentBuffer.trim().length > 0) {
                        const doc = yaml.load(documentBuffer.replace("%YAML 1.1\n%TAG !u! tag:unity3d.com,2011:\n", ""));
                        if (doc && doc.MonoBehaviour) {
                            monoBehaviours.push(doc);
                        }
                    }
                        // Reset the buffer for the next document
                        documentBuffer = '';
                    } else {
                        // Accumulate lines into the buffer
                        documentBuffer += `${line}\n`;
                    }
                }
                
                // Handle the last document (if there's no trailing `---`)
                if (documentBuffer.trim().length > 0) {
                    const doc = yaml.load(documentBuffer);
                    if (doc && doc.MonoBehaviour) {
                        monoBehaviours.push(doc);
                    }
                }
                
                return monoBehaviours;
            }
    
            const MetaData = fs.readFileSync(filePath + ".meta");
            console.log(`Read the file contents: ${filePath}`);
            const parsedData = await extractMonoBehaviours();
            parsedData[0].guid = MetaData.toString().split("\n")[1].slice(6);
            console.log(`Parsed scene data from: ${filePath}`);
    
            // Create output directory structure based on input directory
            const relativePath = filePath.replace(inputDir, "").replace(path.join(inputDir, "..", "Scenes"), "Scenes");
            const outputFilePath = path.join(outputDir, relativePath.replace(/\.unity$/, ".json"));
    
            // Ensure the output directory exists
            fs.mkdirSync(path.dirname(outputFilePath), { recursive: true });
    
            // Write the parsed data to a JSON file
            fs.writeFileSync(outputFilePath, JSON.stringify(parsedData, null, 2));
        } catch (error) {
            console.error(`Error processing scene file ${filePath}:`, error);
            fs.rmSync(path.join(__dirname, "gameVersion.json"));
            process.exit(1);
        }
    }

    // Get current data version
    let dataVersion;
    try {
        dataVersion = require(path.join(__dirname, "gameVersion.json")).gameVersion;
    } catch (e) {
        fs.writeFileSync(path.join(__dirname, "gameVersion.json"), "");
    }

    const gameVersion = YAML.parseDocument(fs.readFileSync(path.join(inputDir, "..", "..", "ProjectSettings", "ProjectSettings.asset"), { encoding: "utf-8" })).get("PlayerSettings").get("bundleVersion");

    if (typeof gameVersion === "undefined") {
        console.error("Error: Game version is undefined.");
        process.exit(1); // Exit the program
    } else if (typeof dataVersion === "undefined") {
        // Write gameVersion to gameVersion.json
        fs.writeFileSync("gameVersion.json", JSON.stringify({ gameVersion }, null, 2));
        console.log("Data version is undefined. Game version has been written to gameVersion.json.");
    } else {
        fs.writeFileSync("gameVersion.json", JSON.stringify({ gameVersion }, null, 2));
        const comparison = compareVersions(dataVersion, gameVersion);

        if (comparison < 0) {
            console.log("Data version is lower than Game version. Starting to parse data...");
        } else {
            // Ask for confirmation before proceeding
            const { confirm } = await prompt.get([prompts.confirm]);
            if (confirm.toLowerCase() !== "y") {
                console.log("User chose not to proceed. Exiting.");
                process.exit(0);
            }
        }
    }

    // Count the files to be processed
    console.log("Counting files...");
    totalFiles = countFilesRecursively(inputDir);
    console.log(`Total files to be processed: ${totalFiles}`);

    // Start reading files from the specified directory
    fs.rmSync(path.join(__dirname, "outdata"), { recursive: true, force: true });
    readFilesRecursively(inputDir);
    console.log("Resources folder processed.");
    
    console.log("Counting files...");
    totalFiles = countFilesRecursively(path.join(inputDir, "..", "Scenes"));
    console.log(`Total files to be processed: ${totalFiles}`);
    await readScenes(path.join(inputDir, "..", "Scenes"));
    console.log("Scenes folder processed.")

    if (fs.existsSync(path.join(__dirname, "bin", "cache.json"))) fs.rmSync(path.join(__dirname, "bin", "cache.json"));
    console.log("Finished parsing the data. GUID cache was cleared.");
}

if (require.main == module) {
    main().catch(error => {
        console.error("An error occurred:", error);
        process.exit(1);
    });
}

module.exports = main;