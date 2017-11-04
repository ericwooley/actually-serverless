import * as WebTorrent from "webtorrent"
import { Wire } from "bittorrent-protocol"
import * as Peer from "simple-peer"

export enum MessageTypes {
  INIT_CHECK,
  SIGNAL,
  USER_MESSAGE
}
const sha1 = require("sha1")
export type ExtWire = Wire & { extended: any; extendedHandshake: any }
export interface IActuallyServerlessOptions {
  connectionString: string
  seed?: boolean
  onPeer: (peer: ExtendedPeer) => any
}
export default ({
  connectionString,
  seed = true,
  onPeer
}: IActuallyServerlessOptions) => {
  const client = new WebTorrent()
  const sha = sha1(connectionString)
  const magnet =
    "magnet:?xt=urn:btih:" +
    sha +
    "&dn=" +
    connectionString +
    "&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com"
  let torrent = client.add(magnet)
  torrent.on("ready", () => console.log("ready", torrent))
  torrent.on("wire", wire => {
    wire.use(signal_extension(onPeer) as any)
  })
  return (cb: (error: Error) => any) => {
    torrent.destroy(cb)
    client.destroy(cb)
  }
}
function signal_extension(onPeer: (peer: Peer.Instance) => any) {
  let extendedWire: ExtWire
  const initCheck = Math.random()
  function signal(wire: ExtWire) {
    extendedWire = wire
    wire.extendedHandshake.test = "Hello, World!"
  }
  signal.prototype.name = "signal_ext"
  signal.prototype.onExtendedHandshake = function(handshake: any) {
    if (handshake.m && handshake.m.signal_ext) {
      sendMessage(extendedWire, { initCheck, type: MessageTypes.INIT_CHECK })
    }
  }
  let peer: ExtendedPeer
  let pushMessageToPeer: (msg: string) => any = msg =>
    console.log("nothing to see here", msg)
  signal.prototype.onMessage = function(message: Buffer) {
    const messageStr = message
      .toString()
      .replace(/^\d+\:/, "")
      .trim()
    const parsedMessage = JSON.parse(messageStr)

    switch (parsedMessage.type) {
      case MessageTypes.INIT_CHECK:
        const { peer: extendedPeer, messageCallback } = initPeer(
          {
            onConnected: () => {
              onPeer(peer)
            },
            onError: err => console.error(err),
            onSignal: data =>
              sendMessage(extendedWire, { type: MessageTypes.SIGNAL, data })
          },
          { initiator: initCheck > parsedMessage.initCheck },
          data =>
            sendMessage(extendedWire, { type: MessageTypes.USER_MESSAGE, data })
        )
        pushMessageToPeer = messageCallback
        peer = extendedPeer
        break
      case MessageTypes.SIGNAL:
        if (typeof peer !== "undefined") {
          peer.signal(parsedMessage.data)
        }
        break
      case MessageTypes.USER_MESSAGE:
        const actualMessage = parsedMessage.data
        pushMessageToPeer(actualMessage)
        break
      default:
        console.log("unhandled message", parsedMessage)
    }
  }
  return signal
}

interface IPeerOptions {
  onSignal?: (data: any) => any
  onConnected: () => any
  signalData?: any
  onError: (err: Error) => any
}

const initPeer = (
  options: IPeerOptions,
  peerOptions: Peer.Options,
  onUserSendsMessage: (message: string) => any
): {
  peer: ExtendedPeer
  messageCallback: (message: string) => any
} => {
  // using any here is cheating, and should be refactored
  const peer: any = new Peer({
    ...peerOptions
  })
  peer.on("connect", options.onConnected)
  peer.on("error", options.onError)
  if (options.onSignal) {
    peer.on("signal", options.onSignal)
  }
  if (options.signalData) {
    peer.signal(options.signalData)
  }
  let messageCallback = (message: string) =>
    console.log("got message with no listener", message)
  peer.onMessage = (cb: (message: string) => any) => {
    messageCallback = cb
  }
  peer.sendMessage = onUserSendsMessage
  return { peer, messageCallback: (msg: string) => messageCallback(msg) }
}

function sendMessage(wire: ExtWire, message: any) {
  wire.extended("signal_ext", JSON.stringify(message))
}

export type ExtendedPeer = Peer.Instance & {
  sendMessage: (message: string) => void
  onMessage: (cb: (message: string) => any) => void
}
