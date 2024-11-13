const fs = require('fs')
const moment = require('moment-timezone')
const wa = require('@open-wa/wa-automate')
const { update_client_states_wsp } = require('./database')

const CLIENTS_FILE = '../cobranza/clientes_ventas_combined.json'
const LINE_FILE = '../cobranza/line.json'
const MESSAGES_FILE = 'messages.json'

function loadMessages() {
  try {
    return JSON.parse(fs.readFileSync(MESSAGES_FILE))
  } catch (error) {
    console.error('Error cargando mensajes:', error)
    return {}
  }
}

function loadClients() {
  try {
    return JSON.parse(fs.readFileSync(CLIENTS_FILE))
  } catch (error) {
    console.error('Error cargando clientes:', error)
    return {}
  }
}

function loadLine() {
  try {
    return JSON.parse(fs.readFileSync(LINE_FILE))
  } catch (error) {
    console.error('Error cargando línea de crédito:', error)
    return {}
  }
}

function getDaysUntilNextPayment(lastSaleDate) {
  const today = moment(new Date()).tz('America/Mexico_City').startOf('day')
  const lastSaleMoment = moment(lastSaleDate).startOf('day')
  const paymentDate = lastSaleMoment.clone().add(1, 'month').startOf('day')
  const daysUntil = paymentDate.diff(today, 'days')

  console.log('Fecha de cobro inicial:', lastSaleMoment.format('YYYY-MM-DD'))
  console.log('Fecha actual del sistema:', today.format('YYYY-MM-DD'))
  console.log('Fecha objetivo de pago:', paymentDate.format('YYYY-MM-DD'))
  console.log('Días de diferencia:', daysUntil)

  return daysUntil
}

async function checkAndSendNotifications(client, clientData) {
  const messages = loadMessages()
  const line = loadLine()

  for (const [clientId, clientInfo] of Object.entries(clientData)) {
    const { telefono1, nombre, ventas } = clientInfo

    const sortedSales = ventas.sort(
      (a, b) => new Date(a.fecha) - new Date(b.fecha)
    )
    const lastSale = sortedSales[sortedSales.length - 1]
    const saleDate = lastSale.fecha
    const saldoRestante = lastSale.restante

    const daysUntilPayment = getDaysUntilNextPayment(saleDate)
    console.log(`Cliente: ${nombre}`)
    console.log(`Días hasta/desde pago: ${daysUntilPayment}`)

    try {
      const lineData = line[clientId] || {
        day3: false,
        day2: false,
        day1: false,
        dueDay: false,
      }

      const formattedPhone = `521${telefono1.replace(/[-() ]/g, '')}`

      if (daysUntilPayment >= -3 && daysUntilPayment <= 0) {
        let shouldSendMessage = false
        let messageType = ''
        let messageContent = ''

        const daysToCheck = Math.abs(daysUntilPayment)

        switch (daysToCheck) {
          case 3:
            if (!lineData.day3) {
              shouldSendMessage = true
              messageType = 'day3'
              messageContent = messages.message3
                .replace('{client name}', nombre)
                .replace('{debt amount}', saldoRestante.toFixed(2))
            }
            break
          case 2:
            if (!lineData.day2) {
              shouldSendMessage = true
              messageType = 'day2'
              messageContent = messages.message2
                .replace('{client name}', nombre)
                .replace('{debt amount}', saldoRestante.toFixed(2))
            }
            break
          case 1:
            if (!lineData.day1) {
              shouldSendMessage = true
              messageType = 'day1'
              messageContent = messages.message1
                .replace('{client name}', nombre)
                .replace('{debt amount}', saldoRestante.toFixed(2))
            }
            break
          case 0:
            if (!lineData.dueDay) {
              shouldSendMessage = true
              messageType = 'dueDay'
              messageContent = messages.cobroMessage
                .replace('{client name}', nombre)
                .replace('{debt amount}', saldoRestante.toFixed(2))
            }
            break
        }

        if (shouldSendMessage && messageContent) {
          console.log(
            `Intentando enviar mensaje tipo ${messageType} a ${nombre}`
          )
          console.log(`Contenido del mensaje: ${messageContent}`)

          await client.sendText(`${formattedPhone}@c.us`, messageContent)
          lineData[messageType] = true
          console.log(`Mensaje de ${messageType} enviado a ${nombre}`)

          await update_client_states_wsp(clientId, lineData)
          line[clientId] = lineData
          fs.writeFileSync(LINE_FILE, JSON.stringify(line, null, 2))
        } else {
          console.log(
            `No se envía mensaje a ${nombre}: mensaje ya enviado o contenido no disponible`
          )
        }
      } else {
        console.log(
          `No es tiempo de enviar mensajes a ${nombre} (diferencia de ${daysUntilPayment} días)`
        )
      }
    } catch (error) {
      console.error(`Error enviando mensaje a ${nombre}:`, error)
      console.error('Detalles del error:', {
        daysUntilPayment,
        messages: Object.keys(messages),
        lineData: line[clientId],
      })
    }
  }
}

function isTimeToSendNotifications() {
  const now = moment().tz('America/Mexico_City')
  const elevenaAm = moment()
    .tz('America/Mexico_City')
    .hours(11)
    .minutes(0)
    .seconds(0)

  return now.isSameOrAfter(elevenaAm)
}

async function startCreditNotifications(client) {
  setInterval(async () => {
    const isTimeToSend = isTimeToSendNotifications()
    if (isTimeToSend) {
      const clients = loadClients()
      await checkAndSendNotifications(client, clients)
    } else {
      console.log('Aún no es la hora de enviar notificaciones de crédito.')
    }
  }, 1000 * 60 * 5) // Verifica cada 5 minutos

  // Enviar notificaciones al inicio, si es la hora adecuada
  if (isTimeToSendNotifications()) {
    const clients = loadClients()
    await checkAndSendNotifications(client, clients)
  } else {
    console.log('Aún no es la hora de enviar notificaciones de crédito.')
  }
}

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
