const mongoose = require('mongoose');
const logger = require('../lib/logger');

const reactionRolesSchema = new mongoose.Schema({
    guildId: String,
    messageId: String,
    channelId: String,
    roleName: String,
    emojiId: String,
    emojiName: String
});

const ReactionRoles = mongoose.model('reactionRoles', reactionRolesSchema);

async function getReactionRoles(guildId) {
    return await ReactionRoles.find({guildId: guildId}).exec()
}

async function getRole(guildId, messageId, channelId, emojiName) {
    return await ReactionRoles.findOne({guildId: guildId, messageId: messageId, channelId: channelId, emojiName: emojiName}).exec()
}

function saveReactionRole(reactionRole) {
    reactionRole.save(function(err, updatedReactionRole) {
        if(err) return logger.error(err)
        logger.info(`saved reactionRole ${updatedReactionRole.id}`)
    })
}

async function createReactionRole(guildId, messageId, channelId, roleName, emojiName, emojiId) {
    let reactionRole = new ReactionRoles({
        guildId: guildId,
        messageId: messageId,
        channelId: channelId,
        roleName: roleName,
        emojiId: emojiId,
        emojiName: emojiName
    });
    saveReactionRole(reactionRole)
    return reactionRole
}

module.exports = {
    ReactionRoles: ReactionRoles,
    getReactionRoles: getReactionRoles,
    getRole: getRole,
    createReactionRole: createReactionRole
}