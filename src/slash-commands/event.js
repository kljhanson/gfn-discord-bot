const Discord = require('discord.js');
const { parseDateString } = require('../lib/date-utils')
const { Event, getActiveEvents, getEventById, JoinTypes } = require('../models/event-model')
const { getEventGames, getEventTypesByGame, getEventTypeById } = require('../models/event-types-model');
const { getEventEmbed } = require('../lib/events/event-ui')
const logger = require('../lib/logger');
const { createNewEvent, deleteEvent } = require('../lib/events/event-management');
const { toJson, isNumeric } = require('../lib/utils');
const { getEventIdFromChannel } = require('../lib/events/event-utils');
const { refreshEventsChannel } = require('../lib/events/event-maintenance');
const { handleJoinAction } = require('../lib/events/event-members');

async function autofillEventCreate(interaction) {
    logger.debug("we autocompleting")
    const focusedOption = interaction.options.getFocused(true);
    logger.debug(`focused option: ${focusedOption.name}`)

    if(focusedOption.name === "game") {
        logger.debug('yep')
        let eventGames = await getEventGames()
        let options = []
        if(eventGames && eventGames.length > 0) {
            options = eventGames.map(eg => ({value: eg.name, name: eg.name}))
        } else {
            options = [
                { name: 'Destiny 2', value: 'Destiny 2' },
                { name: 'Rocket League', value: 'Rocket League' },
                { name: 'Other Games', value: 'Other' },
            ]
        }
        const filtered = options.filter(choice => choice.name.toLowerCase().includes(focusedOption.value.toLowerCase()))
        logger.debug(`filtered options ${filtered}`)
        await interaction.respond(filtered)
    }

    if(focusedOption.name === "type") {
        logger.debug('yep')
        const selectedGame = interaction.options.getString("game")
        let eventTypes = await getEventTypesByGame(selectedGame)
        if(eventTypes && eventTypes.length > 0) {
            const options = eventTypes.map(et => ({value: et.id, name: et.name})).filter(choice => choice.name.toLowerCase().includes(focusedOption.value.toLowerCase()))
            logger.debug(`filtered options ${options}`)
            await interaction.respond(options)
        }
    }

    if(focusedOption.name === "subtype") {
        logger.debug('yep')
        const selectedGame = interaction.options.getString("game")
        const selectedType = interaction.options.getString("type")
        const eventType = await getEventTypeById(selectedType)
        let subtypeOptions = []
        if(eventType && eventType.options && eventType.options.length > 0) {
            eventType.options.forEach(option => {
                subtypeOptions.push({value: option.name, name: option.name})
            })
            if(subtypeOptions && subtypeOptions.length > 0) {
                const options = subtypeOptions.filter(choice => choice.name.toLowerCase().includes(focusedOption.value.toLowerCase()))
                logger.debug(`filtered options ${options}`)
                await interaction.respond(options)
            }
        } else {
            await interaction.respond([
                {
                    value: 'none',
                    name: 'None'
                }
            ])
        }
    }
}

