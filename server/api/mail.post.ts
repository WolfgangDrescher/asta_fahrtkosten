import nodemailer from 'nodemailer'

// Letters that Unicode decomposition does not reduce to ASCII, and the German
// umlauts the way they are usually written without diacritics
const TRANSLITERATIONS: Record<string, string> = {
  'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'Ä': 'Ae', 'Ö': 'Oe', 'Ü': 'Ue', 'ß': 'ss',
  'æ': 'ae', 'Æ': 'Ae', 'œ': 'oe', 'Œ': 'Oe', 'ø': 'o', 'Ø': 'O', 'ł': 'l', 'Ł': 'L',
  'đ': 'd', 'Đ': 'D', 'þ': 'th', 'Þ': 'Th', 'ı': 'i'
}

// Makes a name safe for the filename of an attachment: ASCII letters, digits,
// dots and hyphens only, everything else becomes an underscore
const toFilenamePart = (value: string) =>
  value
    .replace(/[äöüÄÖÜßæÆœŒøØłŁđĐþÞı]/g, letter => TRANSLITERATIONS[letter])
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9.-]+/g, '_')
    .replace(/^_+|_+$/g, '')

// Multipart boundaries and text fields need a little room on top of the files
const MAX_REQUEST_SIZE_BYTES = MAX_TOTAL_SIZE_BYTES + 1024 * 1024

export default defineEventHandler(async (event) => {
  if (Number(getRequestHeader(event, 'content-length')) > MAX_REQUEST_SIZE_BYTES) {
    throw createError({
      statusCode: 413,
      statusMessage: 'Files too large.'
    })
  }

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
          ? `Rechnung (${rechnungIndex} von ${totalRechnungen})`
          : 'Rechnung'
      } else if (file.name === 'bestaetigung') {
        bestaetigungIndex++
        typ = totalBestaetigungen > 1
          ? `Teilnahmebestaetigung (${bestaetigungIndex} von ${totalBestaetigungen})`
          : 'Teilnahmebestaetigung'
      } else {
        typ = file.name
      }

      const extension = getExtension(file.filename ?? '')

      return {
        filename: `${typ}_${toFilenamePart(lastName)}_${toFilenamePart(firstName)}${extension}`,
        content: file.data,
        contentType: CONTENT_TYPES[extension]
      }
    })

  const allFiles = [antrag, ...rechnungen, ...bestaetigungen]

  if (!allFiles.every(file => isAllowedFile(file.filename ?? ''))) {
    throw createError({
      statusCode: 415,
      statusMessage: 'Only PDF, JPG and PNG files are allowed.'
    })
  }

  const totalSize = allFiles.reduce((sum, file) => sum + file.data.length, 0)

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
