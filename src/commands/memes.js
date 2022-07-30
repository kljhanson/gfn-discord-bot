/**
 * Only the dankest and spiciest 
 * Created: Kyle Hanson
 * Updated: 2020-08-09
 */

const Discord = require('discord.js')
const quotes = require('../../assets/quotes.json')
const utils = require('../lib/utils')
const {matchMessage, sendMessage, sendReply, sendImage} = require('../lib/discord-utils')

const memeGifs = {
    snek: 'https://media.tenor.com/images/f88700a975e4139be55cb933e05f64d7/tenor.gif',
    knobie: 'https://media.giphy.com/media/Qxp1ahQCHArlK/giphy.gif',
    spook: 'https://media.discordapp.net/attachments/503667887576317982/640994085909430323/ezgif.com-crop.gif'
}

function executeMemeMessages(msg) {
    if(matchMessage(msg, 'rumi')) {
        sendMessage(msg, '<@533119423490293761> Hello bone guy :bone: ')
    }

    if(matchMessage(msg, 'rogue')) {
        sendMessage(msg, '<@251761701194563584> Hello muppet, beep boop. I calculate we are enemies.')
    }
    if(matchMessage(msg, 'snek', 'hybrid')) {
        sendMessage(msg, '<@231577281758232576>')
        sendImage(msg, memeGifs.snek)
    }

    if(matchMessage(msg, 'knob', 'knobie')) {
        sendMessage(msg, '🏳️‍🌈 <@364872700931342339>')
        sendImage(msg, memeGifs.knobie)
    }
    
    if(matchMessage(msg, 'spook')) {
        sendImage(msg, memeGifs.spook)
    }
}

module.exports = {
    executeMemeMessages: executeMemeMessages,
    memeGifs: memeGifs
}