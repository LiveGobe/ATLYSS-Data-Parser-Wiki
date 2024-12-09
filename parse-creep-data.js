const fs = require("node:fs");
const path = require("node:path");
const findAssetByGuid = require("./bin/findAssetById");
const findSpawnLocation = require("./bin/findSpawnLocation");

const inputDir = path.join(__dirname, "outdata", "_prefab", "_entity", "_creep", "_creepdirectory");
const outputDir = path.join(__dirname, "luatables");

function readDirectory(inputFolder) {
    const fList = fs.readdirSync(inputFolder);

    fList.forEach(file => {
        const filePath = path.join(inputFolder, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            // If the item is a directory, recursively read it
            readDirectory(filePath);
        } else {
            // Process the file if it's not a directory
            processFile(filePath);
        }
    });
}

function processFile(filePath) {
    const data = require(filePath)[0]?.MonoBehaviour;

    if (!data || !data._creepName) return console.log(`File ${filePath} doesn't contain any MonoBehaviour`);

    let element = "Normal";
    if (data._combatElement?.guid) {
        console.log(`Searching for asset with guid ${data._combatElement.guid}...`);
        element = findAssetByGuid(data._combatElement.guid)._elementName;
    }

    let type = "Normal"
    if (data._currencyDropBonus > 0 && !data._itemDrops.length) {
        type = "Boss"
    }

    luaTable += `["${data._creepName}"] = {\n\t\t`;
    luaTable += `name = "${data._creepName}",\n\t\t`;
    luaTable += `level = ${data._creepLevel},\n\t\t`;
    luaTable += `type = "${type}",\n\t\t`;
    luaTable += `element = "${element}",\n\t\t`;
    luaTable += `damage = ${data._baseDamage},\n\t\t`;
    luaTable += `stats = {\n\t\t\t`;
    luaTable += `maxHealth = ${data._creepStatStruct._maxHealth},\n\t\t\t`;
    luaTable += `maxMana = ${data._creepStatStruct._maxMana},\n\t\t\t`;
    luaTable += `maxStamina = ${data._creepStatStruct._maxStamina},\n\t\t\t`;
    luaTable += `experience = ${data._creepStatStruct._experience},\n\t\t\t`;
    luaTable += `attackPower = ${data._creepStatStruct._attackPower},\n\t\t\t`;
    luaTable += `dexPower = ${data._creepStatStruct._dexPower},\n\t\t\t`;
    luaTable += `magicPower = ${data._creepStatStruct._magicPower},\n\t\t\t`;
    luaTable += `criticalRate = ${data._creepStatStruct._criticalRate},\n\t\t\t`;
    luaTable += `magicCriticalRate = ${data._creepStatStruct._magicCriticalRate},\n\t\t\t`;
    luaTable += `defense = ${data._creepStatStruct._defense},\n\t\t\t`;
    luaTable += `magicDefense = ${data._creepStatStruct._magicDefense},\n\t\t\t`;
    luaTable += `evasion = ${data._creepStatStruct._evasion},\n\t\t`;
    luaTable += `},\n\t`;
    luaTable += `},\n\t`;

    console.log(`Added Creep [${data._creepName}] to lua table...`);
}

let luaTable = "return {\n\t";
readDirectory(inputDir);
luaTable = luaTable.slice(0, -1) + `}`; // Remove the last \n and close the table

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, "creeps.lua"), luaTable);
console.log("Finished exporting lua table for Creeps");