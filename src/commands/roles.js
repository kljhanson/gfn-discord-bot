/**
 * Handle messages related to creating and managing LFG events
 * Created: Kyle Hanson
 * Updated: 2021-01-09
 */
const logger = require('../lib/logger')
const Discord = require('discord.js')
const { matchMessage, sendMessage, sendReply, sendImage, getMessageParams, isBlessed, collectMessageReplies, messageCollectorTimeout } = require('../lib/discord-utils')
const { ReactionRoles, getReactionRoles, getRole, createReactionRole } = require('../models/reaction-roles-model')

function executeReactionRoleMessage(msg) {
    if(matchMessage(msg, 'roles')) {
        if(!msg.member.hasPermission("ADMINISTRATOR") && !isBlessed(msg.member)) {
            sendReply(msg, `You do not have sufficient privilages to execute this function.`)
            return
        }
        const param = getMessageParams(msg, "roles", 1)
        if(param.toLowerCase() === 'create') {
            createReactionRoleStart(msg)
        }
    }
}

async function handleReactionRoles(reaction, user, positiveReact) {
    logger.info()
    logger.info("guildid: "+reaction.message.guild.id)
    logger.info("msgid: "+reaction.message.id)
    logger.info("channelid: "+reaction.message.channel.id)
    logger.info("emoteid: "+reaction.emoji.id)
    logger.info("emoteid: "+reaction.emoji.name)
    let role = await getRole(reaction.message.guild.id, reaction.message.id, reaction.message.channel.id, reaction.emoji.name)
    if(role) {
        logger.debug("found reaction role: ")
        logger.debug(role)
        changeRole(reaction.message.guild, user, role.roleName, positiveReact)
    } else {
        logger.debug("no matching reaction role")
    }
}

async function changeRole(guild, user, roleName, grant) {
    await guild.roles.fetch()
    await guild.members.fetch()
    const role = guild.roles.cache.find(r => r.name === roleName)
    const member = guild.members.cache.find(m => m.id === user.id)
    logger.debug(`changing role for user`)
    logger.debug(`role: ${role}`)
    logger.debug(`member: ${member}`)
    logger.debug(`grant: ${grant}`)
    let changetext = "been granted"
    if(grant) {
        member.roles.add(role)
    }
    else {
        member.roles.remove(role)
        changetext = "been removed from"
    }
    user.send(`You have ${changetext} the role ${roleName}`)
}

async function createReactionRoleStart(originalMessage) {
    let channelId
    let messageId = originalMessage.content.split(" ")[originalMessage.content.split(" ").length-1]
    const channel = originalMessage.mentions.channels.first()
    if(channel) {
        channelId = channel.id
    }
    if(!channelId || !messageId) {
        logger.debug(`messageId: ${messageId}`)
        logger.debug(`channelId: ${channelId}`)
        sendReply(originalMessage, "Invalid parameters. Please provide both channel and messageId with the following format: `gfn/roles create #<channelName> <messageId>`")
    }
    else {
        const embed = new Discord.EmbedBuilder()
            .setTitle(`Create New Reaction Role`)
            .setDescription("Type or mention the name of the role you want to configure")
        let botMessage = await sendMessage(originalMessage, embed)
        const collector = collectMessageReplies(originalMessage, botMessage, (message, collector) => {
            collector.stop()
            let role = message.content
            if(message.mentions.length > 0) {
                role = message.mentions.roles.first().name
            }
            createReactionRoleEmote(originalMessage, botMessage, channelId, messageId, role)
            message.delete()
        })
    }
    
}

async function createReactionRoleEmote(originalMessage, prevBotMessage, channelId, messageId, role) {
    const embed = new Discord.EmbedBuilder()
        .setTitle(`Create New Reaction Role: ${role}`)
        .setDescription(`React with the emote that will grant this role for the message (Id: ${messageId}, channelId: ${channelId})`)
    let botMessage = await prevBotMessage.edit(embed)
    
    const filter = (reaction, user) => {
        return user.id === originalMessage.author.id;
    };

    botMessage.awaitReactions(filter, { max: 1, time: 120000, errors: ['time'] })
    .then(async collected => {
        const reaction = collected.first();
        const emote = reaction.emoji.name
        const existingRole = originalMessage.guild.roles.cache.find(r => r.name == role)
        if(!existingRole) {
            const newRole = await originalMessage.guild.roles.create({
                data: {
                    name: role
                }
            })
            logger.info(`created new guild role: ${newRole}`)
        }
        createReactionRole(originalMessage.guild.id, messageId, channelId, role, emote, null).then(async reactionRole => {
            const channel = originalMessage.guild.channels.cache.find(c => c.id == channelId)
            if(channel) {
                await channel.messages.fetch()
                const message = channel.messages.cache.find(m => m.id == messageId)
                if(message) {
                    message.react(emote)
                }
            }
            sendReply(originalMessage, "New reaction role created")
            botMessage.delete()
        })
    })
    .catch(collected => {
        logger.warn('no reaction detected');
        logger.warn(collected)
    })
}

module.exports = {
    handleReactionRoles: handleReactionRoles,
    executeReactionRoleMessage: executeReactionRoleMessage
}