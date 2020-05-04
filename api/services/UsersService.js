const moment = require('moment');
const BaseService = require('./BaseService');
const { User } = require('../../models');
const config = require('../../config/config');
const { encrypt } = require('../../utils');

const mongoose = require('mongoose');
const db = mongoose.connection;

module.exports = class UsersService extends BaseService {
  constructor() {
    super(User);
  }

  async createToken(user) {
    const { email, password } = user;
    const result = {
      email: email,
      token: password,
      tokenExpired: moment()
        .add(config.app.tokenExpired, 'hours')
        .toDate(),
    };

    return result;
  }

  async getMe(email, token) {
    if (email && token) {
      try {
        const user = await User.findByEmail(email);
        if (!user) {
          return { success: false, message: 'No user found with this login credentials.', data: null };
        }

        const isValidToken = token.trim() === user.token.trim();

        if (!isValidToken) {
          return { success: false, message: 'Invalid Token.', data: null };
        }

        const isExpired = moment().isAfter(user.tokenExpired);

        if (isExpired) {
          return { success: false, message: 'Your session expired. Sign in again.', data: null };
        }

        return { success: true, message: 'successfully get user.', data: user };
      } catch (err) {
        throw new console.error(err);
      }
    }
  }

  async generateSuperadmin(callback) {
    const password = await encrypt('P@ssw0rd');
    const payload = { email: 'superadmin@zoobc.net', password, role: 'Superadmin', status: 'Active' };

    let user = await User.findByEmail(payload.email);

    if (!user) {
      user = await User.create(payload);

      const tokenData = await this.createToken(user);

      const { token, tokenExpired } = tokenData;

      await User.findByIdAndUpdate(user.id, { token, tokenExpired }, { new: true });

      return callback(null, tokenData);
    }
    return callback(null, null);
  }

  async signIn(email, password) {
    const user = await User.findByEmail(email);

    if (!user) {
      return { success: false, message: 'No user found with this login credentials.', data: null };
    }

    const isValid = await user.validatePassword(password);

    if (!isValid) {
      return { success: false, message: 'Invalid password.', data: null };
    }

    const tokenData = await this.createToken(user);

    const { token, tokenExpired } = tokenData;

    await User.findByIdAndUpdate(user.id, { token, tokenExpired }, { new: true });

    return { success: true, message: 'succesfully login.', data: tokenData };
  }

  async resetDB(email, token) {
    const result = await this.getMe(email, token);

    const { success, message, data } = result;

    const isAuthenticated = success && data ? true : false;
    const isSuperAdmin = isAuthenticated && data.role === 'Superadmin' ? true : false;

    if (isAuthenticated && isSuperAdmin) {
      try {
        const res = await db.dropDatabase();
        if (res) {
          db.close();
          return { success: true, message: 'DB succesfully dropped.', data: null };
        } else {
          return { success: false, message: 'DB failed to drop.', data: null };
        }
      } catch (error) {
        return { success: false, message: 'error when drop DB.', data: null };
      }
    }

    return {
      success,
      message: `You do not have authorization to reset this ${db.databaseName} database!. It caused by ${message}`,
      data,
    };
  }
};
