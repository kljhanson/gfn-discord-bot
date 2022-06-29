const Discord = require('discord.js')
const logger = require('./logger')
const { getConfiguration } = require('../models/configuration-model')

const prefix = 'gfn/'
const prefixRegex = '[Gg]{1}[Ff]{1}[Nn]{1}\/'

function matchMessage(srcMessage, ...commands) {
    let retVal = false
    commands.forEach(cmd => {
        let re = new RegExp(`^${prefixRegex}\\s*${cmd}`, "g");
        let matches = re.exec(srcMessage.content)
        retVal = retVal || (matches && matches.length > 0)
    })
    let re = new RegExp(`^${prefixRegex}`, "g");
    return (re.test(srcMessage.content) && retVal)
}

function sendImage(srcMessage, imgUrl) {
    // return srcMessage.channel.send(new Discord.MessageEmbed().setImage(imgUrl))
    return srcMessage.channel.send("",  {files: [{
        attachment: imgUrl,
        name: imgUrl
     }]})
}

function sendMessage(srcMessage, txtMessage) {
    return srcMessage.channel.send(txtMessage)
}

function sendReply(srcMessage, txtMessage) {
    return srcMessage.reply(txtMessage)
}

function getMessageParams(srcMessage, command, paramNum, paramsAsString = false) {
    let re = new RegExp(`(^${prefixRegex}\\s*${command}\\s{1})(.+)`, "g");
    let matches = re.exec(srcMessage.content)
    if(matches && matches.length > 0) {
        logger.debug(`message params matches: ${matches}`)
        matches.shift()
        if(matches.length > 1) {
            let params = matches[1].split(" ")
            logger.debug(`extracted params: ${params}`)
            logger.debug(`requested param: ${paramNum}`)
            logger.debug(`calculated param: ${params[paramNum-1]}`)
            if(paramNum && paramNum > 0) {
                if(params.length > paramNum-1) {
                    return params[paramNum-1]
                }
                else {
                    return null
                }
            }
            else if(paramsAsString) {
                return matches[1]
            }
            return params
        }
    }
    return ""
}

async function isBlessed(member) {
    const conf = getConfiguration(member.guild.id)
    if(conf.blessedRoles && conf.blessedRoles.length > 0) {
        conf.blessedRoles.forEach(role => {
            const matchedRoles = member.roles.cache.find(r => r.name === role)
            if(matchedRoles) {
                return true
            }
        })
    }
    return false
}

function collectMessageReplies(originalMessage, botMessage, onReply) {
    const collector = new Discord.MessageCollector(originalMessage.channel, m => m.author.id === originalMessage.author.id, { time: 120000 });
    collector.on('collect', message => {
        onReply(message, collector)
    })
    collector.on('end', (collected, reason) => {
        messageCollectorTimeout(collected, reason, botMessage, collector, originalMessage)
    });
    return collector
}

function messageCollectorTimeout(collected, reason, botMessage, collector, originalMessage) {
    if(reason === 'time') {
        botMessage.delete()
        collector.stop()
        sendReply(originalMessage, `No reply given in the required time (120 seconds). Please try your command over from the start.`)
    }
}

module.exports = {
    matchMessage: matchMessage,
    sendImage: sendImage,
    sendMessage: sendMessage,
    sendReply: sendReply,
    getMessageParams: getMessageParams,
    isBlessed: isBlessed,
    collectMessageReplies: collectMessageReplies,
    messageCollectorTimeout: messageCollectorTimeout
}