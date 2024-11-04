const fs = require('fs')
const moment = require('moment-timezone')
const wa = require('@open-wa/wa-automate')

const CLIENTS_FILE = '../cobranza/clientes_ventas_combined.json'
const LINE_FILE = '../cobranza/line.json'
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

// Función para cargar los clientes
function loadClients() {
  try {
    return JSON.parse(fs.readFileSync(CLIENTS_FILE))
  } catch (error) {
    console.error('Error cargando clientes:', error)
    return {}
  }
}

// Función para cargar la línea de crédito
function loadLine() {
  try {
    return JSON.parse(fs.readFileSync(LINE_FILE))
  } catch (error) {
    console.error('Error cargando línea de crédito:', error)
    return {}
  }
}

function getDaysUntilNextPayment(lastSaleDate) {
  // Usamos new Date() para obtener la fecha actual real del sistema
  const today = moment(new Date()).tz('America/Mexico_City').startOf('day')
  const lastSaleMoment = moment(lastSaleDate).startOf('day')

  // Fecha de pago = fecha inicial + 1 mes
  const paymentDate = lastSaleMoment.clone().add(1, 'month').startOf('day')

  // Calculamos días hasta el pago
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

    // Encontrar la fecha de la venta
    const sortedSales = ventas.sort(
      (a, b) => new Date(a.fecha) - new Date(b.fecha)
    )
    const sale = sortedSales[0]
    const saleDate = sale.fecha

    const daysUntilPayment = getDaysUntilNextPayment(saleDate)
    console.log(`Cliente: ${nombre}`)
    console.log(`Días hasta/desde pago: ${daysUntilPayment}`)

    try {
      // Inicializar el estado de notificaciones si no existe
      const lineData = line[clientId] || {
        day3: false,
        day2: false,
        day1: false,
        dueDay: false,
      }

      // Formatear el número de teléfono
      const formattedPhone = `521${telefono1.replace(/[-() ]/g, '')}`

      // Solo enviar mensajes si estamos en -3, -2, -1 o 0 días del pago
      if (daysUntilPayment >= -3 && daysUntilPayment <= 0) {
        let shouldSendMessage = false
        let messageType = ''
        let messageContent = ''

        // Convertimos el número negativo a positivo para el switch
        const daysToCheck = Math.abs(daysUntilPayment)

        switch (daysToCheck) {
          case 3:
            if (!lineData.day3) {
              shouldSendMessage = true
              messageType = 'day3'
              messageContent = messages.message3
            }
            break
          case 2:
            if (!lineData.day2) {
              shouldSendMessage = true
              messageType = 'day2'
              messageContent = messages.message2
            }
            break
          case 1:
            if (!lineData.day1) {
              shouldSendMessage = true
              messageType = 'day1'
              messageContent = messages.message1
            }
            break
          case 0:
            if (!lineData.dueDay) {
              shouldSendMessage = true
              messageType = 'dueDay'
              messageContent = messages.cobroMessage
            }
            break
        }

        if (shouldSendMessage && messageContent) {
          console.log(
            `Intentando enviar mensaje tipo ${messageType} a ${nombre}`
          )
          console.log(`Contenido del mensaje: ${messageContent}`)

          await client.sendText(`${formattedPhone}@c.us`, messageContent)
          lineData[messageType] = true // Actualizamos directamente el campo
          console.log(`Mensaje de ${messageType} enviado a ${nombre}`)

          // Guardar el estado actualizado de las notificaciones
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
  setInterval(() => {
    const clients = loadClients()
    checkAndSendNotifications(client, clients)
  }, 1000 * 60 * 60)

  // También ejecutar una vez al inicio
  const clients = loadClients()
  await checkAndSendNotifications(client, clients)
}
