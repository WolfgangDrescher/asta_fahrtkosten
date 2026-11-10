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
      statusMessage: 'Files too large.',
      data: { code: 'fileSize' }
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
      statusMessage: 'CAPTCHA verification failed.',
      data: { code: 'captcha' }
    })
  }

  const firstName = form.find(field => field.name === 'firstName')?.data.toString().trim() ?? ''

  const lastName = form.find(field => field.name === 'lastName')?.data.toString().trim() ?? ''

  if (!firstName || !lastName) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Name First and Last are required.',
      data: { code: 'name' }
    })
  }

  const applicationFile = form.find(
    field => field.name === 'applicationFile' && field.filename
  )

  const invoiceFiles = form.filter(
    field => field.name === 'invoiceFiles' && field.filename
  )

  const confirmationFiles = form.filter(
    field => field.name === 'confirmationFiles' && field.filename
  )

  if (!applicationFile || invoiceFiles.length === 0 || confirmationFiles.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'All documents are required.',
      data: { code: 'documents' }
    })
  }

  const email = form.find(field => field.name === 'email')?.data.toString().trim() ?? ''

  if (!isUniversityEmail(email)) {
    throw createError({
      statusCode: 400,
      statusMessage: `An @${UNIVERSITY_MAIL_DOMAIN} address is required.`,
      data: { code: 'email' }
    })
  }

  const comment = form.find(field => field.name === 'comment')?.data.toString() ?? ''

  const totalInvoices = invoiceFiles.length
  const totalConfirmations = confirmationFiles.length

  let invoiceIndex = 0
  let confirmationIndex = 0

  const attachments = form
    .filter(field => field.filename)
    .map(file => {
      let label

      if (file.name === 'applicationFile') {
        label = 'Antrag'
      } else if (file.name === 'invoiceFiles') {
        invoiceIndex++
        label = totalInvoices > 1
          ? `Rechnung (${invoiceIndex} von ${totalInvoices})`
          : 'Rechnung'
      } else if (file.name === 'confirmationFiles') {
        confirmationIndex++
        label = totalConfirmations > 1
          ? `Teilnahmebestaetigung (${confirmationIndex} von ${totalConfirmations})`
          : 'Teilnahmebestaetigung'
      } else {
        label = file.name
      }

      const extension = getExtension(file.filename ?? '')

      return {
        filename: `${label}_${toFilenamePart(lastName)}_${toFilenamePart(firstName)}${extension}`,
        content: file.data,
        contentType: CONTENT_TYPES[extension]
      }
    })

  const allFiles = [applicationFile, ...invoiceFiles, ...confirmationFiles]

  if (!allFiles.every(file => isAllowedFile(file.filename ?? ''))) {
    throw createError({
      statusCode: 415,
      statusMessage: 'Only PDF, JPG and PNG files are allowed.',
      data: { code: 'fileType' }
    })
  }

  const totalSize = allFiles.reduce((sum, file) => sum + file.data.length, 0)

  if (totalSize > MAX_TOTAL_SIZE_BYTES) {
    throw createError({
      statusCode: 413,
      statusMessage: 'Files too large.',
      data: { code: 'fileSize' }
    })
  }

  const { mail } = useRuntimeConfig(event)

  if (!isUniversityEmail(mail.to)) {
    console.error(`NUXT_MAIL_TO must be an @${UNIVERSITY_MAIL_DOMAIN} address.`)

    throw createError({
      statusCode: 500,
      statusMessage: 'The recipient of the applications is not configured.'
    })
  }

  const transporter = nodemailer.createTransport({
    host: mail.host,
    port: mail.port,
    secure: mail.secure,
    auth: {
      user: mail.user,
      pass: mail.password
    }
  })

  try {
    await transporter.sendMail({
      from: mail.from || mail.user,
      to: mail.to,
      subject: 'Neuer Antrag auf Fahrtkostenzuschuss',
      text: [
        'Ein neuer Antrag auf Fahrtkostenzuschuss wurde eingereicht.',
        '',
        `Name: ${firstName} ${lastName}`,
        `MH-Mail: ${email}`,
        '',
        `Kommentar: ${comment}`
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
