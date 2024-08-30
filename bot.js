const { Client, RemoteAuth } = require('whatsapp-web.js')
const qrcode = require('qrcode-terminal')
const { MongoStore } = require('wwebjs-mongo')
const mongoose = require('mongoose')

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
      if (message.body === 'Quiero cotizar un servicio de afinación') {
        message.reply(
          'Hola, claro se lo cotizamos enseguida solo ocupamos los siguientes datos de su vehículo: Marca: Modelo, Año, Motor y Kilometraje.'
        )
      }
    })

    client.initialize()
  })
  .catch((err) => console.log('MongoDB connection error: ', err))
