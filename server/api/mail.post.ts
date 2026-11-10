import { extname } from 'node:path'
import nodemailer from 'nodemailer'

// Gmail allows 25 MB per mail, base64 encoding adds about 33 %
const MAX_TOTAL_SIZE_BYTES = 18 * 1024 * 1024

export default defineEventHandler(async (event) => {
  const form = await readMultipartFormData(event)

  if (!form) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Form incomplete.'
    })
  }

  const altchaPayload = form.find(field => field.name === 'altcha')?.data.toString() ?? ''

  if (!await verifyAltcha(altchaPayload, event)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'CAPTCHA verification failed.'
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

  const MHmail = form.find(field => field.name === 'MHmail')?.data.toString().trim() ?? ''

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(MHmail)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'A valid email address is required.'
    })
  }

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
        filename: `${typ}_${lastName}_${firstName}${extname(file.filename ?? '')}`,
        content: file.data,
        contentType: file.type
      }
    })

  const totalSize = [antrag, ...rechnungen, ...bestaetigungen]
    .reduce((sum, file) => sum + file.data.length, 0)

  if (totalSize > MAX_TOTAL_SIZE_BYTES) {
    throw createError({
      statusCode: 413,
      statusMessage: 'Files too large.'
    })
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
      text: [
        'Ein neuer Antrag auf Fahrtkostenzuschuss wurde eingereicht.',
        '',
        `Name: ${firstName} ${lastName}`,
        `MH-Mail: ${MHmail}`,
        '',
        `Kommentar: ${kommentar}`
      ].join('\n'),
      attachments
    })
  } catch (error) {
    console.error(error)

    throw createError({
      statusCode: 500,
      statusMessage: 'An error occurred while sending the email.'
    })
  }

  return {
    sent: true
  }
})
