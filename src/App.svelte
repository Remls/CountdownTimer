<script lang="ts">
  import { onMount } from 'svelte';
  import prayerTimesData from './assets/prayer-times.json';
  import { padZero, getDay, getMonthDay, createDate, prayerTimeKeys, type PrayerTimes, getImsak } from './utils';

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
    Object.keys(prayerTimes).forEach(day => {
      prayerTimes[day].Imsak = getImsak(prayerTimes[day].Fajr);
    });

    const todayStr = getMonthDay('today');
    const tomorrowStr = getMonthDay('tomorrow');
  
    todayPrayerTimes = prayerTimes[todayStr];
    tomorrowPrayerTimes = prayerTimes[tomorrowStr];
  
    if (!todayPrayerTimes) {
      errorMsg = 'Cannot set countdown automatically: prayer times not set up for today. Please set a custom time instead.';
      return;
    }

    let futureTimeFound = false;
    for (const time of prayerTimeKeys) {
      if (time === 'Imsak' || time === 'Sunrise') continue;
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
        errorMsg = 'Cannot set countdown automatically: prayer times not set up for tomorrow. Please set a custom time instead.';
        return;
      }
      countdownLabel = 'Fajr (tomorrow)';
      targetDate = createDate(tomorrowStr, tomorrowPrayerTimes.Fajr, true);
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

  // targetDate formatted for display
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

  function setTargetDateToPrayerTime(day: 'today' | 'tomorrow', time: keyof PrayerTimes) {
    const prayerTimes = day === 'today' ? todayPrayerTimes : tomorrowPrayerTimes;
    if (!prayerTimes) return;
    countdownLabel = `${time}${day === 'tomorrow' ? ' (tomorrow)' : ''}`;
    targetDate = createDate(getMonthDay(day), prayerTimes[time]!);
  }

  function prayerTimeIsInPast(day: 'today' | 'tomorrow', time: keyof PrayerTimes) {
    const prayerTimes = day === 'today' ? todayPrayerTimes : tomorrowPrayerTimes;
    if (!prayerTimes) return false;
    const d = createDate(getMonthDay(day), prayerTimes[time]!);
    return d.getTime() < new Date().getTime();
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
        errorMsg = 'Invalid format for timestamp in query parameter. Please use HH:MM or YYYY-MM-DDTHH:MM.';
      }
    }
  });
</script>

<main>
  {#if todayPrayerTimes || tomorrowPrayerTimes}
    <table class="prayerTimes">
      <thead>
        <tr>
          <th colspan="3">
            Prayer times for Male, Maldives (GMT+5)
          </th>
        </tr>
        <tr>
          <th>Day</th>
          <th>Today<br>({getDay('today')})</th>
          <th>Tomorrow<br>({getDay('tomorrow')})</th>
        </tr>
      </thead>

      <tbody>
        {#each prayerTimeKeys as time}
          <tr class={time}>
            <td>{time}</td>
            {#if todayPrayerTimes}
              <td 
                on:click={() => setTargetDateToPrayerTime('today', time)}
                style="cursor: pointer;"
                class:past={prayerTimeIsInPast('today', time)}
              >{todayPrayerTimes[time]}</td>
            {:else}
              <td>-</td>
            {/if}
            {#if tomorrowPrayerTimes}
              <td
                on:click={() => setTargetDateToPrayerTime('tomorrow', time)}
                style="cursor: pointer;"
                class:past={prayerTimeIsInPast('tomorrow', time)}
              >{tomorrowPrayerTimes[time]}</td>
            {:else}
              <td>-</td>
            {/if}
          </tr>
        {/each}
      </tbody>

      <tfoot>
        <tr>
          <td colspan="3">
            Click on a prayer time to set countdown to that time.
          </td>
        </tr>
      </tfoot>
    </table>
  {/if}

  <div class="buttonGroup">
    {#if !nextPrayerTimeLoaded}
      <button on:click={loadNextPrayerTime}>
        Load next prayer time
      </button>
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
    width: 100%;
    font-size: 0.7rem;
  }

  table.prayerTimes th,
  table.prayerTimes td {
    padding: 0.15rem 0.25rem;
    text-align: center;
    border: 1px solid white;
  }
  table.prayerTimes td.past {
    text-decoration: line-through;
    background-color: rgba(255, 0, 0, 0.15);
  }

  table.prayerTimes tr.Imsak {
    background-color: rgba(128, 128, 128, 0.15);
  }
  table.prayerTimes tr.Sunrise {
    background-color: rgba(128, 128, 128, 0.15);
  }

  table.prayerTimes tfoot {
    font-size: 0.6rem;
    font-style: italic;
    color: grey;
  }
  table.prayerTimes tfoot tr td {
    border: none;
  }

  div.buttonGroup {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
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
