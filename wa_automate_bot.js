const wa = require('@open-wa/wa-automate')
const moment = require('moment-timezone')
const DB_FILE = 'dbtell.json'
const fs = require('fs') // Agregue esta línea

// Función para cargar los datos de la base de datos
function loadData() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE))
  } catch (error) {
    console.error('Error cargando datos:', error)
    return { users: {} }
  }
}

// Función para guardar los datos en la base de datos
function saveData(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2))
  } catch (error) {
    console.error('Error guardando datos:', error)
  }
}

// Cargar datos inicialmente
let dbData = loadData()

wa.create({
  sessionId: 'BOT_SESSION',
  multiDevice: true,
  authTimeout: 180,
  blockCrashLogs: true,
  disableSpins: true,
  headless: false,
  hostNotificationLang: 'PT_BR',
  logConsole: false,
  popup: true,
  qrTimeout: 0,
}).then((client) => start(client))

async function start(client) {
  client.onMessage(async (message) => {
    const today = moment.tz('America/Mexico_City').startOf('day') // Ajusta la zona horaria según sea necesario
    // Extraer el número de teléfono del remitente
    const senderPhone = message.from.split('@')[0]

    let isFirstMessageOfDayOrEver = true

    // Verificar si el usuario ya envió un mensaje en los últimos 3 días
    const userData = dbData.users[senderPhone] || null
    if (
      userData &&
      moment(userData.lastMessage).add(3, 'days').isAfter(today)
    ) {
      console.log(
        `Ignorando mensaje de ${senderPhone}. Último mensaje enviado hace menos de 3 días.`
      )
      return
    }
    //
    if (isFirstMessageOfDayOrEver) {
      await client.sendText(
        message.from,
        `
Hola, gracias por contactarnos. 
😄Soy el asistente virtual de Garcia.
Me alegra poder ayudarte con tu vehículo. 🚗
Podrias indicarme que servicio requieres.
Tenemos varias opciones disponibles:

*Llantas
*Rines
*Accesorios
*Montaje
*Inflado
*Balanceo
*Alineación
*Suspensión
*Frenos
*Afinación
*Otros servicios específicos
        `
      )

      // Enviamos el mensaje adicional después de un breve intervalo
      setTimeout(async () => {
        await client.sendText(
          message.from,
          `
En un momento uno de nuestros agentes de ventas le estará atendiendo.
😄¡Muchas gracias por su mensaje!`
        )
      }, 2000) // Esperamos 2 segundos antes de enviar el segundo mensaje
    }

    // Actualizar la fecha del último mensaje para este usuario
    dbData.users[senderPhone] = {
      lastMessage: today.toISOString(),
    }
    saveData(dbData)
    //
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
