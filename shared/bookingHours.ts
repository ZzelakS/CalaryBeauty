export const BOOKING_HOURS = 'Mon–Fri 9:30am–7pm · Sat 9am–7pm · Sunday closed (Eastern time)'
export function bookingHours(date: string) {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay()
  return Number.isNaN(day) || day === 0 ? null : {min: day === 6 ? '09:00' : '09:30', max:'19:00'}
}
export function validateBookingHours(date: string, time: string) {
  const parsed = new Date(`${date}T12:00:00Z`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0,10)!==date || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('Choose a valid appointment date and time.')
  const hours = bookingHours(date)
  if (!hours || time < hours.min || time > hours.max) throw new Error(`Choose an appointment within studio hours: ${BOOKING_HOURS}.`)
}