async function handleEventCreate(interaction) {
    logger.debug("create new event")
    const game = interaction.options.getString("game")
    const type = interaction.options.getString("type")
    let subtype = interaction.options.getString("subtype")
    if(subtype == 'none') {
        subtype = null
    }
    const name = interaction.options.getString("name")
    const description = interaction.options.getString("description")
    const date = interaction.options.getString("date")
    const maxmembers = interaction.options.getInteger("maxmembers")
    let members = [interaction.user.username]
    for(var i = 1; i < 6; i++) {
        const attendee = interaction.options.getUser(`attendee${i}`)
        if(attendee && attendee.username && attendee.username.length > 0
            && attendee.username !== interaction.user.username) {
                members.push(attendee.username)
        }
    }
    const private = interaction.options.getBoolean("private")
    const isPrivate = private ? private : false
    const clanevent = interaction.options.getBoolean("clanevent")

    const now = new Date()
    const startDate = parseDateString(date)
    if (!startDate) {
        await interaction.reply("hmm, that didn't work, try to keep the date format simple and try again")
    } else if(startDate < now) {
        await interaction.reply(`**That date occurs in the past!** 
You provided the string:
    _"${date}"_ 
    
I parsed that to the following date:
    _"${startDate}"_ 

That occurs before the current date:
    _"${now}"_

Please correct this and try again! Reminder: you can use multiple types of formatting, some examples:
    YYYY-MM-dd 8:00pm CT
    MM/DD/YYYY 8pm EST
    tomorrorw at 7pm PT
Hint: you can use the up-arrow on your keyboard to "recover" the previous command`)
    } else {
        const eventType = await getEventTypeById(type)
        const finalMaxMembers = maxmembers ? maxmembers : (eventType.defaultMax ? eventType.defaultMax : 20)
        const eventDetails = {
            id: -1,
            name: name,
            description: description,
            game: game,
            type: type,
            subtype: subtype,
            eventDate: startDate,
            maxMembers: finalMaxMembers,
            members: members,
            alternates: [],
            interested: [],
            creator: interaction.user.username,
            createDate: Date.now(),
            updatedDate: Date.now(),
            guildId: interaction.guild.id,
            status: 'Active',
            eventChannelId: 'tbd',
            private: isPrivate,
            isClanEvent: clanevent ? clanevent : false
        }
        const event = new Event(eventDetails)
        logger.debug("event:")
        logger.debug(event)
        const embed = await getEventEmbed(event)
        logger.debug("got embed")
        
        const cancelButton = new Discord.ButtonBuilder()
            .setCustomId('event_cancel')
            .setLabel('Cancel')
            .setStyle(Discord.ButtonStyle.Secondary)

        const createButton = new Discord.ButtonBuilder()
            .setCustomId('event_create')
            .setLabel('Create')
            .setStyle(Discord.ButtonStyle.Primary)
            
        const buttons = new Discord.ActionRowBuilder().addComponents(cancelButton, createButton);
        
        await interaction.reply({ content: 'Create the following event:', embeds: [embed], components: [buttons], ephemeral: isPrivate })
            .then((message) => {
                logger.debug("add message collector")
                const filter = i => {
                    i.deferUpdate();
                    return i.user.id === interaction.user.id;
                };
                
                message.awaitMessageComponent({ filter, componentType: Discord.ComponentType.Button, time: 60000 })
                    .then(buttonDeets => {
                        if(buttonDeets.customId === 'event_cancel') {
                            interaction.editReply({content: "Cancelling event creation", embeds: [], components: []})
                            interaction.followUp({content: "Cancelling event creation"})
                        } else if(buttonDeets.customId === 'event_create') {
                            logger.debug("create button pressed")
                            createNewEvent(interaction, eventDetails)
                        }
                    }).catch(err => console.log(`No interactions were collected.`));
            })
    }
}

async function autofillEventId(interaction) {
    const focusedOption = interaction.options.getFocused(true);

    if(focusedOption.name === "eventid") {
        const events = await getActiveEvents(interaction.guild.id, null, null, true, interaction.member.user.username)
        let options = []
        logger.debug(`found ${events.length} active events`)
        if(events && events.length > 0) {
            options = events.map(event => ({value: parseInt(event.id), name: event.getMiniTitle()}))
        }

        logger.debug(`prepared the following options`)
        logger.debug(toJson(options))
        const filtered = options.filter(choice => choice.name.toLowerCase().includes(focusedOption.value.toLowerCase()))
        logger.debug(`filtered options ${filtered}`)
        if(filtered.length > 25) {
            await interaction.respond(filtered.slice(0, 24))
        } else {
            await interaction.respond(filtered)
        }
    }
}

async function handleEventDelete(interaction) {
    const eventId = interaction.options.getInteger('eventid')
    const event = await getEventById(interaction.guild.id, `${eventId}`)
    const embed = await getEventEmbed(event)
    logger.debug("got embed")
    
    const cancelButton = new Discord.ButtonBuilder()
        .setCustomId('event_cancel')
        .setLabel('Hold up')
        .setStyle(Discord.ButtonStyle.Secondary)

    const deleteButton = new Discord.ButtonBuilder()
        .setCustomId('event_delete')
        .setLabel('Yeet')
        .setStyle(Discord.ButtonStyle.Danger)
        
    const buttons = new Discord.ActionRowBuilder().addComponents(cancelButton, deleteButton);
    
    await interaction.reply({ content: 'Delete the following event?', embeds: [embed], components: [buttons] })
        .then((message) => {
            logger.debug("add message collector")
            const filter = i => {
                i.deferUpdate();
                return i.user.id === interaction.user.id;
            };
            
            message.awaitMessageComponent({ filter, componentType: Discord.ComponentType.Button, time: 60000 })
                .then(buttonDeets => {
                    if(buttonDeets.customId === 'event_cancel') {
                        interaction.editReply({content: "Cancelling event deletion", embeds: [], components: []})
                        interaction.followUp({content: "Cancelling event deletion"})
                    } else if(buttonDeets.customId === 'event_delete') {
                        logger.debug("delete button pressed")
                        deleteEvent(interaction, eventId)
                    }
                }).catch(err => logger.error(err));
        })
}

