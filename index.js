const fs = require('fs');

// Load your JSON data from the file
const jsonData = require('./all_games_mafia.json');
const { machine } = require('os');
const { mainModule } = require('process');

// Map numeric roles to team roles
const roleToTeam = {
    0: "citizen", // Citizen
    1: "citizen", // Sheriff
    2: "mafia",   // Mafia
    3: "mafia"    // Don
};

// Function to group players into games
function groupPlayersIntoGames(jsonData) {
    const games = {}; // To store games
    jsonData.reverse().forEach(player => {
        const gameKey = `Tournament${player.TournamentId}_Game${player.GameNumber}_Table${player.TableNumber}`;
        if (!games[gameKey]) {
            games[gameKey] = [];
        }
        games[gameKey].push(player);
    });
    return games;
}

// Function to process games and calculate Elo ratings
function processGames(games) {
    const playerElos = {}; // To store players' Elo ratings
    const allPlayers = {}; // To store player details

    for (const gameKey in games) {
        const gamePlayers = games[gameKey];

        // Prepare data for the calculateElo function
        const gameData = gamePlayers.map(player => {
            const playerId = player.PlayerId;
            // Get old Elo or default to 1000
            const oldElo = playerElos[playerId] || 1000;
            // Map role to team role
            const teamRole = roleToTeam[player.Role];
            // Prepare player data
            return {
                playerId: playerId,
                name: player.Name,
                role: teamRole,
                oldElo: oldElo,
                points: player.TotalPoints,
                teamWin: player.Win
            };
        });

        // Calculate new Elo ratings for this specific game
        const updatedGameData = calculateElo(gameData);

        // Update player Elo ratings
        updatedGameData.forEach(player => {
            playerElos[player.playerId] = player.newElo;

            // Store player details
            if (!allPlayers[player.playerId]) {
                allPlayers[player.playerId] = {
                    playerId: player.playerId,
                    name: player.name,
                    elo: player.newElo
                };
            } else {
                allPlayers[player.playerId].elo = player.newElo;
            }
        });

        // Console log the list of players and their Elo changes
        console.log(`Game: ${gameKey}`);
        updatedGameData.forEach(player => {
            const change = player.newElo - player.oldElo;
            const changeStr = change >= 0 ? `+${change.toFixed(2)}` : `${change.toFixed(2)}`;
            console.log(`${player.name} (Place: ${player.place}) ${player.oldElo.toFixed(2)} -> ${player.newElo.toFixed(2)} (${changeStr})`);
        });
        console.log(''); // Add an empty line between games
    }

    return allPlayers;
}

// Updated calculateElo function
function calculateElo(gameData) {
    // Separate players into teams
    let mafiaTeam = gameData.filter(player => player.role === "mafia");
    let citizenTeam = gameData.filter(player => player.role === "citizen");

    const avgElo = team => team.reduce((sum, player) => sum + player.oldElo, 0) / team.length || 1000;

    let mafiaAvgElo = avgElo(mafiaTeam);
    let citizenAvgElo = avgElo(citizenTeam);

    // Sort players by points to determine places
    gameData.sort((a, b) => b.points - a.points);

    let currentPlace = 1;
    for (let i = 0; i < gameData.length; i++) {
        if (i > 0 && gameData[i].points < gameData[i - 1].points) {
            currentPlace = i + 1;
        }
        gameData[i].place = currentPlace;
    }

    // Calculate new Elo for each player
    gameData = gameData.map(player => {
        let baseChange = player.teamWin ? 13 : -15;
        let teamAvgElo = player.role === "mafia" ? mafiaAvgElo : citizenAvgElo;
        let opponentTeamAvgElo = player.role === "mafia" ? citizenAvgElo : mafiaAvgElo;
        const teamEloDiff = opponentTeamAvgElo - teamAvgElo;
        const opponentsStronger = teamEloDiff > 0
        const playersELOImpact = player.oldElo / teamAvgElo;
        let eloChange;
        const diffCoef = opponentsStronger  ? (((Math.abs(teamEloDiff) + 1000) / player.oldElo)) : (  player.oldElo / ((Math.abs(teamEloDiff) + 1000)))
        if (player.teamWin) {
            // Winning team: Elo gain decreases with place
            
            eloChange = (baseChange - (player.place - 1)) * diffCoef
            
            
        } else {
            
            // Losing team: Elo loss decreases with higher place (less negative)
            eloChange = (baseChange + (player.place - 1)) * diffCoef
        }

        player.newElo = player.oldElo + eloChange;

        return player;
    });

    return gameData;
}


// Main execution
(function main() {
    // Group players into games
    const games = groupPlayersIntoGames(jsonData);

    // Process games and get the final Elo ratings
    const allPlayers = processGames(games);

    // Convert allPlayers to an array for output
    const playerArray = Object.values(allPlayers);

    // Write the playerArray to a JSON file
    fs.writeFileSync('players_ratings.json', JSON.stringify(playerArray, null, 2));

    console.log('Player ratings have been written to players_ratings.json');
})();
