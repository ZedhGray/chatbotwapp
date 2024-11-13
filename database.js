const dotenv = require('dotenv')
dotenv.config()

const dbConfig = {
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  server: process.env.SQL_SERVER,
  database: process.env.DATABASE,
  options: {
    encrypt: false, // Cambia a false si usas SQL Server Express
    trustServerCertificate: true,
  },
}

async function getConnection() {
  try {
    const pool = await require('mssql').connect(dbConfig)
    return pool
  } catch (err) {
    console.error('Error al conectar a la base de datos:', err)
    throw err
  }
}

async function update_client_states_wsp(clientId, states = null) {
  const pool = await getConnection()
  const request = pool.request()

  try {
    // Verificar si el cliente ya existe
    const checkQuery = `
      SELECT client_id
      FROM dbo.ClientsStates 
      WHERE client_id = @clientId
    `
    request.input('clientId', require('mssql').VarChar, clientId)
    const { recordset } = await request.query(checkQuery)
    const clientExists = recordset.length > 0

    if (!states) {
      states = {
        day1: false,
        day2: false,
        day3: false,
        dueday: false, // Asegúrate de que dueday tenga un valor inicial válido
        promisePage: false,
      }
    }

    if (clientExists) {
      // Actualizar registro existente
      const updateQuery = `
        UPDATE dbo.ClientsStates 
        SET day1 = @day1, 
            day2 = @day2, 
            day3 = @day3, 
            dueday = @dueday, // Asegúrate de que dueday tenga un valor válido
            promisePage = @promisePage
        WHERE client_id = @clientId
      `
      request.input('day1', require('mssql').Bit, states.day1)
      request.input('day2', require('mssql').Bit, states.day2)
      request.input('day3', require('mssql').Bit, states.day3)
      request.input('dueday', require('mssql').Bit, states.dueday) // Asegúrate de que dueday tenga un valor válido
      request.input('promisePage', require('mssql').Bit, states.promisePage)
      await request.query(updateQuery)
    } else {
      // Insertar nuevo registro
      const insertQuery = `
        INSERT INTO dbo.ClientsStates 
        (client_id, day1, day2, day3, dueday, promisePage)
        VALUES (@clientId, @day1, @day2, @day3, @dueday, @promisePage)
      `
      request.input('day1', require('mssql').Bit, states.day1)
      request.input('day2', require('mssql').Bit, states.day2)
      request.input('day3', require('mssql').Bit, states.day3)
      request.input('dueday', require('mssql').Bit, states.dueday) // Asegúrate de que dueday tenga un valor válido
      request.input('promisePage', require('mssql').Bit, states.promisePage)
      await request.query(insertQuery)
    }

    console.log(`Estados del cliente ${clientId} actualizados exitosamente`)
    return true
  } catch (err) {
    console.error(`Error al actualizar estados del cliente ${clientId}:`, err)
    return false
  } finally {
    pool.close()
  }
}

module.exports = {
  update_client_states_wsp,
}
