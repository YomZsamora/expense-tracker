'use strict';
const util = require('util');
const { exec } = require('child_process');
const execPromise = util.promisify(exec);
const { Sequelize } = require('sequelize');
const { test } = require('../configs/config');

module.exports = async () => {

    const adminSequelize = new Sequelize('postgres', test.username, test.password, {
        host: test.host,
        dialect: 'postgres',
        logging: false,
    });

    try {
        await adminSequelize.authenticate();
        await adminSequelize.query(`
            SELECT pg_terminate_backend(pg_stat_activity.pid)
            FROM pg_stat_activity
            WHERE pg_stat_activity.datname = '${test.database}'
            AND pid <> pg_backend_pid()
        `);
        await adminSequelize.query(`DROP DATABASE IF EXISTS "${test.database}"`);
        await adminSequelize.query(`CREATE DATABASE "${test.database}"`);
        console.log(`Test database "${test.database}" created.`);
    } catch (error) {
        console.error('Error during test database setup:', error);
        throw error;
    } finally {
        await adminSequelize.close();
    }

    try {
        const { stdout } = await execPromise('NODE_ENV=test npx sequelize-cli db:migrate');
        console.log('Migrations completed:', stdout);
    } catch (error) {
        console.error('Migration error:', error.stderr);
        throw error;
    }
};
