import nodemailer from 'nodemailer'

export default defineEventHandler(async (event) => {
  const form = await readMultipartFormData(event)

  if (!form) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Form incomplete.'
    })
  }

  const firstName = form.find(field => field.name === 'firstName')?.data.toString().trim() ?? ''

  const lastName = form.find(field => field.name === 'lastName')?.data.toString().trim() ?? ''

  if (!firstName || !lastName) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Name First and Last are required.'
    })
  }

  const antrag = form.find(
    field => field.name === 'antrag' && field.filename
  )

  const rechnungen = form.filter(
    field => field.name === 'rechnung' && field.filename
  )

  const bestaetigungen = form.filter(
    field => field.name === 'bestaetigung' && field.filename
  )

  if (!antrag || rechnungen.length === 0 || bestaetigungen.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'All documents are required.'
    })
  }

  const MHmail = form.find(field => field.name === 'MHmail')?.data.toString() ?? ''

  const kommentar = form.find(field => field.name === 'kommentar')?.data.toString() ?? ''

  const totalRechnungen = rechnungen.length
  const totalBestaetigungen = bestaetigungen.length

  let rechnungIndex = 0
  let bestaetigungIndex = 0

  const attachments = form
    .filter(field => field.filename)
    .map(file => {
      let typ

      if (file.name === 'antrag') {
        typ = 'Antrag'
      } else if (file.name === 'rechnung') {
        rechnungIndex++
        typ = totalRechnungen > 1
          ? `Rechnung (${rechnungIndex}/${totalRechnungen})`
          : 'Rechnung'
      } else if (file.name === 'bestaetigung') {
        bestaetigungIndex++
        typ = totalBestaetigungen > 1
          ? `Teilnahmebestaetigung (${bestaetigungIndex}/${totalBestaetigungen})`
          : 'Teilnahmebestaetigung'
      } else {
        typ = file.name
      }

      return {
        filename: `${typ}_${lastName}_${firstName}.pdf`,
        content: file.data,
        contentType: file.type
      }
    })

  const MAX_SIZE = 100 * 1024 * 1024 // 10 MB

  for (const file of [antrag, ...rechnungen, ...bestaetigungen]) {
    if (file.data.length > MAX_SIZE) {
      throw createError({
        statusCode: 400,
        statusMessage: 'File too large.'
      })
    }
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD
    }
  })

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USERNAME,
      to: process.env.EMAIL_TO,
      subject: 'Neuer Antrag auf Fahrtkostenzuschuss',

      text: `Ein neuer Antrag auf Fahrtkostenzuschuss wurde eingereicht. 
      
      Kommentar: ${kommentar}

      MH-Mail: ${MHmail}`,
      attachments
    })

    return {
      sent: true
    }
  } catch (error) {
    console.error(error)

    return {
      sent: false,
      message: 'An error occurred while sending the email.'
    }
  }
})
