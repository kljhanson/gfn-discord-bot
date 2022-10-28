const Discord = require('discord.js');
const { getVersion } = require('../lib/global-vars');

module.exports = {
	data: new Discord.SlashCommandBuilder()
		.setName('help')
		.setDescription('Get help for various bot commands'),
	async execute(interaction) {
        const embed = new Discord.EmbedBuilder()
        .setTitle(`GFN Bot - Commands`)
        .setDescription(`Below is a list of commands that the GFN bot currently supports. For more details use \`gfn/help <command>\` or \`gfn/help admin\``)
        .setColor(0xa0a0a0)
        .addFields(
            [
                { name: `gfn/create`, value: `Create a new LFG event` },
                { name: `gfn/create <eventType>`, value: `Create a new scheduled event for a specific game type (for a full list, use \`gfn/create\` to view)` },
                { name: `gfn/get <eventId>`, value: `View a scheduled event card.` },
                { name: `gfn/[join/alt/int/kick] <eventId> [@member]`, value: `Join or leave a scheduled event. Use join/alt/int to specify your join type.` },
                { name: `gfn/delete <eventId>`, value: `Delete a scheduled event.` },
                { name: `gfn/edit [time/description/max] <eventId>`, value: `Edit a scheduled event content, use time/description/max to select what you want to edit.` },
                { name: `gfn/transfer <eventId> [@member]`, value: `Transfer ownership of an event to another member.` }
            ]
        )
		await interaction.reply({ embeds: [embed], ephemeral: true})
	},
};