const Discord = require('discord.js');
const { replyImage, sendReply } = require('../lib/discord-utils');
const quotes = require('../../assets/quotes.json')
const utils = require('../lib/utils')
const teams = require('../teams')
const logger = require('../lib/logger');
const { toJson } = require('../lib/utils');

function getRandomTeamEmbed(randTeams, accepted) {
    let color = 0xe12120
    if(accepted) {
        color = 0x228c22
    }
    let title = "Randomized Teams"
    let description;
    if(accepted) {
        title = "Iron Banner Teams"
        let saladquotes = quotes.saladin
        utils.shuffleArray(saladquotes)
        description = '_"'+saladquotes.pop()+'"_'
    }
    const embed = new Discord.EmbedBuilder()
        .setTitle(title)
        .setColor(color)

    if(accepted) {
        embed.setDescription(description)
        embed.setThumbnail("https://vignette.wikia.nocookie.net/destinypedia/images/4/46/Iron_Banner_quest_icon.png/revision/latest?cb=20170815013519")
    }
    
    Object.keys(randTeams).forEach(teamName => {
        embed.addFields([{name: teamName, value: randTeams[teamName].join(', ')}])
    })
    return embed
}

async function handleTeams(interaction) {
    const channel = interaction.options.getChannel('channel')
    const count = interaction.options.getInteger('teamcount')
    logger.debug("got embed")
    teams.resetTeams()
    await channel.fetch()
    await channel.members.forEach(member => {
        logger.debug(member.user)
        logger.debug(`add player ${member.user.username}`)
        teams.addPlayer( {
            name: member.user.username
        })
    })
    await updateInteraction(interaction, channel, count, false)
}

async function updateInteraction(interaction, channel, count, refresh = false) {
    const randTeams = teams.getRandomTeams(count)
    logger.debug(JSON.stringify(randTeams))
    const interactionDetails = getRandomTeamsInteraction(randTeams)
    if(refresh) {
        await interaction.editReply({ content: 'Roll with the following?', 
            embeds: [interactionDetails.embed], 
            components: [interactionDetails.buttons] })
            .then((message) => {
                logger.debug("add message collector")
                const filter = i => {
                    i.deferUpdate();
                    return i.user.id === interaction.user.id;
                };
                
                message.awaitMessageComponent({ filter, componentType: Discord.ComponentType.Button, time: 60000 })
                    .then(buttonDeets => respondToButtons(interaction, channel, randTeams, count, buttonDeets)).catch(err => logger.error(err));
            })
    } else {
        await interaction.reply({ content: 'Roll with the following?', 
            embeds: [interactionDetails.embed], 
            components: [interactionDetails.buttons] })
            .then((message) => {
                logger.debug("add message collector")
                const filter = i => {
                    i.deferUpdate();
                    return i.user.id === interaction.user.id;
                };
                
                message.awaitMessageComponent({ filter, componentType: Discord.ComponentType.Button, time: 60000 })
                    .then(buttonDeets => respondToButtons(interaction, channel, randTeams, count, buttonDeets)).catch(err => logger.error(err));
            })
    }
}

async function respondToButtons(interaction, channel, randTeams, count, buttonDeets) {
    if(buttonDeets.customId === 'ibteams_refresh') {
        logger.debug('refresh teams')
        await updateInteraction(interaction, channel, count, true)
    } else if(buttonDeets.customId === 'ibteams_cancel') {
        logger.debug('cancel teams')
        interaction.editReply({content: `Cancel teams`, embeds: [], components: []})
        interaction.followUp(`Cancelling teams`)
    } else if(buttonDeets.customId === 'ibteams_ok') {
        logger.debug('ok teams')
        const newEmbed = getRandomTeamEmbed(randTeams, true)
        interaction.editReply({content: `Teams locked in`, embeds: [newEmbed], components: []})
        interaction.followUp(`Accepting these teams. Eyes up guardians.`)
        assignPlayerstoVC(interaction, channel, randTeams)
    }
    logger.debug(toJson(buttonDeets))
    logger.debug(`button pressed: ${buttonDeets}`)
}

