const Discord = require('discord.js')
const { parseDateString, addMinutesToDate, getCurrentUTCDate } = require('../../lib/date-utils')
const { getEventById, JoinTypes, saveEvent, getEventsWithTimeframe } = require('../../models/event-model')
const { getEventsChannel, sendEventEmbed, handleCancel } = require('./event-utils')
const { getEventEmbed } = require('../../lib/events/event-ui')
const { getConfiguration } = require('../../models/configuration-model')
const { getBotUser } = require('../../lib/global-vars')
const JoinEmotes = require('../../../assets/event-emotes.json')
const logger = require('../../lib/logger')
const { sendMessage, sendReply, getMessageParams } = require('../../lib/discord-utils')
const { isNumeric } = require('../../lib/utils')

function handleJoinReaction(reaction, user, eventId) {
    getEventById(reaction.message.guild.id, eventId).then(event => {
        let joinType = JoinTypes.LEAVE
        if (reaction.emoji.name == JoinEmotes.JOIN) {
            joinType = JoinTypes.JOIN
        }
        else if (reaction.emoji.name == JoinEmotes.ALT) {
            joinType = JoinTypes.ALTERNATE
        }
        else if (reaction.emoji.name == JoinEmotes.INTERESTED) {
            joinType = JoinTypes.INTERESTED
        } 
        handleJoinAction(reaction.message, joinType, user, event)
        reaction.message.reactions.cache.forEach(react => {
            if(react.emoji.name == reaction.emoji.name) {   
                react.users.remove(user.id)
            }
        })
    })
}

function handleJoinAction(originalMessage, joinType, user, event) {
    if(!joinType) {
        joinType = JoinTypes.LEAVE
    }
    const isJoined = joinType != JoinTypes.LEAVE
    const alreadyMember = isAlreadyJoined(event, joinType, user)
    logger.debug(`${user.username} is trying to join ${event.id}: ${isJoined}`)
    logger.debug(`${user.username} is already in ${event.id}: ${alreadyMember}`)
    if((isJoined && !alreadyMember) || (!isJoined && alreadyMember)) {
        let joinFullEvent = false
        if(joinType == JoinTypes.JOIN && event.maxMembers == event.getMembers().length) {
            joinType = JoinTypes.ALTERNATE
            joinFullEvent = true
        }
        event.updateMemberStatus(user.username, joinType)
        sendRosterUpdateMessage(originalMessage, event, user, joinType, joinFullEvent)
        updateChannelPermissions(originalMessage, event, user, isJoined)
        updateEventEmbed(originalMessage, event)
        reviewEventConflicts(originalMessage, event, user, joinType)
        return true
    } 
    return false
}

function reviewEventConflicts(originalMessage, event, user, joinType) {
    if(joinType === JoinTypes.JOIN || joinType === JoinTypes.ALTERNATE) {
        const startTime = addMinutesToDate(getCurrentUTCDate(event.eventDate), -61)
        const endTime = addMinutesToDate(getCurrentUTCDate(event.eventDate), 61)
        getEventsWithTimeframe(originalMessage.guild.id, startTime, endTime, user.username).then(events => {
            if(events && events.length > 0) {
                let activityText = 'joined'
                if(joinType === JoinTypes.ALTERNATE) {
                    activityText = 'joined as an alternate'
                }
                user.send(`One or more events may conflict with the event you just ${activityText}: **${event.getMiniTitle()}**
                \nPlease review the following events to make sure they will not be an issue with your schedule and make any needed adjustments.`)
                events.forEach(async event => {
                    user.send({ embeds: [await getEventEmbed(event, originalMessage.guild)] })
                })
            }
        })
    }
}

function updateEventEmbed(message, event) {
    getConfiguration(message.guild.id).then(config => {
        const eventsChannel = getEventsChannel(message.guild, config, event.game)
        eventsChannel.messages.fetch().then(messages => {
            messages.forEach(async message => {
                if(message.author.id == getBotUser().id && message.embeds && message.embeds.length > 0) {
                    const eventField = message.embeds[0].fields.filter(field => field.name === "Event ID")[0]
                    if(eventField.value == event.id) {
                        logger.info('found matching event message: '+message)
                        const embed = await getEventEmbed(event, message.guild)
                        message.edit({ embeds: [embed] })
                    }
                }
            })
        })
    })
}

function isAlreadyJoined(event, joinType, user) {
    if(joinType === JoinTypes.JOIN) {
        if(event.maxMembers == event.getMembers().length) {
            return event.getMembers().includes(user.username) 
              || event.getAlternates().includes(user.username)
        }
        return event.getMembers().includes(user.username)
    }
    else if(joinType === JoinTypes.ALTERNATE) {
        return event.getAlternates().includes(user.username)
    }
    else if(joinType === JoinTypes.INTERESTED) {
        return event.getInterested().includes(user.username)
    }
    else {
        return event.getMembers().includes(user.username) 
            || event.getAlternates().includes(user.username) 
            || event.getInterested().includes(user.username)
    }
}

