const wa = require('@open-wa/wa-automate')

wa.create({
  sessionId: 'BOT_SESSION',
  multiDevice: true, // required to enable multiDevice support
  authTimeout: 60, // wait only 60 seconds to get a connection with the host account device
  blockCrashLogs: true,
  disableSpins: true,
  headless: true,
  hostNotificationLang: 'PT_BR',
  logConsole: false,
  popup: true,  
  qrTimeout: 0, // 0 means it will wait forever for you to scan the qr code
}).then((client) => start(client))

function start(client) {
  client.onMessage(async (message) => {
    if (message.body === 'Quiero cotizar un servicio de afinación') {
      await client.sendText(
        message.from,
        `
Hola, claro se lo cotizamos enseguida solo ocupamos los siguientes datos de su vehículo
 * Marca: 
 * Modelo:
 * Año:
 * Motor:
 * Kilometraje:
        `
      )
    }
  })
}