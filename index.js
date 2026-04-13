const {
  Client,
  GatewayIntentBits,
  Collection,
  REST,
  Routes,
} = require("discord.js");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.commands = new Collection();

function loadCommands(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      loadCommands(fullPath);
    } else if (file.name.endsWith(".js")) {
      const command = require(fullPath);
      if (command?.data?.name) {
        client.commands.set(command.data.name, command);
        console.log(`[CMD] Loaded: ${command.data.name}`);
      }
    }
  }
}

loadCommands(path.join(__dirname, "src/commands"));

const eventsPath = path.join(__dirname, "src/events");
const eventFiles = fs
  .readdirSync(eventsPath)
  .filter((f) => f.endsWith(".js"));

for (const file of eventFiles) {
  const event = require(path.join(eventsPath, file));
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
  console.log(`[EVT] Loaded: ${event.name}`);
}

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(`[ERROR] Command ${interaction.commandName}:`, err);
    const msg = { content: "❌ An error occurred.", ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.editReply(msg).catch(() => {});
    } else {
      await interaction.reply(msg).catch(() => {});
    }
  }
});

client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  const rest = new REST({ version: "10" }).setToken(
    process.env.DISCORD_TOKEN
  );
  const commands = [...client.commands.values()].map((cmd) =>
    cmd.data.toJSON()
  );

  try {
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log(`✅ Registered ${commands.length} slash commands`);
  } catch (err) {
    console.error("[SLASH] Failed to register commands:", err);
  }
});

client.login(process.env.DISCORD_TOKEN);
