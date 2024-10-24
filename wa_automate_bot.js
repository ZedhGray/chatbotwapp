const wa = require('@open-wa/wa-automate')
const moment = require('moment-timezone')
const DB_FILE = 'dbtell.json'
const MESSAGES_FILE = 'messages.json'
const fs = require('fs')

// Función para cargar los mensajes
function loadMessages() {
  try {
    return JSON.parse(fs.readFileSync(MESSAGES_FILE))
  } catch (error) {
    console.error('Error cargando mensajes:', error)
    return {
      welcomeMessage:
        'Hola, gracias por contactarnos. \n😄Soy el asistente virtual de Garcia.',
    } // Mensaje por defecto si hay error
  }
}

// Función para cargar los datos de la base de datos
function loadData() {
  try {
    const data = JSON.parse(fs.readFileSync(DB_FILE))
    // Asegurarse de que existe la lista negra permanente
    if (!data.permanentBlacklist) {
      data.permanentBlacklist = []
    }
    if (!data.users) {
      data.users = {}
    }
    return data
  } catch (error) {
    console.error('Error cargando datos:', error)
    return {
      users: {},
      permanentBlacklist: [],
    }
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

// Función para verificar si un número está en la lista negra permanente
function isInPermanentBlacklist(phone, data) {
  return data.permanentBlacklist.includes(phone)
}

// Cargar datos inicialmente
let dbData = loadData()
let messages = loadMessages()

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
    const today = moment.tz('America/Mexico_City').startOf('day')
    const senderPhone = message.from.split('@')[0]

    // Verificar lista negra permanente
    if (isInPermanentBlacklist(senderPhone, dbData)) {
      console.log(
        `Número ${senderPhone} está en la lista negra permanente. Mensaje ignorado.`
      )
      return
    }

    // Verificar si el usuario ya envió un mensaje en los últimos 7 días
    const userData = dbData.users[senderPhone] || null
    if (
      userData &&
      moment(userData.lastMessage).add(6, 'days').isAfter(today)
    ) {
      console.log(
        `Ignorando mensaje de ${senderPhone}. Último mensaje enviado hace menos de 7 días.`
      )
      return
    }

    // Enviar mensaje de bienvenida
    await client.sendText(message.from, messages.welcomeMessage)

    // Actualizar la fecha del último mensaje para este usuario
    dbData.users[senderPhone] = {
      lastMessage: today.toISOString(),
    }
    saveData(dbData)
  })
}
