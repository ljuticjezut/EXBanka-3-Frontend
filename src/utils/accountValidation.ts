export function validateAccountNumber(broj: string): boolean {
  if (!/^\d{18}$/.test(broj)) return false

  const bankCode = broj.slice(0, 3)
  return bankCode === '111' || bankCode === '222' || bankCode === '333' || bankCode === '444'
}
