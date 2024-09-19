const fs = require('fs');

// Load the players_ratings.json file
const playersData = require('./players_ratings.json');

// Sort players by Elo descending
playersData.sort((a, b) => b.elo - a.elo);

// Assign place to each player
let currentPlace = 1;
let placeOffset = 1;
let previousElo = null;

for (let i = 0; i < playersData.length; i++) {
    const player = playersData[i];
    if (i === 0) {
        // First player
        player.place = currentPlace;
        placeOffset = 1;
    } else {
        if (player.elo === previousElo) {
            // Tie: same place
            player.place = currentPlace;
            placeOffset++;
        } else {
            // Different Elo: increment currentPlace by placeOffset
            currentPlace += placeOffset;
            player.place = currentPlace;
            placeOffset = 1;
        }
    }
    previousElo = player.elo;
}

// Output the list to console
playersData.forEach(player => {
    console.log(`${player.place}. ${player.name} - ${player.elo.toFixed(2)}`);
});

// Write the list to a text file
const playerList = playersData.map(player => `${player.place}. ${player.name} - ${player.elo.toFixed(2)}`);

fs.writeFileSync('sorted_players_list.txt', playerList.join('\n'));

console.log('Players sorted list with places has been written to sorted_players_list.txt');

// Write the updated players data to a JSON file
fs.writeFileSync('players_with_places.json', JSON.stringify(playersData, null, 2));

console.log('Players data with places has been written to players_with_places.json');
