/**
 * Handle messages related to creating and managing LFG events
 * Created: Kyle Hanson
 * Updated: 2020-08-09
 */
const logger = require('../lib/logger')
const {cleanupExpiredEvents, deleteEvent, refreshEventsChannel} = require('./events/event-cleanup')
const {handleJoinReaction, handleJoinAction, getEventDetails, transferEvent, editEventWithId} = require('./events/event-management')
const {startCreateNewEvent} = require('./events/event-create')
const {processEventNotifications, processDailyNotifications} = require('./events/event-notifications')
const { JoinTypes } = require('../models/event-model')
const { matchMessage, sendMessage, sendReply, sendImage, getMessageParams } = require('../lib/discord-utils')
const { getEventById } = require('../models/event-model')
const { isNumeric }  = require('../lib/utils')

function executeEventMessage(msg) {
    if (matchMessage(msg, 'create')) {
        const type = getMessageParams(msg, "create", -1, true)
        startCreateNewEvent(msg, type)
    }
    if (matchMessage(msg, 'get')) {
        const eventId = getMessageParams(msg, "get", 1)
        if (!eventId) {
            sendReply(msg, 'Please supply an eventId (example: `gfn/get 123`)')
        } else {
            logger.debug(eventId)
            getEventDetails(msg, eventId)
        }
    }
    if (matchMessage(msg, 'edit')) {
        const firstParam = getMessageParams(msg, "edit", 1)
        const secondParam = getMessageParams(msg, "edit", 2)
        let eventId;
        let editType;
        if(isNumeric(firstParam)) {
            eventId = firstParam
            editType = secondParam
        } else if(isNumeric(secondParam)) {
            eventId = secondParam
            editType = firstParam
        }
        if (!eventId) {
            if(msg.channel.name.startsWith("id-")) {
                let name = msg.channel.name.slice(3, msg.channel.name.length)
                let id = name.slice(0,name.indexOf('-'))
                logger.debug('parse id from channel name')
                logger.debug(name)
                logger.debug(id)
                eventId = id
                editType = firstParam
            }
            if(!eventId) {
                sendReply(msg, 'Please supply an eventId (example: `gfn/edit 123`)')
            }
        }
        if(eventId) {
            logger.debug(eventId)
            editEventWithId(msg, eventId, editType)
        }
    }
    if (matchMessage(msg, 'delete')) {
        const eventId = getMessageParams(msg, "delete", 1)
        if (!eventId) {
            sendReply(msg, 'Please supply an eventId (example: `gfn/delete 123`)')
        } else {
            logger.debug(eventId)
            deleteEvent(msg, eventId)
        }
    }
    if(matchMessage(msg, 'join')) {
        processJoinMessage(msg, 'join')
    }
    if(matchMessage(msg, 'kick')) {
        processJoinMessage(msg, 'kick')
    }
    if(matchMessage(msg, 'leave')) {
        processJoinMessage(msg, 'leave')
    }
    if(matchMessage(msg, 'alt')) {
        processJoinMessage(msg, 'alt')
    }
    if(matchMessage(msg, 'alternate')) {
        processJoinMessage(msg, 'alternate')
    }
    if(matchMessage(msg, 'int')) {
        processJoinMessage(msg, 'int')
    }
    if(matchMessage(msg, 'interested')) {
        processJoinMessage(msg, 'interested')
    }
    if(matchMessage(msg, 'transfer')) {
        transferEvent(msg)
    }
    if(matchMessage(msg, 'refresh')) {
        refreshEventsChannel(msg)
    }
}

