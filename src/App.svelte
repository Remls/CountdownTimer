<script lang="ts">
  import { onMount } from 'svelte';
  import prayerTimesData from './assets/prayer-times.json';

  interface PrayerTimes {
    Fajr: string;
    Sunrise: string;
    Dhuhr: string;
    Asr: string;
    Maghrib: string;
    Isha: string;
  }

  let targetDate: Date | null = null;
  let inputVal: string | null = null;
  let countdown: string = '';
  let countdownLabel: string = '';
  let nextPrayerTimeLoaded: boolean = false;
  let todayPrayerTimes: PrayerTimes | null = null;
  let tomorrowPrayerTimes: PrayerTimes | null = null;
  let showInput: boolean = false;
  let timeIsUp: boolean = false;
  let errorMsg: string = '';
  let interval: number | null = null;

  function padZero(num: string | number) {
    return String(num).padStart(2, '0');
  }

  function resetState() {
    countdown = '';
    timeIsUp = false;
    errorMsg = '';
    if (interval) clearInterval(interval);
  }

  function loadNextPrayerTime() {
    nextPrayerTimeLoaded = false;
    todayPrayerTimes = null;
    tomorrowPrayerTimes = null;

    const prayerTimes: Record<string, PrayerTimes> = prayerTimesData;
    if (!prayerTimes) {
      errorMsg = 'No prayer times found';
      return;
    }

    // Get MM-DD from Date
    function getMonthDay(date?: Date) {
      if (!date) date = new Date();
      return [
        padZero(date.getMonth() + 1),
        '-',
        padZero(date.getDate())
      ].join('');
    }
    function createDate(monthDay: string, time: string, isTomorrow = false) {
      let year = new Date().getFullYear();
      if (monthDay === '01-01' && isTomorrow) year++;
      return new Date(`${year}-${monthDay}T${time}`);
    }
    const todayStr = getMonthDay();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = getMonthDay(tomorrow);
  
    todayPrayerTimes = prayerTimes[todayStr];
    tomorrowPrayerTimes = prayerTimes[tomorrowStr];
  
    // Check each time to see if it's in the future
    if (!todayPrayerTimes) {
      errorMsg = 'Prayer times not set up for today.';
      return;
    }
    const prayerTimeKeys: Array<keyof PrayerTimes> = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    let futureTimeFound = false;
    for (const time of prayerTimeKeys) {
      const d = createDate(todayStr, todayPrayerTimes[time]!);
      if (d.getTime() > new Date().getTime()) {
        futureTimeFound = true;
        countdownLabel = time;
        targetDate = d;
        break;
      }
    }
    if (!futureTimeFound) {
      if (!tomorrowPrayerTimes) {
        errorMsg = 'Prayer times not set up for tomorrow.';
        return;
      }
      countdownLabel = 'Fajr (tomorrow)';
      targetDate = createDate(tomorrowStr, tomorrowPrayerTimes['Fajr']!, true);
    }
    nextPrayerTimeLoaded = true;
  }

  $: if (inputVal) {
    countdownLabel = '';
    nextPrayerTimeLoaded = false;
    showInput = false;
    targetDate = new Date(inputVal);
  }

  $: if (targetDate) {
    resetState();
    interval = setInterval(updateCountdown, 1000, targetDate);
    window.history.replaceState({}, '', `?t=${targetDateQueryParamFormatted}&label=${countdownLabel}`);
  }

  // targetDate formatted
  $: targetDateFormatted = targetDate ? [
    targetDate.getFullYear(),
    '-',
    padZero(targetDate.getMonth() + 1),
    '-',
    padZero(targetDate.getDate()),
    ' ',
    padZero(targetDate.getHours()),
    ':',
    padZero(targetDate.getMinutes())
  ].join('') : '';
  $: targetDateQueryParamFormatted = targetDate ? [
    targetDate.getFullYear(),
    '-',
    padZero(targetDate.getMonth() + 1),
    '-',
    padZero(targetDate.getDate()),
    'T',
    padZero(targetDate.getHours()),
    ':',
    padZero(targetDate.getMinutes())
  ].join('') : '';

  function updateCountdown(target: Date | null = null) {
    if (target) {
      const now = new Date().getTime();
      const distance = target.getTime() - now;

      if (distance < 0) {
        countdown = '';
        timeIsUp = true;
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      if (days > 0) {
        countdown = `${days}d ${hours}:${padZero(minutes)}:${padZero(seconds)}`;
      } else if (hours > 0) {
        countdown = `${hours}:${padZero(minutes)}:${padZero(seconds)}`;
      } else if (minutes > 0) {
        countdown = `${minutes}:${padZero(seconds)}`;
      } else {
        countdown = `${seconds}`;
      }
    }
  }

  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    const timestamp = params.get('t');
    const label = params.get('label');
    if (!timestamp) {
      loadNextPrayerTime();
    } else {
      countdownLabel = label || '';
      // Check if in format HH:MM
      if (timestamp.match(/^\d{2}:\d{2}$/)) {
        const now = new Date();
        const [hours, minutes] = timestamp.split(':').map(Number);
        const date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
        // If time has already passed, set it for tomorrow
        if (date.getTime() < now.getTime()) {
          date.setDate(date.getDate() + 1);
        }
        targetDate = date;
      }
      // Check if in format YYYY-MM-DDTHH:MM
      else if (timestamp.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)) {
        targetDate = new Date(timestamp);
      }
      // Invalid format
      else {
        console.error('Invalid timestamp format passed', timestamp);
        errorMsg = 'Invalid format, please use HH:MM or YYYY-MM-DDTHH:MM';
      }
    }
  });
