const mongoose = require('mongoose');
const eventTypeInit = require('../../assets/eventTypesInit.json')
const eventGamesInit = require('../../assets/eventGamesInit.json');
const logger = require('../lib/logger');

const eventSubtypeSchema = new mongoose.Schema({
    name: String,
    shortname: String,
    emote: String,
    defaultMax: Number
})
const eventTypesSchema = new mongoose.Schema({
    id: String,
    game: String,
    name: String,
    shortname: String,
    emote: String,
    icon: String,
    color: String,
    defaultMax: Number,
    options: [eventSubtypeSchema]
});
const eventGamesSchema = new mongoose.Schema({
    id: String,
    name: String,
    shortname: String,
    emote: String,
    defaultIcon: String
});

const EventTypes = mongoose.model('eventTypes', eventTypesSchema);
const EventGames = mongoose.model('eventGames', eventTypesSchema);

async function initEventTypes() {
    let oneDoc = await EventTypes.findOne().exec()
    if(!oneDoc) {
        await EventTypes.insertMany(eventTypeInit)
    }
}

async function initEventGames() {
    let oneDoc = await EventGames.findOne().exec()
    if(!oneDoc) {
        await EventGames.insertMany(eventGamesInit)
    }
}

async function getEventGames() {
    return await EventGames.find().exec()
}

async function getEventTypes() {
    return await EventTypes.find().exec()
}

async function getEventTypesByGame(game) {
    return await EventTypes.find({game: game}).exec()
}


async function getEventTypeById(id) {
    return await EventTypes.findOne({id: id}).exec()
}

async function getEventTypeByEmote(emote) {
    return await EventTypes.findOne({emote: emote}).exec()
}

function saveEventType(eventType) {
    eventType.save(function(err, updatedEventType) {
        if(err) return logger.error(err)
        logger.info(`saved eventType ${updatedEventType.id}`)
    })
}

async function createEventType(id, game, name, shortname, emote, icon, color, defaultMax) {
    let eventType = new EventTypes({
        id: id,
        game: game,
        name: name,
        shortname: shortname,
        emote: emote,
        icon: icon,
        color: color,
        defaultMax: defaultMax,
        options: []
    });
    saveEventType(eventType)
    return eventType
}

function saveEventGame(eventGame) {
    eventGame.save(function(err, updatedEventGame) {
        if(err) return logger.error(err)
        logger.info(`saved eventGame ${updatedEventGame.id}`)
    })
}

async function createEventGame(id, name, shortname, emote, defaultIcon) {
    let eventGame = new EventGames({
        id: id,
        name: name,
        shortname: shortname,
        emote: emote,
        defaultIcon: defaultIcon
    });
    saveEventGame(eventGame)
    return eventGame
}

async function addEventSubType(typeId, name, shortname, emote, defaultMax) {
    return await EventTypes.findOneAndUpdate({id: typeId},
        { $addToSet: { options: [{ name: name, shortname: shortname, emote: emote, defaultMax: defaultMax }]}}).exec()
}


module.exports = {
    EventTypes: EventTypes,
    EventGames: EventGames,
    getEventTypes: getEventTypes,
    getEventTypesByGame: getEventTypesByGame,
    getEventGames: getEventGames,
    getEventTypeById: getEventTypeById,
    getEventTypeByEmote: getEventTypeByEmote,
    initEventTypes: initEventTypes,
    initEventGames: initEventGames,
    createEventType: createEventType,
    saveEventType: saveEventType,
    createEventGame: createEventGame,
    saveEventGame: saveEventGame,
    addEventSubType: addEventSubType
}