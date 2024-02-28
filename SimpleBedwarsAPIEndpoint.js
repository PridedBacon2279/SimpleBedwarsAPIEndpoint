const http = require("http");
const url = require("url");
const axios = require("axios");

const hyCache = {};
const mojCache = {};

const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const { query } = parsedUrl;

    try {
        if (query.key && (query.player || query.uuid)) {
            let uuid = query.uuid?.replace("-", "");
            let player = query.player?.toLowerCase();
            if (!uuid && !mojCache.hasOwnProperty(player)) {
                console.log(`Looking up UUID for player: ${query.player}`);
                try {
                    const response = await axios.get(`https://api.mojang.com/users/profiles/minecraft/${query.player}`);
                    let cont = response.data;
                    uuid = cont["id"];
                    player = cont["name"];
                    mojCache[player] = uuid;
                } catch (error) {
                    console.error(`UUID Lookup failed for Player: ${player}`);
                    throw new Error(`UUID Lookup failed for Player: ${player}`);
                }
            } else if (mojCache.hasOwnProperty(player)) {
                console.log(`Using Mojang Cache for Player: ${player}`);
                uuid = mojCache[player];
            }

            let hyStats;
            if (!hyCache.hasOwnProperty(uuid)) {
                console.log(`Making Hypixel API Request for UUID: ${uuid} (${player})`);
                try {
                    const response = await axios.get(`https://api.hypixel.net/v2/player?key=${query.key}&uuid=${uuid}`);
                    hyStats = response.data.player;
                    if (response.data.success == false) throw new Error("Hypixel API request unsuccessful");
                    hyCache[uuid] = hyStats;
                } catch (error) {
                    console.error(`Hypixel API request failed for UUID: ${uuid} (${player})`);
                    throw new Error(`Hypixel API request failed for UUID: ${uuid} (${player})`);
                }
            } else {
                console.log(`Using Hypixel Cache for UUID: ${uuid} (${player})`);
                hyStats = hyCache[uuid];
            }

            const response = {
                status: "success",
                data: hyStats,
            };

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(response));

            //console.log(`HyCache: ${Object.keys(hyCache).length} | MojCache: ${Object.keys(mojCache).length}`); //Debug
        } else {
            throw new Error("Invalaid Parameters");
        }
    } catch (error) {
        const errorResponse = {
            status: "error",
            info: error.message,
        };

        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify(errorResponse));
    }
});

const PORT = 3000;

server.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});