function updateChannelPermissions(message, event, user, isJoined = false) {
    const channelName = event.getChannelName()
    const eventChannel = message.guild.channels.cache.filter(channel => channel.name == channelName).first()
    if(eventChannel) {
        eventChannel.permissionOverwrites.edit(user.id, {
            ViewChannel: isJoined ? true : null
        })
    }
}

function sendRosterUpdateMessage(message, event, user, joinType, joinFullEvent = false) {
    const channelName = event.getChannelName()
    const eventChannel = message.guild.channels.cache.filter(channel => channel.name == channelName).first()
    if(eventChannel) {
        let description = "has left"
        if(joinType == JoinTypes.JOIN) {
            description = 'has joined'
        }
        else  if(joinType == JoinTypes.ALTERNATE) {
            description = 'is an alternate'
            if(joinFullEvent) {
                description = 'wanted to join the full event, but is added as an alternate'
            }
        }
        else  if(joinType == JoinTypes.INTERESTED) {
            description = 'is interested in'
        }
        const rosterMessage = `**${user.username}** ${description} Event: _${event.name}_`
        eventChannel.send(rosterMessage).then(msg => {
            if(joinType == JoinTypes.JOIN && event.getMembers().length == event.maxMembers) {
                eventChannel.send(`**Event **_${event.name}_** is full!** 🙌🎉`)
            }
        })
    }
}

function getEventDetails(originalMessage, eventId) {
    getEventById(originalMessage.guild.id, eventId).then(async event => {
        logger.debug(event)
        if (!event) {
            return sendReply(originalMessage, `No event found for eventId ${eventId}`)
        }
        const embed = await getEventEmbed(event, originalMessage.guild)
        sendEventEmbed(originalMessage.channel, embed)
    })
}

function transferEvent(message) {
    let eventId
    if(message.channel.name.startsWith('id-')) {
        const re = new RegExp(`^id-(\\d+)-.+`, "g");
        let matches = re.exec(message.channel.name)
        logger.debug(`matches: ${matches}`)
        eventId = matches[1]
        logger.debug(`matched eventId: ${eventId}`)
    }
    if (!eventId && message.mentions && message.mentions.users.array().length > 0) {
        const params = getMessageParams(message, `transfer`, 2)
        if(isNumeric(params)) {
            eventId = params;
        }
    } 
    if(!eventId) {
        const params = getMessageParams(message, `transfer`, 1)
        if(isNumeric(params)) {
            eventId = params;
        }
    }
    if(!eventId) {
        sendReply(message, `Please supply an eventId (example: \`gfn/transfer [@otherUser] 123\`)`)
    }
    else {
        logger.debug(`search for matching event: ${eventId}, guildID: ${message.guild.id}`)
        getEventById(message.guild.id, eventId).then(event => {
            logger.debug(`found event:`)
            logger.debug(event)
            if(!message.mentions || message.mentions.users.array().length == 0) {
                sendReply(message, `You must supply a user to transfer ownership of the following event: _${event.getMiniTitle()}_`)
            }
            else {
                const user = message.mentions.users.first()
                logger.debug(user.username)
                if(message.author.id !== user.id && message.author.username !== event.creator && !message.member.hasPermission("ADMINISTRATOR")) {
                    sendReply(message, `You are not the creator of the event and do not have permission to transfer: _${event.getMiniTitle()}_`)
                }
                else {
                    event.creator = user.username
                    saveEvent(event)
                    updateEventEmbed(message, event)
                    sendReply(message, `Transferred ownership to ${user} for event: _${event.getMiniTitle()}_`)
                }
            }
        })
    }
}

