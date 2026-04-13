const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType,
  AttachmentBuilder,
} = require("discord.js");
const { supabase } = require("../../utils/supabase");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("welcomer")
    .setDescription("Configure the welcome system")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName("on")
        .setDescription("Enable the welcome system")
        .addChannelOption((opt) =>
          opt
            .setName("channel")
            .setDescription("Channel to send welcome messages")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName("off").setDescription("Disable the welcome system")
    )
    .addSubcommand((sub) =>
      sub
        .setName("text")
        .setDescription("Set custom welcome text")
        .addStringOption((opt) =>
          opt
            .setName("message")
            .setDescription(
              "Custom text. Use {user}, {server}, {count}, {username}"
            )
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("background")
        .setDescription("Set a custom background image URL")
        .addStringOption((opt) =>
          opt
            .setName("url")
            .setDescription("Direct image URL (PNG/JPG/WEBP)")
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName("preview").setDescription("Preview the current welcome card")
    )
    .addSubcommand((sub) =>
      sub
        .setName("status")
        .setDescription("View current welcome configuration")
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    await interaction.deferReply({ ephemeral: true });

    if (sub === "on") {
      const channel = interaction.options.getChannel("channel");

      const { error } = await supabase.from("welcomer").upsert({
        guild_id: guildId,
        enabled: true,
        channel_id: channel.id,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.error("[Welcomer/on]", error);
        return interaction.editReply({
          content: "❌ Failed to save configuration. Please try again.",
        });
      }

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor("#57f287")
            .setTitle("✅ Welcome System Enabled")
            .setDescription(`Welcome messages will be sent to ${channel}`)
            .setTimestamp(),
        ],
      });
    }

    if (sub === "off") {
      const { error } = await supabase.from("welcomer").upsert({
        guild_id: guildId,
        enabled: false,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.error("[Welcomer/off]", error);
        return interaction.editReply({
          content: "❌ Failed to save configuration. Please try again.",
        });
      }

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor("#ed4245")
            .setTitle("🔴 Welcome System Disabled")
            .setDescription("Welcome messages have been turned off.")
            .setTimestamp(),
        ],
      });
    }

    if (sub === "text") {
      const message = interaction.options.getString("message");

      const { error } = await supabase.from("welcomer").upsert({
        guild_id: guildId,
        welcome_text: message,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.error("[Welcomer/text]", error);
        return interaction.editReply({
          content: "❌ Failed to save configuration. Please try again.",
        });
      }

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor("#5865f2")
            .setTitle("✏️ Welcome Text Updated")
            .addFields(
              { name: "New Text", value: message },
              {
                name: "Available Placeholders",
                value:
                  "`{user}` - Display name\n`{username}` - Username\n`{server}` - Server name\n`{count}` - Member count",
              }
            )
            .setTimestamp(),
        ],
      });
    }

    if (sub === "background") {
      const url = interaction.options.getString("url");

      if (
        !url.startsWith("http") ||
        (!url.includes(".png") &&
          !url.includes(".jpg") &&
          !url.includes(".jpeg") &&
          !url.includes(".webp"))
      ) {
        return interaction.editReply({
          content:
            "❌ Please provide a valid direct image URL (PNG/JPG/WEBP).",
        });
      }

      const { error } = await supabase.from("welcomer").upsert({
        guild_id: guildId,
        background_url: url,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.error("[Welcomer/background]", error);
        return interaction.editReply({
          content: "❌ Failed to save configuration. Please try again.",
        });
      }

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor("#5865f2")
            .setTitle("🖼️ Welcome Background Updated")
            .setImage(url)
            .setTimestamp(),
        ],
      });
    }

    if (sub === "preview") {
      const { generateCard } = require("../../utils/canvas");

      const { data } = await supabase
        .from("welcomer")
        .select("*")
        .eq("guild_id", guildId)
        .single();

      const buffer = await generateCard({
        type: "welcome",
        username: interaction.user.username,
        displayName: interaction.user.displayName,
        avatarURL: interaction.user.displayAvatarURL({ extension: "png" }),
        memberCount: interaction.guild.memberCount,
        guildName: interaction.guild.name,
        text:
          data?.welcome_text ||
          "Welcome to {server}! You are member #{count}.",
        backgroundURL: data?.background_url || null,
      });

      const attachment = new AttachmentBuilder(buffer, {
        name: "welcome-preview.png",
      });

      return interaction.editReply({
        content: "**Preview of your welcome card:**",
        files: [attachment],
      });
    }

    if (sub === "status") {
      const { data } = await supabase
        .from("welcomer")
        .select("*")
        .eq("guild_id", guildId)
        .single();

      if (!data) {
        return interaction.editReply({
          content: "❌ Welcome system has not been configured yet.",
        });
      }

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor("#5865f2")
            .setTitle("📋 Welcome System Status")
            .addFields(
              {
                name: "Status",
                value: data.enabled ? "🟢 Enabled" : "🔴 Disabled",
                inline: true,
              },
              {
                name: "Channel",
                value: data.channel_id
                  ? `<#${data.channel_id}>`
                  : "Not set",
                inline: true,
              },
              {
                name: "Custom Text",
                value:
                  data.welcome_text ||
                  "Welcome to {server}! You are member #{count}.",
              },
              {
                name: "Custom Background",
                value: data.background_url ? "✅ Set" : "❌ Not set",
                inline: true,
              },
              {
                name: "Last Updated",
                value: data.updated_at || "Unknown",
                inline: true,
              }
            )
            .setTimestamp(),
        ],
      });
    }
  },
};
