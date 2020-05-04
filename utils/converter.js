const moment = require('moment');

const isValidByteArray = array => {
  if (array && array.byteLength !== undefined) return true;
  return false;
};

// for argument type of array
const formatDataGRPC = Payload => {
  Payload.map(function(item) {
    Object.entries(item).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        formatDataGRPC(item[key]);
      }
      if (isValidByteArray(value)) {
        if (key === 'Type' || key === 'Subtype' || key === 'Version') {
          item[key] = value[0];
        } else {
          item[key] = Buffer.from(value).toString('base64');
        }
      }
      if (key === 'Timestamp') {
        item[key] = moment.unix(value).format('DD-MMM-YYYY HH:mm:ss');
      }
    });

    // Transaction Type Conversion Value
    if (item.TransactionType === 0) {
      item.TransactionType = 'Empty';
    } else if (item.TransactionType === 1) {
      item.TransactionType = 'Ordinary Payment';
    } else if (item.TransactionType === 3) {
      item.TransactionType = 'Node Registration';
    }

    return item;
  });
};

// for argument type of object
const formatDataGRPC2 = Payload => {
  Object.entries(Payload).forEach(([key, value]) => {
    if (isValidByteArray(value)) {
      Payload[key] = Buffer.from(value).toString('base64');
    }
    if (key === 'Timestamp') {
      Payload[key] = moment.unix(value).format('DD-MMM-YYYY HH:mm:ss');
    }

    // Transaction Type Conversion Value
    if (key === 'TransactionType') {
      if (Payload[key] === 0) {
        Payload[key] = 'Empty';
      } else if (Payload[key] === 1) {
        Payload[key] = 'Ordinary Payment';
      } else if (Payload[key] === 3) {
        Payload[key] = 'Node Registration';
      }
    }
  });
};

const formatCache = (name, payload) => {
  const valPayload = typeof payload === 'string' ? payload : Object.values(payload).join(',');
  return `${process.env.PORT}-${name}-${process.env.PROTO_PORT}:${valPayload}`;
};

const concats = (sender, recipient) => {
  return sender.concat(recipient.filter(item => sender.indexOf(item) < 0));
};

const zoobitConversion = curr => {
  if (!curr || curr === 0) return 0;
  const result = curr / Math.pow(10, 8);

  if (result.toString().indexOf('e') > 0) {
    const e = parseInt(result.toString().slice(-1));
    return parseFloat(result).toFixed(e);
  }

  return parseFloat(result);
};

const bufferStr = buff => {
  const result = Buffer.from(buff).toString('base64');
  if (result === 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=') return null;
  return result;
};

module.exports = {
  formatDataGRPC,
  formatDataGRPC2,
  formatCache,
  concats,
  zoobitConversion,
  bufferStr,
};
