const mongoose = require('mongoose');
const { Timestamp } = require('mongodb');
const { getRandomInt, removeFromArray } = require('../lib/utils')
const { toDateString } = require('../lib/date-utils')
const {getNextEventId} = require('./configuration-model')
const {getEventTypeById} = require('./event-types-model')
const moment = require('moment-timezone')
const logger = require('../lib/logger');

const JoinTypes = {
    JOIN: 'join',
    ALTERNATE: 'alt',
    INTERESTED: 'int',
    LEAVE: 'leave',
}


const eventSchema = new mongoose.Schema({
    id: String,
    name: String,
    description: String,
    game: String,
    type: String,
    subtype: String,
    eventDate: Date,
    maxMembers: Number,
    members: Array,
    alternates: Array,
    interested: Array,
    creator: String,
    createDate: Date,
    updatedDate: Date,
    guildId: String,
    status: String,
    eventChannelId: String,
    private: Boolean
});

eventSchema.methods.updateMemberStatus = function(username, joinType) {
    const joins = removeFromArray(this.getMembers(), username)
    const alts = removeFromArray(this.getAlternates(), username)
    const ints = removeFromArray(this.getInterested(), username)
    logger.debug(joins)
    logger.debug(alts)
    logger.debug(ints)
    if(joinType == JoinTypes.JOIN) {
        joins.push(username)
    }
    else if(joinType == JoinTypes.ALTERNATE) {
        alts.push(username)
    }
    else if(joinType == JoinTypes.INTERESTED) {
        ints.push(username)
    }
    this.members = joins
    this.alternates = alts
    this.interested = ints
    logger.debug(this)
    saveEvent(this)
    return this
}

eventSchema.methods.isFull = function() {
    return this.getMembers().length == this.maxMembers
}

eventSchema.methods.getMembers = function() {
    const currMembers = this.members
    if(!currMembers) {
        currMembers = []
    }
    return currMembers
}

eventSchema.methods.addMember = function (username) {
    const currMembers = this.getMembers()
    currMembers.push(username)
    this.members = currMembers
    logger.info(`added ${username} to members list for event ${this.id}`);
    saveEvent(this)
}

eventSchema.methods.removeMember = function (username) {
    const currMembers = this.getMembers()
    if(currMembers.indexOf(username) > -1) {
        currMembers = currMembers.splice(currMembers.indexOf(username), 1)
        this.members = currMembers
        logger.info(`removed ${username} from members list for event ${this.id}`);
        saveEvent(this)
    } else {
        logger.warn(`username ${username} not found in event`)
    }
}

eventSchema.methods.getAlternates = function() {
    const currAlts = this.alternates
    if(!currAlts) {
        currAlts = []
    }
    return currAlts
}

eventSchema.methods.addAlternate = function (username) {
    const currAlts = this.getAlternates()
    currAlts.push(username)
    this.alternates = currAlts
    logger.info(`added ${username} to alternates list for event ${this.id}`);
    saveEvent(this)
}

eventSchema.methods.removeAlternate = function (username) {
    const currAlts = this.getAlternates()
    if(currAlts.indexOf(username) > -1) {
        currAlts = currAlts.splice(currAlts.indexOf(username), 1)
        this.alternates = currAlts
        logger.info(`removed ${username} from alternates list for event ${this.id}`);
        saveEvent(this)
    } else {
        logger.warn(`username ${username} not found in event`)
    }
}

eventSchema.methods.getInterested = function() {
    const currInterested = this.interested
    if(!currInterested) {
        currInterested = []
    }
    return currInterested
}


eventSchema.methods.addInterested = function (username) {
    const currInterested = this.getInterested()
    currInterested.push(username)
    this.interested = currInterested
    logger.info(`added ${username} to interested list for event ${this.id}`);
    saveEvent(this)
}

eventSchema.methods.removeInterested = function (username) {
    const currInterested = this.getInterested()
    if(currInterested.indexOf(username) > -1) {
        currInterested = currInterested.splice(currInterested.indexOf(username), 1)
        this.interested = currInterested
        logger.info(`removed ${username} from interested list for event ${this.id}`);
        saveEvent(this)
    } else {
        logger.warn(`username ${username} not found in event`)
    }
}

eventSchema.methods.getMemberList = function() {
    return getAttendeeList(this.members)
}

eventSchema.methods.getAlternatesList = function() {
    return getAttendeeList(this.alternates)
}

eventSchema.methods.getInterestedList = function() {
    return getAttendeeList(this.interested)
}