async function handleEventJoin(interaction, joinType, kick = false) {
    let eventId = interaction.options.getInteger('eventid')
    logger.debug(`eventId: ${eventId}`)
    if(!eventId) {
        eventId = getEventIdFromChannel(interaction.channel.name)
    }
    if(!eventId || (!Number.isInteger(eventId) && !isNumeric(eventId))) {
        logger.debug(`bad eventId: ${eventId}`)
        logger.debug(`${typeof eventId}`)
        logger.debug(`${Number.isInteger(eventId)}`)
        logger.debug(`${isNumeric(eventId)}`)
        return interaction.reply({content: `No eventId found! Must supply an eventId or use this command from an event channel`, ephemeral: true})
    }
    let joinUsers = []
    for(var i = 0; i < 6; i++) {
        let key = `attendee${i}`
        if(i == 0) {
            key = 'attendee'
        }
        const attendee = interaction.options.getUser(key)
        if(attendee) {
            logger.debug(`the heck is attendee`)
            logger.debug(attendee)
            logger.debug(attendee.username)
            joinUsers.push(attendee)
        }
    }
    if(joinUsers.length == 0) {
        logger.info(`adding author/member`)
        logger.debug(interaction.member.user)
        logger.debug(interaction.member.user.username)
        joinUsers.push(interaction.member.user)
    }

    const event = await getEventById(interaction.guild.id, `${eventId}`)
    if(joinUsers.length > 0 
        && (joinUsers.length == 1 && joinUsers[0].username !== interaction.member.username)
        && (interaction.member.username !== event.creator || !interaction.member.permissions.has(Discord.PermissionFlagsBits.Administrator))) {
        return interaction.reply({content: `You are not the creator of the event and do not have permission to alter membership: _${event.getMiniTitle()}_`, ephemeral: true })
    } else {
        joinUsers.forEach(joinUser => handleJoinAction(interaction, joinType, joinUser, event, byUser = interaction.member.user.username))
        if(joinType !== JoinTypes.LEAVE) {
            if(joinUsers.length == 1 && joinUsers[0].username === interaction.member.username) {
                interaction.reply({ content: `You have joined event: **${event.getMiniTitle()}**`, ephemeral: true })
            }
            else {
                interaction.reply({content: `Added or adjusted membership for these users ${joinUsers.map(m => `<@${m.id}>`).join(', ')} for event: **${event.getMiniTitle()}**`, ephemeral: true})
            }
        } else {
            if(kick) {
                const user = joinUsers[0].username
                interaction.reply({ content: `Kicked ${user} from event: **${event.getMiniTitle()}** `, ephemeral: true })
            } else {
                interaction.reply({ content: `You have left event: **${event.getMiniTitle()}** `, ephemeral: true })
            }
        }
    }
}

async function handleEventRefresh(interaction) {
    interaction.deferReply()
    await refreshEventsChannel(interaction.guild)
    interaction.editReply('Clan event refresh complete')
}

