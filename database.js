const mysql = require("mysql2")

const pool = mysql.createPool({
    host: '89.252.183.243',
    user: 'cnkrbcom_fal_baktir',
    password: 's+NlEiDAISzF',
    database: 'cnkrbcom_fal_baktir',
});

const getConnection = function (callback) {
    pool.getConnection(function (err, connection) {
        callback(err, connection);
    });
};

module.exports = getConnection
