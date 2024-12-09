const fs = require("fs");
const mw = require("nodemw");
const path = require("path");
const config = require("./config");

// Configuration
const USERNAME = config.username; // Replace with your user account username
const PASSWORD = config.password; // Replace with your user account password
const PAGE_TITLE = "Module:ConsumableItems/data";
const FILE_PATH = path.join(__dirname, "luatables", "consumable-items.lua"); // Path to your local file
const VERSION_NAME = require("./gameVersion.json").gameVersion; // Replace with the version name for your edit summary

async function updateConsumables() {
    try {
        const client = new mw({
            protocol: "https",
            server: "atlyss.wiki.gg",
            path: "/",
            username: USERNAME,
            password: PASSWORD
        })

        client.logIn((err, response) => {
            if (err) return console.error(err);

            console.log(`Logged in as ${response.lgusername}`);
            client.getArticle(PAGE_TITLE, (err, data) => {
                if (err) return console.error(err);
    
                const newContent = fs.readFileSync(FILE_PATH, "utf8");
    
                if (data && data.trim() === newContent.trim()) return console.log("No changes detected. Skipping edit.");
    
                client.edit(PAGE_TITLE, newContent, `(Automated Update) Updated data for version ${VERSION_NAME}`, (err, resultData) => {
                    if (err) return console.error(err);
    
                    console.log(`Consumable items data updated to ${VERSION_NAME}`);
                })
            });
        });
    } catch (error) {
        console.error("Error:", error.message);
    }
}

// Export the function for dynamic import or reuse
module.exports = updateConsumables;

// Execute only if the script is run directly
if (require.main === module) {
    (async () => {
        try {
            await updateConsumables();
            console.log("Update completed successfully.");
        } catch (error) {
            console.error("Error during update:", error);
            process.exit(1);
        }
    })();
}