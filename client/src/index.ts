import * as admin from 'firebase-admin';

const databaseURL = process.env.FIREBASE_DB_URL;
const configBase64: string | undefined = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

if (!configBase64) {
  throw new Error('The $FIREBASE_SERVICE_ACCOUNT_BASE64 environment variable was not found!');
}

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(Buffer.from(configBase64, 'base64').toString('ascii'))),
  databaseURL,
});

// Create a reference to this user's specific status node.
// This is where we will store data about being online/offline.
const userStatusDatabaseRef = admin.database().ref('/status');

// We'll create two constants which we will write to
// the Realtime database when this device is offline
// or online.
const isOfflineForDatabase = {
  state: 'offline',
  last_changed: admin.database.ServerValue.TIMESTAMP,
};

const isOnlineForDatabase = {
  state: 'online',
  last_changed: admin.database.ServerValue.TIMESTAMP,
};

// Create a reference to the special '.info/connected' path in
// Realtime Database. This path returns `true` when connected
// and `false` when disconnected.
admin.database().ref('.info/connected').on('value', function(snapshot) {
  // If we're not currently connected, don't do anything.
  if (snapshot.val() == false) {
    return;
  }

  // If we are currently connected, then use the 'onDisconnect()'
  // method to add a set which will only trigger once this
  // client has disconnected by closing the app,
  // losing internet, or any other means.
  userStatusDatabaseRef.onDisconnect().set(isOfflineForDatabase).then(function() {
    // The promise returned from .onDisconnect().set() will
    // resolve as soon as the server acknowledges the onDisconnect()
    // request, NOT once we've actually disconnected:
    // https://firebase.google.com/docs/reference/js/firebase.database.OnDisconnect

    // We can now safely set ourselves as 'online' knowing that the
    // server will mark us as offline once we lose connection.
    userStatusDatabaseRef.set(isOnlineForDatabase);
  });
});
