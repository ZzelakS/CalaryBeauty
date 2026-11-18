export const studio = {
  name: 'Calary Beauty',
  email: 'calarybeautystore@gmail.com',
  phone: '+1 (443) 468-7243',
  phoneHref: 'tel:+14434687243',
  whatsapp: 'https://wa.me/14434687243?text=Hi%20Calary%20Beauty%2C%20I%20would%20like%20to%20ask%20about%20a%20studio%20visit.',
  street: '31 Mountain Green Cir',
  locality: 'Windsor Mill, MD 21244',
  address: '31 Mountain Green Cir, Windsor Mill, MD 21244',
}
export const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(studio.address)}`
export const mapEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(studio.address)}&z=16&output=embed`
