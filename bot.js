const fs = require('fs')
const { Client, LocalAuth } = require('whatsapp-web.js')
const qrcode = require('qrcode-terminal')

const client = new Client({
  authStrategy: new LocalAuth(),
})

client.on('qr', (qr) => {
  qrcode.generate(qr, { small: true })
})
const heartRegex = /❤️|\u2764|\u1F496$/i

client.on('ready', () => {
  console.log('Cliente está listo!')
})

client.on('message', (message) => {
  if (message.body === `Te amo mucho mi amor hermoso ${heartRegex}`) {
    message.reply(`Te amo mucho amor hermosa ❤️`)
  }
  if (message.body === 'Te amo mucho mi amor hermoso') {
    message.reply(`Te amo mucho amor hermosa ❤️`)
  }
  if (message.body === 'mochi') {
    message.reply(`Te amo mucho amor hermosa ❤️`)
  }
  if (message.body === 'cara de nalga') {
    message.reply(`Te amo mucho amor hermosa ❤️`)
  }
})

client.initialize()
