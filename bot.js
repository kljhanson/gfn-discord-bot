const Discord = require('discord.js')
const { REST } = require('@discordjs/rest');
const fs = require("fs")
const path = require('node:path');
const {getConfig} = require('./src/lib/config')
const dbUtils = require('./src/models/db-utils')
const { initEventTypes, initEventGames } = require('./src/models/event-types-model')
const {setBotUser, getVersion} = require('./src/lib/global-vars')
const { executeMemeMessages } = require('./src/commands/memes')
const { executeIronBannerMessage } = require('./src/commands/iron-banner')
const { executeEventMessage } = require('./src/commands/events')
const { executeSettingsMessage } = require('./src/commands/settings')
const { executeGeneralMessage } = require('./src/commands/general')
const { executeEventTypeMessage } = require('./src/commands/event-types')
const { handleReactionRoles, executeReactionRoleMessage } = require('./src/commands/roles')

// initialize Discord client
const client = new Discord.Client({ 
	intents: [
		Discord.GatewayIntentBits.GuildPresences,
		Discord.GatewayIntentBits.GuildMembers,
		Discord.GatewayIntentBits.GuildEmojisAndStickers,
		Discord.GatewayIntentBits.GuildMembers,
		Discord.GatewayIntentBits.GuildMessageReactions,
		Discord.GatewayIntentBits.GuildMessages,
		Discord.GatewayIntentBits.Guilds,
		Discord.GatewayIntentBits.MessageContent,
		Discord.GatewayIntentBits.DirectMessages
	],
	partials: [Discord.Partials.Message, Discord.Partials.Channel, Discord.Partials.Reaction]
})
const logger = require('./src/lib/logger');
const { cleanupExpiredEvents } = require('./src/lib/events/event-maintenance');
const { processEventNotifications, processDailyNotifications } = require('./src/lib/events/event-notifications');
const { executeEventReaction } = require('./src/reactions/event');

const commands = [];
const commandsPath = path.join(__dirname, 'src/slash-commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
client.commands = new Discord.Collection();

for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	logger.debug(filePath)
	const command = require(filePath);
	commands.push(command.data.toJSON());
	client.commands.set(command.data.name, command);
}


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
client.on('messageCreate', msg => {
	logger.debug(msg)
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
	logger.debug(`${reaction.message.author}'s message "${reaction.message.content}" gained a reaction!`)
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
	setInterval(cleanupExpiredEvents, EVENT_CLEANUP_INTERVAL, client)
	setInterval(processEventNotifications, EVENT_NOTIFICATION_INTERVAL, client)
	setInterval(processDailyNotifications, EVENT_NOTIFICATION_INTERVAL, client)
	cleanupExpiredEvents(client)
	processEventNotifications(client)
	processDailyNotifications(client)
})

client.on('interactionCreate', async interaction => {
	logger.debug(interaction.commandName)
	logger.debug(interaction.commandType)
	logger.debug(interaction.isAutocomplete())
	logger.debug(interaction.isChatInputCommand())

	// filter out interactions we don't care about
	if (!interaction.isChatInputCommand()
		&& !interaction.isAutocomplete()) return;

	let commandName = interaction.commandName
	const command = interaction.client.commands.get(commandName);

	if (!command) return;

	try {
		logger.debug(`execute command: ${commandName}`)
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		if(interaction) {
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
		}
	}
});


// start bot
const botToken = fs.readFileSync(getConfig().tokenPath).toString()
client.login(botToken)

const rest = new REST({ version: '10' }).setToken(botToken);

rest.put(Discord.Routes.applicationCommands("744202858429153291"), { body: commands })
	.then(() => console.log('Successfully registered application commands.'))
	.catch(console.error);
