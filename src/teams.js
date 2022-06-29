const utils = require('./lib/utils')
const logger = require('./lib/logger')

var teams = {}
var players = {}

function addPlayer(player) {
    if(players[player.name]) {
        return
    }
    players[player.name] = player;
}

function getPlayers() {
    return Object.keys(players).join(', ')
}

function getRandomTeams(count) {
    const randTeams = {}
    let teamNum = 1
    const playerList = Object.keys(players)
    utils.shuffleArray(playerList)
    let playerPool = playerList.length
    const maxTeamSize = Math.round(playerPool / count)

    while(playerPool > 0) {
        const player = playerList.pop()
        let members = randTeams['Team '+teamNum]
        if(!members) {
            members = []
        }
        members.push(players[player].name)
        randTeams['Team '+teamNum] = members
        if(teamNum == count) {
            teamNum = 1 
        }
        else {
            teamNum++
        }
        playerPool = playerList.length
    }
    return randTeams
}

function commitTeams(teams) {
    Object.keys(teams).forEach(team => {
        let players = teams[team]
        logger.debug(players)
        players.forEach(player => {
            players.forEach(teammate => {
                if(player !== teammate) {
                    addTeammate(player, teammate)
                }
            })
        })
    })
}

function addTeammate(player, teammate) {
    let teammates = players[player].teammates
    if(!teammates) {
        teammates = []
    }
    if(!teammates.includes(teammate)) {
        teammates.push(teammate)
        players[player].teammates = teammates
    }
}

function getPlayedWith(player) {
    if(!players[player]) {
        return []
    }
    return players[player].teammates
}

function getUnmatchedTeammates(player) {
    const unmatchedPlayers = []
    if(!players[player]) {
        return unmatchedPlayers
    }
    const teammates = players[player].teammates
    if(!teammates) {
        return unmatchedPlayers
    }
    Object.keys(players).forEach(unmatched => {
        if(player !== unmatched && !teammates.includes(unmatched)) {
            unmatchedPlayers.push(unmatched)
        }
    })
    return unmatchedPlayers
}

function resetTeams() {
    teams = {}
    players = {}
}



module.exports = {
    teams: teams,
    players: players,
    addPlayer: addPlayer,
    getPlayers: getPlayers,
    getRandomTeams: getRandomTeams,
    commitTeams: commitTeams,
    getPlayedWith: getPlayedWith,
    getUnmatchedTeammates: getUnmatchedTeammates,
    resetTeams: resetTeams
}