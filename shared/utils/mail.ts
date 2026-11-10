export const UNIVERSITY_MAIL_DOMAIN = 'mh-freiburg.de'

// The app only deals with addresses of the university, both the applicant's
// and the one the applications are sent to.
export const isUniversityEmail = (address: string) =>
  new RegExp(`^[^\\s@]+@${UNIVERSITY_MAIL_DOMAIN.replace('.', '\\.')}$`, 'i').test(address.trim())
