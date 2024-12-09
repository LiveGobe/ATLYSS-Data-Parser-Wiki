const fs = require("node:fs");
const path = require("node:path");
const itemRarities = require("./bin/itemRarities");

const inputDir = path.join(__dirname, "outdata", "_item", "02_consumable");
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

function getType(itemName) {
    if (itemName.includes("CLASSTOME")) return "Class Tome";
    else if (itemName.includes("DYE")) return "Dye";
    else if (itemName.includes("SKILLSCROLL")) return "Skill Scroll";
    else if (itemName.includes("STATUSCONSUMABLE")) return "Status";
    
    return "";
}

function processFile(filePath) {
    const data = require(filePath)[0]?.MonoBehaviour;

    if (!data || !data._itemName) return console.log(`File ${filePath} doesn't contain any MonoBehaviour`);

    const description = data._itemDescription.replaceAll("\n", "\\n").replaceAll("</color>", "</span>").replace(/\<color=(\w*)\>/g, `<span style=\\"color: $1;\\">`);

    luaTable += `["${data._itemName}"] = {\n\t\t`;
    luaTable += `type = "${getType(data.m_Name)}",\n\t\t`;
    luaTable += `name = "${data._itemName}",\n\t\t`;
    luaTable += `description = "${description}",\n\t\t`;
    luaTable += `rarity = "${itemRarities[data._itemRarity]}",\n\t\t`;
    luaTable += `maxStack = ${data._maxStackAmount},\n\t\t`;
    luaTable += `price = ${data._vendorCost},\n\t\t`;
    luaTable += `cooldown = ${data._consumableCooldown},\n\t\t`;
    luaTable += `health = ${data._healthApply ?? 0},\n\t\t`;
    luaTable += `mana = ${data._manaApply ?? 0},\n\t\t`;
    luaTable += `stamina = ${data._staminaApply ?? 0},\n\t\t`;
    luaTable += `experience = ${data._expGain ?? 0},\n\t`;
    luaTable += `},\n\t`;

    console.log(`Added Consumable Item [${data._itemName}] to lua table...`);
}

let luaTable = "return {\n\t";
readDirectory(inputDir);
luaTable = luaTable.slice(0, -1) + `}`; // Remove the last \n and close the table

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, "consumable-items.lua"), luaTable);
console.log("Finished exporting lua table for Consumable Items");
