const JoinEmotes = require('../../../assets/event-emotes.json')
const logger = require('../logger')
const { addMinutesToDate, getCurrentUTCDate } = require('../date-utils')
const { getEventById, JoinTypes, saveEvent, getEventsWithTimeframe } = require('../../models/event-model')
const { getEventEmbed } = require('./event-ui')
const { sendReply, getMessageParams } = require('../discord-utils')
const { isNumeric } = require('../utils')
const { updateChannelPermissions, updateEventEmbed } = require('./event-channels')
const { getEventIdFromChannel } = require('./event-utils')


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
        updateEventEmbed(originalMessage.guild, event)
        reviewEventConflicts(originalMessage, event, user, joinType)
        return true
    } 
    return false
}

function reviewEventConflicts(originalMessage, joinedEvent, user, joinType) {
    if(joinType === JoinTypes.JOIN || joinType === JoinTypes.ALTERNATE) {
        const startTime = addMinutesToDate(getCurrentUTCDate(joinedEvent.eventDate), -61)
        const endTime = addMinutesToDate(getCurrentUTCDate(joinedEvent.eventDate), 61)
        getEventsWithTimeframe(originalMessage.guild.id, startTime, endTime, user.username).then(async events => {
            logger.debug(`found events in this timeframe: ${events.length}`)
            if(events && events.length > 0) {
                let activityText = 'joined'
                if(joinType === JoinTypes.ALTERNATE) {
                    activityText = 'joined as an alternate'
                }
                let embeds = []
                for(const event of events) {
                    logger.debug(`does it match the joined event: ${event.id === joinedEvent.id}`)
                    if(event.id !== joinedEvent.id) {
                        embeds.push(await getEventEmbed(event, originalMessage.guild))
                        logger.debug(`pushed an event to embeds, ${embeds.length}`)
                    }
                }
                if(embeds.length > 0) {
                    logger.debug(`have > 0 conflicting event`)
                    user.send({ 
                        content: `One or more events may conflict with the event you just ${activityText}: **${joinedEvent.getMiniTitle()}**
                        \nPlease review the following events to make sure they will not be an issue with your schedule and make any needed adjustments.`, 
                        embeds: embeds 
                    })
                }
            }
        })
    }
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

function transferEvent(message) {
    const channelName = message.channel.name
    let eventId = getEventIdFromChannel(channelName)
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

module.exports = {
    handleJoinAction: handleJoinAction,
    transferEvent: transferEvent
}