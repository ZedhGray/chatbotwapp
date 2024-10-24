const wa = require('@open-wa/wa-automate')
const moment = require('moment-timezone')
const fs = require('fs')

const CREDITS_FILE = 'credits.json'
const MESSAGES_FILE = 'messages.json'

// Función para cargar los mensajes
function loadMessages() {
  try {
    return JSON.parse(fs.readFileSync(MESSAGES_FILE))
  } catch (error) {
    console.error('Error cargando mensajes:', error)
    return {}
  }
}

// Función para cargar los créditos
function loadCredits() {
  try {
    return JSON.parse(fs.readFileSync(CREDITS_FILE))
  } catch (error) {
    console.error('Error cargando créditos:', error)
    return { credits: [] }
  }
}

// Función para guardar los créditos
function saveCredits(data) {
  try {
    fs.writeFileSync(CREDITS_FILE, JSON.stringify(data, null, 2))
  } catch (error) {
    console.error('Error guardando créditos:', error)
  }
}

// Función simplificada para calcular días hasta el próximo pago
function getDaysUntilNextPayment(dueDate) {
  const today = moment.tz('America/Mexico_City')
  const dueDateDay = moment(dueDate).date() // Obtiene el día del mes de la fecha de pago

  // Crear una fecha con el día de pago en el mes actual
  let nextPayment = moment(today).date(dueDateDay)

  // Si ya pasó la fecha de pago este mes, mover al próximo mes
  if (today.date() > dueDateDay) {
    nextPayment = nextPayment.add(1, 'month')
  }

  const daysUntil = nextPayment.diff(today, 'days')

  console.log('Fecha actual:', today.format('YYYY-MM-DD'))
  console.log('Próxima fecha de pago:', nextPayment.format('YYYY-MM-DD'))
  console.log('Días hasta el pago:', daysUntil)

  return daysUntil
}

// Función para verificar y enviar notificaciones
async function checkAndSendNotifications(client) {
  const messages = loadMessages()
  const creditsData = loadCredits()

  for (const credit of creditsData.credits) {
    const daysUntilDue = getDaysUntilNextPayment(credit.dueDate)
    console.log(
      `Días hasta el próximo pago para ${credit.name}: ${daysUntilDue}`
    )

    // Resetear las notificaciones al inicio de cada ciclo
    if (daysUntilDue > 3) {
      credit.notificationsSent = {
        day3: false,
        day2: false,
        day1: false,
        dueDay: false,
      }
    }

    try {
      if (daysUntilDue === 3 && !credit.notificationsSent.day3) {
        await client.sendText(`${credit.phone}@c.us`, messages.message3)
        credit.notificationsSent.day3 = true
        console.log(`Mensaje de 3 días enviado a ${credit.name}`)
      } else if (daysUntilDue === 2 && !credit.notificationsSent.day2) {
        await client.sendText(`${credit.phone}@c.us`, messages.message2)
        credit.notificationsSent.day2 = true
        console.log(`Mensaje de 2 días enviado a ${credit.name}`)
      } else if (daysUntilDue === 1 && !credit.notificationsSent.day1) {
        await client.sendText(`${credit.phone}@c.us`, messages.message1)
        credit.notificationsSent.day1 = true
        console.log(`Mensaje de 1 día enviado a ${credit.name}`)
      } else if (daysUntilDue === 0 && !credit.notificationsSent.dueDay) {
        await client.sendText(`${credit.phone}@c.us`, messages.cobroMessage)
        credit.notificationsSent.dueDay = true
        console.log(`Mensaje de cobro enviado a ${credit.name}`)
      }
    } catch (error) {
      console.error(`Error enviando mensaje a ${credit.name}:`, error)
    }
  }

  // Guardar el estado actualizado de las notificaciones
  saveCredits(creditsData)
}

// Inicializar el cliente de WhatsApp
wa.create({
  sessionId: 'CREDIT_BOT_SESSION',
  multiDevice: true,
  authTimeout: 180,
  blockCrashLogs: true,
  disableSpins: true,
  headless: false,
  hostNotificationLang: 'PT_BR',
  logConsole: false,
  popup: true,
  qrTimeout: 0,
}).then((client) => startCreditNotifications(client))

async function startCreditNotifications(client) {
  // Ejecutar la verificación cada hora
  setInterval(() => checkAndSendNotifications(client), 1000 * 60 * 60)

  // También ejecutar una vez al inicio
  await checkAndSendNotifications(client)
}
