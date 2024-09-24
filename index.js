const fs = require("fs");

// Load your JSON data from the file
const jsonData = require("./all_games_mafia.json");

const ROLE_CITIZEN = "citizen";
const ROLE_MAFIA = "mafia";

// Map numeric roles to team roles
const roleToTeam = {
    0: ROLE_CITIZEN, // Citizen
    1: ROLE_CITIZEN, // Sheriff
    2: ROLE_MAFIA, // Mafia
    3: ROLE_MAFIA, // Don
};

// Function to group players into games
function groupPlayersIntoGames(jsonData) {
  const games = {}; // To store games
  jsonData.reverse().forEach((player) => {
    const gameKey = `Tournament${player.TournamentId}_Game${player.GameNumber}_Table${player.TableNumber}`;
    if (!games[gameKey]) {
      games[gameKey] = [];
    }
    games[gameKey].push(player);
  });
  return games;
}

const BASE_RANK = 1000;

// Function to process games and calculate Elo ratings
function processGames(games) {
  const playerElos = {}; // To store players' Elo ratings
  const allPlayers = {}; // To store player details

  for (const gameKey in games) {
    const gamePlayers = games[gameKey];

    const tableNumber = gamePlayers[0].TableNumber;
    // Prepare data for the calculateElo function
    const gameData = gamePlayers.map((player) => {
      const playerId = player.PlayerId;
      // Get old Elo or default to 1000
      const oldElo = playerElos[playerId] || BASE_RANK;
      // Map role to team role
      const teamRole = roleToTeam[player.Role];
      // Prepare player data
      return {
        playerId: playerId,
        name: player.Name,
        role: teamRole,
        oldElo: oldElo,
        points: player.TotalPoints,
        teamWin: player.Win,
      };
    });

    // Calculate new Elo ratings for this specific game
    const updatedGameData = calculateElo(gameData, tableNumber);

    // Update player Elo ratings
    updatedGameData.forEach((player) => {
      playerElos[player.playerId] = player.newElo;

      // Store player details
      if (!allPlayers[player.playerId]) {
        allPlayers[player.playerId] = {
          playerId: player.playerId,
          name: player.name,
          elo: player.newElo,
        };
      } else {
        allPlayers[player.playerId].elo = player.newElo;
      }
    });

    // // Console log the list of players and their Elo changes
    // console.log(`Game: ${gameKey}`);
    // updatedGameData.forEach(player => {
    //     const change = player.newElo - player.oldElo;
    //     const changeStr = change >= 0 ? `+${change.toFixed(2)}` : `${change.toFixed(2)}`;
    //     console.log(`${player.name} (Place: ${player.place}) ${player.oldElo.toFixed(2)} -> ${player.newElo.toFixed(2)} (${changeStr})`);
    // });
    // console.log(''); // Add an empty line between games
  }

  return allPlayers;
}

// Updated calculateElo function
function calculateElo(gameData, tableNumber) {
  // Separate players into teams
  let mafiaTeam = gameData.filter((player) => player.role === ROLE_MAFIA);
  let citizenTeam = gameData.filter((player) => player.role === ROLE_CITIZEN);

  const avgElo = (team) =>
    team.reduce((sum, player) => sum + player.oldElo, 0) / team.length || 1000;

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
  gameData = gameData.map((player) => {
    let baseChange = player.teamWin ? 10 : -5;
    let opponentTeamAvgElo =
      player.role === ROLE_MAFIA ? citizenAvgElo : mafiaAvgElo;

    let eloChange;
    const diffCoef = opponentTeamAvgElo / player.oldElo;
    // eloChange = (baseChange - (player.place - 1)) * winCoef
    if (player.teamWin) {
      // Winning team: Elo gain decreases with place
      const winCoef = diffCoef >= 0.8 ? diffCoef : diffCoef - 0.2;
      eloChange = (baseChange - (player.place - 1)) * winCoef;
      // console.log(player.name, diffCoef)
      if (tableNumber == 0) {
        eloChange *= 2;
      }
    } else {
      // Losing team: Elo loss decreases with higher place (less negative)
      const lose = diffCoef < 1 ? player.oldElo / opponentTeamAvgElo : diffCoef;
      eloChange = (baseChange * player.oldElo) / opponentTeamAvgElo;
      // console.log(player.name, diffCoef,  player.oldElo  / teamAvgElo, teamAvgElo)
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
  fs.writeFileSync(
    "players_ratings.json",
    JSON.stringify(playerArray, null, 2)
  );

  console.log("Player ratings have been written to players_ratings.json");
})();
