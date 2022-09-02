const { handleJoinAction } = require("../lib/events/event-members")
const logger = require("../lib/logger")
const { JoinTypes, getEventById } = require("../models/event-model")
const JoinEmotes = require('../../assets/event-emotes.json')


function executeEventReaction(reaction, user) {
    const embeds = reaction.message.embeds
    if (embeds && embeds.length > 0 && embeds[0].fields.length > 0 && embeds[0].fields.map(field => field.name).includes("Event ID")) {
        const eventIdField = embeds[0].fields.filter(field => field.name === "Event ID")[0]
        const eventId = eventIdField.value
        logger.debug(`Reacted on eventId: ${eventId}`)
        handleJoinReaction(reaction, user, eventId)
    }
}

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

module.exports = {
    executeEventReaction: executeEventReaction,
    handleJoinReaction: handleJoinReaction
}