</script>

<main>
  {#if todayPrayerTimes || tomorrowPrayerTimes}
    <table class="prayerTimes">
      <thead>
        <tr>
          <th>Day</th>
          <th>Fajr</th>
          <th>Sunrise</th>
          <th>Dhuhr</th>
          <th>Asr</th>
          <th>Maghrib</th>
          <th>Isha</th>
        </tr>
      </thead>
      <tbody>
        {#if todayPrayerTimes}
          <tr>
            <td>Today</td>
            <td>{todayPrayerTimes.Fajr}</td>
            <td>{todayPrayerTimes.Sunrise}</td>
            <td>{todayPrayerTimes.Dhuhr}</td>
            <td>{todayPrayerTimes.Asr}</td>
            <td>{todayPrayerTimes.Maghrib}</td>
            <td>{todayPrayerTimes.Isha}</td>
          </tr>
        {/if}
        {#if tomorrowPrayerTimes}
          <tr>
            <td>Tomorrow</td>
            <td>{tomorrowPrayerTimes.Fajr}</td>
            <td>{tomorrowPrayerTimes.Sunrise}</td>
            <td>{tomorrowPrayerTimes.Dhuhr}</td>
            <td>{tomorrowPrayerTimes.Asr}</td>
            <td>{tomorrowPrayerTimes.Maghrib}</td>
            <td>{tomorrowPrayerTimes.Isha}</td>
          </tr>
        {/if}
      </tbody>
    </table>
  {/if}

  <div class="buttonGroup">
    {#if !nextPrayerTimeLoaded}
      <button on:click={loadNextPrayerTime}>Load from prayer times</button>
    {/if}
    {#if !showInput}
      <button on:click={() => showInput = true}>Use custom time</button>
    {/if}
  </div>
  
  {#if showInput}
    <input type="datetime-local" bind:value={inputVal} />
  {/if}

  {#if targetDate}
    {#if countdownLabel}
      <span>{countdownLabel}</span>
    {/if}
    <span class="targetDate">{targetDateFormatted}</span>
    <span class="countdown">{countdown}</span>
  {/if}
  {#if timeIsUp}
    <span class="timeIsUp">Time is up!</span>
  {/if}
  {#if errorMsg}
    <span class="error">{errorMsg}</span>
  {/if}
</main>

<style>
  main {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
  }

  table.prayerTimes {
    margin-bottom: 1rem;
    border-collapse: collapse;
    border: 1px solid white;
    width: 100%;
  }

  table.prayerTimes th,
  table.prayerTimes td {
    padding: 0.5rem;
    text-align: center;
    border: 1px solid white;
  }

  div.buttonGroup {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  input {
    font-size: 1.5rem;
    margin-bottom: 1rem;
  }

  span {
    font-size: 1.5rem;
  }
  .targetDate {
    font-size: 1rem;
    color: grey;
  }
  .error {
    color: red;
  }
  .timeIsUp {
    color: green;
  }
  .countdown {
    font-size: 3rem;
  }
</style>
