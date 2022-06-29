const mongoose = require('mongoose');

const eventChannelConfigSchema = new mongoose.Schema({
    game: String,
    eventsChannelID: String,
    eventsChannelName: String
});

const configurationSchema = new mongoose.Schema({
    guildId: String,
    eventsChannelID: String,
    eventsChannelName: String,
    nextEventId: Number,
    eventCleanupWindow: Number,
    blessedRoles: [String],
    eventChannels: [eventChannelConfigSchema]
});

const GFNConfiguration = mongoose.model('gfnConfiguration', configurationSchema);

async function getConfiguration(guildId) {
    return await GFNConfiguration.findOne({guildId: guildId}).exec()
}

async function getGameEventChannel(guildId, game) {
    let config =  await GFNConfiguration.findOne({guildId: guildId}).exec()
    let channel
    if(config && config.eventChannels) {
        channel = config.eventChannels.filter(channel => channel.game === game)[0]
    }
    if(channel) {
        return {
            eventsChannelID: channel.eventsChannelID,
            eventsChannelName: channel.eventsChannelName
        }
    }
    else {
        return {
            eventsChannelID: config.eventsChannelID,
            eventsChannelName: config.eventsChannelName
        }
    }
}

async function getNextEventId(guildId) {
    return await GFNConfiguration.findOneAndUpdate({guildId: guildId}, { $inc: { nextEventId: 1 }}, {upsert: true, new: true}).exec()
}

async function updateCleanupWindow(guildId, cleanupWindow) {
    return await GFNConfiguration.findOneAndUpdate({guildId: guildId}, { $set: { eventCleanupWindow: cleanupWindow }}, {upsert: true, new: true}).exec()
}

async function updateEventsChannel(guildId, channelId, channelName) {
    return await GFNConfiguration.findOneAndUpdate({guildId: guildId},
        { $set: { eventsChannelID: channelId, eventsChannelName: channelName }}, {upsert: true, new: true}).exec()
}

async function updateGameEventChannel(guildId, game, channelId, channelName) {
    return await GFNConfiguration.findOneAndUpdate({guildId: guildId},
        { $addToSet: { eventChannels: [{ game: game, eventsChannelID: channelId, eventsChannelName: channelName }]}}, {upsert: true, new: true}).exec()
}

async function blessRole(guildId, role) {
    return await GFNConfiguration.findOneAndUpdate({guildId: guildId},
        { $addToSet: { blessedRoles: [role]}}, {upsert: true, new: true}).exec()
}

async function smiteRole(guildId, role) {
    return await GFNConfiguration.findOneAndUpdate({guildId: guildId},
        { $pull: { blessedRoles: role}}).exec()
}



module.exports = {
    GFNConfiguration: GFNConfiguration,
    getConfiguration: getConfiguration,
    getGameEventChannel: getGameEventChannel,
    getNextEventId: getNextEventId,
    updateEventsChannel: updateEventsChannel,
    updateCleanupWindow: updateCleanupWindow,
    updateGameEventChannel: updateGameEventChannel,
    blessRole: blessRole,
    smiteRole: smiteRole
}