// שרת הכוונה ל-PeerJS עבור "מי המתחזה?" – רץ בענן חינמי.
const { PeerServer } = require('peer');
const port = process.env.PORT || 9000;
PeerServer({ port, path: '/', allow_discovery: false, proxied: true, key: 'peerjs' }, () => {
  console.log('PeerJS signaling on port ' + port);
});
