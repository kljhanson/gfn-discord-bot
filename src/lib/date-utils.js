const chrono = require('chrono-node')
const { parse } = require('chrono-node/dist/locales/en')
var moment = require('moment-timezone')
const logger = require('./logger')

function parseDateString(dateString) {
    let ctOffset = new Date().getTimezoneOffset()*-1
    logger.info(`offset: ${ctOffset}`)
    const timezoneOffsets = {
        'CT': ctOffset,
        'ET': ctOffset+60,
        'PT': ctOffset-120,
        'MT': ctOffset-60
    }
    logger.info(timezoneOffsets)
    let results = chrono.parseDate(dateString, new Date(), {
        forwardDate: true,
        timezones: timezoneOffsets
    }) //[0];
    logger.info(results)
    return results //.start.date()
}

function toDateString(date, format, zone, abbreviation) {
    let dateFormat = format
    if(!format) { 
        dateFormat = 'h:mm A zz MM/DD (ddd)'        
    }
    let timezone = 'America/Chicago'
    if(zone) {
        timezone = zone
    }
    else if(abbreviation) {
        timezone = getTimezoneFromAbbreviation(abbreviation)
    }
    return moment(date).tz(timezone).format(dateFormat)
}

function toTimeString(date, format, zone, abbreviation) {
    let dateFormat = format
    if(!format) { 
        dateFormat = 'h:mm A zz'        
    }
    let timezone = 'America/Chicago'
    if(zone) {
        timezone = zone
    }
    else if(abbreviation) {
        timezone = getTimezoneFromAbbreviation(abbreviation)
    }
    return moment(date).tz(timezone).format(dateFormat)
}

function toISOString(date) {
    return moment(date).toISOString()
}

function getCurrentUTCDate(date) {
    let momentDate = moment()
    if(date) {
        momentDate = moment(date)
    }
    return momentDate.utc()
}

function getCurrentUTCDateToTheMinute() {
    return moment().utc().second(0).millisecond(0)
}

function addMinutesToDate(date, minutes) {
    return date.minutes(date.minutes() + minutes)
}

function getTimezoneFromAbbreviation(abbreviation) {
    if(abbreviation == 'CT' || abbreviation == 'CDT' || abbreviation == 'CST') {
        return 'America/Chicago'
    }
    else if(abbreviation == 'ET' || abbreviation == 'EDT' || abbreviation == 'EST') {
        return 'America/New_York'
    }
    else if(abbreviation == 'PT' || abbreviation == 'PDT' || abbreviation == 'PST') {
        return 'America/Los_Angeles'
    }
    else if(abbreviation == 'MT' || abbreviation == 'MDT' || abbreviation == 'MST') {
        return 'America/Denver'
    } 
    else {
        return 'America/Chicago'
    }
}

module.exports = {
    parseDateString: parseDateString,
    toDateString: toDateString,
    getCurrentUTCDate: getCurrentUTCDate,
    addMinutesToDate: addMinutesToDate,
    toTimeString: toTimeString,
    toISOString: toISOString,
    getCurrentUTCDateToTheMinute: getCurrentUTCDateToTheMinute
}