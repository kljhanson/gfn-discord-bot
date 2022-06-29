const mongoose = require('mongoose');

const userPreferencesSchema = new mongoose.Schema({
    guildId: String,
    userId: String,
    userName: String,
    optInDailyNotifications: Boolean,
    dailyNotificationTime: String,
    optOutDirectMessages: Boolean,
});

const UserPreferences = mongoose.model('userPreferences', userPreferencesSchema);

async function getUserPreference(guildId, userId) {
    return await UserPreferences.findOne({guildId: guildId, userId: userId}).exec()
}

async function getNotificationPreferences(timeString) {
    const regex = new RegExp(timeString, "g")
    return await UserPreferences.find({optInDailyNotifications: true, dailyNotificationTime: regex}).exec()
}

async function updateUserDailyNotification(guildId, userId, userName, optIn, dailyNotificationTime) {
    return await UserPreferences.findOneAndUpdate({guildId: guildId, userId: userId},
        { $set: { userName: userName, optInDailyNotifications: optIn, dailyNotificationTime: dailyNotificationTime }}, {upsert: true, new: true}).exec()
}

async function updateUserDirectMessagePreference(guildId, userId, userName, optOutSetting) {
    return await UserPreferences.findOneAndUpdate({guildId: guildId, userId: userId},
        { $set: { userName: userName, optOutDirectMessages: optOutSetting }}, {upsert: true, new: true}).exec()
}

module.exports = {
    UserPreferences: UserPreferences,
    getUserPreference: getUserPreference,
    updateUserDailyNotification: updateUserDailyNotification,
    getNotificationPreferences: getNotificationPreferences,
    updateUserDirectMessagePreference: updateUserDirectMessagePreference
}