function processJoinMessage(message, joinCmd) {
    let joinType = JoinTypes.LEAVE
    if(joinCmd === 'join') {
        joinType = JoinTypes.JOIN
    }
    else if(joinCmd === 'alt' || joinCmd === 'alternate') {
        joinType = JoinTypes.ALTERNATE
    }
    else if(joinCmd === 'int' || joinCmd === 'interested') {
        joinType = JoinTypes.INTERESTED
    }
    let eventId
    if(message.channel.name.startsWith('id-')) {
        const re = new RegExp(`^id-(\\d+)-.+`, "g");
        let matches = re.exec(message.channel.name)
        logger.debug(`matches: ${matches}`)
        eventId = matches[1]
        logger.debug(`matched eventId: ${eventId}`)
    }
    if (!eventId && message.mentions && message.mentions.users.array().length > 0) {
        const params = getMessageParams(message, joinCmd, -1)
        const param = params[params.length - 1]
        if(isNumeric(param)) {
            eventId = param;
        }
    } 
    if(!eventId) {
        const params = getMessageParams(message, joinCmd, 1)
        if(isNumeric(params)) {
            eventId = params;
        }
    }
    if(!eventId) {
        sendReply(message, `Please supply an eventId (example: \`gfn/${joinCmd} [@otherUser] 123\`)`)
    }
    else {
        let joinUsers = []
        if(message.mentions && message.mentions.users.array().length > 0) {
            message.mentions.users.forEach(user => {
                joinUsers.push(user)
            })
        } else {
            joinUsers.push(message.author)
        }
        logger.debug(`search for matching event: ${eventId}, guildID: ${message.guild.id}`)
        getEventById(message.guild.id, eventId).then(event => {
            logger.debug(`found event:`)
            logger.debug(event)
            if(message.mentions && message.mentions.users.array().length > 0
                && message.author.username !== event.creator && !message.member.hasPermission("ADMINISTRATOR")) {
                sendReply(message, `You are not the creator of the event and do not have permission to alter membership: _${event.getMiniTitle()}_`)
            }
            else {
                joinUsers.forEach(user => {
                    if(handleJoinAction(message, joinType, user, event)) {
                        let actionDescription = "has left event"
                        if(joinType === JoinTypes.JOIN) {
                            actionDescription = "added to event"
                        }
                        else if(joinType === JoinTypes.ALTERNATE) {
                            actionDescription = "is now an alternate for event"
                        }
                        else if(joinType === JoinTypes.INTERESTED) {
                            actionDescription = "is now interested in event"
                        }
                        else if(joinCmd === 'kick') {
                            actionDescription = "was kicked from event"
                        }
                        sendMessage(message, `<@${user.id}> ${actionDescription} ${event.getMiniTitle()}`)
                    } else {
                        let actionDescription = "is not a member of event"
                        if(joinType === JoinTypes.JOIN) {
                            actionDescription = "is already joined for event"
                        }
                        else if(joinType === JoinTypes.ALTERNATE) {
                            actionDescription = "is already an alternate for event"
                        }
                        else if(joinType === JoinTypes.INTERESTED) {
                            actionDescription = "is already interested in event"
                        }
                        sendMessage(message, `<@${user.id}> ${actionDescription} ${event.getMiniTitle()}`)
                    }
                })
            }
        })
    }
}

function executeEventReaction(reaction, user) {
    const embeds = reaction.message.embeds
    if (embeds && embeds.length > 0 && embeds[0].fields.length > 0 && embeds[0].fields.map(field => field.name).includes("Event ID")) {
        const eventIdField = embeds[0].fields.filter(field => field.name === "Event ID")[0]
        const eventId = eventIdField.value
        logger.debug(`Reacted on eventId: ${eventId}`)
        handleJoinReaction(reaction, user, eventId)
    }
}

function executeEventCleanup(client) {
    logger.info(`Review events to clean up`)
    cleanupExpiredEvents(client)
}

function executeEventNotifications(client) {
    logger.info(`Process event notifications`)
    processEventNotifications(client)
}

function executeDailyNotifications(client) {
    logger.info(`Process daily notifications`)
    processDailyNotifications(client)
}

module.exports = {
    executeEventMessage: executeEventMessage,
    executeEventReaction: executeEventReaction,
    executeEventCleanup: executeEventCleanup,
    executeEventNotifications: executeEventNotifications,
    executeDailyNotifications: executeDailyNotifications
}