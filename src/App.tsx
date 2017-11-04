import * as React from "react"
import "./App.css"
import actuallyServerless, { ExtendedPeer } from "./actually-serverless"

enum MessageTypes {
  chatMessage,
  setDisplayName
}

interface IWrappedPeer {
  peer: ExtendedPeer
  name: string
}
interface IState {
  connectionString: string
  peers: IWrappedPeer[]
  messages: string[]
  msg: string
  connected: boolean
}
interface Message {
  type: MessageTypes
  payload: string
}
class App extends React.Component {
  state: IState = {
    connectionString: "test",
    peers: [],
    messages: [],
    msg: "",
    connected: false
  }
  stopLookingForPeers: (cb: () => any) => any
  disconnect = () => {
    if (this.stopLookingForPeers) {
      this.stopLookingForPeers(() => {
        this.setState({
          connected: false
        })
      })
    }
    this.state.peers.forEach(wrappedPeer => wrappedPeer.peer.destroy())
    this.setState({
      peers: []
    })
  }
  connect = async () => {
    this.setState({
      connected: true
    })
    this.stopLookingForPeers = actuallyServerless({
      connectionString: this.state.connectionString,
      onPeer: peer => {
        const peerWrap: IWrappedPeer = {
          peer,
          name: "peer " + (this.state.peers.length + 1)
        }
        this.setState({
          peers: [...this.state.peers, peerWrap]
        })
        peer.onMessage(this.parseMessage(peerWrap))
        peer.on("close", () => {
          this.setState({
            peers: this.state.peers.filter(
              wrappedPeer => wrappedPeer.peer !== peer
            )
          })
        })
      }
    })
  }
  componentWillMount() {
    this.connect()
  }
  sendMessage = (message: string) => {
    this.state.peers.forEach(({ peer }) => {
      const data: Message = { type: MessageTypes.chatMessage, payload: message }
      peer.sendMessage(JSON.stringify(data))
    })
  }
  parseMessage = (peer: IWrappedPeer) => (message: string) => {
    const parsedMessage: Message = JSON.parse(message)
    switch (parsedMessage.type) {
      case MessageTypes.chatMessage:
        this.setState({
          messages: [
            ...this.state.messages.slice(
              Math.max(this.state.messages.length - 1000, 0)
            ),
            peer.name + ": " + parsedMessage.payload
          ]
        })
        break
    }
  }
  updateMsg = (e: any) => {
    this.setState({
      msg: e.currentTarget.value
    })
  }
  pushNewMessage = (e: any) => {
    e.preventDefault()
    this.setState({
      msg: "",
      messages: [...this.state.messages, "me: " + this.state.msg]
    })
    this.sendMessage(this.state.msg)
  }
  setConnectionStringFromEvent = (e: any) =>
    this.setState({ connectionString: e.target.value })
  render() {
    return (
      <div className="App">
        {this.state.connected ? (
          <p>
            {!this.state.peers.length
              ? "waiting for peers..."
              : this.state.peers.length + " peer(s)"}
            <br />
            <button onClick={this.disconnect}>Disconnect</button>
          </p>
        ) : (
          <p className="App-intro">
            Room Name:{" "}
            <input
              value={this.state.connectionString}
              onChange={this.setConnectionStringFromEvent}
              placeholder="Enter Connection String"
            />
            <br />
            <button onClick={this.connect}>connect</button>
          </p>
        )}
        <div style={messageStyle as any}>
          {this.state.messages.map((msg, index) => <p key={index}>{msg}</p>)}
        </div>
        {this.state.peers.length && (
          <form style={chatInputStyle as any} onSubmit={this.pushNewMessage}>
            <input
              value={this.state.msg}
              onChange={this.updateMsg}
              type="text"
              style={{ flex: 1 }}
            />
            <button type="submit">Send</button>
          </form>
        )}
      </div>
    )
  }
}

const chatInputStyle = {
  display: "flex",
  flex: 1,
  position: "fixed",
  bottom: 0,
  left: 0,
  right: 0,
  padding: 10,
  backgroundColor: "rgba(0, 0, 0, 1)"
}
const messageStyle = {
  border: "1px solid black",
  textAlign: "left",
  padding: 20,
  margin: 20
}

export default App