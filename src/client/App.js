import React, { Component } from 'react';
import './app.css';
import axios from 'axios';
import socketIO from 'socket.io-client';

// const socket = socketIO('ws://localhost:8080');
const socket = socketIO();

export default class App extends Component {
  state = { msg: '', currency1: 'BTC', currency2: 'USD' };

  componentDidMount() {
    socket.on('price', (data) => {
      console.log('price', data);
      const { currency1, currency2 } = this.state;
      if (data.error) {
        this.setState({ msg: data.error });
      } else if (data.created) {
        this.setState({ msg: 'Request created.' });
      } else if (data.pending) {
        this.setState({ msg: 'Please wait...' });
      } else if (data.price) {
        this.setState({ msg: `Price ${currency1}/${currency2} = ${data.price}` });
      }
    });
  }

  getPrice = async () => {
    const { currency1, currency2 } = this.state;

    const { data } = await axios.post('/api/price', {
      currency1, currency2
    });

    if (data.error) {
      this.setState({ msg: data.error });
    } else if (data.created) {
      this.setState({ msg: 'Request created.' });
    } else if (data.pending) {
      this.setState({ msg: 'Please wait...' });
    } else if (data.price) {
      this.setState({ msg: `Price ${currency1}/${currency2} = ${data.price}` });
    }
  };

  getPriceSocket = async () => {
    const { currency1, currency2 } = this.state;
    socket.emit('getPrice', { currency1, currency2 });
  };

  render() {
    const { msg } = this.state;
    return (
      <div>
        <button onClick={this.getPrice}>Get BTC price (POST)</button><br />
        <button onClick={this.getPriceSocket}>Get BTC price (Socket)</button><br />
        {msg}
      </div>
    );
  }
}
