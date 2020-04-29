const exec = require('child_process').exec;

module.exports = (port, method = 'tcp', opts = {}) => {
  port = Number.parseInt(port);
  opts = Object.assign({ cwd: process.cwd(), encoding: 'utf8' }, opts);

  if (!port) {
    return Promise.reject(new Error('Invalid argument provided for port'));
  }

  let cmd;
  if (process.platform === 'win32') {
    cmd = `FOR /F "tokens=5 delims= " %P IN ('netstat -ano ^| find "LISTENING" ^| find ":${port} "') DO (TASKKILL /PID %P /F)`;
  } else {
    cmd = `lsof -i ${method === 'udp' ? 'udp' : 'tcp'}:${port} | grep ${
      method === 'udp' ? 'UDP' : 'LISTEN'
    } | awk '{print $2}' | xargs kill -9`;
  }

  exec(cmd, opts, (e, stdout, stderr) => {
    if (process.env.DEBUG) {
      if (e instanceof Error) {
        throw e;
      }
      console.log('stdout ', stdout);
      console.log('stderr ', stderr);
    }
  });
};
