# Actually serverless
Connecting peers using torrent technologies.

## Install

Easily create serverless web rtc connections based on a connection string.

`npm install --save actually-serverless`

or yarn

`yarn add actually-serverless`

## usage

Here is a very basic usage. 

```js
import actuallyServerless from "./actually-serverless"
let peers = []
const stopLookingForPeers = actuallyServerless({
    connectionString: "Any string you want to use to discover peers.",
    // each peer is an extended version of https://github.com/feross/simple-peer
    // with onMessage and sendMessage added.
    onPeer: peer => {
        peers.push(peer)
        peer.on('close', () => {
            peers = peers.filter(p => p !== peer)
        })
        peer.onMessage((meesage) => {
            console.log('message from a peer: ', message)
        }))
        peer.sendMessage("welcome to my peer group, I know about " + peers.length + " peers")
    }
})

// to teardown
stopLookingForPeers()
peers.forEach(peer => peer.destroy())
```

Try out the [serverless chat room](https://ericwooley.github.io/actually-serverless/)! See the [source](./src/App.tsx) for more advanced usage.

See the [readme](./README-CRA.md) for create react app, if you want to play with the demo src.