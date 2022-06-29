const Discord = require('discord.js')
const {getConfig} = require('./src/lib/config')
const dbUtils = require('./src/models/db-utils')
const { initEventTypes, initEventGames } = require('./src/models/event-types-model')
const {setBotUser, getVersion} = require('./src/lib/global-vars')
const {matchMessage, sendMessage, sendReply, sendImage} = require('./src/lib/discord-utils')
const { executeMemeMessages } = require('./src/commands/memes')
const { executeIronBannerMessage } = require('./src/commands/iron-banner')
const { executeEventMessage, executeEventReaction, executeEventCleanup, executeEventNotifications, executeDailyNotifications } = require('./src/commands/events')
const { executeSettingsMessage } = require('./src/commands/settings')
const { executeGeneralMessage } = require('./src/commands/general')
const { executeEventTypeMessage } = require('./src/commands/event-types')
const { handleReactionRoles, executeReactionRoleMessage } = require('./src/commands/roles')
const client = new Discord.Client({ partials: ['MESSAGE', 'CHANNEL', 'REACTION'] })
const logger = require('./src/lib/logger')

const EVENT_CLEANUP_INTERVAL = 1 * 60 * 1000
const EVENT_NOTIFICATION_INTERVAL = 1 * 60 * 1000

if(!process.env.NODE_ENV) {
	process.env.NODE_ENV = 'development'
}
logger.info(`GFN Discord Bot -- Version ${getVersion()}`)
logger.info(`bot initialized using ${process.env.NODE_ENV} environment`)
// initalize database connections
dbUtils.initMongo()

// message index
client.on('message', msg => {
    executeMemeMessages(msg)
    executeIronBannerMessage(msg)
	executeEventMessage(msg)
	executeSettingsMessage(msg)
	executeGeneralMessage(msg)
	executeEventTypeMessage(msg)
	executeReactionRoleMessage(msg)
})

client.on('messageReactionAdd', async (reaction, user) => {
	// When we receive a reaction we check if the reaction is partial or not
	if (reaction.partial) {
		// If the message this reaction belongs to was removed the fetching might result in an API error, which we need to handle
		try {
			await reaction.fetch();
		} catch (error) {
			console.error('Something went wrong when fetching the message: ', error);
			// Return as `reaction.message.author` may be undefined/null
			return;
		}
    }
    if(user.id !== client.user.id && reaction.message.author.id === client.user.id) {
		executeEventReaction(reaction, user)
    } else if(user.id !== client.user.id) {
		handleReactionRoles(reaction, user, true)
	}
});

client.on('messageReactionRemove', async (reaction, user) => {
	// When we receive a reaction we check if the reaction is partial or not
	if (reaction.partial) {
		// If the message this reaction belongs to was removed the fetching might result in an API error, which we need to handle
		try {
			await reaction.fetch();
		} catch (error) {
			console.error('Something went wrong when fetching the message: ', error);
			// Return as `reaction.message.author` may be undefined/null
			return;
		}
    }
    if(user.id !== client.user.id) {
		handleReactionRoles(reaction, user, false)
	}
});

client.on('ready', () => {
	setBotUser(client.user)
	initEventTypes()
	initEventGames()
	setInterval(executeEventCleanup, EVENT_CLEANUP_INTERVAL, client)
	setInterval(executeEventNotifications, EVENT_NOTIFICATION_INTERVAL, client)
	setInterval(executeDailyNotifications, EVENT_NOTIFICATION_INTERVAL, client)
	executeEventCleanup(client)
	executeEventNotifications(client)
	executeDailyNotifications(client)
})

// start bot
client.login(getConfig().token)

