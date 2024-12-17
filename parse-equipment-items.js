const fs = require("node:fs");
const path = require("node:path");
const itemRarities = require("./bin/itemRarities");
const findAssetByGuid = require("./bin/findAssetById");

const inputDir = path.join(__dirname, "outdata", "_item", "01_equipment");
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
    if (itemName.includes("HELM")) return "Helm";
    else if (itemName.includes("CAPE")) return "Cape";
    else if (itemName.includes("CHESTPIECE")) return "Chestpiece";
    else if (itemName.includes("LEGGINGS")) return "Leggings";
    else if (itemName.includes("SHIELD")) return "Shield";
    else if (itemName.includes("RING")) return "Ring";
    else if (itemName.includes("Katars")) return "Katars";
    else if (itemName.includes("Ranged")) return "Ranged";
    else if (itemName.includes("Range Weapon")) return "Ranged";
    else if (itemName.includes("Heavy Melee")) return "Heavy Melee";
    else if (itemName.includes("Melee")) return "Melee";
    else if (itemName.includes("Polearm")) return "Polearm";
    else if (itemName.includes("Magic Scepter")) return "Scepter";
    else if (itemName.includes("Magic Bell")) return "Bell";
    
    return "";
}

function processFile(filePath) {
    const data = require(filePath)[0]?.MonoBehaviour;

    if (!data || !data._itemName) return console.log(`File ${filePath} doesn't contain any MonoBehaviour`);

    const description = data._itemDescription ? data._itemDescription.replaceAll("\n", "\\n").replaceAll("</color>", "</span>").replace(/\<color=(\w*)\>/g, `<span style=\\"color: $1;\\">`) : "";

    let enchantmentItem = "";
    if (data._statModifierCost._scriptItem.guid) {
        console.log(`Searching for asset with guid ${data._statModifierCost._scriptItem.guid}...`)
        enchantmentItem = findAssetByGuid(data._statModifierCost._scriptItem.guid)?._itemName ?? "";
    }

    let classRequirement = "Any";
    if (data._classRequirement?.guid) {
        console.log(`Searching for asset with guid ${data._classRequirement.guid}...`)
        classRequirement = findAssetByGuid(data._classRequirement.guid)?._className;
    }

    luaTable += `["${data._itemName}"] = {\n\t\t`;
    luaTable += `type = "${getType(data.m_Name)}",\n\t\t`;
    luaTable += `name = "${data._itemName}",\n\t\t`;
    luaTable += `description = "${description}",\n\t\t`;
    luaTable += `level = ${data._equipmentLevel},\n\t\t`;
    luaTable += `class = "${classRequirement}",\n\t\t`;
    luaTable += `stats = {\n\t\t\t`;
    luaTable += `maxHealth = ${data._statArray._maxHealth},\n\t\t\t`;
    luaTable += `maxMana = ${data._statArray._maxMana},\n\t\t\t`;
    luaTable += `maxStamina = ${data._statArray._maxStamina},\n\t\t\t`;
    luaTable += `experience = ${data._statArray._experience},\n\t\t\t`;
    luaTable += `attackPower = ${data._statArray._attackPower},\n\t\t\t`;
    luaTable += `dexPower = ${data._statArray._dexPower},\n\t\t\t`;
    luaTable += `magicPower = ${data._statArray._magicPower},\n\t\t\t`;
    luaTable += `criticalRate = ${data._statArray._criticalRate},\n\t\t\t`;
    luaTable += `magicCriticalRate = ${data._statArray._magicCriticalRate},\n\t\t\t`;
    luaTable += `defense = ${data._statArray._defense},\n\t\t\t`;
    luaTable += `magicDefense = ${data._statArray._magicDefense},\n\t\t\t`;
    luaTable += `evasion = ${data._statArray._evasion},\n\t\t`;
    luaTable += `},\n\t\t`;
    luaTable += `enchantment = {\n\t\t\t`;
    luaTable += `item = "${enchantmentItem}",\n\t\t\t`;
    luaTable += `amount = ${data._statModifierCost?._scriptItemQuantity ?? 0},\n\t\t`;
    luaTable += `},\n\t\t`;

    if (data._weaponDamage) {
        let element = "Normal";
        if (data._combatElement?.guid) {
            console.log(`Searching for asset with guid ${data._combatElement.guid}...`);
            element = findAssetByGuid(data._combatElement.guid)._elementName;
        }

        const minPower = data._readonlyDamageRange.x;
        const maxPower = data._readonlyDamageRange.true;

        luaTable += `weapon = {\n\t\t\t`;
        luaTable += `element = "${element}",\n\t\t\t`;
        luaTable += `minBase = ${Math.trunc(minPower)},\n\t\t\t`;
        luaTable += `maxBase = ${Math.trunc(maxPower)},\n\t\t\t`;
        luaTable += `},\n\t\t`;
    } else if (data._blockDamageThreshold) luaTable += `blockDamage = ${data._blockDamageThreshold},\n\t\t`;

    luaTable += `rarity = "${itemRarities[data._itemRarity]}",\n\t\t`;
    luaTable += `dye = ${data._canDyeArmor == 1 ? true : false},\n\t\t`;
    luaTable += `maxStack = ${data._maxStackAmount},\n\t\t`;
    luaTable += `price = ${data._vendorCost},\n\t`;
    luaTable += `},\n\t`;

    console.log(`Added Equipment Item [${data._itemName}] to lua table...`);
}

let luaTable = "return {\n\t";
readDirectory(inputDir);
luaTable = luaTable.slice(0, -1) + `}`; // Remove the last \n and close the table

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, "equipment-items.lua"), luaTable);
console.log("Finished exporting lua table for Equipment Items");
