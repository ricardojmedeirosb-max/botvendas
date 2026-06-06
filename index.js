const {
    Client,
    GatewayIntentBits,
    REST,
    Routes,
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    Events,
    EmbedBuilder
} = require('discord.js');

const sqlite3 = require('sqlite3').verbose();

// ================= CONFIG DIRETA =================
const TOKEN = "MTUxMjY1MTYwNTg2MDk0NjA2Mw.G3H6-z.ufl0S25qixZBvuEYXREjmkbN52lVWyZ7nV8Cng";
const CLIENT_ID = "1512651605860946063";
const GUILD_ID = "1512600491241242666";
const CANAL_LOGS = "1512697600204210216"; // seu canal de logs

// ================= BOT =================
const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// ================= SQLITE =================
const db = new sqlite3.Database(':memory:');

db.run(`
CREATE TABLE vendas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    produto TEXT,
    quantidade TEXT,
    cargo TEXT,
    parceria TEXT,
    comprador TEXT,
    registrado_por TEXT,
    data TEXT
)
`);

// ================= COMANDO =================
const commands = [
    new SlashCommandBuilder()
        .setName('painel')
        .setDescription('Abrir painel de vendas')
].map(c => c.toJSON());

const rest = new REST({ version: 10 }).setToken(TOKEN);

async function registerCommands() {
    await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
        { body: commands }
    );
    console.log('Comandos registrados!');
}

// ================= READY =================
client.once('ready', async () => {
    console.log(`Logado como ${client.user.tag}`);
    await registerCommands();
});

// ================= INTERAÇÕES =================
client.on(Events.InteractionCreate, async interaction => {

    try {

        // ===== PAINEL =====
        if (interaction.isChatInputCommand()) {

            if (interaction.commandName === 'painel') {

                const embed = new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setTitle('📋 Sistema de Vendas')
                    .setDescription('Clique no botão para iniciar o registro.')
                    .setImage('https://i.imgur.com/9bJxK9x.png')
                    .setFooter({ text: 'Sistema de Vendas' });

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('abrir_modal')
                        .setLabel('📋 Iniciar Registro')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('🧾')
                );

                return interaction.reply({
                    embeds: [embed],
                    components: [row]
                });
            }
        }

        // ===== BOTÃO =====
        if (interaction.isButton()) {

            if (interaction.customId === 'abrir_modal') {

                const modal = new ModalBuilder()
                    .setCustomId('modal_venda')
                    .setTitle('Registro de Venda');

                const campos = [
                    ['produto', 'Produto'],
                    ['quantidade', 'Quantidade'],
                    ['cargo', 'Cargo'],
                    ['parceria', 'Parceria'],
                    ['comprador', 'ID Comprador']
                ];

                const rows = campos.map(([id, label]) =>
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId(id)
                            .setLabel(label)
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    )
                );

                modal.addComponents(rows);

                return interaction.showModal(modal);
            }
        }

        // ===== MODAL =====
        if (interaction.isModalSubmit()) {

            if (interaction.customId === 'modal_venda') {

                const produto = interaction.fields.getTextInputValue('produto');
                const quantidade = interaction.fields.getTextInputValue('quantidade');
                const cargo = interaction.fields.getTextInputValue('cargo');
                const parceria = interaction.fields.getTextInputValue('parceria');
                const comprador = interaction.fields.getTextInputValue('comprador');

                db.run(
                    `INSERT INTO vendas (
                        produto, quantidade, cargo, parceria,
                        comprador, registrado_por, data
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        produto,
                        quantidade,
                        cargo,
                        parceria,
                        comprador,
                        interaction.user.username,
                        new Date().toLocaleDateString('pt-BR')
                    ],
                    async function (err) {

                        if (err) {
                            console.error(err);
                            return interaction.reply({
                                content: 'Erro ao salvar venda.',
                                ephemeral: true
                            });
                        }

                        const numero = String(this.lastID).padStart(4, '0');

                        const msg = `
📋 REGISTRO DE VENDA #${numero}

🛒 Produto: ${produto}
📦 Quantidade: ${quantidade}
🎖️ Cargo: ${cargo}
🤝 Parceria: ${parceria}
🆔 Comprador: ${comprador}

👤 Registrado por: ${interaction.user.username}
📅 Data: ${new Date().toLocaleDateString('pt-BR')}
`;

                        try {
                            const canal = await client.channels.fetch(CANAL_LOGS);
                            if (canal) await canal.send({ content: msg });
                        } catch (err) {
                            console.error('Erro canal logs:', err);
                        }

                        return interaction.reply({
                            content: `Venda #${numero} registrada!`,
                            ephemeral: true
                        });
                    }
                );
            }
        }

    } catch (err) {
        console.error('Erro geral:', err);

        if (!interaction.replied) {
            interaction.reply({
                content: 'Erro interno no bot.',
                ephemeral: true
            });
        }
    }
});

client.login('MTUxMjY1MTYwNTg2MDk0NjA2Mw.G3H6-z.ufl0S25qixZBvuEYXREjmkbN52lVWyZ7nV8Cng');