eventSchema.methods.getChannelName = function() {
    let title = this.name.toLowerCase().replace(/[^A-Za-z0-9\s]/g, '').replace(/ +(?= )/g,'').trim().replace(/\s/g, '-').substring(0, 20)
    if(title.endsWith("-")) {
        title = title.substring(0, title.length-1)
    }
    let eventType = getEventTypeById(this.type)
    if(eventType && eventType.options && this.subtype) {
        const eventOption = eventType.options.filter(opt => opt.name.toLowerCase() === this.subtype.toLowerCase())
        if(eventOption && eventOption.length === 1) {
            let subtitle = title
            if(this.name.toLowerCase() === eventOption[0].name.toLowerCase()) {
                subtitle = toDateString(this.eventDate, 'ddd-MMM-DD-HHmm-z', 'America/New_York')
            }
            title = eventOption[0].shortname + '-' +subtitle
        }
    }
    const channelName = `id-${this.id}-${title}`
    logger.info(`event channel name: ${channelName}`)
    return channelName
}

eventSchema.methods.getMiniTitle = function() {
    return `${this.id} - ${this.name} (${toDateString(this.eventDate)})`
}

function getAttendeeList(arrMembers) {
    if(!arrMembers || arrMembers.length == 0) {
        return "None"
    }
    return arrMembers.join(", ")
}

const Event = mongoose.model('event', eventSchema);

function saveEvent(event) {
    event.save(function(err, updatedEvent) {
        if(err) return logger.error(err)
        logger.info(`saved event ${updatedEvent.eventId}`)
    })
}

function createEvent(name, description, game, type, subtype, eventDate, maxMembers, username, guildId, eventChannelId, members, privateEvent = false) {
    const currentDate = Date.now()
    let joinedMembers = [username];
    if(members && members.length > 0) {
        members.forEach(mem => {
            if(mem !== username) {
                joinedMembers.push(mem)
            }
        })
    }
    return getNextEventId(guildId).then(config => {
        let eventId = config.nextEventId;
        if(eventId < 1) {
            getRandomInt(999999)
        }
        let event = new Event({
            id: eventId,
            name: name,
            description: description,
            game: game,
            type: type,
            subtype: subtype,
            eventDate: eventDate,
            maxMembers: maxMembers,
            members: joinedMembers,
            alternates: [],
            interested: [],
            creator: username,
            createDate: currentDate,
            updatedDate: currentDate,
            guildId: guildId,
            status: 'Active',
            eventChannelId: eventChannelId,
            private: privateEvent
        });
        saveEvent(event)
        return event
    })
}

async function getEventById(guildId, eventId) {
    return await Event.findOne({guildId: guildId, id: eventId}).exec()
}

async function getExpiredEvents(guildId, cleanupWindow) {
    if(!cleanupWindow || cleanupWindow < 1) {
        cleanupWindow = 12
    }
    let date = moment().utc().hour(moment().utc().hour() - cleanupWindow)
    // let date = new Date().setHours(new Date().getUTCDate().getHours() - cleanupWindow)
    logger.info(`Getting expired events before ${date} for GuildId: ${guildId}`)
    return await Event.find({guildId: guildId, eventDate: { $lte: date }, status: "Active"}).exec()
}

async function getActiveEvents(guildId, game, games, includePrivate = false, username) {
    let query = {guildId: guildId, status: "Active"}
    if(game) {
        query.game = game
    }
    else if(games) {
        query.game = {
            $in: games
        }
    }
    if(!includePrivate) {
        query.private = {
            $ne: true
        }
    }
    return await Event.find(query).sort({eventDate: 1}).exec()
}

async function getEventsWithTimeframe(guildId, startTime, endTime, member, includePrivate = false) {
    let query = {guildId: guildId, status: "Active", eventDate: {
        $gte: startTime,
        $lt: endTime
    }}
    if(member) {
        query.members = member
    }
    if(!includePrivate) {
        query.private = {
            $ne: true
        }
    }
    return await Event.find(query).sort({eventDate: 1}).exec()
}

async function getEventsStartingAt(guildId, startTime) {
    return await Event.find({guildId: guildId, status: "Active", eventDate: startTime}).sort({eventDate: 1}).exec()
}

async function getDailyEvents(guildId, userName, startTime, endTime) {
    return await Event.find({guildId: guildId, members: userName, status: "Active", eventDate: {
        $gte: startTime,
        $lt: endTime
    }}).sort({eventDate: 1}).exec()
}

module.exports = {
    Event: Event,
    JoinTypes: JoinTypes,
    createEvent: createEvent,
    getEventById: getEventById,
    saveEvent: saveEvent,
    getExpiredEvents: getExpiredEvents,
    getActiveEvents: getActiveEvents,
    getEventsWithTimeframe: getEventsWithTimeframe,
    getEventsStartingAt: getEventsStartingAt,
    getDailyEvents: getDailyEvents
}