async function editEventWithId(originalMessage, eventId, editType) {
    const event = await getEventById(originalMessage.guild.id, eventId)
    if(editType) {
        editEvent(originalMessage, event, editType)
    } else {
        const embed = new Discord.EmbedBuilder()
            .setTitle(`Edit Event ${event.getMiniTitle()}`)
            .setDescription(`Choose what field you would like by reacting with the related emote:`)
            .addFields({name: `Edit Options:`, value: `✒ = Name\n🏷 = Description\n🎟 = Max / Limit\n⌚ = Time`})
        sendMessage(originalMessage, embed).then(botMessage => {
            botMessage.react('✒')
            botMessage.react('🏷')
            botMessage.react('🎟')
            botMessage.react('⌚')
    
            const emotes = ['✒', '🏷', '🎟', '⌚']
            const filter = (reaction, user) => {
                return emotes.includes(reaction.emoji.name) && user.id === originalMessage.author.id;
            };
            botMessage.awaitReactions(filter, { max: 1, time: 60000, errors: ['time'] })
                .then(collected => {
                    const reaction = collected.first();
                    const emote = reaction.emoji.name
                    logger.info(emote)
                    if (emotes.includes(emote)) {
                        botMessage.delete()
                        let editType
                        if(emote == emotes[0]) {
                            editType = 'name'
                        } else if(emote == emotes[1]) {
                            editType = 'description'
                        } else if(emote == emotes[2]) {
                            editType = 'limit'
                        } else if(emote == emotes[3]) {
                            editType = 'time'
                        }
                        editEvent(originalMessage, event, editType)
                    }
                })
                .catch(collected => {
                    logger.warn('no reaction detected');
                    logger.warn(collected)
                    // botMessage.reactions.removeAll()
                });
            })
    }
}

async function editEvent(originalMessage, event, editType) {
    let editText;
    if(editType.toLowerCase() === 'name') {
        editText = `Please provide a new name for this event:`
    }
    if(editType.toLowerCase() === 'description') {
        editText = `Please provide a new description for this event:`
    }
    else if(editType.toLowerCase() === 'limit' || editType.toLowerCase() === 'max') {
        editText = `Please provide a new max attendees for this event:`
    }
    else if(editType.toLowerCase() === 'time') {
        editText = `Please provide a new date and time for the event:`
    }
    sendEditMessage(originalMessage, event, editType, editText)
}

function sendEditMessage(originalMessage, event, editType, editText) {
    const embed = editEventEmbed(`Edit ${editType.toLowerCase()} for event ${event.getMiniTitle()}`, editText)
    originalMessage.channel.send({ embeds: [embed]}).then(botMessage => {
        const collector = new Discord.MessageCollector(originalMessage.channel, m => m.author.id === originalMessage.author.id, { time: 60000 });
        collector.on('collect', message => {
            if (!handleCancel(message, botMessage)) {
                const valid = isValidEdit(message.content, editType)
                if(!valid) {
                    if(editType.toLowerCase() === 'name') {
                        sendReply(message, "hmm, that didn't work, try to keep the name under 32 characters and try again")
                    }
                    if(editType.toLowerCase() === 'description') {
                        sendReply(message, "hmm, that didn't work, try to keep the description simple and try again")
                    }
                    else if(editType.toLowerCase() === 'max' || editType.toLowerCase() == 'limit') {
                        sendReply(message, "Value must be an integer between 1 and 100")
                    }
                    else if(editType.toLowerCase() === 'time') {
                        sendReply(message, "hmm, that didn't work, try to keep the date format simple and try again")
                    }
                } else {
                    if(editType.toLowerCase() === 'description') {
                        event.description = message.content
                    }
                    else if(editType.toLowerCase() === 'max' || editType.toLowerCase() == 'limit') {
                        const parseNum = parseInt(message.content)
                        event.maxMembers = parseNum
                    }
                    else if(editType.toLowerCase() === 'time') {
                        const parsedDate = parseDateString(message.content)
                        event.eventDate = parsedDate
                    }
                    collector.stop()
                    message.delete()
                    botMessage.delete()
                    saveEvent(event)
                    updateEventEmbed(originalMessage, event)
                    sendReply(message, `Updated ${editType.toLowerCase()} for event: ${event.getMiniTitle()}`)
                }
            }
        })
        collector.on('end', (collected, reason) => {
            if(reason === 'time') {
                botMessage.delete()
                collector.stop()
                sendReply(originalMessage, `No reply given in the required time (60 seconds). Please try your command over from the start.`)
            }
        });
    })
}

function isValidEdit(text, eventType) {
    let valid = false
    if(eventType.toLowerCase() === 'description') {
        valid = true
    }
    else if(eventType.toLowerCase() === 'name') {
        valid = text.length < 32
    }
    else if(eventType.toLowerCase() === 'max' || eventType.toLowerCase() == 'limit') {
        valid = !isNaN(text)
        if(valid) {
            const parseNum = parseInt(text)
            if(parseNum <= 0 || parseNum > 100) {
                valid = false
            }
        }
    }
    else if(eventType.toLowerCase() === 'time') {
        const parsedDate = parseDateString(text)
        valid = parsedDate !== null && parsedDate !== undefined
    }
    return valid
}

function editEventEmbed(title, description, color) {
    if(!color) {
        color = 0x03a9f4
    }
    return new Discord.EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
}

module.exports = {
    handleJoinReaction: handleJoinReaction,
    handleJoinAction: handleJoinAction,
    getEventDetails: getEventDetails,
    transferEvent: transferEvent,
    editEventWithId: editEventWithId,
    editEvent: editEvent
}