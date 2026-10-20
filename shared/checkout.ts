export interface Address {
  firstName: string; lastName: string; company: string; address: string; address2: string;
  city: string; state: string; zip: string; country: string
}
export interface CustomerDetails { email: string; phone: string; billing: Address; shipping?: Address }
export interface BookingDetails { serviceId: string; length: string; extras: string[]; date: string; time: string; notes: string; policyAccepted: boolean }
export interface PaymentNonce { dataDescriptor: string; dataValue: string }
export const countryCodes = 'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(' ')
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Customer details are required.')
  return value as Record<string, unknown>
}
function field(obj: Record<string, unknown>, key: string, max: number, required = true): string {
  const value = obj[key]
  if (!required && (value == null || value === '')) return ''
  if (typeof value !== 'string' || (required && !value.trim()) || value.trim().length > max || /[\u0000-\u001f]/.test(value)) throw new Error(`Please check ${key}.`)
  return value.trim()
}
function address(value: unknown): Address {
  const obj = object(value)
  const result = { firstName: field(obj,'firstName',50), lastName: field(obj,'lastName',50), company: field(obj,'company',50,false), address: field(obj,'address',60), address2: field(obj,'address2',60,false), city: field(obj,'city',40), state: field(obj,'state',40), zip: field(obj,'zip',20), country: field(obj,'country',2).toUpperCase() }
  if (!countryCodes.includes(result.country)) throw new Error('Choose a valid country.')
  if (result.country === 'US' && !/^[A-Za-z]{2}$/.test(result.state)) throw new Error('Use a two-letter US state code, for example MD.')
  if ([result.address, result.address2].filter(Boolean).join(', ').length > 60) throw new Error('Street address and apartment together must be at most 60 characters.')
  if (result.country === 'US') result.state = result.state.toUpperCase()
  return result
}
export function parseCustomer(value: unknown, shippingRequired = true): CustomerDetails {
  const obj = object(value)
  const email = field(obj,'email',255)
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Enter a valid email address.')
  return { email, phone: field(obj,'phone',25), billing: address(obj.billing), ...(shippingRequired ? {shipping:address(obj.shipping)} : {}) }
}
export function gatewayAddress(value: Address) {
  return { firstName:value.firstName, lastName:value.lastName, ...(value.company ? {company:value.company} : {}), address:[value.address,value.address2].filter(Boolean).join(', '), city:value.city, state:value.state, zip:value.zip, country:value.country }
}
