/**
 * gcal.js
 * Google Calendar import — fetches today's events and converts them to xlrate blocks.
 * Uses Google Identity Services (GIS) for browser-based OAuth.
 */

const CLIENT_ID = '136478404759-h7qtvjh6rh0qjtrornl424qneaqpmjto.apps.googleusercontent.com';
const SCOPE     = 'https://www.googleapis.com/auth/calendar.readonly';

let tokenClient  = null;
let accessToken  = null;

function initTokenClient() {
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope:     SCOPE,
    callback:  () => {}, // set per-request below
  });
}

/**
 * Triggers the OAuth flow (if needed) then fetches events for dateStr (YYYY-MM-DD).
 * Returns an array of xlrate Block objects: { name, start, end }
 */
export function importFromGcal(dateStr) {
  return new Promise((resolve, reject) => {
    if (!window.google) {
      reject(new Error('Google sign-in is still loading. Try again in a moment.'));
      return;
    }

    if (!tokenClient) initTokenClient();

    tokenClient.callback = async (response) => {
      if (response.error) { reject(new Error(response.error)); return; }
      accessToken = response.access_token;
      try {
        resolve(await fetchBlocksForDate(dateStr));
      } catch (e) {
        reject(e);
      }
    };

    // prompt: '' skips the account picker if already authorized
    tokenClient.requestAccessToken({ prompt: accessToken ? '' : 'select_account' });
  });
}

async function fetchBlocksForDate(dateStr) {
  const timeMin = new Date(dateStr + 'T00:00:00').toISOString();
  const timeMax = new Date(dateStr + 'T23:59:59').toISOString();

  const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
  url.searchParams.set('timeMin',       timeMin);
  url.searchParams.set('timeMax',       timeMax);
  url.searchParams.set('singleEvents',  'true');
  url.searchParams.set('orderBy',       'startTime');

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (res.status === 401) {
    // Token expired — clear it so next call re-auths
    accessToken = null;
    throw new Error('Session expired. Please import again to reconnect.');
  }
  if (!res.ok) throw new Error(`Google Calendar error: ${res.status}`);

  const data = await res.json();
  return (data.items || [])
    .filter(e => e.start?.dateTime) // skip all-day events
    .map(e => ({
      name:  e.summary || 'Event',
      start: toHHMM(new Date(e.start.dateTime)),
      end:   toHHMM(new Date(e.end.dateTime)),
    }));
}

function toHHMM(date) {
  return date.toTimeString().slice(0, 5);
}
