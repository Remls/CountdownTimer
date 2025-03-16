export function padZero(num: string | number) {
  return String(num).padStart(2, '0');
}

export function getDay(date: Date | 'today' | 'tomorrow') {
  const monthDay = getMonthDay(date);
  const day = parseInt(monthDay.split('-')[1]);
  const dayFinalDigit = day % 10;
  const suffix = (
    day === 11 || day === 12 || day === 13
      ? 'th'
      : dayFinalDigit === 1
        ? 'st'
        : dayFinalDigit === 2
          ? 'nd'
          : dayFinalDigit === 3
            ? 'rd'
            : 'th'
  );
  return `${day}${suffix}`;
}

export function getMonthDay(date: Date | 'today' | 'tomorrow') {
  if (date === 'today') date = new Date();
  if (date === 'tomorrow') {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    date = tomorrow;
  }
  return [
    padZero(date.getMonth() + 1),
    '-',
    padZero(date.getDate())
  ].join('');
}

export function createDate(monthDay: string, time: string, isTomorrow = false) {
  let year = new Date().getFullYear();
  if (monthDay === '01-01' && isTomorrow) year++;
  return new Date(`${year}-${monthDay}T${time}`);
}

export function getImsak(fajrTime: string) {
  const imsakTime = createDate(getMonthDay('today'), fajrTime);
  imsakTime.setMinutes(imsakTime.getMinutes() - 20);
  return imsakTime.toTimeString().slice(0, 5);
}

export const prayerTimeKeys: Array<keyof PrayerTimes> = ['Imsak', 'Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

export interface PrayerTimes {
  Imsak?: string;
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
}
