import makeWASocket, { DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, reduceBinaryNodeToDictionary, useMultiFileAuthState } from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import * as fs from 'fs';
import P, { Logger } from 'pino'

// Configurações

const logger: Logger = P({ timestamp: () => `,"time":"${new Date().toJSON()}"` }).child({})
logger.level = 'fatal';

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('auth');
  const { version, isLatest } = await fetchLatestBaileysVersion()

  console.log(`using WA v${version.join('.')}, isLatest: ${isLatest}`)

  const sock = makeWASocket({
    version,
    browser: ["BotsApp", "Chrome", "4.0.0"],
    logger: logger as any,
    printQRInTerminal: true,
    auth: state,
  })

  sock.ev.process(
    async events => {
      if (events['connection.update']) {
        const update = events['connection.update'];
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
          if ((lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut) {
            console.log("Loggout.")
          } else {
            console.log("Connection by close.")
          }
        } else if (connection === 'connecting') {
          console.log("connecting")
        } else if (connection === 'open') {
          console.log("connection open")
        }
      }

      if (events['messages.upsert']) {
        const upsert = events['messages.upsert'];
        if (upsert.type !== 'notify') {
          return;
        }
        let id: any;
        upsert.messages.map(async item => {
          id = item.key.remoteJid;
          if (item.message?.conversation === "Oi") {
            await sock.sendMessage(id, { text: "Olá, seja bem-vindo. Selecione uma opção abaixo." });
            await sock.sendMessage(id, { text: "1. Catalogo\n 2. Falar com atendente." });
          }
          if (item.message?.conversation === "1") {
            await sock.sendMessage(id, { text: 'Escolha uma marca de moto:' })
            await sock.sendMessage(id, { text: 'Honda\nSuzuki' });
          }
          if (item.message?.conversation === "2") {
            await sock.sendMessage(id, { text: 'Nossos atendentes irão entrar em contato com você.' });
          }
        })
      }
    }
  )
}
// run in main file
connectToWhatsApp();