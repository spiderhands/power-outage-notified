import * as functions from 'firebase-functions';
import * as telegraf from 'telegraf';

const bot = new telegraf.Telegram(functions.config().bot.token);

interface OutageEvent {
  state: string;
  last_changed: number | Date;
}

const toMessage = (event: OutageEvent) => {
  switch (event.state) {
    case 'online': {
      return `💡 - power is on! Changed at ${event.last_changed}`;
    }
    case 'offline': {
      return `🕯️ - power is off! Changed at ${event.last_changed}`;
    }
    default: {
      return 'Something is wrong';
    }
  }
};
// Create a new function which is triggered on changes to /status
exports.onUserStatusChanged = functions.database.ref('/status').onUpdate(
  async (change) => {
    // Get the data written to Realtime Database
    const eventStatus: OutageEvent = change.after.val();

    // It is likely that the Realtime Database change that triggered
    // this event has already been overwritten by a fast change in
    // online / offline status, so we'll re-read the current data
    // and compare the timestamps.
    const statusSnapshot = await change.after.ref.once('value');
    const status = statusSnapshot.val();
    functions.logger.log(status, eventStatus);
    // If the current timestamp for this data is newer than
    // the data that triggered this event, we exit this function.
    if (status.last_changed > eventStatus.last_changed) {
      return null;
    }

    eventStatus.last_changed = new Date(eventStatus.last_changed);

    // ... and write it to Firestore.
    await bot.sendMessage(
      functions.config().bot.chat,
      toMessage(eventStatus),
    );

    return;
  });
