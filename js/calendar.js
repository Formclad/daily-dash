/*
 * CALENDAR: the schedule strip asks this module for events on a date.
 * Today only manual entries exist (stored on the day itself). To plug in Google
 * Calendar or Outlook later, register a provider, e.g.
 *
 *   Calendar.register('google', async (dateStr) => [
 *     { time: '09:30', text: 'Meeting', source: 'google' }
 *   ]);
 *
 * Provider events show on the strip as read-only items with a small tag.
 */
(function () {
  const providers = {};
  window.Calendar = {
    register(name, fn) { providers[name] = fn; },
    /** Resolves to external events for the date (empty until a provider is added). */
    async external(dateStr) {
      const out = [];
      for (const [name, fn] of Object.entries(providers)) {
        try { (await fn(dateStr)).forEach(e => out.push({ source: name, ...e })); } catch (e) { /* ignore a failing provider */ }
      }
      return out;
    },
    hasProviders: () => Object.keys(providers).length > 0
  };
})();