function getRandomTeamsInteraction(randTeams) {
    const embed = getRandomTeamEmbed(randTeams, false)
    
    const cancelButton = new Discord.ButtonBuilder()
        .setCustomId('ibteams_cancel')
        .setLabel('Nah')
        .setStyle(Discord.ButtonStyle.Secondary)
    
    const okButton = new Discord.ButtonBuilder()
        .setCustomId('ibteams_ok')
        .setLabel('Eyes Up')
        .setStyle(Discord.ButtonStyle.Success)

    const refreshButton = new Discord.ButtonBuilder()
        .setCustomId('ibteams_refresh')
        .setLabel('Reroll')
        .setStyle(Discord.ButtonStyle.Primary)
        
    const buttons = new Discord.ActionRowBuilder().addComponents(cancelButton, refreshButton, okButton);
    return {
        embed,
        buttons
    }
}

async function assignPlayerstoVC(interaction, channel, randTeams) {
    logger.debug(channel)
    logger.debug(channel.parent)
    const parentChannel = channel.parent
    await interaction.guild.members.fetch()
    await channel.parent.fetch()
    Object.keys(randTeams).forEach(async teamName => {
        logger.debug(teamName)
        logger.debug(JSON.stringify(randTeams[teamName]))
        const teamChannelName = `ib-${teamName.replace(/\s+/g, '-').toLowerCase()}`
        logger.info(`searching for existing voice channel ${teamChannelName}`)
        let vcChannel = parentChannel.children.cache.find(ch => ch.name === teamChannelName)
        if(!vcChannel) {
            logger.info(`creating new voice channel ${teamChannelName}`)
            vcChannel = await interaction.guild.channels.create({
                name: teamChannelName,
                type: Discord.ChannelType.GuildVoice,
                parent: channel.parent
            })
        }
        const teamMembers = randTeams[teamName]
        teamMembers.forEach(async username => {
            logger.debug(`moving ${username}`)
            logger.debug(`members ${channel.members}`)
            logger.debug(toJson(channel.members))
            const guildMember = channel.members.find(member => member.user.username === username)
            await guildMember.fetch()
            logger.debug(guildMember)
            if(guildMember && guildMember.voice && guildMember.voice.channel) {
                logger.info(`moving ${guildMember.user.username} to ${vcChannel.name} from ${guildMember.voice.channel.name}`)
                guildMember.voice.setChannel(vcChannel)
            } else {
                logger.error(`failed to move ${guildMember?.username} to ${vcChannel.name} from ${guildMember?.voice?.channel?.name}`)
            }
        })
    })
}

function createTeamChannels(interaction, channel, randTeams) {
    interaction.guild.channels.create("ib-team-alpha", {
        type: Discord.ChannelType.GuildVoice,
        parent: channel.parent
    })

}

module.exports = {
	data: new Discord.SlashCommandBuilder()
		.setName('ironbanner')
		.setDescription('Iron Banner team management')
        //.addSubcommand(subcommand => subcommand.setName("rejoin").setDescription("Rejoin all IB players to the target VC"))
        .addSubcommand(subcommand => 
            subcommand.setName("teams").setDescription("Get Teams")
                .addChannelOption(option => option.setName('channel').setDescription('Voice Channel w/ IB members')
                    .addChannelTypes(Discord.ChannelType.GuildVoice).setRequired(true))
                .addIntegerOption(option => option.setName("teamcount").setDescription("How many teams you want").setMinValue(1).setMaxValue(24).setRequired(true))
        ),
	async execute(interaction) {
        const subcommand = interaction.options.getSubcommand()

        if (interaction.isAutocomplete()) {
            if(subcommand === 'teams') {
                await autofillChannel(interaction)
            }
        }

        // Must handle interactions (command ones) inside the if statement
        if (interaction.isCommand()) {
            if(subcommand === 'teams') {
                await handleTeams(interaction)
            } 
        }
	},
};