const fs = require("node:fs");
const path = require("node:path");
const itemRarities = require("./bin/itemRarities");

const inputDir = path.join(__dirname, "outdata", "_item", "03_trade");
const outputDir = path.join(__dirname, "luatables");

const filesList = fs.readdirSync(inputDir);

let luaTable = "return {\n\t";

filesList.forEach(file => {
    const data = require(path.join(inputDir, file))[0]?.MonoBehaviour;

    if (!data) return console.log(`File ${file} doesn't contain any MonoBehaviour`);

    const description = data._itemDescription.replaceAll("\n", "\\n").replaceAll("</color>", "</span>").replace(/\<color=(\w*)\>/g, `<span style=\\"color: $1;\\">`);

    luaTable += `["${data._itemName}"] = {\n\t\t`;

    luaTable += `name = "${data._itemName}",\n\t\t`;
    luaTable += `description = "${description}",\n\t\t`;
    luaTable += `rarity = "${itemRarities[data._itemRarity]}",\n\t\t`;
    luaTable += `maxStack = ${data._maxStackAmount},\n\t\t`;
    luaTable += `price = ${data._vendorCost},\n\t`;

    luaTable += `},\n\t`;

    console.log(`Added Trade Item [${data._itemName}] to lua table...`);
});

luaTable = luaTable.slice(0, -1) + `}`;

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, "trade-items.lua"), luaTable);
console.log("Finished exporting lua table for Trade Items");