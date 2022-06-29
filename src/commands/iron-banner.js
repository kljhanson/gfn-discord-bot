/**
 * Create and manage teams for Clan IB nights
 * Created: Kyle Hanson
 * Updated: 2020-08-09
 */

const logger = require('../lib/logger')
const Discord = require('discord.js')
const quotes = require('../../assets/quotes.json')
const utils = require('../lib/utils')
const teams = require('../teams')
const {matchMessage, sendMessage, sendReply, sendImage} = require('../lib/discord-utils')

teams.addPlayer({name: 'digitalFlame'})
teams.addPlayer({name: 'snek'})
teams.addPlayer({name: 'subscriptzero'})
teams.addPlayer({name: 'RogueOutsider'})
teams.addPlayer({name: 'Brozine'})
teams.addPlayer({name: 'Knobie'})
teams.addPlayer({name: 'Tridic'})

function executeIronBannerMessage(msg) {
    if(msg.content.startsWith('gfn/ib add player ')) {
        let playerName = msg.content.substring('gfn/ib add player '.length)
        let player = {
            name: playerName
        }
        teams.addPlayer(player)
        sendReply(msg, 'Added players: '+playerName)
    }

    if(msg.content.startsWith('gfn/ib add players ')) {
        let playerName = msg.content.substring('gfn/ib add players '.length)
        let addedPlayers = []
        msg.mentions.users.forEach(user => {
            let playerName = user.username
            let player = {
                name: playerName
            }
            teams.addPlayer(player)
            addedPlayers.push(playerName)
        })
        msg.reply('Added players: '+addedPlayers.join(', '))
    }

    if(msg.content.startsWith('gfn/ib show players')) {
        msg.reply('Players: '+teams.getPlayers())
    }

    if(msg.content.startsWith('gfn/ib reset')) {
        msg.reply('Reset Iron Banner teams/history?').then(message => {
            message.react('✅')
            message.react('❌')
    
            const filter = (reaction, user) => {
                return ['❌', '✅'].includes(reaction.emoji.name) && user.id === msg.author.id;
            };
    
            message.awaitReactions(filter, { max: 1, time: 60000, errors: ['time'] })
            .then(collected => {
                const reaction = collected.first();
        
                if (reaction.emoji.name === '❌') {
                    message.delete()
                } else if(reaction.emoji.name === '✅') {
                    teams.resetTeams()
                    message.delete()
                    msg.reply('Player history and teams reset')
                }
            })
            .catch(collected => {
               logger.warn('no reaction detected');
               logger.warn(collected)
            });
        });
    }

    if(msg.content.startsWith('gfn/ib unmatched')) {
        let player;
        if(msg.mentions.users.length > 0) 
            player = msg.mentions.users.first().username
        if(!player) 
            player = msg.author.username
        
        const teammates = teams.getUnmatchedTeammates(player)
        let title = player+" has not been added or has not yet teamed up"
        if(teammates.length > 0)
            title = player+" has not yet played with..."
        
        const embed = new Discord.MessageEmbed()
            .setTitle(title)
            .setColor(0xfee12b)
            .setDescription(teammates.join(", "))
        msg.channel.send(embed)
    }

    if(msg.content.startsWith('gfn/ib matched') || msg.content.startsWith('gfn/ib teammates')) {
        let player;
        if(msg.mentions.users.length > 0) 
            player = msg.mentions.users.first().username
        if(!player) 
            player = msg.author.username

        const teammates = teams.getPlayedWith(player)
        let title = player+" has not been added or has not yet teamed up"
        if(teammates.length > 0)
            title = player+" has played with..."
        
        const embed = new Discord.MessageEmbed()
            .setTitle(title)
            .setColor(0x10a5f5)
            .setDescription(teammates.join(", "))
        msg.channel.send(embed)
    }

    if(msg.content.startsWith('gfn/ib get teams')) {
        let countval = msg.content.substring('gfn/ib get teams '.length)
        let count = 0
        if(countval) {
            count = parseInt(countval)
        }
        if(count <= 0) {
            count = Math.round(teams.getPlayers().length / 6)
        }
        let randTeams = teams.getRandomTeams(count)
        sendRandomTeams(getRandomTeamEmbed(randTeams), msg, count, randTeams)
    }
}

function getRandomTeamEmbed(randTeams, accepted) {
    let color = 0xe12120
    if(accepted) {
        color = 0x228c22
    }
    let title = "Random Teams"
    let description;
    if(accepted) {
        title = "Iron Banner Teams"
        let saladquotes = quotes.saladin
        utils.shuffleArray(saladquotes)
        description = '_"'+saladquotes.pop()+'"_'
    }
    const embed = new Discord.MessageEmbed()
        .setTitle(title)
        .setColor(color)

    if(accepted) {
        embed.setDescription(description)
        embed.setThumbnail("https://vignette.wikia.nocookie.net/destinypedia/images/4/46/Iron_Banner_quest_icon.png/revision/latest?cb=20170815013519")
    }
    
    Object.keys(randTeams).forEach(teamName => {
        embed.addField(teamName, randTeams[teamName].join(', '))
    })
    return embed
}

function sendRandomTeams(embed, originalMessage, count, randomTeams) {
    originalMessage.channel.send(embed).then(embedMessage => {
        embedMessage.react('🔄')
        embedMessage.react('✅')

        const filter = (reaction, user) => {
            return ['🔄', '✅'].includes(reaction.emoji.name) && user.id === originalMessage.author.id;
        };

        embedMessage.awaitReactions(filter, { max: 1, time: 60000, errors: ['time'] })
        .then(collected => {
            const reaction = collected.first();
    
            if (reaction.emoji.name === '🔄') {
                embedMessage.delete()
                let randTeams = teams.getRandomTeams(count)
                sendRandomTeams(getRandomTeamEmbed(randTeams), originalMessage, count, randTeams)
            } else if(reaction.emoji.name === '✅') {
                teams.commitTeams(randomTeams)
                embedMessage.delete()
                originalMessage.reply('Accepting these teams').then(msg => {
                    originalMessage.channel.send(getRandomTeamEmbed(randomTeams, true))
                })
            }
        })
        .catch(collected => {
           logger.warn('no reaction detected');
           logger.warn(collected)
        });
    });
}

module.exports = {
    executeIronBannerMessage: executeIronBannerMessage
}