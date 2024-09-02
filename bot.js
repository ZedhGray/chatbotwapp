const { Client, RemoteAuth } = require('whatsapp-web.js')
const qrcode = require('qrcode-terminal')
const { MongoStore } = require('wwebjs-mongo')
const mongoose = require('mongoose')

// Función para obtener la hora actual
function getCurrentHour() {
  return new Date().getHours()
}
// Función para verificar si estamos dentro del horario de atención
function isWithinWorkingHours(hour) {
  return hour >= 8 && hour <= 19
}
const { setTimeout } = require('timers')
// URL de conexión a MongoDB (ajusta según sea necesario)
const MONGODB_URI = 'mongodb://localhost:27017/whatsapp-bot'

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    const store = new MongoStore({ mongoose: mongoose })
    const client = new Client({
      authStrategy: new RemoteAuth({
        store: store,
        backupSyncIntervalMs: 300000,
      }),
      puppeteer: {
        args: ['--no-sandbox'],
      },
    })

    client.on('qr', (qr) => {
      qrcode.generate(qr, { small: true })
      console.log('QR RECEIVED', qr)
    })

    client.on('remote_session_saved', () => {
      console.log('SESSION SAVED!')
    })

    client.on('ready', () => {
      console.log('Cliente está listo!')
    })

    client.on('message', (message) => {
      const currentHour = getCurrentHour()

      if (isWithinWorkingHours(currentHour)) {
        handleWorkingHoursMessage(message)
      } else {
        handleNonWorkingHoursMessage(message)
      }
    })
    //
    function handleWorkingHoursMessage(message) {
      if (
        message.body === 'hola' ||
        message.body === 'Hola' ||
        message.body === 'HOLA' ||
        message.body === 'Buenas' ||
        message.body === 'Buenas tardes' ||
        message.body === 'Buenas Tardes' ||
        message.body === 'Buenos días' ||
        message.body === 'Buenos Días'
      ) {
        setTimeout(() => {
          message.reply(`
Hola, gracias por contactarnos. Soy el asistente virtual de Garcia.
Me alegra poder ayudarte con tu vehículo. 🚗
Podrias indicarme que servicio requieres.
Tenemos varias opciones disponibles:
    
Productos y/o Servicios:
Llantas
Rines
Accesorios
Montaje
Inflado
Balanceo
Alineación
Suspensión
Frenos
Afinación
Otros servicios específicos
    `)

          message.reply(`
En un momento uno de nuestros agentes de ventas le estará atendiendo.
😄¡Muchas gracias por su mensaje!
    `)
        }, 2000)
      } else if (message.body === 'Quiero cotizar un servicio de afinación') {
        setTimeout(() => {
          message.reply(`
Hola, claro se lo cotizamos enseguida solo ocupamos los siguientes datos de su vehículo 🚗
  * Marca: 
  * Modelo:
  * Año:
  * Motor:
  * Kilometraje:
😄¡Muchas gracias por su mensaje!
    `)
        }, 2000)
      }
    }

    function handleNonWorkingHoursMessage(message) {
      if (
        message.body === 'hola' ||
        message.body === 'Hola' ||
        message.body === 'HOLA' ||
        message.body === 'Buenas' ||
        message.body === 'Buenas noches' ||
        message.body === 'Buenas Noches'
      ) {
        setTimeout(() => {
          message.reply(`
Gracias por comunicarte con nosotros soy el asistente virtual de Garcia.
Será un gusto atenderle
    `)

          message.reply(`
Nuestro horario de atención es:
⏰Lunes a Sábado: 8:00 am - 7:00 pm
Será un gusto tomar los datos de su vehículo y nuestro personal estará encantado de atender una vez abra el establecimiento.
    `)
          setTimeout(() => {
            message.reply(`
Solo necesitamos los siguientes datos de tu vehículo para poder asistirte mejor:
 * Marca: 
 * Modelo:
 * Año:
 * Motor:
 * Kilometraje:
          `)
          }, 1000)
        }, 2000)
      }

      if (message.body === 'Quiero cotizar un servicio de afinación') {
        setTimeout(() => {
          message.reply(`
Gracias por comunicarte con nosotros soy el asistente virtual de Garcia.
Será un gusto atenderle
    `)

          message.reply(`
Solo necesitamos los siguientes datos de su vehículo para poder asistirte mejor:
  * Marca: 
  * Modelo:
  * Año:
  * Motor:
  * Kilometraje:
Nuestro personal estará encantado de atenderte. 
📅 Horario de atención:
🕒 Lunes a Sábado: 8:00 AM - 7:00 PM
😄¡Muchas gracias por su mensaje!
    `)
        }, 2000)
      }
    }
    client.initialize()
  })
  .catch((err) => console.log('MongoDB connection error: ', err))
