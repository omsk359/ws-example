import express from 'express';
import axios from 'axios';
import bodyParser from 'body-parser';
import socketIO from 'socket.io';
import http from 'http';
import { cacheGet, cacheSet } from './cache';
import { sleep } from './heplers';

const app = express();
const server = http.createServer(app);

app.use(express.static('dist'));
app.use(bodyParser.json());

const allowedCurrencies = ['BTC', 'USD'];
const expireTime = 20; // sec

// eslint-disable-next-line consistent-return
app.post('/api/price', async (req, res) => {
  const { currency1, currency2 } = req.body;

  if (allowedCurrencies.some(c => c !== currency1 && c !== currency2)) {
    return res.send({
      error: 'Wrong currency',
    });
  }
  const dbKey = `${currency1}-${currency2}`;

  const price = await cacheGet(dbKey);
  console.log('cache price', price);
  if (price > 0) {
    return res.send({ price });
  }

  if (price === '0') {
    return res.send({ pending: true });
  }

  res.send({ created: true }).end();
  await cacheSet(dbKey, '0', 'EX', expireTime);

  try {
    const { data } = await axios.get(
      'https://min-api.cryptocompare.com/data/price',
      {
        params: {
          fsym: currency1,
          tsyms: currency2,
        },
      }
    );
    await sleep(5 * 1000);

    await cacheSet(dbKey, data[currency2], 'EX', expireTime);
  } catch (e) {
    console.error(e);
  }
});

const io = socketIO(server);

server.listen(process.env.PORT || 8080, () => console.log(`Listening on port ${process.env.PORT || 8080}!`));

io.on('connection', (client) => {
  // eslint-disable-next-line consistent-return
  client.on('getPrice', async ({ currency1, currency2 }) => {
    console.log('client.broadcast');
    if (allowedCurrencies.some(c => c !== currency1 && c !== currency2)) {
      return client.emit('price', {
        error: 'Wrong currency',
      });
    }
    const dbKey = `${currency1}-${currency2}`;
    let price = await cacheGet(dbKey);
    console.log('cache price', price);
    if (price > 0) {
      return client.emit('price', {
        price,
      });
    }

    client.join(dbKey);

    if (price === '0') {
      return client.emit({ pending: true });
    }

    client.emit('price', {
      created: true,
    });

    await cacheSet(dbKey, '0', 'EX', expireTime);

    try {
      const { data } = await axios.get(
        'https://min-api.cryptocompare.com/data/price',
        {
          params: {
            fsym: currency1,
            tsyms: currency2,
          },
        }
      );
      await sleep(5 * 1000);
      price = data[currency2];
      await cacheSet(dbKey, price, 'EX', expireTime);

      io.to(dbKey).emit('price', { price });
      console.log(`${dbKey} = ${price} sent`);
    } catch (e) {
      console.error(e);
      return client.emit('price', {
        error: e.message,
      });
    }
  });

  client.on('disconnect', () => {
    console.log('Client disconnected');
  });
});