module.exports = {
	data: new Discord.SlashCommandBuilder()
        .setName('event')
        .setDescription('Interact with clan events')
        .addSubcommand(createCommand => 
            createCommand.setName("create").setDescription("Create a new clan event")
                .addStringOption(option => option.setName('game').setDescription('Game').setRequired(true).setAutocomplete(true))
                .addStringOption(option => option.setName('type').setDescription('Event Type').setRequired(true).setAutocomplete(true))
                .addStringOption(option => option.setName('subtype').setDescription('Event Subtype').setRequired(true).setAutocomplete(true))
                .addStringOption(option => option.setName('name').setDescription('Event Name').setRequired(true))
                .addStringOption(option => option.setName('description').setDescription('Event Description').setRequired(true))
                .addStringOption(option => option.setName('date').setDescription(`Event Date -- Ex: 01-01-2020 8pm CT; Friday 8pm PT; Timezones: PT, MT, CT, ET`).setRequired(true))
                .addIntegerOption(option => option.setName('maxmembers').setDescription('Max Member Count').setRequired(false))
                .addUserOption(option => option.setName('attendee1').setDescription('Attendee 1').setRequired(false))
                .addUserOption(option => option.setName('attendee2').setDescription('Attendee 2').setRequired(false))
                .addUserOption(option => option.setName('attendee3').setDescription('Attendee 3').setRequired(false))
                .addUserOption(option => option.setName('attendee4').setDescription('Attendee 4').setRequired(false))
                .addUserOption(option => option.setName('attendee5').setDescription('Attendee 5').setRequired(false))
                .addBooleanOption(option => option.setName('private').setDescription('When creating a private event, you must manage attendees manually').setRequired(false))
                .addBooleanOption(option => option.setName('clanevent').setDescription('Create Scheduled Event').setRequired(false))
        )
        .addSubcommand(joinCommand => 
            joinCommand.setName("join").setDescription("Join an event")
                .addIntegerOption(option => option.setName('eventid').setDescription('Event ID').setRequired(false).setAutocomplete(true))
                .addStringOption(option => option.setName('type').setDescription('Join Type').setRequired(false).addChoices(
                    { name: 'Join', value: 'join' },
                    { name: 'Alternate', value: 'alt' },
                    { name: 'Interested', value: 'int' },
                ))
                .addUserOption(option => option.setName('attendee1').setDescription('Attendee 1').setRequired(false))
                .addUserOption(option => option.setName('attendee2').setDescription('Attendee 2').setRequired(false))
                .addUserOption(option => option.setName('attendee3').setDescription('Attendee 3').setRequired(false))
                .addUserOption(option => option.setName('attendee4').setDescription('Attendee 4').setRequired(false))
                .addUserOption(option => option.setName('attendee5').setDescription('Attendee 5').setRequired(false))
        )
        .addSubcommand(leaveCommand => 
            leaveCommand.setName("leave").setDescription("Leave an event")
                .addIntegerOption(option => option.setName('eventid').setDescription('Event ID').setRequired(false).setAutocomplete(true))
        )
        .addSubcommand(kickCommand => 
            kickCommand.setName("kick").setDescription("Kick someone from an event")
                .addUserOption(option => option.setName('attendee').setDescription('Attendee').setRequired(true))
                .addIntegerOption(option => option.setName('eventid').setDescription('Event ID').setRequired(false).setAutocomplete(true))
        )
        .addSubcommand(deleteCommand => 
            deleteCommand.setName("delete").setDescription("Delete a clan event")
                .addIntegerOption(option => option.setName('eventid').setDescription('Event ID').setRequired(true).setAutocomplete(true))
        )
        .addSubcommand(refreshCommand => 
            refreshCommand.setName("refresh").setDescription("Refresh events channels")
        ),
	async execute(interaction) {
        const subcommand = interaction.options.getSubcommand()

        if (interaction.isAutocomplete()) {
            if(subcommand === 'create') {
                await autofillEventCreate(interaction)
            } else if(subcommand === 'join' 
                || subcommand === 'leave' 
                || subcommand === 'kick' 
                || subcommand === 'delete') {
                await autofillEventId(interaction)
            }
        }

        // Must handle interactions (command ones) inside the if statement
        if (interaction.isCommand()) {
            if(subcommand === 'create') {
                await handleEventCreate(interaction)
            } else if(subcommand === 'join') {
                const joinType = interaction.options.getString('type') ? interaction.options.getString('type') : JoinTypes.JOIN
                await handleEventJoin(interaction, joinType)
            } else if(subcommand === 'leave') {
                await handleEventJoin(interaction, JoinTypes.LEAVE)
            } else if(subcommand === 'kick') {
                await handleEventJoin(interaction, JoinTypes.LEAVE, kick = true)
            } else if(subcommand === 'delete') {
                await handleEventDelete(interaction)
            } else if(subcommand === 'refresh') {
                await handleEventRefresh(interaction)
            }
        }
	},
};